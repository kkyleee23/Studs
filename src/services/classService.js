// Service Layer — class use-cases.
// Orchestrates repos and enforces business rules; never touches DOM.

import * as classesRepo from '../data/classesRepo.js';
import { currentUserId } from '../data/supabaseClient.js';
import { getOrFetch, invalidate } from '../data/cache.js';

function makeClassCode() {
    // 6-char uppercase code; collision check handled by DB unique constraint.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
}

export async function createClass({ name, section, school_year }) {
    if (!name?.trim()) throw new Error('Class name is required');

    const teacherId = await currentUserId();
    if (!teacherId) throw new Error('Not authenticated');

    // Retry up to 3 times on code collision (statistically rare at 32^6).
    let lastErr;
    for (let i = 0; i < 3; i++) {
        try {
            const created = await classesRepo.insertClass({
                teacher_id: teacherId,
                name: name.trim(),
                section: section?.trim() || null,
                school_year: school_year?.trim() || null,
                class_code: makeClassCode()
            });
            invalidate('classes:');
            return created;
        } catch (e) {
            lastErr = e;
            if (!String(e.message).includes('class_code')) throw e;
        }
    }
    throw lastErr;
}

export async function joinClass({ code }) {
    const trimmed = code?.trim();
    if (!trimmed) throw new Error('Class code is required');
    const result = await classesRepo.joinByCode(trimmed);
    invalidate('classes:');
    return result;
}

export async function setPassingGrade(classId, passing_grade) {
    const p = Number(passing_grade);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
        throw new Error('Passing grade must be between 0 and 100');
    }
    const updated = await classesRepo.updateClass(classId, { passing_grade: p });
    invalidate('classes:');
    return updated;
}

export async function listMyClasses({ role }) {
    const uid = await currentUserId();
    if (!uid) return [];
    return getOrFetch(
        `classes:${role ?? 'student'}:${uid}`,
        () => role === 'teacher'
            ? classesRepo.listClassesForTeacher(uid)
            : classesRepo.listClassesForStudent(uid),
        30_000
    );
}
