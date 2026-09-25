import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef } from 'react';
import { useEnforcerAuth } from '../provider.js';
import { ensureStyles } from '../styles.js';
import { isWalletMethod } from '../siwe.js';
import { useSignInFlow } from '../useSignInFlow.js';
const DEFAULT_LABELS = {
    title: 'Sign in',
    subtitle: 'Enter your details to continue',
    emailTab: 'Email',
    phoneTab: 'Phone',
    walletTab: 'Wallet',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@company.com',
    phoneLabel: 'Phone number',
    phonePlaceholder: '+1 555 000 0000',
    walletSubtitle: 'Sign a message to continue. No transaction or gas is required.',
    walletButton: 'Connect wallet',
    walletConnectingButton: 'Connecting…',
    walletSigningButton: 'Check your wallet…',
    walletUnavailable: 'No browser wallet found. Install MetaMask or another EIP-1193 wallet, then try again.',
    continueButton: 'Continue',
    sendingButton: 'Sending code…',
    codeTitle: 'Enter your code',
    codeSubtitle: 'We sent a code to {identifier}',
    codeLabel: 'Verification code',
    verifyButton: 'Verify',
    verifyingButton: 'Verifying…',
    resendButton: 'Resend code',
    resendCooldown: 'Resend in {seconds}s',
    backButton: 'Use a different one',
    tenantCodeLabel: 'Join code',
    tenantCodeOptional: '(optional)',
    tenantCodePlaceholder: 'K7M2-Q9XW-4TZR',
    newAccountNotice: 'Welcome — your account was created.',
    inviteOnlyNotice: 'This workspace is invite-only. Use the email address your invitation was sent to.',
    noCodeHint: "Didn't get a code? This workspace may be invite-only — ask an admin to invite you.",
    signedInAs: 'Signed in as',
    signOutButton: 'Sign out',
    poweredBy: '',
};
function methodTabLabel(method, labels) {
    if (method === 'email')
        return labels.emailTab;
    if (method === 'phone')
        return labels.phoneTab;
    return labels.walletTab;
}
function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
/** Maps `appearance` onto the `--esdk-*` custom properties the CSS reads. */
function appearanceStyle(a) {
    const vars = {};
    if (a.accent)
        vars['--esdk-accent'] = a.accent;
    if (a.accentForeground)
        vars['--esdk-accent-fg'] = a.accentForeground;
    if (a.radius)
        vars['--esdk-radius'] = a.radius;
    if (a.fontFamily)
        vars['--esdk-font'] = a.fontFamily;
    Object.assign(vars, a.variables ?? {});
    return vars;
}
/**
 * The drop-in sign-in card: method tabs → email/phone OTP or SIWE wallet → session.
 * Everything it does is available headlessly via `useSignInFlow()`.
 */
export function SignIn({ appearance = {}, labels: labelOverrides, header, footer, signedInFallback, autoSubmit = true, className, style, children, }) {
    const { status, account, otpAvailable, authConfig, signOut } = useEnforcerAuth();
    const flow = useSignInFlow();
    const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...labelOverrides }), [labelOverrides]);
    const fieldId = useId();
    if (appearance.injectStyles !== false)
        ensureStyles();
    const identifierRef = useRef(null);
    const codeRef = useRef(null);
    // Move focus with the step so the flow is keyboard-only friendly.
    useEffect(() => {
        const target = flow.step === 'code' ? codeRef.current : identifierRef.current;
        target?.focus();
    }, [flow.step]);
    // Submit on the last digit, but never twice for the same code.
    const submitted = useRef(null);
    useEffect(() => {
        if (!autoSubmit || flow.step !== 'code')
            return;
        if (!flow.canSubmitCode || flow.isVerifying)
            return;
        if (submitted.current === flow.code)
            return;
        submitted.current = flow.code;
        void flow.verifyCode();
    }, [autoSubmit, flow]);
    const cardClass = ['esdk-card', appearance.className, className].filter(Boolean).join(' ');
    const cardProps = {
        className: cardClass,
        'data-theme': appearance.theme ?? 'auto',
        style: { ...appearanceStyle(appearance), ...style },
    };
    if (status === 'authenticated') {
        if (signedInFallback !== undefined)
            return _jsx(_Fragment, { children: signedInFallback });
        const name = account?.first_name || account?.username || account?.email || account?.wallet_address || '';
        return (_jsx("div", { ...cardProps, children: _jsxs("div", { className: "esdk-signed-in", children: [_jsx("div", { className: "esdk-avatar", "aria-hidden": "true", children: (name || '?').slice(0, 1).toUpperCase() }), _jsxs("div", { children: [_jsx("p", { className: "esdk-subtitle", children: labels.signedInAs }), _jsx("p", { className: "esdk-title", children: name || 'your account' })] }), _jsx("button", { type: "button", className: "esdk-button", onClick: () => void signOut(), children: labels.signOutButton })] }) }));
    }
    if (children)
        return _jsx("div", { ...cardProps, children: children(flow) });
    // The tenant runs privy (or another non-native scheme) — OTP would 403.
    if (!otpAvailable) {
        return (_jsxs("div", { ...cardProps, children: [_jsxs("div", { className: "esdk-header", children: [_jsx(Brand, { appearance: appearance }), _jsx("h1", { className: "esdk-title", children: labels.title })] }), _jsxs("p", { className: "esdk-error", role: "alert", children: ["This workspace signs in with ", authConfig?.auth_provider, ". Native email, phone, and wallet sign-in are not enabled here."] })] }));
    }
    const isEmail = flow.method === 'email';
    const wallet = isWalletMethod(flow.method);
    const showTabs = flow.methods.length > 1;
    const subtitle = flow.step === 'code'
        ? fill(labels.codeSubtitle, { identifier: flow.sentTo ?? '' })
        : wallet
            ? labels.walletSubtitle
            : labels.subtitle;
    return (_jsxs("div", { ...cardProps, children: [header, _jsxs("div", { className: "esdk-header", children: [_jsx(Brand, { appearance: appearance }), _jsx("h1", { className: "esdk-title", children: flow.step === 'code' ? labels.codeTitle : labels.title }), _jsx("p", { className: "esdk-subtitle", children: subtitle })] }), flow.step === 'identifier' && showTabs && (_jsx("div", { className: "esdk-tabs", role: "tablist", children: flow.methods.map((m) => (_jsx("button", { type: "button", role: "tab", "aria-selected": flow.method === m, className: "esdk-tab", onClick: () => flow.setMethod(m), children: methodTabLabel(m, labels) }, m))) })), flow.step === 'identifier' && flow.inviteOnly && labels.inviteOnlyNotice && (_jsx("p", { className: "esdk-notice", children: labels.inviteOnlyNotice })), flow.step === 'identifier' ? (wallet ? (_jsxs("form", { className: "esdk-form", onSubmit: (e) => {
                    e.preventDefault();
                    void flow.signInWithWallet();
                }, children: [flow.connectedAddress && (_jsx("p", { className: "esdk-notice", children: flow.connectedAddress })), _jsx(TenantCodeField, { flow: flow, labels: labels, id: `${fieldId}-tenant` }), flow.error && (_jsx("p", { className: "esdk-error", role: "alert", children: flow.error.message })), !flow.walletAvailable && !flow.error && (_jsx("p", { className: "esdk-notice", children: labels.walletUnavailable })), _jsx("button", { type: "submit", className: "esdk-button", disabled: flow.isConnecting || !flow.canSubmitIdentifier, children: flow.isConnecting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "esdk-spinner", "aria-hidden": "true" }), labels.walletConnectingButton] })) : (labels.walletButton) })] })) : (_jsxs("form", { className: "esdk-form", onSubmit: (e) => {
                    e.preventDefault();
                    void flow.sendCode();
                }, children: [_jsxs("div", { className: "esdk-field", children: [_jsx("label", { className: "esdk-label", htmlFor: `${fieldId}-id`, children: isEmail ? labels.emailLabel : labels.phoneLabel }), _jsx("input", { id: `${fieldId}-id`, ref: identifierRef, className: "esdk-input", type: isEmail ? 'email' : 'tel', inputMode: isEmail ? 'email' : 'tel', autoComplete: isEmail ? 'email' : 'tel', placeholder: isEmail ? labels.emailPlaceholder : labels.phonePlaceholder, value: flow.identifier, onChange: (e) => flow.setIdentifier(e.target.value), disabled: flow.isSending, "aria-invalid": flow.error ? true : undefined })] }), _jsx(TenantCodeField, { flow: flow, labels: labels, id: `${fieldId}-tenant` }), flow.error && (_jsx("p", { className: "esdk-error", role: "alert", children: flow.error.message })), _jsx("button", { type: "submit", className: "esdk-button", disabled: !flow.canSubmitIdentifier || flow.isSending, children: flow.isSending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "esdk-spinner", "aria-hidden": "true" }), labels.sendingButton] })) : (labels.continueButton) })] }))) : (_jsxs("form", { className: "esdk-form", onSubmit: (e) => {
                    e.preventDefault();
                    void flow.verifyCode();
                }, children: [_jsxs("div", { className: "esdk-field", children: [_jsx("label", { className: "esdk-label", htmlFor: `${fieldId}-code`, children: labels.codeLabel }), _jsx("input", { id: `${fieldId}-code`, ref: codeRef, className: "esdk-input esdk-input-code", type: "text", inputMode: "numeric", autoComplete: "one-time-code", maxLength: flow.otpLength, placeholder: '0'.repeat(flow.otpLength), value: flow.code, onChange: (e) => flow.setCode(e.target.value), disabled: flow.isVerifying, "aria-invalid": flow.error ? true : undefined })] }), flow.emailStatus && !flow.emailStatus.exists && (
                    // A new address at a tenant that isn't known to be open may have
                    // been refused: the server then emails a "no access" notice instead
                    // of a code, and answers 200 either way so it can't be probed.
                    _jsx("p", { className: "esdk-notice", children: authConfig?.self_join_policy === 'open'
                            ? labels.newAccountNotice
                            : labels.noCodeHint })), flow.error && (_jsx("p", { className: "esdk-error", role: "alert", children: flow.error.message })), _jsx("button", { type: "submit", className: "esdk-button", disabled: !flow.canSubmitCode || flow.isVerifying, children: flow.isVerifying ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "esdk-spinner", "aria-hidden": "true" }), labels.verifyingButton] })) : (labels.verifyButton) }), _jsxs("div", { className: "esdk-actions", children: [_jsx("button", { type: "button", className: "esdk-link", onClick: flow.editIdentifier, children: labels.backButton }), _jsx("button", { type: "button", className: "esdk-link", onClick: () => void flow.resendCode(), disabled: flow.resendIn > 0 || flow.isSending, children: flow.resendIn > 0
                                    ? fill(labels.resendCooldown, { seconds: flow.resendIn })
                                    : labels.resendButton })] })] })), footer, labels.poweredBy && _jsx("p", { className: "esdk-footer", children: labels.poweredBy })] }));
}
/** The join-code input, when the tenant code isn't configured. Shared by the OTP and wallet forms. */
function TenantCodeField({ flow, labels, id, }) {
    if (!flow.showTenantCode)
        return null;
    return (_jsxs("div", { className: "esdk-field", children: [_jsxs("label", { className: "esdk-label", htmlFor: id, children: [labels.tenantCodeLabel, !flow.tenantCodeRequired && labels.tenantCodeOptional && (_jsxs("span", { className: "esdk-label-hint", children: [" ", labels.tenantCodeOptional] }))] }), _jsx("input", { id: id, className: "esdk-input", type: "text", autoComplete: "off", autoCapitalize: "off", spellCheck: false, placeholder: labels.tenantCodePlaceholder, value: flow.tenantCode, onChange: (e) => flow.setTenantCode(e.target.value), disabled: flow.isSending, required: flow.tenantCodeRequired, "aria-invalid": flow.error?.code === 'tenant_not_found' ? true : undefined })] }));
}
/** Logo + product name: appearance props, else the tenant (see `tenantBrand`). */
function Brand({ appearance }) {
    const { tenantBrand } = useEnforcerAuth();
    const logo = appearance.logoUrl ?? tenantBrand?.logo_url;
    const name = appearance.brandName ?? tenantBrand?.name;
    if (!logo && !name)
        return null;
    return logo ? (_jsx("img", { className: "esdk-logo", src: logo, alt: name ?? '' })) : (_jsx("span", { className: "esdk-label", children: name }));
}
//# sourceMappingURL=SignIn.js.map