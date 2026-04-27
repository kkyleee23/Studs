// UI helper — minimal toast. Keeps pages from reinventing alert styling.
export function toast(message, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${kind === 'error' ? 'danger' : kind}`;
    el.textContent = message;
    document.body.appendChild(el);
    // animate in next tick
    requestAnimationFrame(() => el.classList.add('toast-in'));
    setTimeout(() => {
        el.classList.remove('toast-in');
        setTimeout(() => el.remove(), 200);
    }, 2800);
}
