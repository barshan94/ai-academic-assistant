# ERR-124 — minimatch toolchain remediation

Status: **open; no unsafe override applied**.

## Observed lockfile state

The reviewed feature-branch lockfile contains both:

- root `node_modules/minimatch@3.1.5`, required by legacy ESLint/tooling dependency ranges such as `^3.1.5`;
- nested `@typescript-eslint/typescript-estree/node_modules/minimatch@11.0.3`, installed under the scoped override.

The scoped override does not remove the root v3 dependency used by other tools. Forcing minimatch v11 into packages that declare a v3 API contract is not an acceptable remediation without compatibility evidence.

## Safe remediation sequence

1. Identify the exact advisory identifier, affected dependency paths, patched versions and exploitability conditions from the authoritative advisory and the package maintainer's release notes.
2. Produce the complete dependency path report from the feature branch lockfile, including all direct and transitive minimatch consumers.
3. Prefer a compatible patched 3.x release if the advisory publisher confirms it fixes the affected issue and the relevant consumers support it.
4. If no compatible patched 3.x release exists, evaluate a coordinated ESLint/toolchain migration whose complete dependency graph no longer requires the vulnerable legacy API. Upgrade compatible ESLint plugins/config packages together; do not independently replace a transitive package.
5. If a migration cannot be completed safely, evaluate a narrowly scoped, reviewed patch against the vulnerable version. The patch must include upstream issue/advisory references, minimal diff, tests for the vulnerable behavior and the legacy API behavior, patch maintenance owner and removal condition.
6. Regenerate the lockfile using the repository's pinned Node/npm toolchain. Do not hand-edit package-lock entries.
7. Verify `npm ci`, lint, typecheck, unit tests and production build. Inspect the resulting dependency tree and run the authoritative audit again.
8. Record the advisory identifier, before/after dependency paths, toolchain versions, audit output and review decision.

## Explicit non-goals

- Do not use a root-wide override to force v11 into legacy v3 consumers.
- Do not suppress the advisory or mark it accepted without a documented security decision.
- Do not claim remediation based only on the presence of a nested v11 copy.
- Do not run a broad automated dependency upgrade as a substitute for reviewing the affected API contracts.

## Closure criteria

ERR-124 closes only when the vulnerable path is eliminated or a security-reviewed mitigation is documented, the lockfile is reproducible with `npm ci`, all required CI checks pass, and the resulting audit confirms the advisory is resolved or has an explicitly approved exception.
