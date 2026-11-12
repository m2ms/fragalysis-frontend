# Skipped ligand inputs and rendering failures

2026-11-12, `codex/moorhen-rendering-experiments-2-4`.

Bulk action timing counts coordinate preparation/native molecule-loading failures as skipped inputs. A completed
action displays `1 ligand skipped` or `3 ligands skipped`; geometry/repaint failures retain `Failed`. Mixed outcomes
retain both the failed status and skipped count. Native errors still propagate and are logged; cleanup, queue
admission, current-intent counters and elapsed-time ownership are preserved. Classification uses a private WeakSet
without changing native Error identity or adding error/runtime references to Redux or snapshots.

- Passed: nine focused suites / 188 tests, including the installed MOL loader's missing conversion result, frozen
  Error identity, input-versus-render queue failures, continued rendering, unique skip counts, mixed outcomes,
  singular/plural UI text, timer cleanup, adapter/boundary and snapshot shape checks.
- Passed: production build `main-1364b9bd780145b1c33a.js`, backend stats validation, 275-asset integrity, targeted ESLint
  on all changed JavaScript and whitespace checks. The two existing bundle-size warnings remain.
- Passed: production through Django, A71EV2A initial 19-ligand group. Three controlled missing `mol_text_to_pdb`
  results produced 16/16 rendered and `3 ligands skipped`, status completed. A second load with one controlled
  bond-mesh failure produced 18/18 rendered and `Failed`, status failed, with native experiments enabled.
  Failure injection was confined to the temporary tab; the worker prototype was restored and the tab closed.
- Local evidence: `ligand-skipped-status-live.json`, `ligand-skipped-status.png`, and corresponding test/build logs.
  No 930-ligand benchmark, snapshot save/restore or broad transfer/memory audit was repeated for this status change.
