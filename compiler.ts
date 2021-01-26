import { Stmt, Expr } from "./ast";
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/

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
      case "assign":
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
  ast.forEach(s => {
    switch (s.tag) {
      case "assign":
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
  const commandGroups = ast.map((stmt) => codeGen(stmt,withDefines));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  console.log("Generated: ", commands.join("\n"));
  return {
    wasmSource: commands.join("\n"),
    newEnv: withDefines
  };
}

function envLookup(env: GlobalEnv, name: string): number {
  if (!env.globals.has(name)) { console.log("Could not find " + name + " in ", env); throw new Error("Could not find name " + name); }
  return (env.globals.get(name) * 4); // 4-byte values
}

function codeGen(stmt: Stmt, env: GlobalEnv): Array<string> {
  switch (stmt.tag) {
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
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr, env);
      return exprStmts.concat([`(local.set $$last)`]);
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
          const n = BigInt(1 << 32)
          return ["(i64.const " + n.toString() + ")"]
        case "number":
          return ["(i64.const " + val.value + ")"];
        case "False":
          const f = BigInt(2 << 32)
          return ["(i64.const " + f.toString() + ")"]
        case "True":
          const t = BigInt(4 << 32)
          return ["(i64.const " + t.toString() + ")"]
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
