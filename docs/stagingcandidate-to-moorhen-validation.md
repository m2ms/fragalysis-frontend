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

## Initial scene presentation (2026-09-15)

Molecule load promises resolve before the installed MoorhenWebMG camera effect finishes its 15-frame animation.
The adapter writes the destination to Moorhen's store; that does not immediately position the rendered camera.
The native animator also ignores a new destination while an earlier animation is running. These details qualify
the guide's description of `animateOrientation` applying the final orientation immediately.

Preview now keeps the mounted native container transparent, with a visible "Preparing view..." status, until its
initial selection, coordinate/render queue and saved snapshot camera are ready. The adapter waits for native
operations and camera animation to finish, synchronizes any newer camera destination, and the host reveals the
scene after two settled frames. This can delay the first visible structure until the rest of the initial scene is
ready. The canvas retains its dimensions and native resources throughout preparation.

The reveal is local to the mounted Preview and happens once. Subsequent snapshot switches, toggles and layout
portal moves retain the visible scene and existing camera transitions. Snapshot payloads, incremental command
queues, display/removal acknowledgements and camera compatibility conversion are unchanged.

Validation:

- PASS: 46 Jest suites / 307 tests, including snapshot, transfer, native adapter, queue and host coverage.
- PASS: the new adapter test executes the installed renderer's animation methods across all 15 frames, models a
  newer destination during an active animation, and waits for pending loads/native commands before preparation.
- PASS: initial selection and delayed-render readiness, LHS density/RHS structures, saved-camera readiness, empty
  scenes, queue entries removed after failure, Strict Mode, cancellation, and one-time reveal tests.
- PASS: the host test keeps the same canvas and adapter visible across modeled snapshot loads and portal moves.
- PASS: production build and legacy backend stats validation; the existing two bundle-size warnings remain.
- PASS: Moorhen asset integrity, 275 assets / 114450225 bytes.
- NOT RUN: live browser visual acceptance; no browser is connected. Hard reload a normal target and a saved snapshot
  (including a legacy NGL camera), and check that the first visible structures are already positioned. Then rotate,
  toggle LHS/RHS structures and maps, resize/change layouts, save/restore, switch snapshots repeatedly, and navigate
  poses. Confirm no preparation overlay or canvas disappearance after the initial reveal, smooth transitions,
  incremental removals, and no blocking-dialog flashes. Automated tests do not establish GPU/visual parity.

## Apply representation appearance before presentation (2026-09-15)

The installed `MoorhenMolecule.addRepresentation()` draws its default representation before returning. The adapter
then applied Fragalysis colour, bond/radius settings and opacity, showed the representation and redrew it. This
exposed thin default ligand bonds and the default surface colour while the requested appearance was being built.

The adapter now constructs an undrawn native representation, configures its appearance, and generates its first
mesh with those settings. Newly published buffers stay hidden during the remaining asynchronous atom work. Opacity
is applied to the completed buffers before showing them, and the final reveal explicitly repaints the canvas.
Existing structures remain visible throughout. Initially hidden representations generate no geometry until shown;
their opacity also applies when those buffers are eventually created.

The representation's `ready` promise now covers the entire initialization, including the final reveal. Failed
creation removes its partial native buffers and representation record. Native colour rules are detached before
adding the requested colour: Moorhen's `setColourRules([])` restores defaults rather than clearing the rule list,
and appending to that shared list could otherwise affect other representations. Saved representation records and
the snapshot, centering, transfer and object-operation queues retain their existing contracts.

Validation:

- PASS: 47 Jest suites / 315 tests. After the final repaint adjustment, 8 relevant suites / 82 tests passed.
- PASS: tests execute the installed native representation constructor, colour rules, draw, buffer publication,
  hide/show and deletion code, with controlled mesh generation, atom fetching and GPU allocation. They verify the
  requested LHS/RHS ligand and surface appearance on the first mesh, one initial mesh generation, hidden partial
  buffers, opacity, a final visible frame, a stable pending `ready` promise, hidden saved representations, failure
  cleanup and deletion during creation. Circular native ownership and typed buffer fixtures remain covered.
- PASS: targeted lint for the changed adapter and new native presentation tests; changed-file whitespace checks.
- PASS: final production build and backend stats validation, with the existing two bundle-size warnings; Moorhen
  asset integrity, 275 assets / 114450225 bytes.
- NOT RUN: live browser visual acceptance; no browser is connected. Reload Preview, repeatedly add/remove LHS and
  RHS ligands and surfaces, and check that their first visible appearance already has the requested thickness,
  colour and opacity. Also check representation additions/selection edits, hidden saved representations, rotation,
  layouts, snapshot save/restore/switching and pose transfers with shared structures. Verify that existing objects
  stay visible during preparation and that removal leaves no buffers. The tests do not exercise actual GPU output.

## Other structure presentation audit (2026-09-15)

Proteins, hit-protein sidechains, artefacts and merged complexes use the same representation initialization path.
The installed native lifecycle tests now cover their first mesh settings, hidden partial buffers and final reveal,
including disposal of the temporary ligand before the complex starts drawing.

Spheres were an exception: `addSphere()` loaded and revealed a default-sized sphere, then applied its radius and
optional opacity through an edit/redraw. These settings now enter the initial representation definition. Both new
sphere tests failed against the previous implementation and pass with the fix; only one initial mesh is generated.

Source inspection of the installed Moorhen map code confirms that data loading does not draw contours. The adapter
disables native suggested-settings replacement and applies contour level, radius, style, colours and opacity before
requesting geometry. Native buffer setup applies those colours/opacity before publishing the buffers. This shared
path serves density, event and hotspot maps; it does not establish OpenDX input compatibility. Arrows and cylinders
carry their final coordinates, colour and arrow mode before publication, and the native vector renderer reads those
values directly. Event-map molecule layers use the common molecular initialization path. Multi-part objects retain
incremental layer loading; this audit concerns each representation's initial appearance, not an atomic scene reveal.

Validation:

- PASS: 8 relevant suites / 88 tests, including presentation, adapter/boundary, native map geometry, display queues,
  pose transfer and snapshot shape checks.
- PASS: targeted adapter/new-test lint, new-test formatting and changed-file whitespace checks. The adapter's
  pre-existing camera-method formatting discrepancy remains outside this change.
- PASS: production build and backend stats validation (33.019 seconds), with the existing two bundle-size warnings.
- PASS: Moorhen asset integrity, 275 assets / 114450225 bytes.
- NOT RUN: live visual acceptance; browser discovery again returned no connected browser. Reload Preview and check
  protein/sidechain/artefact/complex/sphere toggles plus density/event maps, including saved customized layers.
  Confirm initial colour, width/radius and opacity, existing-scene continuity, and clean removals. Native lifecycle
  fixtures and source inspection do not establish actual GPU output or complete visual parity.

## Sidechain and hydrogen-bond colours (2026-09-15)

The pre-migration `renderHitProtein` and `renderArtefactChains` definitions in commit `6c617a65` explicitly used
`colorScheme: 'element'`. Their Moorhen defaults omitted it, so the adapter applied the carbon/observation colour
to non-carbon atoms as well. Line representation handles now default to element colouring, including restored
definitions that omit the scheme. Explicit saved schemes such as `uniform` take precedence. Carbon colour, bond
widths, ligand stripping and the preparation/reveal lifecycle retain their existing behavior.

The installed `allHBonds` representation ignores colour rules and passes a hard-coded purple to its dashed-cylinder
builder. Contact representations now pass NGL's hydrogen-bond blue (`#2b83ba`) to that same native builder, before
buffers are created. Coot's selection, detected endpoints, distance filtering, geometry and redraw/disposal paths
are retained. Other representations are unaffected.

This is a colour correction, not full NGL interaction parity. NGL's
[contact palette and detector](https://github.com/nglviewer/ngl/blob/master/src/chemistry/interactions/contact.ts)
also distinguish weak hydrogen bonds, ionic, aromatic, halogen and metal interactions. The current adapter asks
Coot for hydrogen bonds only. Reproducing the remaining coloured lines requires equivalent interaction detection;
assigning those colours arbitrarily to existing hydrogen bonds would misrepresent the chemistry.

Validation:

- PASS: new native-lifecycle checks verify carbon-only colour commands before first presentation for sidechains,
  artefacts and saved definitions without a scheme, plus preservation of explicitly uniform saved colours.
- PASS: the existing real Coot hydrogen-bond test now exercises the adapter's colour override and checks the NGL
  blue for every generated cylinder, alongside its existing endpoint and dash-gap geometry assertions.
- PASS: targeted lint for the adapter and both native presentation/interaction test files.
- PASS: 9 relevant suites / 93 tests, including viewer, queue, transfer and snapshot regressions.
- PASS: production build and backend stats validation (63.419 seconds), with the existing two bundle-size warnings;
  Moorhen asset integrity, 275 assets / 114450225 bytes.
- NOT RUN: live comparison with the supplied screenshots; no browser is connected. Reload Preview and compare
  sidechains, artefacts and contacts; also exercise saved representations, colour edits, hidden/revealed layers,
  snapshots and removal. These checks do not establish exact element shades, lighting or interaction-type parity.

## First density-dialog opening reloads an unchanged map (2026-09-15)

Both D-button left-click handlers omit flags for unselected map types. The popover initializes these checkboxes
to `false`, then previously submitted those normalized settings on mount. The density display hook interpreted
the shape difference as an edit and removed/reloaded the map. Once normalized, subsequent openings did not reload it.

The popover now records its initial control values as the unchanged baseline when density already exists or is
loading. Only changed control values are submitted. Opening without existing density still loads the default map;
real edits, including reverting an edit, still use the existing asynchronous queue. Snapshot shapes are unchanged.

Validation:

- PASS: reproduced the first-open reload for Event, 2FoFc and FoFc before the fix. Actual popover/Redux/display-hook
  tests under Strict Mode now verify no viewer load/delete calls or Redux changes on first opening and reopening.
- PASS: pending initial loads complete once; opening without density loads once; real edits and reverting them work.
- PASS: 7 related suites / 88 tests, including adapter/boundary, display queues, transfers and snapshot shapes.
- PASS: targeted ESLint for the popover and its tests.
- PASS: production build and backend stats validation (77.772 seconds), with bundle-size warnings only;
  Moorhen asset integrity, 275 assets / 114450225 bytes.
- NOT RUN: live browser acceptance; browser connection failed and discovery returned no connected browsers.
  In Django-backed Preview, check left-click D followed by right-click, reopening, edits, removal and snapshot switching.

## Black snapshot thumbnails (2026-09-18)

The snapshot card uses the saved `NGL_SCREEN` image, including with Moorhen. Moorhen 0.22.7 creates its WebGL
context without `preserveDrawingBuffer`; the old adapter either read an undrawn canvas or delegated directly to
asynchronous DOM capture. `dom-to-image-more` could therefore read a cleared buffer, producing the reported black
thumbnail. This follows the [WebGL drawing-buffer lifecycle](https://registry.khronos.org/webgl/specs/latest/1.0/#2.2).

The adapter now redraws and synchronously encodes the canvas before invoking DOM capture. Both the viewer and
full-page snapshot captures replace only the cloned canvas image with that frozen frame, retaining DOM overlays,
layout dimensions and the live canvas. Save/share/update still rescale both images and upload them with snapshot
state in the existing group. Snapshot payloads, orientation and switching behavior are unchanged. Already stored
black images require loading the desired snapshot and using Update to capture it again.

Validation:

- PASS: five new regressions failed before the fix, covering direct/delegated adapter capture, both DOM captures
  after a modeled buffer clear, and full-page capture errors. The focused adapter, boundary, screenshot and snapshot
  shape suites passed all 61 tests after the fix.
- PASS: new coverage also checks high-DPI layout dimensions, labels, unrelated canvases, unchanged live DOM,
  DOM-only fallback, missing viewer nodes and error propagation.
- PASS: full unit suite, 52 suites / 365 tests (117.093 seconds), including native adapter, boundary, display queues,
  pose transfers and snapshot shapes.
- PASS: production build and backend stats validation (79.494 seconds), with the two existing bundle-size warnings.
- PASS: Moorhen asset verification, 275 assets / 114450225 bytes, and `git diff --check`.
- PASS: lint comparison against HEAD found no added findings. The existing adapter test file has 59 lint errors;
  snapshot dispatch actions have 17 unused-variable warnings. Other changed JavaScript files have no findings.
- NOT RUN: live browser acceptance; browser discovery returned no connected browsers. Reload the updated frontend,
  load a target with ligand/protein/map and labels, rotate, then create and update snapshots. Inspect both uploaded
  images and the thumbnail, including after resizing/layout changes. Check LHS/RHS toggles, restore, smooth
  same-project switching, incremental removal, orientation and absence of blocking-dialog flashes.

## Download dialog text and console review (2026-09-18)

The user confirmed the thumbnail now shows the scene, then reported unreadable Download structures labels and
provided console output. The installed Moorhen container appends `darkly.css` globally when the viewer background
is dark. Its body text color is white. The shared Fragalysis modal set its paper background but inherited text color
from that body. Modal paper now also sets the application theme's primary text color. Disabled labels and explicit
button/error colors retain their own styles.

The dialog also retained MUI v4's removed `disableTypography` property, nesting an `h5` or `h4` inside DialogTitle's
default `h2`. All four title states now use a `div` wrapper, retaining the inner heading and its typography.

The `dom-to-image-more` image-load exception was reproduced using the installed library's image helper. It leaves
an `onload` callback on the resolved canvas image which removes a temporary SVG. Replacing that image's `src` with
the frozen frame invokes the callback again, after the SVG has already been removed. The clone adjustment now
detaches the completed load/error callbacks and substitutes the frame only once. Live image handlers are untouched.

Remaining supplied messages:

- `Maximum update depth exceeded`: the user clarified snapshot switching as the suspected trigger and requested
  deferring investigation to a later prompt. The supplied log has no component stack; no fix is claimed.
- `GridLegacy` deprecation: expected with the intentionally retained grid compatibility component.
- Missing dependency source maps: debugger metadata warnings; the log subsequently records successful viewer startup.
- Cross-origin CSS rules: snapshot font discovery cannot inspect Moorhen sheets loaded from port 3030. The installed
  `moorhen.css` and `darkly.css` contain no `@font-face` rules, and the capture library catches these errors and continues.
  Font embedding remains enabled for accessible application font stylesheets; warnings are not suppressed.
- Missing list keys: `PM` maps to the installed Moorhen bundle's React Bootstrap `OverlayTrigger`. The other
  `ForwardRef` warning is not specific enough to locate from this excerpt. No dependency patch was made.
- Zinc charge/protonation warning: emitted by the vendored contact detector's valence model, which lacks a zinc
  assignment branch. It continues using the supplied formal charge (or zero) and default geometry; the log records
  the object load completing. This is a chemistry-model limitation, not a failed structure download.

Validation:

- PASS: the new installed-library image regression reproduced `NotFoundError` before the handler fix and passed after it.
- PASS: a rendered download-dialog test reproduces the body color from the installed dark stylesheet, verifies dark
  text on white paper and the disabled map option, and checks valid headings without React errors while current
  snapshot metadata changes. This uses JSDOM and does not establish live-browser visual acceptance.
- PASS: 7 relevant suites / 88 tests (13.617 seconds), covering the dialog, capture helper, theme/UI boundary,
  viewer adapter/boundary and snapshot shapes.
- PASS: production build and backend stats validation (43.513 seconds), with the two existing bundle-size warnings;
  Moorhen asset verification, 275 assets / 114450225 bytes.
- PASS: targeted ESLint and whitespace checks. Download dialog retains its four pre-existing unused-variable
  warnings, verified against HEAD; the other files changed in this follow-up have no lint findings.
- NOT RUN: live browser verification; no browser is connected. Reload the updated frontend, inspect all download
  dialog labels, and save/update a snapshot to confirm the thumbnail remains correct without the image-load error.

## Timed same-project snapshot transitions (2026-09-18)

The user approved replacing the old transition timing and staging structure changes after camera motion, with
rollback if the live result is worse. Baseline commit: `8dbfb9bbb356face05de4344c78522abb6d415f5` (clean working tree).
The former `2000` argument was ignored by the adapter: it dispatched camera state immediately, while the installed
Moorhen host independently animated over 15 frames. Snapshot cloning and structure work could overlap that motion.

The adapter now interpolates origin, zoom and the shortest quaternion arc using animation-frame timestamps and a
400 ms smooth easing curve. An unchanged camera does not wait out that duration. A guard around the installed
native camera scheduler invalidates already queued native frames and prevents competing animations. It is restored
on teardown. Final camera values are copied to Moorhen's store before camera ownership is released; origin and zoom
notifications retain map updates and zoom-dependent clipping/fog. Legacy NGL matrix conversion retains fitted zoom.

The switch prepares its existing cloned/merged state before motion, lets the final camera frame paint, and then
applies destination intent through the existing slice actions and display queues. It rebases against current state
if work completed during motion. Request ownership is kept outside Redux: a newer selection aborts old camera motion,
ignores stale fetch responses, and owns flag cleanup. Manual pointer/wheel/keyboard input on the canvas stops motion
while allowing destination structures to load. The existing orientation-applied flag prevents delayed restoration
from snapping the camera back afterward. Initial/job hydration retains its separate full-state path. Snapshot/API
formats, structural preservation masks, native load/deletion queues and blocking-dialog suppression remain intact.

Validation:

- PASS: all 55 Jest suites / 388 tests, 67.335 seconds. Includes adapter/boundary, display queues, transfers, initial
  presentation, layout/host and snapshot compatibility checks.
- PASS: 3 directly changed suites / 65 tests after test-style adjustments, 11.427 seconds. New cases cover irregular
  frame intervals, final camera/store agreement, native scheduled frames, shortest rotations, legacy zoom, unchanged
  cameras, supersession, manual interruption, errors, teardown, stale responses, fresh runtime acknowledgements,
  shared-object retention/removal commands, and initial versus in-place orientation restoration.
- PASS: production bundle and backend stats validation, 67.454 seconds, with the two existing bundle-size warnings.
- PASS: Moorhen static integrity, 275 assets / 114450225 bytes; whitespace check; no additional ESLint findings versus
  baseline. The adapter test file retains 59 existing test-style errors; snapshot actions and ProjectPreview retain
  their 17 and 1 existing unused-variable warnings respectively. New test files have no findings.
- NOT RUN: live timing baseline/comparison or visual acceptance because browser discovery returned no connected
  browser. Installed native scheduling is exercised in tests, but WebGL drawing is modeled; no live FPS improvement
  or smoothness guarantee is claimed. No speculative surface-quality or rendering-cache changes were made.

For live acceptance, reload the tab first. Compare camera-only snapshots, snapshots with different structures, and
complex protein/surface/map scenes. Record fetch/preparation delay, camera frame gaps and destination completion time;
rapidly select A/B/C and rotate or zoom during a transition. Confirm the latest snapshot wins, shared objects stay
visible, removed objects disappear, no blocking dialog flashes, and manual camera changes survive structure loading.
Also check initial target/snapshot load, LHS/RHS toggles, layout moves/resizing, save/update thumbnails, orientation
restoration, and repeated RHS transfers with shared inspirations while watching memory. The separately deferred
maximum-update-depth warning is not claimed fixed by this change.

## First Designs opening after restoring a snapshot (2026-09-18)

Read-only inspection of `/api/snapshot_state/4/` confirmed that project 4 / snapshot 4 was saved with
`sidesOpen.RHS: false`, `areRHSCompoundsInitialized: false`, and `rhs_selectedTagList: []`. The target's tag API
contains one visible RHS tag (79). The selection was not lost during switching: no RHS selection had been saved,
and `initializeRHSMolecules` skipped default tag selection for every snapshot, including an unopened Designs panel.

RHS initialization now selects its normal first eligible tag for that uninitialized snapshot case. It requires an
explicit false initialization flag, an empty saved tag list, and no saved Show all, untagged, or coordinate filter.
Existing selections, intentionally cleared initialized selections, and legacy snapshots with an unknown initialization
status retain their saved behavior. Direct-display mode still skips initialization. This fallback dispatches only a
tag selection; LHS initialization, structure queues, camera restoration and the approved animation are unchanged.
Existing snapshots use the fallback when opened; no saved record or API payload format was modified.

Validation:

- PASS: the save/merge/first-open regression reproduced the empty selection before the fix and passes afterward.
- PASS: 6 relevant suites / 54 tests, 13.164 seconds, including snapshot shapes/switching, project camera restoration,
  pose transfers and initial viewer presentation. Tests cover preserved saved/empty choices, direct display, filter
  alternatives, eligible tag ordering and repeated initialization without touching viewer state.
- PASS: no new ESLint findings against HEAD and clean whitespace checks for changed code. The actions retain five
  existing unused-variable warnings; the existing test retains its one pre-existing assertion-style finding.
- PASS: production build and backend stats validation, 75.934 seconds, with the two existing bundle-size warnings;
  Moorhen asset integrity, 275 assets / 114450225 bytes.
- NOT RUN: interactive Designs opening; no browser is connected. Reload, restore snapshot 4, then open Designs and
  confirm tag 79 is selected. Also restore a snapshot with an explicitly cleared tag selection and confirm it stays
  empty. Close/reopen Designs and recheck smooth snapshot switching.

## Scene settings parity (2026-10-02)

- Investigation: the removed frontend pinned NGL 2.0.0-dev.37. Its
  [viewer source](https://github.com/nglviewer/ngl/blob/v2.0.0-dev.37/src/viewer/viewer.ts) interprets near/far
  clipping and fog as percentages of the scene bounding radius, with 50 at the camera target. `clipDist` is a
  minimum camera-to-near-plane distance in Angstroms, not slab thickness. The warning switch controls eligible
  molecule-image warning icons independently of the viewer.
- Fix: keep the existing Redux/snapshot fields and translate percentages to Moorhen world distances in the adapter.
  Compute bounds from native mesh vertices/instance origins using a weak cache; never serialize/copy native handles.
  Convert Moorhen's view height to an equivalent NGL camera distance for the `clipDist` minimum. Moorhen has a
  different projection, so this is a view-size compatibility conversion rather than identical camera geometry.
- Fix: initialize and reapply parameters from the application store on snapshot restore without recreating the
  adapter/canvas. Recompute planes for scene geometry/zoom changes and prevent native zoom frames from replacing
  them with Moorhen's default slab. Restore the draw method and remove the zoom listener on actual teardown.
  Preserve native manual plane edits until the view or application settings change. Avoid redundant background
  dispatches when a slider updates; these caused unnecessary native representation redraws.
- Fix: restoring a different background exposed native molecule-card redraws racing snapshot removal, producing
  `Cannot pass deleted object as a pointer of type Structure`. Track and serialize these native redraw callbacks
  per molecule, drain active callbacks before deletion, and skip callbacks arriving after disposal starts.
- PASS: full Jest suite, 61 suites / 453 tests, 136.675 seconds; focused adapter/settings/host retest,
  3 suites / 62 tests. Coverage includes installed native clip/fog setters
  and zoom-frame scheduling, individual parameter edits, circular native buffers, geometry replacement/removal,
  listener cleanup, initial saved settings, snapshot settings updates retaining the same adapter/canvas, and native
  background redraws with delayed completion, circular buffer ownership, removal acknowledgement and late callbacks.
- PASS: production build and backend stats validation, 46.192 seconds, with the two existing bundle-size warnings;
  Moorhen asset integrity, 275 assets / 114450225 bytes. No new ESLint findings; the adapter test retains its
  59 existing findings. Clean whitespace checks.
- PASS (live Chrome, local Django/development bundle, A71EV2A / lb18145-1): fresh target load, black/white background,
  clip near/far extremes visibly hiding/revealing structures, `clipDist` 100 hiding structures and 10 restoring them,
  fog near 0 visibly darkening the scene, fog far 0 fading structures completely, and restored drawer defaults.
  Native plane/fog readbacks agree with the translated values. Warning switch state toggles; this target's visible
  rows have no eligible warning icons, so icon appearance itself was not visually verified.
- PASS (live): rotation, wheel zoom and Designs opening/closing retain the loaded scene and translated ranges.
  Existing snapshots 7 and 6 restore orientation and structures. Changing the background to white and `clipDist`
  to 100 before restoring snapshot 6 reapplies its black background and distance 10; native inspection confirms
  the same adapter instance survives. The deleted-Structure exception reproduced before the teardown fix and did
  not recur in the final repeat. No saved records were changed.
- NOT RUN: creating/updating a saved snapshot (the connected session is anonymous, with update controls disabled),
  unlocked draggable layouts, and a complete RHS transfer/memory audit. Panel width dragging was attempted but
  no width change was observed; layout-induced viewer resizing is covered by the host regression test.

## Dependency security refresh (2026-11-04)

- Updated the packages named in the supplied vulnerability report to maintained releases within their existing major
  lines where possible. Direct upgrades include Axios 0.35.0, Express 4.22.3, Markdown-to-JSX 7.7.17, Moment 2.31.0,
  UUID 11.1.1, Webpack development middleware 7.4.6, Babel core 7.29.7/runtime 7.29.10 and Lodash 4.18.1.
  React/React DOM/react-is remain 19.2.7 and Moorhen remains 0.22.7.
- Targeted resolutions prevent vulnerable copies retained by exact or old transitive ranges: GraphQL Tools utils
  12.0.2, flatted 3.4.4, Lodash 4.18.1, qs 6.17.1, serialize-javascript 7.1.4, shell-quote 1.12.0, tmp 0.2.7 and
  UUID 11.1.1. BioJS's unsupported request dependency is aliased to the compatible maintained @cypress/request 3.0.10
  fork, also removing its old tough-cookie/form-data dependencies. The installed BioJS browser mapping to xhr is retained.
- Axios retains CancelToken, URL normalization, existing array query serialization, CSRF and no-cache behavior.
  Its newer transform serializes FormData as JSON when given the default JSON content type; the API boundary removes
  that header for FormData to preserve the old multipart upload behavior and browser-generated boundary.
- `yarn npm audit --all --recursive --json`: security advisory entries decreased from 212 across 61 package names to
  5 across 4 names. Counts exclude deprecation notices; the audit still exits nonzero. No advisory was suppressed.

Remaining advisories:

| Package / dependency path | Reason retained |
| --- | --- |
| extract-zip 2.0.1 / Cypress | [Symlink traversal](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) and [arbitrary writes](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3); no patched release is published. Used by the Cypress binary installer. |
| deepmerge 4.3.1 / jest-config | [Prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4); no patched release is published. Formik's separate 2.2.1 copy is outside this advisory's affected range. |
| glob 10.5.0 / Jest reporters | [Cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4); the published fix requires 14.0.2, outside the parent's supported range. |
| minimatch 3.1.5, 5.1.9, 9.0.9, 10.2.6 / tooling | [Pattern amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249); the published fix requires 11.0.1. A blanket override breaks callers expecting the old callable CommonJS export. The older advisories in the supplied report are fixed. |

Validation:

- PASS: immutable installation with Node 24.18.0 / Yarn 4.17.1; existing React peer warnings remain.
- PASS: full Jest suite, 70 suites / 521 tests; final compatibility checks, 3 suites / 9 tests, including the subsequently
  added tooltip and XHR-boundary checks. Tests exercise installed Axios transforms/serialization/cancellation, native
  multipart bodies, CSRF headers, tooltip Markdown/link overrides, BioJS's request callback/cookie API, CommonJS UUID
  and circular flatted cache round trips.
- PASS: production build and backend stats validation, with the two existing bundle-size warnings; Moorhen integrity,
  275 files / 114450225 bytes. Changed JavaScript passes targeted ESLint and Prettier checks.
- PASS: updated Express/development middleware serve a compiled JavaScript bundle with HTTP 200 and a JavaScript MIME
  type. The full application development server compiled successfully on isolated port 3031 and served its proof page;
  the temporary server was stopped. An initial standalone compiler under system temp hit a Windows libuv watch assertion;
  the subsequent full repository server did not reproduce it. HMR editing was not exercised.
- PASS (live Chrome, local Django, updated production bundle, A71EV2A / lb18145-1): landing/API data, public target
  initialization, native molecular rendering, viewer rotation and ligand off/on toggles; viewer reports ready.
- NOT RUN: authenticated image upload or snapshot writes, save/restore/same-project transitions, layout resizing and
  RHS transfer/memory acceptance. The browser session is anonymous; the upload transport is covered by integration tests.

## Dependency security follow-up from checkpoint 195c7bdf (2026-11-04)

- Cypress 15.11.0 -> 15.21.1 removes extract-zip and uses yauzl directly. Its installed binary was downloaded and
  verified through the repository's explicit install command; automatic install scripts remain disabled.
- Jest's glob 10.5.0 descriptors resolve to 14.0.3, fixing the cancellation advisory. Older callback-based glob 7/8
  dependencies retain their APIs; those versions are outside that particular glob advisory's affected range.
- All minimatch descriptors resolve to 11.0.4, including the old versions used by lint, coverage, file-list and Moorhen
  build tooling. This uses the upstream nonrecursive matcher and fixed pattern optimization implementation.
- Six checked-in Yarn patches in `.yarn/patches` are required with package.json and yarn.lock:
  - minimatch 11: expose the callable CommonJS entry point alongside the modern named exports.
  - glob 7 and glob 8: read the new matcher's pattern field and use its test method for both synchronous and callback
    traversal. Existing ignore, dotfile and callback behavior is covered with real temporary filesystem fixtures.
  - eslint-plugin-import: use Minimatch.match in no-internal-modules instead of the removed regex-building API.
  - test-exclude: enable windowsPathsNoEscape for its Windows containment check. Without this compatibility option,
    native backslashes in its absolute glob pattern excluded project sources from coverage under minimatch 11.
  - deepmerge 4.3.1: define copied keys as own data properties in both merge branches, preventing __proto__ setters
    from poisoning returned objects. Patch the source and published CommonJS/UMD bundles. Formik's deepmerge 2.2.1
    remains unchanged, as do Fragalysis's custom snapshot merge helpers.
- Regression discrimination: installed unpatched deepmerge failed the new target-key and null-prototype-source tests.
  The minimatch upgrade initially exposed legacy glob matcher internals and the import rule's removed makeRe API;
  compatibility patches address those failures rather than replacing the matcher with an older implementation.
- Audit: 5 -> 1 security advisory entries. The remaining low-severity deepmerge advisory is still reported against
  version 4.3.1: registry auditing does not account for the local source patch. The exploit regression is fixed in the
  installed package; no version was falsified and no advisory/deprecation notice was suppressed. Retire this patch when
  an upstream release fixes [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
- PASS: immutable installation, focused compatibility tests and targeted ESLint; production build and backend stats
  validation with the two existing bundle-size warnings; Moorhen integrity, 275 files / 114450225 bytes.
- PASS: final full Jest suite, 71 suites / 538 tests, 169.181 seconds, after all compatibility patches were installed.
- PASS: 19 focused compatibility tests, including CommonJS and UMD deepmerge poisoning cases, legacy/modern glob
  traversal, ESLint override/import rules, and synchronous/asynchronous coverage discovery. An additional installed
  ESLint allow-list probe passes. Glob cancellation rejects after the first directory read and performs no further
  traversal in a controlled filesystem probe. API coverage collection passes with nonzero executed source statements;
  use `--no-cache` when retesting instrumentation after patching Babel's coverage dependencies.
- PASS (live Chrome, local Django/development bundle, A71EV2A / lb18145-1): landing data, native molecular rendering,
  viewer readiness, rotation and ligand off/on toggles after the upgrades.
- PARTIAL: Cypress 15.21.1 local smoke on headless Edge passes landing/Management navigation. The viewer case fails
  because Cypress's application frame lacks the required cross-origin isolation; its failure screenshot shows the
  explicit Moorhen COOP/COEP error. Ordinary Chrome renders the same target. The original Chrome smoke command cannot
  detect the locally available Chrome installation; Edge was selected explicitly for the fallback run. No browser
  security settings or application isolation checks were relaxed.
- NOT RUN: authenticated Cypress scenarios, snapshot writes/restores, layout resizing and RHS transfer/memory acceptance.

## Serial bulk LHS ligand experiment (2026-11-05)

Branch: `codex/lhs-ligand-serial`, based on `da1cbfa2`. The user explicitly approved this first experiment after
reviewing the trade-off against the documented concurrency of independent structures. Only multi-ligand requests
from the LHS navigator's bulk ligand control enter the serial lane. Individual toggles, RHS transfers, other
structure types and snapshot hydration keep their existing scheduling.

All requested ligand intents enter the normal Redux list immediately, retaining the complete snapshot intent.
A weak set outside Redux identifies the live bulk request without adding fields to saved state. The display hook
admits one marked ligand through coordinate fetching, native representation readiness and the rendered acknowledgement,
then yields a browser task before admitting another. Waiting items are selected from the latest intent list, so
deselection and snapshot replacement can supersede them before loading. Existing per-item operation ordering and
native deletion remain in place. LHS deletion now uses the existing object name without fetching coordinates, so
cancelling an unstarted ligand does not download it. Coordinate failures use the same rollback path as render failures
and release the serial lane. Hook teardown cancels the resume timer and prevents further admissions.

Validation:

- PASS: focused viewer, display queue, transfer and snapshot checks, 12 suites / 152 tests. Nine new integration cases
  exercise the actual LHS toolbar handler, Redux reducers, coordinate fetches and adapter boundary under Strict Mode.
  Coverage includes one of 930 requests starting, all intents saved in the existing shape, delayed native completion,
  browser-task yielding, concurrent individual requests, removal with delayed disposal and circular native buffers,
  fetch/render failures, snapshot supersession/restoration and unmounting.
- PASS: full Jest suite, 72 suites / 547 tests, 297.116 seconds.
- PASS: production build and backend stats validation, with the two existing bundle-size warnings; Moorhen integrity,
  275 files / 114450225 bytes. Changed JavaScript passes targeted ESLint with the five existing unused-variable
  warnings in molecule actions; new files and the changed hook have no lint findings. New files/hook pass Prettier.
- PARTIAL (live Chrome, local Django/development bundle, A71EV2A / lb18145-1): reloaded the tab before testing, confirmed
  initial target rendering and Moorhen readiness, selected Show all hits (736 poses / 930 observations), removed the
  initial ligand and confirmed the 930-ligand bulk request. Ligands appeared progressively; viewer rotation worked
  during loading and the scene remained visible without a blocking rendering dialog. Load-completion logs progressed
  individually, but loading remained slow and several UI actions exceeded browser-control timeouts. Serialization
  alone does not establish acceptable responsiveness or improved total throughput. This was not a controlled timing
  comparison; production compilation also ran during part of the live check.
- UNVERIFIED (live): the bulk removal click was issued, but subsequent browser inspection timed out. Computer-use
  stopped because it could not verify the current browser URL reliably; native disposal and cancellation completion
  could not be confirmed. Reload the tab before retesting. No snapshot records were written.
- NOT RUN: completion of all 930 native loads, quantitative cold/warm comparisons, final-scene FPS/memory measurements,
  live save/restore/same-project switching, layout resizing or complete RHS transfer acceptance. The unit tests model
  native lifecycles; they do not establish visual parity or GPU performance.

## Bounded bulk LHS ligand experiment (2026-11-05)

Branch: `codex/lhs-ligand-pool`, independently based on `da1cbfa2`, matching the serial experiment's baseline.
The default `LHS_BULK_LIGAND_CONCURRENCY` in `js/config/viewer.js` is 4. Set it to 2 or 8 and rebuild/reload to compare
limits. It counts complete bulk ligand loads, including coordinates and native rendering, rather than just network
requests or worker messages. It is a source setting for this experiment and is not saved in snapshots.

The pool uses the same scope and compatibility protections as the serial branch: only multi-ligand requests from the
LHS navigator bulk ligand control are marked outside Redux; every requested intent is saved immediately in its normal
shape. Individual toggles, RHS transfer requests, other structure types and snapshot hydration retain their scheduling.
The shared per-item operation queue and native deletion queues are unchanged. Waiting requests are read from current
Redux intent, preventing obsolete waiting loads from starting after deselection or snapshot replacement. Deletion by
name avoids fetching cancelled coordinates, and coordinate/render failures remove failed intent and release capacity.

The display hook reserves slots by observation ID before awaiting work. This prevents repeated effects and overlapping
bulk requests from spending multiple slots on the same pending load. Each slot remains occupied until the native load
and rendered acknowledgement finish, then yields a browser task before reuse. Slots refill independently when loads
finish out of order; this is not a sequence of batches that waits for the slowest member. Cleanup cancels all pending
resume timers while preserving active claims through Strict Mode's effect replay. This experiment does not batch Redux
publication, coalesce native draws or change representation quality.

Validation:

- PASS: focused viewer, display queue, transfer and snapshot checks, 12 suites / 157 tests. Fourteen new integration
  cases exercise limits 2/4/8 with 930 toolbar requests, snapshot intent preservation, delayed coordinates/rendering,
  out-of-order completion, independent slot refill, duplicate/overlapping requests, concurrent individual requests,
  delayed disposal with circular native buffers, coordinate/render failures, snapshot supersession/restoration and
  teardown during both fetching and scheduled resume tasks.
- PASS: full Jest suite, 72 suites / 552 tests, 254.927 seconds.
- PASS: production build and backend stats validation, with the two existing bundle-size warnings; Moorhen integrity,
  275 files / 114450225 bytes. Targeted ESLint reports only the five existing unused-variable warnings in molecule
  actions; new files, viewer configuration and the display hook have no lint findings and pass Prettier.
- PASS (live Chrome, local Django, production bundle `main-600d360673d8fea254ea.js`, A71EV2A / lb18145-1): started
  a fresh target session, confirmed initial native rendering/readiness, then loaded the first tag's 19 observations
  across 13 poses through the LHS bulk ligand control. Completion logs increased by 19. The ligands appeared in the
  scene; no console errors were captured. Rotation, opening/closing Designs with viewer resizing, bulk removal and
  reloading that group preserved the remaining scene. No saved records were changed. Compilation and tests were idle
  during this check. This was functional acceptance of a small group, not a timed comparison with the serial branch.
- UNVERIFIED (live): a mid-load cancellation attempt exceeded the browser interaction deadline; a subsequent check
  showed the 19-ligand reload had completed. Cancelling queued/in-flight work is covered by delayed integration tests,
  but this live attempt did not establish interruption during loading.
- NOT RUN: full 930-ligand completion, controlled cold/warm comparisons at limits 2/4/8, final-scene FPS/memory,
  live snapshot save/restore/same-project switching, unlocked layouts and a complete RHS transfer/memory audit.

For a controlled comparison, reload before every run, use the same filtered observations and starting scene, and record
first-visible/all-rendered time, long UI stalls, rotation responsiveness and peak memory. Compare cold and warm coordinate
caches separately. Keep compilation and test runners idle while measuring. Full 930-ligand completion and live resource
cleanup require browser verification; mocked lifecycle tests alone do not establish throughput or GPU performance.

## Pipelined bulk LHS ligand experiment (2026-11-05)

Branch: `codex/lhs-ligand-pipeline`, independently based on `da1cbfa2`, matching the serial and bounded-pool baselines.
Only the LHS navigator's multi-ligand bulk control uses this pipeline. Source settings in `js/config/viewer.js` default
to `LHS_BULK_LIGAND_DOWNLOAD_CONCURRENCY = 6` and `LHS_BULK_LIGAND_RENDER_CONCURRENCY = 2`. Rebuild and reload to compare
other positive integer limits. Neither setting enters Redux or saved snapshots.

Six coordinate-preparation slots include both active downloads and prepared ligands waiting for native admission.
Each slot is held until its ligand starts rendering. At most two additional ligands can occupy native rendering slots,
so the default pipeline holds no more than eight preparations/loads. This bounds the prefetch backlog when rendering
is slow instead of downloading all 930 coordinates ahead. Ready ligands can render while an earlier download is slow;
each native slot lasts through the actual representation readiness and rendered acknowledgement.

Every requested intent is still added to Redux immediately in the existing shape. Runtime-only records claim each
observation through the existing per-item operation queue, which orders loading, removal and reload across both phases.
Prepared coordinates wait outside Redux; no native handles are copied into application state. Completion and preparation
notifications coalesce into a browser task before capacity is reused. Individual requests, RHS transfers, other object
types and snapshot hydration keep their original scheduling. Representation quality and native drawing are unchanged.

Before native admission, each bulk preparation checks that its original intent and registered viewer are still current.
Deselecting a prepared ligand, replacing a snapshot or replacing the runtime cancels that preparation without creating
an obsolete native molecule. Existing active native loads retain their ordered removal/disposal path. Unstarted removal
uses the existing object name without fetching coordinates. An obsolete download failure cannot remove a replacement
snapshot's intent. Hook teardown releases waiting admissions and clears the coalesced timer while retaining Strict Mode
claim protection; late coordinate responses cannot start new native work after unmount.

Validation:

- PASS: focused viewer, display queue, transfer and snapshot checks, 12 suites / 164 tests. Twenty-one new integration
  cases cover independent limits, all 930 intents saved, bounded prefetch with blocked rendering, slow/out-of-order
  downloads, native readiness and appearance, circular native state, duplicate/overlapping bulk requests, concurrent
  individual requests, cancellation before/after native admission, delayed actual disposal, failures, obsolete errors,
  snapshot supersession/restoration, runtime replacement and teardown in fetching/ready/rendering/yielding phases.
- PASS: full Jest suite, 72 suites / 559 tests, 285.283 seconds.
- PASS: production build and backend stats validation (`main-d40035d63a06ec36c889.js`), with the two existing
  bundle-size warnings; explicit Moorhen asset verification, 275 files / 114450225 bytes. Targeted ESLint reports
  only the five existing unused-variable warnings in molecule actions. Changed configuration, hook, helper and
  integration tests pass Prettier; existing formatting elsewhere was retained.
- PASS (live Edge, local Django, development bundle `main-d62146b54f5c68a98ca4.js`, A71EV2A / lb18145-1): initial
  target rendering, the first tag's 19 observations across 13 poses, bulk removal and warm reload. Native completion
  logs increased from 3 to 22 to 41; screenshots showed all ligands loaded and then removed while the protein remained.
  A further load/cancel attempt ended with a clear ligand scene and the native completion count at 45 rather than 60.
  This establishes functional small-group loading/removal and interruption, not a controlled throughput comparison.
  The existing Moorhen native list-key warning appeared at initialization before bulk loading. No snapshot records
  were written, and compilation/tests were idle during this check.
- LIMITATION (live): bulk removal and the cancellation click exceeded browser-control deadlines before the subsequent
  observations recovered. This branch does not establish responsive bulk deletion or eliminate all main-thread stalls.
  Reducing native admission limits does not coalesce native draws or bound the cost of the final 930-object scene.
- NOT RUN: full 930-ligand completion, controlled cold/warm comparisons, final-scene FPS/memory, rotation/layout
  switching/resizing, live snapshot save/restore/same-project switching and complete RHS transfer/memory acceptance.
  These remain live checks; passing mocked lifecycle tests does not establish visual parity or GPU performance.

Compare this branch against the serial and bounded-pool branches from fresh target sessions, using the same filtered
observations and starting scene. Record first-visible/all-rendered time, UI stalls, rotation responsiveness and peak
memory, keeping compilation and test runners idle. Compare cold and warm coordinate caches separately. Try the default
6/2 preparation/render limits and 4/1 to distinguish download overlap from native contention.

## Batched bulk LHS ligand experiment (2026-11-06)

Branch: `codex/lhs-ligand-batched`, independently based on `da1cbfa2`, matching the first three experiments.
This variant batches request publication and coalesces the adapter's explicit load-completion repaints. It retains
baseline concurrency for fetching and native geometry work, isolating this experiment from the serial/pool/pipeline
variants. It does not guarantee fewer Moorhen worker messages or solve the final 930-object scene's GPU cost.

The LHS navigator's multi-ligand control now dispatches three actions for the whole request: disable the requested
ligand buttons, append every intent, and re-enable those buttons. Previously it dispatched three actions per ligand
(2,790 for 930 observations). The reducers copy the relevant list/button dictionary once per action. Existing entries,
tombstones, duplicate intents, per-control settings, observation order and original intent object identities remain
intact. Buttons are re-enabled in `finally` if publication fails. Individual toggles and other controls use their
existing actions. Every requested intent remains immediately available to snapshot saving in its original shape.

A WeakSet marks live bulk intents outside Redux. Only those loads pass the runtime-only `coalesceDraw` option through
the existing viewer boundary. At initial representation completion, the adapter combines explicit repaint requests
that arrive before the next animation frame. All participants await that actual repaint before native readiness and
Redux rendering acknowledgement complete. A 100 ms fallback (`LHS_BULK_LIGAND_DRAW_MAX_WAIT_MS` in
`js/config/viewer.js`) prevents throttled/background frames from indefinitely holding readiness. The fallback is an
event-loop deadline, not a guarantee while synchronous work blocks JavaScript.

This is deliberately scoped to the adapter's explicit completion/failed-initialization repaints. Moorhen also requests
draws through its own Redux store during buffer work, and those remain intact. The renderer is not globally patched;
camera animation, picking, editing and native store-driven drawing retain their immediate paths. Snapshot-restored
intents lose the WeakSet marks and retain ordinary rendering. Screenshot capture flushes a pending repaint and encodes
the canvas in the same turn; teardown flushes pending readiness, drains named operations, disposes resources and
cancels the outstanding frame/timer. The existing per-item load/removal queues and representation settings are retained.

Validation:

- PASS: focused viewer/boundary, display queue, selection, transfer and snapshot checks, 13 suites / 173 tests.
  Fourteen new cases verify 930 requests in three subscriber notifications, snapshot shapes, retained tombstones and
  identities, independent button state, publication failure cleanup, normal concurrent loading, runtime-only options,
  saved appearance, delayed readiness/deletion with circular native buffers, shared repaints, throttled frames,
  synchronous capture, drawing errors/retry, task counts and teardown with an active native load waiting for paint.
- PASS: full Jest suite, 72 suites / 552 tests, 269.468 seconds.
- PASS: production build and backend stats validation (`main-d5f47b5d04e001ddc41a.js`), with the two existing bundle-size
  warnings. New/changed production code has no new ESLint findings. The touched legacy action/reducer files retain
  twelve existing unused-variable warnings; the native adapter test file retains existing lint findings outside its
  new test block. The new integration tests and new adapter test block have no lint findings.
- PASS: explicit Moorhen asset integrity verification after the final build, 275 files / 114450225 bytes. The new
  integration test, bulk helper, viewer configuration, display hook and button reducer pass Prettier. Other touched
  legacy files retain their existing formatting; changed files use LF line endings and pass `git diff --check`.
- PASS (live Chrome, local Django, final production bundle `main-d5f47b5d04e001ddc41a.js`, A71EV2A / lb18145-1): fresh
  target initialization, the first tag's 19 observations across 13 poses, rotation, Designs open/close, bulk removal
  and warm reload. Native completion logs increased from 3 to 22 to 41. Screenshots confirmed the ligand scene,
  its removal with protein/sidechains retained, and the completed warm reload. No console errors or warnings were
  captured. Compilation/test runners were idle, and no saved records were written. This was small-group functional
  verification, not a controlled speed comparison or a live measurement of frame coalescing.
- NOT RUN: full 930-ligand completion, quantitative comparisons across branches, live repaint counts, FPS/peak memory,
  in-flight cancellation, unlocked layout/resizing acceptance, snapshot save/restore/same-project transitions and a
  complete RHS transfer/memory audit. Snapshot and lifecycle tests do not establish live visual parity or GPU cost.

For comparison, reload before each branch, keep the same filtered observations and initial scene, and separate cold
and warm coordinate caches. Record initial toggle latency as well as first-visible/all-rendered time, responsiveness,
repaint frequency and peak memory. This branch reduces initial Redux work and eligible adapter repaints; the other
three variants limit active loads. A later combined experiment can test both mechanisms once each is measured.

## Combined bulk LHS ligand experiment and controls (2026-11-06)

Branch: `codex/lhs-ligand-combined`, merging `codex/lhs-ligand-batched` with `codex/lhs-ligand-pipeline`.
The serial and pool alternatives are available as presets of the shared scheduler rather than competing display hooks.
The earlier four experimental branches remain unchanged.

Default combined behavior:

- Publish every bulk ligand intent and button state in three Redux updates.
- Prepare up to six ligands (including downloaded ligands waiting for native admission) while up to two native loads
  finish rendering. Slots remain occupied through the actual coalesced completion repaint and Redux acknowledgement.
- Coalesce adapter completion repaints within an animation frame, with a default 100 ms fallback for throttled frames.
- Keep per-item/name operation ordering, stale-intent/runtime cancellation, failure cleanup and awaited native disposal.

The bottom toolbar now displays `Ligands downloaded X/Y` and `Rendered Z/Y` between HITS and the main viewer settings.
These are counts of unique currently requested LHS ligands, excluding removal tombstones. Downloaded includes cached
or inline coordinates; rendered requires a rendered-intent acknowledgement and matching LHS object metadata. Duplicate
requests for an already displayed ligand count once. Totals follow selection/snapshot changes and fall to zero on removal.
The component derives counts from existing caches, intent and detached viewer records without publishing extra actions
or retaining native handles.

A sliders button beside the counter opens **Bulk ligand loading**. Presets cover Original (unrestricted), experiments
1â€“4, and Combined. Custom controls select unrestricted/serial/pool/pipeline scheduling, complete-load or independent
preparation/render limits, request batching, repaint coalescing, and repaint fallback delay. Inputs require positive
whole numbers. Apply commits a tab-local immutable settings record; Cancel leaves it unchanged. Settings reset on page
reload and are not included in saved snapshots or API payloads.

Each bulk request captures its settings outside Redux in a WeakMap. An active configuration finishes before requests
using a different configuration start; changes never resize or reassign an in-flight operation. Serial holds one slot
through coordinates and native readiness; Pool holds the configured number of complete-load slots; Pipeline bounds
preparation and native phases separately. The unrestricted preset removes admission limits. Original and experiment
presets reproduce their scheduling/publication/repaint choices while retaining the shared lifecycle protections.
Individual toggles, RHS operations and cloned snapshot intents keep normal scheduling. Snapshots do not inherit the
currently selected experimental strategy.

Validation:

- PASS: focused checks, 17 suites / 214 tests. In addition to inherited queue, viewer, transfer and snapshot cases,
  coverage includes original/serial/pool/combined modes, queued settings changes, actual shared repaint readiness,
  configurable fallback timing, live counter acknowledgements/removals/restores, presets, custom controls, validation,
  Cancel, and absence of additional Redux fields. Circular native buffers and delayed actual disposal remain covered.
- PASS: targeted ESLint for the new controls, settings, counters and integration tests; the toolbar retains its two
  existing unused-import warnings. No new lint findings in those checks.
- PASS: final full Jest suite, 75 suites / 590 tests, 295.395 seconds. The combined pipeline fixture isolates unused
  native package imports while exercising the actual adapter repaint scheduler; native load/disposal coverage remains
  in the adapter suite and the local browser checks.
- PASS: production build (`main-b17ed3f584884cc47958.js`) and backend stats validation, with the two existing bundle-size
  warnings; Moorhen asset integrity, 275 files / 114450225 bytes. New settings/control/test files pass Prettier.
- PASS (live Chrome, local Django, final production bundle, A71EV2A / lb18145-1): initial 1/1 counts, removal to 0/0,
  combined loading from 1/19 downloaded and 0/19 rendered to 19/19 for both counters; a warm serial reload showed
  19/19 downloaded with 1/19 rendered before finishing at 19/19. Preset selection persisted across Apply/reopen;
  custom preparation/render/fallback values 3/1/25 applied; editing preparation to 7 then cancelling retained 3.
  Rotation and Designs open/close retained the scene and counts. The final tab was restored to Combined 6/2/100.
  No console errors/warnings were captured and no saved records were written. The full test runner was active during
  parts of this functional check, so these observations are not controlled throughput or responsiveness measurements.
- NOT RUN: full 930-ligand completion, cold/warm comparisons across every preset, live frame/FPS/peak-memory profiling,
  in-flight cancellation with settings changes, unlocked layout/resizing acceptance, save/restore/same-project snapshot
  transitions and a full RHS transfer/memory audit. Mocked lifecycle coverage does not establish live visual parity.

For clean comparisons, remove the displayed ligand group, choose a preset, then request the same group again. Compare
cold and warm coordinate caches separately and keep compilation/tests idle while measuring. Native store-driven draws,
camera interactions, representation quality and the final scene's GPU cost remain unchanged; this experiment does not
claim a single draw per frame across all Moorhen internals.

## Bulk ligand action stopwatch (2026-11-06)

The combined branch now displays a stopwatch immediately after the ligand strategy/settings button. It starts at
bulk LHS ligand request publication, includes the initial dispatch work, queued waiting, coordinates, native loading
and completion repaint, and retains the final elapsed value. Bulk removal starts a new measurement and waits for
ordered ligand disposal and queue acknowledgement, including loads which were already in progress. Counters may
already show 0/0 during that cleanup while the stopwatch continues running.

The visible label is Load or Remove, with Stopped and Failed outcomes for interrupted/failed work. A subsequent bulk
action resets the clock; late completions from the previous action cannot replace its result. Individual cancellation
of an active bulk ligand includes its ordered removal before timing can finish. Already displayed ligands complete
without additional rendering, and unstarted intents superseded by a snapshot are stopped. Ordinary single toggles,
RHS operations and snapshot hydration do not start a new stopwatch.

Timing uses `performance.now()` and a tab-local external store. It publishes only start/end notifications, with an
isolated 250 ms UI refresh while running and a final display precision of one tenth of a second. The final timestamp
is recorded at operation completion rather than at a UI refresh tick. Interval cleanup is covered under Strict Mode
and active unmount. Neither timing data nor its runtime promise/intent bookkeeping enter Redux, snapshots or API
payloads; record lookup is linear in the current queue size. Native buffers and their settings remain unchanged.

Validation:

- PASS: focused timing/UI, queue, viewer/boundary, transfer and snapshot checks, 12 suites / 157 tests. New coverage
  includes publication/queue time, final coalesced paint, delayed real buffer disposal after counters clear, partial
  cancellation, obsolete completion ownership, errors, already rendered overlaps, retained duration, formatting and
  interval cleanup. Snapshot-shape assertions exclude timer timestamps.
- PASS: targeted ESLint with only the five existing molecule-action unused-variable warnings; new files and changed
  hook/control files pass Prettier. Source changes retain existing formatting elsewhere and pass `git diff --check`.
- PASS: production build and backend stats validation (`main-cabe27f64820b748ee32.js`), with the two existing bundle-size
  warnings.
- PASS: full Jest suite, 77 suites / 605 tests; explicit Moorhen static verification, 275 files / 114,450,225 bytes.
- PASS: Chrome through Django on port 8080 with the production bundle above, A71EV2A first tag (19 observations).
  Initial single-ligand startup left Time idle. Bulk removal completed at 0.7 s; loading advanced from 1/19 downloaded,
  0/19 rendered with a running clock to 19/19 for both and a retained 20.4 s. Opening/closing strategy settings kept
  20.4 s unchanged. Removing the 19 ligands completed at 10.1 s; the next warm load reset the clock, showed 19/19
  downloaded before rendering finished, and retained 17.6 s after completion. Rotation and Designs open/close kept
  the scene, counts and final time. No console errors/warnings were captured. Build/test runners were idle during
  this check; these observations are functional checks, not controlled throughput measurements.
- NOT RUN: full 930-ligand benchmark, live cancellation/failure injection, narrow viewport/unlocked resizing,
  save/restore/same-project snapshot transitions and a full RHS transfer/memory audit. Automated cancellation,
  snapshot and transfer coverage does not establish live visual parity for these remaining flows.

## Native viewer experiment options (2026-11-06)

The combined branch adds three independent checkboxes in Bulk ligand loading, plus the preset
**Combined + native viewer experiments**. Existing presets and startup defaults keep all three new options off.

- **Defer native Models UI until first opened** takes effect immediately while that native panel has never been used
  in this viewer. It avoids constructing its hidden molecule cards and their subscriptions. After first opening, the
  panel stays mounted when closed so its control state and native initialization are retained. Start a fresh page to
  compare deferral again after using Models. Fragalysis Display controls and the canvas remain mounted throughout.
- **Skip redundant opaque buffer updates** applies to newly requested bulk LHS ligands. Unlabelled CBs buffers with
  opacity and all generated alpha values equal to 1 skip the second opacity upload and hide/show label-list updates.
  Buffers remain hidden through asynchronous atom preparation and are revealed before the awaited completion repaint.
  Translucent, labelled or other-style buffers retain the existing path; subsequent opacity edits and disposal still
  use native operations and readiness ordering.
- **Low-detail bulk ligands** uses smoothness 1 instead of 3 for new default bulk LHS ligand representations. Coordinates,
  chemistry, bond radius and atom-radius ratio remain unchanged. Explicit saved/custom representation definitions retain
  their appearance. This is a visual-quality experiment: compare the same group after removal and reload.

The UI option subscribes to tab-local settings; rendering options are captured with each original bulk intent and
passed to the adapter outside Redux. Single toggles, RHS work and cloned snapshot intents do not acquire these options.
No experimental flags or native handles enter snapshots; the ordinary representation parameters still describe the
actual rendered appearance, including the selected default bond smoothness.

Moorhen 0.22.7 exposes no Models component override. `webpack/moorhenModelsLoader.js` therefore wraps only its Models
component initializer in the generated JS at build time, using an AST match for its native Models modal. It checks the
installed package version and requires exactly one match, failing visibly on an incompatible upgrade. It does not
edit node_modules, upgrade dependencies, or change the matching workers/WASM/static assets. The wrapper subscribes to
the native modal state without remounting MoorhenContainer, the canvas or adapter.

Validation:

- PASS: focused checks, 7 suites / 148 tests, covering the native installed representation lifecycle, opaque upload
  reduction, delayed first-paint readiness, translucency and opacity edits, failed-load buffer cleanup, circular native
  references, per-request option capture, single-toggle exclusion, snapshot flag exclusion, live settings Apply/Cancel,
  native panel first-use retention and the version-pinned build transformation.
- PASS: targeted ESLint with no new findings. Five existing ngl dispatch-action unused-variable warnings remain;
  MoorhenViewerAdapter.test.js has the same 59 pre-existing lint findings as HEAD.
- PASS: production build and backend stats validation (`main-b312cb8a6fedcb92d892.js`), with the two existing bundle-size
  warnings; explicit Moorhen static verification, 275 files / 114,450,225 bytes.
- PASS: full Jest suite, 79 suites / 615 tests.
- PASS: Chrome through Django on port 8080 with the production bundle above, A71EV2A first tag (19 observations).
  All three new controls started off. Applying the new preset checked all three and removed the unopened native Models
  DOM (from 346 child elements to no Models element). Bulk load completed at 19/19 downloaded and rendered with
  visibly lower-detail ligands and no Models DOM. Opening Models created the native panel and its 2,308 child elements;
  collapsing, closing and reopening retained the collapsed control state. Cancelling a draft change retained the
  applied settings. Bulk removal cleared the ligand scene while retaining protein, and warm reload returned to 19/19.
  Rotation and Designs open/close retained the scene and final duration. No console errors/warnings were captured.
  Some semantic browser clicks exceeded automation deadlines; native input completed and verified those interactions.
- NOT RUN: controlled per-option 930-ligand benchmarks, live peak-memory/FPS profiling, cancellation/failure injection,
  narrow viewport/unlocked resizing, snapshot save/restore/same-project transitions or a full RHS transfer audit.
  The full test runner was active during initial live loading, and Models was used before the subsequent warm reload;
  the recorded durations are not a controlled comparison of these experiments.

## Suspended and virtualized Display controls (2026-11-06)

On `codex/lhs-ligand-combined`, the Fragalysis Display drawer retains its last open data view while closed.
Its Redux selector then returns a stable empty sentinel, so native load acknowledgements do not rebuild the hidden
structure tree. The mounted tree keeps expansion, selection, focus and scroll state; reopening reads current objects
and reconciles additions/removals. This is separate from the native Moorhen Models experiment and is always active.

The open drawer renders a flat, fixed-height window of object/representation rows with four rows of overscan, plus
its focused row and an active editor's anchor. Expansion and scroll anchors use stable object/representation identities,
so rows can leave the viewport without losing control state. Keyboard arrows, Home/End, Page Up/Down and typeahead
operate over the complete logical list. Long names retain their full title and accessible label.

Only the active representation editor mounts, outside the virtual rows. It receives its detached representation and
view identity directly rather than subscribing independently to the complete object map. The edited row stays mounted
outside the window to preserve its DOM anchor. Closing the drawer hides its editor/colour popup while retaining their
state; reopening restores them if the representation still exists. Removing the edited representation clears the
editor rather than reopening it with an obsolete anchor. Representation ordering copies the display array before
sorting; native handles remain inside the adapter. Viewer, scheduler, snapshot payload and disposal paths are unchanged.

Validation:

- PASS: full Jest suite: 80 suites / 623 tests, 309.246 seconds, including native adapter/boundary, queue, transfer and
  snapshot tests. Eight new Display regressions verify zero hidden-tree commits through 930 incoming updates, bounded
  mounted rows, full-list scrolling/keyboard navigation,
  retained expansion/selection/scroll anchor, updates/removals on reopen, editor anchor pinning, colour popup/Cancel
  state, correct row actions/protein protection and awaited native readiness with circular native references excluded
  from serialized representation state.
- PASS: targeted ESLint for Display controls and its new tests; the enclosing ViewerControls file retains its two
  existing unused-import warnings. Production build and backend stats validation (`main-4db0d4a40c36beb58004.js`),
  with the two existing size warnings. Moorhen static verification: 275 files / 114,450,225 bytes.
- PASS: Chrome through Django on port 8080 with the production bundle above, A71EV2A, all 736 poses / 930 observations.
  Expanded the initial protein and closed Display controls before bulk loading. Throughout the run its three retained
  rows stayed unchanged. All 927 successful coordinate requests were cached early; the same three native MOL-loading
  failures (`Cannot read properties of undefined (reading 'first')`) removed their intents, as in the preceding run.
  The final action timer reported Failed 17:46.6 with 927/927 downloaded and rendered, versus Failed 22:31.2 previously:
  4:44.6 less elapsed time (21.1%). Preparation=1000, native rendering=8, all three native experiments enabled,
  native Models never opened, and build/test runners idle during both measurement runs.
- The following native-completion intervals exclude downloading and the CPU profiling window. They show a useful
  improvement at larger scene sizes, with remaining growth and substantial run-to-run variation:

  | Completed ligands | Previous seconds | Suspended Display seconds |
  | --- | ---: | ---: |
  | 50–100 | 40.7 | 37.9 |
  | 250–300 | 48.4 | 48.2 |
  | 450–500 | 62.8 | 65.5 |
  | 600–650 | 94.7 | 56.8 |
  | 650–700 | 93.0 | 64.8 |
  | 750–800 | 120.8 | 79.4 |
  | 850–900 | 106.8 | 63.2 |

  This is a single before/after observation, not a guaranteed throughput improvement. The previous run included a
  36.9-second CPU profile near 500 ligands; the new run included 31.0 seconds near 518–566. Exclude 500–600 intervals
  from direct comparisons. The new profile still shows substantial React/DOM rendering and tooltip/control work;
  suspending Display controls does not remove all UI or native scene-size costs. No FPS or memory claim is made.
- PASS: reopening showed 929 logical objects (927 ligands and two proteins), with 37 mounted rows in a 1206-pixel
  viewport and the original protein expansion retained. Home/End reached both ends of the list, scrolling retained
  about 35–37 mounted rows, and the final ligand's editor worked. Changed opacity to 0.95 and restored 1; hid and
  restored visibility with asynchronous native acknowledgement. Closing/reopening retained expansion and exactly
  the same 36,034-pixel scroll offset. Removed the first ligand through Display, observed its removal and 926/926,
  then warmed it back to 927/927 through the navigator. Rotation and Designs open/close preserved the scene; a native
  canvas backend node remained identical across layout movement. No new application errors were observed in these
  control checks. Some semantic automation actions exceeded their deadline while rendering continued; subsequent
  DOM observations verified their completed effects rather than repeating them blindly.
- NOT RUN: authenticated snapshot save/restore and same-project switching, a full RHS transfer/memory audit,
  narrow viewport/unlocked panel resizing or live failure/cancellation injection. Their automated coverage does not
  establish visual parity. These tests used an anonymous local target and did not create or modify saved snapshots.

## Pose-row isolation and membership indexes (2026-11-11)

Experiment: `codex/lhs-ligand-row-isolation`, implementation `52eb4e7d`, based on `codex/lhs-ligand-combined` at
`821a0c16`. The comparison branch remains unchanged.

Pose rows and detail controls subscribe to their own selected observation subsets instead of eight complete lists.
Unrelated completions retain the selector result identity. Same-pose observation additions/removals still update it,
so removal callbacks use the current subset even when the row's displayed boolean stays true. Observation order and
dialog ownership are preserved. Private WeakMap indexes are shared by row selectors, wrapper membership filters and
the existing any-observation selector. They preserve existing strict IDs, primitive versus density/selected-record
matching, and the any-observation rule's artefact/quality exclusions. The column-width callback stays stable so
unchanged row props retain memoization. These caches do not enter Redux or snapshots. Native rendering, scheduling,
fetching, viewer lifecycle and representation settings are unchanged by this experiment.

Validation:

- PASS: full Jest suite, 83 suites / 632 tests, 182.973 seconds, including native adapter/boundary, queue, transfer and
  snapshot tests. Nine new regressions use real reducers, rows/detail controls and the wrapper. Through 930 unrelated
  acknowledgements, unaffected mounted rows produce zero React commits; for 930 row selectors, each acknowledgement
  changes exactly one result. Coverage includes strict numeric/string IDs, density records, same-pose subset changes
  and removal callbacks, cloned snapshot lists, replacement observation references, stable wrapper row props and
  dialog ownership.
- PASS: targeted ESLint with no new findings; the existing missing `ref` dependency warning in observationUnifiedView.js
  remains. `git diff --check` passes.
- PASS: production build and backend stats validator, `main-251a0e1000d6598307a9.js`, with the two existing size warnings.
  Explicit static verification after the final build: 275 Moorhen assets / 114,450,225 bytes.
- PASS: paired Chrome benchmark through Django on port 8080, A71EV2A / lb18145-1, 736 poses / 930 observations.
  Baseline: `821a0c16`, bundle `main-4db0d4a40c36beb58004.js`. Experiment: `52eb4e7d`, bundle
  `main-251a0e1000d6598307a9.js`. Each used a fresh tab, 2560 x 1313 viewport, Show all hits and 77 mounted table rows.
  Display controls stayed unopened (zero tree rows), native Models was never opened, build/test runners were idle,
  and no CPU profiler ran during either measurement.
- Both timed loads used pipeline mode, preparation=1000, native rendering=8, batched requests, coalesced completion
  repaint with 100 ms fallback, deferred Models, reduced opaque native updates and low-detail bonds. Before each
  timing, preparation=1000 / rendering=1 warmed all 930 coordinates. Warmup was cancelled and all ligand intents
  removed; zero counters and a completed removal timer were observed before setting rendering=8 and starting the
  timed load. Initial proteins were retained in both runs.

  | Measure | Combined baseline | Pose-row isolation |
  | --- | ---: | ---: |
  | Full-load action timer | 18:35.8 | 16:24.6 |
  | Time to 500 native completions, from pre-confirmation capture | 550.0 s | 461.8 s |
  | Native load entries | 930 | 930 |
  | Successful native completions | 927 | 927 |
  | Failed ligand loads | 3 | 3 |

  The action timer improved by 131.2 seconds (11.8% less elapsed time). Both final counters were 927/927 and both
  timers reported Failed because of the same three native MOL-loading errors
  (`Cannot read properties of undefined (reading 'first')`, two console errors per failed load).

  | Completed ligands | Baseline seconds for another 50 | Isolation seconds for another 50 |
  | --- | ---: | ---: |
  | 50 to 100 | 47.0 | 46.3 |
  | 100 to 150 | 38.0 | 41.8 |
  | 150 to 200 | 52.5 | 41.1 |
  | 200 to 250 | 48.4 | 48.8 |
  | 250 to 300 | 56.7 | 48.2 |
  | 300 to 350 | 55.2 | 35.2 |
  | 350 to 400 | 48.2 | 38.4 |
  | 400 to 450 | 62.8 | 51.6 |
  | 450 to 500 | 75.9 | 44.1 |
  | 500 to 550 | 63.5 | 55.4 |
  | 550 to 600 | 61.0 | 52.0 |
  | 600 to 650 | 58.9 | 61.3 |
  | 650 to 700 | 67.1 | 60.3 |
  | 700 to 750 | 70.7 | 68.4 |
  | 750 to 800 | 67.1 | 68.6 |
  | 800 to 850 | 69.2 | 70.6 |
  | 850 to 900 | 73.0 | 61.0 |

  Intervals use native completion timestamps independently of counter polling. Debugger buffers overflowed in both
  runs; console history was replayed and deduplicated by original timestamp and message. Final completion labels are
  contiguous: 17 through 943 in baseline, 19 through 945 in the experiment (927 each), with 930 distinct load entries
  each. There are no missing completion samples in the table. Experimental network events include monomer-dictionary
  fallbacks and periodic status/quality polling, with no coordinate fetches. Baseline captured no Network events;
  that does not establish zero total requests, so total request counts are not compared. Both UI coordinate-cache
  warmups were verified. Raw captures/screenshots were retained locally as row-isolation-baseline.json/.png and
  row-isolation-experiment.json/.png.

  This is one paired observation, not a repeated statistical benchmark or an FPS/memory measurement. The result
  supports row isolation as a useful UI-overhead reduction, but several later intervals are effectively unchanged
  or slower, and the dense scene remains expensive.
- PASS: live checks on the completed scene. The x0395a/x0395b two-observation dialog stayed open through partial
  removal (927 to 926), then row removal of its remaining observation (925), with correct control colours. Reloaded
  the first observation, independently added the second and used the row action to remove both (927 to 925), checking
  that its callback used the latest subset. Both were restored to 927/927 through the dialog. A protein control
  acknowledged a native load and changed colour, then returned to its off colour after removal; its temporary Display
  object was absent afterwards. Rotation changed the visible scene. Designs open/close preserved all six canvas
  backend-node identities and loaded counts. Display controls mounted 35 tree rows; initial protein expansion survived
  closing/reopening. No additional application errors were captured. Some semantic automation actions exceeded their
  deadline; fresh DOM observations confirmed completed effects before retrying.
- NOT RUN: authenticated snapshot save/restore or same-project transitions, full RHS transfer/memory audit, unlocked
  resizing/narrow viewport, live failure injection, FPS or peak-memory measurement. Automated coverage does not
  substitute for those visual checks. No saved snapshots were created or modified. Benchmark tabs were closed
  afterwards to release the native scenes.
