# Three-patch Lean PrettyM review

Branch: `feat/vir-prettym-lean-names-review`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `26011a0`: essential Lean formatter, typed Lake/VIR resource setup, full-name
   JavaScript call and one-shot initialization through the existing libraries.
2. `544a44b`: remove the handwritten JavaScript prettyM engine and share browser
   measurement, annotation and presentation between panels and lightboxes.
3. Tests, ordinary downstream example, short documentation and the required
   one-line Demo source-location correction for the pinned Verso version.

No handwritten resource recipe or callable alias table remains. Lean owns
formatting; VIR marshals the pure Array result; JavaScript owns measurement and
presentation. Returned tags are BigInts, converted to exact decimal text only
for annotation lookup/HTML or the test JSON boundary. Budgets and unrelated
asset/mobile changes remain [separate followups](vir-followups.md).

## Exact source and qualification

All production, tests and integration docs match qualified source
`41b5747c722b8f7519676129e658acbe72ef68a3`; only these review notes differ.
Intermediate commits are not independently qualified. Regrouping adds no
implementation change or inherited acceptance across changed production bytes.
[Retained commands, logs, native oracles, observations and exact packs](https://github.com/ejgallego/verso-slides/tree/f7a6b5171ffc2118561bfc2f7cd826ad0bcdebb6/docs/evidence/lean-names-adoption)
are outside this landing diff. Previous four-commit adoption branch and public
three-commit7bee review remain preserved. Commits are unsigned because session
signing was unavailable; repository signing configuration is unchanged.

Executed locally:41 Node checks and TypeScript pass; ordinary lake test runs
native/Node/publication/fixture checks; root/downstream default builds742 jobs
pass;55 focused Chromium/Firefox checks pass. Coverage includes full native
segments/tags, exact names/numeric admission, bindings/classes/escaping,
one-shot lifecycle/cleanup, nested hosting, ordinary downstream, reflow,
finite font loading, geometry and retention observations. Six manifests and42
payload entries match the actual packs. All8 program payloads are unchanged
from the historical formatter; its descriptor/identity changes.

## Dependency and distribution scope

Exact VIR: `37d2eb99f85f58b295dbf67996b0b7492366bd8e`, Lean4.34.0,
descriptor schema2/resource compatibility3, ABI4/manifest9/IR11.
Runtime CID: `d72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c`.
Runtime pack SHA: `6127371c45aecfc4a064c993060963b78612977acf1444f74889f1ee7856f814`.
Program CID: `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`.
Program pack SHA: `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.

The reviewed VIR source/runtime is still local-only; runtime lock source is `-`.
Qualification used independently copied source, a verified supplied runtime pack
and seeded warm caches. This branch is public for code review, without a Slides
PR, merge or release. Fresh public cold/offline installation awaits a durable
exact producer handoff. No fresh CI or mobile product acceptance is claimed.
