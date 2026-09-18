# Continuous integration and the browser release gate

The proposed workflow is `.github/workflows/ci.yml`. It runs on pull requests to `main`, pushes to `main`, and manual dispatch. It has read-only repository permission, does not persist checkout credentials, and has no deployment action, credential or release publication step. Checkout/setup-node are pinned to reviewed official v6 commit SHAs. npm's download cache is keyed by the lockfile; `node_modules` and browser profiles are not cached.

One Ubuntu 24.04 job uses Node 24.21.0, `npm ci`, typecheck, lint, all unit/integration tests, build, exact release-notice verification, `npm audit`, and Git whitespace/generated tracked-change checks. Audit deliberately fails on any vulnerability report; registry/network failure is not a passing audit. Dependency updates require a fresh reviewed lockfile and rerunning gates, not `audit fix --force` in CI.

## Browser decision

Playwright supports GitHub Actions with a normal Linux install (`npx playwright install --with-deps chromium`) and no WSL wrapper; see the [official guide](https://playwright.dev/docs/ci-intro). However, this project's complete suite includes headed fullscreen/window-blur checks and a native-visibility harness that verifies real hidden-window state. Its currently accepted environment is Ubuntu WSL with WSLg. A hosted Xvfb/window-manager harness has not been validated, so adding it now would claim coverage we have not demonstrated.

Consequently **this workflow does not run browser tests**. A green workflow is only the core gate. The complete documented WSL suite, two-build update fixture checks, and separate Firefox smoke remain mandatory before release (see [TEST-ENVIRONMENT.md](TEST-ENVIRONMENT.md)). No tests were skipped or deleted to accommodate CI. A future browser job must validate real focus/visibility behavior, use supported Playwright installation, keep sandboxing enabled, and report its actual coverage before replacing this manual gate.

Local syntax and command validation for M4b is recorded in [M4B-REPORT.md](M4B-REPORT.md). A local run is not a GitHub-hosted run; the workflow has not been pushed or executed on GitHub during M4b.
