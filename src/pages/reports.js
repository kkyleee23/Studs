// Reports — teacher: class grade list + summary; student: own breakdown.
import * as gradeService from '../services/gradeService.js';
import { getMyProfile } from '../services/userService.js';
import { summarizeClass } from '../services/gradeEngine.js';
import { supabase } from '../data/supabaseClient.js';

export async function renderReports(view, { classId }) {
    view.innerHTML = `<p class="muted">Loading…</p>`;
    const me = await getMyProfile();
    const isTeacher = me?.role === 'teacher';

    const { data: cls } = await supabase.from('classes')
        .select('passing_grade').eq('id', classId).maybeSingle();
    const passingGrade = Number(cls?.passing_grade ?? 75);

    if (isTeacher) {
        const rows = await gradeService.getClassGrades(classId);
        const summary = summarizeClass(rows, passingGrade);
        view.innerHTML = `
            <div class="page-header">
                <a class="back-btn" href="#/classes/${classId}" title="Back to class" aria-label="Back to class">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </a>
                <div class="titles">
                    <h1>Class grade report</h1>
                    <div class="sub">Passing grade: ${passingGrade.toFixed(2)}</div>
                </div>
            </div>

            <div class="stat-grid" style="margin-bottom:20px">
                <div class="stat">
                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                    <div class="label">Students with grades</div><div class="value">${summary.count}</div>
                </div>
                <div class="stat">
                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
                    <div class="label">Class average</div><div class="value">${summary.average.toFixed(2)}</div>
                </div>
                <div class="stat">
                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                    <div class="label">Highest grade</div><div class="value">${summary.highest.toFixed(2)}</div>
                </div>
                <div class="stat">
                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div class="label">Passing so far</div><div class="value">${summary.passing} <small class="muted" style="font-size:13px;font-weight:400;font-family:var(--font-sans)">of ${summary.count}</small></div>
                </div>
            </div>

            <div class="card">
                ${rows.length === 0 ? `<div class="empty">
                    <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
                    <div class="empty-title">No grades to show yet</div>
                    <div class="empty-sub">Once students log scores on the activities you've added, their grades will appear here.</div>
                </div>` : `
                <table class="table">
                    <thead><tr><th>Student</th><th class="num">Final grade</th><th class="num">Graded so far</th><th>Status</th></tr></thead>
                    <tbody>${rows.map(r => `
                        <tr>
                            <td>${esc(r.student_name)}</td>
                            <td class="num"><strong>${r.final_grade.toFixed(2)}</strong></td>
                            <td class="num">${r.effective_weight.toFixed(2)}% <span class="muted">/ ${r.weights_sum.toFixed(2)}%</span></td>
                            <td>${statusBadge(r.final_grade, passingGrade)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
        return;
    }

    const g = await gradeService.getStudentGrade(classId, me.id);
    view.innerHTML = `
        <div class="page-header">
            <a class="back-btn" href="#/classes/${classId}" title="Back to class" aria-label="Back to class">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </a>
            <div class="titles">
                <h1>My grade</h1>
                <div class="sub">How you're doing in this class so far</div>
            </div>
        </div>
        <div class="stat-grid" style="margin-bottom:20px">
            <div class="stat">
                <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                <div class="label">Grade so far</div><div class="value">${g.final_grade.toFixed(2)}</div>
            </div>
            <div class="stat">
                <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div class="label">Status</div><div class="value" style="font-size:16px;font-family:var(--font-sans)">${statusBadge(g.final_grade, passingGrade)}</div>
            </div>
            <div class="stat">
                <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                <div class="label">How much is graded</div><div class="value">${g.effective_weight.toFixed(2)}%</div>
            </div>
        </div>
        ${g.breakdown.map(b => categoryCard(b)).join('')}
    `;
}

function categoryCard(b) {
    const dropNote = b.drop_lowest_n > 0
        ? `<span class="badge badge-info" title="Your lowest ${b.drop_lowest_n} ${b.drop_lowest_n === 1 ? 'score is' : 'scores are'} ignored in this category">drops lowest ${b.drop_lowest_n}</span>` : '';
    const ecNote = b.extra_credit_bonus > 0
        ? `<span class="badge badge-success" title="Bonus points from extra-credit activities">+${b.extra_credit_bonus.toFixed(2)} bonus</span>` : '';
    return `
        <div class="card">
            <div class="card-header">
                <h2>${esc(b.category_name)}</h2>
                <div class="spacer"></div>
                ${dropNote} ${ecNote}
                <span class="muted" style="margin-left:8px">Weight: ${b.weight.toFixed(2)}%</span>
            </div>
            ${b.items.length === 0 ? '<p class="muted" style="padding:12px">Nothing in this category yet.</p>' : `
            <table class="table">
                <thead><tr>
                    <th>Activity</th><th class="num">Out of</th><th class="num">My score</th>
                    <th class="num">%</th><th></th>
                </tr></thead>
                <tbody>${b.items.map(i => `
                    <tr style="${i.dropped ? 'opacity:.5' : ''}">
                        <td>
                            ${esc(i.title)}
                            ${i.is_extra_credit ? ' <span class="badge badge-info">bonus</span>' : ''}
                            ${i.dropped ? ' <span class="badge badge-warn">not counted</span>' : ''}
                        </td>
                        <td class="num">${i.max_score.toFixed(2)}</td>
                        <td class="num">${i.raw_score === null ? '<span class="muted">not yet</span>' : i.raw_score.toFixed(2)}</td>
                        <td class="num">${i.percent === null ? '<span class="muted">—</span>' : i.percent.toFixed(2) + '%'}</td>
                        <td></td>
                    </tr>`).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Category total</strong></td>
                        <td class="num">${b.total_max.toFixed(2)}</td>
                        <td class="num">${b.total_raw.toFixed(2)}${b.extra_credit_bonus > 0 ? ` <span class="muted">(+${b.extra_credit_bonus.toFixed(2)} bonus)</span>` : ''}</td>
                        <td class="num"><strong>${b.average_pct.toFixed(2)}%</strong></td>
                        <td class="num"><strong>→ ${b.weighted_score.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>`}
        </div>
    `;
}

function statusBadge(grade, passing) {
    if (grade >= passing) return `<span class="badge badge-success">Passing</span>`;
    return `<span class="badge badge-danger">Failing</span>`;
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
