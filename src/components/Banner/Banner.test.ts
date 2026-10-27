import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Banner, type BannerProps } from './Banner';

const render = (props: BannerProps) => renderToStaticMarkup(createElement(Banner, props));

const rootClasses = (html: string) => {
  const match = html.match(/^<div class="([^"]*)"/);
  return (match?.[1] ?? '').split(/\s+/).filter(Boolean);
};

describe('Banner', () => {
  it('renders no dismiss button by default', () => {
    expect(render({ title: 'Beta' })).not.toContain('bannerDismiss');
  });

  it('renders a labelled dismiss button when dismissible', () => {
    const html = render({ title: 'Beta', dismissible: true });
    expect(html).toContain('class="bannerDismiss"');
    expect(html).toContain('aria-label="Dismiss Beta"');
  });

  it('falls back to a generic dismiss label without a title', () => {
    expect(render({ dismissible: true })).toContain('aria-label="Dismiss banner"');
  });

  it('adds the compact class when requested', () => {
    expect(rootClasses(render({ compact: true }))).toContain('compact');
  });

  it('shows the summary next to the title, collapsed or not', () => {
    const summary = 'Data may be delayed.';
    for (const collapsible of [true, false]) {
      const html = render({ title: 'Beta', summary, collapsible, defaultCollapsed: true });
      expect(html).toContain(`<span class="bannerSummary"> — ${summary}</span>`);
    }
  });

  it('names the region after the title', () => {
    expect(render({ title: 'Beta notice' })).toContain('aria-label="Beta notice"');
    expect(render({})).toContain('aria-label="Banner"');
  });

  it('points the toggle at the expanded content by a unique id', () => {
    const html = render({ title: 'Beta', message: 'Details', collapsible: true, defaultCollapsed: false });
    const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(controls).toBeTruthy();
    expect(controls).not.toBe('banner-content');
    expect(html).toContain(`id="${controls}"`);
  });

  it('keeps the existing classes when no new props are set', () => {
    expect(rootClasses(render({ variant: 'warning' }))).toEqual(['banner', 'warning']);
  });
});
