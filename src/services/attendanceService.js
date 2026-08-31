import * as attendanceRepo from '../data/attendanceRepo.js';
import { softNotifyUser } from './notificationsService.js';

const STATUSES = ['present', 'absent', 'late', 'excused'];

export function statuses() {
    return [...STATUSES];
}

export async function getClassDay(classId, date) {
    const rows = await attendanceRepo.listForClassOnDate(classId, date);
    return new Map(rows.map(r => [r.student_id, r.status]));
}

export async function getStudentHistory(classId, studentId) {
    return attendanceRepo.listForStudentInClass(classId, studentId);
}

export async function mark({ class_id, student_id, date, status, recorded_by }) {
    if (!date) throw new Error('A date is required');
    if (!STATUSES.includes(status)) throw new Error('Unknown attendance status');

    const saved = await attendanceRepo.upsertMark({
        class_id, student_id, date, status, recorded_by
    });

    if (status === 'absent' || status === 'late') {
        softNotifyUser({
            target_uid: student_id,
            title: status === 'absent' ? 'Marked absent' : 'Marked late',
            body: `For ${date}`,
            link: `/classes/${class_id}/attendance`
        });
    }

    return saved;
}

export async function clearMark({ class_id, student_id, date }) {
    return attendanceRepo.deleteMark({ class_id, student_id, date });
}
