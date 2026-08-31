import { signIn, signUp } from '../data/authRepo.js';
import { friendlyError } from '../components/errors.js';

export function renderLogin(root, { onSuccess }) {
    root.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-brand">
                    <div class="auth-logo">S</div>
                    <div>
                        <div class="auth-name">STUDS</div>
                        <div class="auth-tag">Classroom Performance Tracker</div>
                    </div>
                </div>

                <h2 class="auth-title" data-title>Welcome back</h2>
                <p class="auth-sub" data-subtitle>Sign in to continue to your classes.</p>

                <form>
                    <div class="field">
                        <label for="f-email">Email</label>
                        <input class="input" id="f-email" name="email" type="email" placeholder="you@school.edu" required>
                    </div>
                    <div class="field">
                        <label for="f-pass">Password</label>
                        <input class="input" id="f-pass" name="password" type="password" minlength="6" placeholder="At least 6 characters" required>
                    </div>
                    <div class="field" data-signup hidden>
                        <label for="f-name">Full name</label>
                        <input class="input" id="f-name" name="full_name" placeholder="Jane Santos">
                    </div>
                    <div class="field" data-signup hidden>
                        <label for="f-role">I am a…</label>
                        <select class="select" id="f-role" name="role">
                            <option value="teacher">Teacher — I'll create classes and track grades</option>
                            <option value="student">Student — I'll join a class and log my scores</option>
                        </select>
                    </div>

                    <div class="notice" hidden></div>
                    <div class="error" hidden></div>

                    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:10px 14px">
                        <span data-label>Sign in</span>
                    </button>
                </form>

                <p class="muted" style="text-align:center;margin:18px 0 0;font-size:13px">
                    <span data-toggle-prompt>New to STUDS?</span>
                    <a href="#" data-toggle>Create an account</a>
                </p>
            </div>
            <p class="auth-foot">Built for Philippine classrooms · grades on a 0–100 scale</p>
        </div>
    `;

    const form         = root.querySelector('form');
    const submitBtn    = form.querySelector('button[type="submit"]');
    const toggle       = root.querySelector('[data-toggle]');
    const togglePrompt = root.querySelector('[data-toggle-prompt]');
    const label        = root.querySelector('[data-label]');
    const title        = root.querySelector('[data-title]');
    const subtitle     = root.querySelector('[data-subtitle]');
    const errBox       = root.querySelector('.error');
    const noticeBox    = root.querySelector('.notice');
    let mode = 'signin';
    let busy = false;

    function setMode(next) {
        mode = next;
        root.querySelectorAll('[data-signup]').forEach(el => { el.hidden = mode !== 'signup'; });
        if (mode === 'signup') {
            title.textContent = 'Create your account';
            subtitle.textContent = 'It takes about 30 seconds.';
            label.textContent = 'Create account';
            togglePrompt.textContent = 'Already have an account?';
            toggle.textContent = 'Sign in';
        } else {
            title.textContent = 'Welcome back';
            subtitle.textContent = 'Sign in to continue to your classes.';
            label.textContent = 'Sign in';
            togglePrompt.textContent = 'New to STUDS?';
            toggle.textContent = 'Create an account';
        }
    }

    function showError(message) {
        noticeBox.hidden = true;
        errBox.textContent = message;
        errBox.hidden = false;
    }

    function showNotice(message) {
        errBox.hidden = true;
        noticeBox.textContent = message;
        noticeBox.hidden = false;
    }

    function setBusy(next) {
        busy = next;
        submitBtn.disabled = next;
        label.textContent = next
            ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
            : (mode === 'signup' ? 'Create account' : 'Sign in');
    }

    toggle.addEventListener('click', e => {
        e.preventDefault();
        if (busy) return;
        setMode(mode === 'signin' ? 'signup' : 'signin');
        errBox.hidden = true;
        noticeBox.hidden = true;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;

        errBox.hidden = true;
        noticeBox.hidden = true;
        const data = Object.fromEntries(new FormData(form));
        setBusy(true);

        try {
            if (mode === 'signin') {
                await signIn({ email: data.email, password: data.password });
                onSuccess();
                return;
            }

            const { session } = await signUp({
                email: data.email,
                password: data.password,
                full_name: data.full_name?.trim() || data.email.split('@')[0],
                role: data.role === 'student' ? 'student' : 'teacher'
            });

            if (session) {
                onSuccess();
                return;
            }

            setMode('signin');
            form.querySelector('#f-pass').value = '';
            showNotice(`Account created. We sent a confirmation link to ${data.email} — open it, then sign in here.`);
        } catch (ex) {
            showError(friendlyError(ex));
        } finally {
            setBusy(false);
        }
    });
}
