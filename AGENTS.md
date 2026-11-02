# AGENTS.md

Guidance for coding agents working in this repository. Topic-specific context lives in `.kiro/steering/` (loaded by file pattern) and reusable procedures in `.kiro/skills/`.

## Project

blue-sky-design ("bluesky") is the React component library behind the WLFS (Wildland Fire Satellite) map client: time slider, map wrapper, layer controls, legends, sliders and banners. It is published as `@wlfs/blue-sky-design` to this project's GitLab npm registry.

- The main consumer is `wlfs-client` (usually checked out next to this repo). It depends on the package by name and pins a version.
- Components are browsed and developed in Storybook (`*.stories.tsx` next to each component).

## Repository rules

- Never commit directly to `main`. Make a feature branch for every change and open a GitLab MR. MRs use GitLab's merge-commit method; don't squash.
- Never commit secrets or tokens.
- Don't commit rebuilt `dist/` output; CI builds and packs it.

## Commands

Package manager is **yarn** (v1).

| Command | What it does |
| --- | --- |
| `yarn storybook` | Storybook on port 6006 |
| `yarn dev` | Vite playground (`src/main.tsx`, `src/App.tsx`) |
| `yarn lint` | ESLint on the repo |
| `yarn test` | Vitest (`src/**/*.test.ts`, node environment) |
| `yarn build` | `tsc -p tsconfig.lib.json`, then the Vite library build into `dist/` |

- Unlike wlfs-client, `yarn build` type checks: a type error fails the build and CI.
- Before calling work done: `yarn lint`, `yarn test` and `yarn build` all pass.

## Public API

- Everything consumers can use is exported from `src/lib.ts`. A new component or type isn't public until it's exported there.
- Treat exported names, prop types and `MapClassWrapper` methods as public API. wlfs-client's build preflight checks specific signatures in the built `dist/**/*.d.ts` files, so renaming or narrowing them breaks the consumer.
- Prefer additive, optional props. For a breaking change, bump the minor version (the package is 0.x) and say what consumers must change in the MR description.
- `react`, `react-dom`, `maplibre-gl` and `effect` are externals (`vite.config.ts`) and `effect` / `maplibre-gl` are peer dependencies. Never bundle them: duplicate copies break Effect `Context.Tag` identity and MapLibre `instanceof` checks in the consumer. A new library shared with the consumer goes in the externals list too, and in the consumer's Vite `dedupe` list.
- `package.json` `exports` maps `./src/components/LayerControl/LayerControl.css` to `dist/lib.css` for a consumer deep import. Keep that entry.

## Releasing

1. Bump `version` in `package.json` in your MR (semver; minor for breaking changes while 0.x).
2. Merge to `main`.
3. CI lints, tests, builds, packs and publishes that version. A merge that leaves the version unchanged skips the publish.
4. Bump the version in wlfs-client and run `yarn install` there.

## Conventions

- One folder per component under `src/components/<Name>/`: `<Name>.tsx`, a CSS file, `index.ts` re-exporting the component and its props type, `<Name>.stories.tsx`, and `*.test.ts` for logic. See the `add-component` skill.
- Effect idioms where the code already uses them: `Data.TaggedEnum` variants matched with `ts-pattern` `match(...).exhaustive()`, `Effect` for map operations, `effect`'s `DateTime` / `Duration` in the time slider.
- Pull pure logic (stepping, labels, clamping, reducers) out of components into plain modules so it can be unit tested without a DOM.
- CSS is imported by each component and injected by `vite-plugin-lib-inject-css`. Styling rules are in `.kiro/steering/styling.md`.
