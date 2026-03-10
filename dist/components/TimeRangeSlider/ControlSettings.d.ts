import { AnimationSpeed } from './timeSliderTypes';
import { Duration } from 'effect';
export declare const ControlSettings: ({ animationEnabled, animationSpeed, setAnimationSpeed, animationDuration, setAnimationDuration, disabled }: {
    animationEnabled: boolean;
    animationSpeed?: AnimationSpeed;
    setAnimationSpeed?: (speed: AnimationSpeed) => void;
    animationDuration?: Duration.Duration;
    setAnimationDuration?: (duration: Duration.Duration) => void;
    disabled?: boolean;
}) => import("react/jsx-runtime").JSX.Element | null;
