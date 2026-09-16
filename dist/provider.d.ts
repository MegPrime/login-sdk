import { type ReactNode } from 'react';
import { EnforcerAuthClient } from './client';
import type { AuthStatus, EnforcerAccount, EnforcerAuthConfig, EnforcerAuthOptions, EnforcerSession } from './types';
export interface EnforcerAuthContextValue {
    status: AuthStatus;
    session: EnforcerSession | null;
    account: EnforcerAccount | null;
    /** Current access token, or null. Read it per request — it rotates. */
    accessToken: string | null;
    /** True while a token rotation is in flight. The user stays authenticated. */
    isRefreshing: boolean;
    /** True on the sign-in that created the account. */
    isNewAccount: boolean;
    /** GET /auth/config result, once bootstrapped. */
    authConfig: EnforcerAuthConfig | null;
    /** False when the tenant runs a non-native scheme, so OTP would 403. */
    otpAvailable: boolean;
    options: EnforcerAuthOptions;
    client: EnforcerAuthClient;
    /** Adopt a session the SDK did not create (SSR handoff, custom flow). */
    setSession: (session: EnforcerSession | null) => void;
    /** Adopt a session AND fire `onSignIn` — what the sign-in flow calls on success. */
    completeSignIn: (session: EnforcerSession) => void;
    /** Force a rotation now. Shares any in-flight attempt. */
    refresh: () => Promise<EnforcerSession | null>;
    /** The access token, rotated first if it is expired or nearly so. */
    getFreshToken: () => Promise<string | undefined>;
    signOut: () => Promise<void>;
}
export interface EnforcerAuthProviderProps extends EnforcerAuthOptions {
    children: ReactNode;
}
export declare function EnforcerAuthProvider({ children, ...options }: EnforcerAuthProviderProps): import("react").JSX.Element;
export declare function useEnforcerAuth(): EnforcerAuthContextValue;
//# sourceMappingURL=provider.d.ts.map