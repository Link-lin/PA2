import { Stmt, Expr, Op, UniOp } from "./ast";
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/
export const TRUE = BigInt(1) << BigInt(32)
export const FALSE = BigInt(2) << BigInt(32)
export const NONE = BigInt(4) << BigInt(32)

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

var isFunc = false

export function compile(source: string, env: GlobalEnv): CompileResult {
  const ast = parse(source);
  console.log(ast);
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
  const funcs: Array<string> = [];
  ast.forEach((stmt) => {
    if (stmt.tag === "define") { isFunc = true; funcs.push(codeGen(stmt, withDefines).join("\n")); }
  });
  isFunc = false;
  const allFuns = funcs.join("\n\n");
  const stmts = ast.filter((stmt) => stmt.tag !== "define");
  ast.forEach(s => {
    switch (s.tag) {
      case "init":
        definedVars.add(s.name);
        break;
    }
  });
  const scratchVar: string = `(local $$last i64)`;
  const localDefines = [scratchVar];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i64)`);
  })

  const commandGroups = stmts.map((stmt) => codeGen(stmt, withDefines).join("\n"));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  //const commands = commandGroups.join("")
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
      if (isFunc) {
        var valStmts = codeGenExpr(stmt.value, env)
        valStmts.push(`(local.set $${stmt.name})`)
        return valStmts
      } else {
        const locationToSt = [`(i32.const ${envLookup(env, stmt.name)}) ;; ${stmt.name}`];
        var valStmts = codeGenExpr(stmt.value, env);
        return locationToSt.concat(valStmts).concat([`(i64.store)`]);
      }
    case "assign":
      if (isFunc) {
        var valStmts = codeGenExpr(stmt.value, env);
        // Do type check here
        valStmts.push(`(local.set $${stmt.name})`);
        return valStmts;
      }
      const locationToStore = [`(i32.const ${envLookup(env, stmt.name)}) ;; ${stmt.name}`];
      var valStmts = codeGenExpr(stmt.value, env);
      let tmp = locationToStore.concat(valStmts).concat([`(i64.store)`]);
      console.log(tmp);
      return tmp
    case "if":
      var conStmts: string[] = []
      const cond = codeGenExpr(stmt.cond, env);
      //conStmts.push("(local $cond i32)" + cond.join("\n"))
      if ((stmt.cond.tag) === "literal") {
        if (stmt.cond.value.tag == "number") {
          throw new Error("Cannot have int as condition")
        }
      }
      conStmts.push(cond.join("\n"))
      conStmts.push(`(i64.const ${TRUE}) \n (i64.eq)\n`) // Only necessary when it's actually True false in cond
      //conStmts.push(` (local.set $cond)`)

      const thenStmtsGroup = stmt.thn.map(thnstmt => codeGen(thnstmt, env).join("\n"));
      const thenStmts = thenStmtsGroup.join("\n")

      //let s = [`(if (local.get $cond)\n (then\n ${thenStmts})`]
      let s = [`(if (result i64) (then\n ${thenStmts})`]
      //console.log(stmt.els.length)
      if (stmt.els.length != 0) {
        const elseStmtsGroup = stmt.els.map(elstmt => codeGen(elstmt, env).join("\n"));
        const elseStmts = elseStmtsGroup.join("\n")
        s = s.concat(`(else\n ${elseStmts})`)
      }
      return conStmts.concat(s).concat(")");
    case "print":
      var valStmts = codeGenExpr(stmt.value, env);
      return valStmts.concat([
        "(call $print)"
      ]);
    case "return":
      var valStmts = codeGenExpr(stmt.value, env);
      valStmts.push("return")
      return valStmts;
    case "pass":
      return []
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr, env);
      if (isFunc) return exprStmts
      return exprStmts.concat([`(local.set $$last)`]);
    case "while":
      var wCond = codeGenExpr(stmt.expr, env);
      var condStmts: string[] = []
      condStmts.push(wCond.join("\n"));
      condStmts.push(`(i64.const ${TRUE}) \n (i64.ne)\n`) // Only necessary when it's actually True false in cond

      var exprStmts: string[] = [];
      //console.log(stmt.stmts);
      stmt.stmts.forEach(st => exprStmts.push(codeGen(st, env).join("\n")));
      //console.log(exprStmts);

      let whileStmts = `(block\n (loop \n ${condStmts.join("\n")} (br_if 1) ${exprStmts.join("\n")} (br 0)) )`
      return [whileStmts]
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
      const funcVarDecls: Array<string> = [];
      //funcVarDecls.push(`(local $$last i64)`);
      // Initialize function var def
      funcBody.forEach(stmt => {
        if (stmt.tag == "init") {
          funcVarDecls.push(`(local $${stmt.name} i64)`);
        }
      });
      // Treat all local 
      // Generate stmts code for func
      var funcStmtsGroup = funcBody.map(stmt => codeGen(stmt, env))
      const funcStmts = [].concat([].concat.apply([], funcStmtsGroup));
      return [`(func $${stmt.name} ${params} (result i64) \n ${funcVarDecls.join("\n")} ${funcStmts.join("\n")})`];
  }
}

function codeGenExpr(expr: Expr, env: GlobalEnv): Array<string> {
  switch (expr.tag) {
    case "id":
      if (env.globals.has(expr.name)) {
        return [`(i32.const ${envLookup(env, expr.name)})`, `(i64.load)`]
      }
      else {
        return [`(local.get $${expr.name})`] // take cares of parameters and local def
      }
    case "literal":
      const val = expr.value
      switch (val.tag) {
        case "None":
          return [`(i64.const ${NONE})`]
        case "number":
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
      stmts = stmts.concat(["(i64." + expr.op.tag + ")"])
      // If result is int don't need to signextend
      if (resultIsInt(expr.op)) { return stmts }
      // Sign extend possible boolean result
      return stmts.concat([(`(if (result i64) (then (i64.const ${TRUE})) (else (i64.const ${FALSE})))`)])
    case "uniop":
      //TODO 
      checkTypeOp(expr.expr, expr.uniop, "", env)
      var stmts: string[] = []
      if (expr.uniop.tag === "neg") {
        expr = {
          tag: "binop",
          expr1: { tag: "literal", value: { tag: "number", value: 0, type: { tag: "int" } } },
          expr2: expr.expr,
          op: { tag: "sub" }
        }
        stmts = codeGenExpr(expr, env);
      }
      return stmts
    /*
    var stmts = codeGenExpr(expr.expr, env);
    stmts = stmts.concat(["(i64." + expr.uniop.tag + ")"])
    return stmts.concat(["(i64.extend_i32_s)"])
    */
    case "call":
      var valStmts: string[] = []
      expr.arguments.forEach(arg => valStmts.push(codeGenExpr(arg, env).join("\n")))
      valStmts.push(`(call $${expr.name})`);
      return valStmts
  }
}
function resultIsInt(op: Op): boolean {
  return (op.tag === "add" || op.tag === "sub" || op.tag === "mul" || op.tag == "div_s" || op.tag == "rem_s")
}

function checkTypeOp(expr: Expr, op: Op | UniOp, posStr: string, gEnv: GlobalEnv) {
  const o = op.tag;
  if (expr.tag === "literal") {
    console.log("CheckType: " + expr.value.tag + " " + op.tag)
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
  else if (expr.tag === "id") {
    // right now can only check global defined var
    if (gEnv.types.has(expr.name)) {
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
