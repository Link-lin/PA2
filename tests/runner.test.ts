import { run } from '../runner';
import { expect } from 'chai';
import 'mocha';

const importObject = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    print: (arg: any) => {
      importObject.output += arg;
      importObject.output += "\n";
      return arg;
    },
    abs: (arg: number) => {
      importObject.output += Math.abs(arg);
      importObject.output += "\n";
      return Math.abs(arg)
    },
    max: (arg1: number, arg2: number) => {
      importObject.output += Math.max(arg1, arg2);
      importObject.output += "\n";
      return Math.max(arg1, arg2);
    },
    min: (arg1: number, arg2: number) => {
      importObject.output += Math.min(arg1, arg2);
      importObject.output += "\n";
      return Math.min(arg1, arg2);
    },
    pow: (arg1: number, arg2: number) => {
      importObject.output += Math.pow(arg1, arg2);
      importObject.output += "\n";
      return Math.pow(arg1, arg2);
    }
  },

  output: ""
};

// Clear the output before every test
beforeEach(function () {
  importObject.output = "";
});

// We write end-to-end tests here to make sure the compiler works as expected.
// You should write enough end-to-end tests until you are confident the compiler
// runs as expected. 
/*
describe('run(source, config) function', () => {
  const config = { importObject };

  // We can test the behavior of the compiler in several ways:
  // 1- we can test the return value of a program
  // Note: since run is an async function, we use await to retrieve the 
  // asynchronous return value. 
  it('returns the right number', async () => {
    const result = await run("987", config);
    expect(result).to.equal(987);
  });

  // 2- we can test the behavior of the compiler by also looking at the log 
  // resulting from running the program
  it('prints something right', async () => {
    var result = await run("print(1337)", config);
    expect(config.importObject.output).to.equal("1337\n");
  });

  // 3- we can also combine both type of assertions, or feel free to use any 
  // other assertions provided by chai.
  it('prints two numbers but returns last one', async () => {
    var result = await run("print(987)", config);
    expect(result).to.equal(987);
    result = await run("print(123)", config);
    expect(result).to.equal(123);

    expect(config.importObject.output).to.equal("987\n123\n");
  });

  // Note: it is often helpful to write tests for a functionality before you
  // implement it. You will make this test pass!
  it('adds two numbers', async () => {
    const result = await run("2 + 3", config);
    expect(result).to.equal(5);
  });

  // TODO: add additional tests here to ensure the compiler runs as expected
  it('mix of add and multiply', async () => {
    const result = await run("2+3*4+5+2*4", config);
    expect(result).to.equal(27);
  })

  it('maximum of two numbers', async () => {
    const result = await run("max(3,5)", config);
    expect(result).to.equal(5);
  })

  it('minimum of two numbers', async () => {
    const result = await run("min(3,5)", config);
    expect(result).to.equal(3);
  })

  it('mathematics power', async () => {
    const result = await run("pow(2,4)", config);
    expect(result).to.equal(16);
  })

  it('absolute value', async () => {
    const result = await run("abs(-4)", config);
    expect(result).to.equal(4)
  })

  it('assign with value then access it', async () => {
    const result = await run("x = 4\n x", config);
    expect(result).to.equal(4);
  })

  it('assign with builtin2 calls', async () => {
    const result = await run("x = 3\n y = 4\n max(x, y)", config);
    expect(result).to.equal(4);
  })

});
*/