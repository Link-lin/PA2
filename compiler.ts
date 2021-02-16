import { GlobalEnv } from './compiler';
import { methodTypes } from './tc';
import { Stmt, Expr, Op, UniOp, Type, Value, ClassDef, VarDef, MethodDef, MethodBody, TypedVar } from "./ast";
import { parse } from "./parser";


export const emptyEnv = { globals: new Map(), offset: 0 };

type CompileResult = {
  declFuncs: string,
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

var classDefinition = new Map<string, Array<TypedVar>>()

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
      if(decl.var.type.tag === "class"){ 
        bodySize += calculateClassVaiableSize(decl.var.type, classSize);
      }
      else{
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

function getVarLocationInBody(typedVar: TypedVar, className: string, env: GlobalEnv){

  const vars:TypedVar[] = classDefinition.get(className);

  var index = 0

  vars.forEach(v => {
    if(v.name === typedVar.name && v.type.tag === typedVar.type.tag){
      return index;
    }
    else{
      calculateClassVaiableSize(v.type, env.classSize);
    }
  })
  return index
}

function envLookup(env: GlobalEnv, name: string) {
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
          if(def.lit.tag === "none"){
            varDefStmts.push(`(i32.const ${envLookup(env, def.var.name)}) ;; ${def.var.name}`);
            varDefStmts.push("(i32.const " + reprLiteral(def.lit, env) + ")");
            varDefStmts.push("(i32.store)");
          }
          else{
            if(def.lit.tag === "object"){
              const otherClassName = def.lit.name
              const otherClassLocation = envLookup(env, otherClassName);
              env.globals.set(def.var.name, otherClassLocation);
            }
          }
        }
      } else {
        // Inside the class
        if (className) {
          const classPointer = envLookup(env, className);
          const location = getVarLocationInBody(def.var, className, env);
          varDefStmts.push(`(i32.const ${classPointer + location}) ;; ${def.var.name}`);
          varDefStmts.push("(i32.const " + reprLiteral(def.lit, env) + ")");
          varDefStmts.push("(i32.store)"); 
        }
        else {
          varDefStmts.push(`(local $${def.var.name} i32)`);
          varDefStmts.push("(i32.const " + reprLiteral(def.lit, env) + ")");
          varDefStmts.push(`(local.set $${def.var.name})`);
        }
      }
      return varDefStmts;
    case "classDef":
      var classVar: TypedVar[] = []

      // Populate class Variable
      def.classBody.forEach(bd => {
        switch (bd.tag) {
          case "varDef":
            classVar.push(bd.var);
        }
      })
      classDefinition.set(def.name, classVar);


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

export function 

export function codeGenStmt(stmt: Stmt, env: GlobalEnv, className: string): Array<string>{

  return []
}


export function compile(source: string, env: GlobalEnv): CompileResult {
  const ast = parse(source);
  var scratchEnv = cloneEnv(env);

  var newEnv = augmentEnv(scratchEnv, ast.decls);
  console.log(newEnv.globals)

  const defs = ast.decls;
  var definedVars = new Set();
  var definedClasses = new Set<ClassDef>();
  var initVars = new Set<VarDef>();

  defs.forEach(s => {
    switch (s.tag) {
      case "varDef":
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


  return {
    declFuncs: null,
    wasmSource: null,
    newEnv: null
  };
}
