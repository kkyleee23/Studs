import { supabase } from './supabaseClient.js';

export async function upsertScore(row) {

    const { data, error } = await supabase
        .from('scores')
        .upsert(row, { onConflict: 'activity_id,student_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function listForStudentInClass(classId, studentId) {
    const { data, error } = await supabase
        .from('scores')
        .select('*, activity:activities!inner(id,title,max_score,category_id,class_id)')
        .eq('student_id', studentId)
        .eq('activity.class_id', classId);
    if (error) throw error;
    return data ?? [];
}

export async function listForClass(classId) {
    const { data, error } = await supabase
        .from('scores')
        .select('*, activity:activities!inner(id,title,max_score,category_id,class_id), student:users!scores_student_id_fkey(id,full_name)')
        .eq('activity.class_id', classId);
    if (error) throw error;
    return data ?? [];
}

export async function countForStudent(studentId) {
    if (!studentId) return 0;
    const { count, error } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);
    if (error) throw error;
    return count ?? 0;
}
