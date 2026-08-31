import * as categoryService from '../services/categoryService.js';
import * as classService from '../services/classService.js';
import { getMyProfile } from '../services/userService.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/notify.js';

export async function renderClassDetail(view, { classId }) {
    view.innerHTML = `<p class="muted">Loading…</p>`;
    const me = await getMyProfile();
    const isTeacher = me?.role === 'teacher';

    async function loadClass() {
        return classService.getClass(classId);
    }

    let cls = await loadClass();
    if (!cls) { view.innerHTML = `<div class="error">Class not found.</div>`; return; }

    function draw() {
        view.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>${esc(cls.name)}</h1>
                    <div class="sub">${esc(cls.section ?? '')} ${cls.school_year ? '· ' + esc(cls.school_year) : ''}</div>
                </div>
                <div class="spacer"></div>
                ${isTeacher ? `
                    <button class="code-chip-btn" type="button" id="copy-code" title="Click to copy">
                        <span class="muted" style="font-weight:500">Join code</span>
                        <span class="code-chip">${esc(cls.class_code)}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                    </button>` : ''}
            </div>

            <div class="tabs">
                <a class="tab active">Overview</a>
                <a class="tab" href="#/classes/${classId}/activities">Activities</a>
                <a class="tab" href="#/classes/${classId}/students">Students</a>
                <a class="tab" href="#/classes/${classId}/attendance">Attendance</a>
                <a class="tab" href="#/classes/${classId}/reports">Reports</a>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2>Class settings</h2>
                    <div class="spacer"></div>
                </div>
                <div class="row" style="gap:24px">
                    <div>
                        <div class="muted" style="font-size:12px;text-transform:uppercase">Passing grade</div>
                        <div style="font-size:20px;font-weight:600">${Number(cls.passing_grade ?? 75).toFixed(2)}</div>
                    </div>
                    ${isTeacher ? `<button class="btn" id="btn-edit-settings">Edit</button>` : ''}
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2>Grading categories</h2>
                    <div class="spacer"></div>
                    ${isTeacher ? `<button class="btn btn-primary" id="btn-add-cat">Add category</button>` : ''}
                </div>
                <div id="cats"></div>
                <div id="sum" class="muted" style="margin-top:8px;font-size:13px"></div>
            </div>
        `;

        if (isTeacher) {
            view.querySelector('#btn-edit-settings').addEventListener('click', editSettings);
            view.querySelector('#btn-add-cat').addEventListener('click', addCat);
            view.querySelector('#copy-code')?.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(cls.class_code);
                    toast(`Copied ${cls.class_code}`, 'success');
                } catch {
                    toast('Could not copy — select the code manually', 'error');
                }
            });
        }
        reloadCats();
    }

    async function editSettings() {
        const data = await openModal({
            title: 'Class settings',
            submitLabel: 'Save',
            bodyHtml: `
                <div class="field">
                    <label>Passing grade (%)</label>
                    <input class="input" name="passing_grade" type="number" step="0.01" min="0" max="100"
                           value="${cls.passing_grade ?? 75}" required>
                    <small class="muted">The lowest grade a student needs to pass. Anyone at or above this shows as passing in reports.</small>
                </div>
            `
        });
        if (!data) return;
        try {
            await classService.setPassingGrade(classId, data.passing_grade);
            cls = await loadClass();
            toast('Saved', 'success');
            draw();
        } catch (e) { toast(e.message, 'error'); }
    }

    async function addCat() {
        const data = await openModal({
            title: 'Add category',
            submitLabel: 'Add',
            bodyHtml: `
                <div class="field"><label>Name</label><input class="input" name="name" placeholder="Quiz" required></div>
                <div class="field">
                    <label>How much of the final grade is this worth? (%)</label>
                    <input class="input" name="weight" type="number" step="0.01" min="0" max="100" required>
                    <small class="muted">All your categories should add up to 100%. Example: Quizzes 20, Exams 50, Projects 30.</small>
                </div>
                <div class="field">
                    <label>Drop the lowest how many scores?</label>
                    <input class="input" name="drop_lowest_n" type="number" step="1" min="0" value="0">
                    <small class="muted">Leave as 0 to count every score. If you set it to 1, each student's lowest score in this category won't count toward their grade — useful if you want to give everyone a free pass on one bad score.</small>
                </div>
            `
        });
        if (!data) return;
        try {
            await categoryService.addCategory(classId, data);
            toast('Category added', 'success');
            reloadCats();
        } catch (e) { toast(e.message, 'error'); }
    }

    async function reloadCats() {
        const box = view.querySelector('#cats');
        const sum = view.querySelector('#sum');
        const cats = await categoryService.listForClass(classId);

        if (cats.length === 0) {
            box.innerHTML = `<div class="empty">
                <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                <div class="empty-title">No categories yet</div>
                <div class="empty-sub">${isTeacher ? 'Add Quizzes, Exams, and Projects so you can sort activities into them.' : 'Your teacher hasn\'t set up grading categories for this class yet.'}</div>
            </div>`;
            sum.textContent = '';
            return;
        }

        box.innerHTML = `
            <table class="table">
                <thead><tr>
                    <th>Name</th>
                    <th class="num">Weight (%)</th>
                    <th class="num">Drops lowest</th>
                    <th></th>
                </tr></thead>
                <tbody>${cats.map(c => `
                    <tr data-id="${c.id}">
                        <td>${esc(c.name)}</td>
                        <td class="num">${Number(c.weight).toFixed(2)}</td>
                        <td class="num">${c.drop_lowest_n > 0 ? c.drop_lowest_n : '—'}</td>
                        <td style="text-align:right">
                            ${isTeacher ? `
                                <button class="btn-icon" data-edit title="Edit">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Edit
                                </button>
                                <button class="btn-icon danger" data-del title="Delete">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                                    Delete
                                </button>` : ''}
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        `;

        const total = cats.reduce((t, c) => t + Number(c.weight), 0);
        const ok = Math.abs(total - 100) < 0.01;
        sum.innerHTML = `Your categories add up to <strong>${total.toFixed(2)}%</strong>. ${ok
            ? '<span class="badge badge-success">Looks good</span>'
            : '<span class="badge badge-warn">Should add up to 100%</span>'}`;

        if (isTeacher) {
            box.querySelectorAll('[data-edit]').forEach(b =>
                b.addEventListener('click', () => editCat(b.closest('tr').dataset.id, cats, reloadCats)));
            box.querySelectorAll('[data-del]').forEach(b =>
                b.addEventListener('click', () => delCat(b.closest('tr').dataset.id, reloadCats)));
        }
    }

    draw();
}

async function editCat(id, cats, reload) {
    const cat = cats.find(c => c.id === id);
    const data = await openModal({
        title: 'Edit category',
        submitLabel: 'Save',
        bodyHtml: `
            <div class="field"><label>Name</label><input class="input" name="name" required value="${esc(cat.name)}"></div>
            <div class="field">
                <label>How much of the final grade is this worth? (%)</label>
                <input class="input" name="weight" type="number" step="0.01" min="0" max="100" required value="${cat.weight}">
            </div>
            <div class="field">
                <label>Drop the lowest how many scores?</label>
                <input class="input" name="drop_lowest_n" type="number" step="1" min="0" value="${cat.drop_lowest_n ?? 0}">
                <small class="muted">0 means keep every score. 1 drops each student's single worst score in this category.</small>
            </div>
        `
    });
    if (!data) return;
    try {
        await categoryService.updateCategory(id, data);
        toast('Saved', 'success');
        reload();
    } catch (e) { toast(e.message, 'error'); }
}

async function delCat(id, reload) {
    if (!confirm('Delete this category? If it still has activities in it, you\'ll need to remove or move those first.')) return;
    try { await categoryService.removeCategory(id); toast('Category deleted', 'success'); reload(); }
    catch (e) {
        const msg = /foreign key|violates/i.test(e.message)
            ? 'This category still has activities in it. Delete or move those first, then try again.'
            : e.message;
        toast(msg, 'error');
    }
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
