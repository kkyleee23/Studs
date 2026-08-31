import { computeFinalGrade, summarizeClass } from './gradeEngine.js';

let pass = 0, fail = 0;

function test(name, fn) {
    try { fn(); console.log(`  ok  ${name}`); pass++; }
    catch (e) { console.error(`  FAIL ${name}\n       ${e.message}`); fail++; }
}
function assertEq(actual, expected, hint = '') {
    if (Math.abs(actual - expected) > 0.01) {
        throw new Error(`expected ${expected}, got ${actual} ${hint}`);
    }
}

const categories = [
    { id: 'c1', name: 'Quiz', weight: 30 },
    { id: 'c2', name: 'Exam', weight: 50 },
    { id: 'c3', name: 'Project', weight: 20 }
];
const activities = [
    { id: 'a1', category_id: 'c1', max_score: 20, title: 'Quiz 1' },
    { id: 'a2', category_id: 'c1', max_score: 20, title: 'Quiz 2' },
    { id: 'a3', category_id: 'c2', max_score: 100, title: 'Midterm' },
    { id: 'a4', category_id: 'c3', max_score: 50,  title: 'Project 1' }
];

console.log('computeFinalGrade');

test('perfect scores → 100', () => {
    const scores = [
        { activity_id: 'a1', raw_score: 20 },
        { activity_id: 'a2', raw_score: 20 },
        { activity_id: 'a3', raw_score: 100 },
        { activity_id: 'a4', raw_score: 50 }
    ];
    const g = computeFinalGrade({ categories, activities, scores });
    assertEq(g.final_grade, 100);
    assertEq(g.weights_sum, 100);
});

test('no scores → 0 final grade, has_any_score=false', () => {
    const g = computeFinalGrade({ categories, activities, scores: [] });
    assertEq(g.final_grade, 0);
    if (g.has_any_score) throw new Error('expected has_any_score false');
});

test('weighted math — Quiz 75% · Exam 80% · Project 90%', () => {

    const scores = [
        { activity_id: 'a1', raw_score: 15 },
        { activity_id: 'a2', raw_score: 15 },
        { activity_id: 'a3', raw_score: 80 },
        { activity_id: 'a4', raw_score: 45 }
    ];
    const g = computeFinalGrade({ categories, activities, scores });
    assertEq(g.final_grade, 80.5);
});

test('partial — only Quiz scored; effective_weight = 30', () => {
    const scores = [
        { activity_id: 'a1', raw_score: 20 },
        { activity_id: 'a2', raw_score: 20 }
    ];
    const g = computeFinalGrade({ categories, activities, scores });
    assertEq(g.final_grade, 30);
    assertEq(g.effective_weight, 30);
    if (g.is_complete) throw new Error('expected is_complete false');
});

test('normalizeWeights rescales partial to full 100', () => {
    const scores = [
        { activity_id: 'a1', raw_score: 20 },
        { activity_id: 'a2', raw_score: 20 }
    ];
    const g = computeFinalGrade({
        categories, activities, scores,
        options: { normalizeWeights: true }
    });
    assertEq(g.final_grade, 100);
});

test('capping — raw above max is clamped in pct calc', () => {
    const scores = [{ activity_id: 'a3', raw_score: 150 }];
    const g = computeFinalGrade({ categories, activities, scores });

    assertEq(g.breakdown.find(b => b.category_id === 'c2').average_pct, 100);
});

test('zero-max activity does not divide by zero', () => {
    const bad = [{ id: 'x', category_id: 'c1', max_score: 0, title: 'broken' }];
    const g = computeFinalGrade({
        categories: [categories[0]],
        activities: bad,
        scores: [{ activity_id: 'x', raw_score: 5 }]
    });
    assertEq(g.final_grade, 0);
});

test('per-activity items are exposed on breakdown', () => {
    const scores = [{ activity_id: 'a1', raw_score: 20 }];
    const g = computeFinalGrade({ categories, activities, scores });
    const quiz = g.breakdown.find(b => b.category_id === 'c1');
    if (quiz.items.length !== 2) throw new Error('expected 2 items in quiz category');
    const q1 = quiz.items.find(i => i.activity_id === 'a1');
    if (q1.percent !== 100) throw new Error('quiz 1 percent should be 100');
});

test('drop_lowest_n drops lowest quiz only when count > N', () => {
    const cats = [{ id: 'c1', name: 'Quiz', weight: 100, drop_lowest_n: 1 }];
    const acts = [
        { id: 'a1', category_id: 'c1', max_score: 20, title: 'Q1' },
        { id: 'a2', category_id: 'c1', max_score: 20, title: 'Q2' },
        { id: 'a3', category_id: 'c1', max_score: 20, title: 'Q3' }
    ];
    const scores = [
        { activity_id: 'a1', raw_score: 10 },
        { activity_id: 'a2', raw_score: 18 },
        { activity_id: 'a3', raw_score: 20 }
    ];
    const g = computeFinalGrade({ categories: cats, activities: acts, scores });

    assertEq(g.final_grade, 95);
    const dropped = g.breakdown[0].items.filter(i => i.dropped);
    if (dropped.length !== 1 || dropped[0].activity_id !== 'a1') {
        throw new Error('wrong activity dropped');
    }
});

test('drop_lowest_n skipped when scored_count <= N', () => {
    const cats = [{ id: 'c1', name: 'Quiz', weight: 100, drop_lowest_n: 2 }];
    const acts = [
        { id: 'a1', category_id: 'c1', max_score: 20, title: 'Q1' },
        { id: 'a2', category_id: 'c1', max_score: 20, title: 'Q2' }
    ];

    const scores = [
        { activity_id: 'a1', raw_score: 10 },
        { activity_id: 'a2', raw_score: 18 }
    ];
    const g = computeFinalGrade({ categories: cats, activities: acts, scores });
    assertEq(g.final_grade, 70);
});

test('extra-credit adds to numerator without increasing denominator', () => {
    const cats = [{ id: 'c1', name: 'Quiz', weight: 100 }];
    const acts = [
        { id: 'a1', category_id: 'c1', max_score: 20, title: 'Q1' },
        { id: 'a2', category_id: 'c1', max_score: 5,  title: 'Bonus', is_extra_credit: true }
    ];

    const scores = [
        { activity_id: 'a1', raw_score: 20 },
        { activity_id: 'a2', raw_score: 5  }
    ];
    const g = computeFinalGrade({ categories: cats, activities: acts, scores });
    assertEq(g.final_grade, 125);
    assertEq(g.breakdown[0].extra_credit_bonus, 5);
});

test('extra-credit items are never auto-dropped', () => {
    const cats = [{ id: 'c1', name: 'Quiz', weight: 100, drop_lowest_n: 1 }];
    const acts = [
        { id: 'a1', category_id: 'c1', max_score: 20, title: 'Q1' },
        { id: 'a2', category_id: 'c1', max_score: 20, title: 'Q2' },
        { id: 'a3', category_id: 'c1', max_score: 5,  title: 'EC', is_extra_credit: true }
    ];
    const scores = [
        { activity_id: 'a1', raw_score: 10 },
        { activity_id: 'a2', raw_score: 20 },
        { activity_id: 'a3', raw_score: 1  }
    ];
    const g = computeFinalGrade({ categories: cats, activities: acts, scores });
    const ec = g.breakdown[0].items.find(i => i.activity_id === 'a3');
    if (ec.dropped) throw new Error('extra-credit must never be dropped');

    assertEq(g.final_grade, 105);
});

console.log('\nsummarizeClass');

test('computes average, median, passing count', () => {
    const s = summarizeClass([
        { final_grade: 100 }, { final_grade: 90 },
        { final_grade: 74 },  { final_grade: 60 }
    ]);
    assertEq(s.average, 81);
    assertEq(s.median, 82);
    assertEq(s.highest, 100);
    assertEq(s.lowest, 60);
    if (s.passing !== 2) throw new Error(`expected 2 passing, got ${s.passing}`);
    if (s.failing !== 2) throw new Error(`expected 2 failing, got ${s.failing}`);
});

test('summarizeClass respects teacher-set passing grade', () => {
    const s = summarizeClass([
        { final_grade: 82 }, { final_grade: 78 }, { final_grade: 74 }
    ], 80);
    if (s.passing !== 1) throw new Error(`expected 1 passing at threshold 80, got ${s.passing}`);
    if (s.passing_grade !== 80) throw new Error('passing_grade not echoed back');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
