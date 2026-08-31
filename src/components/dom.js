export function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

export async function withLoader(node, loader) {
    node.innerHTML = '<p class="muted">Loading…</p>';
    try {
        const html = await loader();
        if (typeof html === 'string') node.innerHTML = html;
    } catch (e) {
        node.innerHTML = `<div class="error">${esc(e.message || String(e))}</div>`;
    }
}

export function on(root, selector, event, handler) {
    root.querySelectorAll(selector).forEach(el => el.addEventListener(event, handler));
}
