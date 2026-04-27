// Attendance — teacher: mark per-day matrix; student: read own history.
import { supabase } from '../data/supabaseClient.js';
import { getMyProfile } from '../services/userService.js';
import { softNotifyUser } from '../services/notificationsService.js';
import { toast } from '../components/notify.js';

const STATUSES = ['present', 'absent', 'late', 'excused'];

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

        if (isTeacher) {
            const [rosterRes, attRes] = await Promise.all([
                supabase.from('enrollments').select('student:users(id, full_name)').eq('class_id', classId),
                supabase.from('attendance').select('*').eq('class_id', classId).eq('date', date)
            ]);
            if (rosterRes.error) { grid.innerHTML = `<div class="error">${rosterRes.error.message}</div>`; return; }
            const roster = (rosterRes.data ?? []).map(r => r.student);
            const byStudent = new Map((attRes.data ?? []).map(a => [a.student_id, a.status]));

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
                            <td><select class="select" data-student="${s.id}">
                                <option value="">Not yet marked</option>
                                ${STATUSES.map(st => `<option value="${st}" ${byStudent.get(s.id) === st ? 'selected' : ''}>${statusLabel(st)}</option>`).join('')}
                            </select></td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            `;

            grid.querySelectorAll('select[data-student]').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const student_id = sel.dataset.student;
                    const status = sel.value;
                    try {
                        if (!status) {
                            await supabase.from('attendance')
                                .delete().eq('class_id', classId).eq('student_id', student_id).eq('date', date);
                        } else {
                            await supabase.from('attendance').upsert({
                                class_id: classId, student_id, date, status, recorded_by: me.id
                            }, { onConflict: 'class_id,student_id,date' });
                            if (status === 'absent' || status === 'late') {
                                softNotifyUser({
                                    target_uid: student_id,
                                    title: status === 'absent' ? 'Marked absent' : 'Marked late',
                                    body: `For ${date}`,
                                    link: `/classes/${classId}/attendance`,
                                });
                            }
                        }
                        toast('Saved', 'success');
                    } catch (e) { toast(e.message, 'error'); }
                });
            });
        } else {
            const { data, error } = await supabase.from('attendance')
                .select('date, status').eq('class_id', classId).eq('student_id', me.id)
                .order('date', { ascending: false });
            if (error) { grid.innerHTML = `<div class="error">${error.message}</div>`; return; }
            if (!data.length) {
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
                    <tbody>${data.map(r => `<tr><td>${r.date}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}</tbody>
                </table>
            `;
        }
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
