import type { EmailStatus, EnforcerAuthConfig, EnforcerAuthOptions, EnforcerSession } from './types.js';
interface OtpRequestResult {
    success?: boolean;
    message?: string;
    /** Only present when the server runs with expose_dev_otp (local dev). */
    dev_otp?: string;
}
/** enforcer-v3's OpenAPI spec mounts the API here. */
export declare const DEFAULT_BASE_PATH = "/api/v1/enforcer";
/**
 * Thin typed client for the enforcer-v3 auth endpoints the SDK drives. Kept
 * separate from React so the flow can be tested and reused headlessly.
 */
export declare class EnforcerAuthClient {
    private readonly baseUrl;
    private readonly basePath;
    private readonly headers;
    private readonly credentials;
    private readonly fetchImpl;
    constructor(options: Pick<EnforcerAuthOptions, 'baseUrl' | 'basePath' | 'headers' | 'credentials' | 'fetch'>);
    private request;
    /** GET /auth/config — which scheme the tenant runs (native vs privy). */
    getAuthConfig(tenantCode?: string, signal?: AbortSignal): Promise<EnforcerAuthConfig>;
    /** GET /auth/email-status — whether the email already has an account here. */
    getEmailStatus(email: string, tenantCode?: string, signal?: AbortSignal): Promise<EmailStatus>;
    /** POST /auth/otp/request — emails a 6-digit code, valid 10 minutes. */
    requestEmailOtp(email: string, tenantCode?: string): Promise<OtpRequestResult>;
    /** POST /auth/sms/request — sends a code over the tenant's Twilio Verify. */
    requestPhoneOtp(phone: string, tenantCode?: string): Promise<OtpRequestResult>;
    /** POST /auth/login — exchanges the code for a session. */
    login(input: {
        provider: 'email_otp' | 'phone_otp';
        otp: string;
        email?: string;
        phone?: string;
        tenantCode?: string;
    }): Promise<EnforcerSession>;
    /** POST /auth/refresh — rotates the refresh token and mints a new access token. */
    refresh(refreshToken: string): Promise<EnforcerSession>;
    /** POST /auth/logout — revokes the refresh-token family. Idempotent server-side. */
    logout(refreshToken?: string, token?: string): Promise<void>;
    /** GET /auth/me — the current identity, tenant, role and groups. */
    getMe<T = unknown>(token: string, signal?: AbortSignal): Promise<T>;
}
export {};
//# sourceMappingURL=client.d.ts.map