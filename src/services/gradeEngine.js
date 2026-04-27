// ============================================================
// Grade Computation Engine — pure functions, no I/O.
//
// Formula (Philippine weighted grading, 0–100 scale):
//   categoryAverage = Σ counted_raw  /  Σ counted_max
//   weightedScore   = categoryAverage × weight
//   finalGrade      = Σ weightedScore
//
// Teacher-configurable switches (all data-driven, no hardcoding):
//   • category.weight          — 0..100, any split per class
//   • category.drop_lowest_n   — drop N lowest scored (non-EC) items
//                                only when scored_count > drop_lowest_n
//   • activity.is_extra_credit — raw counts, max doesn't; can exceed 100%
//   • class.passing_grade      — threshold used in class summaries
//
// Engine hardcodes nothing about curriculum, categories, or scales.
// ============================================================

/**
 * @typedef {Object} Category     {id, name, weight, drop_lowest_n?}
 * @typedef {Object} Activity     {id, category_id, max_score, is_extra_credit?}
 * @typedef {Object} Score        {activity_id, raw_score}
 * @typedef {Object} GradeOptions
 *   normalizeWeights — rescale to sum of weights that have scored activities
 */

export function computeFinalGrade({ categories, activities, scores, options = {} }) {
    const { normalizeWeights = false } = options;

    const scoreByActivity = new Map(scores.map(s => [s.activity_id, s]));
    const breakdown = categories.map(cat =>
        buildCategoryResult(cat, activities, scoreByActivity));

    const effectiveWeight = breakdown
        .filter(b => b.activities_counted > 0)
        .reduce((t, b) => t + b.weight, 0);

    if (normalizeWeights && effectiveWeight > 0 && effectiveWeight !== 100) {
        const scale = 100 / effectiveWeight;
        for (const b of breakdown) {
            if (b.activities_counted > 0) {
                b.normalized_weight = round2(b.weight * scale);
                b.weighted_score    = round2((b.average_pct / 100) * b.normalized_weight);
            }
        }
    }

    const finalGrade = breakdown.reduce((t, b) => t + b.weighted_score, 0);
    const weightsSum = breakdown.reduce((t, b) => t + b.weight, 0);

    return {
        final_grade:      round2(finalGrade),
        weights_sum:      round2(weightsSum),
        effective_weight: round2(effectiveWeight),
        breakdown,
        has_any_score:    scores.length > 0,
        is_complete:      Math.abs(weightsSum - 100) < 0.01 &&
                          Math.abs(effectiveWeight - weightsSum) < 0.01
    };
}

function buildCategoryResult(category, activities, scoreByActivity) {
    const weight       = Number(category.weight) || 0;
    const dropN        = Math.max(0, Number(category.drop_lowest_n) || 0);
    const acts         = activities.filter(a => a.category_id === category.id);

    // Build per-activity records first (before any dropping).
    const items = acts.map(a => {
        const score = scoreByActivity.get(a.id);
        const max   = Number(a.max_score) || 0;
        const isEC  = !!a.is_extra_credit;
        const raw   = score ? clamp(Number(score.raw_score) || 0, 0, Infinity) : null;
        // Cap non-EC scores at max; EC allowed to exceed.
        const capped = raw === null
            ? null
            : (isEC ? raw : Math.min(raw, max));

        return {
            activity_id:     a.id,
            title:           a.title,
            max_score:       max,
            raw_score:       capped,
            is_extra_credit: isEC,
            dropped:         false,
            percent:         capped === null || max === 0 ? null : round2((capped / max) * 100)
        };
    });

    // Apply drop-lowest-N (only to non-EC scored items, only when count > N).
    const scoredRegular = items
        .filter(i => !i.is_extra_credit && i.raw_score !== null && i.max_score > 0);
    if (dropN > 0 && scoredRegular.length > dropN) {
        const sortedAsc = [...scoredRegular].sort((a, b) => a.percent - b.percent);
        for (let i = 0; i < dropN; i++) {
            const drop = items.find(x => x.activity_id === sortedAsc[i].activity_id);
            if (drop) drop.dropped = true;
        }
    }

    // Accumulate counted numerator/denominator.
    let totalRaw = 0, totalMax = 0, counted = 0, ecBonus = 0;
    for (const i of items) {
        if (i.raw_score === null || i.dropped) continue;
        if (i.is_extra_credit) {
            ecBonus += i.raw_score;     // numerator only
            counted += 1;
            continue;
        }
        if (i.max_score <= 0) continue;
        totalRaw += i.raw_score;
        totalMax += i.max_score;
        counted  += 1;
    }

    const numerator  = totalRaw + ecBonus;
    const averageFrac = totalMax > 0 ? (numerator / totalMax) : 0;

    return {
        category_id:        category.id,
        category_name:      category.name,
        weight,
        drop_lowest_n:      dropN,
        total_raw:          round2(totalRaw),
        total_max:          round2(totalMax),
        extra_credit_bonus: round2(ecBonus),
        average_pct:        round2(averageFrac * 100),
        weighted_score:     round2(averageFrac * weight),
        activities_counted: counted,
        activities_total:   acts.length,
        items
    };
}

/**
 * Summarize grades across many students.
 * passingGrade defaults to 75 (PH default) but the teacher's class value
 * should be passed in from classes.passing_grade.
 */
export function summarizeClass(studentGrades, passingGrade = 75) {
    const finals = studentGrades.map(g => g.final_grade).filter(Number.isFinite);
    if (finals.length === 0) {
        return { count: 0, average: 0, median: 0, highest: 0, lowest: 0,
                 passing: 0, failing: 0, passing_grade: passingGrade };
    }
    const sorted  = [...finals].sort((a, b) => a - b);
    const mid     = Math.floor(sorted.length / 2);
    const median  = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const passing = finals.filter(n => n >= passingGrade).length;
    return {
        count:         finals.length,
        average:       round2(finals.reduce((t, n) => t + n, 0) / finals.length),
        median:        round2(median),
        highest:       round2(Math.max(...finals)),
        lowest:        round2(Math.min(...finals)),
        passing,
        failing:       finals.length - passing,
        passing_grade: passingGrade
    };
}

function round2(n) { return Math.round(n * 100) / 100; }
function clamp(n, lo, hi) { return Math.min(Math.max(n, lo), hi); }
