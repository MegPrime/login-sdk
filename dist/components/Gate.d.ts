import type { ReactNode } from 'react';
/** Renders children only once a session exists. */
export declare function SignedIn({ children }: {
    children: ReactNode;
}): import("react").JSX.Element | null;
/** Renders children only when there is no session. */
export declare function SignedOut({ children }: {
    children: ReactNode;
}): import("react").JSX.Element | null;
/** Renders children only while the session is still being resolved. */
export declare function AuthLoading({ children }: {
    children: ReactNode;
}): import("react").JSX.Element | null;
export interface ProtectProps {
    children: ReactNode;
    /** Shown to signed-out visitors. Give it `<SignIn />` for a gated page. */
    fallback?: ReactNode;
}
/** Gates a subtree behind a session. */
export declare function Protect({ children, fallback }: ProtectProps): import("react").JSX.Element;
//# sourceMappingURL=Gate.d.ts.map