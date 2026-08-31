import { supabase } from './supabaseClient.js';

export async function listForClassOnDate(classId, date) {
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', date);
    if (error) throw error;
    return data ?? [];
}

export async function listForStudentInClass(classId, studentId) {
    const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function upsertMark(row) {
    const { data, error } = await supabase
        .from('attendance')
        .upsert(row, { onConflict: 'class_id,student_id,date' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteMark({ class_id, student_id, date }) {
    const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('class_id', class_id)
        .eq('student_id', student_id)
        .eq('date', date);
    if (error) throw error;
}
