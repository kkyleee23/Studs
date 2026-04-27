-- ============================================================
-- STUDS — Fix: allow a freshly-signed-up user to insert their
-- own profile row (id = auth.uid()). Missing in 0001 meant
-- signup silently failed to create the profile, and roles
-- could never be assigned.
-- ============================================================

create policy users_self_insert on public.users
    for insert with check (id = auth.uid());
