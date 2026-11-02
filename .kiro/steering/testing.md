---
inclusion: fileMatch
fileMatchPattern: ["**/*.test.ts", "vitest.config.ts", "**/*.stories.tsx"]
---

# Testing

- `yarn test` runs `src/**/*.test.ts` in Vitest's **node** environment, with no DOM. Tests sit next to the code they cover. CI runs them as `run_tests`.
- Test files are `.ts`, not `.tsx`. Render components with `createElement` and `renderToStaticMarkup`, then assert on the markup:

  ```ts
  import { createElement } from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';

  const render = (props: BannerProps) => renderToStaticMarkup(createElement(Banner, props));
  expect(render({ dismissible: true })).toContain('aria-label="Dismiss banner"');
  ```

- Interaction logic belongs in plain modules (reducers, stepping, formatting) tested directly, rather than through simulated events.
- `MapClassWrapper` is tested against a Proxy-recorder stub map (see `mapService.test.ts`).
- Test and story files are excluded from the published package (`files` in `package.json`).

## Stories

- Every public component has a `<Name>.stories.tsx`. New stories use `title: 'Components/<Name>'` and `tags: ['autodocs']`, like most existing ones.
- Cover the main states (empty, loading, error, dark theme) as separate stories.
