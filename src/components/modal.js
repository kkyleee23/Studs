const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;

export function openModal({ title, bodyHtml, submitLabel = 'Save', onValidate }) {
    return new Promise(resolve => {
        const wrap = document.createElement('div');
        wrap.className = 'modal-backdrop';
        wrap.innerHTML = `
            <form class="modal" novalidate role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <div class="spacer"></div>
                    <button type="button" class="modal-close" data-dismiss aria-label="Close">${CLOSE_ICON}</button>
                </div>
                <div class="modal-body">${bodyHtml}<div class="error" hidden></div></div>
                <div class="modal-footer">
                    <button type="button" class="btn" data-dismiss>Cancel</button>
                    <button type="submit" class="btn btn-primary">${submitLabel}</button>
                </div>
            </form>
        `;
        document.body.appendChild(wrap);
        const form  = wrap.querySelector('form');
        const err   = wrap.querySelector('.error');
        const close = (v) => { wrap.remove(); resolve(v); };

        wrap.querySelectorAll('[data-dismiss]').forEach(el => {
            el.addEventListener('click', () => close(null));
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            err.hidden = true; err.textContent = '';
            const data = Object.fromEntries(new FormData(form));
            try {
                if (onValidate) await onValidate(data);
                close(data);
            } catch (ex) {
                err.textContent = ex.message || String(ex);
                err.hidden = false;
            }
        });

        form.querySelector('input, select, textarea')?.focus();
    });
}
