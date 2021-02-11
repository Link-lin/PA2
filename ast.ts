export type Program = 
    {tag:"program", decls: Array<VarDef| FuncDef>, stmt: Array<Stmt>}

export type VarDef = {tag: "varDef", var: TypedVar, lit: Literal}
export type FuncDef = {tag: "funcDef", name: string, params: Array<TypedVar>, returnType: Type, body: FuncBody}
export type FuncBody = { tag: "funcBody", localDecls: Array<VarDef | FuncDef>, stmts: Array<Stmt> }
export type TypedVar = { tag:"typeVar", name: string, type: Type}

export type Stmt =
    { tag: "assign", name: string, value: Expr }
  | { tag: "if", cond: Expr, thn: Array<Stmt>, els: Array<Stmt>, elif: Array<Stmt>}
  | { tag: "return", value: Expr }
  | { tag: "pass"}
  | { tag: "expr", expr: Expr }

export type Expr =
    { tag: "literal", value: Literal}
  | { tag: "id", name: string }
  | { tag: "uniop", expr: Expr, uniop: UniOp}
  | { tag: "binop", expr1: Expr, op: Op, expr2: Expr}
  | { tag: "param", expr: Expr}
  | { tag: "call", name: string, arguments: Array<Expr> }
  | { tag: "print", value: Expr}
  | { tag: "return", value: Expr}

export type Op = 
    {tag: "add"}
  | {tag: "sub"}
  | {tag: "mul"}
  | {tag: "div_s"}
  | {tag: "rem_s"}
  | {tag: "eq"}
  | {tag: "ne"}
  | {tag: "le_s"}
  | {tag: "ge_s"}
  | {tag: "lt_s"}
  | {tag: "gt_s"}
  | {tag: "is"}

export type UniOp =
    {tag: "eqz"} // not
  | {tag: "neg"}  // -

export type Literal =
    { tag: "None" }
  | { tag: "True", type: Type}
  | { tag: "False", type: Type}
  | { tag: "number", value: number, type: Type}

export type Type =
    { tag: "int" }
  | { tag: "bool" }

