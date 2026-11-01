# ERR-124 — minimatch advisory scope reconciliation

Status: **no compatible dependency migration is justified for this CVE on the current lockfile; scanner discrepancy remains open pending GitHub Advisory Database clarification**. Do not force a major-version override into legacy ESLint consumers.

## Authoritative advisory evidence

The upstream maintainer's [GHSA-g3hv-75wg-m249 advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) identifies **minimatch 10.2.6** as the affected version and **11.0.1** as the patched version. Its technical description is specifically about `firstPhasePreProcess()`, `optimizationLevel >= 2`, and the repeated `globParts` expansion followed by pairwise processing.

The GitHub Advisory Database currently publishes the broader range `<11.0.1`, which conflicts with the upstream maintainer's affected-version field and the described implementation. A public clarification request is open at [github/advisory-database#10811](https://github.com/github/advisory-database/issues/10811). That issue is a request for clarification, not an accepted exemption or a confirmed database correction.

## Feature-branch lockfile evidence

Reviewed `package-lock.json` on `feature/m3-ai-solver` (blob `42a7e4abf9951b89ac80835fe819bb8ca764f658`):

| Installed package path | Locked version | Assessment for this specific advisory |
| --- | ---: | --- |
| `node_modules/minimatch` | 3.1.5 | Not the upstream-publisher-identified affected version 10.2.6; source does not contain the described modern preprocessing implementation |
| `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch` | 11.0.3 | Above the upstream patched version 11.0.1 |

No `minimatch@10.2.6` package entry was found in the complete lockfile. The root `3.1.5` copy is required by legacy ESLint dependency ranges such as `^3.1.5`; the nested `11.0.3` copy satisfies the modern typescript-estree dependency range. Both are development dependencies, not application runtime dependencies.

The root v3.1.5 source lacks `firstPhasePreProcess`, `secondPhasePreProcess`, and `optimizationLevel`, which are the mechanisms described in the upstream advisory. This is a version-specific assessment for CVE-2026-118764 only. It is not a claim that minimatch 3 is generally free of other vulnerabilities.

## Decision

1. **Do not force minimatch 11 into packages declaring a v3 API range.** That would create an unsupported dependency graph and could break ESLint.
2. **Do not perform a broad ESLint/Next.js major migration solely to clear this advisory scanner result.** The installed graph does not contain the publisher-identified vulnerable 10.2.6 release.
3. Keep the nested scoped override to patched `minimatch@11.0.3` for typescript-estree.
4. Keep the committed lockfile and reproducible `npm ci` installation.
5. Retain this finding as a scanner/advisory-range discrepancy until the GitHub Advisory Database issue is resolved or the upstream publisher clarifies a broader affected range.
6. Independently inspect the full 13-moderate install-time audit summary. Do not attribute all 13 findings to minimatch; the current CI logs only show the aggregate count and do not include the detailed `npm audit` report.
7. Re-run the complete audit after obtaining detailed advisory records. The last verified `npm audit --omit=dev` result was zero production vulnerabilities; this does not establish a clean development dependency audit.

## Verification recorded

- Complete feature lockfile inspected; exactly two minimatch package entries were found: 3.1.5 and 11.0.3.
- Upstream maintainer advisory checked on 2026-11-01: affected version listed as 10.2.6; patched version 11.0.1.
- GitHub Advisory Database clarification request #10811 checked on 2026-11-01 and remains open.
- Latest Foundation CI run `41323931410` passed lint, TypeScript checks, unit tests and production build. Its install log reports 13 moderate vulnerabilities in aggregate; the production-only audit reports zero vulnerabilities.
- No package or lockfile mutation was made because the evidence does not justify an incompatible override or broad toolchain migration.

## Closure criteria

Close ERR-124 when the GitHub Advisory Database corrects or explains the affected range, or when the upstream publisher confirms that the installed 3.1.5 implementation is affected by this specific CVE. If that happens, choose a compatibility-preserving toolchain migration or a narrowly reviewed patch, regenerate the lockfile with the pinned toolchain, and run the full verification suite.

If the database remains broad but the publisher continues to identify only 10.2.6, retain a documented, reviewed false-positive disposition for this CVE. Other minimatch advisories and the remaining development-tree audit findings must still be evaluated independently.
