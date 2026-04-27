-- ============================================================
-- STUDS — Let an authenticated user resolve a class code to an
-- id *without* first being enrolled (chicken-and-egg with RLS).
-- SECURITY DEFINER so it bypasses RLS on classes, but exposes
-- only the minimum columns the join flow needs.
-- ============================================================

drop function if exists public.join_class_by_code(text);

create or replace function public.join_class_by_code(p_code text)
returns table (out_id uuid, out_name text, out_code text)
as $func$
declare
    v_id    uuid;
    v_name  text;
    v_code  text;
    v_uid   uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select c.id, c.name, c.class_code::text
      into v_id, v_name, v_code
      from public.classes c
     where c.class_code = p_code and c.is_archived = false;

    if v_id is null then
        raise exception 'class not found';
    end if;

    insert into public.enrollments (class_id, student_id)
    values (v_id, v_uid)
    on conflict (class_id, student_id) do nothing;

    return query select v_id, v_name, v_code;
end;
$func$ language plpgsql security definer;

grant execute on function public.join_class_by_code(text) to authenticated;
