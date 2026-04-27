// Dashboard — quick stats + recent classes + recent notifications.
import * as classService from '../services/classService.js';
import * as notifService from '../services/notificationsService.js';
import { getMyProfile } from '../services/userService.js';
import { supabase } from '../data/supabaseClient.js';

const ICONS = {
    classes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5z"/></svg>`,
    users:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    doc:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`,
    bell:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
};

export async function renderDashboard(view) {
    view.innerHTML = `<p class="muted">Loading…</p>`;
    const me = await getMyProfile();
    const isTeacher = me?.role === 'teacher';
    const classes = await classService.listMyClasses({ role: me?.role });
    const classIds = classes.map(c => c.id);

    // Pull a few stats in parallel. Each is best-effort; on error
    // we render a dash so the dashboard never blocks on one bad query.
    const [studentCount, activityCount, recentNotifs] = await Promise.all([
        countStudents(isTeacher, classIds),
        countActivities(classIds),
        notifService.listRecent(5).catch(() => []),
    ]);

    const emptyMsg = isTeacher
        ? `You haven't created any classes yet. Head to <a href="#/classes">Classes</a> to start your first one.`
        : `You haven't joined any classes yet. Head to <a href="#/classes">Classes</a> and enter the code your teacher gave you.`;

    view.innerHTML = `
        <div class="page-header">
            <div class="titles">
                <h1>Dashboard</h1>
                <div class="sub">Welcome back, ${esc(firstName(me?.full_name))}</div>
            </div>
        </div>

        <div class="stat-grid" style="margin-bottom:20px">
            <div class="stat">
                <div class="stat-icon">${ICONS.classes}</div>
                <div class="label">${isTeacher ? 'Classes I teach' : 'Classes I\'m in'}</div>
                <div class="value">${classes.length}</div>
                <div class="hint">${isTeacher ? 'Active this term' : 'Where you\'re enrolled'}</div>
            </div>
            <div class="stat">
                <div class="stat-icon">${isTeacher ? ICONS.users : ICONS.doc}</div>
                <div class="label">${isTeacher ? 'Total students' : 'Activities posted'}</div>
                <div class="value">${isTeacher ? studentCount : activityCount}</div>
                <div class="hint">${isTeacher ? 'Across all your classes' : 'Across your classes'}</div>
            </div>
            <div class="stat">
                <div class="stat-icon">${isTeacher ? ICONS.doc : ICONS.bell}</div>
                <div class="label">${isTeacher ? 'Activities posted' : 'Unread notifications'}</div>
                <div class="value">${isTeacher ? activityCount : recentNotifs.filter(n => !n.is_read).length}</div>
                <div class="hint">${isTeacher ? 'Quizzes, exams, projects' : 'In your bell'}</div>
            </div>
        </div>

        <div class="dashboard-cols">
            <div class="card">
                <div class="card-header">
                    <h2>My classes</h2>
                    <div class="spacer"></div>
                    <a href="#/classes">See all</a>
                </div>
                ${classes.length === 0
                    ? `<div class="empty">
                          <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5z"/></svg></div>
                          <div class="empty-title">Nothing here yet</div>
                          <div class="empty-sub">${emptyMsg}</div>
                       </div>`
                    : `<div class="dash-class-list">${classes.slice(0, 5).map(c => `
                        <a class="dash-class-item" href="#/classes/${c.id}">
                            <div class="dash-class-swatch"></div>
                            <div class="dash-class-meta">
                                <div class="dash-class-name">${esc(c.name)}</div>
                                <div class="dash-class-sub">${esc([c.section, c.school_year].filter(Boolean).join(' · ')) || '—'}</div>
                            </div>
                            <div class="dash-class-arrow">›</div>
                        </a>`).join('')}</div>`}
            </div>

            <div class="card">
                <div class="card-header">
                    <h2>Recent activity</h2>
                </div>
                ${recentNotifs.length === 0
                    ? `<div class="empty">
                          <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg></div>
                          <div class="empty-title">Quiet for now</div>
                          <div class="empty-sub">Notifications about new activities, scores, and attendance will appear here.</div>
                       </div>`
                    : `<div class="dash-feed">${recentNotifs.map(n => `
                        <div class="dash-feed-item ${n.is_read ? 'read' : ''}">
                            <div class="dot"></div>
                            <div class="dash-feed-meta">
                                <div class="dash-feed-title">${esc(n.title)}</div>
                                ${n.body ? `<div class="dash-feed-body">${esc(n.body)}</div>` : ''}
                                <div class="dash-feed-when">${relTime(n.created_at)}</div>
                            </div>
                        </div>`).join('')}</div>`}
            </div>
        </div>
    `;
}

async function countStudents(isTeacher, classIds) {
    if (!isTeacher || classIds.length === 0) return 0;
    try {
        const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds);
        return count ?? 0;
    } catch { return 0; }
}

async function countActivities(classIds) {
    if (classIds.length === 0) return 0;
    try {
        const { count } = await supabase
            .from('activities')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds);
        return count ?? 0;
    } catch { return 0; }
}

function firstName(full) {
    if (!full) return '';
    return String(full).trim().split(/\s+/)[0];
}

function relTime(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
