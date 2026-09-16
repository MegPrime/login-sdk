export class EnforcerAuthError extends Error {
    code;
    status;
    /** Server-supplied message, before it was mapped to user-facing copy. */
    detail;
    body;
    constructor(status, code, detail, body) {
        super(friendlyMessage(code, detail));
        this.name = 'EnforcerAuthError';
        this.status = status;
        this.code = code;
        this.detail = detail;
        this.body = body;
    }
    /** True when re-submitting the same input might succeed. */
    get retryable() {
        return this.code === 'rate_limited' || this.code === 'refresh_raced' || this.status >= 500;
    }
    /** True when the user should go back and re-request a code. */
    get needsNewCode() {
        return this.code === 'invalid_otp';
    }
}
/** User-facing copy per error code. Falls back to the server's message. */
function friendlyMessage(code, detail) {
    switch (code) {
        case 'invalid_otp':
            return 'That code is incorrect or has expired. Request a new one.';
        case 'rate_limited':
            return 'Too many attempts. Wait a minute and try again.';
        case 'tenant_not_found':
            return 'We could not find that workspace. Check the tenant code.';
        case 'registration_rejected':
            return 'This workspace is not accepting new members right now.';
        case 'account_inactive':
            return 'This account has been deactivated. Contact your administrator.';
        case 'account_deleted':
            return 'This account was deleted. Contact support to restore access.';
        case 'wrong_auth_scheme':
            return 'This workspace uses a different sign-in method.';
        case 'unsupported_provider':
            return 'Enter a valid email address or phone number.';
        case 'email_taken':
            return 'That email is already registered in this workspace.';
        case 'invalid_refresh_token':
            return 'Your session expired. Please sign in again.';
        case 'network_error':
            return 'Could not reach the server. Check your connection and try again.';
        default:
            return detail || 'Something went wrong. Please try again.';
    }
}
/** Narrows an unknown catch value. */
export function isEnforcerAuthError(e) {
    return e instanceof EnforcerAuthError;
}
//# sourceMappingURL=errors.js.map