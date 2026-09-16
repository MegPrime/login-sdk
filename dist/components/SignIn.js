import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef } from 'react';
import { useEnforcerAuth } from '../provider';
import { ensureStyles } from '../styles';
import { useSignInFlow } from '../useSignInFlow';
const DEFAULT_LABELS = {
    title: 'Sign in',
    subtitle: 'Enter your details to continue',
    emailTab: 'Email',
    phoneTab: 'Phone',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@company.com',
    phoneLabel: 'Phone number',
    phonePlaceholder: '+1 555 000 0000',
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
    newAccountNotice: 'Welcome — your account was created.',
    signedInAs: 'Signed in as',
    signOutButton: 'Sign out',
    poweredBy: '',
};
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
 * The drop-in sign-in card: method tabs → identifier → 6-digit code → session.
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
        const name = account?.first_name || account?.username || account?.email || '';
        return (_jsx("div", { ...cardProps, children: _jsxs("div", { className: "esdk-signed-in", children: [_jsx("div", { className: "esdk-avatar", "aria-hidden": "true", children: (name || '?').slice(0, 1).toUpperCase() }), _jsxs("div", { children: [_jsx("p", { className: "esdk-subtitle", children: labels.signedInAs }), _jsx("p", { className: "esdk-title", children: name || 'your account' })] }), _jsx("button", { type: "button", className: "esdk-button", onClick: () => void signOut(), children: labels.signOutButton })] }) }));
    }
    if (children)
        return _jsx("div", { ...cardProps, children: children(flow) });
    // The tenant runs privy (or another non-native scheme) — OTP would 403.
    if (!otpAvailable) {
        return (_jsxs("div", { ...cardProps, children: [_jsxs("div", { className: "esdk-header", children: [_jsx(Brand, { appearance: appearance }), _jsx("h1", { className: "esdk-title", children: labels.title })] }), _jsxs("p", { className: "esdk-error", role: "alert", children: ["This workspace signs in with ", authConfig?.auth_provider, ". Email and phone codes are not enabled here."] })] }));
    }
    const isEmail = flow.method === 'email';
    const showTabs = flow.methods.length > 1;
    return (_jsxs("div", { ...cardProps, children: [header, _jsxs("div", { className: "esdk-header", children: [_jsx(Brand, { appearance: appearance }), _jsx("h1", { className: "esdk-title", children: flow.step === 'code' ? labels.codeTitle : labels.title }), _jsx("p", { className: "esdk-subtitle", children: flow.step === 'code'
                            ? fill(labels.codeSubtitle, { identifier: flow.sentTo ?? '' })
                            : labels.subtitle })] }), flow.step === 'identifier' && showTabs && (_jsx("div", { className: "esdk-tabs", role: "tablist", children: flow.methods.map((m) => (_jsx("button", { type: "button", role: "tab", "aria-selected": flow.method === m, className: "esdk-tab", onClick: () => flow.setMethod(m), children: m === 'email' ? labels.emailTab : labels.phoneTab }, m))) })), flow.step === 'identifier' ? (_jsxs("form", { className: "esdk-form", onSubmit: (e) => {
                    e.preventDefault();
                    void flow.sendCode();
                }, children: [_jsxs("div", { className: "esdk-field", children: [_jsx("label", { className: "esdk-label", htmlFor: `${fieldId}-id`, children: isEmail ? labels.emailLabel : labels.phoneLabel }), _jsx("input", { id: `${fieldId}-id`, ref: identifierRef, className: "esdk-input", type: isEmail ? 'email' : 'tel', inputMode: isEmail ? 'email' : 'tel', autoComplete: isEmail ? 'email' : 'tel', placeholder: isEmail ? labels.emailPlaceholder : labels.phonePlaceholder, value: flow.identifier, onChange: (e) => flow.setIdentifier(e.target.value), disabled: flow.isSending, "aria-invalid": flow.error ? true : undefined })] }), flow.error && (_jsx("p", { className: "esdk-error", role: "alert", children: flow.error.message })), _jsx("button", { type: "submit", className: "esdk-button", disabled: !flow.canSubmitIdentifier || flow.isSending, children: flow.isSending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "esdk-spinner", "aria-hidden": "true" }), labels.sendingButton] })) : (labels.continueButton) })] })) : (_jsxs("form", { className: "esdk-form", onSubmit: (e) => {
                    e.preventDefault();
                    void flow.verifyCode();
                }, children: [_jsxs("div", { className: "esdk-field", children: [_jsx("label", { className: "esdk-label", htmlFor: `${fieldId}-code`, children: labels.codeLabel }), _jsx("input", { id: `${fieldId}-code`, ref: codeRef, className: "esdk-input esdk-input-code", type: "text", inputMode: "numeric", autoComplete: "one-time-code", maxLength: flow.otpLength, placeholder: '0'.repeat(flow.otpLength), value: flow.code, onChange: (e) => flow.setCode(e.target.value), disabled: flow.isVerifying, "aria-invalid": flow.error ? true : undefined })] }), flow.emailStatus && !flow.emailStatus.exists && (_jsx("p", { className: "esdk-notice", children: labels.newAccountNotice })), flow.error && (_jsx("p", { className: "esdk-error", role: "alert", children: flow.error.message })), _jsx("button", { type: "submit", className: "esdk-button", disabled: !flow.canSubmitCode || flow.isVerifying, children: flow.isVerifying ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "esdk-spinner", "aria-hidden": "true" }), labels.verifyingButton] })) : (labels.verifyButton) }), _jsxs("div", { className: "esdk-actions", children: [_jsx("button", { type: "button", className: "esdk-link", onClick: flow.editIdentifier, children: labels.backButton }), _jsx("button", { type: "button", className: "esdk-link", onClick: () => void flow.resendCode(), disabled: flow.resendIn > 0 || flow.isSending, children: flow.resendIn > 0
                                    ? fill(labels.resendCooldown, { seconds: flow.resendIn })
                                    : labels.resendButton })] })] })), footer, labels.poweredBy && _jsx("p", { className: "esdk-footer", children: labels.poweredBy })] }));
}
/** Logo + product name, falling back to the tenant on the current session. */
function Brand({ appearance }) {
    const { account } = useEnforcerAuth();
    const tenant = account?.tenant;
    const logo = appearance.logoUrl ?? tenant?.logo_url;
    const name = appearance.brandName ?? tenant?.name;
    if (!logo && !name)
        return null;
    return logo ? (_jsx("img", { className: "esdk-logo", src: logo, alt: name ?? '' })) : (_jsx("span", { className: "esdk-label", children: name }));
}
//# sourceMappingURL=SignIn.js.map