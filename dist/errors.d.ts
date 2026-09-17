/**
 * enforcer-v3 answers errors as `{success:false, error:"<code>", message:"..."}`.
 * The codes below are the ones the auth surface actually emits (see
 * `authError` in internal/delivery/http/handler/auth.go).
 */
export type EnforcerErrorCode = 'missing_fields' | 'unsupported_provider' | 'tenant_not_found' | 'registration_rejected' | 'account_inactive' | 'account_deleted' | 'wrong_auth_scheme' | 'invalid_otp' | 'invalid_credential' | 'invalid_refresh_token' | 'refresh_raced' | 'email_taken' | 'rate_limited' | 'auth_error' | 'network_error' | 'wallet_unavailable' | 'wallet_rejected' | (string & {});
export declare class EnforcerAuthError extends Error {
    readonly code: EnforcerErrorCode;
    readonly status: number;
    /** Server-supplied message, before it was mapped to user-facing copy. */
    readonly detail: string;
    readonly body: unknown;
    constructor(status: number, code: EnforcerErrorCode, detail: string, body?: unknown);
    /** True when re-submitting the same input might succeed. */
    get retryable(): boolean;
    /** True when the user should go back and re-request a code. */
    get needsNewCode(): boolean;
}
/** Narrows an unknown catch value. */
export declare function isEnforcerAuthError(e: unknown): e is EnforcerAuthError;
//# sourceMappingURL=errors.d.ts.map