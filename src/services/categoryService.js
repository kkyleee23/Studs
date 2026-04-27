// Service Layer — grading categories (Quiz, Exam, ...) per class.
// Weights are configurable per class. Fully data-driven.

import * as categoriesRepo from '../data/categoriesRepo.js';
import { getOrFetch, invalidate } from '../data/cache.js';

export async function listForClass(classId) {
    return getOrFetch(
        `categories:${classId}`,
        () => categoriesRepo.listByClass(classId),
        60_000
    );
}

export async function addCategory(classId, { name, weight, drop_lowest_n = 0, position = 0 }) {
    if (!name?.trim()) throw new Error('Category name is required');
    const w = Number(weight);
    if (!Number.isFinite(w) || w < 0 || w > 100) {
        throw new Error('Weight must be between 0 and 100');
    }
    const drop = Math.max(0, Number(drop_lowest_n) || 0);
    const created = await categoriesRepo.insertCategory({
        class_id: classId,
        name: name.trim(),
        weight: w,
        drop_lowest_n: drop,
        position
    });
    invalidate(`categories:${classId}`);
    return created;
}

export async function updateCategory(id, patch) {
    const next = { ...patch };
    if (next.weight !== undefined) {
        const w = Number(next.weight);
        if (!Number.isFinite(w) || w < 0 || w > 100) {
            throw new Error('Weight must be between 0 and 100');
        }
        next.weight = w;
    }
    if (next.drop_lowest_n !== undefined) {
        next.drop_lowest_n = Math.max(0, Number(next.drop_lowest_n) || 0);
    }
    const updated = await categoriesRepo.updateCategory(id, next);
    if (updated?.class_id) invalidate(`categories:${updated.class_id}`);
    else invalidate('categories:');
    return updated;
}

export async function removeCategory(id) {
    const deleted = await categoriesRepo.deleteCategory(id);
    invalidate('categories:');
    return deleted;
}

// Validation used before enabling a class for grading.
// DB intentionally does not enforce this (row-by-row editing).
export async function validateWeightsSumTo100(classId) {
    const cats = await categoriesRepo.listByClass(classId);
    const sum = cats.reduce((t, c) => t + Number(c.weight), 0);
    return { ok: Math.abs(sum - 100) < 0.01, sum, categories: cats };
}
