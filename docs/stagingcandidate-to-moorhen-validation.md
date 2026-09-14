# Migration validation

## Baseline before application edits

- PASS: branch, repository, clean index/worktree/untracked state and no unfinished Git operation.
- PASS: remote fetch; local/fetched source match; inclusive START ancestry and single-parent BASE; six-commit history and 39-file net diff.
- PASS: runtime declarations and installed versions: Node v24.18.0, Corepack 0.35.0, Yarn 4.17.1.
- ENVIRONMENT FAILURE: `yarn test:ci` exits 1 because Jest is not installed in node_modules.
- ENVIRONMENT FAILURE: `yarn build` exits 1 because `node_modules/moorhen/public` is missing.
- PASS: `yarn install --immutable` restored declared dependencies in 1m44s, with existing peer and disabled-build-script warnings; package and lockfile unchanged.
- PASS (baseline after install, before application edits): `yarn test:ci`: 30 suites / 172 tests, 60.863s.
- PASS (baseline after install, before application edits): `yarn build`: Webpack production compilation in 54.821s, existing asset/entrypoint size warnings (2); legacy backend stats validation passed.
- PASS (baseline): `yarn verify:moorhen-assets`: 275 assets, 114450225 bytes.
- Existing CI checks: immutable install; `yarn test:ci`; `yarn build` (includes `test:webpack-stats`); `yarn verify:moorhen-assets`; optional Cypress smoke when a backend is configured. No lint script; `.eslintrc` is available for targeted static checks.

## Implementation checks and final results

| Check / command | Result |
| --- | --- |
| First focused Jest run (settings, transfer/config, snapshot, adapter, camera thunk, boundary) | Initially 3 failed suites / 4 passed. New test fixtures lacked the required native runtime/Django context, and the copied phased-transfer stub did not acknowledge rendering. Fixed fixtures to model the required lifecycle; no assertions/checks disabled. |
| `yarn test:ci --runTestsByPath js/constants/poseNavigation.test.js js/components/preview/molecule/poseTransfer.test.js js/viewer/MoorhenViewerAdapter.test.js` | PASS: 3 suites, 48 tests after the fixture fixes. |
| Focused direct-download/API/config popover/observation dialog/initialization test paths | PASS: 5 suites, 18 tests. |
| Focused usePoseTransferNavigation/poseTransfer/rhsPoseTransferConfig/directDownload test paths | PASS: 4 suites, 40 tests, including native deletion timing, pagination/serialization and stale download results. |
| `yarn test:ci` after production implementation | PASS: 38 suites, 238 tests, 24.035s (baseline: 30 suites / 172 tests). Covers existing Moorhen, reverse-portal/UI, snapshot and viewer-boundary regressions as well as new behavior. |
| `yarn test:ci --runTestsByPath js/reducers/selection/actions.test.js` after strengthening legacy slice-reload assertion | PASS: 1 suite, 16 tests. Production code unchanged since full-suite/build checks. |
| `yarn build` | PASS: production Webpack compilation, 52.357s; legacy backend stats contract passed. Same 2 asset/entrypoint-size warnings as baseline. Main bundle approximately 11.4 MiB versus 11.3 MiB baseline. |
| `yarn verify:moorhen-assets` | PASS: 275 files / 114450225 bytes. |
| `yarn exec eslint` across all 25 changed/new production JS paths | PASS with baseline warnings: 0 errors, 9 warnings. Two hook dependency warnings and seven unused-variable warnings were individually reproduced by piping the corresponding TARGET_START source into ESLint with the same filename. No new warnings found. |
| Isolated baseline/current API assertion using Babel and Node VM, mocked Axios | PASS discrimination: required read cache policy FAILS on TARGET_START (expected) and PASSES on implementation. No baseline working-tree replacement or reset. |
| `git -c core.safecrlf=false diff --check`; new-file whitespace and source audit | PASS. The command-local safecrlf option suppresses Windows conversion notices; repository config is unchanged. |
| Source history/net-diff path inventory | PASS: all 39 paths mapped to 12 logical dispositions. No merge commits or omitted build/CI/package/assets in selected interval. |
| Target preservation audit | PASS: package.json, yarn.lock, compose, manual CI, initialization implementation/test unchanged; three default backend images and Moorhen isolation mount present; target protein toggle retained; no NGL import restored. |
| Browser/runtime/local backend | NOT RUN: browser runtime has no connected browser (discovery returned []); ports 8080/3030 refuse connections. Remote Cypress default cannot validate local code. |

These initial migration checks passed without interactive validation. Subsequent user testing exposed the RHS transfer memory regression documented below; the original test doubles did not model native runtime graphs. Pre-existing peer, lint and bundle-size warnings remain. The existing broader Moorhen parity backlog is outside this reimplementation.

## Browser availability and acceptance (NOT RUN)

Browser skill read and runtime connection attempted; runtime reported no browser available. Troubleshooting documentation read. HTTP probes to local ports 8080 and 3030 both returned ECONNREFUSED. These environment limits prevent full local UI/backend validation. The remote Cypress default does not host this uncommitted implementation and cannot establish its correctness.

Use the configured local stack at `http://127.0.0.1:8080` with frontend bundles at port 3030 if available. Do not claim interactive behavior from compilation alone. Existing Cypress smoke is read-only navigation; the broader suite mutates snapshots and is not required for this local check.

1. Open a public target: one Moorhen canvas, initial ligand and sidechains, no artefact chains; rotate and resize/switch layout without losing the viewer.
2. Open an RHS design with inspirations, enable ligand/protein/complex/surface and inspiration map/vector controls, adjust representations and density, and transfer up/down. Verify destination settings and union of inspiration controls; old controls clear and shared objects remain when unchanged.
3. Exercise each order/scheduling combination, filtered/sorted lists, row boundaries and a destination beyond the rendered page. Verify scrolling, disabled controls during transfer and no transient dialog ownership changes.
4. Test no centering, design ligand centering, and default centroid: equal influence per ligand, visible separation, all destination ligands framed; one ligand focuses normally, no ligands leave camera unchanged.
5. Open observation/inspiration dialogs on both sides and navigate poses; ownership stays with opener, inspiration dialog reanchors, tag/protein/density popovers close. Inject a failed object load and verify error/rollback without claiming render success.
6. Save and restore configured navigation; restore older snapshots with missing settings and boolean centering. Verify defaults/migration, preserved camera and uninterrupted existing snapshot transitions.
7. Open a direct-download link with a successful task, failed task and temporarily failing status endpoint: success downloads once, failure shows an alert and ends spinner, bounded retries occur, navigation away cancels polling.
8. Inspect read requests for unique cache-busting params and no-cache headers; verify normal tag/pose updates use fresh data and mutation payloads remain intact.

Full interactive coverage, backend availability and any remaining manual steps will be updated at handoff.

## RHS transfer memory regression follow-up (2026-09-10)

User reported slow RHS arrow transfers and tab memory exceeding 5 GB after two moves. Transfer customization used `cloneDeep` on live Moorhen handles, which include `nativeRepresentation`, `parentObject` and `ready`. Native representations link to circular molecule/renderer graphs and rendering buffers. Additional transfer snapshot/apply copies amplified that work; Redux object records and the removal stash also retained native references. Per-object representation IDs caused identical shared appearances to compare unequal and reload unnecessarily.

The fix selects display fields before cloning. Redux representation actions retain detached type, parameters, IDs, visibility and editor templates; live handles remain accessible through adapter ID lookup. RHS captures and applies only type/parameters for every structure and density control, so comparisons exclude runtime identity.

- Regression discrimination: the first two rendered/queued runtime traversal tests failed on the implementation before this fix, inside Lodash `cloneDeep`. Both passed after the fix.
- Expanded coverage checks all six structure/map representation paths for rendered and queued inputs using getters that throw if native data is visited. Representation actions are likewise checked before Redux/tracking receives their payloads.
- Shared-object tests exercise overlapped and phased add-first transfers: equal appearance is retained despite different IDs; a changed opacity still causes one removal/reload.
- Adapter/state integration exercises 12 load/edit/hide/delete cycles with circular native molecule references and typed rendering buffers. Live handle lookup and native deletion remain functional, and the serialized removal stash stays below 12 KB with no native references. This measures stored display records, not total browser memory.
- Final automated validation: `yarn test:ci` passed all 38 suites / 261 tests (56.916s); `yarn build` passed in 50.119s with the same two bundle-size warnings and successful stats validation. Targeted ESLint for all three production files changed in this fix passed with zero errors/warnings. `yarn verify:moorhen-assets` and `git -c core.safecrlf=false diff --check` passed.
- Browser discovery was retried and returned no connected browser. The reported 5 GB tab footprint and real backend/render latency have not been measured after the fix. Interactive acceptance requires a full tab reload to clear existing native copies, followed by repeated forward/backward RHS transfers while monitoring tab memory and verifying appearance, editing and shared-object retention.

## RHS old-structure accumulation follow-up (2026-09-10)

User confirmed faster transfers but supplied an image consistent with old structures accumulating. A new regression reproduced a distinct lifecycle race: two loads with the same name both passed the pre-load registry check. The second registration overwrote the first, and deletion emptied the registry while leaving one native representation rendered. The new buffer-tracking test failed before this fix with one rendered object remaining.

- Display effects now claim pending work before coordinate fetching and share repeated requests. Load/remove/reload for one item are ordered; other items, types and datasets remain independent. Ligand, protein, complex, surface, artefact, density and vector hooks use the shared queue. Removal callbacks await native completion before clearing selection/queue acknowledgement, including all density maps and vector objects.
- The adapter orders native molecule/composite/map loads and deletion by object name, including protein preprocessing. Named removal resolves the registry after pending loads finish. Repeated native deletion is idempotent; pending representation redraws finish before disposal, and teardown drains pending native operations.
- React/Redux regressions use Strict Mode, repeated renders and delayed coordinate fetch/load/deletion for ligand and protein hooks. They verify exactly one load and removal, including removal requested before coordinate data arrives. Queue tests cover ordered reload, independent datasets/items and retry after failure.
- Native regressions cover concurrent same-name molecule/composite/map loads, deletion before registration for ligands/proteins/density, delayed redraw, repeated deletion, Redux cleanup during in-flight loading, and teardown during loading. They check native object/buffer ownership as well as registry state. These are controlled lifecycle fixtures, not a live WebGL acceptance run.
- Final validation: all 40 suites / 274 tests passed (`yarn test:ci`, 48.327s). Production build and stats validation passed (54.295s), with the same two bundle-size warnings. After tightening test assertions for lint, both queue/hook suites passed again (4 tests). Targeted lint passed with only existing unused-variable warnings; the six warnings in newly touched vector/molecule-dispatch files were reproduced against HEAD. Asset verification passed (275 assets / 114450225 bytes), and `git -c core.safecrlf=false diff --check` passed.
- Browser discovery again returned no connected browser. After loading the rebuilt frontend, fully reload the tab to discard structures orphaned by the previous implementation. Interactive follow-up: navigate repeatedly forward and backward with design ligands and inspiration protein/map controls; verify only destination/shared structures remain and tab memory stabilizes.

## Density positioning and contour regression (2026-09-14)

The user's NGL/Moorhen comparison showed a small Event patch displaced from the ligand and no apparent 2FoFc density.
The preceding popover fix had removed the React update loop, but had not established visual map parity.

The local backend was reachable for this investigation. Read-only requests retrieved observation 3,
`A71EV2A-x0188a`, and its actual Event, 2FoFc and difference maps. All three are cropped 39 x 33 x 34 grids with
0.5 angstrom sampling and an MRC ORIGIN of approximately `[-5.863, 4.477, -5.351]`. Direct execution of the installed
Moorhen 0.22.7 Coot WASM showed that the imported map lost that origin: its strongest Event peak was located at
`[13, 8.5, 10]` rather than `[7.137, 12.977, 4.649]`, adjacent to the ligand's sulfur atom. The earlier audit's general
alignment observation did not establish compatibility with these files.

Three adapter problems were identified:

- The exact fractional ORIGIN was not applied to the native contour coordinates. NGL includes ORIGIN and grid starts
  in its [MRC coordinate transform](https://github.com/nglviewer/ngl/blob/master/src/parser/mrc-parser.ts).
- The native map manager overwrote application parameters on mount. Coot classified these small maps as EM maps,
  chose a 3.74 angstrom radius around an automatically selected peak, and locked contouring to that location.
- Application sigma contour values were passed as absolute density values. The original NGL path uses the map mean
  and RMS to convert sigma to an absolute threshold; see its
  [volume implementation](https://github.com/nglviewer/ngl/blob/master/src/surface/volume.ts).

The adapter now retains file geometry/statistics outside serialized state, translates contour queries and returned
meshes without resampling the voxels, and clips periodic copies outside the supplied volume. Box size zero draws
the whole cropped map. Native automatic settings no longer overwrite application controls. Saved contour values
remain unchanged, including explicit absolute-value representations; sigma conversion occurs only at the native
boundary. Native map draws are awaited and serialized, and deletion prevents late manager callbacks from recreating
buffers. No map assets, dependencies, snapshot shapes or molecular coordinates were changed.

Native checks using the actual files produced these results with the default application controls:

| Map | Mean | RMS | Absolute threshold | Vertices in the corrected cropped contour | Vertices within 3 angstroms of ligand sulfur |
| --- | --- | --- | --- | --- | --- |
| Event, 1 sigma | -0.20393604 | 1.17932427 | 0.97538823 | 10030 | 469 |
| 2FoFc, 1.2 sigma | -0.02578083 | 0.36402115 | 0.41104455 | 6150 | 148 |

The log's `No map found with molNo` warning originates in the native map manager selector when a removed map is no
longer in its store. It is not a map-download error. The fix does not suppress that warning; cleanup tests check
actual buffer and registry disposal, including a delayed native redraw after removal.

Validation:

- PASS: 43 Jest suites / 292 tests, 54.604 seconds. Includes the previous popover/queue, snapshot, transfer and viewer
  boundary checks; new coordinate/statistics tests; native redraw/deletion fixtures; and a test executing the installed
  threaded Coot WASM on a synthetic Gaussian map with a fractional, signed origin.
- PASS: production build and backend stats validation, 55.922 seconds, with the existing two bundle-size warnings.
- PASS: Moorhen asset integrity, 275 assets / 114450225 bytes.
- PASS: targeted production/helper/native-test lint, targeted formatting and whitespace checks.
- NOT RUN: browser visual acceptance. Browser discovery returned no connected browser, despite the backend being
  reachable. Native mesh generation with the actual target data is verified; interactive WebGL appearance is not.

After a full reload, check Event and 2FoFc around the ligand at the initial camera position; change contours, colors,
wireframe/surface and box size; rotate and zoom; toggle all map types and remove them. Repeat snapshot save/restore,
same-project switching and RHS transfers with map controls, checking alignment, cleanup and stable memory.

## Density remains visible after unchecking (2026-09-14)

The installed Moorhen 0.22.7 map `delete`, `hideMapContour` and `setupContourBuffers` methods update
`glRef.displayBuffers` without requesting a canvas repaint. Its WebMG host does not redraw in response to that
buffer list alone. Removing the final selected map can therefore leave the previous frame visible until a mouse
interaction or another render request. The earlier buffer/registry tests did not check repainting.

The adapter now explicitly draws the scene after native map contour setup, hiding and deletion. Native disposal
still drains pending contours and blocks delayed callbacks before acknowledging removal. Snapshot payloads, map
settings, object names and the existing operation queues are unchanged.

Validation:

- PASS: reproduced the missing repaint for Event, 2FoFc and FoFc before the fix. Regression tests execute the
  installed package's actual delete/hide/clear methods, obtained from its bundled source map, with a fixture store
  and a renderer that records the last drawn frame. They check map disappearance, unrelated protein preservation,
  hide/show, native buffer cleanup and repeated deletion. This is not a live WebGL visual test.
- PASS: final-checkbox tests for all three map types through the actual popover, Redux and display hook, including
  delayed deletion and acknowledgement only after disposal. Existing delayed-contour tests still prevent deleted
  resources from being recreated.
- PASS: 11 relevant Jest suites / 95 tests, including adapter/boundary, map geometry/native Coot, display queues,
  pose transfer and snapshot shape checks, 13.403 seconds.
- PASS: production build and backend stats validation, 50.615 seconds; the existing two bundle-size warnings remain.
- PASS: Moorhen asset integrity, 275 assets / 114450225 bytes.
- PASS: production adapter and popover test lint. New adapter test sections have no lint findings; the adapter test
  file still has 53 pre-existing lint errors elsewhere. Changed sections are formatted and whitespace checks pass.
- NOT RUN: live browser acceptance. Browser discovery again returned no connected browser. Reload the Preview,
  toggle each density type off without moving the mouse, then verify re-enabling, contour/style edits and navigation.

## Interaction dots/spikes instead of dashed lines (2026-09-14)

The legacy `contact` representation was mapped to Moorhen `contact_dots`. The installed native implementation sends
`contact_dots_for_ligand` with that representation's CID. Complex loading supplies the whole-molecule CID, even
though this is a ligand validation display, explaining the unrelated cluster of dots/spikes. The old NGL complex
used its contact representation over the protein and ligand, with weak hydrogen bonds enabled.

The adapter style mapping now uses native `allHBonds`, which requests Coot hydrogen-bond pairs and renders them as
dashed cylinders. The serialized representation type remains `contact`; existing complex and event representations
use the corrected mapping. Protein/ligand loading, merging, coordinates and camera behavior are unchanged.

This fixes the wrong visualization, not all NGL interaction semantics. Coot's
[hydrogen-bond API](https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/docs/api/html/) is used without explicit-hydrogen
mode. NGL-specific weak hydrogen bonds, other contact categories, per-category colors and detailed contact options
are not translated by this change. They remain parity work. In a native probe using the actual A71EV2A-x0188a apo
and ligand files, merged ligand coordinates were preserved and Coot returned 170 hydrogen bonds over the combined
structure; none involved UNL. This does not establish equivalent ligand interactions between the two engines.

Validation:

- PASS: the pinned native Coot runtime, initialized with its bundled data archive and tutorial coordinates, produces
  hydrogen-bond pairs. The test executes the installed Moorhen representation and cylinder builder, checks the
  selected native command, verifies both endpoints against those atom coordinates and checks real gaps between
  dashes. GPU rendering and visual appearance are not exercised by this test.
- PASS: complex/event adapter tests use `allHBonds`; enabling complex interactions does not recenter the view.
- PASS: 10 relevant Jest suites / 83 tests, 10.021 seconds, covering adapter and boundary behavior, native interaction
  geometry, display queues, pose transfer and snapshot shapes.
- PASS: production build and backend stats validation, 35.968 seconds; the existing two bundle-size warnings remain.
- PASS: Moorhen asset integrity, 275 assets / 114450225 bytes.
- PASS: targeted production utility and native test lint; native test formatting and changed-file whitespace checks.
- NOT RUN: live browser comparison, toggling, snapshot round trips and layout/transfer visual acceptance. No browser
  is connected. Reload the Preview before comparing the changed representation with the previous dots/spikes.

## Intermittent viewport size and stray semicolon (2026-09-14)

Moorhen's native container measures its dimensions on initialization and window resize. Designs visibility changes,
divider drags and reverse-portal layout moves can change the available panel without a window resize, leaving the
native canvas at its earlier size. The adapter's existing `resize()` only resized WebGL, without updating the native
scene width/height used by its host, 2D overlays and later resize effects. These timing differences account for the
intermittent behavior.

The host now observes its own panel with `ResizeObserver`, coalesces notifications into an animation frame and
resizes through the existing adapter. Native scene dimensions, WebGL size and redraw are synchronized. A briefly
detached/zero-sized portal retains the last usable dimensions. Observation and pending callbacks are stopped during
actual host teardown; Designs toggles and portal movement retain the same adapter, canvas, scene and camera.

The circled symbol matches a literal semicolon following `Moorhen2DOverlay` in the installed MoorhenWebMG figure.
Scoped host styles zero the figure's text metrics to hide it, make the canvas block-level to remove its baseline
gap, and remove the native wrapper/figure margins. Overlay canvases retain absolute positioning and their native
text drawing. The package, worker and static payload are unchanged.

Validation:

- PASS: real host/React reverse-portal tests with mocked native runtime, delayed initialization and repeated modeled
  Designs/layout changes. Check one retained canvas/adapter, coalesced resize notifications, scoped styles and
  teardown cancellation, including a late observer callback.
- PASS: adapter tests for opening/closing Designs and changing panel height, synchronized native scene dimensions,
  unchanged camera and ignoring temporary zero dimensions during a portal move.
- PASS: 14 relevant Jest suites / 98 tests, 16.876 seconds, including viewer/boundary, worker, native map/interaction,
  display queue, pose transfer and snapshot shape regressions.
- PASS: production build and backend stats validation, 66.011 seconds, with the existing two bundle-size warnings.
- PASS: Moorhen asset integrity, 275 assets / 114450225 bytes.
- PASS: changed production/host test lint, formatting and whitespace checks. The existing adapter test file has
  53 pre-existing lint errors; its new resize test has no findings.
- NOT RUN: live browser visual acceptance. Browser discovery returned no connected browser. After reloading, repeat
  Designs show/hide and divider drags at several window sizes, change layouts, rotate/pick near the canvas edges,
  and save/restore/switch snapshots. Check full-area drawing, no semicolon, stable scene/camera and clean removal.
