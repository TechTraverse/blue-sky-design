import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useCallback } from 'react';
import { DurationSlider } from './DurationSlider';
import type { DurationSliderProps } from './types';
import { MS_PER_UNIT } from './durationUtils';

const meta: Meta<typeof DurationSlider> = {
  title: 'Components/DurationSlider',
  component: DurationSlider,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    rangePreset: {
      control: 'select',
      options: [undefined, '0-1h', '0-6h', '0-24h', '0-7d', '0-30d'],
    },
    scale: {
      control: 'select',
      options: ['linear', 'cubic', 'quadratic', 'logarithmic'],
    },
    showInput: { control: 'boolean' },
    inputPosition: {
      control: 'radio',
      options: ['start', 'end'],
    },
    disabled: { control: 'boolean' },
    theme: {
      control: 'radio',
      options: ['dark', 'light'],
    },
    defaultUnit: {
      control: 'select',
      options: ['ms', 's', 'm', 'h', 'd'],
    },
    minDisplayUnit: {
      control: 'select',
      options: ['ms', 's', 'm', 'h', 'd'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DurationSlider>;

// Controlled wrapper for interactive stories
const ControlledDurationSlider = (props: DurationSliderProps) => {
  const [value, setValue] = useState(props.value);

  const handleChange = useCallback((newValue: number) => {
    setValue(newValue);
    props.onChange?.(newValue);
  }, [props]);

  const handleCommit = useCallback((newValue: number) => {
    setValue(newValue);
    props.onChangeCommitted?.(newValue);
  }, [props]);

  return (
    <div style={{ padding: '20px', background: props.theme === 'light' ? '#f5f5f5' : '#1a1a1a' }}>
      <DurationSlider
        {...props}
        value={value}
        onChange={handleChange}
        onChangeCommitted={handleCommit}
      />
    </div>
  );
};

/**
 * Default configuration with 0-1 hour range and auto marks.
 */
export const Default: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 15 * MS_PER_UNIT.m, // 15 minutes
    rangePreset: '0-1h',
    marks: 'auto',
    theme: 'dark',
  },
};

/**
 * Long duration range (0-7 days) with cubic scale for better UX
 * when selecting both short and long durations.
 */
export const LongDuration: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 2 * MS_PER_UNIT.d, // 2 days
    rangePreset: '0-7d',
    scale: 'cubic',
    marks: 'auto',
    theme: 'dark',
  },
};

/**
 * Using a preset range for common use cases.
 */
export const PresetRange: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 3 * MS_PER_UNIT.h, // 3 hours
    rangePreset: '0-6h',
    marks: 'auto',
    theme: 'dark',
  },
};

/**
 * Custom marks with string-based duration values.
 */
export const CustomMarks: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 30 * MS_PER_UNIT.m,
    rangePreset: '0-1h',
    marks: [
      { value: '0s', label: 'Off' },
      { value: '15m', label: '15m' },
      { value: '30m', label: '30m' },
      { value: '45m', label: '45m' },
      { value: '1h', label: '1h' },
    ],
    theme: 'dark',
  },
};

/**
 * Input positioned at the end of the slider.
 */
export const InputAtEnd: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 20 * MS_PER_UNIT.m,
    rangePreset: '0-1h',
    marks: 'auto',
    inputPosition: 'end',
    theme: 'dark',
  },
};

/**
 * Slider without the text input.
 */
export const NoInput: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 30 * MS_PER_UNIT.m,
    rangePreset: '0-1h',
    marks: 'auto',
    showInput: false,
    theme: 'dark',
  },
};

/**
 * Disabled state.
 */
export const Disabled: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 45 * MS_PER_UNIT.m,
    rangePreset: '0-1h',
    marks: 'auto',
    disabled: true,
    theme: 'dark',
  },
};

/**
 * Light theme variant.
 */
export const LightTheme: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 30 * MS_PER_UNIT.m,
    rangePreset: '0-1h',
    marks: 'auto',
    theme: 'light',
  },
};

/**
 * Demonstrates the difference between onChange and onChangeCommitted.
 * - onChange fires continuously during drag (for live preview)
 * - onChangeCommitted fires only on release (for committing changes)
 */
export const EventTiming: Story = {
  render: (args) => {
    const [value, setValue] = useState(30 * MS_PER_UNIT.m);
    const [changeCount, setChangeCount] = useState(0);
    const [commitCount, setCommitCount] = useState(0);
    const [lastChange, setLastChange] = useState<number | null>(null);
    const [lastCommit, setLastCommit] = useState<number | null>(null);

    const formatMs = (ms: number | null) => {
      if (ms === null) return '-';
      const minutes = Math.round(ms / MS_PER_UNIT.m);
      return `${minutes}m`;
    };

    return (
      <div style={{ padding: '20px', background: args.theme === 'light' ? '#f5f5f5' : '#1a1a1a' }}>
        <DurationSlider
          {...args}
          value={value}
          onChange={(v) => {
            setValue(v);
            setChangeCount((c) => c + 1);
            setLastChange(v);
          }}
          onChangeCommitted={(v) => {
            setValue(v);
            setCommitCount((c) => c + 1);
            setLastCommit(v);
          }}
        />
        <div
          style={{
            marginTop: '24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            color: args.theme === 'light' ? '#000' : '#fff',
          }}
        >
          <div>
            <strong>onChange</strong>
            <div>Count: {changeCount}</div>
            <div>Last: {formatMs(lastChange)}</div>
          </div>
          <div>
            <strong>onChangeCommitted</strong>
            <div>Count: {commitCount}</div>
            <div>Last: {formatMs(lastCommit)}</div>
          </div>
        </div>
      </div>
    );
  },
  args: {
    rangePreset: '0-1h',
    marks: 'auto',
    theme: 'dark',
  },
};

/**
 * 30-day range showing the cubic scale benefit for wide ranges.
 */
export const ThirtyDayRange: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 5 * MS_PER_UNIT.d,
    rangePreset: '0-30d',
    scale: 'cubic',
    marks: 'auto',
    theme: 'dark',
  },
};

/**
 * Custom min/max without using a preset.
 */
export const CustomRange: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 2 * MS_PER_UNIT.h,
    min: MS_PER_UNIT.h, // 1 hour min
    max: 12 * MS_PER_UNIT.h, // 12 hours max
    marks: [
      { value: '1h' },
      { value: '3h' },
      { value: '6h' },
      { value: '9h' },
      { value: '12h' },
    ],
    theme: 'dark',
  },
};

/**
 * Linear scale for narrow ranges where cubic compression isn't needed.
 */
export const LinearScale: Story = {
  render: (args) => <ControlledDurationSlider {...args} />,
  args: {
    value: 30 * MS_PER_UNIT.s,
    min: 0,
    max: MS_PER_UNIT.m, // 0-60 seconds
    scale: 'linear',
    marks: [
      { value: '0s', label: '0' },
      { value: '15s', label: '15s' },
      { value: '30s', label: '30s' },
      { value: '45s', label: '45s' },
      { value: '60s', label: '60s' },
    ],
    minDisplayUnit: 's',
    theme: 'dark',
  },
};
