// Classes page — list + create (teacher) / join (student).
import * as classService from '../services/classService.js';
import { getMyProfile } from '../services/userService.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/notify.js';
import { supabase } from '../data/supabaseClient.js';

const SWATCH_PALETTE = ['', 'green', 'amber', 'blue'];

export async function renderClasses(view) {
    const me = await getMyProfile();
    const isTeacher = me?.role === 'teacher';

    view.innerHTML = `
        <div class="page-header">
            <div class="titles">
                <h1>Classes</h1>
                <div class="sub">${isTeacher ? 'Manage the classes you teach' : 'Classes you\'ve joined'}</div>
            </div>
            <div class="actions">
                <button class="btn btn-primary" id="btn-primary-action">
                    <span class="ico-plus"></span>${isTeacher ? 'Create class' : 'Join a class'}
                </button>
            </div>
        </div>
        <div id="list"></div>
    `;

    const actionBtn = view.querySelector('#btn-primary-action');
    actionBtn.addEventListener('click', () => isTeacher ? openCreate(reload) : openJoin(reload));

    async function reload() {
        const list = view.querySelector('#list');
        list.innerHTML = '<p class="muted">Loading…</p>';
        try {
            const items = await classService.listMyClasses({ role: me?.role });
            if (items.length === 0) {
                list.innerHTML = `<div class="card"><div class="empty">
                    <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5z"/></svg></div>
                    <div class="empty-title">No classes yet</div>
                    <div class="empty-sub">${isTeacher
                        ? 'Click "Create class" to make your first one.'
                        : 'Click "Join a class" and enter the code your teacher shared with you.'}</div>
                </div></div>`;
                return;
            }
            list.innerHTML = renderCards(items, isTeacher);
            wireCardEvents(list, isTeacher);
            // Pull counts in the background; cards keep their dashes
            // until the queries finish.
            loadCardCounts(list, items.map(c => c.id));
        } catch (e) {
            list.innerHTML = `<div class="error">${e.message}</div>`;
        }
    }
    reload();
}

function renderCards(items, isTeacher) {
    return `<div class="class-grid">${items.map((c, i) => {
        const swatch = SWATCH_PALETTE[i % SWATCH_PALETTE.length];
        return `
            <a class="class-card" href="#/classes/${c.id}" data-class-id="${c.id}">
                <div class="top">
                    <div class="swatch ${swatch}"></div>
                    <div style="flex:1;min-width:0">
                        <div class="name">${esc(c.name)}</div>
                        <div class="sub">${esc([c.section, c.school_year].filter(Boolean).join(' · ')) || '—'}</div>
                    </div>
                </div>
                <div class="stats">
                    <span><strong data-stat-students="${c.id}">—</strong> students</span>
                    <span><strong data-stat-activities="${c.id}">—</strong> activities</span>
                </div>
                ${isTeacher ? `
                    <div class="code-row">
                        <span class="muted" style="font-size:12px">Join code</span>
                        <span class="code-chip">${esc(c.class_code)}</span>
                        <button class="copy-btn" type="button" data-copy="${esc(c.class_code)}" title="Copy code" aria-label="Copy code">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                        </button>
                    </div>` : ''}
            </a>`;
    }).join('')}</div>`;
}

function wireCardEvents(root, isTeacher) {
    if (!isTeacher) return;
    root.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const code = btn.dataset.copy;
            try {
                await navigator.clipboard.writeText(code);
                toast(`Copied ${code}`, 'success');
            } catch {
                toast('Could not copy — select the code manually', 'error');
            }
        });
    });
}

async function loadCardCounts(root, classIds) {
    if (classIds.length === 0) return;
    try {
        const [enrolls, acts] = await Promise.all([
            supabase.from('enrollments').select('class_id').in('class_id', classIds),
            supabase.from('activities').select('class_id').in('class_id', classIds),
        ]);
        const studentCounts = bucket(enrolls.data ?? [], 'class_id');
        const activityCounts = bucket(acts.data ?? [], 'class_id');
        for (const id of classIds) {
            const s = root.querySelector(`[data-stat-students="${id}"]`);
            const a = root.querySelector(`[data-stat-activities="${id}"]`);
            if (s) s.textContent = studentCounts.get(id) ?? 0;
            if (a) a.textContent = activityCounts.get(id) ?? 0;
        }
    } catch { /* leave dashes */ }
}

function bucket(rows, key) {
    const m = new Map();
    for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
    return m;
}

async function openCreate(reload) {
    const data = await openModal({
        title: 'Create a class',
        submitLabel: 'Create',
        bodyHtml: `
            <div class="field"><label>Class name</label><input class="input" name="name" placeholder="General Math, English 10, ..." required></div>
            <div class="field"><label>Section (optional)</label><input class="input" name="section" placeholder="St. Luke, 10-A, ..."></div>
            <div class="field"><label>School year (optional)</label><input class="input" name="school_year" placeholder="2025-2026"></div>
            <p class="muted" style="font-size:13px;margin:8px 0 0">A join code will be generated so your students can join this class.</p>
        `
    });
    if (!data) return;
    try {
        await classService.createClass(data);
        toast('Class created', 'success');
        reload();
    } catch (e) { toast(e.message, 'error'); }
}

async function openJoin(reload) {
    const data = await openModal({
        title: 'Join a class',
        submitLabel: 'Join',
        bodyHtml: `
            <div class="field">
                <label>Enter the class code from your teacher</label>
                <input class="input mono" name="code" maxlength="12" required
                       style="text-transform:uppercase" placeholder="e.g. UAXTSN">
                <small class="muted">Case doesn't matter — "uaxtsn" and "UAXTSN" both work.</small>
            </div>
        `
    });
    if (!data) return;
    try {
        await classService.joinClass({ code: data.code });
        toast('Joined! Welcome to the class.', 'success');
        reload();
    } catch (e) {
        const msg = /not found/i.test(e.message) ? "We couldn't find a class with that code. Double-check with your teacher." : e.message;
        toast(msg, 'error');
    }
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
