// Service Layer — notifications.
// Thin wrapper over the repo. Adds best-effort error swallowing so
// notification failures never break the action that triggered them
// (e.g. score saved successfully but notify_user errored — we log
// and move on rather than scaring the user with a toast).
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

// "Soft" variants — log on failure rather than throw, so callers can
// fire-and-forget after their main action succeeded.
export async function softNotifyUser(args) {
    try { return await repo.notifyUser(args); }
    catch (e) { console.warn('notify_user failed:', e.message); }
}

export async function softNotifyClass(args) {
    try { return await repo.notifyClassStudents(args); }
    catch (e) { console.warn('notify_class_students failed:', e.message); }
}
