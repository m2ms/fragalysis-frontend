# Moorhen repaint, picking and worker batching experiments

Date: 2026-11-12. Branch: `codex/moorhen-rendering-experiments-2-4`.
Baseline: `codex/moorhen-skip-redundant-label-updates` at `31ec3f8a`.

## Controls

The bulk ligand settings dialog has three new independent checkboxes. They default to off; the
**Combined + native viewer experiments** preset enables them together with the earlier native experiments.
Settings remain tab-local and are excluded from snapshots and API payloads.

| Control | Applies | Implementation |
| --- | --- | --- |
| Coalesce native scene repaints | Immediately | Native store repaint requests share one animation frame, with the existing configurable fallback delay. |
| Accelerate atom picking and sample hover per frame | Immediately | Conservative buffer rejection, a lazy per-buffer atom index, and one latest hover sample per frame. |
| Batch bulk ligand Coot commands | New bulk LHS ligand loads | Compatible colour and bond-mesh commands share an existing Coot worker message, up to eight commands. |

To compare a single experiment, keep other settings fixed and change just its checkbox. Remove and reload the
same ligand group when comparing command batching. Applying repaint/picking changes keeps the viewer mounted.
Restart an existing development server after changing branches because the native build-loader configuration changed.

## Repaint scheduling

`nativeSceneDrawScheduler.js` wraps native `drawScene` requests through the adapter's existing scene-settings guard.
Repeated store requests share one pending frame. When a ligand completion frame is already scheduled, native
requests join that frame rather than creating a second one. Readiness is acknowledged only after the real draw.

Adapter camera changes, native dragging/animation, render-to-texture work, image capture and synchronous picking
force a current frame. Task counts include a pending native repaint. Teardown cancels scheduled work and restores
the native methods. This reduces redundant frame frequency; it does not combine geometry or reduce the number of
draw calls required to render the final scene.

## Picking

`nativePicking.js` first rejects buffers whose conservative bounds cannot intersect the native picking ray. For
remaining buffers it builds a binary spatial index over primitive atom indices. Candidate indices are returned
in native order, preserving nearest-hit ties. Native distance, clipping, visibility, atom identity and symmetry
tests still make the final decision. Symmetry atom traversal itself remains native.

Bounds include symmetry positions. The GPU buffer builder invalidates caches before clearing dirty flags;
replacement atom/symmetry arrays and changed group lengths are also detected. Unsupported transforms, nonfinite
coordinates and degenerate rays fall back to native traversal. The caches use WeakMaps, and no native molecule,
representation or buffer graph is cloned or added to application Redux. Building the index has a first-pick cost
and uses additional JavaScript memory until its buffer becomes collectible.

Hover retains only the latest pointer coordinates until the next frame, with a 100 ms fallback. Mouse down and
canvas leave cancel stale samples. Click picking remains synchronous and flushes pending scene publication first.

`webpack/moorhenPickingLoader.js` patches the installed JavaScript at build time. It checks the package version
(`0.22.7`) and exactly one native atom loop and dirty-buffer builder, failing for an unexpected source shape.
Production and development register the new picking bridge. The baseline's earlier Models and buffer-publication
bridges remain production-only; this branch does not change that existing configuration difference.

## Worker transport

`nativeCommandBatcher.js` uses Moorhen's existing `coot_command_list` protocol and the same shared worker/WASM runtime.
It batches only allowlisted colour and bond-mesh commands for molecules currently undergoing an opted-in initial
bulk load. Coordinate loading, deletion, unrelated commands and transfer-bearing messages flush queued work first.
Commands flush at eight items or the next timer turn; a singleton keeps its native message format.

The native command centre still creates each command, ID, journal entry, active-message notification and callback.
Batch replies are validated and delivered individually to its original handler. Input command envelopes are
snapshotted at submission to retain postMessage semantics; returned mesh payloads are not cloned. Native failures,
malformed replies, send failures and worker termination poison the affected load scope, which rejects readiness and
disposes unpublished geometry. Shared-worker leases avoid multiple adapter transport wrappers; teardown drains replies
before restoring the transport.

Batching reduces transport envelopes, not the amount of Coot work. Grouped replies can increase temporary payload
size. This experiment does not raise the package's 8 GiB WebAssembly memory maximum or establish that loading all
930 ligands will fit within it.

## Validation

- Full unit suite passed: 90 suites, 691 tests (`yarn test:ci`).
- Production build passed: `main-b9f48afae5ab39a26cd7.js`; backend webpack-stats validation passed. The two existing
  bundle-size warnings remain.
- Moorhen static integrity passed: 275 assets, 114,450,225 bytes. Installed worker/WASM/monomer assets are unchanged.
- Targeted ESLint passed for all eight new implementation/test files and the modified implementation files. The
  existing `MoorhenViewerAdapter.test.js` retains 59 pre-existing lint errors (also reproduced from the baseline);
  the added tests introduce none.
- Automated tests cover scheduler cancellation/errors, native camera/capture and completion readiness, host settings
  subscriptions, pipeline forwarding and snapshot exclusion, native picking equivalence, dirty edits, symmetry,
  circular native ownership, real command-centre callbacks/activity/journaling, batching barriers, per-model errors,
  malformed replies, worker failure/termination and shared-worker disposal.
- Synthetic operation-count checks: 930 repaint requests share one frame; 100 hover events produce one latest sample;
  a dispersed 930-buffer scene retains one candidate buffer; a 20,000-atom protein pick performs fewer than 20 native
  distance tests while matching the original hit and atom index. These are operation counts, not browser speedups.

### Production browser checks

The production bundle ran through Django on port 8080 in a fresh in-app browser page, A71EV2A / lb18145-1,
initial tag: 13 poses / 19 observations. Preparation=1000, rendering=8, native experiments enabled.

- Bulk load completed at downloaded 19/19 and rendered 19/19. Transport observation captured 10 actual
  `coot_command_list` messages containing 54 commands in total, with no batch larger than eight.
- Disabling only command batching, removing and reloading the group completed again at 19/19 with zero new
  command-list messages. The transport wrapper remained installed but stopped batching unscoped work.
- Apply/Cancel retained the correct checkbox states. Repaint and picking could be disabled and re-enabled without
  remounting or losing rendered objects.
- Rotation visibly changed the scene; hover and synchronous atom picking displayed native atom labels. Individual
  LHS and RHS ligand removal/reload completed; display representation controls opened and expanded successfully.
- Designs opening/closing and canvas resizing retained all six existing native canvas DOM nodes and Moorhen ready state.
- No errors appeared in the retained CDP event capture. Its bounded event buffer truncated earlier events, so this
  is not a complete console audit.

The small browser runs were functional checks while the automated suite was running. Their action timers are not
a controlled performance comparison. No new paired 930-ligand benchmark, prolonged memory/FPS measurement, full RHS
transfer matrix, snapshot save/restore or smooth same-project snapshot transition was performed in this task.
Snapshot and lifecycle contracts are covered by the automated suite, with those broader live workflows still unverified.
