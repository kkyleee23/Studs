import * as attendanceService from '../services/attendanceService.js';
import * as enrollmentsService from '../services/enrollmentsService.js';
import { getMyProfile } from '../services/userService.js';
import { toast } from '../components/notify.js';
import { friendlyError } from '../components/errors.js';

const STATUSES = attendanceService.statuses();

export async function renderAttendance(view, { classId }) {
    view.innerHTML = `<p class="muted">Loading…</p>`;
    const me = await getMyProfile();
    const isTeacher = me?.role === 'teacher';

    view.innerHTML = `
        <div class="page-header">
            <a class="back-btn" href="#/classes/${classId}" title="Back to class" aria-label="Back to class">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </a>
            <div class="titles">
                <h1>Attendance</h1>
                <div class="sub">${isTeacher ? 'Mark who\'s in class today' : 'Your attendance history'}</div>
            </div>
            <div class="actions">
                <label class="row" style="gap:6px;font-size:13px">
                    Date <input type="date" class="input" id="date" value="${today()}">
                </label>
            </div>
        </div>
        <div class="card"><div id="grid"></div></div>
    `;

    const dateInput = view.querySelector('#date');
    dateInput.addEventListener('change', load);

    async function load() {
        const date = dateInput.value;
        const grid = view.querySelector('#grid');
        grid.innerHTML = '<p class="muted">Loading…</p>';

        try {
            if (isTeacher) await renderTeacherGrid(grid, date);
            else await renderStudentHistory(grid);
        } catch (e) {
            grid.innerHTML = `<div class="error">${esc(friendlyError(e))}</div>`;
        }
    }

    async function renderTeacherGrid(grid, date) {
        const [enrolled, marked] = await Promise.all([
            enrollmentsService.getRoster(classId),
            attendanceService.getClassDay(classId, date)
        ]);
        const roster = enrolled.map(r => r.student);

        if (!roster.length) {
            grid.innerHTML = `<div class="empty">
                <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <div class="empty-title">No one to mark</div>
                <div class="empty-sub">No students have joined this class yet. Share your class code so they can join.</div>
            </div>`;
            return;
        }

        grid.innerHTML = `
            <table class="table">
                <thead><tr><th>Student</th><th>Status</th></tr></thead>
                <tbody>${roster.map(s => `
                    <tr>
                        <td>${esc(s.full_name)}</td>
                        <td><select class="select" data-student="${esc(s.id)}">
                            <option value="">Not yet marked</option>
                            ${STATUSES.map(st => `<option value="${st}" ${marked.get(s.id) === st ? 'selected' : ''}>${statusLabel(st)}</option>`).join('')}
                        </select></td>
                    </tr>
                `).join('')}</tbody>
            </table>
        `;

        grid.querySelectorAll('select[data-student]').forEach(sel => {
            let previous = sel.value;
            sel.addEventListener('change', async () => {
                const student_id = sel.dataset.student;
                const status = sel.value;
                sel.disabled = true;
                try {
                    if (!status) {
                        await attendanceService.clearMark({ class_id: classId, student_id, date });
                    } else {
                        await attendanceService.mark({
                            class_id: classId, student_id, date, status, recorded_by: me.id
                        });
                    }
                    previous = status;
                    toast('Saved', 'success');
                } catch (e) {
                    sel.value = previous;
                    toast(friendlyError(e), 'error');
                } finally {
                    sel.disabled = false;
                }
            });
        });
    }

    async function renderStudentHistory(grid) {
        const rows = await attendanceService.getStudentHistory(classId, me.id);

        if (!rows.length) {
            grid.innerHTML = `<div class="empty">
                <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                <div class="empty-title">No records yet</div>
                <div class="empty-sub">Your teacher will mark attendance here.</div>
            </div>`;
            return;
        }

        grid.innerHTML = `
            <table class="table">
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>${rows.map(r => `<tr><td>${esc(r.date)}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}</tbody>
            </table>
        `;
    }

    load();
}

function statusLabel(s) {
    return { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused' }[s] ?? s;
}
function statusBadge(s) {
    const cls = { present: 'badge-success', late: 'badge-warn', absent: 'badge-danger', excused: 'badge-info' }[s] ?? 'badge';
    return `<span class="badge ${cls}">${statusLabel(s)}</span>`;
}
function today() { return new Date().toISOString().slice(0, 10); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
