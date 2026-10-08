# blue-sky-design

React component library for the WLFS map client, published to the NESDIS GitLab
package registry as `@wlfs/blue-sky-design`.

## Installing

The package lives in this project's npm registry. The group endpoint for
`dissemination/wlfs/client` serves it alongside the other `@wlfs` packages, so a
consumer's `.npmrc` needs one scope mapping and a token with `read_api`:

```ini
@wlfs:registry=https://git.services.nesdis.noaa.gov/api/v4/groups/11049/-/packages/npm/
//git.services.nesdis.noaa.gov/api/v4/groups/11049/-/packages/npm/:_authToken=${NPM_TOKEN}
```

wlfs-client imports it as `bluesky`, so it installs under an alias:

```json
"bluesky": "npm:@wlfs/blue-sky-design@0.1.0"
```

## Releasing

1. Bump `version` in `package.json` in your merge request.
2. Merge to `main`.
3. The pipeline builds, tests and publishes that version. A merge that leaves the
   version unchanged skips the publish, since that version is already in the
   registry.

`dist/` is built in CI; don't commit rebuilt output.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
