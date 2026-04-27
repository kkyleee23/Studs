-- ============================================================
-- STUDS — Phase 9: Notifications.
-- The notifications table exists since 0001 with an owner-only
-- RLS policy. To let a teacher post a notification *to a student*,
-- we expose a SECURITY DEFINER helper that validates the caller
-- and target share a class first.
-- ============================================================

create or replace function public.notify_user(
    p_target_uid uuid,
    p_title      text,
    p_body       text default null,
    p_link       text default null
) returns uuid as $func$
declare
    v_uid uuid := auth.uid();
    v_id  uuid;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    -- Allow self-notify (user marking their own todo) or cross-user
    -- notify when both share a class.
    if v_uid <> p_target_uid and not public.shares_a_class(p_target_uid) then
        raise exception 'not allowed: users do not share a class';
    end if;

    insert into public.notifications (user_id, title, body, link)
    values (p_target_uid, p_title, p_body, p_link)
    returning id into v_id;

    return v_id;
end;
$func$ language plpgsql security definer;

grant execute on function public.notify_user(uuid, text, text, text) to authenticated;

-- Bulk variant: notify every enrolled student of a class. Used when a
-- teacher creates an activity or posts a class-wide announcement.
create or replace function public.notify_class_students(
    p_class_id uuid,
    p_title    text,
    p_body     text default null,
    p_link     text default null
) returns int as $func$
declare
    v_uid   uuid := auth.uid();
    v_count int;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    -- Only the teacher of the class may broadcast.
    if not public.is_class_teacher(p_class_id) then
        raise exception 'not allowed: caller is not the class teacher';
    end if;

    insert into public.notifications (user_id, title, body, link)
    select e.student_id, p_title, p_body, p_link
      from public.enrollments e
     where e.class_id = p_class_id;

    get diagnostics v_count = row_count;
    return v_count;
end;
$func$ language plpgsql security definer;

grant execute on function public.notify_class_students(uuid, text, text, text) to authenticated;
