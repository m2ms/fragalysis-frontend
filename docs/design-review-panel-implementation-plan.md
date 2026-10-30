# Design review panel: staged implementation plan

Date: 2026-10-29

Status: checkpoints 1-9 and additional checkpoints 6a and 7a implemented and automated checks passed; live checks passed on the available five-card fixture, with anonymous-session, shared-inspiration, and large-list live acceptance still pending; checkpoints 10-12 have not started.

Initial scope: RHS enabled; shared components and contracts support a future LHS implementation.

This document records the latest decisions from the specification discussion. It supersedes the earlier proposals
to grade personal peer reviews, filter by a user's review with a fallback, or allow only one active header colour.
Only checkpoints 1-9 and additional checkpoints 6a and 7a have subsequently been authorized and implemented.

## Agreed behaviour

- A floating **Review** button sits at the bottom-right of the visible RHS design navigator, over the molecule image
  area while rows scroll beneath it. It stays visible and greyed out when the effective review list is empty.
- Review opens a full-width bottom panel beneath both navigators and the viewer. The panel reduces the height of the
  area above it, has a draggable height divider, and closes through Review or its own close button. An open empty panel
  remains closable through its header. Closing preserves the scene, filters, and panel height.
- One review panel can be open at a time. Its owner is a side, not a hard-coded RHS boolean. A future LHS Review action
  will replace the RHS panel, and vice versa. No LHS Review button is enabled in this implementation.
- Cards wrap left-to-right into vertically scrolling rows. Each RHS observation has its own card and observation label
  matching the navigator, including separate observations within a pose. Membership in several tags/datasets must not
  duplicate the same observation. Use the existing molecule picture as the placeholder for the future viewer picture.
- The complete filtered/sorted result is available to the panel, independent of how many navigator rows have loaded.
  Images/cards load lazily. An empty result, unavailable image, and data still loading have distinct usable states.
- RHS tags, search, column/structure filters, sorting, selection-dependent rules, and relevant navigator actions affect
  the panel. Panel actions affect the same underlying state and results. Existing bulk-selection checkboxes remain in
  the navigator; cards have no bulk-selection checkbox and image clicks do not change checkbox selection.
- Any RHS observation actually displayed in Moorhen stays in the panel, whether displayed as ligand, protein, complex,
  surface, density, or another supported representation. An observation matching the normal filters stays in its
  natural sorted position. A displayed observation that would fail those filters appears once in a leading block.
  Use the same natural comparator within that block for stable ordering. LHS inspirations do not acquire RHS cards.
  The explicit **Hide all inactive** view below is the user-requested ligand-only exception to this general rule.
- Clicking an image adds that design's ligand and the inspiration ligands resolved by the existing design navigator's
  inspiration rules. Multiple designs can be on together. The camera does not recenter or rotate.
- A thick theme-blue image border means the design ligand is displayed. It remains blue if some inspiration ligands
  are missing. Clicking a partially displayed group completes it; clicking a complete group releases it.
- Each card has the navigator's target icon below the image at the left of its observation label, with the tooltip
  **Center on**. It is enabled when that observation's ligand is visibly loaded and its image toggle is idle. Clicking
  it explicitly centers/fits the ligand with the same action as the design navigator; image clicks retain their
  camera-preserving behaviour. Centering does not toggle the ligand, change other structures, or alter bulk selection.
- Shared inspiration ligands stay displayed while another active group needs them. Independently displayed inspiration
  ligands stay displayed when a review group is released. Other representations are not removed by an image toggle.
- Green/yellow/red shortcuts save the observation's **main status** immediately, without asking for a comment.
  Clicking its current main status is a no-op. Reuse the existing summary circle, its main-status centre, peer-review
  distribution, and hover/click details.
- Header buttons filter by **main status**: green, yellow, red, and ungraded. Several may be active together (OR).
  No active colours means no new grade restriction. Missing main status and `NONE` count as ungraded.
  Peer reviews do not supply a fallback for this filter.
- This new main-status restriction applies to both the review result and RHS navigator. It combines with other filters.
  Existing advanced main-status/peer-review filter options and their internal matching rules remain available.
- **Show all** clears RHS searches and active filters, including new grade filters, selects all RHS tags, and includes
  every RHS dataset and untagged RHS observation. It preserves sort order, actual bulk-checkbox selections, and the
  scene. It must not reset LHS filters or selections. Dataset/tag changes do not reset the panel. It also exits the
  Hide all inactive view.
- **Hide all inactive** sits immediately to the right of Show all. It unselects every RHS tag, turns off RHS display-all
  and untagged-only modes, and leaves only observations whose design ligand (L display) is acknowledged visible in the
  main viewer. Protein, complex, surface, density, or other representations alone do not count as an active design
  ligand for this action. Both Review and the RHS navigator follow actual ligand visibility across datasets; pending
  loads and bulk-checkbox selection alone do not qualify. Existing searches/filters, sorting, checked observations,
  loaded structures, camera, and LHS state remain unchanged. Active ligands stay in the lists even if those preserved
  predicates would exclude them. Selecting tags, using the RHS display-all/untagged controls, or clicking Show all
  restores normal filtering and the broader displayed-observation retention rule. An empty open panel retains both
  list actions and its close button.
- The bottom-right **Push to DesignDB** button opens a dialog containing **WARNING!**, adjacent **Coming soon** text,
  and the mockup's message: "Are you sure you want to push the most recent Design status to DesignDB? This step cannot
  be reverted!" Keep **YES** disabled. **NO** closes the dialog. No DesignDB request is sent.
- Logged-out users can browse, toggle ligands, inspect summaries, and filter. Grading shortcuts and Push to DesignDB
  are visible but disabled, with a login explanation. Preserve the application's existing Django authentication rules.
- Panel visibility, height, and grade filters survive closing/reopening and snapshot save/restore. Do not add browser
  storage persistence: a normal target reload starts with defaults; loading a saved snapshot restores that snapshot's
  settings, including through a snapshot URL. Changing target resets the review UI and its transient work.

## Current-code findings and implementation boundaries

These findings inform the sequence; existing audit documents are historical context, not proof of current runtime
behaviour.

| Area | Current implementation and planned boundary |
| --- | --- |
| Layout | `js/components/preview/Preview.js` owns the single viewer `InPortal` and both layout modes. Add a shared bottom dock around the upper layout without moving viewer ownership. `useUpdateGridLayout.js` must measure the remaining upper area. Reuse `resizer.js` and the existing Moorhen resize path. |
| RHS observations | `poseListRHS.js` already splits poses by observation but also intersects the result with `datasets[0]`. Establish the requested all-RHS observation universe through the RHS data adapter; preserve legacy/synthetic pose support and observation-to-dataset identity for viewer actions. |
| Filters and sorting | Tag/search/top-level rules are in the pose-list pipeline. `ObservationUnifiedViewWrapper` applies `useFilters` after pagination and also evaluates the full navigation list. Filter widgets have local state plus legacy Redux values. Provide one controlled side-scoped model and pure full-result projection; avoid effect-driven copies of result arrays. |
| Displayed observations | Existing helpers primarily inspect `selectionReducers`; dataset rendering also has separate queues/lists. Some bypasses depend on the existing Show displayed option, and later sorting can reorder prepended items. Implement the panel's explicit retention/leading-block rule after all normal predicates instead of assuming those helpers already meet it. Preserve unrelated LHS and existing navigator option behaviour. |
| Images | `generateAndStoreMolImage` generates RDKit SVGs and uses `previewReducers.molecule.imageCache`. Reuse this path without creating Moorhen instances. Account for cache reuse, image sizing, substructure highlighting, and RDKit resource disposal. |
| Viewer actions | Existing ligand actions, adapter operations, and `useStructureOperationQueue` own async rendering/removal. Reuse them with centering disabled. Preserve thin RHS bonds and representation settings. No direct native Moorhen rendering calls outside the existing boundary. |
| Grading | `QualityStatusWrapper` and its API actions already distinguish `main_status: true` from personal reviews. Reuse the main-status endpoint/payload. The current API helper catches failures and returns an empty array; the new shortcut must validate a successful record before acknowledging a save, without globally changing unrelated callers. |
| Snapshots | Read `dispatchActions.js`, `utilitySnapshotShapes.js`, their tests, and full-state hydration together. Add optional serializable review settings inside an existing UI slice, with defaults for old snapshots. Preserve in-place switching, caches, queue tombstones, camera ownership, and dialog suppression. |

Proposed shared UI lives under `js/components/preview/review/`: a dock/panel, grid/card components, and a side-neutral
controller contract. RHS supplies observations, labels, image input, filter/search adapters, visibility operations,
inspiration resolution, authentication, and main-status actions. Names can be adjusted to repository conventions.
Keep shared components independent of RHS dataset/tag field names. Test the other-side contract with an injected fixture
without enabling LHS UI.

Store configuration and minimal serializable review intent, not fetched observation lists, result arrays, images,
native objects, promises, or renderer references. Derive results with stable selectors. Runtime requests and caches
stay outside saved settings. Any ownership information needed after snapshot restore must contain only IDs/flags;
existing queue and API payload shapes remain intact.

## Working and verification rules

- Implement the requested checkpoint as a complete runnable increment. Controls for later checkpoints need not appear
  until their behaviour is implemented. Avoid bundling unrelated cleanup into any checkpoint.
- Before each checkpoint, read the affected current implementation and nearest tests. Recheck this plan if the code
  or requirements changed. Keep completed work and remaining work accurately recorded.
- Use the Django-backed app, normally port 8080 with frontend bundles/HMR on 3030. The Moorhen proof route does not
  validate these workflows. Use Node 24.18.x and Corepack/Yarn 4.17.1; no dependency change is planned.
- For every implementation checkpoint, run the smallest relevant tests and verify compilation with `yarn build`;
  follow a build with `yarn verify:moorhen-assets`. Record existing warnings separately. Expand Jest coverage when
  shared filtering, viewer lifecycle, or snapshots are touched. A docs-only planning change needs no application build.
- New tests should exercise behaviour and failure/resource boundaries. Layout retention, lazy work, shared filters,
  async ownership, and snapshot compatibility merit focused coverage; avoid tests that merely repeat JSX structure.
- Never claim browser acceptance from mocked tests. Record manual results as PASS, FAIL, or NOT RUN with the reason.
  The user checklists below are future checks, not checks executed while writing this plan.
- Viewer tests must model delayed fetches, repeated/same-name loads, redraw-before-delete, disposed resources, and circular
  native references where applicable. Keep existing viewer boundary, queue, transfer, and snapshot coverage relevant
  to each change. Reload before retesting code that could have left native resources behind.
- Do not run the remote/default full Cypress suite. Cypress requires an explicitly confirmed non-production base URL
  and appropriate credentials. Manual grading and snapshot checks below use a disposable target/project on a test stack.
- If a checkpoint requires changing an AGENTS.md preservation contract, document the evidence and exact trade-off and
  obtain the required behaviour-specific permission before changing it. This plan does not waive those contracts.

## Checkpoints

See the progress table for completed work. Each checkpoint depends on the preceding checkpoint. The checks normally
take a few clicks; richer fixtures are listed where a feature needs particular data.

### 1. Open, close, and resize the shared bottom panel

**Deliverable:** RHS floating Review button; full-width panel shell with a close button and horizontal resizer. The
upper workspace shrinks, and the existing viewer/camera/loaded objects survive opening, closing, resizing, and layout
changes. Remember height during the session. Use side ownership so a future opposite-side open replaces this panel.
Show a loading/empty shell until cards arrive in checkpoint 2; derive button availability from RHS data initially.

**Quick user check:**

1. Open a target with RHS designs, rotate the viewer, and click Review. A bottom panel spans all three columns.
2. Drag its top divider. The upper workspace and canvas resize together without losing the scene or changing camera.
3. Close with the panel's X, reopen, then close with Review. Reopen: its height is retained.
4. With Review open, switch Default to Draggable and back. The panel, its height, and the scene survive. The panel X
   remains usable in either layout. Reopen through Review after returning to Default; legacy non-default layouts have
   an existing empty RHS placeholder rather than a design navigator/Review button.
5. In Default, search RHS for a nonexistent observation. After the search debounce, Review is greyed out. An open panel
   still closes with X. Clear the search and reopen; scrolling the RHS rows leaves Review fixed above them.
6. Drag Review's divider all the way up, then close with X. The LHS navigator must fill the recovered height without
   a blank area beneath its footer. Repeat once; reopening Review retains its height.

**Developer checks:** dock state/side replacement and height bounds; real reverse-portal host retention/resize tests;
existing `resizer.test.js`, `MoorhenView.test.js`, adapter resize, and viewer-boundary coverage as applicable.

**Checkpoint 1 implementation and validation (2026-10-28):**

- Added the side-neutral `ReviewWorkspace`, `ReviewPanel`, `ReviewButton`, and review context under
  `js/components/preview/review/`. RHS supplies its shell content and an optional navigator overlay action. LHS has no
  enabled Review action. Open side and requested height currently live in local session state; snapshot work remains 12.
- Kept the existing `InPortal`/viewer owner intact. The upper grid measures its reduced available area. Its existing
  60-row minimum is relaxed only while Review is open, through an optional layout-sizing argument, so a short upper
  area does not clip the viewer. Closed-panel sizing retains the original default. Existing layout/RHS placeholders
  were preserved; the click-through checklist above now describes their actual capabilities.
- PASS: initial focused run, 7 suites / 50 tests (workspace, all layout modes, divider dragging, actual Moorhen host with
  mocked native runtime and reverse portals, viewer boundary, React compatibility, and UI compatibility).
- PASS: full `yarn test:ci` run, 69 suites / 516 tests. After that run was launched, an additional upper-grid integration
  test was added; the final focused rerun passed 3 suites / 8 tests, covering that test and the final workspace fixtures.
  Initial test-fixture issues were corrected without changing production behaviour or weakening assertions.
- PASS: `yarn build`, including backend Webpack stats validation (two existing bundle-size warnings).
- PASS: `yarn verify:moorhen-assets`, 275 assets / 114450225 bytes.
- PASS: targeted ESLint, zero errors. The nine warnings in existing Preview/pose-list code were reproduced against HEAD.
- PASS: live Chrome on the Django-backed A71EV2A target at `127.0.0.1:8080`: open full-width shell; rotate the live scene;
  drag height from 240 to 447 pixels; scroll RHS while Review stays fixed; close/reopen with both X and Review and retain
  447 pixels; Default -> Draggable -> Default retains the panel and scene; no-match search greys out Review after the
  existing search debounce, and X still closes it. The original search and Default layout were restored.
- PASS: live large-panel check leaves the canvas inside a short upper workspace. Restored the panel to 447 pixels.
- The shell is intentionally empty when designs exist: observation cards begin in checkpoint 2. No structure-rendering
  actions, grading, data filters, snapshot payloads, dependencies, or backend endpoints were added in checkpoint 1.
- Saved local proof screenshot to ignored `bundles/review-step1.jpg`; build/unit logs are in ignored
  `bundles/review-step1-build.log` and `bundles/review-step1-tests.log`. User acceptance remains separate from agent checks.

**Checkpoint 1 follow-up: navigator height recovery (2026-10-28):**

- Fixed the reported blank area after maximizing and closing Review. The layout scaled the stored height of a collapsed
  panel while rendering its header at a fixed 25 pixels. This left approximately 147 pixels unallocated in the reported
  LHS layout. The original large-panel check covered the canvas but missed side-column height recovery.
- Both side columns now reserve fixed collapsed-header heights before distributing remaining space among variable
  panels. Resize and collapse/expand paths share this calculation. Existing drag behaviour, remembered variable heights,
  minimum heights, viewer ownership, and snapshot/API contracts are preserved.
- PASS: three integration regressions cover repeated minimum/full-height cycles, a collapsed RHS navigator, user-set
  variable proportions, tag-panel collapse/restore, and retention of the same reverse-portal canvas.
- PASS: full `yarn test:ci`, 74 suites / 529 tests; `yarn build` with backend stats validation (two existing bundle-size
  warnings); `yarn verify:moorhen-assets`, 275 assets / 114450225 bytes; targeted ESLint, formatting, and diff checks.
- PASS: live Chrome on the Django-backed A71EV2A target: drag Review fully up to its maximum height, close with X, reopen
  at the remembered maximum, and close again. Both navigators fill the recovered height (less than 0.04 pixels of
  rounding), the scene remains visible, and one viewer remains mounted. No manual snapshot save/restore was repeated
  for this geometry fix; snapshot regression tests passed in the full suite.
- Proof screenshot: ignored `bundles/review-height-fix.jpg`; logs: ignored `bundles/review-height-fix-build.log` and
  `bundles/review-height-fix-tests.log`. Checkpoints 3-12 remain unstarted; user acceptance of this fix is pending.

### 2. Observation cards from every RHS dataset

**Deliverable:** reusable cards with the existing molecule picture and navigator observation label. Build the RHS
observation adapter from all applicable datasets/tags, including untagged observations and legacy/synthetic poses.
Deduplicate observations across memberships. Preserve dataset context for later operations. At this checkpoint the
grid can use bounded incremental pages; complete lazy windowing follows in checkpoint 3. Image clicks remain inactive.
Mirror existing tag/search/top-level sorting inputs through the shared data contract; column filtering follows in 4.

**Quick user check:**

1. On a target with more than one RHS dataset/tag group, select tags covering two groups and open Review. Find cards
   from both groups.
2. Find a design with multiple observations: each observation has a separate card and the expected label/image.
3. Select different RHS tags or change the navigator search: corresponding cards update. Check a missing-image case
   shows a stable placeholder rather than breaking the grid.
4. Change the RHS toolbar sorting and ASC control: cards follow the same order as the navigator. Equal sort keys can
   leave the order unchanged. Clicking a card image currently does nothing and does not select its bulk checkbox.
5. The original checkpoint 2 used Show more observations after the first 30 cards. Checkpoint 3 replaces it with automatic
   viewport loading; scroll Review to reach observations beyond the navigator's loaded page.

**Developer checks:** pure adapter fixtures for multiple datasets, overlapping tags, untagged observations, multi-observation
poses, orphan/synthetic poses, duplicate IDs, and missing image input. Check LHS population/initialization stays unchanged.

**Checkpoint 2 implementation and validation (2026-10-28):**

- Added shared `ReviewGrid`, `ReviewCard`, and `MoleculeReviewImage` components. The RHS adapter supplies observation
  identity, label, image input, pose context, and all dataset memberships. The first page contains at most 30 cards;
  Show more observations reveals another page. Images remain inactive, with no card bulk checkbox or viewer action.
- Added a memoized, pure RHS observation universe spanning every dataset, RHS tag-only observations, untagged dataset
  observations, and existing RHS poses. Removed the first-dataset intersection from the navigator. LHS selector inputs
  are unchanged. Preserve existing split-pose IDs, parent IDs, detached observation copies, synthetic `rhs-tag-*` poses,
  and fallback loading. Additional local rows use stable observation-derived IDs without changing API payloads.
- Shared the existing RHS search rules and pose-to-observation projection. Added optional controlled toolbar ordering
  to the abstract pose list, with per-side session settings supplied by the review context; unconfigured/LHS callers
  retain their local ordering. Full column-filter synchronization and unconditional displayed-item retention remain
  checkpoints 4 and 5. No derived result arrays are copied into Redux or effect-driven state.
- Reused existing RDKit SVG generation and the molecule image cache. A fallback replaces unavailable images; stale
  image completions cannot update an unmounted card. Added `finally` disposal for RDKit molecule/query handles when
  highlighting or SVG generation fails. Moorhen rendering and native viewer ownership are unchanged.
- Live data exposed a distinction absent from the original fixtures: an observation's `code` can contain the upload
  name, while its short design ID is `virtual_name`. Card labels now prefer that short ID, matching the navigator's
  default RHS identifier; the fixture covers `v91d` with an upload-name code.
- PASS: focused final data/card/image/workspace/initialization tests, 5 suites / 26 tests. Cases cover multiple datasets,
  overlapping memberships, raw/object IDs, tag-only/untagged observations, multi-observation and orphan/synthetic poses,
  stable selectors/keys, LHS selection, search scopes, natural ordering, cache reuse, inactive image clicks, bounded pages,
  unavailable images, and RDKit failure disposal.
- PASS: full `yarn test:ci`, 73 suites / 526 tests. Final label/copy adjustments were covered by the focused rerun above.
- PASS: final `yarn build`, including backend stats validation (two existing bundle-size warnings), and
  `yarn verify:moorhen-assets` (275 assets / 114450225 bytes).
- PASS: targeted ESLint with zero errors and seven reproduced pre-existing warnings in the affected older source;
  Prettier checks for new modules and the shared review directory; `git diff --check`.
- PASS: live Chrome on the Django-backed A71EV2A target: five correctly labelled molecule cards (`v1a`-`v5a`), fully
  visible at the default panel height; search `v3a` produces the corresponding navigator row/card; clearing the search
  restores all cards; toggling the RHS tag produces the empty message and restores cards when reselected. Toolbar
  Compound code/ASC changes keep card/navigator order consistent; the live target has equal sort keys, so distinct-key
  reordering is verified by fixtures. Clicking a molecule picture leaves selections unchanged and retains one viewer.
  The original blank search, selected tag, Pose name sorting, and ASC setting were restored.
- Live fixture limits: the current target exposes one RHS dataset/tag; multiple-dataset membership, orphan/missing-image,
  and large-page cases were verified in automated fixtures rather than claimed as live browser coverage.
- Local proof/logs: ignored `bundles/review-step2.jpg`, `bundles/review-step2-build.log`, and
  `bundles/review-step2-tests.log`. No later checkpoint is implemented by this completion.

### 3. Responsive lazy thumbnail loading

**Deliverable:** rows wrap to available width; panel scrolling progressively makes the full result accessible without
loading the navigator's next page. Generate images only near the visible range. Bound mounted card/image work for
large lists, reuse cached SVGs, and ignore stale image completions after filtering/closing/target changes. Keep the
panel header and footer actions accessible while the cards scroll.

**Quick user check:**

1. Open Review on a large RHS list and scroll down. More observations appear without clicking Load next in the navigator.
2. Scroll back up: earlier images remain correct. Drag the panel height and resize the window: cards reflow left-to-right.
3. Scroll down, then change the search to a small result. The list stays usable without blank gaps or mismatched images.

**Developer checks:** mocked intersection/resize visibility and image-generation call counts; offscreen work stays deferred;
stable observation keys, cache sizing, invalid molecule fallback, RDKit disposal, stale completion, and bounded mounting.
Preserve logical result order independently of the mounted window.

**Checkpoint 3 implementation and validation (2026-10-29):**

- Replaced incremental pages/Show more with a shared responsive virtual grid. The complete logical result determines
  the scroll range; only visible rows and one neighbouring row above/below are mounted. Available width determines the
  number of 200-pixel cards, including a usable single column below that width. Fixed row geometry and two-line labels
  keep scroll positioning stable; full labels remain available through the accessible name and hover title.
- The grid owns its scroll viewport inside the panel body, leaving the header and close action outside it. Future
  footer actions can remain outside the same viewport. No footer controls from later checkpoints were added.
- Filtering/reordering returns the scroll viewport to the top. An unchanged logical order retains its scroll position,
  and stable observation keys preserve overlapping cards. No navigator pagination, API, filter, snapshot, or viewer
  contract was changed.
- Deferred near-viewport image generation through idle callbacks, with a cancellable timer fallback. Unmounting cancels
  queued work; late results cannot update a closed/replaced image or enter the review cache. Existing base SVGs still
  come from the application image cache. A runtime-only 128-entry LRU stores highlighted SVGs and unavailable results,
  keyed by target, observation, SMILES, and query; it retains no native objects or serialized settings.
- PASS: focused regression run, 6 suites / 18 tests, including a 10,000-observation fixture, bounded mounting, scrolling
  to the final observation and back, responsive row counts, filter/order reset, unchanged-result retention, shared RHS
  state, deferred/cancelled image generation, base/highlight cache reuse, target/query/close stale completions, LRU
  eviction, invalid-molecule fallback, RDKit disposal, workspace state, and the previous navigator-height fix.
- PASS: `yarn build`, including backend Webpack stats validation (two existing bundle-size warnings);
  `yarn verify:moorhen-assets`, 275 assets / 114450225 bytes; targeted ESLint (zero warnings/errors), Prettier, and diff checks.
- PASS: full `yarn test:ci`, 76 suites / 536 tests (399.103 seconds), including the final fixtures and existing viewer,
  display-queue, transfer, layout, snapshot, React compatibility, and UI boundary regressions.
- Initially NOT RUN: live Chrome checks. The browser access host was unavailable. The computer-use fallback was then stopped
  because it could not establish the current Chrome URL confidently enough for its policy checks. No further browser
  input was attempted. A subsequent Chrome reconnection requested by the user also returned browser access host
  unavailable. The quick user checklist above and the previous maximize/close check remain pending live
  acceptance; no new screenshot or native snapshot/viewer workflow result is claimed.
- Logs: ignored `bundles/review-step3-focused.log`, `bundles/review-step3-tests.log`, and `bundles/review-step3-build.log`.
  Checkpoints 4-12 remain unstarted.

**Checkpoint 3 live verification follow-up (2026-10-29):**

- Browser access recovered. Verified the Django-backed A71EV2A target in Chrome at
  `http://127.0.0.1:8080/viewer/react/preview/target/A71EV2A/tas/lb18145-1`, with five review cards (`v1a`-`v5a`)
  from the selected RHS tag. The navigator reports five poses/six observations; the effective review result has five cards.
- PASS: responsive left-to-right wrapping at 900 px (four columns), 640 px (two columns), and 400 px (one column).
  Restored the normal browser viewport after testing. At 640 px, the 192 px thumbnail viewport has a 656 px scroll range:
  four cards mount at the top; scrolling to the bottom mounts only `v3a`-`v5a`, with `v5a` accessible. The panel header
  and X stay visible while thumbnails scroll. No navigator Load next or Load full list action was used.
- PASS: scrolling down and back restores the earlier images. Compared each mounted image's SVG data URL against its
  initial observation-labelled image; the values stayed identical, including after remounting the first row.
- PASS: from the scrolled bottom, searching RHS for `v3a` produces only its correctly labelled card/image and resets
  thumbnail scrollTop from 240 to 0, without a blank gap. Clearing the search restores the five-card result. These are
  the existing search rules; full shared column-filter behaviour remains checkpoint 4.
- PASS: dragged panel height from 240 to 453 px, then to its maximum. Reopening retained the maximum height (962 px in
  the normal 1257 px-high viewport). Closed with X twice from that height: the LHS column recovered to within its normal
  16 px bottom margin both times, with no stranded blank area. The loaded Moorhen scene remained visible through resize,
  close, and reopen. Restored the 240 px panel height, blank RHS search, selected tag, Pose name/ASC ordering, and normal
  viewport; Review is left open for inspection.
- PASS: reran the six focused suites listed in the original step 3 result: 18/18 tests, 8.089 seconds, using Node
  24.18.0 and Corepack/Yarn 4.17.1. This includes the 10,000-observation mounting/scroll fixture and deferred image,
  stale-completion, cache, disposal, workspace, and height-recovery coverage. Log:
  ignored `bundles/review-step3-live-focused.log`. `git diff --check` passed (existing Git line-ending warnings only).
- NOT RUN live: a genuinely large RHS result extending beyond the navigator's loaded page. The available target still
  exposes only five review cards, so the successful small-fixture virtualization/scroll checks do not establish that
  acceptance item. The large-list path is covered by automated fixtures and remains pending a suitable live dataset.
  Late image completion after target change/close, invalid molecules, and LRU eviction remain automated coverage;
  no additional snapshot, grading, structure-toggle, or transfer acceptance is claimed by this verification.
- Saved local proof screenshots to ignored `bundles/review-step3-responsive.jpg`,
  `bundles/review-step3-height-recovery.jpg`, and `bundles/review-step3-live.jpg`. No application source changed during
  this follow-up; the prior production build/assets and full-suite results above were not rerun. Checkpoints 4-12 remain
  unstarted, and user acceptance remains separate from these agent checks.

### 4. One complete filter/sort result for the navigator and panel

**Deliverable:** connect the full RHS pipeline, including column text/numeric, molecule/substructure/coordinate filters,
advanced grading/peer-review filters, existing selection-dependent rules, and both sorting mechanisms. Pagination is
applied after the shared logical result. Make filter controls consume canonical values so later resets and snapshot
restore update both their visible values and the results. Maintain existing defaults/legacy configuration for LHS callers.
Cards still have no bulk checkbox. Do not expose a new selected-only behaviour unless an existing control requests it.

**Quick user check:**

1. Set an observation/text column filter in the RHS navigator. Review shows the same matching observations.
2. Reverse sorting and change a tag/search. The card order follows the complete navigator order, beyond its loaded rows.
3. Use an existing advanced peer-review filter or molecule filter; both views respond. Clear it and verify both recover.
4. Tick a navigator bulk checkbox. Its existing behaviour is preserved; no card checkbox is introduced.

**Developer checks:** shared full-result fixtures before pagination; controlled filter/popover reset behaviour; independent
side instances and stable identities. Run relevant observation/filter, pose navigation, and transfer-order tests so the
existing arrows still use the complete filtered/sorted sequence. Do not change advanced main/peer matching semantics.

**Checkpoint 4 implementation and validation (2026-10-29):**

- Added a shared RHS result projection for the navigator and Review. Existing tags/coordinate candidates, search,
  general property filters, selection/editor-dependent candidates, toolbar sorting, and all column filters/sorting now
  run before navigator pagination. Review, row arrows, toolbar transfer candidates, and navigator counts consume that
  same logical sequence. No derived observation/pose result arrays are copied into Redux.
- Extracted the existing column predicates/comparators into a pure projector and shared the table column definitions.
  Preserved advanced main-status/peer-review OR matching, latest-per-user/my-review rules, load-created-status exclusion,
  and the existing summed multi-column sorting behavior. Unconfigured/LHS callers retain their existing local filter
  controls and defaults; no LHS activity-column dispatch was enabled.
- RHS column settings now use the optional `selectionReducers.unifiedFilter.rhs` namespace. The existing RHS
  `detailRHS` entry remains a fallback when that namespace is absent. Controlled text, numeric, observation, review,
  and molecule widgets read these values directly, so external replacement/reset updates both controls and results.
  Changes do not write the legacy LHS molecule/review/property filter keys. Existing general property-filter and search
  settings retain their established shared semantics; no new selected-only behavior or card checkbox was added.
- RHS query highlighting uses the RHS molecule query, and delayed structure-filter replies are ignored after reset,
  changed inputs/target, a newer request, or unmount. Query match IDs retain the existing molecule-filter shape.
  Snapshot defaulting/migration, complete review persistence, and target-reset integration remain checkpoint 12.
- Fixed RHS coordinate restrictions being bypassed by the existing display-all/untagged selector branches. The fix is
  confined to RHS candidate selection. Existing displayed-item bypass rules remain; the unconditional retention and
  leading-block rule remain checkpoint 5.
- Browser verification exposed two cases missing from the first fixtures. First, filtering to zero unmounted the
  navigator table and its filter controls. RHS now keeps the header/popover mounted, derives the current page from the
  full result, and recovers its first page after an empty result; Load next still advances by 30. Second, uploaded
  observation codes can differ from visible IDs such as `v3a`. RHS observation-column filtering now accepts both the
  visible short ID and historic upload code, and its observation-column sorting uses the visible ID. Saved filter
  values using the historic code continue to match. API/pose identifiers and toolbar comparator semantics are unchanged.
- PASS: initial focused gate, 8 suites/40 tests. Added a real `PoseListRHS` integration regression for empty-result
  control retention, typing a new match, reset recovery, and loading the next 30 rows. The final controller/widget run
  passed 4/4 tests (18.766 seconds), including differing upload/visible codes and both forms of the observation filter.
- PASS: full `yarn test:ci`, 78 suites/545 tests (168.320 seconds), including the empty-result regression, existing
  viewer/queue/transfer/navigation, layout, snapshot, React compatibility, and UI boundary coverage. The final historic
  upload-code compatibility assertion/predicate was followed by the focused 4/4 rerun above. Fixtures include 80 poses,
  matching/sorting beyond the first 30 rows, full arrow order, text/numeric and structure/coordinate composition,
  advanced grading semantics, independent LHS values, stable results after unrelated filter updates, and stale replies.
- PASS: final `yarn build`, including backend Webpack stats validation (two existing size warnings, 34.273 seconds);
  `yarn verify:moorhen-assets`, 275 assets/114450225 bytes. Targeted ESLint has zero errors and six warnings individually
  reproduced from HEAD. New/extracted modules pass Prettier; `git diff --check` passes with existing Git line-ending
  notices. No dependency, native rendering, snapshot-shaping, or API payload changes were made.
- PASS live Chrome, Django-backed A71EV2A at `127.0.0.1:8080`: observation-column `v3a` matches one navigator row/card;
  empty-result controls remain usable; reset restores five cards. Observation-column descending order is
  `v5a`-`v1a` in both views, and ascending restores `v1a`-`v5a`. Toolbar ASC changes keep both views consistent; equal
  upload-code sort keys still leave that order unchanged. Existing peer-review Good filtering empties both views on
  this fixture and reset recovers both. Benzene substructure `c1ccccc1` matches `v1a`, `v3a`, `v4a`, and `v5a` in both;
  molecule reset clears the visible query and restores five cards. RHS search/tag changes update both views; a bulk
  checkbox remains selected across those changes without restricting Review or adding card checkboxes. LHS results
  and the loaded scene remain visible. Restored blank searches, selected RHS tag, no column restrictions, Pose name/ASC,
  and clear bulk selections. Review remains open at 240 px.
- NOT RUN live: numeric/text score columns (the fixture exposes none), a result beyond navigator pagination, coordinate
  picking/radius interaction, repeated native transfers/memory profiling, and snapshot save/restore. Relevant pure/UI
  fixtures and existing regression suites pass, but do not establish those interactive outcomes. Large-list acceptance
  and user acceptance remain pending a suitable fixture; checkpoints 5-12 remain unstarted.
- Logs/proof are ignored local files: `bundles/review-step4-focused.log`, `review-step4-empty-result.log`,
  `review-step4-tests.log`, `review-step4-build.log`, `review-step4-assets.log`, `review-step4-lint.log`,
  `review-step4-baseline-lint.log`, `review-step4-column-filter.jpg`, `review-step4-substructure.jpg`, and
  `review-step4-live.jpg` under `bundles/`.

### 5. Retain displayed observations and put filtered-out cards first

**Deliverable:** explicitly merge displayed RHS observations after all normal filters. Matching observations stay in
their natural positions; displayed non-matches form a stable leading block without duplicates. Count all supported
representations and dataset paths. The panel's retention rule applies regardless of an existing navigator bypass toggle;
preserve that control's existing behaviour elsewhere. Button availability includes retained cards, and genuine empty
results disable Review while leaving the panel's close action usable.

**Quick user check:**

1. Display a RHS observation with an existing navigator control, then search for another observation. Its card moves to
   the start instead of disappearing.
2. Clear the search. The card returns to its natural sorted position, appearing only once.
3. Repeat with a protein-only or other available non-ligand representation. Remove its last visible representation:
   the card now disappears if it still fails the filter.
4. With no displayed RHS observations, enter a search matching nothing. Review is greyed out; an already open panel
   shows an empty state and can be closed with X.

**Developer checks:** every relevant representation/list shape, dataset visibility, compound/observation identity,
multiple simultaneous filter failures, sort reversal, actual render/removal acknowledgements, and failed/pending work.
Do not treat an unchecked control, an empty registry during an in-flight operation, or `activeMessages` alone as proof
that removal is complete.

**Implementation and verification (2026-10-29):**

- Implemented in `rhsReviewRetention.js`, the shared RHS result hook/projector, `RhsReviewPanel.js`, and the navigator's
  Review-button availability. Review starts with the complete normal result after tag/dataset eligibility, search,
  general, column, coordinate, structure, and advanced predicates. Displayed observations failing those predicates
  form a leading block sorted with the same toolbar/column comparators; normal matches keep their natural positions.
  Observation IDs deduplicate both blocks and overlapping dataset memberships.
- Retention reads acknowledged, visible representation metadata from detached `nglReducers.objectsInView` records.
  Existing application load actions publish these records after representation readiness; removal clears them after
  awaited native disposal. Optimistic checkbox selections and queue markers alone do not retain a card. The selector
  handles every supported observation object type, legacy type inference, mixed ID shapes, multiple dataset paths,
  and hidden representations, while excluding summary-view objects, spheres, compound IDs, and LHS-only inspirations.
  It never traverses or copies native handles, promises, buffers, or renderer graphs.
- The Review result explicitly applies normal predicates without the old displayed-item bypass, then retains actual
  displayed observations independently. The navigator keeps its existing selection/edit candidate rules and
  **Always show displayed hits** option. Review-button availability uses the retained result. No viewer operations,
  API/snapshot payloads, Redux settings, dependencies, or controls from later checkpoints were added.
- **PASS automated:** final focused retention/shared-filter checks: 2 suites / 21 tests (53.517 s); full
  `corepack yarn test:ci`: 79 suites / 562 tests (304.339 s). Coverage includes all 12 supported observation types,
  overlapping memberships, compound/observation identity, simultaneous filter failures, sort reversal, circular native
  graphs, real application load/delete thunks with delayed render/disposal and resource cleanup, failed loads, and a
  real RHS navigator integration with its bypass disabled. That integration checks retained-only button availability,
  natural-order recovery, last-representation deletion, and an empty result. Initial focused checks also passed
  (4 suites / 26 tests) before the final integration case was added.
- **PASS build/assets:** `corepack yarn build` compiled in 64.974 s and validated the backend stats contract; only the
  two existing bundle-size warnings remained. `corepack yarn verify:moorhen-assets` verified 275 files / 114,450,225
  bytes. Targeted ESLint reported zero errors and the existing guarded `poseList.js` hook-dependency warning only;
  targeted source Prettier and `git diff --check` passed. Whole-plan Markdown Prettier reports the existing manual
  wrapping/table-format differences (also reproduced against the pre-stage-5 text); this document retains that style.
- **PASS live Chrome:** reloaded the Django-backed A71EV2A target with the new production bundle and fresh native
  resources. Displayed `v5a` as a ligand, searched for `v3a`, and observed Review order `[v5a, v3a]`; the navigator kept
  its own order `[v3a, v5a]`. Clearing search restored `[v1a, v2a, v3a, v4a, v5a]`, with each card appearing once.
  Loaded `v5a` protein, removed its ligand, and repeated the search: the protein-only observation remained first.
  Removing its last protein representation removed its nonmatching card, leaving `[v3a]`. With no RHS representation
  displayed, a no-match search disabled Review and showed its empty state; the panel's X still closed it. Clearing
  search enabled Review again and reopening restored all five cards. Left the search clear, Pose name/ASC order,
  original scene, and panel open at 240 px; temporary RHS ligand/protein displays were removed.
- **NOT RUN live:** retention via maps, density, surfaces, or vectors; multiple RHS datasets/large lists beyond navigator
  pagination; the navigator bypass disabled; snapshot save/restore and smooth switching; layout/rotation/transfer and
  browser-memory regressions. The corresponding pure/integration and existing regression suites passed where
  applicable, but do not establish native interactive parity. User acceptance remains pending. Checkpoints 6-12
  remain unstarted.
- Logs/proof are ignored local files under `bundles/`: `review-step5-focused.log`, `review-step5-retention.log`,
  `review-step5-tests.log`, `review-step5-build.log`, `review-step5-assets.log`, `review-step5-lint.log`,
  `review-step5-retained.jpg`, `review-step5-protein.jpg`, `review-step5-empty.jpg`, and `review-step5-live.jpg`.

### 6. Show all across RHS datasets and tags

**Deliverable:** add Show all as one coherent RHS action. Clear RHS search, general/column/coordinate/structure/advanced
filters and any active new grade filter. Select all RHS tags and use the existing display-all semantics to include
untagged observations and observations from every RHS dataset, including when tag intersection was selected. Retain
sort settings, checked bulk selections, loaded structures, and camera. Reset controlled filter displays as well as data.

**Quick user check:**

1. Select a restrictive RHS tag, enter a search, and set a column filter. Click Show all in Review.
2. Confirm those filter controls clear, all RHS tags are selected, and all RHS observations—including untagged ones—are
   available in both views. A known second dataset's observations are present.
3. Check that prior checkbox selections, sorting, the viewer scene, and an existing LHS filter have not changed.

**Developer checks:** combined filters and tag union/intersection; all-dataset/untagged fixtures; hidden tags according
to existing side eligibility; reset of filter-widget state without sorting reset. Guard against clearing shared legacy
state in a way that changes LHS. The action must not enqueue structure additions/removals.

**Implementation and verification (2026-10-29):**

- Added **Show all** above the Review grid, including in its empty state. It is disabled while RHS data is loading.
  One Redux action clears the RHS navigator search and all shared RHS column/advanced/structure predicates, turns on
  the existing RHS display-all mode, turns off untagged-only mode, and selects every tag eligible for the RHS tag panel.
  Eligibility matches that panel: exclude LHS/missing-side tags, hidden tags, download-only tags, and removed categories.
  The complete RHS observation universe still includes untagged observations, hidden-tag observations, all dataset
  memberships, and observations with no backend pose. Display-all bypasses tag intersection without resetting that
  preference. Observation identity prevents duplicates across datasets.
- The shared legacy general filter is preserved for LHS. RHS reads an optional `unifiedFilter.rhs.generalFilter`
  override, falling back to the legacy filter until one exists; Show all disables that override while retaining its
  settings. Coordinate reset changes only RHS fields, preserving shared legacy/LHS fallbacks. Existing snapshot/API
  fields and load paths remain supported; full review snapshot/default/target-reset integration remains checkpoint 12.
- Toolbar/column sorting, bulk selections, representation selections, render queues, native objects, datasets, camera,
  and panel state are preserved. RHS navigator and tag-search inputs share a reset version which clears their visible
  text and cancels pending debounces, including text not yet dispatched. LHS search behaviour is unchanged. Controlled
  numeric/text/observation/peer/structure widgets reset their predicates without losing sorting; a structure response
  arriving after Show all cannot reapply its former filter. New grade controls remain checkpoint 10; clearing the RHS
  predicate model also clears any main-status predicate stored there.
- **PASS focused:** 4 suites / 31 tests (77.333 s), covering the complete result before pagination, real navigator/filter
  widgets, delayed structure replies, pending and applied navigator search reset, all-dataset/untagged fixtures with
  overlapping primitive/object membership IDs, union/intersection, side/category/hidden tag eligibility, single-event
  reset, and preservation of legacy LHS filters, selections, sorting, and scene references. Initial execution caught
  and corrected a test expectation for the numeric sort checkbox; the implementation required no change for it.
- **PASS build/assets:** `corepack yarn build` compiled in 76.247 s, with the two existing bundle-size warnings, and
  validated the backend stats contract. `corepack yarn verify:moorhen-assets` verified 275 files / 114,450,225 bytes.
  Targeted source Prettier passed. Targeted ESLint passed with zero errors and seven existing warnings (unused imports
  in selection/tag components and the guarded pose-list hook dependencies). Whole-plan Markdown retains its existing
  manual wrapping/table style.
- **PASS full suite:** `corepack yarn test:ci`: 80 suites / 567 tests (360.886 s), including existing viewer, queue,
  transfer, snapshot, and UI/source compatibility regression coverage. `git diff --check` passed.
- **PASS live Chrome:** reloaded the Django-backed A71EV2A target with the new production bundle and fresh native
  resources. On the available five-observation, one-dataset, one-RHS-tag fixture, displayed the `v5a` ligand, checked
  `v2a`, set an LHS observation search, set RHS navigator and observation-column searches to `v3a`, hid the RHS tag with
  its own search, and enabled tag intersection. Show all cleared both RHS search inputs and the column predicate,
  revealed/selected the eligible RHS tag, enabled its existing Show all hits mode, and restored all five observations
  in the navigator and Review. The checked row, LHS search/result, toolbar sort setting, active ligand, scene, and
  intersection preference survived. Repeated with explicit descending observation-column sorting: all five returned
  in `[v5a, v4a, v3a, v2a, v1a]` order, with the sort radio/direction preserved and predicate checkbox/text cleared.
  Typing a no-match search immediately before Show all did not reapply it after the debounce interval. Resized Review
  to 320 px to inspect full cards. Cleanup removed the temporary RHS ligand, cleared its checkbox and the LHS search,
  and restored Union, Pose name/ASC, and no column sort. Left Show all active and the panel open at 320 px; no pending
  progress indicator remained.
- **NOT RUN live:** a second RHS dataset, untagged/hidden-tag observations, and results beyond navigator pagination
  (unavailable in this fixture); native coordinate picking, map/density/vector controls, snapshot save/restore and smooth
  switching, transfer/browser-memory regressions, and other layout modes. Fixtures and the full suite cover the
  relevant data/reset contracts, but do not establish these native interactive outcomes. User acceptance remains
  pending. Checkpoints 7-12 remain unstarted.
- Logs/proof are ignored local files under `bundles/`: `review-step6-focused.log`, `review-step6-tests.log`,
  `review-step6-build.log`, `review-step6-assets.log`, `review-step6-lint.log`, `review-step6-before.jpg`,
  `review-step6-sort-reset.jpg`, `review-step6-after.jpg`, and `review-step6-live.jpg`.

### 6a. Hide all inactive (additional user request)

**Deliverable:** add Hide all inactive immediately to the right of Show all. Clear RHS tag selection and the two
RHS all/untagged display modes in one event, preserving all other filters, sorting, bulk selections, scene, and LHS
state. Both RHS views show only observations with an acknowledged visible design ligand, including observations from
any dataset and regardless of the old navigator bypass toggle. This explicit view overrides checkpoint 5's general
retention of non-ligand objects; those objects remain loaded in the scene. Ligand load/removal/visibility changes update
membership. Show all or an ordinary RHS tag/display selection exits this view. No structure or camera operation runs.

**Quick user check:**

1. Display one RHS ligand and a different observation's protein only; leave another observation inactive. Click
   Hide all inactive. Tags unselect and only the ligand observation remains in Review and the navigator, while the
   protein stays visible in the scene. Sort settings, checked rows, and LHS filters do not change.
2. Remove that last ligand with L. Its card disappears even if its protein remains; an open empty panel remains
   closable and Show all restores all observations.
3. Repeat Hide all inactive, then select a RHS tag. Normal tag filtering and checkpoint 5's broader retention return.

**Developer checks:** distinguish acknowledged visible L objects from protein/complex/map-only objects, optimistic
selection, hidden representations, summary views, compound IDs, and LHS inspirations; preserve dataset deduplication and
sort order. Cover pending/failed loads and awaited disposal, empty states, bypass off, recovery through Show all and
RHS tag/display actions, and absence of queue/native/camera changes. Default the optional active-only setting to false
for old snapshots and include it in checkpoint 12's configuration/reset checks.

**Implementation and verification (2026-10-29):**

- Added the adjacent Hide all inactive button and tooltip, available in loaded empty states as well as populated
  Review. It dispatches one event clearing RHS selected tags and both display-all/untagged-only flags, and enables
  optional `unifiedFilter.rhs.activeOnly`. The shared RHS projector then supplies the same ligand-only full result to
  the navigator, Review, navigation order, and Review-button availability. Existing toolbar/column comparators apply;
  other filters remain stored while active ligands bypass them. Tag/display selection actions or Show all clear the
  explicit mode. Missing settings retain normal filtering; no old snapshot/API field was removed or renamed.
- Active membership uses detached, visible, acknowledged main-view LIGAND records, with observation IDs deduplicated
  across datasets. A pending checkbox/queue intent, a hidden ligand, a summary object, a compound ID, an LHS inspiration,
  or a protein/complex/surface/map-only object does not qualify. Existing render-readiness and awaited-disposal
  acknowledgements drive updates without traversing native handles. No structure additions/removals or camera calls
  are dispatched by either list action; non-ligand structures stay loaded when their observation's row/card is hidden.
- **PASS focused:** 4 suites / 39 tests (91.751 s). Added action/selector/real-navigator coverage for atomic reset,
  preserved filters/selections/scene references, recovery through Show all and all RHS tag/display actions, ligand-only
  versus other object types, mixed dataset/legacy IDs, simultaneous filter failures, sort reversal, navigator bypass
  off, live acknowledgement changes, and an empty result retaining Show all. Existing delayed load/disposal/resource
  tests also check the new active selector. The first run exposed an unsupported local-UI import, corrected before
  these final checks.
- **PASS build/assets:** `corepack yarn build` compiled in 78.709 s and validated the backend stats contract, with the
  same two bundle-size warnings. `corepack yarn verify:moorhen-assets` verified 275 files / 114,450,225 bytes. Targeted
  source Prettier passed; targeted ESLint passed with zero errors and the two existing unused-import warnings in
  `selectionReducers.js`.
- **PASS full suite:** `corepack yarn test:ci`: 80 suites / 575 tests (373.543 s), including existing viewer, queue,
  transfer, snapshot, and UI/source compatibility checks. `git diff --check` passed.
- **PASS live Chrome:** reloaded the Django-backed A71EV2A target with the new production bundle and fresh native
  resources. Verified the button is immediately right of Show all. Displayed `v3a` as a ligand and `v5a` as protein
  only, with `v2a` checked, descending observation-column sorting, an LHS search, and an RHS search for `v2a`.
  Hide all inactive cleared RHS tag selection and both all/untagged modes, leaving only `[v3a]` in Review and the
  navigator. The protein remained visible in the scene; both search values and the bulk selection survived. Removing
  the last ligand through L produced an empty result and disabled the floating Review button, while both list actions
  and the header close remained available. Show all restored all five cards in `[v5a, v4a, v3a, v2a, v1a]` order;
  `v2a` was still checked and `v5a`'s P control still active. Repeating Hide all inactive with no active ligand produced
  an empty panel which closed with X; selecting the RHS tag enabled Review again and restored normal results on reopen.
  Cleanup removed temporary RHS ligand/protein displays, cleared bulk selection and the LHS search, restored Pose
  name/ASC and no column sort, and left Show all active with both buttons visible and the panel open at 320 px.
- **NOT RUN live:** multiple RHS datasets, large lists beyond navigator pagination, complex/map/surface-only and hidden
  ligand representations, delayed/failed native loading under this mode, snapshot save/restore/smooth switching,
  transfer/browser-memory regressions, and other layout modes. Relevant fixtures and existing regression suites pass,
  but do not establish those interactive outcomes. User acceptance remains pending; checkpoints 7-12 remain unstarted.
- Logs/proof are ignored local files under `bundles/`: `review-hide-inactive-focused.log`,
  `review-hide-inactive-tests.log`, `review-hide-inactive-build.log`, `review-hide-inactive-assets.log`,
  `review-hide-inactive-lint.log`, `review-hide-inactive-before.jpg`, `review-hide-inactive-only-ligand.jpg`,
  `review-hide-inactive-empty.jpg`, and `review-hide-inactive-live.jpg`.

### 7. Toggle a design ligand without moving the camera

**Deliverable:** enable image clicks for the design ligand through existing actions/queues. Multiple cards can be active.
Use a thick theme-blue border from actual acknowledged ligand visibility, including changes made in navigator controls.
Show pending/error feedback and prevent duplicate loads during rapid clicks. This checkpoint covers design ligands;
inspiration grouping is added immediately in checkpoint 8. Image clicks do not affect bulk selections or other types.

**Quick user check:**

1. Rotate/pan the viewer, then click a card image. Its design ligand appears with a thick blue border; the camera stays put.
2. Click a second image. Both design ligands remain visible. Click the first again: only that ligand is removed.
3. Toggle the second ligand using its navigator L control. Its card border follows, and bulk-checkbox selection is unchanged.

**Developer checks:** delayed coordinate fetch, overlapping same-name requests, rapid repeated intent, load failure,
representation/cache preservation, no camera calls, and awaited deletion. Include queue/display hooks, native adapter,
viewer-boundary, existing transfer, and relevant snapshot regression suites. Check native resources as well as Redux flags.

**Implementation and verification (2026-10-29):**

- Enabled each molecule image as a keyboard-accessible ligand toggle with a four-pixel theme-blue border driven by
  acknowledged main-view LIGAND visibility, rather than checkbox selection or an optimistic display request. Pending
  operations disable that image and show progress; a failed operation leaves retry feedback on its card. Navigator L
  changes update the same border. The controller lives above the closable/virtualized panel, so closing Review or
  scrolling a card away does not release its ligand or lose pending-work ownership. Target changes invalidate stale
  request continuations and clear transient feedback.
- Uses the existing global and dataset display actions/effects, `useStructureOperationQueue`, and registered viewer
  adapter. New ligand requests use `center: false`, thin RHS bonds, and no quality/inspiration additions. Removals set
  `withVector: false`, await disposal/selection/queue acknowledgement, and remove only that observation's ligand copies
  across loaded dataset/global paths. Other observations, protein/map/vector controls, bulk selection, and the camera
  are untouched. Dataset loading resolves primitive/object membership IDs against the existing observation data.
- Rapid repeated requests share pending work; independent observations remain concurrent. Requests overlapping a
  navigator fetch/native load join its claimed work without replacing its appearance. Hidden ligands are removed
  before reload. Reloads reuse detached representation type/parameters from live display records or their removal
  stash; native handles, circular graphs, UUIDs, stores, buffers, and ready promises are never copied into Redux.
- Added transient completion receipts outside Redux, scoped to store, target, observation, dataset, intent, and the
  specific claimed queue promise. A prior load cannot acknowledge a later reload in a load/remove/reload sequence.
  Successful receipts follow actual display-effect completion; coordinate/native failures propagate to card feedback
  and clear pending state. The ligand effects now include coordinate fetching in their existing rollback path so a
  fetch failure cannot leave a permanently pending optimistic intent. Existing queue ordering and viewer ownership
  remain in place. No API, dependency, browser-storage, or snapshot payload migration was introduced. Inspiration
  grouping and shared ownership remain checkpoint 8.
- **PASS focused:** final controller/receipt checks: 2 suites / 13 tests (20.592 s). Earlier focused filtering/card/queue
  checks also passed (6 suites / 24 tests). Tests use actual application reducers, ligand effects and native-boundary
  thunks, delayed coordinates/rendering/disposal, circular native references and buffers, duplicate global/dataset
  copies, pending/error UI, cached/custom/hidden representations, independent observations, navigator overlap during
  fetching and native rendering, failed load/removal with retry, target cancellation, and serialization/camera guards.
  Additional receipt checks cover late acknowledgement ordering, target/store/dataset isolation, cancellation and
  timeout cleanup. An intermediate completion-guard error found by focused checks was corrected before the final pass.
- **PASS build/assets:** `corepack yarn build` compiled in 64.896 s and validated the backend stats contract, with the
  two existing bundle-size warnings. `corepack yarn verify:moorhen-assets` verified 275 files / 114,450,225 bytes.
  Targeted ESLint passed with zero errors and eight existing unused-import/variable warnings in `Preview.js`.
- **PASS full suite:** `corepack yarn test:ci`: 82 suites / 588 tests (315.807 s), including native adapter/boundary,
  display-queue/hook, pose-transfer, snapshot, and existing React/UI regression checks. Targeted source Prettier and
  `git diff --check` passed.
- **PASS live Chrome:** reloaded the Django-backed A71EV2A target with the final production bundle and fresh native
  resources. Opened Review at 320 px, displayed `v5a` protein with its navigator P control, checked `v2a`, and manually
  rotated the viewer before the image checks. Clicking `v1a`'s image showed pending feedback, then an acknowledged
  four-pixel blue border and active navigator L control. Before/after screenshots showed the existing rotated scene
  stayed fixed. Clicking `v2a` gave two active cards; closing/reopening preserved both. Clicking `v1a` again cleared
  only its ligand/border; `v2a` remained active. Turning `v2a` off and on with navigator L cleared/restored its border.
  The bulk checkbox stayed checked, and `v5a`'s P control/scene content remained active throughout. Enter activated
  `v1a`'s image successfully. Hide all inactive then showed `[v1a, v2a]`; removing through the image removed each card
  after acknowledgement, ending in a closable empty panel. Show all recovered all five cards with the protein and
  checkbox still preserved. No blocking-dialog flash was observed. One browser input timed out during native work;
  re-observation and retry completed normally, with no card error left pending.
- Cleanup removed the temporary RHS ligands/protein and unchecked `v2a`. Left both searches clear, Pose name/ASC,
  Show all active, Review open at 320 px, and the camera at the manually rotated verification angle. The original LHS
  structures remained. Both image and navigator controls were checked after cleanup; no pending progress remained.
- **NOT RUN live:** a second dataset, results beyond navigator pagination, hidden/custom representation reloads,
  deliberately failed or delayed network/native operations, target changes during work, map/vector controls, snapshot
  save/restore/smooth switching, full pose-transfer/layout regressions, native GPU-buffer accounting, and long-run tab
  memory. Relevant fixtures and the full suite pass, but do not establish those native interactive outcomes. User
  acceptance remains pending; checkpoints 8-12 remain unstarted.
- Logs/proof are ignored local files under `bundles/`: `review-step7-focused.log`, `review-step7-final-focused.log`,
  `review-step7-tests.log`, `review-step7-build.log`, `review-step7-assets.log`, `review-step7-lint.log`,
  `review-step7-camera-before.jpg`, `review-step7-camera-after.jpg`, `review-step7-two-active.jpg`, and
  `review-step7-live.jpg`.

### 7a. Center on a card's ligand (additional user request)

**Deliverable:** add the existing MyLocation target icon below each image at the left of the centered observation label,
matching the annotated screenshot. Its tooltip reads exactly Center on. Reuse the navigator's centering action and
orientation capture; enable it only for an acknowledged visible ligand, with a ready viewer and no image-toggle work
pending. Resolve the loaded observation's global or dataset ligand rather than a shared compound ID. Do not trigger
image toggles, structure loading/removal, or bulk selection. Keep card dimensions and virtual-grid sizing unchanged.

**Quick user check:**

1. Display a design ligand. The target icon under its image enables; hover shows Center on. Inactive cards remain
   disabled, as in the navigator.
2. Rotate/pan the viewer and click the target icon. The ligand is centered/fitted just as with that observation's
   navigator icon. Its blue border, other structures, and checkbox selections stay unchanged.
3. Focus the icon and press Enter; it performs the same centering action.

**Developer checks:** use the actual centering thunk and native adapter boundary; verify exact observation/global/dataset
component identity, await native centering before recording orientation, and preserve the old navigator call path.
Confirm no ligand toggle/load/removal or selection actions, disabled inactive/pending controls, independent image/icon
events, accessible naming, tooltip text, and the footer's position/label alignment without changing virtual row heights.

**Implementation and verification (2026-10-29):**

- Added the navigator's MyLocation glyph below each image at the left of its centered observation label. The tooltip
  text is exactly **Center on**; each control has an observation-specific accessible name. The footer provides a
  separate action slot so pressing the icon does not trigger the image toggle. Card width/height and virtual row
  sizing remain unchanged. Inactive/hidden ligands, an unavailable viewer, and pending image operations disable it.
- Reused `centerOnLigandByMoleculeID` and its existing native centering/orientation-recording behavior. An optional
  loaded-object name lets cards focus their acknowledged global/dataset ligand directly; the existing navigator's
  observation/dataset lookup path is unchanged. Both paths await adapter centering before recording the main-view
  orientation. No ligand toggle, queue entry, native load/removal, bulk selection, API payload, or dependency change
  is involved in the new control.
- **PASS focused:** 3 suites / 20 tests (55.555 s), including the actual centering thunk with global and dataset-only
  cards, the native-adapter boundary, delayed camera completion, orientation capture, unchanged visibility/selection,
  disabled inactive/pending controls, old navigator-call parity, and existing virtual-grid/action regressions.
- **PASS full suite:** 82 suites / 590 tests (374.872 s), including the existing viewer, queue, transfer, snapshot, and
  layout compatibility coverage.
- **PASS build/assets:** `corepack yarn build` compiled in 74.579 s and validated the backend stats contract, with the
  two existing bundle-size warnings. `corepack yarn verify:moorhen-assets` verified 275 files / 114,450,225 bytes.
  Targeted ESLint passed with zero errors and five existing unused-import/variable warnings in the NGL-named dispatch
  module. Targeted source Prettier and `git diff --check` passed.
- **PASS live Chrome:** reloaded the Django-backed A71EV2A target with the rebuilt bundle and native Moorhen ready.
  The icon appears in the annotated footer position with centered labels; the active v1a control enables and its
  tooltip reads exactly **Center on**. Inactive cards and the pending image toggle keep the control disabled. After
  rotating the viewer, both the card icon and the existing v1a navigator icon centered/fitted the same ligand. Mouse
  and Enter activation preserved its blue image border and the checked v2a bulk row, without changing other loaded
  structures. The final proof includes the tooltip, active image, checked row, and native scene.
- **NOT RUN live:** dataset-only centering (the available target has one RHS dataset), failed native centering,
  large-list scrolling, snapshot switching, repeated pose transfers, and extended memory monitoring for this addition.
  Global/dataset object identity and asynchronous orientation capture are covered by the focused tests; those tests
  do not establish the unavailable interactive outcomes. User acceptance remains pending. Temporary v1a ligand and
  v2a bulk selection were cleared after verification; the panel remains open and the last tested camera focus remains.
- Logs/proof (ignored): `bundles/review-center-focused.log`, `review-center-tests.log`, `review-center-build.log`,
  `review-center-assets.log`, `review-center-lint.log`, `review-center-before.jpg`, `review-center-after.jpg`,
  `review-center-navigator.jpg`, and `review-center-live.jpg`.

### 8. Inspiration groups with shared and independent ownership

**Deliverable:** extend the click operation to the design plus inspiration ligands using the injected existing RHS
resolver. Record the IDs actually acquired by a group so later tag changes do not lose its cleanup responsibilities.
Keep shared and independently displayed inspirations. A partially displayed group is completed on click, even if the
design border is already blue. Closing Review releases no structures. Serialize work per observation and allow
independent groups to progress concurrently; failed work must not claim completion or remove unrelated scene content.

**Quick user check:**

1. Click a card with inspirations. Its design and available inspiration ligands appear without camera movement.
2. Activate two designs sharing an inspiration. Switch one off: the shared inspiration and second design remain.
3. Display an inspiration independently in LHS before activating its design; switch the design on and off. That inspiration
   remains. Other protein/map controls also remain unchanged.
4. Hide one inspiration while keeping its design ligand visible. Click the blue card: the missing ligand is restored.

**Developer checks:** resolver parity with current design tags, no-inspiration/missing-inspiration fixtures, shared owners,
manual holds before/during group use, tag changes, partial groups, pending remove/add, failed partial additions and cleanup,
and closing/target switching during work. Use circular native-reference/resource-disposal fixtures and existing queue,
adapter, transfer, and snapshot tests. Ownership stores IDs/flags and never copies native objects or queue payload graphs.

**Implementation and verification (2026-10-29):**

- Cards now toggle their design ligand plus the available inspiration observations. The navigator and Review share
  `getComputedInspirationsForPose`, preserving main-observation preference, pose fallback, explicit computed-set tags,
  and legacy synthetic-tag filtering. The provider injects the RHS group resolver; unresolved inspiration IDs are
  skipped, matching navigator behavior. Inspiration observations do not acquire RHS cards merely by being displayed.
- The controller records group membership and acquired global/dataset path IDs outside Redux. Shared members have
  multiple owners and serialize their rendering/removal work; unrelated groups continue concurrently. Releasing a
  group removes only its acquired inspiration paths when their last owner releases them. Existing visible/pending
  independent inspirations and later external display intents remain held. Tag changes do not discard responsibility
  for inspiration IDs acquired earlier. Closing/virtualizing Review releases no structures or ownership.
- The image border still reflects acknowledged design-ligand visibility. A blue partial group exposes a Show action
  and restores missing ligands without reloading its visible design. Pending removals finish before reacquisition.
  Group tooltips explain restoration and independent/shared retention; explicit Center on remains separate. All image
  operations preserve the camera, bulk selections, and non-ligand controls through the existing application queues.
- Failed partial additions wait for their member operations, release new claims, and attempt cleanup of newly acquired
  resources while preserving other owners and independent holds. Cleanup failures retain responsibility and report an
  error. Failed releases retry removal instead of reloading the group. Target changes cancel receipts and prevent
  old jobs from enqueueing new work into the next target. Ownership contains IDs, names, flags, and sets; no native
  molecule, representation, renderer, buffer, or queue-payload graph is cloned or added to serialized state.
- **PASS focused:** 3 suites / 36 tests (13.750 s), covering the real global/dataset display hooks and completion receipts,
  delayed coordinates/rendering/disposal, circular native references/buffers, shared owners and concurrent groups,
  manual holds before/during/pending activation, partial blue cards, tag changes, failed additions/rollback/disposal,
  close/reopen during work, target cancellation, exact resolver behavior, and existing centering/toggle regressions.
- **PASS full suite:** 82 suites / 605 tests (178.039 s), including existing native adapter/boundary, queue, pose-transfer,
  snapshot, filtering, and layout compatibility tests. The first run caught missing viewer state in the cards-only
  fixture; visibility now treats that state as inactive, and the final full run passes.
- **PASS build/assets:** the final `corepack yarn build` compiled in 48.832 s and validated backend bundle stats, with
  the same two bundle-size warnings. `corepack yarn verify:moorhen-assets` verified 275 files / 114,450,225 bytes.
  Targeted ESLint passed with zero errors/warnings. Targeted Prettier and `git diff --check` passed. No dependency,
  snapshot/API payload, native adapter, or rendering-queue contract was changed in this checkpoint.
- **PASS live Chrome:** opened a fresh Django-backed A71EV2A tab after the previous tab timed out, then reloaded the final
  bundle with native Moorhen ready. v1a displayed its design plus x0188a/x0229b inspiration ligands, kept the rotated
  camera and checked v2a row, and preserved the initial x0188a ligand/protein. Closing during loading and reopening
  retained the completed group. Hiding x0229b in LHS kept v1a blue; clicking that blue card restored x0229b and the full
  group. Independently removing/re-adding x0229b while the group was active protected it on release. Independently
  displaying x0278b before activating v2a protected it when v2a was released, while group-owned x0305a was removed.
  Both designs ran together; releasing v1a retained v2a and its inspirations. There were no group errors or blocking
  rendering dialogs during these operations. Temporary design/inspiration/bulk selections were cleared afterward;
  the initial ligand/protein remained, with Review open at 320 px and the tested camera angle in the validation tab.
- **NOT RUN live:** a shared inspiration across two designs (the inspected v1a-v4a pairs are disjoint), a second RHS
  dataset, per-set tag changes, injected rendering/cleanup failures, large lists, snapshot switching, repeated pose
  transfers, and extended tab-memory monitoring. Automated coverage exercises these relevant ownership/failure/data
  boundaries but does not establish the unavailable native outcomes. User acceptance remains pending; checkpoints
  9-12 remain unstarted. Saving/restoring review settings and reconstructing ownership remain checkpoint 12 work.
- Logs/proof (ignored): `bundles/review-step8-focused.log`, `review-step8-tests.log`, `review-step8-build.log`,
  `review-step8-assets.log`, `review-step8-lint.log`, `review-step8-camera-before.jpg`, `review-step8-camera-after.jpg`,
  `review-step8-partial.jpg`, `review-step8-two-groups.jpg`, and `review-step8-independent-holds.jpg`.

### 9. Main-status shortcuts and the existing summary circle

**Deliverable:** put three grade shortcuts and the existing summary circle under each observation label. Logged-in
shortcuts save main status immediately through the existing quality API and update both views. Keep current-status clicks
as no-ops, disable repeated submission while pending, validate success, and report failures without a false grade update.
Reuse summary details and peer-review distribution. Logged-out shortcuts are disabled; summary inspection stays available.

**Quick user check:**

1. On a test target while logged in, click green under a card. Its summary and navigator main status both become green.
2. Click yellow. Both update. Click yellow again: no additional save or change occurs.
3. Open the summary details: the existing main-status/review information remains available. In a logged-out session,
   inspection still works and all three grade shortcuts are disabled with a login explanation.

**Developer checks:** main-status payload/observation ID, authenticated and unauthenticated contexts, same-status no-op,
pending duplicate suppression, rejected/invalid API responses, consistent summary references, and no image-toggle event
bubbling. Preserve personal peer-review creation/history and the existing summary layout behaviour.

**Implementation and verification (2026-10-29):**

- Added green/GOOD, yellow/MEDIOCRE, and red/BAD shortcuts plus the existing `QualityStatusWrapper` summary below each
  observation label. The summary retains its main-status center, peer-review distribution, hover table, and click/history
  dialog. An optional accessible trigger supports Enter/Space and observation-specific naming. Its existing tooltip
  paths are preserved. The circle and shortcuts are separate from the image and Center on controls.
- A per-store controller calls the existing quality POST helper with the observation ID (not compound/pose ID), user,
  `main_status: true`, and the established `Main status change` comment. It dispatches the existing quality-status update
  only after validating the returned record's identity, observation, grade, main-status flag, and user. Failed/empty or
  mismatched responses show an inline retry message and leave both views' grades unchanged. The older helper/callers
  retain their behavior; no API payload or peer-review write contract was changed.
- Current-status clicks perform no request. Pending work is deduplicated per observation and disables all three
  shortcuts; other observations can save concurrently. Request feedback survives closing/virtualizing cards outside
  Redux/snapshots. Target changes invalidate old feedback and prevent late completions from updating the next target,
  including switching away and back while a request is pending. Successful writes update the shared status list, so
  the navigator and card summary react together without optimistic colors or a comment prompt.
- Missing user identity, explicit unauthenticated context, and `NOT_LOGGED_IN` disable the shortcuts with a login
  tooltip. Legacy contexts containing a valid pk without an authenticated field remain supported. Review's summary is
  read-only when grading is unavailable, while inspection/history remain accessible; this optional mode leaves existing
  navigator editing/peer-review behavior unchanged. Main-status selection ignores `Created on load` defaults and never
  falls back to a personal peer review, matching the summary.
- Cards retain their 200 px width and 144 px image area; height is now 244 px to accommodate the grading row and feedback.
  The virtual grid uses that row height. Initial Review height is now 336 px so the new controls fit without first
  resizing; clamping and the user's resized height across close/reopen are preserved. Historical checkpoint records
  describing the former 208 px cards/240 px initial panel remain accurate for those earlier versions.
- **PASS focused:** 6 suites / 58 tests (45.407 s), covering real quality API-helper/action/reducer and summary integration,
  confirmed updates in both views, no-op current grades, duplicate/concurrent requests, close/reopen during saves,
  rejection and invalid/mismatched responses, retries, four unauthenticated-context cases with readable history,
  default-record/peer-review exclusion, target cancellation, summary reference stability, no image/selection changes,
  responsive virtualization, and existing filter/ligand/centering regressions.
- **PASS full suite:** 83 suites / 625 tests (187.719 s), including the initial-height change and existing viewer, queue,
  transfer, snapshot, layout, and filtering compatibility tests.
- **PASS build/assets:** `corepack yarn build` compiled in 42.806 s and validated backend bundle stats, with the same two
  bundle-size warnings. `corepack yarn verify:moorhen-assets` verified 275 files / 114,450,225 bytes. Targeted ESLint
  passed with zero errors and three existing unused import/variable warnings in `QualityStatusModal.js`. Targeted
  Prettier and `git diff --check` passed. No dependencies, snapshot settings, grade filters, or DesignDB action were added.
- **PASS live Chrome:** verified the final production bundle on Django-backed A71EV2A with native Moorhen ready. The
  initial 336 px panel shows all five cards' grading controls and summary circles. After the user confirmed that all
  local backend data is disposable, v5a was saved green, then yellow. Each confirmed grade appeared in the card center
  and navigator circle. Repeating the green and yellow shortcuts left history at exactly two test entries. Enter opened
  the existing summary/history dialog, showing both saved main-status changes. Image visibility, checked v4a row, and
  the initial ligand/protein scene/camera stayed unchanged. Restored v5a to ungraded through the existing dialog,
  verified both circles white and all shortcuts unselected, cleared the temporary checkbox, and confirmed close/reopen
  retains the 336 px height and status. The three test history entries remain in the disposable local backend.
- **NOT RUN live:** an independent anonymous browser session, a nonempty peer-review distribution, injected API latency/
  rejection or invalid response, target switching during a save, large-list grading/scrolling, and snapshot switching.
  Automated checks cover the relevant authentication, pending/failure, peer-review, and target boundaries; they do not
  establish those unavailable interactive outcomes. User acceptance remains pending; checkpoints 10-12 are unstarted.
- Logs/proof (ignored): `bundles/review-step9-focused.log`, `review-step9-tests.log`, `review-step9-build.log`,
  `review-step9-assets.log`, `review-step9-lint.log`, `review-step9-green.jpg`, `review-step9-yellow.jpg`,
  `review-step9-history.jpg`, and `review-step9-restored.jpg`.

### 10. Multiple main-status colour filters in both views

**Deliverable:** add independent green/yellow/red/ungraded toggles to the panel header. Active colours match with OR;
none active means unrestricted. Apply this as an additional main-status restriction to the RHS shared result. Existing
advanced filters retain their own behaviour. Displayed observations still obey checkpoint 5's retention rule. Show all
clears these buttons. Logged-out users can filter.

**Quick user check:**

1. With no unrelated filters, activate green, then yellow. Both green and yellow main-status observations appear in both
   views. Turn green off: only yellow matches remain, plus any displayed-observation exceptions.
2. Add ungraded: observations with missing/NONE main status appear. Turn every button off: all grades are eligible again.
3. Apply a navigator search or advanced peer-review filter: the result combines with the colour restriction. Click
   Show all: every active filter clears. Change a card's main status and verify both views react immediately.

**Developer checks:** all colour combinations; no main status versus existing peer reviews; ignoring load-created default
records consistently with the existing summary; advanced-filter composition; displayed/pinned exceptions; grade changes
under an active filter; no colour fallback to personal reviews; and independent LHS state.

### 11. Push to DesignDB coming-soon dialog

**Deliverable:** bottom-right Push to DesignDB action and a dialog styled from the supplied mockup. Show WARNING!,
Coming soon beside it, the complete warning/question text, disabled YES, and NO to close. Logged-out action is disabled.
No push request, grading write, or structure operation is connected to this dialog.

**Quick user check:**

1. Logged in, click Push to DesignDB. Confirm all mockup text and Coming soon are visible; YES is disabled.
2. Click NO. The dialog closes and grades, filters, selection, and scene remain unchanged.
3. Logged out, confirm Push to DesignDB is disabled with a login explanation.

**Developer checks:** authentication gating, disabled confirmation, dismiss behaviour, accessible dialog labelling, and
absence of a submission/network action. Add its tooltip paths through the existing tooltip boundary.

### 12. Snapshot persistence, target reset, and final integration

**Deliverable:** save/restore optional panel owner/open state, height, grade filters, any new canonical filter settings
needed by the panel, and minimal serializable group intent needed to preserve ownership. Default old snapshots to closed
Review with default height/no new grade filter or active-only restriction; never inherit the previously active review
configuration. Normalize both initial full-state hydration and same-project in-place restore. Let restored snapshot
settings win over initialization resets. Persist configuration, not open popovers/dialogs, pending promises, image
caches, or native handles.

An ordinary page reload adds no persistence of its own; a saved snapshot route restores the saved configuration. Changing
target resets review configuration and invalidates stale work. Saved main-status history remains backend data: restoring
a snapshot does not roll back server grades. Preserve existing queue-based scene/orientation restore and shared-inspiration
protection after restore.

**Quick user check:**

1. Open Review, change its height, activate two grade colours, and activate a design group. Save a test snapshot A.
2. Change those settings and save snapshot B. Switch A/B within the project: panel settings and scene restore, the same
   viewer stays alive, and there is no blocking-dialog flash. The existing snapshot camera transition remains smooth.
3. Open an older snapshot without review settings: Review is closed with defaults when reopened. Load A through its URL:
   its saved panel settings return. An ordinary target URL reload starts with defaults.
4. Change to another target: Review resets. Return and verify stale images, grade filters, ownership, or pending actions
   from the other target have not leaked. After restoring A, repeat a shared-inspiration off/on check from checkpoint 8.

**Developer checks:** inspect snapshot dispatch/shaping/tests together; full-state and incremental hydration, old snapshots,
missing per-side fields, both snapshot API storage fallbacks, target-change timing, late async completions, serializable
ownership reconstruction, queue tombstones, caches, camera interruption, and suppressed progress dialogs. Run all relevant
snapshot, viewer/host/boundary, display queue, navigation/transfer, and filter tests, then the full suite and production gate.

## Final acceptance gate

Run `yarn test:ci`, `yarn build`, `yarn verify:moorhen-assets`, and `git diff --check`. Use targeted ESLint for changed
JavaScript and distinguish baseline warnings. Verify the production build's existing backend stats check passes. Generated
bundles/stats/cache files are not source changes.

On the Django-backed test stack, repeat target load, LHS/RHS ligand and protein/map toggles, viewer rotation, opening and
resizing Review, layout switching, grading/filtering from both views, Show all, save/restore, same-project snapshot changes,
and actual object removal. Repeat RHS forward/back navigation with shared inspirations and protein/map controls, and
monitor tab memory while repeatedly toggling review groups. Check that removed structures have no leftover rendered buffers,
the single canvas survives, and there are no unexpected camera jumps or blocking-dialog flashes. Record any unavailable
fixture/runtime checks explicitly; they remain unverified rather than implicitly passed.

## Progress and reporting

| Checkpoint | Implementation | Automated/build checks | Live/user check |
| --- | --- | --- | --- |
| 1. Panel shell and resizing | Implemented, including height-recovery fix | PASS: 74 suites/529 tests, build/assets, targeted lint | PASS: Chrome checks above, including maximize/close regression; user acceptance pending |
| 2. Observation cards/all RHS data | Implemented | PASS: 73 suites/526 tests, final focused checks, build/assets, targeted lint | PASS: Chrome cards/search/tag/order/inactive-click checks; fixture limits above; user acceptance pending |
| 3. Lazy responsive grid | Implemented | PASS: 76 suites/536 tests, build/assets, targeted lint/format checks; follow-up focused rerun 6 suites/18 tests | PASS: Chrome responsive/virtualized scrolling, image consistency, search reset, resize/maximize-close on five-card fixture; large-list/beyond-pagination live check and user acceptance pending |
| 4. Shared filtering/sorting | Implemented | PASS: 78 suites/545 tests, final focused 4/4, build/assets, targeted lint (baseline warnings only) | PASS: Chrome column/search/tag/peer/substructure filtering, both sorting inputs, reset/empty recovery and bulk selection; live large-list, score columns, coordinate picking and user acceptance pending |
| 5. Displayed-observation retention | Implemented | PASS: 79 suites/562 tests, final focused 2 suites/21 tests, build/assets, targeted lint/format checks (baseline warning only) | PASS: Chrome ligand/protein-only retention, natural-order recovery, last-representation removal, disabled empty Review and close/reopen; fixture limits above; user acceptance pending |
| 6. Show all | Implemented | PASS: 80 suites/567 tests, focused 4 suites/31 tests, build/assets, targeted lint/format checks (baseline warnings only) | PASS: Chrome combined RHS search/column/tag reset, intersection, sort/checkbox/scene/LHS preservation, pending-search cancellation and resize; multi-dataset/untagged/large-list fixture limits above; user acceptance pending |
| 6a. Hide all inactive | Implemented | PASS: 80 suites/575 tests, focused 4 suites/39 tests, build/assets, targeted lint/format checks (baseline warnings only) | PASS: Chrome adjacent buttons, ligand-only membership, protein-only scene preservation, tag reset, search/sort/bulk/LHS preservation, last-ligand removal, empty close, Show all and tag recovery; fixture limits above; user acceptance pending |
| 7. Design ligand toggle | Implemented | PASS: 82 suites/588 tests, final focused 2 suites/13 tests, build/assets, targeted lint/format checks (baseline warnings only) | PASS: Chrome image toggle/pending/borders, two active designs, camera stability after rotation, selective removal, navigator and keyboard synchronization, close/reopen, protein/bulk preservation and active-only empty recovery; fixture limits above; user acceptance pending |
| 7a. Card ligand centering | Implemented | PASS: 82 suites/590 tests, focused 3 suites/20 tests, build/assets, targeted lint/format checks (baseline warnings only) | PASS: Chrome icon position, exact tooltip, inactive/pending disabling, native card/navigator focus, mouse/Enter, image/bulk/scene preservation; fixture limits above; user acceptance pending |
| 8. Inspiration groups/ownership | Implemented | PASS: 82 suites/605 tests, focused 3 suites/36 tests, build/assets, targeted lint/format checks | PASS: Chrome design/inspiration rendering, camera/bulk/protein preservation, partial restoration, independent holds before/during activation, concurrent designs, selective release, close/reopen during loading; shared-inspiration/dataset/large-list fixture limits above; user acceptance pending |
| 9. Main-status grading/summary | Implemented | PASS: 83 suites/625 tests, focused 6 suites/58 tests, build/assets, targeted lint/format checks (baseline warnings only) | PASS: Chrome controls/initial height, real green/yellow saves, card/navigator synchronization, no-op history, keyboard summary/history, scene/bulk preservation, ungraded restoration and close/reopen; anonymous/peer/failure/large-list fixture limits above; user acceptance pending |
| 10. Main-status colour filtering | Not started | Not run | Not run |
| 11. DesignDB placeholder dialog | Not started | Not run | Not run |
| 12. Snapshots/target reset/integration | Not started | Not run | Not run |

After every implemented checkpoint, update this document and show the user:

1. The checkpoint completed and its visible changes.
2. Its quick click-through checklist, repeated directly in the response.
3. Actual automated/build results and any live checks performed; list manual checks still pending separately.
4. Any issue, changed assumption, or revised remaining checkpoint, with the updated plan linked.

If investigation changes the sequence, update the affected scope, dependency, checklist, and progress rows before
reporting that checkpoint complete. Keep historical completed results accurate. Do not mark future checkpoints complete
because an earlier change happened to introduce part of their UI.
