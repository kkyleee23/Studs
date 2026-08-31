-- ============================================================
-- STUDS — Fix signup, and close two privilege holes.
--
-- 1. Profile creation moved off the client. When "Confirm email"
--    is on, signUp() returns a user but NO session, so auth.uid()
--    is still null and the client-side insert into public.users
--    was rejected by users_self_insert. The auth user existed with
--    no profile row: signup said "already registered", sign-in said
--    "email not confirmed", and the app bounced back to login.
--    A trigger on auth.users creates the profile instead, so it no
--    longer depends on a session existing yet.
--
-- 2. users_self_update had no WITH CHECK, so Postgres reused USING
--    and a student could run `update users set role_id = 1` to
--    become a teacher.
--
-- 3. public.roles was the only table with RLS left off, so anyone
--    holding the publishable key could rewrite the role lookup.
-- ============================================================

-- ---------- 1. Profile row is created by the database ----------

create or replace function public.handle_new_user()
returns trigger as $func$
declare
    v_role_name text;
    v_role_id   smallint;
    v_full_name text;
begin
    v_role_name := coalesce(new.raw_user_meta_data ->> 'role', 'student');
    if v_role_name not in ('teacher', 'student') then
        v_role_name := 'student';
    end if;

    select id into v_role_id from public.roles where name = v_role_name;
    if v_role_id is null then
        select id into v_role_id from public.roles where name = 'student';
    end if;

    v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

    insert into public.users (id, email, full_name, role_id)
    values (
        new.id,
        new.email,
        coalesce(v_full_name, split_part(new.email, '@', 1)),
        v_role_id
    )
    on conflict (id) do nothing;

    return new;
end;
$func$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill: accounts created while the client-side insert was failing
-- exist in auth.users with no profile row. Without this they stay broken.
insert into public.users (id, email, full_name, role_id)
select
    au.id,
    au.email,
    coalesce(
        nullif(btrim(coalesce(au.raw_user_meta_data ->> 'full_name', '')), ''),
        split_part(au.email, '@', 1)
    ),
    coalesce(
        (select r.id from public.roles r
          where r.name = au.raw_user_meta_data ->> 'role'
            and r.name in ('teacher', 'student')),
        (select r.id from public.roles r where r.name = 'student')
    )
from auth.users au
where au.email is not null
  and not exists (select 1 from public.users u where u.id = au.id)
on conflict (id) do nothing;

-- The client no longer inserts its own profile row, and leaving this
-- policy in place would let a user pick their own role_id.
drop policy if exists users_self_insert on public.users;

-- ---------- 2. A user may edit their name, nothing else ----------

drop policy if exists users_self_update on public.users;

create policy users_self_update on public.users
    for update using (id = auth.uid()) with check (id = auth.uid());

-- Column privileges are checked independently of RLS, so this is the
-- part that actually makes role_id and email unwritable from the client.
revoke update on public.users from anon, authenticated;
grant  update (full_name) on public.users to authenticated;

-- ---------- 3. roles: readable, never writable ----------

alter table public.roles enable row level security;

drop policy if exists roles_readable on public.roles;
create policy roles_readable on public.roles
    for select to authenticated using (true);

revoke insert, update, delete on public.roles from anon, authenticated;
