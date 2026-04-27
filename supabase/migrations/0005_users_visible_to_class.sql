-- ============================================================
-- STUDS — Let teachers/classmates see the profile rows of people
-- in the same class. Uses a SECURITY DEFINER helper so the policy
-- doesn't trigger recursive RLS evaluation (users → classes →
-- enrollments → users), which was hanging page loads.
-- ============================================================

-- Returns true if auth.uid() and target_uid share at least one
-- class (either one is the teacher, the other is enrolled, or
-- they are both enrolled, or it's the same user).
create or replace function public.shares_a_class(target_uid uuid)
returns boolean as $$
    select
        target_uid = auth.uid()
        or exists (
            select 1 from public.classes c
             where c.teacher_id = auth.uid()
               and exists (
                   select 1 from public.enrollments e
                    where e.class_id = c.id and e.student_id = target_uid
               )
        )
        or exists (
            select 1 from public.classes c
             where c.teacher_id = target_uid
               and exists (
                   select 1 from public.enrollments e
                    where e.class_id = c.id and e.student_id = auth.uid()
               )
        )
        or exists (
            select 1 from public.enrollments e1
              join public.enrollments e2 on e1.class_id = e2.class_id
             where e1.student_id = auth.uid()
               and e2.student_id = target_uid
        );
$$ language sql stable security definer;

grant execute on function public.shares_a_class(uuid) to authenticated;

-- Replace the previous policy (if it exists) with the helper-based one.
drop policy if exists users_visible_in_shared_class on public.users;
drop policy if exists users_self_read on public.users;

create policy users_visible_to_class on public.users
    for select using (public.shares_a_class(id));
