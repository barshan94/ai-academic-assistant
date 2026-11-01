# ERR-124 — minimatch toolchain remediation

Status: **open; no unsafe override applied**. The current `3.1.5` root copy is now confirmed affected by GitHub advisory GHSA-g3hv-75wg-m249 / CVE-2026-118764 (published 2026-10-27, updated 2026-10-30); the advisory's patched version is `11.0.1`.

## Observed lockfile state

The reviewed feature-branch lockfile contains both:

- root `node_modules/minimatch@3.1.5`, required by legacy ESLint/tooling dependency ranges such as `^3.1.5`;
- nested `@typescript-eslint/typescript-estree/node_modules/minimatch@11.0.3`, installed under the scoped override.

The scoped override does not remove the root v3 dependency used by other tools. The new GHSA-g3hv-75wg-m249 advisory affects every minimatch version below 11.0.1, including 3.1.5. Its documented patched version is 11.0.1. Forcing v11 into packages that declare a v3 API contract is not an acceptable remediation without compatibility evidence; the legacy toolchain must instead be migrated or isolated behind a reviewed mitigation.

## Safe remediation sequence

1. Track GHSA-g3hv-75wg-m249 / CVE-2026-118764 (globparts amplification; patched in 11.0.1) and re-check the authoritative GitHub Advisory Database for any additional advisories before each remediation attempt. Preserve the exact affected dependency paths and the toolchain's ability to process untrusted glob patterns.
2. Produce the complete dependency path report from the feature branch lockfile, including all direct and transitive minimatch consumers.
3. Do not assume a patched 3.x release exists for this advisory: GitHub currently documents 11.0.1 as the patched version. A 3.x upgrade is acceptable only if the advisory is updated to document that release as fixed.
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

## Current dependency paths and exposure assessment

The current lockfile contains these declared minimatch consumers:

| Consumer | Locked version | Declared minimatch range |
| --- | ---: | --- |
| `@eslint/config-array` | 0.21.2 | `^3.1.5` |
| `@eslint/eslintrc` | 3.3.7 | `^3.1.5` |
| `eslint` | 9.39.5 | `^3.1.5` |
| `eslint-plugin-import` | 2.32.0 | `^3.1.2` |
| `eslint-plugin-jsx-a11y` | 6.10.2 | `^3.1.2` |
| `eslint-plugin-react` | 7.37.5 | `^3.1.2` |
| `@typescript-eslint/typescript-estree` | 8.72.1 | `^10.2.2` |

The lockfile resolves a root `minimatch@3.1.5` and a nested `minimatch@11.0.3` for typescript-estree. Both are marked development dependencies; the application runtime dependency graph does not include minimatch. This materially limits production exposure, but does not satisfy a full dependency-tree security gate.

The current lint configuration imports `FlatCompat` from `@eslint/eslintrc` and extends `next/core-web-vitals` plus `next/typescript`. The remaining v3 consumers therefore belong to the legacy ESLint/Next lint integration, not application runtime code.

As an interim containment measure, keep the package lockfile committed and use `npm ci` in CI; do not process attacker-controlled glob patterns in custom scripts or automation. This is risk containment only, not a patch and not closure of ERR-124. Reassess after the ESLint/Next ecosystem publishes a compatible dependency graph using the fixed minimatch release.
