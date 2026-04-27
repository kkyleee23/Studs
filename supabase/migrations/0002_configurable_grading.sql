-- ============================================================
-- STUDS — Phase 7b: make grading fully teacher-configurable.
-- Adds: per-class passing grade, drop-N-lowest, extra-credit.
-- ============================================================

-- Per-class passing grade (Philippine default = 75, but teacher controls).
alter table public.classes
    add column if not exists passing_grade numeric(5,2) not null default 75
    check (passing_grade >= 0 and passing_grade <= 100);

-- Drop the N lowest scores per category when computing the average.
-- 0 = disabled (default). Applied only when scored_count > drop_lowest_n.
alter table public.categories
    add column if not exists drop_lowest_n smallint not null default 0
    check (drop_lowest_n >= 0);

-- Extra-credit activities: raw_score counts toward the numerator, but
-- max_score does NOT count toward the denominator — so students can
-- push a category above 100%.
alter table public.activities
    add column if not exists is_extra_credit boolean not null default false;
