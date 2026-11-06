# ERR-124 — minimatch advisory scope reconciliation

## Superseding verification — 2026-11-06

**Current lockfile audit status: CLOSED / PASS.** On exact feature-branch commit `7203e2fdba24dea09daf12379b6e95202ee0bcc9`, the Foundation workflow completed both `npm audit --omit=dev` and the full `npm audit` successfully. The full dependency audit is now a blocking CI step, not an advisory/continue-on-error step.

This establishes that the committed dependency graph had no vulnerabilities reported by npm's current audit data at this checkpoint. It does **not** mean future dependency graphs are safe, that the GitHub Advisory Database range has been corrected, or that minimatch 3 is generally vulnerability-free. Re-run both audits after dependency or lockfile changes.

## Historical advisory-range investigation

The upstream maintainer's [GHSA-g3hv-75wg-m249 advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) identified **minimatch 10.2.6** as affected and **11.0.1** as patched in the reviewed advisory snapshot. The GitHub Advisory Database previously published a broader range `<11.0.1`, which conflicted with that version-specific publisher evidence. A clarification request was opened at [github/advisory-database#10811](https://github.com/github/advisory-database/issues/10811). This historical discrepancy is retained for audit context; no claim is made here that the advisory database has changed.

The previously inspected lockfile contained root `minimatch@3.1.5` for legacy ESLint consumers and nested `minimatch@11.0.3` for modern typescript-estree. No unsupported major-version override or broad toolchain migration was justified. The current closure is based on the successful full audit, not on treating the historical advisory discrepancy as an exemption.

## Ongoing control

1. Keep the lockfile and pinned install reproducible.
2. Keep both production-only and full-tree audits blocking in CI.
3. Reassess any new audit finding from its actual package path, dependency role, advisory range and exploitability; do not force an incompatible major-version override.
4. Reopen ERR-124 if a future lockfile audit reports a relevant vulnerability.

