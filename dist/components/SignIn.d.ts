import { type CSSProperties, type ReactNode } from 'react';
import { type SignInFlow } from '../useSignInFlow.js';
import type { EnforcerAppearance, EnforcerLabels } from '../types.js';
export interface SignInProps {
    appearance?: EnforcerAppearance;
    labels?: EnforcerLabels;
    /** Rendered above the form — a headline, legal copy, an SSO button. */
    header?: ReactNode;
    /** Rendered below the form — terms links, a support link. */
    footer?: ReactNode;
    /** Shown in place of the form once authenticated. Default: a small signed-in card. */
    signedInFallback?: ReactNode;
    /** Submit as soon as the last digit is typed. Default true. */
    autoSubmit?: boolean;
    className?: string;
    style?: CSSProperties;
    /** Escape hatch: render your own UI against the flow state. */
    children?: (flow: SignInFlow) => ReactNode;
}
/**
 * The drop-in sign-in card: method tabs → identifier → 6-digit code → session.
 * Everything it does is available headlessly via `useSignInFlow()`.
 */
export declare function SignIn({ appearance, labels: labelOverrides, header, footer, signedInFallback, autoSubmit, className, style, children, }: SignInProps): import("react").JSX.Element;
//# sourceMappingURL=SignIn.d.ts.map