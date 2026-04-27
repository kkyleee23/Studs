// UI helpers — small, stateless, no business logic.

export function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

// Wraps an async load into a target node with loading/error states,
// so pages don't repeat the same try/catch/innerHTML pattern.
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
