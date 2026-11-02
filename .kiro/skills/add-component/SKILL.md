---
name: add-component
description: Add a new React component to the blue-sky-design library and publish it for wlfs-client. Use when creating a component, exporting a new component or type from the library, or making a component available to the map client.
---

# Add a component

## 1. Folder

Create `src/components/<Name>/`:

```
<Name>/
├── <Name>.tsx          # component + exported <Name>Props
├── <Name>.css          # imported by <Name>.tsx
├── index.ts            # re-exports
├── <Name>.stories.tsx  # Storybook
└── <name>.test.ts      # optional: logic and markup tests
```

`index.ts`:

```ts
export { Name } from './Name';
export type { NameProps } from './Name';
```

## 2. Component

- Export a typed props interface. Make new props optional with sensible defaults.
- Import the CSS file at the top of the component.
- Read colors from CSS variables with light-theme fallbacks (`var(--name-text, #1f2937)`), and accept `className`.
- Move non-trivial logic (formatting, math, reducers) into a plain `.ts` module next to it so it can be tested without a DOM.
- Don't import a second copy of `react`, `effect` or `maplibre-gl` (they're externals).

## 3. Export it

Add it to `src/lib.ts`, values and types separately:

```ts
// Name exports
export { Name } from './components/Name';
export type { NameProps } from './components/Name';
```

## 4. Story

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Name } from './Name';

const meta: Meta<typeof Name> = {
  title: 'Components/Name',
  component: Name,
  tags: ['autodocs'],
};
export default meta;

export const Default: StoryObj<typeof Name> = { args: {} };
```

Add stories for the main states and the dark theme. Check them with `yarn storybook`.

## 5. Test

`<name>.test.ts` (node environment, `.ts` only):

```ts
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Name } from './Name';

const render = (props: Parameters<typeof Name>[0]) => renderToStaticMarkup(createElement(Name, props));
```

## 6. Release

- Bump `version` in `package.json` in the same MR (minor for a new component or a breaking change while 0.x, patch for a fix).
- After the MR merges and CI publishes, bump the version in wlfs-client and `yarn install` there.

## Checklist

- [ ] `yarn lint` passes
- [ ] `yarn test` passes
- [ ] `yarn build` passes (it type checks)
- [ ] Exported from `src/lib.ts`
- [ ] Story renders in light and dark
- [ ] `version` bumped
