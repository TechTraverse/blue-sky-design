import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { SidePanel } from './SidePanel';

const meta = {
  component: SidePanel,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: '#1a1a2e', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Interactive example with a button to toggle the panel.
 * Click "Open Menu" to see the panel slide in from the left.
 */
export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '1rem 2rem',
            margin: '1rem',
            background: '#0076d6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Open Menu
        </button>
        <SidePanel
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Navigation"
        >
          <nav style={{ padding: '1rem' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {['Overview', 'Basemaps', 'Layers', 'Filters', 'Settings'].map((item) => (
                <li key={item}>
                  <button
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #374151',
                      color: '#f9fafb',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                    onClick={() => setIsOpen(false)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </SidePanel>
      </>
    );
  },
};

/**
 * Panel sliding in from the left side (default).
 */
export const LeftPosition: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Menu',
    position: 'left',
    children: (
      <div style={{ padding: '1rem', color: '#f9fafb' }}>
        <p>This panel slides in from the left side of the screen.</p>
        <p>It's the default position, ideal for navigation menus.</p>
      </div>
    ),
  },
};

/**
 * Panel sliding in from the right side.
 * Useful for settings panels or secondary navigation.
 */
export const RightPosition: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Settings',
    position: 'right',
    children: (
      <div style={{ padding: '1rem', color: '#f9fafb' }}>
        <p>This panel slides in from the right side of the screen.</p>
        <p>Useful for settings panels, filters, or detail views.</p>
      </div>
    ),
  },
};

/**
 * Panel without a title - just the close button in the header.
 */
export const NoTitle: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    position: 'left',
    children: (
      <div style={{ padding: '1rem', color: '#f9fafb' }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>Custom Header</h2>
        <p>When no title is provided, only the close button appears in the header.</p>
        <p>You can add your own header content in the children.</p>
      </div>
    ),
  },
};

/**
 * Panel with scrollable content.
 * Demonstrates that long content scrolls within the panel body.
 */
export const ScrollableContent: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Long Content',
    position: 'left',
    children: (
      <div style={{ padding: '1rem', color: '#f9fafb' }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            style={{
              padding: '1rem',
              marginBottom: '0.5rem',
              background: '#374151',
              borderRadius: '4px',
            }}
          >
            <strong>Item {i + 1}</strong>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>
              This is a content item demonstrating scrollable content within the panel.
            </p>
          </div>
        ))}
      </div>
    ),
  },
};

/**
 * Map controls example - similar to how it's used in the WLFS client.
 */
export const MapControls: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Map Controls',
    position: 'left',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #374151',
            background: '#1f2937',
          }}
        >
          {['Overview', 'Basemaps', 'Layers', 'Filters'].map((tab, i) => (
            <button
              key={tab}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                background: i === 2 ? '#374151' : 'transparent',
                border: 'none',
                borderBottom: i === 2 ? '2px solid #0076d6' : '2px solid transparent',
                color: '#f9fafb',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, padding: '1rem', color: '#f9fafb', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Active Layers</h3>
          {['NGFS Scene East CONUS', 'GOES-East Fire Temperature', 'GOES-East GeoColor'].map(
            (layer) => (
              <div
                key={layer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: '#374151',
                  borderRadius: '4px',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: '#4b5563',
                    borderRadius: '4px',
                  }}
                />
                <span style={{ flex: 1 }}>{layer}</span>
              </div>
            )
          )}
        </div>
      </div>
    ),
  },
};

/**
 * Closed state - panel is not visible.
 * Useful for testing the closed state behavior.
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    title: 'Hidden Panel',
    children: <div>This content is not visible when closed.</div>,
  },
};
