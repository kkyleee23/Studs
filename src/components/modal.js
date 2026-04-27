// UI Layer — reusable modal. No business logic.
// openModal({ title, bodyHtml, onSubmit }) -> Promise<formData|null>

export function openModal({ title, bodyHtml, submitLabel = 'Save', onValidate }) {
    return new Promise(resolve => {
        const wrap = document.createElement('div');
        wrap.className = 'modal-backdrop';
        wrap.innerHTML = `
            <form class="modal" novalidate>
                <div class="modal-header"><h2>${title}</h2></div>
                <div class="modal-body">${bodyHtml}<div class="error" hidden></div></div>
                <div class="modal-footer">
                    <button type="button" class="btn" data-cancel>Cancel</button>
                    <button type="submit" class="btn btn-primary">${submitLabel}</button>
                </div>
            </form>
        `;
        document.body.appendChild(wrap);
        const form  = wrap.querySelector('form');
        const err   = wrap.querySelector('.error');
        const close = (v) => { wrap.remove(); resolve(v); };

        wrap.querySelector('[data-cancel]').addEventListener('click', () => close(null));
        wrap.addEventListener('click', e => { if (e.target === wrap) close(null); });

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
