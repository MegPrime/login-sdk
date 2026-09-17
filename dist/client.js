import { EnforcerAuthError } from './errors.js';
/** enforcer-v3's OpenAPI spec mounts the API here. */
export const DEFAULT_BASE_PATH = '/api/v1/enforcer';
function joinUrl(baseUrl, basePath, path) {
    const origin = baseUrl.replace(/\/+$/, '');
    const mount = basePath ? `/${basePath.replace(/^\/+|\/+$/g, '')}` : '';
    return `${origin}${mount}/${path.replace(/^\/+/, '')}`;
}
/**
 * Thin typed client for the enforcer-v3 auth endpoints the SDK drives. Kept
 * separate from React so the flow can be tested and reused headlessly.
 */
export class EnforcerAuthClient {
    baseUrl;
    basePath;
    headers;
    credentials;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl;
        this.basePath = options.basePath ?? DEFAULT_BASE_PATH;
        this.headers = options.headers ?? {};
        this.credentials = options.credentials ?? 'include';
        this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    }
    async request(path, init) {
        const headers = { Accept: 'application/json', ...this.headers };
        if (init.body !== undefined)
            headers['Content-Type'] = 'application/json';
        if (init.token)
            headers['Authorization'] = `Bearer ${init.token}`;
        let res;
        try {
            res = await this.fetchImpl(joinUrl(this.baseUrl, this.basePath, path), {
                method: init.method,
                headers,
                credentials: this.credentials,
                signal: init.signal,
                ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
            });
        }
        catch (cause) {
            // fetch only rejects on transport failure — network down, DNS, CORS.
            throw new EnforcerAuthError(0, 'network_error', String(cause), cause);
        }
        const text = await res.text();
        let body = undefined;
        if (text) {
            try {
                body = JSON.parse(text);
            }
            catch {
                body = text;
            }
        }
        if (!res.ok) {
            const parsed = (body ?? {});
            throw new EnforcerAuthError(res.status, parsed.error || 'auth_error', parsed.message || res.statusText, body);
        }
        return body;
    }
    /** GET /auth/config — which scheme the tenant runs (native vs privy). */
    async getAuthConfig(tenantCode, signal) {
        const query = tenantCode ? `?tenant_code=${encodeURIComponent(tenantCode)}` : '';
        const res = await this.request(`/auth/config${query}`, {
            method: 'GET',
            signal,
        });
        return res.data ?? {};
    }
    /** GET /auth/email-status — whether the email already has an account here. */
    async getEmailStatus(email, tenantCode, signal) {
        const params = new URLSearchParams({ email });
        if (tenantCode)
            params.set('tenant_code', tenantCode);
        const res = await this.request(`/auth/email-status?${params}`, {
            method: 'GET',
            signal,
        });
        return res.data ?? { exists: false, verified: false };
    }
    /** POST /auth/otp/request — emails a 6-digit code, valid 10 minutes. */
    async requestEmailOtp(email, tenantCode) {
        return this.request('/auth/otp/request', {
            method: 'POST',
            body: { email, ...(tenantCode ? { tenant_code: tenantCode } : {}) },
        });
    }
    /** POST /auth/sms/request — sends a code over the tenant's Twilio Verify. */
    async requestPhoneOtp(phone, tenantCode) {
        return this.request('/auth/sms/request', {
            method: 'POST',
            body: { phone, ...(tenantCode ? { tenant_code: tenantCode } : {}) },
        });
    }
    /** POST /auth/siwe/nonce — one-time nonce bound to this wallet address. */
    async requestSiweNonce(walletAddress, tenantCode) {
        const res = await this.request('/auth/siwe/nonce', {
            method: 'POST',
            body: {
                wallet_address: walletAddress,
                ...(tenantCode ? { tenant_code: tenantCode } : {}),
            },
        });
        // Live enforcer-v3 returns `{success, nonce}` at the top level, not `{data}`.
        const nonce = res.data?.nonce ?? res.nonce;
        if (!nonce) {
            throw new EnforcerAuthError(200, 'auth_error', 'siwe nonce response carried no nonce', res);
        }
        return { nonce };
    }
    /** POST /auth/login — exchanges an OTP or a SIWE signature for a session. */
    async login(input) {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: {
                provider: input.provider,
                ...(input.otp ? { otp: input.otp } : {}),
                ...(input.email ? { email: input.email } : {}),
                ...(input.phone ? { phone: input.phone } : {}),
                ...(input.message ? { message: input.message } : {}),
                ...(input.signature ? { signature: input.signature } : {}),
                ...(input.tenantCode ? { tenant_code: input.tenantCode } : {}),
            },
        });
        if (!res.data?.token) {
            throw new EnforcerAuthError(200, 'auth_error', 'login response carried no token', res);
        }
        return res.data;
    }
    /** POST /auth/refresh — rotates the refresh token and mints a new access token. */
    async refresh(refreshToken) {
        const res = await this.request('/auth/refresh', {
            method: 'POST',
            body: { refresh_token: refreshToken },
        });
        if (!res.data?.token) {
            throw new EnforcerAuthError(200, 'auth_error', 'refresh response carried no token', res);
        }
        return res.data;
    }
    /** POST /auth/logout — revokes the refresh-token family. Idempotent server-side. */
    async logout(refreshToken, token) {
        await this.request('/auth/logout', {
            method: 'POST',
            body: { ...(refreshToken ? { refresh_token: refreshToken } : {}) },
            token,
        });
    }
    /** GET /auth/me — the current identity, tenant, role and groups. */
    async getMe(token, signal) {
        const res = await this.request('/auth/me', { method: 'GET', token, signal });
        return res.data;
    }
}
//# sourceMappingURL=client.js.map