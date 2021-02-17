import {BasicREPL} from './repl';
import { Type } from './ast';
import { BOOL, CLASS, NONE, NUM } from './utils';


function webStart() {
  document.addEventListener("DOMContentLoaded", function() {

    function stringify(typ: Type, arg: any): string {
      switch (typ.tag) {
        case "number":
          return (arg as number).toString();
        case "bool":
          return (arg as boolean) ? "True" : "False";
        case "none":
          return "None";
        case "class":
          return typ.name;
      }
    }

    function print(typ: Type, arg: any): any {
      console.log("Logging from WASM: ", arg);
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.innerText = stringify(typ, arg);
      return arg;
    }

    var importObject = {
      imports: {
        print: (arg: any) => print(CLASS(""), arg),
        print_num: (arg: number) => print(NUM, arg),
        print_bool: (arg: number) => print(BOOL, arg),
        print_none: (arg: number) => print(NONE, arg),
      },
    };
    var repl = new BasicREPL(importObject);

    function renderResult(result : any) : void {
      if(result === undefined) { console.log("skip"); return; }
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.innerText = String(result);
    }

    function renderError(result : any) : void {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.setAttribute("style", "color: red");
      elt.innerText = String(result);
    }

    function setupRepl() {
      document.getElementById("output").innerHTML = "";
      const replCodeElement = document.getElementById("next-code") as HTMLInputElement;
      replCodeElement.addEventListener("keypress", (e) => {
        if(e.key === "Enter") {
          const output = document.createElement("div");
          const prompt = document.createElement("span");
          prompt.innerText = "»";
          output.appendChild(prompt);
          const elt = document.createElement("input");
          elt.type = "text";
          elt.disabled = true;
          elt.className = "repl-code";
          output.appendChild(elt);
          document.getElementById("output").appendChild(output);
          const source = replCodeElement.value;
          elt.value = source;
          replCodeElement.value = "";
          repl.run(source).then((r) => {console.log ("run finished") })
              .catch((e) => { renderError(e); console.log("run failed", e) });;
        }
      });
    }
    document.getElementById("run").addEventListener("click", function(e) {
      repl = new BasicREPL(importObject);
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      setupRepl();
      repl.run(source.value).then((r) => {console.log ("run finished") })
          .catch((e) => { renderError(e); console.log("run failed", e) });;
    });

    document.getElementById("tc").addEventListener("click", function(e){
      repl = new BasicREPL(importObject);
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      setupRepl();
      repl.tc(source.value).then((r) => {console.log(r);renderResult(r.tag); console.log("typeCheck finished")})
        .catch((e) => {renderError(e); console.log("type check failed", e)})
  })
  });
}

webStart();