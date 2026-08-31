// Service Layer — score logging (student) and override (teacher).

import * as scoresRepo from '../data/scoresRepo.js';
import * as activitiesRepo from '../data/activitiesRepo.js';
import { currentUserId } from '../data/supabaseClient.js';
import { softNotifyUser } from './notificationsService.js';
import { getOrFetch, invalidate } from '../data/cache.js';

export async function logScore({ activity_id, raw_score, note }) {
    const uid = await currentUserId();
    if (!uid) throw new Error('Not authenticated');

    const val = Number(raw_score);
    if (!Number.isFinite(val) || val < 0) {
        throw new Error('Score must be a non-negative number');
    }

    // DB trigger enforces raw_score <= max_score; RLS enforces enrollment.
    const saved = await scoresRepo.upsertScore({
        activity_id,
        student_id: uid,
        raw_score: val,
        logged_by: uid,
        is_override: false,
        note: note?.trim() || null
    });
    invalidate('scores:');
    return saved;
}

export async function overrideScore({ activity_id, student_id, raw_score, note }) {
    const teacherId = await currentUserId();
    if (!teacherId) throw new Error('Not authenticated');

    const val = Number(raw_score);
    if (!Number.isFinite(val) || val < 0) {
        throw new Error('Score must be a non-negative number');
    }

    const saved = await scoresRepo.upsertScore({
        activity_id,
        student_id,
        raw_score: val,
        logged_by: teacherId,
        is_override: true,
        note: note?.trim() || null
    });
    invalidate('scores:');

    // Look up activity title + class for a friendly message + deep link.
    try {
        const act = await activitiesRepo.getById(activity_id);
        if (act) {
            softNotifyUser({
                target_uid: student_id,
                title: 'Your teacher updated a score',
                body: `${act.title}: ${val.toFixed(2)} / ${Number(act.max_score).toFixed(2)}`,
                link: `/classes/${act.class_id}/reports`,
            });
        }
    } catch { /* ignore */ }

    return saved;
}

export async function listForStudentInClass(classId, studentId) {
    return getOrFetch(
        `scores:student:${classId}:${studentId}`,
        () => scoresRepo.listForStudentInClass(classId, studentId),
        20_000
    );
}

export async function listForClass(classId) {
    return getOrFetch(
        `scores:class:${classId}`,
        () => scoresRepo.listForClass(classId),
        20_000
    );
}

export async function countForStudent(studentId) {
    return scoresRepo.countForStudent(studentId);
}
