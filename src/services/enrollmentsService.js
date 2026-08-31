import * as enrollmentsRepo from '../data/enrollmentsRepo.js';

export async function getRoster(classId) {
    const rows = await enrollmentsRepo.listRoster(classId);
    return rows.filter(r => r.student);
}

export async function countStudents(classIds) {
    return enrollmentsRepo.countForClasses(classIds);
}

export async function countsByClass(classIds) {
    const rows = await enrollmentsRepo.listClassIds(classIds);
    const counts = new Map();
    for (const r of rows) counts.set(r.class_id, (counts.get(r.class_id) ?? 0) + 1);
    return counts;
}
