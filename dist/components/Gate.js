import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEnforcerAuth } from '../provider';
/** Renders children only once a session exists. */
export function SignedIn({ children }) {
    const { status } = useEnforcerAuth();
    return status === 'authenticated' ? _jsx(_Fragment, { children: children }) : null;
}
/** Renders children only when there is no session. */
export function SignedOut({ children }) {
    const { status } = useEnforcerAuth();
    return status === 'unauthenticated' ? _jsx(_Fragment, { children: children }) : null;
}
/** Renders children only while the session is still being resolved. */
export function AuthLoading({ children }) {
    const { status } = useEnforcerAuth();
    return status === 'loading' ? _jsx(_Fragment, { children: children }) : null;
}
/** Gates a subtree behind a session. */
export function Protect({ children, fallback = null }) {
    const { status } = useEnforcerAuth();
    if (status === 'authenticated')
        return _jsx(_Fragment, { children: children });
    return _jsx(_Fragment, { children: fallback });
}
//# sourceMappingURL=Gate.js.map