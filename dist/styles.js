/**
 * Styles ship as a string and are injected once, so consumers import nothing
 * but the component. Everything is driven by `--esdk-*` custom properties that
 * `appearance` writes onto the card root, and every selector is prefixed
 * `.esdk-` to stay out of the host page's way.
 */
export const STYLE_ELEMENT_ID = 'enforcer-login-sdk-styles';
export const CSS = `
.esdk-card {
  --esdk-accent: #6366f1;
  --esdk-accent-fg: #fff;
  --esdk-radius: 14px;
  --esdk-bg: #fff;
  --esdk-fg: #0b0a0f;
  --esdk-muted: #6b7280;
  --esdk-border: #e5e7eb;
  --esdk-field-bg: #fff;
  --esdk-danger: #dc2626;
  --esdk-shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06);

  box-sizing: border-box;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 32px 28px;
  border: 1px solid var(--esdk-border);
  border-radius: var(--esdk-radius);
  background: var(--esdk-bg);
  color: var(--esdk-fg);
  box-shadow: var(--esdk-shadow);
  font-family: var(--esdk-font, inherit);
  font-size: 15px;
  line-height: 1.45;
  text-align: left;
}
.esdk-card *, .esdk-card *::before, .esdk-card *::after { box-sizing: border-box; }

.esdk-card[data-theme='dark'] {
  --esdk-bg: #131318;
  --esdk-fg: #f4f4f5;
  --esdk-muted: #9ca3af;
  --esdk-border: #2a2a33;
  --esdk-field-bg: #1b1b22;
  --esdk-danger: #f87171;
  --esdk-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
}
@media (prefers-color-scheme: dark) {
  .esdk-card[data-theme='auto'] {
    --esdk-bg: #131318;
    --esdk-fg: #f4f4f5;
    --esdk-muted: #9ca3af;
    --esdk-border: #2a2a33;
    --esdk-field-bg: #1b1b22;
    --esdk-danger: #f87171;
    --esdk-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
  }
}

.esdk-header { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 22px; text-align: center; }
.esdk-logo { max-height: 40px; max-width: 180px; object-fit: contain; }
.esdk-title { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
.esdk-subtitle { margin: 0; font-size: 14px; color: var(--esdk-muted); overflow-wrap: anywhere; }

.esdk-tabs { display: flex; gap: 4px; padding: 4px; margin-bottom: 18px; background: var(--esdk-field-bg); border: 1px solid var(--esdk-border); border-radius: calc(var(--esdk-radius) - 6px); }
.esdk-tab { flex: 1; padding: 8px 12px; border: 0; border-radius: calc(var(--esdk-radius) - 9px); background: transparent; color: var(--esdk-muted); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; }
.esdk-tab[aria-selected='true'] { background: var(--esdk-bg); color: var(--esdk-fg); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.esdk-tab:focus-visible { outline: 2px solid var(--esdk-accent); outline-offset: -2px; }

.esdk-form { display: flex; flex-direction: column; gap: 14px; }
.esdk-field { display: flex; flex-direction: column; gap: 6px; }
.esdk-label { font-size: 13px; font-weight: 500; color: var(--esdk-muted); }
.esdk-label-hint { font-weight: 400; opacity: 0.75; }
.esdk-input {
  width: 100%; padding: 11px 13px; font: inherit; color: var(--esdk-fg);
  background: var(--esdk-field-bg); border: 1px solid var(--esdk-border);
  border-radius: calc(var(--esdk-radius) - 6px); transition: border-color .15s, box-shadow .15s;
}
.esdk-input::placeholder { color: var(--esdk-muted); opacity: .7; }
.esdk-input:focus { outline: none; border-color: var(--esdk-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--esdk-accent) 22%, transparent); }
.esdk-input:disabled { opacity: .6; cursor: not-allowed; }
.esdk-input-code { font-size: 22px; letter-spacing: .5em; text-align: center; padding-left: .5em; font-variant-numeric: tabular-nums; }

.esdk-button {
  width: 100%; padding: 11px 16px; font: inherit; font-weight: 600;
  color: var(--esdk-accent-fg); background: var(--esdk-accent); border: 1px solid transparent;
  border-radius: calc(var(--esdk-radius) - 6px); cursor: pointer; transition: opacity .15s, filter .15s;
}
.esdk-button:hover:not(:disabled) { filter: brightness(1.07); }
.esdk-button:disabled { opacity: .5; cursor: not-allowed; }
.esdk-button:focus-visible { outline: 2px solid var(--esdk-accent); outline-offset: 2px; }

.esdk-link { padding: 4px 2px; font: inherit; font-size: 13px; color: var(--esdk-muted); background: none; border: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.esdk-link:hover:not(:disabled) { color: var(--esdk-fg); }
.esdk-link:disabled { opacity: .55; cursor: not-allowed; text-decoration: none; }
.esdk-link:focus-visible { outline: 2px solid var(--esdk-accent); outline-offset: 2px; border-radius: 4px; }
.esdk-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

.esdk-error { display: flex; gap: 8px; padding: 10px 12px; font-size: 13.5px; color: var(--esdk-danger); background: color-mix(in srgb, var(--esdk-danger) 10%, transparent); border-radius: calc(var(--esdk-radius) - 8px); }
.esdk-notice { padding: 10px 12px; font-size: 13.5px; color: var(--esdk-muted); background: var(--esdk-field-bg); border: 1px solid var(--esdk-border); border-radius: calc(var(--esdk-radius) - 8px); }
.esdk-footer { margin-top: 18px; font-size: 12px; color: var(--esdk-muted); text-align: center; }

.esdk-signed-in { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; }
.esdk-avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--esdk-accent); color: var(--esdk-accent-fg); font-weight: 600; }

.esdk-spinner { display: inline-block; width: 14px; height: 14px; margin-right: 8px; vertical-align: -2px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: esdk-spin .6s linear infinite; }
@keyframes esdk-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .esdk-spinner { animation-duration: 2s; } }

.esdk-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;
let injected = false;
/** Injects the stylesheet once per document. No-op during SSR. */
export function ensureStyles() {
    if (injected || typeof document === 'undefined')
        return;
    if (document.getElementById(STYLE_ELEMENT_ID)) {
        injected = true;
        return;
    }
    const el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
    injected = true;
}
//# sourceMappingURL=styles.js.map