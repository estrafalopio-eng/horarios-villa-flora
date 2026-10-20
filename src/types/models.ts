/**
 * PRD - Motor de Agendamiento B2B (I.E. Villa Flora)
 * Strict Data Models & Interfaces
 * Source of Truth: PRD section 3, Maker-Checker Workflow & Matrix Architecture
 */

export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';

export type ShiftType = 'morning' | 'afternoon' | 'transicion-1';

export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

export type TimeBlockStatus = 'regular' | 'absent' | 'covered' | 'cancelled';

export type TimeBlockType = 'class' | 'break' | 'technical_media' | 'exit';

export type UserRole = 'coordinator' | 'teacher' | 'public';

/**
 * 1. absence_requests: Document model for the Maker-Checker absence workflow
 * Maker: Teacher submits request (status = 'pending')
 * Checker: Coordinator reviews, approves or rejects, and assigns replacement
 */
export interface AbsenceRequest {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  date: string; // ISO format: YYYY-MM-DD
  status: AbsenceStatus; // "pending" | "approved" | "rejected"
  reason: string;
  created_at: string; // ISO 8601 string
  reviewed_by: string | null;
  reviewed_at: string | null;
  // B2B Scheduling Extensions
  affected_periods?: number[]; // [1, 2, 3] or empty for full day
  replacement_teacher_id?: string | null;
  replacement_teacher_name?: string | null;
  review_notes?: string | null;
}

/**
 * 2. time_blocks: Core matrix scheduling slot
 * Represents an assigned teaching period for a group in the school timetable
 */
export interface TimeBlock {
  id: string;
  block_type: TimeBlockType;
  day_of_week: DayOfWeek;
  period: number; // 1 to 11
  start_time: string; // "06:30"
  end_time: string; // "07:25"
  group_id: string; // "6-1", "10-2"
  grade: string; // "6°", "10°"
  shift: ShiftType; // 'morning' | 'afternoon'
  level?: 'bachillerato' | 'primaria';
  subject: string; // "Matemáticas", "Inglés", "Biología", etc.
  teacher_id: string;
  classroom: string; // "Aula 204", "Laboratorio"
  status: TimeBlockStatus; // 'regular' | 'absent' | 'covered' | 'cancelled'
  absence_request_id?: string | null;
  replacement_teacher_id?: string | null;
  notes?: string | null;
  updated_at: string;
}

/**
 * 3. teachers: Academic staff catalog
 */
export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document_id: string;
  subjects: string[];
  is_active: boolean;
  avatar_color?: string;
  shift?: ShiftType | 'both';
}

/**
 * 4. groups: Student cohorts (Grados y Grupos)
 */
export interface Group {
  id: string; // "6-1"
  name: string; // "6°1"
  grade: string; // "6°"
  shift: ShiftType;
  director_teacher_id?: string;
  student_count: number;
  classroom_default?: string;
}

/**
 * 5. Period definition (Horas de clase del colegio)
 */
export interface PeriodDefinition {
  period: number;
  label: string; // "1° Hora"
  start_time: string;
  end_time: string;
  shift: ShiftType;
  is_break?: boolean;
}

/**
 * Coordinator Matrix Filter State
 */
export interface MatrixFilterState {
  day: DayOfWeek;
  shift: ShiftType;
  gradeFilter: string; // 'all' or specific grade e.g. '6°'
  searchQuery: string;
  statusFilter: 'all' | TimeBlockStatus;
}

/**
 * Matrix Cell Composite View (Computed for Desktop UI)
 */
export interface MatrixCellView {
  timeBlock: TimeBlock | null;
  teacher?: Teacher;
  replacementTeacher?: Teacher;
  hasPendingAbsence?: boolean;
  pendingAbsenceId?: string;
}
