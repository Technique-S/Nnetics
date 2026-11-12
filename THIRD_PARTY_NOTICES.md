# Third-party notices

Nnetics' original code is licensed under [MIT](LICENSE), selected by the project owner, who explicitly confirmed the published holder text **MDBcertified**. No legal name was inferred from an account or filesystem. Dependencies and adapted material retain their own licenses; this file does not relicense them.

## Direct application and tooling dependencies

| Dependency | Pinned version | Installed package license |
| --- | --- | --- |
| Next.js | 16.4.3 | MIT |
| React / React DOM | 19.3.1 | MIT |
| near-api-js | 7.4.0 | MIT AND Apache-2.0 |
| NEAR Wallet Selector core / Nightly | 10.1.4 | MIT OR Apache-2.0 |
| Buffer | 6.0.3 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Playwright Test | 1.64.1 | Apache-2.0 |
| Tailwind PostCSS | 4.3.3 | MIT |
| react-use-measure | 2.1.7 | MIT |

The inline original-billing-text disclosure adapts Cult UI's Side Panel. Its [upstream MIT license](apps/owner/src/app/ui/cult/LICENSE.cult-ui.md) and [source/adaptation record](apps/owner/src/app/ui/cult/registry-sources.json) ship with the component. It uses the existing Motion dependency and Nnetics design tokens.

These declarations were read from the installed manifests. Full dependency/transitive notices ship in the npm packages; retain those notices when redistributing a built application. The manifests and lockfiles are the authoritative dependency inventory. Rust dependency declarations and versions are in the Cargo manifests/lockfile; retain each crate's upstream notices when redistributing binaries.

## Isolated design-study material

`docs/design-review/stage.tsx` identifies its adaptation from the Stageshow static-card example. `docs/design-review/scene.js` is the intentionally retained generated illustration bundle, not a runtime application/build output. Its existing bundled React/Scheduler notices remain untouched. The [full accompanying notices](docs/design-review/THIRD_PARTY_LICENSES.txt) cover the MIT Stageshow material (Copyright 2026 Benji Taylor) and bundled React material (Copyright Facebook, Inc. and its affiliates). The study source references a local ignored illustration kit; it is not needed to build or run Nnetics.

## AI assistance and scope

OpenAI Codex assisted implementation and documentation. No AI-generated financial approval is trusted: contract rules and owner review remain authoritative. Deterministic parsing is the supported submission-demo path. Third-party wallet interfaces and brand artwork retain their owners' rights. This inventory is not independent legal or security review.
