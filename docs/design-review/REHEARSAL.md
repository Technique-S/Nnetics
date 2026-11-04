# Stageshow rehearsal and visual inspection

**4 November 2026 · Isolated static proposal · Author review only**

The actual Stageshow skill was read at `C:/Users/Kazi/.agents/skills/stageshow/SKILL.md`, including its craft, framing, looks, kit, rehearsal/review and verification guidance. This was not a substitute name for an unrelated mockup technique.

## Gold and adaptation

Copied and rendered the supplied `examples/static-card` before adapting it. [Gold capture](evidence/stageshow-gold.png). The invoice study preserves its cropped desktop window, quiet list and foreground detail panel. It maps the content to Nnetics' review task, green palette, automatic reference, exact amount and immutable recipient explanation. The focal amount and status are visible before the quiet supporting rows.

- Actual components: `Stage`, `Window`, `Text`, `Bar`, `Row`; no handmade imitation browser chrome.
- Source: [stage.tsx](stage.tsx), [stage.css](stage.css).
- Render: [local study](http://127.0.0.1:3210/scene.html), [wide capture](proposals/stageshow-study.png), [compact capture](proposals/stageshow-study-mobile.png).
- The study is a deliberately cropped illustration, **not** the mobile app design. Full-size responsive proposals are in [index.html](index.html) and the review's screenshot matrix.
- No choreography was requested. This is one static composition with a compact layout, no autoplay, fake activity or wallet behavior. Motion/loop quality is not evaluated or claimed.

The kit and build dependencies were copied/installed only under ignored `artifacts/design-runtime`: React/React DOM 18.3.1, esbuild 0.25.12 and lucide-react 0.468.0. Production package manifests and lockfiles were not changed. Generated `scene.js`/`scene.css` are self-contained review assets; the optional rebuild script expects that local kit/runtime. MIT notices in bundled dependencies are retained. Unslop attribution for the broader direction: **Damir Sokolovsky (@heydamir), CC BY 4.0**.

## Inspection and corrections

1. Rendered the gold and first adaptation at shown size. Readability, crop and amount hierarchy were inspected from the screenshots, not assumed from successful compilation.
2. Reduced the satellite's bottom-gap mismatch and filled the quiet support sidebar so it did not appear accidentally empty. Updated the compact window crop without scaling type down.
3. Re-rendered wide/compact outputs. Checked the full-page Overview, sign-in, invoice and contractor proposals separately, including the explicit simulated-data annotation. The prototype is the primary design-review artifact.

The supplied `film.mjs --still` tool produced images but the final report says **“issues; still capture only, motion was not judged”**, not a clean verification pass. It cannot judge motion from one still. It flags `.ss-row` geometry declarations in the generated single CSS bundle as example overrides; these declarations originate in the copied kit's own Row stylesheet. The custom `stage.css` does not redefine `.ss-row` geometry. Treat this as a checker/bundling limitation requiring manual review, not a waived automated pass. An earlier narrow-window framing warning was addressed by changing the compact crop; an incidental favicon request was eliminated from the final scene document.

No independent visual or security reviewer was engaged. The author's screenshot inspection does not establish independent review. Outstanding native zoom, screen-reader and real-device checks are documented in [VERIFICATION.md](VERIFICATION.md).

The separate supplied `layout.mjs --strict` check ran at 390 px on both the full-size Overview host and direct study route: **no issues detected** (2 controls / 11 padded containers on the host; 0 controls / 7 padded containers in the scene). This is a single box-fit snapshot, not visual approval or resolution of the film CSS-origin warnings.

## Handoff

Review the full-size proposal and its state selector first, then the static illustration if useful. Approving the visual direction authorizes neither deployment nor payments. Production implementation remains gated on the user's review of the information architecture and component migration plan.
