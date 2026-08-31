export function toast(message, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${kind === 'error' ? 'danger' : kind}`;
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.add('toast-in'));
    setTimeout(() => {
        el.classList.remove('toast-in');
        setTimeout(() => el.remove(), 200);
    }, 2800);
}
