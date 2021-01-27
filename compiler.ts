import { Stmt, Expr, Op, UniOp } from "./ast";
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/
export const TRUE = BigInt(1) << BigInt(32)
export const FALSE = BigInt(2) << BigInt(32)
export const NONE = BigInt(4) << BigInt(32)

type LocalEnv = Map<string, number>;
// Numbers are offsets into global memory
export type GlobalEnv = {
  types: Map<string, string>
  globals: Map<string, number>;
  offset: number;
}
export const emptyEnv = { globals: new Map(), offset: 0 };

export function augmentEnv(env: GlobalEnv, stmts: Array<Stmt>): GlobalEnv {
  const newEnv = new Map(env.globals);
  const newTypes = new Map(env.types);
  var newOffset = env.offset;
  stmts.forEach((s) => {
    switch (s.tag) {
      case "init":
        newTypes.set(s.name, s.type.tag);
        newEnv.set(s.name, newOffset);
        newOffset += 1;
        break;
    }
  })
  //console.log(newEnv)
  return {
    types: newTypes,
    globals: newEnv,
    offset: newOffset
  }
}

type CompileResult = {
  declFuncs: string,
  wasmSource: string,
  newEnv: GlobalEnv
};

export function compile(source: string, env: GlobalEnv): CompileResult {
  const ast = parse(source);
  const definedVars = new Set();
  const withDefines = augmentEnv(env, ast);
  // Check if init or func def came before all other
  var cameBefore = true
  var otherAppear = false
  ast.forEach(s => {
    if (s.tag !== "init" && s.tag !== "define") {
      otherAppear = true
    }
    if (otherAppear && (s.tag === "init" || s.tag === "define")) {
      cameBefore = false
    }
  })
  // If not defined before 
  if (!cameBefore) throw new Error("Program should have var_def and func_def at top")

  // Function definition
  const funs : Array<string> = [];
  ast.forEach((stmt, i) => {
    if(stmt.tag === "define") { funs.push(codeGen(stmt, env).join("\n")); }
  });
  const allFuns = funs.join("\n\n");
  const stmts = ast.filter((stmt) => stmt.tag !== "define"); 

  ast.forEach(s => {
    switch (s.tag) {
      case "init":
        definedVars.add(s.name);
        break;
    }
  });
  //console.log(definedVars);
  const scratchVar: string = `(local $$last i64)`;
  const localDefines = [scratchVar];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i64)`);
  })
  const commandGroups = stmts.map((stmt) => codeGen(stmt, withDefines));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  console.log("Generated: ", commands.join("\n"));
  return {
    declFuncs: allFuns,
    wasmSource: commands.join("\n"),
    newEnv: withDefines
  };
}

function envLookup(env: GlobalEnv, name: string): number {
  if (!env.globals.has(name)) { console.log("Could not find " + name + " in ", env); throw new Error("Could not find name " + name); }
  return (env.globals.get(name) * 8); // 8-byte values
}

export function codeGen(stmt: Stmt, env: GlobalEnv): Array<string> {
  switch (stmt.tag) {
    case "init":
      const locationToSt = [`(i32.const ${envLookup(env, stmt.name)}) ;; ${stmt.name}`];
      var valStmts = codeGenExpr(stmt.value, env);
      return locationToSt.concat(valStmts).concat([`(i64.store)`]);
    case "assign":
      const locationToStore = [`(i32.const ${envLookup(env, stmt.name)}) ;; ${stmt.name}`];
      var valStmts = codeGenExpr(stmt.value, env);
      return locationToStore.concat(valStmts).concat([`(i64.store)`]);
    case "print":
      var valStmts = codeGenExpr(stmt.value, env);
      return valStmts.concat([
        "(call $print)"
      ]);
    case "return":
      console.log(stmt.value)
      var valStmts = codeGenExpr(stmt.value, env);
      valStmts.push("return")
      return valStmts;
    case "pass":
      return []
    case "expr":
      console.log(stmt.expr);
      var exprStmts = codeGenExpr(stmt.expr, env);
      return exprStmts.concat([`(local.set $$last)`]);
    case "define":
      const funcBody = stmt.body
      // Check if init or func def came before all other
      var cameBefore = true
      var otherAppear = false
      funcBody.forEach(s => {
        if (s.tag === "define") { throw new Error("no function declare inside function body") };
        if (s.tag !== "init") {
          otherAppear = true
        }
        if (otherAppear && s.tag === "init") {
          cameBefore = false
        }
      })
      if (!cameBefore) { throw new Error("var_def should preceed all stmts") }

      var params = stmt.parameters.map(p => `(param $${p.name} i64)`).join(" ");
      // Generate stmts code for func
      var funcStmtsGroup = funcBody.map(stmt => codeGen(stmt, env))
      const funcStmts = [].concat([].concat.apply([], funcStmtsGroup));
      return [`(func $${stmt.name} ${params} (result i64) ${funcStmts.join("\n")})`];
  }
}

function codeGenExpr(expr: Expr, env: GlobalEnv): Array<string> {
  switch (expr.tag) {
    case "id":
      return [`(i32.const ${envLookup(env, expr.name)})`, `(i64.load)`]
    case "literal":
      const val = expr.value
      switch (val.tag) {
        case "None":
          return [`(i64.const ${NONE})`]
        case "number":
          console.log()
          return ["(i64.const " + val.value + ")"];
        case "False":
          return [`(i64.const ${FALSE})`]
        case "True":
          return [`(i64.const ${TRUE})`]
      }
    // Cases for binary operation and bultin2
    case "binop":
      checkTypeOp(expr.expr1, expr.op, "left side", env)
      checkTypeOp(expr.expr2, expr.op, "right side", env)
      var stmts = codeGenExpr(expr.expr1, env);
      //const stmts2 = codeGenExpr(expr.expr2)
      stmts = stmts.concat(codeGenExpr(expr.expr2, env))
      return stmts.concat(["(i64." + expr.op.tag + ")"])
    case "uniop":
      checkTypeOp(expr.expr, expr.uniop, "", env)
      var stmts = codeGenExpr(expr.expr, env);
      stmts = stmts.concat(["(i64." + expr.uniop.tag + ")"])
      return stmts.concat(["(i64.extend_i32_s)"])
    case "call":
      console.log(expr.arguments)
      var valStmts = codeGenExpr(expr.arguments[0], env)
      valStmts.push(`(call $${expr.name})`);
      return valStmts
  }
}

function checkTypeOp(expr: Expr, op: Op | UniOp, posStr: string, gEnv: GlobalEnv) {
  const o = op.tag;
  if (expr.tag === "literal") {
    console.log("CheckType: " + expr.value.tag +" "+op.tag)
    const v = expr.value.tag;
    switch (v) {
      case "None":
        throw new Error(`Operation ${o} operated on ${posStr} None`)
      case "number":
        if (o === "eqz") {
          throw new Error(`Operation ${o} operated on ${posStr} number`)
        }
        break;
      case "False":
        if (o !== "eqz") {
          throw new Error(`Operation ${o} operated on ${posStr} Boolean Value False`)
        }
        break;
      case "True":
        if (o !== "eqz") {
          throw new Error(`Operation ${o} operated on ${posStr} Boolean Value True`)
        }
        break;
    }
  }
  else if(expr.tag === "id"){
    // right now can only check global defined var
    if(gEnv.types.has(expr.name)){
      switch (gEnv.types.get(expr.name)) {
        case "int":
          if (o === "eqz") {
            throw new Error(`Operation ${o} operated on ${posStr} number`)
          }
          break;
        case "bool":
          if (o !== "eqz") {
            throw new Error(`Operation ${o} operated on ${posStr} Boolean Value`)
          }
          break;
      } 
    }
  }
}
