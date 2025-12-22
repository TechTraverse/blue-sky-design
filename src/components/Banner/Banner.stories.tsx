import type { Meta, StoryObj } from '@storybook/react-vite';

import { Banner } from './Banner';

const meta = {
  component: Banner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Banner>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Beta site disclaimer banner for the Wildland Fire Data Portal.
 * This is a warning variant with a collapsible disclaimer message.
 */
export const BetaSiteDisclaimer: Story = {
  args: {
    variant: 'warning',
    title: 'Welcome to the Wildland Fire Data Portal Beta Site',
    message: 'This site is still in development. While reliability is high, outages (including unannounced outages) will occasonally occur. Any user implicitly agrees to use the services and data available through this website as is with no warranty issued or implied and should be used for informational purposes only. Any use of this data for decision making processes is done at the sole risk of the end user.',
    collapsible: true,
    defaultCollapsed: false,
  },
};

/**
 * Simple info banner that is not collapsible.
 * Useful for general informational messages.
 */
export const SimpleInfo: Story = {
  args: {
    variant: 'info',
    title: 'System Maintenance Scheduled',
    message: 'Our systems will undergo scheduled maintenance on December 25, 2025 from 2:00 AM to 4:00 AM EST. Limited functionality may be available during this time.',
    collapsible: false,
  },
};

/**
 * Official government site banner with collapsible content.
 * Can be used to identify a site as official government property.
 */
export const OfficialGovernmentSite: Story = {
  args: {
    variant: 'official',
    title: 'An official website of the United States government',
    collapsible: true,
    defaultCollapsed: true,
    children: (
      <div>
        <p>
          <strong>Official websites use .gov</strong><br />
          A <strong>.gov</strong> website belongs to an official government organization in the United States.
        </p>
        <p>
          <strong>Secure .gov websites use HTTPS</strong><br />
          A <strong>lock</strong> or <strong>https://</strong> means you've safely connected to the .gov website.
          Share sensitive information only on official, secure websites.
        </p>
      </div>
    ),
  },
};

/**
 * Warning banner for critical alerts.
 * Non-collapsible to ensure visibility.
 */
export const CriticalWarning: Story = {
  args: {
    variant: 'warning',
    title: 'Active Wildfire Alert',
    message: 'There are currently active wildfires in your area. Please follow local evacuation orders and stay informed through official channels.',
    collapsible: false,
  },
};

/**
 * Info banner with custom content using children.
 * Demonstrates flexibility for complex content.
 */
export const CustomContent: Story = {
  args: {
    variant: 'info',
    collapsible: true,
    defaultCollapsed: false,
    children: (
      <div>
        <p><strong>New Features Available:</strong></p>
        <ul>
          <li>Enhanced fire perimeter mapping with real-time updates</li>
          <li>Historical data comparison tools</li>
          <li>Improved mobile responsiveness</li>
          <li>Export functionality for data analysis</li>
        </ul>
        <p>
          <a href="#learn-more" style={{ color: '#005ea2', textDecoration: 'underline' }}>
            Learn more about these features
          </a>
        </p>
      </div>
    ),
  },
};

/**
 * Minimal banner with just a title.
 */
export const MinimalBanner: Story = {
  args: {
    variant: 'official',
    title: 'Government Data Portal',
    collapsible: false,
  },
};

/**
 * Data disclaimer banner - collapsed by default.
 */
export const DataDisclaimer: Story = {
  args: {
    variant: 'warning',
    title: 'Data Usage Disclaimer',
    collapsible: true,
    defaultCollapsed: true,
    message: 'The data provided through this portal is for informational purposes only. While we strive for accuracy, no warranty is provided. Users assume all risks associated with the use of this data for decision-making purposes.',
  },
};
