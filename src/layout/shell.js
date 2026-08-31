import { getMyProfile, clearProfileCache } from '../services/userService.js';
import { signOut } from '../data/authRepo.js';
import * as classService from '../services/classService.js';
import * as notifService from '../services/notificationsService.js';
import * as enrollmentsService from '../services/enrollmentsService.js';
import * as scoreService from '../services/scoreService.js';
import { clearAll as clearCache } from '../data/cache.js';

const ICONS = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
    classes:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5z"/></svg>`,
    help:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>`,
    bell:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
    signout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12H4m0 0 3-3m-3 3 3 3"/><path d="M10 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7"/></svg>`,
};

const TIPS_TEACHER = [
    'Share your class code with students so they can join — find it on each class card.',
    'Categories should add up to 100% — Quizzes, Exams, and Projects are a common split.',
    'Set a passing grade per class so reports show who\'s on track at a glance.',
    'Drop the lowest score in a category to give students a free pass on one bad day.',
];
const TIPS_STUDENT = [
    'Logged a wrong score? Open the activity again and update it before your teacher locks it.',
    'Your Reports tab shows exactly which scores count and which were dropped.',
    'Joined the wrong class? Ask your teacher — they can remove you from the roster.',
];

export async function mountLayout(root) {
    const me = await getMyProfile();
    const initials = getInitials(me?.full_name);
    const isTeacher = me?.role === 'teacher';
    const tip = pickTip(isTeacher);

    root.innerHTML = `
        <div class="layout">
            <button class="menu-btn" id="btn-menu" type="button" aria-label="Toggle menu">
                <svg class="icon-bars" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                <svg class="icon-x"    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
            </button>
            <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
            <aside class="sidebar" id="sidebar">
                <div class="brand">
                    <div class="brand-name">STUDS</div>
                    <div class="brand-sub">Student Management</div>
                </div>

                <nav id="nav">
                    <a href="#/dashboard" data-route="/dashboard"><span class="ico">${ICONS.dashboard}</span>Dashboard</a>
                    <a href="#/classes"   data-route="/classes"><span class="ico">${ICONS.classes}</span>Classes</a>
                </nav>

                <div class="side-section">At a glance</div>
                <div class="mini-stats" id="mini-stats">
                    <div class="mini-stat"><div class="n">—</div><div class="l">${isTeacher ? 'Classes' : 'Joined'}</div></div>
                    <div class="mini-stat"><div class="n">—</div><div class="l">${isTeacher ? 'Students' : 'Logged'}</div></div>
                </div>

                <div class="side-section">Tip</div>
                <div class="tip-card">
                    <div class="tip-label">${isTeacher ? 'For teachers' : 'For students'}</div>
                    ${escape(tip)}
                </div>

                <div class="sidebar-spacer"></div>

                <div class="today-strip">
                    <span class="dot"></span>
                    <span>${formatToday()}</span>
                </div>

                <div class="side-foot">
                    <button class="foot-link" id="btn-notif" type="button">
                        ${ICONS.bell}<span>Notifications</span>
                        <span class="unread-pill" id="unread-pill" style="display:none">0</span>
                    </button>
                    <button class="foot-link" id="btn-help" type="button">
                        ${ICONS.help}<span>Help &amp; tips</span>
                    </button>
                </div>

                <div class="user-chip">
                    <div class="avatar">${escape(initials)}</div>
                    <div class="user-meta">
                        <div class="user-name">${escape(me?.full_name ?? '')}</div>
                        <div class="user-role">${escape((me?.role ?? '').replace(/^./, c => c.toUpperCase()))}</div>
                    </div>
                    <button class="icon-btn" id="btn-signout" title="Sign out" aria-label="Sign out">${ICONS.signout}</button>
                </div>
            </aside>
            <main class="main">
                <section class="view" id="view"></section>
            </main>
        </div>
    `;

    root.querySelector('#btn-signout').addEventListener('click', async () => {
        await signOut();
        clearProfileCache();
        clearCache();
        location.hash = '';
        location.reload();
    });

    const highlight = () => {
        const hash = location.hash.replace('#', '') || '/dashboard';
        root.querySelectorAll('#nav a').forEach(a => {
            a.classList.toggle('active', hash.startsWith(a.dataset.route));
        });
    };
    window.addEventListener('hashchange', highlight);
    highlight();

    const sidebar = root.querySelector('#sidebar');
    const backdrop = root.querySelector('#sidebar-backdrop');
    const menuBtn = root.querySelector('#btn-menu');
    const closeDrawer = () => { sidebar.classList.remove('open'); backdrop.classList.remove('show'); menuBtn.classList.remove('open'); };
    const openDrawer  = () => { sidebar.classList.add('open');    backdrop.classList.add('show');    menuBtn.classList.add('open'); };
    menuBtn.addEventListener('click', () => sidebar.classList.contains('open') ? closeDrawer() : openDrawer());
    backdrop.addEventListener('click', closeDrawer);
    sidebar.querySelectorAll('a, .foot-link').forEach(el => el.addEventListener('click', closeDrawer));
    window.addEventListener('hashchange', closeDrawer);

    loadMiniStats(root, me, isTeacher).catch(() => {});

    setupNotifications(root);

    root.querySelector('#btn-help').addEventListener('click', () => openHelpModal(isTeacher));
}

function openHelpModal(isTeacher) {
    const tips = isTeacher ? TIPS_TEACHER : TIPS_STUDENT;
    const guide = isTeacher ? TEACHER_GUIDE : STUDENT_GUIDE;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
        <div class="modal" style="width:540px">
            <div class="modal-header">
                <h2>Help &amp; tips</h2>
                <div class="spacer"></div>
                <button type="button" class="modal-close" data-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>
            </div>
            <div class="modal-body">
                <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px">
                    Getting started
                </h3>
                <ol style="margin:0 0 18px 18px;padding:0;line-height:1.7;font-size:13.5px">
                    ${guide.map(g => `<li>${escape(g)}</li>`).join('')}
                </ol>
                <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px">
                    Tips
                </h3>
                <ul style="margin:0 0 0 18px;padding:0;line-height:1.7;font-size:13.5px;color:#334155">
                    ${tips.map(t => `<li>${escape(t)}</li>`).join('')}
                </ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-close>Got it</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
}

const TEACHER_GUIDE = [
    'Create a class from the Classes page — a join code is generated automatically.',
    'Open the class and add grading categories (Quizzes, Exams, Projects). Make sure they add up to 100%.',
    'Add activities under each category and set the highest possible score.',
    'Students log their own scores; you can override any score to correct it.',
    'Open Reports to see who\'s passing and the class average.',
];
const STUDENT_GUIDE = [
    'Click "Join a class" and paste the code your teacher shared with you.',
    'Open the class and go to Activities to see what\'s posted.',
    'Click "Log score" on each activity once you have your score back.',
    'Check Reports any time to see your running grade and category breakdown.',
];

function setupNotifications(root) {
    const bell = root.querySelector('#btn-notif');
    const pill = root.querySelector('#unread-pill');
    let popEl = null;

    async function refreshCount() {
        try {
            const n = await notifService.getUnreadCount();
            if (n > 0) { pill.textContent = n > 99 ? '99+' : String(n); pill.style.display = 'inline-grid'; }
            else { pill.style.display = 'none'; }
        } catch {  }
    }

    bell.addEventListener('click', async () => {
        if (popEl) { popEl.remove(); popEl = null; return; }
        popEl = document.createElement('div');
        popEl.className = 'notif-pop';
        popEl.innerHTML = `
            <div class="head">
                <h3>Notifications</h3>
                <div class="spacer"></div>
                <button class="btn btn-ghost" id="mark-all" style="font-size:12px;padding:4px 8px">Mark all read</button>
            </div>
            <div class="body" id="notif-body"><p class="muted" style="padding:16px">Loading…</p></div>
        `;
        document.body.appendChild(popEl);

        const close = (e) => {
            if (popEl && !popEl.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
                popEl.remove(); popEl = null;
                document.removeEventListener('click', close, true);
            }
        };
        setTimeout(() => document.addEventListener('click', close, true), 0);

        try {
            const items = await notifService.listRecent(20);
            const body = popEl.querySelector('#notif-body');
            if (items.length === 0) {
                body.innerHTML = `<div class="notif-empty">You're all caught up.</div>`;
            } else {
                body.innerHTML = items.map(n => `
                    <div class="notif-item ${n.is_read ? 'read' : ''}" data-id="${n.id}" data-link="${escape(n.link ?? '')}">
                        <div class="dot"></div>
                        <div class="body-col">
                            <div class="t">${escape(n.title)}</div>
                            ${n.body ? `<div class="b">${escape(n.body)}</div>` : ''}
                            <div class="when">${relTime(n.created_at)}</div>
                        </div>
                    </div>
                `).join('');
                body.querySelectorAll('.notif-item').forEach(el => {
                    el.addEventListener('click', async () => {
                        const id = el.dataset.id;
                        const link = el.dataset.link;
                        if (!el.classList.contains('read')) {
                            el.classList.add('read');
                            try { await notifService.markRead(id); } catch {}
                            refreshCount();
                        }
                        if (link) location.hash = link;
                        if (popEl) { popEl.remove(); popEl = null; }
                    });
                });
            }
        } catch (e) {
            popEl.querySelector('#notif-body').innerHTML = `<div class="notif-empty">Couldn't load notifications.</div>`;
        }

        popEl.querySelector('#mark-all').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await notifService.markAllRead();
                popEl.querySelectorAll('.notif-item').forEach(i => i.classList.add('read'));
                refreshCount();
            } catch {}
        });
    });

    refreshCount();
    setInterval(refreshCount, 60_000);
}

function relTime(iso) {
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

async function loadMiniStats(root, me, isTeacher) {
    const classes = await classService.listMyClasses({ role: me?.role });
    let secondNum = 0;

    if (isTeacher) {
        secondNum = await enrollmentsService.countStudents(classes.map(c => c.id));
    } else {
        secondNum = await scoreService.countForStudent(me?.id);
    }

    const stats = root.querySelector('#mini-stats');
    if (!stats) return;
    const ns = stats.querySelectorAll('.n');
    if (ns[0]) ns[0].textContent = String(classes.length);
    if (ns[1]) ns[1].textContent = String(secondNum);
}

function pickTip(isTeacher) {
    const pool = isTeacher ? TIPS_TEACHER : TIPS_STUDENT;

    const d = new Date();
    const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % pool.length;
    return pool[idx];
}

function formatToday() {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function getInitials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escape(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
