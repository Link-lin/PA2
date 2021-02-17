import { methodTypes, tcExpression, tcLiteral, tcStatements, program, tcProgram } from './tc';
import { Stmt, Expr, Op, UniOp, Type, Value, ClassDef, VarDef, MethodDef, MethodBody, TypedVar, Program } from "./ast";


export const emptyEnv = { globals: new Map(), offset: 0 };

type CompileResult = {
  wasmSource: string,
  newEnv: GlobalEnv
};

// Numbers are offsets into global memory
export type GlobalEnv = {
  types: Map<string, Type>,
  globals: Map<string, number>,
  classSize: Map<string, number>,
  defineMethodSigs: Map<string, string>
  definedMethodsBody: Map<string, string>,
  offset: number
}

var classDefinition = new Map<string, Array<VarDef>>()

function reprLiteral(literal: Value, env: GlobalEnv): string {
  switch (literal.tag) {
    case "none":
      return "0";
    case "bool":
      return literal.value ? "1" : "0"
    case "num":
      return literal.value.toString();
    case "object":
      envLookup(env, literal.name)
  }
}

export function cloneEnv(env: GlobalEnv): GlobalEnv {
  return {
    globals: new Map<string, number>(env.globals),
    types: new Map<string, Type>(env.types),
    classSize: new Map<string, number>(env.classSize),
    defineMethodSigs: new Map<string, string>(env.defineMethodSigs),
    definedMethodsBody: new Map<string, string>(env.definedMethodsBody),
    offset: env.offset
  };
}


export function augmentEnv(env: GlobalEnv, defs: Array<VarDef | ClassDef>): GlobalEnv {
  const newEnv = new Map(env.globals);
  var newTypes = new Map(env.types);
  var newClassSize = new Map(env.classSize);
  var newMethodSigs = new Map(env.defineMethodSigs);
  var newMethodBody = new Map(env.definedMethodsBody);
  var newOffset = env.offset;

  // Handle all the variables first
  defs.forEach((s) => {
    switch (s.tag) {
      case "varDef":
        if (s.var.type.tag !== "class") {
          newEnv.set(s.var.name, newOffset);
          newTypes.set(s.var.name, s.var.type);
          newOffset += 1;
        }
        else {
          newEnv.set(s.var.name, newOffset);
          newTypes.set(s.var.name, s.var.type);
          // console.log(s.var.name);
          // console.log(newClassSize)
          newOffset += newClassSize.get(s.var.type.name);
        }
        break;
      case "classDef":
        const body = s.classBody
        var bodySize = calculateClassSize(body, newClassSize);
        newClassSize.set(s.name, bodySize);
        // Save counter pointer in globals
        break;
    }
  })

  return {
    globals: newEnv,
    types: newTypes,
    classSize: newClassSize,
    defineMethodSigs: newMethodSigs,
    definedMethodsBody: newMethodBody,
    offset: newOffset
  }
}

function calculateClassSize(body: Array<VarDef | MethodDef>, classSize: Map<string, number>): number {
  var bodySize = 0;
  body.forEach(decl => {
    if (decl.tag === "varDef") {
      // don't have class varibale inside class with this difinition
      if (decl.var.type.tag === "class") {
        bodySize += calculateClassVaiableSize(decl.var.type, classSize);
      }
      else {
        bodySize += 1
      }
    }
  });
  return bodySize;
}

function calculateClassVaiableSize(type: Type, classSize: Map<string, number>) {
  if (type.tag !== "class") return 1
  else {
    return classSize.get(type.name)
  }
}

function getVarLocationInBody(typedVar: TypedVar, className: string, env: GlobalEnv): number{
  const vars: VarDef[] = classDefinition.get(className);
  var index = 0
  vars.forEach(v => {
    if (v.var.name === typedVar.name && v.var.type.tag === typedVar.type.tag) {
      return index;
    }
    else {
      calculateClassVaiableSize(v.var.type, env.classSize);
    }
  })
  return index
}

function envLookup(env: GlobalEnv, name: string) {
  if(name)
  if (!env.globals.has(name)) { console.log("Could not find " + name + " in ", env); throw new Error("Could not find name " + name); }
  return (env.globals.get(name) * 4); // 4-byte values
}

export function codeGenDef(def: VarDef | ClassDef, env: GlobalEnv, className: string): Array<string> {
  switch (def.tag) {
    case "varDef":
      var varDefStmts: string[] = [];
      if (def.isGlobal) { //this is a global variable
        // If the global variable is not class
        if (def.var.type.tag !== "class") {
          varDefStmts.push(`(i32.const ${envLookup(env, def.var.name)}) ;; ${def.var.name}`);
          varDefStmts.push("(i32.const " + reprLiteral(def.lit, env) + ")");
          varDefStmts.push("(i32.store)");
        }
        else {
          // if the varDef is a class
          if (def.lit.tag === "none") {
            varDefStmts.push(`(i32.const ${envLookup(env, def.var.name)}) ;; ${def.var.name}`);
            varDefStmts.push("(i32.const " + reprLiteral(def.lit, env) + ")");
            varDefStmts.push("(i32.store)");
          }
          else {
            if (def.lit.tag === "object") {
              const otherClassName = def.lit.name
              const otherClassLocation = envLookup(env, otherClassName);
              env.globals.set(def.var.name, otherClassLocation);
            }
          }
        }
      } else {
        // Inside the class
        if (className) {
          classDefinition.get(className).push(def)
          /*
          const classPointer = envLookup(env, className);
          const location = getVarLocationInBody(def.var, className, env);
          varDefStmts.push(`(i32.const ${classPointer + location}) ;; ${def.var.name}`);
          varDefStmts.push("(i32.const " + reprLiteral(def.lit, env) + ")");
          varDefStmts.push("(i32.store)");
          */
          
        }
        else {
          varDefStmts.push(`(local $${def.var.name} i32)`);
          varDefStmts.push("(i32.const " + reprLiteral(def.lit, env) + ")");
          varDefStmts.push(`(local.set $${def.var.name})`);
        }
      }
      return varDefStmts;
    case "classDef":
      classDefinition.set(def.name, []);
      // Populate class Variable
      def.classBody.forEach(bd => {
        switch (bd.tag) {
          case "varDef":
            codeGenDef(bd, env, def.name)
        }
      })

      def.classBody.forEach(bd => {
        codeGenClassBody(bd, env, def.name);
      })
  }
}

export function codeGenMethodody(body: MethodBody, env: GlobalEnv, className: string) {
  var bodyStmts: Array<string> = [];
  body.localDecls.forEach(function (def) {
    bodyStmts = bodyStmts.concat(codeGenDef(def, env, className));
  });

  body.stmts.forEach(function (stmt) {
    bodyStmts = bodyStmts.concat(codeGenStmt(stmt, env, className));
  });
  //bodyStmts.push("(local.get $$last)");
  bodyStmts.push("(i32.const 0)"); //implicitly return None
  bodyStmts.push("(return)");
  bodyStmts.push("(unreachable)");
  return bodyStmts
}

export function codeGenClassBody(def: VarDef | MethodDef, env: GlobalEnv, className: string): Array<string> {
  switch (def.tag) {
    case "varDef":

      codeGenDef(def, env, className);
      break;
    case "methodDef":
      var methodDefStmts: string[] = []
      var sigHead = `(func $${className}_${def.name} `

      var defstring = "";
      def.params.forEach(function (param) {
        defstring += ` (param $${param.name} i32)`; // always i32
      });
      defstring += " (result i32)"
      methodDefStmts.push(sigHead + defstring);
      //funcDefStmts.push(exportHead + defstring);
      var methodSig = sigHead + defstring + ")";
      env.defineMethodSigs.set((className + "_" + def.name), methodSig);

      methodDefStmts.push("(local $$last i32)")

      methodDefStmts = methodDefStmts.concat(codeGenMethodody(def.body, env, className));
      methodDefStmts.push(")");

      var exportMethod = methodDefStmts.join("\n") + "\n";
      env.definedMethodsBody.set((className + "_" + def.name), exportMethod);

      return []
  }
}

// Include class name for self
export function codeGenExpr(expr: Expr, env: GlobalEnv, className: string): Array<string> {
  switch (expr.tag) {
    case "binop":
      //push op 1
      let binStmts = codeGenExpr(expr.expr1, env, className);
      //push op 2
      binStmts = binStmts.concat(codeGenExpr(expr.expr2, env, className));
      binStmts.concat([`(i32.${expr.op.tag})`])
      //add operator
      switch (expr.op.tag) {
        case "add":
        case "sub":
        case "mul":
        case "div_s":
        case "rem_s":
        case "eq":
        case "ne":
        case "le_s":
        case "ge_s":
        case "lt_s":
        case "gt_s":
          return binStmts.concat(`(i32.${expr.op.tag})`)
        case "is":
          const lType = tcExpression(expr.expr1, env.types, className);
          const rType = tcExpression(expr.expr1, env.types, className);
          if (lType.tag === "none" && rType.tag === "none") {
            const result = reprLiteral({ tag: "bool", value: true }, env);
            return [result]
          }
          else if (lType.tag === "class" && rType.tag == "class") {
            // Minor error here return true when two class are the same
            if (lType.name === rType.name) {
              const result = reprLiteral({ tag: "bool", value: true }, env);
              return [result]
            }
          }
          else {
            const result = reprLiteral({ tag: "bool", value: false }, env);
            return [result]
          }
      }
      break;
    case "uniop":
      //push arg
      let unStmts = codeGenExpr(expr.expr, env, className);
      switch (expr.uniop.tag) {
        case "neg":
          unStmts.push(`(i32.const 0)`);
          unStmts.push(`(i32.sub)`);
          return unStmts;
        case "eqz":
          unStmts.push(`(i32.const -1)`);
          unStmts.push(`(i32.xor)`);
          return unStmts;
      }
    case "id":
      console.log(expr);
      if (expr.isGlobal) {
        var varStmts = []
        varStmts.push(`(i32.const ${envLookup(env, expr.name)}) ;; ${expr.name}`);
        varStmts.push(`(i32.load)`);
        return varStmts
      }
      // TODO palaceholder for x in methodbody
      break
    case "literal":
      if (expr.value.tag !== "object") {
        return ["(i32.const " + reprLiteral(expr.value, env) + ")"];
      }
      // There is no case where liter is object (when class clone(object)) might be the only one
      break;
    case "construct":

  }
}

export function codeGenStmt(stmt: Stmt, env: GlobalEnv, className: string): Array<string> {
  switch (stmt.tag) {
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr, env, className);
      return exprStmts.concat([`(local.set $$last)`]);

    case "if":
      var ifStmts: string[] = [];

      ifStmts = ifStmts.concat(codeGenExpr(stmt.cond, env, className));
      ifStmts.push("(if");
      ifStmts.push("(then");
      stmt.thn.forEach(function (s: Stmt) {
        ifStmts = ifStmts.concat(codeGenStmt(s, env, className));
      });
      ifStmts.push(")");
      if (stmt.els) {
        ifStmts.push("(else");
        stmt.els.forEach(function (s: Stmt) {
          ifStmts = ifStmts.concat(codeGenStmt(s, env, className));
        });
        ifStmts.push(")");
      }
      ifStmts.push(")");
      return ifStmts
    case "return":
      var returnStmts: string[] = [];
      if (stmt.value) {
        returnStmts = returnStmts.concat(codeGenExpr(stmt.value, env, className));
      } else {
        returnStmts.push("(i32.const 0)");
      }
      returnStmts.push("(return)");
      return returnStmts
    case "pass":
      return [""]
    case "assign":
      var assignStmts:string[] = [];
      const t = tcExpression(stmt.expr, env.types, className);
      console.log(t);
     if(stmt.isGlobal){ //this is a global variable
        if(t.tag === "class"){
          assignStmts.push(`(i32.const ${envLookup(env, stmt.name)}) ;; ${stmt.name}`);
        }
        assignStmts.push(`(i32.const ${envLookup(env, stmt.name)}) ;; ${stmt.name}`);
        assignStmts = assignStmts.concat(codeGenExpr(stmt.expr, env, className));
        assignStmts.push("(i32.store)");
      } else {

        //assignStmts = assignStmts.concat(codeGenExpr(stmt.expr, env));
        assignStmts.push(`(local.set $${stmt.name})`)
      }
      return assignStmts 
      break;
    case "memberAssign":
  }
}

//required for compile time dispatching of a program's overall value
export function lastPrint(pgm: Program, oldEnv: GlobalEnv): string {
  var ty: Type = { tag: "none" }

  var env = new Map<string, Type>(oldEnv.types);
  //do a preliminary pass to populate env
  for (var i = 0; i < pgm.decls.length; i++) {
    var def = pgm.decls[i];
    switch (def.tag) {
      case "classDef":
        env.set(def.name, { tag: "class", name: def.name });
        break;
      case "varDef":
        env.set(def.var.name, def.var.type);
    }
  }
  if (pgm.stmts.length == 0) ty = { tag: "none" }
  //var empty = new Map<string, Type>();
  else { ty = tcStatements(pgm.stmts[pgm.stmts.length - 1], env, { tag: "none" }, null, true); }
  switch (ty.tag) {
    case "number":
      return "(call $print_num)\n";
    case "bool":
      return "(call $print_bool)\n";
    case "class":
      return "(call $print)\n";
    case "none":
      return "(call $print_none)\n"
    default:
      return "";
  }
}


export function compile(source: string, env: GlobalEnv): CompileResult {
  var ast = program
  var scratchEnv = cloneEnv(env);
  const last_instr = lastPrint(ast, scratchEnv)
  var newEnv = augmentEnv(scratchEnv, ast.decls);
  console.log(newEnv.globals)

  const defs = ast.decls;
  var definedVars = new Set();
  var definedClasses = new Set<ClassDef>();
  var initVars = new Set<VarDef>();

  defs.forEach(s => {
    switch (s.tag) {
      case "varDef":
        s.isGlobal = true
        definedVars.add(s.var.name);
        initVars.add(s);
        break;
      case "classDef":
        definedClasses.add(s);
        break;
    }
  })

  console.log(definedClasses);
  const scratchVar: string = `(local $$last i32)`;
  var localDefines: string[] = [];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i32)`);
  })

  // perform initialization
  var methodDefines: string[] = [];
  definedClasses.forEach(c => {
    methodDefines.concat(codeGenDef(c, newEnv, null));
  })

  var initializations: string[] = [];
  initVars.forEach((d, k, m) => initializations = initializations.concat(codeGenDef(d, newEnv, null)));
  var localInit = [].concat([].concat.apply([], initializations));

  // throw new Error(ast.stmts[ast.stmts.length - 1].tag + "");
  const commandGroups = ast.stmts.map((stmt) => codeGenStmt(stmt, newEnv, null));
  localDefines = localDefines.concat([].concat.apply([], localInit));

  var stmtString = `(func (export "exported_func") (result i32)\n` + scratchVar + "\n";
  stmtString += (localDefines.concat([].concat.apply([], commandGroups))).join("\n");
  stmtString += `\n(local.get $$last)\n`;
  stmtString += (last_instr);
  stmtString += `)`;
  var commands = methodDefines.join("\n") + "\n" + stmtString + "\n";
  //const commands = localDefines.concat([].concat.apply([], commandGroups));
  console.log("Generated: ", commands);//commands.join("\n"));
  //throw new Error(commands.join("\n"));
  return {
    wasmSource: commands,//.join("\n"),
    newEnv: newEnv
  };
}
