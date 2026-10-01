import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {validateIrPackageSetMembers} from '../.lake/packages/lean_vir/web/src/runtime/ir-package.js';
import {interfaceSignatureKey} from '../.lake/packages/lean_vir/web/src/runtime/interface-manifest.js';

const site = process.env.VIR_ACCEPTANCE_SITE;
test('reviewed v2 reference matches the validated generated root ABI', {skip: !site}, async () => {
  const root = resolve(site, 'lib/vir/97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58');
  const set = JSON.parse(await readFile(join(root, 'program.irpkg-set.json'), 'utf8'));
  const members = await Promise.all(set.packages.map(async m => ({...m, bytes: await readFile(join(root, m.path))})));
  const {manifests} = validateIrPackageSetMembers(members.map(m => m.bytes), {members});
  const exports = manifests.at(-1).exports;
  assert.equal(exports.length, 1);
  const entry = exports[0];
  const expected = JSON.parse(await readFile(new URL('../web-lib/vir-prettym/format-segments-v2.contract.json', import.meta.url), 'utf8')).formatSegments;
  assert.equal(entry.entry, expected.declaration);
  assert.equal(entry.effect, 'pure');
  assert.equal(entry.result.type, 'Except VersoSlides.Pretty.FormatError (Array VersoSlides.Pretty.Segment)');
  assert.equal(interfaceSignatureKey({args: entry.args.map(a => a.type), result: entry.result, effect: entry.effect}),
    interfaceSignatureKey(expected.signature));
});
