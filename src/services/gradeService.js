import * as categoryService from './categoryService.js';
import * as activityService from './activityService.js';
import * as scoreService    from './scoreService.js';
import { computeFinalGrade } from './gradeEngine.js';

export async function getStudentGrade(classId, studentId) {
    const [categories, activities, scores] = await Promise.all([
        categoryService.listForClass(classId),
        activityService.listForClass(classId),
        scoreService.listForStudentInClass(classId, studentId)
    ]);

    return computeFinalGrade({ categories, activities, scores });
}

export async function getClassGrades(classId) {
    const [categories, activities, scores] = await Promise.all([
        categoryService.listForClass(classId),
        activityService.listForClass(classId),
        scoreService.listForClass(classId)
    ]);

    const byStudent = new Map();
    for (const s of scores) {
        const key = s.student_id;
        if (!byStudent.has(key)) {
            byStudent.set(key, { student: s.student, rows: [] });
        }
        byStudent.get(key).rows.push(s);
    }

    const results = [];
    for (const [studentId, { student, rows }] of byStudent) {
        results.push({
            student_id: studentId,
            student_name: student?.full_name ?? '(unknown)',
            ...computeFinalGrade({ categories, activities, scores: rows })
        });
    }
    return results;
}
