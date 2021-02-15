export type Program = 
    {tag:"program", decls: Array<VarDef| MethodDef>, stmt: Array<Stmt>}

export type ClassDef = {tag: "classDef", name: string, field: Value, classBody: Array<VarDef|MethodDef>}

export type VarDef = {tag: "varDef", var: TypedVar, lit: Literal}
export type TypedVar = { tag:"typedVar", name: string, type: Type}
export type MethodDef= 
    {tag: "methodDef", name: string, self: Type, params: Array<TypedVar>, returnType: Type, body: MethodBody}
export type MethodBody = { tag: "methodBody", localDecls: Array<VarDef>, stmts: Array<Stmt> }

export type Stmt =
    { tag: "assign", name: string, expr: Expr }
  | { tag: "classAssign", expr1: Expr, name: string, expr2: Expr }
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
  | { tag: "print", value: Expr}
  | { tag: "construct", name: string}
  | { tag: "methodCall", expr: Expr, name: string, arguments: Array<Expr> }
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
  | { tag: "Number", value: number, type: Type}

export type Type = "int"| "bool" | name

export type name = string

