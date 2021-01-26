export type typeVar = { tag:"typeVar", name: string, type: Type}

export type Parameter = { name: string } 
export type Stmt =
    { tag: "assign", name: string, value: Expr }
  | { tag: "define", name: string, parameters: Array<Parameter>, body: Array<Stmt>, ret: Type}
  | { tag: "if", cond: Expr, thn: Array<Stmt>, els: Array<Stmt>, elif: Array<Stmt>}
  | { tag: "while", expr: Expr, stmts: Array<Stmt>}
  | { tag: "pass"}
  | { tag: "return", value: Expr }
  | { tag: "expr", expr: Expr }
  | { tag: "print", value: Expr}
  | { tag: "init", name: string, type: Type, value: Expr}

export type Expr =
    { tag: "literal", value: Literal}
  | { tag: "id", name: string }
  | { tag: "uniop", expr: Expr, uniop: UniOp}
  | { tag: "binop", expr1: Expr, op: Op, expr2: Expr}
  | { tag: "call", name: string, arguments: Array<Expr> }
  | { tag: "param", expr: Expr}
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
  | { tag: "True", value: boolean, type: Type}
  | { tag: "False", value: boolean, type: Type}
  | { tag: "number", value: number, type: Type}

export type Type =
    { tag: "int" }
  | { tag: "bool" }

