export interface ButtonProps {
    /** Is this the principal call to action on the page? */
    primary?: boolean;
    /** What classes to apply */
    className?: string;
    /** How large should the button be? */
    size?: 'small' | 'medium' | 'large';
    /** Button contents */
    children?: React.ReactNode;
    /** Optional click handler */
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
/** Primary UI component for user interaction */
export declare const Button: ({ primary, size, className, children, ...props }: ButtonProps) => import("react/jsx-runtime").JSX.Element;
