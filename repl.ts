import {run} from "./runner";
import {emptyEnv, GlobalEnv} from "./compiler";
import { Type } from "./ast";

interface REPL {
  run(source : string) : Promise<any>;
  tc(source: string): Promise<Type>;
}

export class BasicREPL {
  currentEnv: GlobalEnv
  importObject: any
  memory: any
  constructor(importObject : any) {
    this.importObject = importObject;
    if(!importObject.js) {
      const memory = new WebAssembly.Memory({initial:10, maximum:50});
      this.importObject.js = { memory: memory };
    }
    this.currentEnv = {
      types: new Map(),
      globals: new Map(),
      offset: 0
    };
  }

  async tc(source:string): Promise<Type>{
    console.log(source);
    return 
  }

  async run(source : string) : Promise<any> {
    this.importObject.updateNameMap(this.currentEnv); // is this the right place for updating the object's env?
    const [result, newEnv] = await run(source, {importObject: this.importObject, env: this.currentEnv});
    this.currentEnv = newEnv;
    return result;
  }
}