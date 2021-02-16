import { isVariableStatement } from "typescript";
import { EnvironmentPlugin } from "webpack";
import { ClassDef, VarDef, Expr, Stmt, Type, Value, MethodDef } from "./ast";
import { GlobalEnv } from "./compiler";
import { parse } from "./parser";

export type methodTypes = {
    selfType: Type,
    retType: Type,
    paramTypes: Map<string, Type>,
    methodVarsTypes: Map<string, Type>
}

type ClassTypes = {
    vars: Map<string, Type>,
    method: Map<string, methodTypes>
}

var classes = new Map<string, ClassTypes>()

export function tcLiteral(literal: Value, env: Map<string, Type>): Type {
    switch (literal.tag) {
        case "none":
            return { tag: "none" } //for PA3
        case "bool":
            return { tag: "bool" }
        case "num":
            return { tag: "number" }
        case "object":
            if (env.has(literal.name)) {
                return { tag: "class", name: literal.name };
            }
            else { throw new Error("Unable to find definition of Class" + literal.name) }
    }
}

export function tcExpression(expr: Expr, env: Map<string, Type>, className: string): Type {
    switch (expr.tag) {
        case "literal":
            return tcLiteral(expr.value, env);
        case "id":
            // When this is self return className
            if (expr.name === "self") {
                return { tag: "class", name: className };
            }
            if (env.has(expr.name)) {
                // console.log("typechecked local var/param " + expr.name);
                return env.get(expr.name);
            }
            throw new Error("Not a variable: " + expr.name);
        case "uniop":
            var uniExprType = tcExpression(expr.expr, env, className);
            switch (expr.uniop.tag) {
                case "eqz":
                    if (uniExprType.tag === "bool") {
                        return uniExprType
                    }
                    throw new Error("Cannot apply operator not on type" + uniExprType);
                case "neg":
                    if (uniExprType.tag === "number") {
                        return uniExprType
                    }
                    throw new Error("Cannot apply operator - on type" + uniExprType);
            }
        case "binop":
            const ltype = tcExpression(expr.expr1, env, className);
            const rtype = tcExpression(expr.expr2, env, className);

            switch (expr.op.tag) {
                case "add":
                case "sub":
                case "mul":
                case "div_s":
                case "rem_s":
                    if (ltype.tag === "number" && rtype.tag === "number") {
                        return { tag: "number" };
                    }
                    throw new Error("Cannot apply operator " + expr.op.tag + " on types " + ltype.tag + " and " + rtype.tag);
                case "eq":
                case "ne":
                    if (ltype.tag === rtype.tag) {
                        return { tag: "bool" };
                    }
                    throw new Error("Cannot apply operator " + expr.op.tag + " on types " + ltype.tag + " and " + rtype.tag);
                case "le_s":
                case "ge_s":
                case "lt_s":
                case "gt_s":
                    if (ltype.tag === "number" && rtype.tag === "number") {
                        return { tag: "bool" };
                    }

                    throw new Error("Cannot apply operator " + expr.op.tag + " on types " + ltype.tag + " and " + rtype.tag);

                case "is":
                    if (ltype.tag === "none" && rtype.tag === "none") {
                        return { tag: "bool" };
                    }
                    if (ltype.tag === "class") {
                        if (rtype.tag === "class") {
                            return { tag: "bool" };
                        }
                    }
                    throw new Error("Cannot apply operator " + expr.op.tag + " on types " + ltype.tag + " and " + rtype.tag); //this isn't very interesting since we don't have objects or None
            }
        case "construct":
            if (!classes.has(expr.name)) {
                throw new Error("Unable to construct a object" + expr.name);
            }
            return { tag: "class", name: expr.name};
        case "print":
            const printExprType = tcExpression(expr.value, env, className);
            return printExprType
        case "memberExpr":
            const memExprType = tcExpression(expr.expr, env, className);
            if (memExprType.tag !== "class") {
                throw new Error("Cannot find property on non class variable");
            }
            else {
                if (classes.has(memExprType.name)) {
                    const classtypes = classes.get(memExprType.name);
                    const propetyType = classtypes.vars.get(expr.propertyName);
                    if (propetyType == null) {
                        throw new Error("Cannot find filed " + expr.propertyName + " in " + memExprType.name);
                    }
                    return propetyType
                }
                else {
                    throw new Error("Cannot find name of " + memExprType.name);
                }
            }
        case "methodCall":
            const methodCallType = tcExpression(expr.expr, env, className);
            var classtypes = null;
            if (methodCallType.tag !== "class") {
                throw new Error("Cannot find property on non class variable");
            }
            else {
                if (classes.has(methodCallType.name)) {
                    classtypes = classes.get(methodCallType.name);
                    const method = classtypes.method.get(expr.name);
                    if (method == null) {
                        throw new Error("Cannot find filed " + expr.name + " in " + methodCallType.name);
                    }
                }
                else {
                    throw new Error("Cannot find name of " + methodCallType.name);
                }
            }

            let methodTypes = classtypes.method.get(expr.name);
            if (methodTypes.paramTypes.size !== expr.arguments.length) {
                throw new Error("Incorrect argument number on method call " + expr.name);
            }
            return methodCallType
        // TODO check param Types
    }
}

export function tcStatements(stmt: Stmt, env: Map<string, Type>, expectReturn: Type, className: string, isLast: boolean): Type {
    if (isLast) {
        const t = tcStatements(stmt, env, expectReturn, className, false);
        if (expectReturn == null) return t
        // TO DO class type check differently
        // console.log(t);
        //console.log(expectReturn);
        if (t.tag != expectReturn.tag) {
            throw new Error("Return type does not match actual return type");
        }
    }
    switch (stmt.tag) {
        case "assign":
            var exprType = tcExpression(stmt.expr, env, className);
            // console.log(exprType);
            var leftType = env.get(stmt.name);
            if (leftType.tag === "class") {
                if (exprType.tag === "number" || exprType.tag === "bool") {
                    throw new Error("Expected type " + leftType.name + "; got type " + exprType.tag);
                }
                if (exprType.tag === "class") {
                    if (exprType.name !== leftType.name) {
                        throw new Error("Expected type " + leftType.name + "; got type " + exprType.name);
                    }
                }
            }
            else {
                if (leftType.tag !== exprType.tag) {
                    throw new Error("Expected type " + leftType.tag + "; got type " + exprType.tag);
                }
            }
            return { tag: "none" }
        case "expr":
            return tcExpression(stmt.expr, env, className);
        case "pass":
            return { tag: "none" };
        case "if":
            var condType = tcExpression(stmt.cond, env, className);
            if (condType.tag != "bool") {
                throw new Error("Condition expression cannnot be of type " + condType.tag)
            }
            for (var i = 0; i < stmt.thn.length; i++) {
                tcStatements(stmt.thn[i], env, expectReturn, className, false);
            }
            if (stmt.els) {
                for (var i = 0; i < stmt.els.length; i++) {
                    tcStatements(stmt.els[i], env, expectReturn, className, false);
                }
            }
            return { tag: "none" }
        case "return":
            if (stmt.value) {
                if (expectReturn == null) {
                    throw new Error("Return statement cannot appear at the top level");
                }

                var returnType = tcExpression(stmt.value, env, className);
                //console.log([stmt, returnType]);
                if (returnType.tag === expectReturn.tag) {
                    return returnType;
                } else {
                    throw new Error("Expected type " + expectReturn.tag + "; got type " + returnType.tag);
                }
            }
            if (expectReturn.tag !== "none") {
                throw new Error("Expected type " + expectReturn.tag + "; got None");
            }
            return { tag: "none" }
        case "memberAssign":
            const callFrom = tcExpression(stmt.expr1, env, className);
            if (callFrom.tag !== "class") {
                throw new Error("Unable to find field " + stmt.propertyName + " in " + stmt.expr1);
            }
            else {
                const classEnv = classes.get(callFrom.name);
                //console.log(classEnv);
                if (!classEnv.vars.has(stmt.propertyName)) {
                    throw new Error("Cannot find property of name " + stmt.propertyName + " in class " + callFrom.name)
                }
                else {
                    const exprType = tcExpression(stmt.expr2, env, className);
                    const leftType = classEnv.vars.get(stmt.propertyName)
                    //console.log(leftType);
                    if (leftType.tag === "class") {
                        if (exprType.tag === "number" || exprType.tag === "bool") {
                            throw new Error("Expected type " + leftType.name + "; got type " + exprType.tag);
                        }
                        if (exprType.tag === "class") {
                            if (exprType.name !== leftType.name) {
                                throw new Error("Expected type " + leftType.name + "; got type " + exprType.name);
                            }
                        }
                    }
                    else {
                        if (leftType.tag !== exprType.tag) {
                            throw new Error("Expected type " + leftType.tag + "; got type " + exprType.tag);
                        }
                    }
                }
            }
            return {tag:"none"};
    }
}

export function tcDeclarations(def: VarDef | ClassDef, env: Map<string, Type>): Type {
    switch (def.tag) {
        case "varDef":
            var valueType = tcLiteral(def.lit, env);
            if (def.var.type.tag === "class") {
                if (valueType.tag === "number" || valueType.tag === "bool") {
                    throw new Error("Expected type " + def.var.type.name + "; got type " + valueType.tag);
                }
                if (valueType.tag === "class") {
                    if (def.var.type.name !== valueType.name) {
                        throw new Error("Expected type " + def.var.type.name + "; got type " + valueType.name);

                    }
                }
            }
            else {
                if (valueType.tag !== def.var.type.tag) {
                    throw new Error("Expected type " + def.var.type.tag + "; got type " + valueType.tag);
                }
            }
            return { tag: "none" };
        case "classDef":
            var classEnv = new Map<string, Type>();
            // Type check class body
            const classBody = def.classBody
            const className = def.name
            for (var i = 0; i < classBody.length; i++) {
                tcClassBody(classBody[i], classEnv, className);
            }
            return { tag: "none" };
    }
}

export function tcClassBody(def: VarDef | MethodDef, env: Map<string, Type>, className: string): Type {
    switch (def.tag) {
        case "varDef":
            var exprType = tcLiteral(def.lit, env);
            var leftType = def.var.type;
            if (leftType.tag === "class") {
                if (exprType.tag === "number" || exprType.tag === "bool") {
                    throw new Error("Expected type " + leftType.name + "; got type " + exprType.tag);
                }
                if (exprType.tag === "class") {
                    if (exprType.name !== leftType.name) {
                        throw new Error("Expected type " + leftType.name + "; got type " + exprType.name);
                    }
                }
            }
            else {
                if (leftType.tag !== exprType.tag) {
                    throw new Error("Expected type " + leftType.tag + "; got type " + exprType.tag);
                }
            }
            env.set(def.var.name, def.var.type);
            return { tag: "none" };
        case "methodDef":
            //console.log(def)
            const classType = classes.get(className);
            const methodName = def.name;

            // Check method local Decls
            def.body.localDecls.forEach(decl => {
                if (classType.method.get(methodName).methodVarsTypes.has(decl.var.name)) {
                    throw new Error("Variable with this name " + def.name +
                        " is already defined in this method" + methodName +
                        " in the class " + className);
                }
            });

            for (var i = 0; i < def.body.stmts.length; i++) {
                var stmt = def.body.stmts[i];
                if (i === def.body.stmts.length - 1) {
                    tcStatements(stmt, env, def.returnType, className, true);
                }
                else {
                    tcStatements(stmt, env, def.returnType, className, false);
                }
            }
    }

    return { tag: "none" };
}

export async function tcProgram(source: string, oldEnv: GlobalEnv): Promise<Type> {
    console.log(oldEnv);
    var result: Type = { tag: "none" };
    const program = parse(source);

    var env = new Map<string, Type>(oldEnv.types);

    // Set the default object class
    env.set("object", { tag: "class", name: "object" })

    // populate env
    for (var i = 0; i < program.decls.length; i++) {
        var def = program.decls[i];

        switch (def.tag) {
            case "varDef":
                if (env.has(def.var.name)) {
                    throw new Error("Duplicate declaration of variable in same scope:" + def.var.name);
                }
                def.isGlobal = true;
                env.set(def.var.name, def.var.type);
                break;
            case "classDef":
                if (env.has(def.name)) {
                    throw new Error("Duplicate Classname in the scope:" + def.name);
                }

                env.set(def.name, { tag: "class", name: def.name })
                // Store the class

                var ctypes: ClassTypes = {
                    vars: new Map<string, Type>(),
                    method: new Map<string, methodTypes>()
                }

                for (var j = 0; j < def.classBody.length; j++) {
                    var c: VarDef | MethodDef = def.classBody[j];
                    switch (c.tag) {
                        case "varDef":
                            ctypes.vars.set(c.var.name, c.var.type);
                            break;
                        case "methodDef":
                            var methodTypes: methodTypes = {
                                selfType: { tag: "none" },
                                retType: { tag: "none" },
                                paramTypes: new Map<string, Type>(),
                                methodVarsTypes: new Map<string, Type>()
                            }
                            const methodName = c.name
                            // Add param types
                            methodTypes.selfType = c.self;
                            methodTypes.retType = c.returnType;
                            c.params.forEach(param => {
                                methodTypes.paramTypes.set(param.name, param.type);
                            })
                            c.body.localDecls.forEach(localVar => {
                                methodTypes.methodVarsTypes.set(localVar.var.name, localVar.var.type);
                            })
                            ctypes.method.set(methodName, methodTypes);
                    }
                }
                classes.set(def.name, ctypes);
        }
    }

    //now typecheck our defs
    for (var i = 0; i < program.decls.length; i++) {
        tcDeclarations(program.decls[i], env);
    }

    for (var i = 0; i < program.stmts.length; i++) {
        if (i === program.stmts.length - 1) {
            result = tcStatements(program.stmts[i], env, null, null, true);
            break;
        }
        tcStatements(program.stmts[i], env, null, null, false);
    }

    return result
}