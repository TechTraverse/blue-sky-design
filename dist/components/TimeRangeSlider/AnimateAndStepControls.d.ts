import { AnimationSpeed, PlayMode } from './timeSliderTypes';
import { Duration } from 'effect';
export declare const AnimateAndStepControls: ({ animationEnabled, setAnimationEnabled, playMode, setPlayMode, animationSpeed, setAnimationSpeed, animationDuration, setAnimationDuration, incrementStartDateTime, decrementStartDateTime, incrementAnimationSpeed, decrementAnimationSpeed, hideAnimationToggle, disabledAnimationTooltip, }: {
    animationEnabled?: boolean;
    setAnimationEnabled?: (enabled: boolean) => void;
    playMode?: PlayMode;
    setPlayMode?: (mode: PlayMode) => void;
    animationSpeed: AnimationSpeed;
    setAnimationSpeed?: (speed: AnimationSpeed) => void;
    animationDuration?: Duration.Duration;
    setAnimationDuration?: (duration: Duration.Duration) => void;
    incrementStartDateTime?: () => void;
    decrementStartDateTime?: () => void;
    incrementAnimationSpeed?: () => void;
    decrementAnimationSpeed?: () => void;
    hideAnimationToggle?: boolean;
    /** When provided, shows the animation toggle in a disabled state with this tooltip message */
    disabledAnimationTooltip?: string;
}) => import("react/jsx-runtime").JSX.Element;
