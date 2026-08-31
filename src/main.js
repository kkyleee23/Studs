import { startRouter } from './router.js';
import { mountLayout } from './layout/shell.js';
import { getSession, signOut } from './data/authRepo.js';
import { configError } from './data/supabaseClient.js';
import { getMyProfile, clearProfileCache } from './services/userService.js';
import { renderLogin } from './pages/login.js';
import { friendlyError } from './components/errors.js';
import { clearAll as clearCache } from './data/cache.js';
import { esc } from './components/dom.js';

function renderFatal(app, title, detail, action) {
    app.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-brand">
                    <div class="auth-logo">S</div>
                    <div>
                        <div class="auth-name">STUDS</div>
                        <div class="auth-tag">Classroom Performance Tracker</div>
                    </div>
                </div>
                <h2 class="auth-title">${esc(title)}</h2>
                <p class="auth-sub">${esc(detail)}</p>
                <button type="button" class="btn btn-primary" id="fatal-action"
                        style="width:100%;justify-content:center;padding:10px 14px">${esc(action?.label ?? 'Try again')}</button>
            </div>
        </div>
    `;
    app.querySelector('#fatal-action').addEventListener('click', action?.run ?? (() => location.reload()));
}

async function startOver() {
    try { await signOut(); } catch { /* signing out is best effort */ }
    clearProfileCache();
    clearCache();
    location.hash = '';
    location.reload();
}

async function boot() {
    const app = document.getElementById('app');

    if (configError) {
        renderFatal(app, 'Configuration problem', configError);
        return;
    }

    try {
        const session = await getSession();
        if (!session) {
            renderLogin(app, { onSuccess: boot });
            return;
        }

        clearProfileCache();
        const me = await getMyProfile();
        if (!me) {
            renderFatal(
                app,
                'Your profile is incomplete',
                "You're signed in, but this account has no profile yet. Sign out and create your account again — if it keeps happening, tell your teacher.",
                { label: 'Sign out', run: startOver }
            );
            return;
        }

        await mountLayout(app);
        startRouter();
    } catch (e) {
        renderFatal(app, "Couldn't start STUDS", friendlyError(e));
    }
}

boot();
