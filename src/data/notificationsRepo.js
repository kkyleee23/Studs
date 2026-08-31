import { supabase } from './supabaseClient.js';

export async function listMine({ limit = 20 } = {}) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
}

export async function unreadCount() {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
}

export async function markRead(id) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    if (error) throw error;
}

export async function markAllRead() {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
    if (error) throw error;
}

export async function notifyUser({ target_uid, title, body = null, link = null }) {
    const { data, error } = await supabase.rpc('notify_user', {
        p_target_uid: target_uid,
        p_title: title,
        p_body: body,
        p_link: link,
    });
    if (error) throw error;
    return data;
}

export async function notifyClassStudents({ class_id, title, body = null, link = null }) {
    const { data, error } = await supabase.rpc('notify_class_students', {
        p_class_id: class_id,
        p_title: title,
        p_body: body,
        p_link: link,
    });
    if (error) throw error;
    return data;
}
