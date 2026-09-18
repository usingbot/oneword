# Emitted browser helper provenance

RC0 closure reviewed the pinned production output, not just dependency categories.
These helpers execute in the browser even though their producers are build tools.

| Package | Version | Shipped relationship | Notice action |
| --- | --- | --- | --- |
| Vite | 8.3.0 | The entry chunk contains the dynamic-import preload helper, its dependency loading and `vite:preloadError` dispatch. [Upstream implementation](https://raw.githubusercontent.com/vitejs/vite/v8.3.0/packages/vite/src/node/plugins/importAnalysisBuild.ts). | Preserve the complete core MIT section from installed `vite/LICENSE.md` as `licenses/vite-LICENSE.txt`. |
| Rolldown | 1.2.8 | Vite delegates the modulepreload polyfill to Rolldown. Its browser code checks `relList.supports`, watches modulepreload links with MutationObserver, and fetches them. [Polyfill](https://raw.githubusercontent.com/rolldown/rolldown/v1.2.8/crates/rolldown_plugin_vite_module_preload_polyfill/src/module-preload-polyfill.js). | Copy installed `rolldown/LICENSE` to `licenses/rolldown-LICENSE.txt`. |
| Rolldown derived module helpers | 1.2.8 | Browser chunks include lazy CommonJS initialization and namespace/property-copy/interop helpers from [runtime-base.js](https://raw.githubusercontent.com/rolldown/rolldown/v1.2.8/crates/rolldown/src/runtime/runtime-base.js). These are generated code in the app, not the native compiler binary. | Retain the installed `rolldown/THIRD-PARTY-LICENSE` alongside the core license; this small file preserves Rollup contributor and Evan Wallace/esbuild MIT attributions for derived code. No independent upstream package version is invented for the derived snippets. |

The actual MIT files require retention of copyright/permission notices for their
covered copies/substantial portions. The selected notices preserve upstream wording;
they do not relicense the helpers. Vite's core section is copied byte-for-byte up to
the separate `Licenses of bundled dependencies` heading. The extraction fails if
the expected layout changes. Rolldown's two installed notice files are copied whole.

React's JSX runtime is part of the already-covered React package. The emitted
ts-fsrs/Dexie/React/PDF.js code and PDF resources retain their existing notices.
No browser import of TypeScript, Vitest, ESLint, Playwright, the native Rolldown
compiler or PDF.js's optional native Node canvas binding was identified. Their
whole development license trees are not added to the web distribution.

`npm run verify:release` checks the installed/locked helper versions, inventory,
16 selected notice files, their exact bytes and SW integrity entries. It also
checks production CSP. A future dependency or build-output change requires a new
provenance review; the selected-file count is not an exhaustive legal certification.

Runtime notice review status: **complete for the pinned RC0 helper scope**.
Liberation source distribution is tracked independently in
[LIBERATION-SOURCE.md](LIBERATION-SOURCE.md) and remains unresolved.
