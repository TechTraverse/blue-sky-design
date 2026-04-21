import { ColorStop } from './types';
export interface GradientBarProps {
    colorStops: ColorStop[];
    /** Hard-edged blocks (true) or smooth gradient (false). Default: true */
    discrete?: boolean;
    className?: string;
}
export declare const GradientBar: ({ colorStops, discrete, className, }: GradientBarProps) => import("react/jsx-runtime").JSX.Element | null;
