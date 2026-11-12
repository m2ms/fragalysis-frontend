# Empty Moorhen label and texture mesh updates

Date: 2026-11-12. Branch: `codex/moorhen-skip-redundant-label-updates`.
Baseline: `codex/lhs-ligand-native-buffer-batching` at `a842117a`.
Production implementation: `292be66e`.

## Change

Moorhen 0.22.7's `appendOtherData` publishes new label and texture arrays for ordinary meshes even when neither
contains additions. Its label subscription clears and rebuilds the text atlas and redraws the scene. An isolated
execution of the native empty-label refresh previously confirmed two full 1024 x 2048 texture uploads and six
buffer uploads per effect execution. React can batch updates, so these counts must not be multiplied by the ligand
count to estimate actual browser uploads.

`webpack/moorhenLabelsLoader.js` guards the two mesh publications with the corresponding additions-array length.
Real text labels still publish; unrelated texture updates and intentional label refreshes retain their native path.
The guard does not compare or clone native records. Native show/hide/delete methods remain unchanged because their
label updates also serve as repaint signals. This complements the existing opaque-update and buffer-publication
experiments without changing their settings.

The build bridge is pinned to 0.22.7, checks for exactly one label/texture append pair in the same native function,
and fails visibly for an unexpected version or source shape. It transforms bundled JavaScript without editing the
installed package, workers, WASM or monomers. It is registered in production and development configurations. No
additional dialog switch is added: this branch always skips provably empty mesh publications.

Restart an already running `yarn start` after changing the loader configuration. The baseline's development config
does not register the earlier Models or native-buffer publication bridges; this change adds only the new label
bridge there. The production comparison below uses the complete production bridge chain in both variants.

## Paired browser measurement

Both production bundles ran through Django on port 8080 in the in-app browser, using A71EV2A / lb18145-1,
736 poses / 930 observations. These results are a new pair, not a comparison with the older Chrome measurements.

- Baseline: `main-e3c1e4a758e89872e407.js`.
- Experiment: `main-b50ca87856d144a9fd7b.js`.
- Separate fresh tabs, one native scene at a time; the baseline tab was closed before creating the experimental tab.
- Matching 2560 x 1313 layout viewport and 77 mounted table rows throughout both timed loads.
- Pipeline mode; coordinate preparation=1000, native rendering=8; batched requests; coalesced completion repaints
  with 100 ms fallback; deferred Models; reduced opaque updates; batched native buffer publication; low-detail bonds.
- Display controls remained unopened during timing, and native Models was never opened.
- Before each timing, preparation=1000 / rendering=1 warmed the coordinates. Both warmups reached the same visible
  counter: downloaded 929/929, rendered 26/929, after one known native loading failure. Warmup was cancelled and
  all ligand intents removed, retaining the two initial proteins and coordinate cache. Removal completed at 0/0
  before rendering was set to 8. The excluded removal timers were 20.6 s and 26.1 s respectively.
- No build, Jest runner or CPU profiler ran during either timed load. The measurement includes native loading,
  parsing, mesh construction, publication, application acknowledgement and repaint scheduling; it is not GPU time.

| Measure | Baseline | Empty-publication guard |
| --- | ---: | ---: |
| Full-load action timer | 7:05.8 | 4:35.2 |
| Successfully rendered ligands | 927 | 927 |
| Failed ligand inputs | 3 | 3 |
| Final downloaded/rendered counters | 927/927 | 927/927 |

The action timer decreased by **150.6 seconds (35.4%)** in this single pair. Both timers reported Failed because of
the same three existing native MOL-loading errors, `Cannot read properties of undefined (reading 'first')`.
Each timed capture includes six error messages: the native error and application report for each failed input.

The benefit was not uniform across the scene. The following intervals have exact endpoint timestamps in both
captures, using the native `Object loaded` console counter rebased to the first timed completion:

| Rendered count interval | Baseline | Empty-publication guard |
| --- | ---: | ---: |
| 50 to 100 | 19.492 s | 10.614 s |
| 300 to 350 | 14.230 s | 14.441 s |
| 600 to 650 | 16.123 s | 16.622 s |
| 700 to 750 | 45.009 s | 16.611 s |
| 900 to 927 | 14.545 s | 8.043 s |

The baseline debugger buffer overflowed: 803 of 927 completion events were retained. The experimental capture
contains all 927 consecutive events, numbered 30 through 956. Both captures share that counter range; intervals
with missing baseline endpoints are omitted. The full-load timers and final UI counters were captured directly
and do not depend on completeness of console history. No total network-request comparison is claimed.

This is one paired observation, not a repeated statistical benchmark, FPS test or GPU/worker time breakdown.
Whole-scene traversal, draw calls and atom picking still grow with scene size.

## Verification

- Full Jest suite on the production implementation: 86 suites / 662 tests passed, 374.244 seconds.
- Eight new native-source tests cover empty publications, real text-label additions, circular native ownership,
  retained object identities, native visibility/removal repaint behaviour, genuine texture changes and intentional
  mutable-label refreshes. The installed bundle composes with the existing Models/buffer bridges without modifying
  the installed file. Missing/duplicate native shapes are rejected. Both build configurations register the guard.
- Production build and backend stats contract passed with the two existing bundle-size warnings.
- Moorhen payload integrity passed: 275 assets / 114,450,225 bytes.
- Targeted ESLint and whitespace checks passed.
- After adding the development rule, the bridge/configuration and viewer-boundary checks passed: four suites /
  14 tests, 36.954 seconds. The production runtime was unchanged by that configuration follow-up.
- Live checks on the completed scene: individual LHS ligand removal/reload changed 927 to 926 to 927; RHS v1a
  removal/reload did the same. Rotation visibly changed the scene and atom hover produced a native atom label.
  Display controls opened with a bounded virtualized tree and expanded a ligand representation. Designs open/close
  retained all six canvas backend-node identities, 419 through 424, and the loaded counters.
- The temporary layout-viewport override was cleared after timing. Screenshots from the timed viewport were clipped
  by the in-app browser host; the complete result view was captured after returning to the host's normal viewport.
  Temporary tabs were closed to release their scenes. No saved snapshots were created or modified.
- Not run: authenticated snapshot save/restore or same-project transitions, the full RHS transfer/memory audit,
  native text-atlas visual annotation checks, development-server HMR verification, live failure injection or repeated
  benchmark pairs. Automated label-update coverage does not establish visual annotation parity.

Local evidence: `label-updates-baseline.json`, `label-updates-experiment.json`, `label-updates-live-checks.json`,
`label-updates-result-view.png`, and the corresponding build, asset-integrity and test logs.
