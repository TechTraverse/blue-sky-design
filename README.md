# blue-sky-design

React component library for the WLFS map client, published to the NESDIS GitLab
package registry as `@wlfs/blue-sky-design`.

## Installing

The package lives in this project's npm registry. The group endpoint for
`dissemination/wlfs/client` serves it alongside the other `@wlfs` packages. A
consumer's `.npmrc` needs the scope mapping and a token with `read_api` for both
the group endpoint and the project paths, since package tarballs are served from
each project's own path:

```ini
@wlfs:registry=https://git.services.nesdis.noaa.gov/api/v4/groups/11049/-/packages/npm/
//git.services.nesdis.noaa.gov/api/v4/groups/11049/-/packages/npm/:_authToken=${NPM_TOKEN}
//git.services.nesdis.noaa.gov/api/v4/projects/:_authToken=${NPM_TOKEN}
```

Depend on it by its package name and import from that name:

```json
"@wlfs/blue-sky-design": "0.5.0"
```

```ts
import { TimeRangeSlider } from '@wlfs/blue-sky-design';
```

Don't install it under an npm alias (`"bluesky": "npm:@wlfs/blue-sky-design@..."`).
Yarn 1 decides registry auth for a lockfile tarball by the unscoped alias name, so
a frozen-lockfile install in CI gets a 404.

## Developing

| Command | What it does |
| --- | --- |
| `yarn storybook` | Storybook on port 6006 |
| `yarn dev` | Vite playground (`src/main.tsx`) |
| `yarn lint` | ESLint |
| `yarn test` | Vitest unit tests (`src/**/*.test.ts`) |
| `yarn build` | Type check (`tsconfig.lib.json`) and library build into `dist/` |

Everything consumers can use is exported from `src/lib.ts`. `react`, `react-dom`,
`maplibre-gl` and `effect` are externals; `effect` and `maplibre-gl` are peer
dependencies.

To try changes in wlfs-client before releasing, check this repo out next to it and
run `yarn dev:bluesky-local` there, which compiles the library from this checkout.

## Releasing

1. Bump `version` in `package.json` in your merge request.
2. Merge to `main`.
3. The pipeline builds, tests and publishes that version. A merge that leaves the
   version unchanged skips the publish, since that version is already in the
   registry.
4. Bump the version in wlfs-client and run `yarn install` there.

`dist/` is built in CI; don't commit rebuilt output.
