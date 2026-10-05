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

## Other independent work

The generic mobile panel restoration fix and general asset filename validation
remain scheduled after the first landing. Output CLI, directory assets and
managed build infrastructure remain outside this formatter patch.

Reserved asset-prefix and case-alias validation also belong in that later
asset-policy PR. The previous implementation is retained on
[feat/vir-prettym-carrier-landing](https://github.com/ejgallego/verso-slides/tree/edf3fdb2ffe719eefddf222e6512676a729314d5);
this first landing retains the writer's existing exact collision checks.
