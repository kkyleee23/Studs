-- ============================================================
-- STUDS — Configurable Classroom Performance & Tracking System
-- Phase 2: Initial schema (Supabase / PostgreSQL)
-- ============================================================

-- ---------- Extensions -------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive emails/codes

-- ============================================================
-- 1. ROLES  (lookup table — avoids hardcoding role strings)
-- ============================================================
create table public.roles (
    id          smallserial primary key,
    name        text not null unique check (name in ('teacher','student','admin'))
);

insert into public.roles (name) values ('teacher'), ('student'), ('admin')
on conflict do nothing;

-- ============================================================
-- 2. USERS  (profile row mirroring auth.users)
-- ============================================================
create table public.users (
    id           uuid primary key references auth.users(id) on delete cascade,
    email        citext not null unique,
    full_name    text not null,
    role_id      smallint not null references public.roles(id),
    created_at   timestamptz not null default now()
);

create index idx_users_role on public.users(role_id);

-- ============================================================
-- 3. CLASSES
-- ============================================================
create table public.classes (
    id             uuid primary key default gen_random_uuid(),
    teacher_id     uuid not null references public.users(id) on delete cascade,
    name           text not null,
    section        text,
    school_year    text,
    class_code     citext not null unique,        -- join code for students
    is_archived    boolean not null default false,
    created_at     timestamptz not null default now()
);

create index idx_classes_teacher on public.classes(teacher_id);

-- ============================================================
-- 4. ENROLLMENTS  (student ↔ class, many-to-many)
-- ============================================================
create table public.enrollments (
    id          uuid primary key default gen_random_uuid(),
    class_id    uuid not null references public.classes(id) on delete cascade,
    student_id  uuid not null references public.users(id)   on delete cascade,
    joined_at   timestamptz not null default now(),
    unique (class_id, student_id)
);

create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_class   on public.enrollments(class_id);

-- ============================================================
-- 5. CATEGORIES  (Quiz, Exam, Recitation, ... per class)
--    Weights are configurable per class, summing to 100.
-- ============================================================
create table public.categories (
    id          uuid primary key default gen_random_uuid(),
    class_id    uuid not null references public.classes(id) on delete cascade,
    name        text not null,
    weight      numeric(5,2) not null check (weight >= 0 and weight <= 100),
    position    smallint not null default 0,
    created_at  timestamptz not null default now(),
    unique (class_id, name)
);

create index idx_categories_class on public.categories(class_id);

-- NOTE: we do NOT enforce "sum of weights = 100" as a DB constraint
-- because weights are edited row-by-row. The service layer validates
-- the total before finalizing a class for grading.

-- ============================================================
-- 6. ACTIVITIES  (Quiz #1, Midterm Exam, ...)
-- ============================================================
create table public.activities (
    id            uuid primary key default gen_random_uuid(),
    class_id      uuid not null references public.classes(id)   on delete cascade,
    category_id   uuid not null references public.categories(id) on delete restrict,
    title         text not null,
    description   text,
    max_score     numeric(8,2) not null check (max_score > 0),
    due_date      date,
    created_at    timestamptz not null default now()
);

create index idx_activities_class    on public.activities(class_id);
create index idx_activities_category on public.activities(category_id);

-- ============================================================
-- 7. SCORES  (one row per student per activity)
-- ============================================================
create table public.scores (
    id           uuid primary key default gen_random_uuid(),
    activity_id  uuid not null references public.activities(id) on delete cascade,
    student_id   uuid not null references public.users(id)      on delete cascade,
    raw_score    numeric(8,2) not null check (raw_score >= 0),
    logged_by    uuid not null references public.users(id),  -- student OR overriding teacher
    is_override  boolean not null default false,
    note         text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    unique (activity_id, student_id)
);

create index idx_scores_student  on public.scores(student_id);
create index idx_scores_activity on public.scores(activity_id);

-- Guard: raw_score may not exceed the activity's max_score.
create or replace function public.enforce_score_cap() returns trigger as $func$
declare
    max_cap numeric(8,2);
begin
    select max_score into max_cap from public.activities where id = new.activity_id;
    if new.raw_score > max_cap then
        raise exception 'raw_score (%) exceeds activity max_score (%)', new.raw_score, max_cap;
    end if;
    new.updated_at := now();
    return new;
end;
$func$ language plpgsql;

create trigger trg_scores_cap
before insert or update on public.scores
for each row execute function public.enforce_score_cap();

-- ============================================================
-- 8. ATTENDANCE
-- ============================================================
create table public.attendance (
    id          uuid primary key default gen_random_uuid(),
    class_id    uuid not null references public.classes(id) on delete cascade,
    student_id  uuid not null references public.users(id)   on delete cascade,
    date        date not null,
    status      text not null check (status in ('present','absent','late','excused')),
    recorded_by uuid not null references public.users(id),
    created_at  timestamptz not null default now(),
    unique (class_id, student_id, date)
);

create index idx_attendance_class_date on public.attendance(class_id, date);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================
create table public.notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.users(id) on delete cascade,
    title      text not null,
    body       text,
    link       text,
    is_read    boolean not null default false,
    created_at timestamptz not null default now()
);

create index idx_notifications_user_unread
    on public.notifications(user_id) where is_read = false;

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================
alter table public.users          enable row level security;
alter table public.classes        enable row level security;
alter table public.enrollments    enable row level security;
alter table public.categories     enable row level security;
alter table public.activities     enable row level security;
alter table public.scores         enable row level security;
alter table public.attendance     enable row level security;
alter table public.notifications  enable row level security;

-- Helper: is the current user the teacher of this class?
create or replace function public.is_class_teacher(cid uuid) returns boolean as $$
    select exists (
        select 1 from public.classes
        where id = cid and teacher_id = auth.uid()
    );
$$ language sql stable security definer;

-- Helper: is the current user enrolled in this class?
create or replace function public.is_enrolled(cid uuid) returns boolean as $$
    select exists (
        select 1 from public.enrollments
        where class_id = cid and student_id = auth.uid()
    );
$$ language sql stable security definer;

-- ---- users: a user sees/updates only their own profile row ----
create policy users_self_read   on public.users
    for select using (id = auth.uid());
create policy users_self_update on public.users
    for update using (id = auth.uid());

-- ---- classes ----
create policy classes_visible on public.classes
    for select using (teacher_id = auth.uid() or public.is_enrolled(id));
create policy classes_teacher_write on public.classes
    for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ---- enrollments ----
create policy enrollments_visible on public.enrollments
    for select using (student_id = auth.uid() or public.is_class_teacher(class_id));
create policy enrollments_student_join on public.enrollments
    for insert with check (student_id = auth.uid());
create policy enrollments_teacher_manage on public.enrollments
    for delete using (public.is_class_teacher(class_id));

-- ---- categories / activities: readable by class members, writable by teacher ----
create policy categories_read on public.categories
    for select using (public.is_class_teacher(class_id) or public.is_enrolled(class_id));
create policy categories_write on public.categories
    for all using (public.is_class_teacher(class_id))
    with check (public.is_class_teacher(class_id));

create policy activities_read on public.activities
    for select using (public.is_class_teacher(class_id) or public.is_enrolled(class_id));
create policy activities_write on public.activities
    for all using (public.is_class_teacher(class_id))
    with check (public.is_class_teacher(class_id));

-- ---- scores: student sees own + logs own; teacher sees/overrides all ----
create policy scores_read on public.scores
    for select using (
        student_id = auth.uid()
        or exists (
            select 1 from public.activities a
            where a.id = scores.activity_id and public.is_class_teacher(a.class_id)
        )
    );
create policy scores_student_log on public.scores
    for insert with check (
        student_id = auth.uid()
        and logged_by = auth.uid()
        and is_override = false
    );
create policy scores_student_update on public.scores
    for update using (student_id = auth.uid() and is_override = false)
             with check (student_id = auth.uid() and is_override = false);
create policy scores_teacher_override on public.scores
    for all using (
        exists (
            select 1 from public.activities a
            where a.id = scores.activity_id and public.is_class_teacher(a.class_id)
        )
    ) with check (
        exists (
            select 1 from public.activities a
            where a.id = scores.activity_id and public.is_class_teacher(a.class_id)
        )
    );

-- ---- attendance: teacher writes; student reads own ----
create policy attendance_read on public.attendance
    for select using (student_id = auth.uid() or public.is_class_teacher(class_id));
create policy attendance_teacher_write on public.attendance
    for all using (public.is_class_teacher(class_id))
    with check (public.is_class_teacher(class_id));

-- ---- notifications: owner-only ----
create policy notifications_owner on public.notifications
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
