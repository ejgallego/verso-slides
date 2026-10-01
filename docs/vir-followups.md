# Followups after the first Slides formatter patch lands

## Formatter resource budgets — separate PR

The first landing preserves the former formatter's trusted generated-input
model. Explicit node/depth/text/indentation/output/tag budgets are deferred.
They are an additional application policy, not a requirement for using VIR.

The bounded implementation, exclusive tests and rationale are preserved on
[archive/vir-prettym-bounded-v2](https://github.com/ejgallego/verso-slides/tree/archive/vir-prettym-bounded-v2).
Its executed results remain tied to the source and artifacts named there.

Revisit limits, traversal cost, pre-allocation checks and recoverable errors in
one later PR. It must qualify its own resulting program/interface; the old
bounded evidence does not qualify a changed implementation automatically.

## Agreed array-result migration — separate patch

The pure `Array Pretty.Segment` v3 result is agreed and qualified on
[feat/vir-prettym-v3-landing](https://github.com/ejgallego/verso-slides/tree/feat/vir-prettym-v3-landing).
The first landing retains its existing Except/v2 ABI; v3 is not a prerequisite.
Its later adoption must carry forward subsequent client integration changes.

## Other independent work

The generic mobile panel restoration fix and general asset filename validation
remain scheduled after the first landing. Output CLI, directory assets and
managed build infrastructure remain outside this formatter patch.
