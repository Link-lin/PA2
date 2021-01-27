import * as mocha from 'mocha';
import { expect } from 'chai';
import { parser } from 'lezer-python';
import { traverseExpr, traverseStmt, traverse, parse, traverseParameters } from '../parser';

// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
describe('traverseExpr(c,s) function', () => {
  it('parse a boolean', () => {
    const source = "True";
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);

    // Note: we have to use deep equality when comparing objects
    expect(parsedExpr).to.deep.equal({ tag: "literal", value: { tag: "True", value: true, type: { tag: "bool" } } });

  })

  it('parse a None', () => {
    const source = "None";
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    // Note: we have to use deep equality when comparing objects
    expect(parsedExpr).to.deep.equal({ tag: "literal", value: { tag: "None" } });

  })

  it('parse a parenthesized Expression', () => {
    const source = "(4-3)"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);

    expect(parsedExpr).to.deep.equal({
      expr: {
        expr1: { tag: "literal", value: { tag: "number", value: 4, type: { tag: "int" } } },
        expr2: { tag: "literal", value: { tag: "number", value: 3, type: { tag: "int" } } },
        op: { tag: "sub", },
        tag: "binop",
      },
      tag: "param"
    });
  })
})

describe('traverseBinop(c, s)', () => {
  it('binary operation addition', () => {
    const source = "3 + 5"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binop",
      expr1: { tag: "literal", value: { tag: "number", value: 3, type: { tag: "int" } } },
      expr2: { tag: "literal", value: { tag: "number", value: 5, type: { tag: "int" } } },
      op: { tag: "add" }
    })
  })

  it('binary operation multiplication', () => {
    const source = "3 * 5"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binop",
      expr1: { tag: "literal", value: { tag: "number", value: 3, type: { tag: "int" } } },
      expr2: { tag: "literal", value: { tag: "number", value: 5, type: { tag: "int" } } },
      op: { tag: "mul" }
    })
  })

  it('binary operation combined', () => {
    const source = "3 + 4 * 5"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binop",
      expr1: { tag: "literal", value: { tag: "number", value: 3, type: { tag: "int" } } },
      expr2: {
        tag: "binop",
        expr1: { tag: "literal", value: { tag: "number", value: 4, type: { tag: "int" } } },
        expr2: { tag: "literal", value: { tag: "number", value: 5, type: { tag: "int" } } },
        op: { tag: "mul" }
      },
      op: { tag: "add" }
    })
  })

  it('binary operation combined 2', () => {
    const source = "3 * 4 + 5"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binop",
      expr1: {
        tag: "binop",
        expr1: { tag: "literal", value: { tag: "number", value: 3, type: { tag: "int" } } },
        expr2: { tag: "literal", value: { tag: "number", value: 4, type: { tag: "int" } } },
        op: { tag: "mul" }
      },
      expr2: { tag: "literal", value: { tag: "number", value: 5, type: { tag: "int" } } },
      op: { tag: "add" }
    })
  })

  it('binary operation div', () => {
    it('binary operation addition', () => {
      const source = "6 // 4"
      const cursor = parser.parse(source).cursor();
      // go to statement
      cursor.firstChild();
      // go to expression
      cursor.firstChild();
      const parsedExpr = traverseExpr(cursor, source);
      expect(parsedExpr).to.deep.equal({
        tag: "binop",
        expr1: { tag: "literal", value: { tag: "number", value: 6, type: { tag: "int" } } },
        expr2: { tag: "literal", value: { tag: "number", value: 4, type: { tag: "int" } } },
        op: { tag: "div_s" }
      })
    })
  })

  it('binary operation less equal', () => {
    const source = "6 <= 4"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binop",
      expr1: { tag: "literal", value: { tag: "number", value: 6, type: { tag: "int" } } },
      expr2: { tag: "literal", value: { tag: "number", value: 4, type: { tag: "int" } } },
      op: { tag: "le_s" }
    })
  })
})
/*
describe('traverseExpr(c, s) function', () => {
  

  it('parses a number in the beginning', () => {
    const source = "987";
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);

    // Note: we have to use deep equality when comparing objects
    expect(parsedExpr).to.deep.equal({ tag: "num", value: 987 });
  })

  // TODO: add additional tests here to ensure traverseExpr works as expected
  it('call expression with 1 param(builtin1) abs', () => {
    const source = "abs(-5)"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({ tag: "builtin1", name: "abs", arg: { tag: "num", value: -5 } })
  })

  it('call expression with 1 param(builtin1) print', () => {
    const source = "print(a)"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({ tag: "builtin1", name: "print", arg: { tag: "id", name: "a" } })
  })

  it('call expression with 2 param(builtin2) max', () => {
    const source = "max(3,5)"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({ tag: "builtin2", name: "max", arg1: { tag: "num", value: 3 }, arg2: { tag: "num", value: 5 } })
  })

  it('call expression with 2 param(builtin2) min', () => {
    const source = "min(3,5)"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({ tag: "builtin2", name: "min", arg1: { tag: "num", value: 3 }, arg2: { tag: "num", value: 5 } })
  })

  it('binary operation addition', () => {
    const source = "3 + 5"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binaryOp",
      expr1: { tag: "num", value: 3 },
      expr2: { tag: "num", value: 5 },
      op: { tag: "add" }
    })
  })

  it('binary operation multiplication', () => {
    const source = "3 * 5"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binaryOp",
      expr1: { tag: "num", value: 3 },
      expr2: { tag: "num", value: 5 },
      op: { tag: "mul" }
    })
  })

  it('binary operation combined', () => {
    const source = "3 + 4* 5"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binaryOp",
      expr1: { tag: "num", value: 3 },
      expr2: {
        tag: "binaryOp",
        expr1: { tag: "num", value: 4 },
        expr2: { tag: "num", value: 5 },
        op: { tag: "mul" }
      },
      op: { tag: "add" }
    })
  })

  it('binary operation combined 2', () => {
    const source = "3 * 4 + 5"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();
    const parsedExpr = traverseExpr(cursor, source);
    expect(parsedExpr).to.deep.equal({
      tag: "binaryOp",
      expr1: {
        tag: "binaryOp",
        expr1: { tag: "num", value: 3 },
        expr2: { tag: "num", value: 4 },
        op: { tag: "mul" }
      },
      expr2: { tag: "num", value: 5 },
      op: { tag: "add" }
    })
  })

});
*/

describe('traverseStmt(c, s) function', () => {
  it('parsing typedef assign statement', () => {
    const source = "x : int = 4"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    const parsedExpr = traverseStmt(cursor, source);
    console.log(parsedExpr)

    expect(parsedExpr).to.deep.equal({
      name: "x",
      tag: "init",
      type: { tag: "int" },
      value: { tag: "literal", value: { tag: "number", type: { tag: "int" }, value: 4 } }
    });
  })

  it('parsing typedef func parameter', () => {
    const source = "def f(x:int, y:int ):\n  return x"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to def
    cursor.firstChild();
    cursor.nextSibling(); // name of function
    cursor.nextSibling(); // name of param
    const parsedExpr = traverseParameters(cursor, source);
    console.log(parsedExpr)

    expect(parsedExpr).to.deep.equal([
      { name: "x", type: { tag: "int" } },
      { name: "y", type: { tag: "int" } }])
  })

  it('parsing typedef func with multiple stmts and no retType', () => {
    const source = "def f(x:int, y:int):\n  x = x+y\n  return x\n"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to def
    const parsedExpr = traverseStmt(cursor, source);

    expect(parsedExpr).to.deep.equal({
          body: [
            { name: "x",
              tag: "assign",
              value: {
                expr1: { name: "x", tag: "id" },
                expr2: { name: "y", tag: "id" },
                op: { tag: "add" },
                tag: "binop"
              }
            },
            { tag: "return",
              value: { name: "x", tag: "id" }
            }
         ],
          name: "f",
          parameters: [
            { name: "x", type: { tag: "int" } },
            { name: "y", type: { tag: "int" } }
          ],
          ret: null,
          tag: "define"
    })
  })

  it('parsing typedef func with multiple stmts and retType', () => {
    const source = "def f(x:int, y:int)->bool:\n  x = x+y\n  return x\n"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    // go to def
    const parsedExpr = traverseStmt(cursor, source);
    expect(parsedExpr).to.deep.equal({
          body: [
            { name: "x",
              tag: "assign",
              value: {
                expr1: { name: "x", tag: "id" },
                expr2: { name: "y", tag: "id" },
                op: { tag: "add" },
                tag: "binop"
              }
            },
            { tag: "return",
              value: { name: "x", tag: "id" }
            }
         ],
          name: "f",
          parameters: [
            { name: "x", type: { tag: "int" } },
            { name: "y", type: { tag: "int" } }
          ],
          ret: {tag:"bool"},
          tag: "define"
    })
  })

  it('parsing function call', () => {
    // const source = "if true:\n  a=2\nelif:\n  a=3\n  a=4\nelse:\n  a=1"
    const source = "foo(3, 4)"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    const parsedExpr = traverseStmt(cursor, source);
    console.log(parsedExpr)

    expect(parsedExpr).to.deep.equal({
          expr: {
            arguments: [
              { tag: "literal", value: { tag: "number", type: { tag: "int" }, value: 3 } }, 
              { tag: "literal", value: { tag: "number", type: { tag: "int" }, value: 4 } }
            ],
            name: "foo",
            tag: "call"
          },
         tag: "expr"
    });
  })
 
  
  /*
  it('parseing if statements', () => {
    // const source = "if true:\n  a=2\nelif:\n  a=3\n  a=4\nelse:\n  a=1"
    const source = "if true:\n  a=2\nelif:\n  a=3\n  a=4\n"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    const parsedExpr = traverseStmt(cursor, source);
    console.log(parsedExpr)

    expect(parsedExpr).to.deep.equal({
      
    });
  })

  it('Parsing while statements', () => {
    const source = "while x=0:\n  x = x+1\n  x= x-1\n"
    const cursor = parser.parse(source).cursor();
    // go to statement
    cursor.firstChild();
    const parsedExpr = traverseStmt(cursor, source);
    console.log(parsedExpr)

    expect(parsedExpr).to.deep.equal({
      
    });
  })
  */
  /*
  // TODO: add tests here to ensure traverseStmt works as expected
  it('assign statement', () => {
    const source = "x = 5"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();

    const parsedExpr = traverseStmt(cursor, source);
    expect(parsedExpr).to.deep.equal({
      name: "x",
      tag: "define",
      value: { tag: "num", value: 5 }
    })
  })

  it('expression statement', () => {
    const source = "print(3*5)"
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();

    const parsedExpr = traverseStmt(cursor, source);
    expect(parsedExpr).to.deep.equal({
      expr: {
        arg: {
          expr1: { tag: "num", value: 3 },
          expr2: { tag: "num", value: 5 },
          op: { tag: "mul" },
          tag: "binaryOp"
        },
        name: "print",
        tag: "builtin1"
      },
      tag: "expr"
    })
  })
  */

});

/*
describe('traverse(c, s) function', () => {
// TODO: add tests here to ensure traverse works as expected
it('Assign with print', () => {
  const source = "x = 5\n y = 6 \n print(max(x,y))"
  const cursor = parser.parse(source).cursor();

  const parsed = traverse(cursor, source);
  expect(parsed).to.deep.equal([{
    tag: "define", name: "x", value: { tag: "num", value: 5 }
  }, {
    tag: "define", name: "y", value: { tag: "num", value: 6 }
  }, {
    tag: "expr",
    expr: {
      name: "print",
      tag: "builtin1",
      arg: {
        tag: "builtin2",
        name: "max",
        arg1: { name: "x", tag: "id" },
        arg2: { name: "y", tag: "id" }
      }
    }
  }])
})
});

describe('parse(source) function', () => {
it('parse a number', () => {
  const parsed = parse("987");
  expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "num", value: 987 } }]);
});

// TODO: add additional tests here to ensure parse works as expected
it('parse a negative number', () => {
  const parsed = parse("-1");
  expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "num", value: -1 } }]);
});

});
*/