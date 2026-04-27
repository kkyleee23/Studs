// Data Layer — raw CRUD on classes + enrollments. No formula, no UI.
import { supabase } from './supabaseClient.js';

export async function insertClass(row) {
    const { data, error } = await supabase
        .from('classes')
        .insert(row)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function findClassByCode(code) {
    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('class_code', code)
        .eq('is_archived', false)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function listClassesForTeacher(teacherId) {
    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function listClassesForStudent(studentId) {
    const { data, error } = await supabase
        .from('enrollments')
        .select('class:classes(*)')
        .eq('student_id', studentId);
    if (error) throw error;
    return (data ?? []).map(r => r.class);
}

export async function updateClass(id, patch) {
    const { data, error } = await supabase
        .from('classes')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function insertEnrollment({ class_id, student_id }) {
    const { data, error } = await supabase
        .from('enrollments')
        .insert({ class_id, student_id })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function joinByCode(code) {
    const { data, error } = await supabase.rpc('join_class_by_code', { p_code: code });
    if (error) {
        if (String(error.message).toLowerCase().includes('class not found')) {
            throw new Error('Class not found');
        }
        throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row && { id: row.out_id, name: row.out_name, class_code: row.out_code };
}
