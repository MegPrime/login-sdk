import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EnforcerAuthError } from './errors.js';
import { useEnforcerAuth } from './provider.js';
import { PROVIDER_BY_METHOD } from './types.js';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Keeps digits and a leading +, then applies the default country code. */
export function normalizePhone(input, defaultCountryCode = '+1') {
    const trimmed = input.trim();
    const digits = trimmed.replace(/[^\d]/g, '');
    if (!digits)
        return '';
    if (trimmed.startsWith('+'))
        return `+${digits}`;
    const cc = defaultCountryCode.replace(/[^\d]/g, '');
    // Already carries the country code (e.g. "1 415 555 0123").
    if (cc && digits.startsWith(cc) && digits.length > 10)
        return `+${digits}`;
    return `+${cc}${digits}`;
}
function isValidPhone(normalized) {
    // E.164: '+' then 8–15 digits. Deliberately loose — the server is the judge.
    return /^\+\d{8,15}$/.test(normalized);
}
/**
 * The whole email/phone OTP state machine, with no markup. Use this to build a
 * custom sign-in UI; `<SignIn />` is a consumer of exactly this hook.
 */
export function useSignInFlow() {
    const { client, options, completeSignIn } = useEnforcerAuth();
    const { tenantCode, methods = ['email'], otpLength = 6, resendCooldownSeconds = 30, checkEmailStatus = false, devOtpAutofill = false, defaultCountryCode = '+1', onError, } = options;
    const available = methods.length ? methods : ['email'];
    const [method, setMethodState] = useState(available[0]);
    const [step, setStep] = useState('identifier');
    const [identifier, setIdentifier] = useState('');
    const [sentTo, setSentTo] = useState(null);
    const [code, setCodeState] = useState('');
    const [emailStatus, setEmailStatus] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [resendIn, setResendIn] = useState(0);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    // Cooldown ticker.
    useEffect(() => {
        if (resendIn <= 0)
            return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);
    const normalized = useMemo(() => (method === 'phone' ? normalizePhone(identifier, defaultCountryCode) : identifier.trim().toLowerCase()), [identifier, method, defaultCountryCode]);
    const canSubmitIdentifier = useMemo(() => (method === 'email' ? EMAIL_RE.test(normalized) : isValidPhone(normalized)), [method, normalized]);
    const setCode = useCallback((value) => {
        // Digits only, capped at the expected length.
        setCodeState(value.replace(/\D/g, '').slice(0, otpLength));
        setError(null);
    }, [otpLength]);
    const setMethod = useCallback((next) => {
        setMethodState(next);
        setStep('identifier');
        setIdentifier('');
        setCodeState('');
        setSentTo(null);
        setEmailStatus(null);
        setError(null);
    }, []);
    const fail = useCallback((e) => {
        const err = e instanceof EnforcerAuthError ? e : new EnforcerAuthError(0, 'auth_error', String(e), e);
        setError(err);
        onErrorRef.current?.(err);
    }, []);
    const deliver = useCallback(async () => {
        setIsSending(true);
        setError(null);
        try {
            if (method === 'email' && checkEmailStatus) {
                try {
                    setEmailStatus(await client.getEmailStatus(normalized, tenantCode));
                }
                catch {
                    // Adaptive copy only — never block sign-in on this lookup.
                    setEmailStatus(null);
                }
            }
            const res = method === 'email'
                ? await client.requestEmailOtp(normalized, tenantCode)
                : await client.requestPhoneOtp(normalized, tenantCode);
            setSentTo(normalized);
            setResendIn(resendCooldownSeconds);
            if (devOtpAutofill && res.dev_otp)
                setCodeState(res.dev_otp.slice(0, otpLength));
            return true;
        }
        catch (e) {
            fail(e);
            return false;
        }
        finally {
            setIsSending(false);
        }
    }, [
        client,
        method,
        normalized,
        tenantCode,
        checkEmailStatus,
        devOtpAutofill,
        otpLength,
        resendCooldownSeconds,
        fail,
    ]);
    const sendCode = useCallback(async () => {
        if (!canSubmitIdentifier || isSending)
            return;
        if (await deliver())
            setStep('code');
    }, [canSubmitIdentifier, isSending, deliver]);
    const resendCode = useCallback(async () => {
        if (resendIn > 0 || isSending)
            return;
        setCodeState('');
        await deliver();
    }, [resendIn, isSending, deliver]);
    const verifyCode = useCallback(async (override) => {
        const otp = (override ?? code).trim();
        if (otp.length !== otpLength || isVerifying || !sentTo)
            return null;
        setIsVerifying(true);
        setError(null);
        try {
            const session = await client.login({
                provider: PROVIDER_BY_METHOD[method],
                otp,
                ...(method === 'email' ? { email: sentTo } : { phone: sentTo }),
                tenantCode,
            });
            completeSignIn(session);
            return session;
        }
        catch (e) {
            fail(e);
            setCodeState('');
            return null;
        }
        finally {
            setIsVerifying(false);
        }
    }, [client, code, otpLength, isVerifying, sentTo, method, tenantCode, completeSignIn, fail]);
    const editIdentifier = useCallback(() => {
        setStep('identifier');
        setCodeState('');
        setError(null);
    }, []);
    const reset = useCallback(() => {
        setStep('identifier');
        setIdentifier('');
        setCodeState('');
        setSentTo(null);
        setEmailStatus(null);
        setError(null);
        setResendIn(0);
    }, []);
    return {
        step,
        method,
        methods: available,
        setMethod,
        identifier,
        setIdentifier: (v) => {
            setIdentifier(v);
            setError(null);
        },
        sentTo,
        code,
        setCode,
        otpLength,
        emailStatus,
        isSending,
        isVerifying,
        error,
        resendIn,
        canSubmitIdentifier,
        canSubmitCode: code.length === otpLength,
        sendCode,
        resendCode,
        verifyCode,
        editIdentifier,
        reset,
    };
}
//# sourceMappingURL=useSignInFlow.js.map