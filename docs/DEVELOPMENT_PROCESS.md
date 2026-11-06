# Development Process

## Working style
1. Make one coherent change at a time.
2. Inspect existing files and current Git state before editing.
3. Prefer full-file replacements for code changes when practical.
4. Keep changes small enough to review and test.
5. Preserve known-good behavior; isolate risky experiments in separate branches.
6. After each milestone, report what changed, what was tested, failures, remaining work and cumulative project estimate.
7. Do not mark a milestone complete until its exit criteria pass.

## Required checks
- Formatting/lint.
- TypeScript typecheck.
- Production build.
- Unit/integration tests relevant to the change.
- Database migration and RLS checks for schema/security changes.
- Manual smoke test for user-visible workflows.

## Academic quality process
Maintain a versioned golden test set covering:
- Algebra, calculus, vectors, trigonometry and Further Pure Mathematics.
- Physics calculations, units, significant figures, graphs and diagrams.
- ICT and Computer Science theory, pseudocode and programming.
- Printed, photographed, low-resolution and handwritten questions.
- Bengali and English explanations.

For every generated solution, retain source question, syllabus context, prompt/model metadata, answer version, verification logs and teacher corrections. Machine checks do not prove conceptual correctness; teacher verification remains a separate state.

## Completion reporting
Use the labels:
- Implemented: code exists.
- Tested: named tests actually passed.
- Connected: live external service credentials and integration are configured.
- Deployed: a deployment URL and successful smoke test exist.
