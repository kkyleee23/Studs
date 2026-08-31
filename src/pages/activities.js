import * as activityService from '../services/activityService.js';
import * as categoryService from '../services/categoryService.js';
import * as scoreService    from '../services/scoreService.js';
import { getMyProfile } from '../services/userService.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/notify.js';

export async function renderActivities(view, { classId }) {
    view.innerHTML = `<p class="muted">Loading…</p>`;
    const me = await getMyProfile();
    const isTeacher = me?.role === 'teacher';

    view.innerHTML = `
        <div class="page-header">
            <a class="back-btn" href="#/classes/${classId}" title="Back to class" aria-label="Back to class">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </a>
            <div class="titles">
                <h1>Activities</h1>
                <div class="sub">${isTeacher ? 'Quizzes, exams, and projects you\'ve posted' : 'Everything posted in this class'}</div>
            </div>
            ${isTeacher ? `<div class="actions"><button class="btn btn-primary" id="btn-add"><span class="ico-plus"></span>New activity</button></div>` : ''}
        </div>
        <div class="card"><div id="list"></div></div>
    `;

    async function reload() {
        const box = view.querySelector('#list');
        box.innerHTML = '<p class="muted">Loading…</p>';
        const [acts, myScores] = await Promise.all([
            activityService.listForClass(classId),
            isTeacher ? Promise.resolve([]) : scoreService.listForStudentInClass(classId, me.id)
        ]);
        const scoreMap = new Map(myScores.map(s => [s.activity_id, s]));

        if (acts.length === 0) {
            const icon = `<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg></div>`;
            box.innerHTML = isTeacher
                ? `<div class="empty">${icon}<div class="empty-title">No activities yet</div><div class="empty-sub">Click "New activity" to add quizzes, exams, or projects.</div></div>`
                : `<div class="empty">${icon}<div class="empty-title">Nothing posted yet</div><div class="empty-sub">Your teacher hasn't added any activities for this class.</div></div>`;
            return;
        }
        box.innerHTML = `
            <table class="table">
                <thead><tr>
                    <th>Title</th><th>Category</th><th class="num">Out of</th><th>Due</th>
                    ${isTeacher ? '<th></th>' : '<th class="num">My score</th>'}
                </tr></thead>
                <tbody>${acts.map(a => renderRow(a, scoreMap.get(a.id), isTeacher)).join('')}</tbody>
            </table>
        `;

        box.querySelectorAll('[data-log]').forEach(b =>
            b.addEventListener('click', () => logScore(b.dataset.log, reload)));
        box.querySelectorAll('[data-del]').forEach(b =>
            b.addEventListener('click', () => delActivity(b.dataset.del, reload)));
    }

    if (isTeacher) {
        view.querySelector('#btn-add').addEventListener('click', async () => {
            const cats = await categoryService.listForClass(classId);
            if (cats.length === 0) {
                toast('Add a grading category first so you can sort this activity into it.', 'warn');
                return;
            }
            const data = await openModal({
                title: 'New activity',
                submitLabel: 'Create',
                bodyHtml: `
                    <div class="field"><label>Title</label><input class="input" name="title" placeholder="Quiz 1, Midterm Exam, ..." required></div>
                    <div class="field"><label>Which category does this belong to?</label>
                        <select class="select" name="category_id" required>
                            ${cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field">
                        <label>Highest possible score</label>
                        <input class="input" name="max_score" type="number" step="0.01" min="0.01" placeholder="e.g. 100" required>
                        <small class="muted">The perfect score a student can get on this activity.</small>
                    </div>
                    <div class="field"><label>Due date (optional)</label><input class="input" name="due_date" type="date"></div>
                    <div class="field"><label>Notes for students (optional)</label><textarea class="input" name="description" rows="2" placeholder="Topics covered, reminders, etc."></textarea></div>
                    <div class="field" style="flex-direction:row;align-items:flex-start;gap:8px">
                        <input type="checkbox" id="f-ec" name="is_extra_credit" style="margin-top:4px">
                        <label for="f-ec" style="margin:0">
                            <strong>Mark as extra credit</strong>
                            <div class="muted" style="font-size:13px;font-weight:400">Students can earn bonus points from this without it lowering their grade if they miss it.</div>
                        </label>
                    </div>
                `
            });
            if (!data) return;
            try {
                await activityService.createActivity(classId, data);
                toast('Activity created', 'success');
                reload();
            } catch (e) { toast(e.message, 'error'); }
        });
    }

    reload();
}

function renderRow(a, myScore, isTeacher) {
    const scoreCell = isTeacher
        ? `<td style="text-align:right"><button class="btn-icon danger" data-del="${a.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
              Delete
           </button></td>`
        : `<td class="num">${myScore
             ? `${Number(myScore.raw_score).toFixed(2)} / ${Number(a.max_score).toFixed(2)}
                <button class="btn-icon" data-log="${a.id}" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                </button>`
             : `<button class="btn btn-primary" data-log="${a.id}">Log score</button>`}</td>`;
    return `
        <tr>
            <td>
                ${esc(a.title)}
                ${a.is_extra_credit ? ' <span class="badge badge-info">extra credit</span>' : ''}
            </td>
            <td><span class="badge">${esc(a.category?.name ?? '')}</span></td>
            <td class="num">${Number(a.max_score).toFixed(2)}</td>
            <td>${a.due_date ?? '<span class="muted">—</span>'}</td>
            ${scoreCell}
        </tr>`;
}

async function logScore(activityId, reload) {
    const data = await openModal({
        title: 'Enter your score',
        submitLabel: 'Save',
        bodyHtml: `
            <div class="field">
                <label>What score did you get?</label>
                <input class="input" name="raw_score" type="number" step="0.01" min="0" required>
                <small class="muted">The points you earned out of the highest possible score.</small>
            </div>
            <div class="field"><label>Note to yourself (optional)</label><input class="input" name="note" placeholder="What went well, what to study next time..."></div>
        `
    });
    if (!data) return;
    try {
        await scoreService.logScore({ activity_id: activityId, ...data });
        toast('Score saved', 'success');
        reload();
    } catch (e) { toast(e.message, 'error'); }
}

async function delActivity(id, reload) {
    if (!confirm("Delete this activity? Every student's score for it will also be removed. This can't be undone.")) return;
    try { await activityService.removeActivity(id); toast('Activity deleted', 'success'); reload(); }
    catch (e) { toast(e.message, 'error'); }
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
