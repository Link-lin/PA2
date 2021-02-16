import {BasicREPL} from './repl';
import {emptyEnv, GlobalEnv} from './compiler';
import { output } from './webpack.config';


function webStart() {
  document.addEventListener("DOMContentLoaded", function() {

    var importObject = {
      imports: {
        print_global_func: (pos: number, value: number) => {
          var name = importObject.nameMap[pos];
          var msg = name + " = " + value;
          renderResult(msg);
        },
        printInt: (arg : any) => {
          console.log("Logging from WASM: ", arg);
          const elt = document.createElement("pre");
          document.getElementById("output").appendChild(elt);
          elt.innerText = arg;
          return 0;
        },
        printNone: (arg : any) => {
          console.log("Logging from WASM: ", arg);
          const elt = document.createElement("pre");
          document.getElementById("output").appendChild(elt);
          elt.innerText = "None";
          return 0;
        },
        printBool: (arg : number) => {
          var bool = "False";
          if(arg != 0){
            bool = "True";
          }
          console.log("Logging from WASM: ", bool);        
          const elt = document.createElement("pre");
          document.getElementById("output").appendChild(elt);
          elt.innerText = bool;
          return 0;
        },
        printOther: (arg : any) => {
          throw new Error("Provided invalid arg to print");
          return 0;
        },
        printClass: (arg: any) => {
          console.log("Logging from WASM: ", arg);
          const elt = document.createElement("pre");
          document.getElementById("output").appendChild(elt);
          elt.innerText = arg;
          return 0;
        }

      },
    
      nameMap: new Array<string>(),
    
      updateNameMap : (env : GlobalEnv) => {
        env.globals.forEach((pos, name) => {
          importObject.nameMap[pos] = name;
        })
      }
    };
    const env = emptyEnv;
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