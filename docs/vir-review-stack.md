# Minimal first Slides formatter patch

Review layout: exactly three commits above
`a51f7e581893042eb317edf50216060a26f38ac3`:

1. Essential Lean/VIR integration through existing libraries and stock typed Lake registration.
2. Remove JavaScript prettyM; retain one measurement/annotation/presentation path.
3. Focused native/Node/browser tests, ordinary downstream example, short docs and
   the required Demo source-location prerequisite.

Postponed code/tests remain on
[`todo-after-vir-merge`](https://github.com/ejgallego/verso-slides/blob/todo-after-vir-merge/TODO.md).
The queue consolidates document teardown, font/lightbox reflow, selectors/class
escaping, page banner, DOM diagnostics, geometry/retention, budgets, mobile,
assets/output and related upstream issues. No follow-up PR starts before this
Slides patch lands. Historical full-candidate results remain tied to c4c136a/41b5747.

The first patch keeps basic one-shot readiness/error reporting, current-selection
reflow, exact raw segments/BigInt tags and existing HTML/binding behavior. A detached
measurement probe must clean up safely when readiness/failure redraws the view.
There is no JS formatter fallback, handwritten resource recipe or export table,
extra library, retry/replacement or document cleanup controller.

The reduced candidate needs its own focused qualification for changed application
bytes;55 historical checks are not relabelled as acceptance of this tree.
Exact executed source/evidence are recorded in the completed refinement checkpoint
and will be linked from the public three-commit review notes. Intermediate commits
are not independently qualified.

Exact pair remains VIR37d2eb99f85f58b295dbf67996b0b7492366bd8e,
Lean4.34.0/compiler293d5d0c0c3f3dded4688b3ccd6a33939ac5102b,
descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CIDd72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c;
SHA6127371c45aecfc4a064c993060963b78612977acf1444f74889f1ee7856f814.
Program CIDba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a;
SHA2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150.

The producer source/runtime publication gate remains open; source `-` and seeded
local source/pack/caches are disclosed. No anonymous public cold/offline install,
fresh CI, mobile product gate, merge or release is claimed. Public branch is for
code review, without an official Slides PR.
