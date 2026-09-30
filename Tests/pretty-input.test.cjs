const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../web-lib/panel/pretty.js'), 'utf8'), context);
const convert = context.compactFormatToStdFormat;
const limits = context.VIR_FORMAT_LIMITS;
const reject = (format, code, policy = limits, indent = 0) =>
  assert.throws(() => convert(format, indent, policy), error => error.code === code);

test('inclusive small input budgets and one over', () => {
  convert([4, 'a', 'b'], 0, {...limits, maxNodes: 3});
  reject([4, 'a', 'b'], 'inputNodes', {...limits, maxNodes: 2});
  convert([5, 'a'], 0, {...limits, maxDepth: 2});
  reject([5, 'a'], 'inputDepth', {...limits, maxDepth: 1});
  convert([4, 'é', 'é'], 0, {...limits, maxInputBytes: 4});
  reject([4, 'é', 'é'], 'inputBytes', {...limits, maxInputBytes: 3});
  convert('😀', 0, {...limits, maxTextBytes: 4});
  reject('😀', 'textBytes', {...limits, maxTextBytes: 3});
  convert('\n\n', 0, {...limits, maxHardLines: 2});
  reject('\n\n', 'hardLines', {...limits, maxHardLines: 1});
  convert([3, 2, [3, 2, 1]], 0, {...limits, maxIndent: 4});
  reject([3, 2, [3, 3, 1]], 'indentation', {...limits, maxIndent: 4});
  convert([3, -4, 1], 0, {...limits, maxIndent: 4});
  reject([3, -5, 1], 'indentation', {...limits, maxIndent: 4});
  convert([3, -4, [3, 8, [2, true]]], 0, {...limits, maxIndent: 4});
  reject([3, -4, [3, 9, [2, true]]], 'indentation', {...limits, maxIndent: 4});
  convert([7, '99999999999999999999', 'x']);
  reject([7, '100000000000000000000', 'x'], 'tagValue');
});

test('strict constructors, exact numeric scalars, Unicode and cyclic input', () => {
  for (const input of [undefined, {}, true, 0, [], [2], [2, 'false'], [2, false, 'extra'],
    [3, 1.5, 'x'], [3, Infinity, 'x'], [3, '1e3', 'x'], [3, '-0', 'x'],
    [3, '99999999999999999999', 'x'], [7, -1, 'x'], [7, Number.MAX_SAFE_INTEGER + 1, 'x'],
    [7, '01', 'x'], [4, 'x'], [5, 'x', 'extra'], [8, 'x'], '\ud800', '\udc00']) {
    assert.throws(() => convert(input), error => error.name === 'PrettyFormatError');
  }
  const cycle = [5]; cycle.push(cycle);
  reject(cycle, 'inputDepth');
  assert.equal(convert([3, '-2', [7, '9007199254740993', 'é😀']]).fields.indent, '-2');
  assert.equal(convert([3, '-2', [7, '9007199254740993', 'é😀']]).fields.f.fields.arg1, '9007199254740993');
});

test('admission rejects before ABI calls; finite v2 failures leave adapter usable', () => {
  let calls = 0;
  const program = {call: () => { calls++; return {kind: 'ok', value: [{text: 'valid', tags: []}]}; }};
  for (const [format, width, indent, code] of [
    [[3, 1.5, 'x'], 8, 0, 'invalidInput'], ['x', 4097, 0, 'width'],
    ['x', -1, 0, 'width'], ['x', NaN, 0, 'width'], ['x', 8, 4097, 'indentation'],
  ]) {
    const before = calls;
    assert.throws(() => context.formatCompactSegments(program, format, width, indent), e => e.code === code);
    assert.equal(calls, before);
    assert.equal(context.formatCompactSegments(program, 'valid', 8, 0)[0].text, 'valid');
  }
  program.call = () => ({kind: 'error', value: 'outputBytes'});
  assert.throws(() => context.formatCompactSegments(program, 'valid', 8, 0), e => e.code === 'outputBytes');
  program.call = () => ({kind: 'ok', value: [{text: 'valid', tags: []}]});
  assert.equal(context.formatCompactSegments(program, 'valid', 0, 0)[0].text, 'valid');
});
