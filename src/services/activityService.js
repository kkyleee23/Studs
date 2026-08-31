// Service Layer — activities (Quiz #1, Midterm, ...).

import * as activitiesRepo from '../data/activitiesRepo.js';
import { softNotifyClass } from './notificationsService.js';
import { getOrFetch, invalidate } from '../data/cache.js';

export async function listForClass(classId) {
    return getOrFetch(
        `activities:${classId}`,
        () => activitiesRepo.listByClass(classId),
        30_000
    );
}

export async function createActivity(classId, { category_id, title, description, max_score, due_date, is_extra_credit }) {
    if (!title?.trim())   throw new Error('Activity title is required');
    if (!category_id)     throw new Error('Category is required');

    const max = Number(max_score);
    if (!Number.isFinite(max) || max <= 0) {
        throw new Error('Max score must be a positive number');
    }

    const created = await activitiesRepo.insertActivity({
        class_id: classId,
        category_id,
        title: title.trim(),
        description: description?.trim() || null,
        max_score: max,
        due_date: due_date || null,
        is_extra_credit: is_extra_credit === true || is_extra_credit === 'on'
    });
    invalidate(`activities:${classId}`);

    softNotifyClass({
        class_id: classId,
        title: 'New activity posted',
        body: `${created.title} · out of ${Number(created.max_score).toFixed(2)}`,
        link: `/classes/${classId}/activities`,
    });

    return created;
}

export async function removeActivity(id) {
    const result = await activitiesRepo.deleteActivity(id);
    invalidate('activities:');
    invalidate('scores:');
    return result;
}

export async function countForClasses(classIds) {
    return activitiesRepo.countForClasses(classIds);
}

export async function countsByClass(classIds) {
    const rows = await activitiesRepo.listClassIds(classIds);
    const counts = new Map();
    for (const r of rows) counts.set(r.class_id, (counts.get(r.class_id) ?? 0) + 1);
    return counts;
}
