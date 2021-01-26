import { Stmt, Expr } from "./ast";
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/
const TRUE = BigInt(1) << BigInt(32)
const FALSE = BigInt(2) << BigInt(32)
const NONE = BigInt(4) << BigInt(32)

type LocalEnv = Map<string, boolean>;
// Numbers are offsets into global memory
export type GlobalEnv = {
  globals: Map<string, number>;
  offset: number;
}
export const emptyEnv = { globals: new Map(), offset: 0 };

export function augmentEnv(env: GlobalEnv, stmts: Array<Stmt>): GlobalEnv {
  const newEnv = new Map(env.globals);
  var newOffset = env.offset;
  stmts.forEach((s) => {
    switch (s.tag) {
      case "init":
        newEnv.set(s.name, newOffset);
        newOffset += 1;
        break;
    }
  })
  //console.log(newEnv)
  return {
    globals: newEnv,
    offset: newOffset
  }
}

type CompileResult = {
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
  // May be able to add declare in here
  const commandGroups = ast.map((stmt) => codeGen(stmt, withDefines));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  console.log("Generated: ", commands.join("\n"));
  return {
    wasmSource: commands.join("\n"),
    newEnv: withDefines
  };
}

function envLookup(env: GlobalEnv, name: string): number {
  if (!env.globals.has(name)) { console.log("Could not find " + name + " in ", env); throw new Error("Could not find name " + name); }
  return (env.globals.get(name) * 8); // 8-byte values
}

function codeGen(stmt: Stmt, env: GlobalEnv): Array<string> {
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
      var valStmts = codeGenExpr(stmt.value, env);
      valStmts.push("return")
      return valStmts;
    case "pass":
      return []
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr, env);
      return exprStmts.concat([`(local.set $$last)`]);
    case "define":
      const funcBody = stmt.body
      // Check if init or func def came before all other
      var cameBefore = true
      var otherAppear = false
      funcBody.forEach(s => {
        if(s.tag === "define") {throw new Error("no function declare inside function body")};
        if (s.tag !== "init") {
          otherAppear = true
        }
        if (otherAppear && s.tag === "init" ) {
          cameBefore = false
        }
      })
      if(cameBefore) { throw new Error("var_def should preceed all stmts")}
      // TODO generate func name and such

      // Generate stmts code for func
      var funcStmtsGroup = funcBody.map(stmt => codeGen(stmt, env))
      const funcStmts = [].concat([].concat.apply([], funcStmtsGroup));
      return funcStmts 
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
          return ["(i64.const " + val.value + ")"];
        case "False":
          return [`(i64.const ${FALSE})`]
        case "True":
          return [`(i64.const ${TRUE})`]
      }
    // Cases for binary operation and bultin2
    case "binop":
      // Read the two expr
      var stmts = codeGenExpr(expr.expr1, env)
      //const stmts2 = codeGenExpr(expr.expr2)
      stmts = stmts.concat(codeGenExpr(expr.expr2, env))
      return stmts.concat(["(i64." + expr.op.tag + ")"])
    case "call":
      var valStmts = codeGenExpr(expr.arguments[0], env)
      valStmts.push(`(call $${expr.name})`);
      return
  }
}
