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
      case "define":
        newEnv.set(s.name, newOffset);
        newOffset += 1;
        break;
    }
  })
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
      case "define":
        definedVars.add(s.name);
        break;
    }
  });
  const scratchVar: string = `(local $$last i32)`;
  const localDefines = [scratchVar];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i32)`);
  })

  const commandGroups = ast.map((stmt) => codeGen(stmt));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  console.log("Generated: ", commands.join("\n"));
  return {
    wasmSource: commands.join("\n"),
    newEnv: withDefines
  };
}

function codeGen(stmt: Stmt): Array<string> {
  switch (stmt.tag) {
    case "assign":
      var valStmts = codeGenExpr(stmt.value);
      return valStmts.concat([`(local.set $${stmt.name})`]);
    case "return":
      var valStmts = codeGenExpr(stmt.value);
      valStmts.push("return")
      return valStmts;
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr);
      return exprStmts.concat([`(local.set $$last)`]);
  }
}

function codeGenExpr(expr: Expr): Array<string> {
  switch (expr.tag) {
    case "id": return [`(local.get $${expr.name})`];
    case "literal":
      const val = expr.value
      switch(val.tag){
        case "None":
          return []
        case "number":
          return ["(i32.const " + expr.value + ")"];
      }
      break
    // Cases for binary operation and bultin2
    case "binop":
      // Read the two expr
      var stmts = codeGenExpr(expr.expr1)
      //const stmts2 = codeGenExpr(expr.expr2)
      stmts = stmts.concat(codeGenExpr(expr.expr2))
      return stmts.concat(["(i32." + expr.op.tag + ")"])
    case "call":
      var valStmts = codeGenExpr(expr.arguments[0])
      valStmts.push(`(call $${expr.name})`);
      return
  }
}
