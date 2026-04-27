// Entry point — bootstraps session, mounts layout, starts router.
import { startRouter } from './router.js';
import { mountLayout } from './layout/shell.js';
import { getSession } from './data/authRepo.js';
import { renderLogin } from './pages/login.js';

async function boot() {
    const app = document.getElementById('app');
    const session = await getSession();

    if (!session) {
        renderLogin(app, { onSuccess: boot });
        return;
    }

    await mountLayout(app);
    startRouter();
}

boot();
