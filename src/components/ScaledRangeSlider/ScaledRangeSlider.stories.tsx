import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ScaledRangeSlider } from './ScaledRangeSlider';
import type { ScaledRangeSliderProps } from './types';

const meta = {
  title: 'Components/ScaledRangeSlider',
  component: ScaledRangeSlider,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    scale: {
      control: 'select',
      options: ['linear', 'cubic', 'quadratic', 'logarithmic'],
    },
    inputPosition: {
      control: 'select',
      options: ['start', 'end'],
    },
    theme: {
      control: 'select',
      options: ['light', 'dark'],
    },
  },
} satisfies Meta<typeof ScaledRangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

// Controlled wrapper for interactive stories
const ControlledSlider = (props: ScaledRangeSliderProps) => {
  const [value, setValue] = useState(props.value);
  return (
    <div style={{ padding: '20px', background: props.theme === 'light' ? '#f5f5f5' : '#1a1a1a' }}>
      <ScaledRangeSlider
        {...props}
        value={value}
        onChange={setValue}
        onChangeCommitted={(v) => {
          console.log('Committed:', v);
          props.onChangeCommitted?.(v);
        }}
      />
      <p style={{ color: props.theme === 'light' ? '#000' : '#fff', marginTop: '16px' }}>
        Value: {Math.round(value)}
      </p>
    </div>
  );
};

/** Default linear slider */
export const Linear: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    scale: 'linear',
    label: 'Linear Scale',
    theme: 'dark',
  },
  render: (args) => <ControlledSlider {...args} />,
};

/** Light theme variant */
export const LinearLight: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    scale: 'linear',
    label: 'Linear Scale (Light)',
    theme: 'light',
  },
  render: (args) => <ControlledSlider {...args} />,
};

/** Cubic scale matching FRP slider behavior */
export const CubicFRP: Story = {
  args: {
    value: 0,
    min: 0,
    max: 2000,
    scale: 'cubic',
    label: 'FRP (MW)',
    theme: 'dark',
    colorStops: [
      { value: 0, color: 'rgba(255, 255, 0, 1)' },
      { value: 10, color: 'rgba(255, 165, 0, 1)' },
      { value: 100, color: 'rgba(255, 0, 0, 1)' },
      { value: 1000, color: 'rgba(139, 0, 0, 1)' },
      { value: 2000, color: 'rgba(255, 0, 255, 1)' },
    ],
    marks: [
      { value: 0, label: '0' },
      { value: 10, label: '10' },
      { value: 100, label: '100' },
      { value: 1000, label: '1000' },
      { value: 2000, label: '2000' },
    ],
  },
  render: (args) => <ControlledSlider {...args} />,
};

/** Custom scale function (power of 2.5) */
export const CustomScale: Story = {
  args: {
    value: 0,
    min: 0,
    max: 1000,
    scale: {
      scale: (x: number) => Math.pow(x, 2.5),
      inverse: (x: number) => Math.pow(x, 1 / 2.5),
    },
    label: 'Custom Power Scale',
    theme: 'dark',
  },
  render: (args) => <ControlledSlider {...args} />,
};

/** Without numeric input */
export const SliderOnly: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    showInput: false,
    scale: 'linear',
    label: 'Slider Only',
    theme: 'dark',
  },
  render: (args) => <ControlledSlider {...args} />,
};

/** Input at end position */
export const InputAtEnd: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    inputPosition: 'end',
    scale: 'linear',
    label: 'Input at End',
    theme: 'dark',
  },
  render: (args) => <ControlledSlider {...args} />,
};

/** Disabled state */
export const Disabled: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    disabled: true,
    scale: 'linear',
    label: 'Disabled Slider',
    theme: 'dark',
  },
};

/** Demonstrates onChange vs onChangeCommitted timing */
export const EventTiming: Story = {
  render: () => {
    const [value, setValue] = useState(50);
    const [lastCommit, setLastCommit] = useState(50);
    const [changeCount, setChangeCount] = useState(0);

    return (
      <div style={{ padding: '20px', background: '#1a1a1a' }}>
        <ScaledRangeSlider
          value={value}
          min={0}
          max={100}
          scale="linear"
          onChange={(v) => {
            setValue(v);
            setChangeCount((c) => c + 1);
          }}
          onChangeCommitted={setLastCommit}
          label="Drag to see event timing"
          theme="dark"
        />
        <div style={{ color: '#fff', marginTop: '16px' }}>
          <p>Current: {Math.round(value)}</p>
          <p>Last committed: {Math.round(lastCommit)}</p>
          <p>onChange count: {changeCount}</p>
        </div>
      </div>
    );
  },
};

/** Logarithmic scale for wide ranges */
export const Logarithmic: Story = {
  args: {
    value: 1,
    min: 0,
    max: 10000,
    scale: 'logarithmic',
    label: 'Logarithmic Scale',
    theme: 'dark',
    marks: [
      { value: 0, label: '0' },
      { value: 10, label: '10' },
      { value: 100, label: '100' },
      { value: 1000, label: '1k' },
      { value: 10000, label: '10k' },
    ],
  },
  render: (args) => <ControlledSlider {...args} />,
};

/** Auto-generated marks from color stops */
export const AutoMarks: Story = {
  args: {
    value: 50,
    min: 0,
    max: 200,
    scale: 'linear',
    label: 'Auto Marks from Colors',
    theme: 'dark',
    colorStops: [
      { value: 0, color: '#4caf50', label: 'Low' },
      { value: 50, color: '#ffeb3b', label: 'Med' },
      { value: 100, color: '#ff9800', label: 'High' },
      { value: 200, color: '#f44336', label: 'Critical' },
    ],
    marks: 'auto',
  },
  render: (args) => <ControlledSlider {...args} />,
};
