// This is a mashup of tutorials from:
//
// - https://github.com/AssemblyScript/wabt.js/
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API

import wabt from 'wabt';
//import { TRUE, FALSE, NONE, codeGen } from './compiler_old';
import * as compiler from './compiler';
import {parse} from './parser';
import { tcProgram } from './tc';
import { PyValue } from './utils';

// NOTE(joe): This is a hack to get the CLI Repl to run. WABT registers a global
// uncaught exn handler, and this is not allowed when running the REPL
// (https://nodejs.org/api/repl.html#repl_global_uncaught_exceptions). No reason
// is given for this in the docs page, and I haven't spent time on the domain
// module to figure out what's going on here. It doesn't seem critical for WABT
// to have this support, so we patch it away.
if(typeof process !== "undefined") {
  const oldProcessOn = process.on;
  process.on = (...args : any) : any => {
    if(args[0] === "uncaughtException") { return; }
    else { return oldProcessOn.apply(process, args); }
  };
}

var declaredFunc:string[] = []

export async function run(source : string, config: any) : Promise<[any, compiler.GlobalEnv]> {
  const wabtInterface = await wabt();
  const parsed = parse(source);
  var returnType = "";
  var returnExpr = "";
  
  const stmts = parsed.stmts;
  /*
  if(stmts[stmts.length - 1].tag === "expr") {
    returnType = "(result i64)";
    returnExpr = "(local.get $$last)"
  }
  */
  const compiled = compiler.compile(source, config.env);
  const importObject = config.importObject;
  if(!importObject.js) {
    const memory = new WebAssembly.Memory({initial:10, maximum:100});
    importObject.js = { memory: memory };
  }
  const wasmSource = `(module
    (func $print (import "imports" "print") (param i32) (result i32))
    (func $print_num (import "imports" "print_num") (param i32) (result i32))
    (func $print_none (import "imports" "print_none") (param i32) (result i32))
    (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    (import "js" "memory" (memory 1))
      ${compiled.wasmSource}
    )`;
  const myModule = wabtInterface.parseWat("test.wat", wasmSource);
  var asBinary = myModule.toBinary({});
  var wasmModule = await WebAssembly.instantiate(asBinary.buffer, importObject);
  var result = (wasmModule.instance.exports.exported_func as any)();

  // Handle Boolean value and None value
  //if(result === TRUE){ result ="True" } 
  //else if(result === NONE){ result = "None" }
  //else if(result === FALSE){ result = "false" }
  const type = await tcProgram(source, compiled.newEnv);
  result = PyValue(type, result);

  return [result, compiled.newEnv];
}
