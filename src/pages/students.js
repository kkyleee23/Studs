// Students roster — teacher view.
import { supabase } from '../data/supabaseClient.js';

export async function renderStudents(view, { classId }) {
    view.innerHTML = `
        <div class="page-header">
            <a class="back-btn" href="#/classes/${classId}" title="Back to class" aria-label="Back to class">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </a>
            <div class="titles">
                <h1>Students</h1>
                <div class="sub">Everyone enrolled in this class</div>
            </div>
        </div>
        <div class="card" style="padding:0"><div id="list" style="padding:20px"><p class="muted">Loading…</p></div></div>
    `;

    const { data, error } = await supabase
        .from('enrollments')
        .select('joined_at, student:users(id, full_name, email)')
        .eq('class_id', classId)
        .order('joined_at', { ascending: true });

    const list = view.querySelector('#list');
    if (error) { list.innerHTML = `<div class="error">${error.message}</div>`; return; }
    if (!data?.length) {
        list.innerHTML = `<div class="empty">
            <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div class="empty-title">No one has joined yet</div>
            <div class="empty-sub">Share your class code with your students so they can join.</div>
        </div>`;
        return;
    }

    list.style.padding = '0';
    list.innerHTML = `
        <table class="table">
            <thead><tr><th>Student</th><th>Email</th><th>Joined</th></tr></thead>
            <tbody>${data.map(r => `
                <tr>
                    <td>
                        <div class="cell-with-avatar">
                            <div class="avatar-sm">${esc(initials(r.student.full_name))}</div>
                            <span>${esc(r.student.full_name)}</span>
                        </div>
                    </td>
                    <td class="muted">${esc(r.student.email)}</td>
                    <td class="muted">${new Date(r.joined_at).toLocaleDateString()}</td>
                </tr>
            `).join('')}</tbody>
        </table>
    `;
}

function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
