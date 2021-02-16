import { parser } from "lezer-python";
import { Tree, TreeCursor } from "lezer-tree";
import { Expr, Op, Stmt, ClassDef, Type, UniOp, TypedVar, VarDef, Value, Program, MethodBody, MethodDef } from "./ast";

let definedClasses: string[] = []

export function traverseLiteral(c: TreeCursor, s: string): Value {
  switch (c.type.name) {
    case "Number":
      const val = Number(s.substring(c.from, c.to));
      return { tag: "num", value: val }
    case "Boolean":
      const b = s.substring(c.from, c.to);
      if (b === "False") {
        return { tag: "bool", value: false }
      }
      else if (b === "True") {
        return { tag: "bool", value: true };
      }
    case "None":
      return { tag: "none" }
  }
}

export function traverseBinop(c: TreeCursor, s: string): Op {
  //switch (s.substring(c.from, c.to)) {
  switch (s.substring(c.from, c.to)) {
    case "+":
      return { tag: "add" }
    case "-":
      return { tag: "sub" }
    case "*":
      return { tag: "mul" }
    case "//":
      return { tag: "div_s" }
    case "%":
      return { tag: "rem_s" }
    case "==":
      return { tag: "eq" }
    case "!=":
      return { tag: "ne" }
    case "<=":
      return { tag: "le_s" }
    case ">=":
      return { tag: "ge_s" }
    case "<":
      return { tag: "lt_s" }
    case ">":
      return { tag: "gt_s" }
    case "is":
      return { tag: "is" }
  }
}

export function traverseUniop(c: TreeCursor, s: string): UniOp {
  switch (s.substring(c.from, c.to)) {
    case "not":
      return { tag: "eqz" }
    case "-":
      return { tag: "neg" }
  }
}

// Checks if an "assign statement" is a variable declaration or an assignment
export function isVarDecl(c: TreeCursor): boolean {
  // assumes already at "assign statement"
  c.firstChild()   // go to variable name
  c.nextSibling()  // go to next node
  let name = c.type.name
  c.parent()  // escape back to "assign statement"
  return (name == "TypeDef")
}

export function traverseTypes(c: TreeCursor, s: string): Type {
  const type = s.substring(c.from, c.to);
  switch (type) {
    case "int":
      return { tag: "number" };
    case "bool":
      return { tag: "bool" };
    case "none":
      return { tag: "none" }
    default:
      if (definedClasses.includes(type)) {
        return { tag: "class", name: type }
      }
      else { throw new Error("Cannot find the name of type " + type + " at " + c.from + " " + c.to) }
  }
}

// Currently does not ssupport arrays
export function traverseTypedVar(c: TreeCursor, s: string): TypedVar {
  // assumes already inside "AssignStatement"
  c.firstChild()
  const name = s.substring(c.from, c.to);
  c.nextSibling()   // goes to typeDef
  c.firstChild()   // enter typedef
  c.nextSibling()  // skips the :
  //const typeString = s.substring(c.from, c.to);
  const type = traverseTypes(c, s);
  c.parent()   // escape back to typeDef
  c.parent()  // back to assignstatement

  return { tag: "typedVar", name, type }
}

export function traverseVarDef(c: TreeCursor, s: string): VarDef {
  const typedVar = traverseTypedVar(c, s);
  c.firstChild()  // into assign statement, to variable name
  c.nextSibling()  // to typedef
  c.nextSibling()  // to =
  c.nextSibling()  // to literal
  let literal = traverseLiteral(c, s)
  c.parent()  // escape back to assignstatement
  return { tag: "varDef", var: typedVar, lit: literal }
}


export function traverseParameters(c: TreeCursor, s: string): Array<TypedVar> {
  var paramList: Array<TypedVar> = []
  do {
    if (s.substring(c.from, c.to) === ",") continue
    if (s.substring(c.from, c.to) === ")") break

    let name = s.substring(c.from, c.to);
    c.nextSibling(); // focus on body
    c.firstChild(); // Focus on :
    c.nextSibling(); // focus on body
    let t = traverseTypes(c, s);
    c.parent(); // back to typedVar
    paramList.push({ tag: "typedVar", name: name, type: t })
  } while (c.nextSibling());
  return paramList
}

export function traverseMethodBody(c: TreeCursor, s: string): MethodBody {
  // Assumes already at the `body` node
  let localDecls: Array<VarDef> = []
  let stmtList: Array<Stmt> = []
  c.firstChild()  // go into the body
  c.nextSibling()  // to the first decl or statement
  do {
    if (isVarDecl(c)) {
      localDecls.push(traverseVarDef(c, s))
    } else {
      stmtList.push(traverseStmt(c, s))
    }
  } while (c.nextSibling())

  c.parent()
  return { tag: "methodBody", localDecls: localDecls, stmts: stmtList }
}

export function traverseMethodDef(c: TreeCursor, s: string): MethodDef {
  c.firstChild();  // Focus on def
  c.nextSibling(); // Focus on name of function
  var methodName = s.substring(c.from, c.to);
  c.nextSibling(); // Focus on ParamList
  c.firstChild(); // Go to open paren
  c.nextSibling(); // Go to self

  var selfType: Type = null
  if (s.substring(c.from, c.to) !== "self") {
    throw new Error("Method Definition has no self")
  }
  else {
    c.nextSibling() // Go to : type
    c.firstChild(); // Focus on :
    c.nextSibling(); // Go to type
    selfType = traverseTypes(c, s);
    c.parent(); // Exit self
  }
  c.nextSibling() // Go to next param if any
  var parameters: Array<TypedVar> = traverseParameters(c, s);
  c.parent(); // Exit paren
  c.nextSibling() // focus on body/ret type
  // Has return type
  var retType: Type = null;
  // parse return type
  if (s.substring(c.from, c.to)[0] === '-') {
    c.firstChild();
    retType = traverseTypes(c, s);
    c.parent();
  }
  else retType = { tag: "none" }
  c.nextSibling(); // Focus on Body

  //const body: FuncBody = traverseFuncBody(c,s);
  const body: MethodBody = traverseMethodBody(c, s);
  c.parent();      // Pop to FunctionDefinition
  return {
    tag: "methodDef",
    name: methodName, self: selfType, params: parameters, body, returnType: retType
  }
}

export function traverseClassBody(c: TreeCursor, s: string): Array<VarDef | MethodDef> {//Array<VarDef|MethodDef>{
  c.firstChild(); // go to :
  c.nextSibling(); // go to first decl

  var classbodyDefs: Array<VarDef | MethodDef> = []

  do {
    if (isVarDecl(c)) {
      console.log(s.substring(c.from, c.to));
      let vardef = traverseVarDef(c, s);
      classbodyDefs.push(vardef);
    }
    else {
      let mDef = traverseMethodDef(c, s);
      classbodyDefs.push(mDef);
    }
  } while (c.nextSibling());
  c.parent();
  return classbodyDefs;
}

export function traverseClassDef(c: TreeCursor, s: string): ClassDef {
  c.firstChild(); // Go into class Definition
  c.nextSibling(); // Go to className
  let name = s.substring(c.from, c.to);
  definedClasses.push(name);
  c.nextSibling(); // go to class argList
  //TODO implement field
  const field:Value = {tag:"object", name: s.substring(c.from, c.to), address:1}
  c.nextSibling(); // go to class body
  const classBody = traverseClassBody(c, s);
  c.parent(); // Pop class Body
  return {
    tag: "classDef",
    name: name,
    field: field,
    classBody: classBody
  }
}

export function traverseExpr(c: TreeCursor, s: string): Expr {
  switch (c.node.type.name) {
    case "Number":
    case "Boolean":
    case "None":
      return {
        tag: "literal",
        value: traverseLiteral(c, s)
      }
    case "VariableName":
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      };
    // TODO self may need 
    case "self":
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      }
    case "UnaryExpression":
      c.firstChild();
      const uniop = traverseUniop(c, s);
      c.nextSibling();
      const uniExpr = traverseExpr(c, s);
      c.parent();
      return {
        tag: "uniop",
        uniop: uniop,
        expr: uniExpr
      }
    case "BinaryExpression":
      c.firstChild(); // go to first expr
      const exp1 = traverseExpr(c, s);
      c.nextSibling(); // go to operation
      const op = traverseBinop(c, s);
      c.nextSibling(); // go to snd expr
      const exp2 = traverseExpr(c, s);
      c.parent(); // pop binary expression
      return {
        tag: "binop",
        expr1: exp1,
        op: op,
        expr2: exp2
      };
    case "ParenthesizedExpression":
      c.firstChild(); // go to (
      c.nextSibling();
      const paremExpr = traverseExpr(c, s);
      c.nextSibling();
      c.parent(); // pop parenthesized expression
      return {
        tag: "param",
        expr: paremExpr
      }
    case "MemberExpression":
      c.firstChild();
      const memberExpr = traverseExpr(c,s);
      c.nextSibling(); // Go to dot
      c.nextSibling(); // Go to name
      const propertyName = s.substring(c.from, c.to);
      c.parent();
      return {
        tag: "memberExpr",
        expr: memberExpr,
        propertyName: propertyName
      }
    case "CallExpression":
      c.firstChild();
      switch(c.type.name){
        case "VariableName":
          const callName = s.substring(c.from, c.to);
          if(callName === "print"){
            c.nextSibling();// go to argList
            c.firstChild();// go to (
            c.nextSibling(); // go to arg
            const arg = traverseExpr(c, s);
            c.parent(); // pop args 
            c.parent(); // pop expression
            return {tag:"print", value: arg}
          }
          else if(definedClasses.includes(callName)){
            // Then this is a constructor
            c.nextSibling(); // go to argList
            c.firstChild(); // go to (
            c.nextSibling(); // go to ）
            if(s.substring(c.from, c.to) !== ")"){
              throw new Error("Constructor of "+  callName +" expects zero arguments");
            }
            c.parent();
            c.parent(); // pop expression
            return {tag: "construct", name: callName} 
          }else{
            throw new Error("Unknown method call " + callName)
          }
        case "MemberExpression":
          c.firstChild(); // Go to Member expr
          const memExpr = traverseExpr(c, s);
          c.nextSibling(); // go to dot
          c.nextSibling(); // go to name
          const name = s.substring(c.from, c.to);
          c.parent(); // go back to call
          c.nextSibling();// go to argList
          
          c.firstChild(); // go to (
          
          var argList = []
          while (c.nextSibling()) {
            if (s.substring(c.from, c.to) === "," || s.substring(c.from, c.to) === ")") continue
            var expr = traverseExpr(c, s);
            argList.push(expr)
          }
          c.parent();// pop Arglist
          c.parent(); // Pop callExpression
          return {tag:"methodCall", expr: memExpr, name: name, arguments: argList}
        default:
          throw new Error("Invalid method call at "  + c.from +" " + c.to )
      }
    default:
      throw new Error("Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}


export function traverseStmt(c: TreeCursor, s: string): Stmt {
  switch (c.node.type.name) {
    case "AssignStatement":
      c.firstChild(); // go to name
      switch (c.type.name) {
        case "MemberExpression":
          c.firstChild(); //  go to expr
          const memExpr = traverseExpr(c,s);
          c.nextSibling(); // go to dot
          c.nextSibling(); // go to name
          const propertyName = s.substring(c.from, c.to);
          c.parent(); // pop memberExpr
          c.nextSibling(); // go to equal sign
          c.nextSibling(); // go to value
          const memValue = traverseExpr(c,s);
          c.parent();
          return {
            tag: "memberAssign",
            expr1: memExpr,
            propertyName: propertyName,
            expr2: memValue,
          }
        case "VariableName":
          const name = s.substring(c.from, c.to);
          c.nextSibling(); // go to equals/ 
          c.nextSibling(); // go to value
          const assignExpr = traverseExpr(c, s);
          c.parent();
          return {
            tag: "assign",
            name: name,
            expr: assignExpr
          }
        default:
          throw new Error("unable to parse the assign statement");
      }
    case "IfStatement":
      c.firstChild(); //go to "if" 
      c.nextSibling(); // go to condition
      const cond = traverseExpr(c, s); // get the condition
      var elseStmts: Stmt[] = [];
      var thnStmts: Stmt[] = [];

      c.nextSibling(); // go to body
      c.firstChild(); // go to :
      c.nextSibling();  // go to actual stmts
      do {
        const thnStmt = traverseStmt(c, s);
        thnStmts.push(thnStmt);
      } while (c.nextSibling())

      c.parent(); // pop body
      if (c.nextSibling()) {
        c.firstChild(); // go to else
        c.nextSibling(); // go to else body
        c.firstChild(); // go to :

        c.nextSibling(); // go to else stmts
        do {
          const elseStmt = traverseStmt(c, s);
          elseStmts.push(elseStmt);
        } while (c.nextSibling())
        c.parent(); // pop body
      }
      c.parent(); // pop back to ifStmt
      return {
        tag: "if",
        cond: cond,
        thn: thnStmts,
        els: elseStmts,
      }
    case "PassStatement":
      return { tag: "pass" }
    case "ReturnStatement":
      c.firstChild();  // Focus return keyword
      var returnVal;
      if (c.nextSibling()) {// Focus expression (there may be no stmt)
        returnVal = traverseExpr(c, s);
        c.parent();
        return { tag: "return", value: returnVal };
      }
      else{
        c.parent();
        return {tag: "return"}
      }
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return {
        tag: "expr",
        expr: expr
      }
    default:
      throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}


export function traverseProgram(c: TreeCursor, s: string): Program {
  switch (c.node.type.name) {
    case "Script":
      const stmts: Array<Stmt> = [];
      const decls: Array<VarDef | ClassDef> = [];
      c.firstChild();
      do {
        if (c.type.name === "ClassDefinition") {
          decls.push(traverseClassDef(c, s));
        } else if (isVarDecl(c)) {
          decls.push(traverseVarDef(c, s));
        } else {
          stmts.push(traverseStmt(c, s));
        }
      } while (c.nextSibling())
      console.log("traversed " + decls.length + " declarations", decls, "stopped at ", c.node);
      console.log("traversed " + stmts.length + " statements ", stmts, "stopped at ", c.node);
      return { tag: "program", decls, stmts }
    default:
      throw new Error("Could not parse program at " + c.node.from + " " + c.node.to + " " + c.type.name);
  }
}

export function parse(source: string): Program {
  const t = parser.parse(source);
  return traverseProgram(t.cursor(), source);
}
