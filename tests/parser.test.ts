import * as mocha from 'mocha';
import { expect } from 'chai';
import { parser } from 'lezer-python';
import { traverseExpr, traverseStmt, traverse, parse } from '../parser';

// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
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
  */

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