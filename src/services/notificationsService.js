import * as repo from '../data/notificationsRepo.js';

export async function listRecent(limit = 20) {
    return repo.listMine({ limit });
}

export async function getUnreadCount() {
    return repo.unreadCount();
}

export async function markRead(id) {
    return repo.markRead(id);
}

export async function markAllRead() {
    return repo.markAllRead();
}

export async function softNotifyUser(args) {
    try { return await repo.notifyUser(args); }
    catch (e) { console.warn('notify_user failed:', e.message); }
}

export async function softNotifyClass(args) {
    try { return await repo.notifyClassStudents(args); }
    catch (e) { console.warn('notify_class_students failed:', e.message); }
}
