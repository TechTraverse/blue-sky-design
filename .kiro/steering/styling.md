---
inclusion: fileMatch
fileMatchPattern: ["src/**/*.css"]
---

# Styling

- Each component imports its own CSS file; `vite-plugin-lib-inject-css` injects it with the component in the library build.
- Components read CSS variables with a **light-theme fallback**, so a consumer themes them by setting variables rather than overriding classes:

  ```css
  color: var(--layer-row-text, #1f2937);
  ```

  Add a variable with a fallback for any color a consumer may need to change in dark mode, and name it after the component (`--layer-row-*`, `--legend-*`).
- The time slider takes a `theme` prop and puts `dark-theme` or `light-theme` on its root; its dark rules are scoped under `.dark-theme`.
- Scope selectors to the component's own class names. Don't style bare elements or global classes; the CSS ships into the consumer's page.
- Check both themes in Storybook before calling a style change done.
