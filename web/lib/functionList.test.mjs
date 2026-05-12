/**
 * Unit tests for functionList.mjs – symbol extraction.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractSymbols, isFunctionListSupported } from './functionList.mjs'

// ── isFunctionListSupported ──────────────────────────────────────────────────

test('isFunctionListSupported returns false for null', () => {
  assert.equal(isFunctionListSupported(null), false)
})

test('isFunctionListSupported returns false for unknown language', () => {
  assert.equal(isFunctionListSupported('brainfuck'), false)
})

test('isFunctionListSupported returns true for javascript', () => {
  assert.equal(isFunctionListSupported('javascript'), true)
})

test('isFunctionListSupported returns true for python', () => {
  assert.equal(isFunctionListSupported('python'), true)
})

// ── extractSymbols – empty / null inputs ────────────────────────────────────

test('extractSymbols returns empty for null content', () => {
  assert.deepEqual(extractSymbols(null, 'javascript'), [])
})

test('extractSymbols returns empty for null language', () => {
  assert.deepEqual(extractSymbols('function foo() {}', null), [])
})

test('extractSymbols returns empty for unsupported language', () => {
  assert.deepEqual(extractSymbols('function foo() {}', 'cobol'), [])
})

// ── JavaScript ───────────────────────────────────────────────────────────────

test('JS: detects plain function declaration', () => {
  const code = `function hello(name) {\n  return name\n}`
  const syms = extractSymbols(code, 'javascript')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'hello')
  assert.equal(syms[0].kind, 'function')
  assert.equal(syms[0].line, 0)
})

test('JS: detects async function declaration', () => {
  const code = `async function fetchData() {}`
  const syms = extractSymbols(code, 'javascript')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'fetchData')
  assert.equal(syms[0].kind, 'function')
})

test('JS: detects exported function', () => {
  const code = `export function myFunc() {}`
  const syms = extractSymbols(code, 'javascript')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'myFunc')
})

test('JS: detects class declaration', () => {
  const code = `class Animal {\n  speak() {}\n}`
  const syms = extractSymbols(code, 'javascript')
  const cls = syms.find((s) => s.kind === 'class')
  assert.ok(cls, 'class symbol should be present')
  assert.equal(cls.name, 'Animal')
})

test('JS: detects arrow function assigned to const', () => {
  const code = `const greet = (name) => {\n  console.log(name)\n}`
  const syms = extractSymbols(code, 'javascript')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'greet')
  assert.equal(syms[0].kind, 'function')
})

test('JS: detects method in class body', () => {
  const code = `class Foo {\n  bar() {\n    return 1\n  }\n}`
  const syms = extractSymbols(code, 'javascript')
  const method = syms.find((s) => s.name === 'bar')
  assert.ok(method)
  assert.equal(method.kind, 'method')
})

test('JS: does not treat "if" or "for" as symbols', () => {
  const code = `  if (x > 0) {\n  }\n  for (let i = 0; i < 10; i++) {\n  }`
  const syms = extractSymbols(code, 'javascript')
  assert.equal(syms.length, 0)
})

test('JS: typescript treated the same as javascript', () => {
  const code = `export function tsFunc<T>(arg: T): T { return arg }`
  const syms = extractSymbols(code, 'typescript')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'tsFunc')
})

// ── Python ───────────────────────────────────────────────────────────────────

test('Python: detects def function', () => {
  const code = `def greet(name):\n    print(name)`
  const syms = extractSymbols(code, 'python')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'greet')
  assert.equal(syms[0].kind, 'function')
  assert.equal(syms[0].line, 0)
})

test('Python: detects async def', () => {
  const code = `async def fetch():\n    pass`
  const syms = extractSymbols(code, 'python')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'fetch')
})

test('Python: detects class', () => {
  const code = `class Dog(Animal):\n    pass`
  const syms = extractSymbols(code, 'python')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'Dog')
  assert.equal(syms[0].kind, 'class')
})

test('Python: ignores comment lines', () => {
  const code = `# def notAFunc():\ndef real():\n    pass`
  const syms = extractSymbols(code, 'python')
  assert.equal(syms.length, 1)
  assert.equal(syms[0].name, 'real')
})

// ── C-like ───────────────────────────────────────────────────────────────────

test('C: detects function definition', () => {
  const code = `int add(int a, int b) {\n    return a + b;\n}`
  const syms = extractSymbols(code, 'c')
  const fn = syms.find((s) => s.name === 'add')
  assert.ok(fn, 'should find "add" function')
})

test('C: detects struct', () => {
  const code = `struct Point {\n    int x;\n    int y;\n};`
  const syms = extractSymbols(code, 'c')
  const cls = syms.find((s) => s.name === 'Point')
  assert.ok(cls)
  assert.equal(cls.kind, 'class')
})

test('Java: detects class and method', () => {
  const code = [
    'public class Main {',
    '    public static void main(String[] args) {',
    '        System.out.println("hi");',
    '    }',
    '}',
  ].join('\n')
  const syms = extractSymbols(code, 'java')
  const cls = syms.find((s) => s.name === 'Main')
  assert.ok(cls)
  const method = syms.find((s) => s.name === 'main')
  assert.ok(method)
})

// ── Ruby ─────────────────────────────────────────────────────────────────────

test('Ruby: detects def and class', () => {
  const code = `class Dog\n  def bark\n    puts "woof"\n  end\nend`
  const syms = extractSymbols(code, 'ruby')
  assert.ok(syms.find((s) => s.name === 'Dog' && s.kind === 'class'))
  assert.ok(syms.find((s) => s.name === 'bark'))
})

// ── PHP ──────────────────────────────────────────────────────────────────────

test('PHP: detects function and class', () => {
  const code = `<?php\nclass Greeter {\n    public function greet($name) {\n        return "Hello $name";\n    }\n}`
  const syms = extractSymbols(code, 'php')
  assert.ok(syms.find((s) => s.name === 'Greeter' && s.kind === 'class'))
  assert.ok(syms.find((s) => s.name === 'greet'))
})
