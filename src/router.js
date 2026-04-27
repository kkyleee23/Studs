// Minimal hash-based router. Each route renders into #view.
// Kept intentionally small — no framework needed (see spec: no over-engineering).

import { renderDashboard }   from './pages/dashboard.js';
import { renderClasses }     from './pages/classes.js';
import { renderClassDetail } from './pages/classDetail.js';
import { renderActivities }  from './pages/activities.js';
import { renderStudents }    from './pages/students.js';
import { renderAttendance }  from './pages/attendance.js';
import { renderReports }     from './pages/reports.js';

const routes = [
    { pattern: /^\/?$/,                          render: renderDashboard },
    { pattern: /^\/dashboard$/,                  render: renderDashboard },
    { pattern: /^\/classes$/,                    render: renderClasses   },
    { pattern: /^\/classes\/([\w-]+)$/,          render: renderClassDetail, params: ['classId'] },
    { pattern: /^\/classes\/([\w-]+)\/activities$/, render: renderActivities, params: ['classId'] },
    { pattern: /^\/classes\/([\w-]+)\/students$/,   render: renderStudents,   params: ['classId'] },
    { pattern: /^\/classes\/([\w-]+)\/attendance$/, render: renderAttendance, params: ['classId'] },
    { pattern: /^\/classes\/([\w-]+)\/reports$/,    render: renderReports,    params: ['classId'] }
];

function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/';
    return raw.startsWith('/') ? raw : `/${raw}`;
}

function resolve(path) {
    for (const r of routes) {
        const m = path.match(r.pattern);
        if (m) {
            const params = {};
            (r.params ?? []).forEach((name, i) => { params[name] = m[i + 1]; });
            return { render: r.render, params };
        }
    }
    return null;
}

export function startRouter() {
    const go = () => {
        const view = document.getElementById('view');
        if (!view) return;
        const hit = resolve(parseHash());
        if (hit) hit.render(view, hit.params);
        else     view.innerHTML = '<p class="muted">Page not found.</p>';
    };
    window.addEventListener('hashchange', go);
    go();
}

export function navigate(path) {
    location.hash = path;
}
