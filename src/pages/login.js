// Login / sign-up. On success, reboots the app.
import { signIn, signUp } from '../data/authRepo.js';
import { supabase } from '../data/supabaseClient.js';

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

    const form    = root.querySelector('form');
    const toggle  = root.querySelector('[data-toggle]');
    const togglePrompt = root.querySelector('[data-toggle-prompt]');
    const label   = root.querySelector('[data-label]');
    const title   = root.querySelector('[data-title]');
    const subtitle = root.querySelector('[data-subtitle]');
    const errBox  = root.querySelector('.error');
    let mode = 'signin';

    toggle.addEventListener('click', e => {
        e.preventDefault();
        mode = mode === 'signin' ? 'signup' : 'signin';
        root.querySelectorAll('[data-signup]').forEach(el => el.hidden = mode !== 'signup');
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
        errBox.hidden = true;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.hidden = true;
        const data = Object.fromEntries(new FormData(form));

        try {
            if (mode === 'signin') {
                await signIn({ email: data.email, password: data.password });
            } else {
                const user = await signUp({ email: data.email, password: data.password });
                // Ensure a profile row exists. Role id: 1=teacher, 2=student (from schema seed).
                if (user) {
                    const roleId = data.role === 'student' ? 2 : 1;
                    const { error: profileErr } = await supabase.from('users').upsert({
                        id: user.id,
                        email: data.email,
                        full_name: data.full_name || data.email.split('@')[0],
                        role_id: roleId
                    });
                    if (profileErr) throw profileErr;
                }
            }
            onSuccess();
        } catch (ex) {
            errBox.textContent = ex.message || String(ex);
            errBox.hidden = false;
        }
    });
}
