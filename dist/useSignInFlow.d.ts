import { EnforcerAuthError } from './errors.js';
import { type AuthMethod, type EmailStatus, type EnforcerSession } from './types.js';
export type SignInStep = 'identifier' | 'code';
export interface SignInFlow {
    step: SignInStep;
    method: AuthMethod;
    /** Methods the provider was configured with, in tab order. */
    methods: AuthMethod[];
    setMethod: (method: AuthMethod) => void;
    /** The raw value in the email/phone field. */
    identifier: string;
    setIdentifier: (value: string) => void;
    /** What the code was actually sent to (normalized). Set once `step` is 'code'. */
    sentTo: string | null;
    code: string;
    setCode: (value: string) => void;
    /** Digits expected in the code. */
    otpLength: number;
    /** `/auth/email-status` result, when `checkEmailStatus` is on. */
    emailStatus: EmailStatus | null;
    isSending: boolean;
    isVerifying: boolean;
    error: EnforcerAuthError | null;
    /** Seconds until "Resend" re-enables; 0 when it is available. */
    resendIn: number;
    /** True when the identifier passes local validation for the current method.
     *  Wallet/SIWE has no identifier field — this is true whenever a sign-in
     *  can be attempted (the click then reports a missing wallet). */
    canSubmitIdentifier: boolean;
    canSubmitCode: boolean;
    /** True when an EIP-1193 provider is injected (or `walletProvider` was passed). */
    walletAvailable: boolean;
    /** Address last returned by `eth_requestAccounts`, if any. */
    connectedAddress: string | null;
    /** True while the wallet popup / SIWE login is in flight. */
    isConnecting: boolean;
    /** Sends a code. Advances to 'code' on success. For wallet methods, signs in. */
    sendCode: () => Promise<void>;
    /** Re-sends without leaving the code step. No-op while `resendIn > 0`. */
    resendCode: () => Promise<void>;
    /** Verifies and, on success, commits the session and fires `onSignIn`. */
    verifyCode: (override?: string) => Promise<EnforcerSession | null>;
    /**
     * Connects the browser wallet, signs an EIP-4361 message, and logs in with
     * `provider: 'siwe'`. Same session persistence as OTP.
     */
    signInWithWallet: () => Promise<EnforcerSession | null>;
    /** Back to the identifier step, keeping what was typed. */
    editIdentifier: () => void;
    /** Full reset to the first step. */
    reset: () => void;
}
/** Keeps digits and a leading +, then applies the default country code. */
export declare function normalizePhone(input: string, defaultCountryCode?: string): string;
/**
 * The whole email/phone OTP + SIWE state machine, with no markup. Use this to
 * build a custom sign-in UI; `<SignIn />` is a consumer of exactly this hook.
 */
export declare function useSignInFlow(): SignInFlow;
//# sourceMappingURL=useSignInFlow.d.ts.map