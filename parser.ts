import { parser } from "lezer-python";
import { Tree, TreeCursor } from "lezer-tree";
import { getJSDocReturnType } from "typescript";
import { Expr, Op, Stmt, Type, Parameter, UniOp } from "./ast";

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

export function traverseType(c: TreeCursor, s: string): Type {
  switch (s.substring(c.from, c.to)) {
    case "int":
      return { tag: "int" }
    case "bool":
      return { tag: "bool" }
  }
}

export function traverseParameters(c: TreeCursor, s: string): Array<Parameter> {
  c.firstChild();  // Focuses on open paren

  var paramList = []
  while (c.nextSibling()) {
    if (s.substring(c.from, c.to) === "," || s.substring(c.from, c.to) === ")") continue

    let name = s.substring(c.from, c.to);
    c.nextSibling(); // focus on body
    c.firstChild(); // Focus on :
    c.nextSibling(); // focus on body
    let t = traverseType(c, s);
    c.parent();
    paramList.push({ name: name, type: t })
  }
  c.parent();
  return paramList
}

export function traverseExpr(c: TreeCursor, s: string): Expr {
  switch (c.type.name) {
    case "Number":
      return {
        tag: "literal",
        value: {
          tag: "number",
          value: Number(s.substring(c.from, c.to)),
          type: { tag: "int" }
        }
      };
    case "Boolean":
      const boolStr = s.substring(c.from, c.to) === "True" ? "True" : "False";
      var boolVal = (boolStr === "True");
      return {
        tag: "literal",
        value: {
          tag: boolStr,
          value: boolVal,
          type: { tag: "bool" }
        }
      }
    case "None":
      return {
        tag: "literal",
        value: {
          tag: "None"
        }
      }
    case "VariableName":
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      };

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
      var tmp = s.substring(c.from, c.to);
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
    case "CallExpression":
      c.firstChild();
      const callName = s.substring(c.from, c.to);
      c.nextSibling(); // focus on arglist
      c.firstChild(); //focus on (
      var argList = []
      while(c.nextSibling()){
        if(s.substring(c.from, c.to)===","|| s.substring(c.from, c.to)===")") continue
        var expr = traverseExpr(c, s); 
        argList.push(expr)
      }
      c.parent() // pop arglist
      c.parent() // expressionstmt
      return {tag:"call", name: callName, arguments:argList}
    /*
    if (s.substring(c.from, c.to) !== ",") {
      c.parent(); // pop arglist
      c.parent(); // pop CallExpression
      return {
        tag: "builtin1",
        name: callName,
        arg: arg
      }
    } else {
      c.nextSibling() // skip the comma
      const arg2 = traverseExpr(c, s);
      c.parent();
      c.parent();
      return {
        tag: "builtin2",
        name: callName,
        arg1: arg,
        arg2: arg2
      };
    }
    */
    default:
      throw new Error("Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseStmt(c: TreeCursor, s: string): Stmt {
  switch (c.node.type.name) {
    case "AssignStatement":
      c.firstChild(); // go to name
      const name = s.substring(c.from, c.to);
      c.nextSibling(); // go to equals/body
      // var tmp = s.substring(c.from, c.to);
      if (s.substring(c.from, c.to) !== "=") {
        c.firstChild(); // focus on :
        c.nextSibling(); // focus on type
        const type = traverseType(c, s);
        c.parent(); // pop body
        c.nextSibling(); // go to equal
        c.nextSibling(); // go to value
        const value = traverseExpr(c, s);
        c.parent();
        return { tag: "init", name: name, type: type, value: value }
      }
      c.nextSibling(); // go to value
      const value = traverseExpr(c, s);
      c.parent();
      return {
        tag: "assign",
        name: name,
        value: value
      }
    case "IfStatement":
      c.firstChild(); //go to "if" 
      c.nextSibling(); // go to condition
      const cond = traverseExpr(c, s); // get the condition
      c.nextSibling(); // go to body
      c.firstChild(); // focus on :
      var thnStmts: Stmt[] = [];
      var elifStmts: Stmt[] = [];
      var elseStmts: Stmt[] = [];
      while (c.nextSibling()) {
        thnStmts.push(traverseStmt(c, s));
      }
      c.parent(); // pop body
      c.parent(); // go back to if
      //var tmp = s.substring(c.from, c.to)
      // if there is elif or else
      var hasElif = false;
      if (c.nextSibling()) {
        if (s.substring(c.from, c.to) === "elif") {
          hasElif = true
          c.nextSibling(); // go to body
          c.firstChild(); // focus on :
          while (c.nextSibling()) {
            elifStmts.push(traverseStmt(c, s));
          }
        }
        var tmp = s.substring(c.from, c.to);
        if (hasElif) {
          c.parent()
          c.nextSibling(); // focus on else()
        }
        if (s.substring(c.from, c.to) == "else") {
          c.nextSibling(); // go to body
          c.firstChild(); // focus on :
          while (c.nextSibling()) {
            elseStmts.push(traverseStmt(c, s));
          }
        }
      }
      c.parent() // pop up to body
      c.parent() // pop to if
      return {
        tag: "if",
        //cond: {tag:"id", name: tmp},
        cond: cond,
        thn: thnStmts,
        els: elseStmts,
        elif: elifStmts
      }
    case "WhileStatement":
      c.firstChild(); // focus on while
      c.nextSibling(); // focus on while cond
      const whileExpr = traverseExpr(c, s);
      c.nextSibling(); // focus on body
      c.firstChild(); // focus on :

      var whileStmts = [];
      while (c.nextSibling()) {
        console.log(traverseStmt(c,s))
        whileStmts.push(traverseStmt(c, s));
      }
      c.parent()  // pop up to body
      c.parent() // pop to while
      return {
        tag: "while",
        expr: whileExpr,
        stmts: whileStmts
      }

    case "FunctionDefinition":
      c.firstChild();  // Focus on def
      c.nextSibling(); // Focus on name of function
      var funcName = s.substring(c.from, c.to);
      c.nextSibling(); // Focus on ParamList
      var parameters = traverseParameters(c, s);
      c.nextSibling() // focus on body/ret type
      // Has return type
      var retType= null;
      // parse return type
      if(s.substring(c.from,c.to)[0] === '-'){
        c.firstChild();
        retType = traverseType(c, s);
        c.parent();
      }
      c.nextSibling(); // Focus on Body
      c.firstChild();  // Focus on :

      var bodyStmt = []
      // determine if init came first and func declare not inside function
      while (c.nextSibling()) {
        bodyStmt.push(traverseStmt(c, s));
      }

      c.parent();      // Pop to Body
      c.parent();      // Pop to FunctionDefinition
      
      var ret: Type = { tag: "int" } // todo
      return {
        tag: "define",
        name: funcName, parameters, body:bodyStmt, ret:retType
      }
    case "PassStatement":
      return { tag: "pass" }
    case "ReturnStatement":
      c.firstChild();  // Focus return keyword
      var returnVal;
      if (c.nextSibling()) {// Focus expression (there may be no stmt)
        returnVal = traverseExpr(c, s);
      }
      c.parent();
      return { tag: "return", value: returnVal };
    case "ExpressionStatement":
      c.firstChild();
      let childName = c.node.type.name;
      if ((childName as any) === "CallExpression") { // Note(Joe): hacking around typescript here; it doesn't know about state
        c.firstChild();
        const callName = s.substring(c.from, c.to);
        if (callName === "print") {
          c.nextSibling(); // go to arglist
          c.firstChild(); // go into arglist
          c.nextSibling(); // find single argument in arglist
          const arg = traverseExpr(c, s);
          c.parent(); // pop arglist
          c.parent(); // pop expressionstmt
          return {
            tag: "print",
            // LOL TODO: not this
            value: arg
          };
        }else{
          c.nextSibling(); // focus on arglist
          c.firstChild(); //focus on (
          var argList = []
          while(c.nextSibling()){
            if(s.substring(c.from, c.to)===","|| s.substring(c.from, c.to)===")") continue
            var expr = traverseExpr(c, s); 
            argList.push(expr)
          }
          c.parent() // pop arglist
          c.parent() // expressionstmt
          return {tag: "expr", expr:{tag:"call", name: callName, arguments:argList}}
        }
      }
      else {
        const expr = traverseExpr(c, s);
        c.parent(); // pop going into stmt
        return {
          tag: "expr",
          expr: expr
        }
      }
    default:
      throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverse(c: TreeCursor, s: string): Array<Stmt> {
  switch (c.node.type.name) {
    case "Script":
      const stmts = [];
      c.firstChild();
      do {
        stmts.push(traverseStmt(c, s));
      } while (c.nextSibling())
      console.log("traversed " + stmts.length + " statements ", stmts, "stopped at ", c.node);
      return stmts;
    default:
      throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
  }
}

export function parse(source: string): Array<Stmt> {
  const t = parser.parse(source);
  return traverse(t.cursor(), source);
}
