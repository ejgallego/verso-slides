# FIR Flat publication mailbox

## 2026-08-09 — clean source pin requested

FIR has landed the two shared compiler-admission repairs required by
`VersoSlides.Pretty.formatRenderedForRuntime`:

- FIR `main`: `7fd5e914b52c2f0e9edf39fbc8a8acdc32a11f35`
- rebased W7 branch: `wasm/generation` at
  `823066b046f75c1991b1b6ca51888360593163f5`
- generic object-family local joins and precise `UInt8`/`Float` boxing now pass
  the complete FIR, Talos, and resident-artifact gates.

The Verso worktree is clean at `8c58a94d2de903f6d3f484a9ab0449a57abae2a2`,
and still contains the requested entrypoint. However, this head is not present
on a remote-tracking branch, and `VersoSlides/Pretty.lean` now hashes to
`8df980adb7a7b2249deebbad9b8f551053dcc742b53f66d884b5bad752f5997b`, not the
older handoff digest
`a51b2815e4ea15aaedf8011befeab97145212364bb702010c3e4a16127730eca`.
The additional source surfaces need not enter the final-LCNF closure of
`formatRenderedForRuntime`, but immutable package provenance must identify the
actual source revision.

Please publish a clean, remotely resolvable branch containing either:

1. current clean head `8c58a94d2de903f6d3f484a9ab0449a57abae2a2`
   plus the compiler-neutral capture refactor described below; or
2. a clean revision based on the original Flat handoff
   `81803c6486e610c5b0a0cb11d7942340ff01b3c6` plus that refactor.

The required refactor is preserved in the clean disposable source repository
`/tmp/verso-flat-clean` as commit
`e9ae2ed6bea4c2eaa243c6d7ff639185f7de2f7f`, directly above `81803c6`.
It makes the `RenderedM` dictionary explicit and reducible and replaces
`String.join st.chunks.toList` with a local Nat-indexed tail-recursive chunk
join. It does not change `formatRenderedForRuntime` semantics, but it keeps the
real implementation visible to final-LCNF capture and avoids pulling the
generic list conversion/join boundary into the artifact. The resulting
`VersoSlides/Pretty.lean` SHA-256 is
`60ad578083483bc6592421f23b5350835f19de27e42414a4d04785b33ed8cc42`.
The exact change can be reviewed with:

```sh
git -C /tmp/verso-flat-clean diff \
  81803c6486e610c5b0a0cb11d7942340ff01b3c6..e9ae2ed6bea4c2eaa243c6d7ff639185f7de2f7f \
  -- VersoSlides/Pretty.lean
```

Then record the remote branch, full commit, and intended
`VersoSlides/Pretty.lean` SHA-256 here. FIR will compile the real
`VersoSlides.Pretty.formatRenderedForRuntime` definition from that clean source
view. No Verso webapp change or PR is required for this request.

W7 can productionize and test the resident helpers meanwhile, but it will not
publish an accepted immutable package with unresolvable source provenance.
