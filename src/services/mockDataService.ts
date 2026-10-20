import { Teacher, Group, PeriodDefinition, TimeBlock, AbsenceRequest } from '../types';

export const MOCK_TEACHERS: Teacher[] = [
  {
    id: 't-carlos-mendoza',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@ievillaflora.edu.co',
    phone: '3001234567',
    document_id: '71234567',
    subjects: ['Matemáticas', 'Física'],
    is_active: true,
    avatar_color: '#3b82f6',
    shift: 'both',
  },
  {
    id: 't-laura-restrepo',
    name: 'Laura Restrepo',
    email: 'laura.restrepo@ievillaflora.edu.co',
    phone: '3109876543',
    document_id: '43567890',
    subjects: ['Lengua Castellana', 'Literatura'],
    is_active: true,
    avatar_color: '#ec4899',
    shift: 'morning',
  },
  {
    id: 't-andres-giraldo',
    name: 'Andrés Giraldo',
    email: 'andres.giraldo@ievillaflora.edu.co',
    phone: '3155551234',
    document_id: '98765432',
    subjects: ['Ciencias Naturales', 'Química', 'Biología'],
    is_active: true,
    avatar_color: '#10b981',
    shift: 'morning',
  },
  {
    id: 't-sofia-ospina',
    name: 'Sofía Ospina',
    email: 'sofia.ospina@ievillaflora.edu.co',
    phone: '3204449876',
    document_id: '32456789',
    subjects: ['Inglés'],
    is_active: true,
    avatar_color: '#8b5cf6',
    shift: 'both',
  },
  {
    id: 't-diego-henao',
    name: 'Diego Henao',
    email: 'diego.henao@ievillaflora.edu.co',
    phone: '3012223344',
    document_id: '70112233',
    subjects: ['Ciencias Sociales', 'Filosofía'],
    is_active: true,
    avatar_color: '#f59e0b',
    shift: 'morning',
  },
  {
    id: 't-valentina-cano',
    name: 'Valentina Cano',
    email: 'valentina.cano@ievillaflora.edu.co',
    phone: '3128887766',
    document_id: '1017234567',
    subjects: ['Educación Física'],
    is_active: true,
    avatar_color: '#06b6d4',
    shift: 'both',
  },
  {
    id: 't-mateo-arango',
    name: 'Mateo Arango',
    email: 'mateo.arango@ievillaflora.edu.co',
    phone: '3146665544',
    document_id: '1020456789',
    subjects: ['Tecnología e Informática'],
    is_active: true,
    avatar_color: '#6366f1',
    shift: 'both',
  },
  {
    id: 't-isabel-zuluaga',
    name: 'Isabel Zuluaga',
    email: 'isabel.zuluaga@ievillaflora.edu.co',
    phone: '3053332211',
    document_id: '1152432109',
    subjects: ['Educación Artística'],
    is_active: true,
    avatar_color: '#f97316',
    shift: 'morning',
  },
];

export const MOCK_BACHILLERATO_GROUPS: Group[] = [
  { id: '6-1', name: '6°1', grade: '6°', shift: 'morning', student_count: 38, classroom_default: 'Aula 101' },
  { id: '6-2', name: '6°2', grade: '6°', shift: 'morning', student_count: 36, classroom_default: 'Aula 102' },
  { id: '7-1', name: '7°1', grade: '7°', shift: 'morning', student_count: 35, classroom_default: 'Aula 201' },
  { id: '7-2', name: '7°2', grade: '7°', shift: 'morning', student_count: 37, classroom_default: 'Aula 202' },
  { id: '8-1', name: '8°1', grade: '8°', shift: 'morning', student_count: 34, classroom_default: 'Aula 203' },
  { id: '8-2', name: '8°2', grade: '8°', shift: 'morning', student_count: 33, classroom_default: 'Aula 204' },
  { id: '9-1', name: '9°1', grade: '9°', shift: 'morning', student_count: 33, classroom_default: 'Aula 301' },
  { id: '9-2', name: '9°2', grade: '9°', shift: 'morning', student_count: 34, classroom_default: 'Aula 302' },
  { id: '10-1', name: '10°1', grade: '10°', shift: 'morning', student_count: 32, classroom_default: 'Aula 303' },
  { id: '10-2', name: '10°2', grade: '10°', shift: 'morning', student_count: 31, classroom_default: 'Aula 304' },
  { id: '11-1', name: '11°1', grade: '11°', shift: 'morning', student_count: 30, classroom_default: 'Lab. Ciencias' },
  { id: '11-2', name: '11°2', grade: '11°', shift: 'morning', student_count: 29, classroom_default: 'Lab. Física' },
];

export const MOCK_PRIMARIA_GROUPS: Group[] = [
  { id: 't-2', name: 'Transición 2', grade: 'Transición', shift: 'afternoon', student_count: 25, classroom_default: 'Aula P-101' },
  { id: '1-1', name: '1.1', grade: '1°', shift: 'afternoon', student_count: 32, classroom_default: 'Aula P-101' },
  { id: '1-2', name: '1.2', grade: '1°', shift: 'afternoon', student_count: 30, classroom_default: 'Aula P-102' },
  { id: '2-1', name: '2.1', grade: '2°', shift: 'afternoon', student_count: 33, classroom_default: 'Aula P-201' },
  { id: '2-2', name: '2.2', grade: '2°', shift: 'afternoon', student_count: 31, classroom_default: 'Aula P-202' },
  { id: '3-1', name: '3.1', grade: '3°', shift: 'afternoon', student_count: 35, classroom_default: 'Aula P-301' },
  { id: '3-2', name: '3.2', grade: '3°', shift: 'afternoon', student_count: 34, classroom_default: 'Aula P-302' },
  { id: '3-3', name: '3.3', grade: '3°', shift: 'afternoon', student_count: 32, classroom_default: 'Aula P-303' },
  { id: '4-1', name: '4.1', grade: '4°', shift: 'afternoon', student_count: 36, classroom_default: 'Aula P-401' },
  { id: '4-2', name: '4.2', grade: '4°', shift: 'afternoon', student_count: 35, classroom_default: 'Aula P-402' },
  { id: '5-1', name: '5.1', grade: '5°', shift: 'afternoon', student_count: 34, classroom_default: 'Aula P-501' },
  { id: '5-2', name: '5.2', grade: '5°', shift: 'afternoon', student_count: 33, classroom_default: 'Aula P-502' },
];

export const MOCK_TRANSICION_GROUPS: Group[] = [
  { id: 't-1', name: 'Transición 1', grade: 'Transición', shift: 'transicion-1', student_count: 26, classroom_default: 'Aula P-102' },
];

export const MOCK_GROUPS: Group[] = [
  ...MOCK_BACHILLERATO_GROUPS,
  ...MOCK_PRIMARIA_GROUPS,
  ...MOCK_TRANSICION_GROUPS,
];

export const MORNING_PERIODS: PeriodDefinition[] = [
  { period: 1, label: '1ª Hora', start_time: '06:10', end_time: '07:05', shift: 'morning' },
  { period: 2, label: '2ª Hora', start_time: '07:05', end_time: '08:00', shift: 'morning' },
  { period: 3, label: '3ª Hora', start_time: '08:00', end_time: '08:55', shift: 'morning' },
  { period: 4, label: '4ª Hora', start_time: '09:25', end_time: '10:20', shift: 'morning' },
  { period: 5, label: '5ª Hora', start_time: '10:20', end_time: '11:15', shift: 'morning' },
  { period: 6, label: '6ª Hora', start_time: '11:15', end_time: '12:10', shift: 'morning' },
];

export const AFTERNOON_PERIODS: PeriodDefinition[] = [
  { period: 1, label: '1ª Hora', start_time: '12:30', end_time: '13:25', shift: 'afternoon' },
  { period: 2, label: '2ª Hora', start_time: '13:25', end_time: '14:20', shift: 'afternoon' },
  { period: 3, label: '3ª Hora', start_time: '14:20', end_time: '15:15', shift: 'afternoon' },
  { period: 4, label: '4ª Hora', start_time: '15:45', end_time: '16:40', shift: 'afternoon' },
  { period: 5, label: '5ª Hora', start_time: '16:40', end_time: '17:35', shift: 'afternoon' },
];

// Helper to generate seed timetable blocks
export function generateSeedTimeBlocks(): TimeBlock[] {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;
  const blocks: TimeBlock[] = [];

  const subjectRotation = [
    { subject: 'Matemáticas', teacherId: 't-carlos-mendoza' },
    { subject: 'Lengua Castellana', teacherId: 't-laura-restrepo' },
    { subject: 'Ciencias Naturales', teacherId: 't-andres-giraldo' },
    { subject: 'Inglés', teacherId: 't-sofia-ospina' },
    { subject: 'Ciencias Sociales', teacherId: 't-diego-henao' },
    { subject: 'Educación Física', teacherId: 't-valentina-cano' },
    { subject: 'Tecnología', teacherId: 't-mateo-arango' },
    { subject: 'Educación Artística', teacherId: 't-isabel-zuluaga' },
  ];

  MOCK_GROUPS.forEach((group, gIdx) => {
    const periods = group.shift === 'morning' ? MORNING_PERIODS : AFTERNOON_PERIODS;
    
    days.forEach((day, dIdx) => {
      periods.forEach((periodDef) => {
        const itemIdx = (gIdx + dIdx + periodDef.period) % subjectRotation.length;
        const subjectItem = subjectRotation[itemIdx];
        
        // Example absence: Carlos Mendoza on Lunes periods 1 & 2 in 10-1 is absent, covered by Sofia Ospina in period 1
        let status: TimeBlock['status'] = 'regular';
        let absenceRequestId: string | null = null;
        let replacementTeacherId: string | null = null;

        if (day === 'lunes' && subjectItem.teacherId === 't-carlos-mendoza' && group.id === '10-1') {
          if (periodDef.period === 1) {
            status = 'covered';
            absenceRequestId = 'abs-req-001';
            replacementTeacherId = 't-sofia-ospina';
          } else if (periodDef.period === 2) {
            status = 'absent';
            absenceRequestId = 'abs-req-001';
          }
        }

        blocks.push({
          id: `tb-${group.id}-${day}-p${periodDef.period}`,
          block_type: 'class',
          day_of_week: day,
          period: periodDef.period,
          start_time: periodDef.start_time,
          end_time: periodDef.end_time,
          group_id: group.id,
          grade: group.grade,
          shift: group.shift,
          subject: subjectItem.subject,
          teacher_id: subjectItem.teacherId,
          classroom: group.classroom_default || 'Aula 101',
          status,
          absence_request_id: absenceRequestId,
          replacement_teacher_id: replacementTeacherId,
          notes: status === 'covered' ? 'Cubierto temporalmente por docente de guardia' : null,
          updated_at: new Date().toISOString(),
        });
      });
    });
  });

  return blocks;
}

// Initial Absence Requests (Maker-Checker Demonstration)
export const MOCK_ABSENCE_REQUESTS: AbsenceRequest[] = [
  {
    id: 'abs-req-001',
    teacher_id: 't-carlos-mendoza',
    teacher_name: 'Carlos Mendoza',
    date: '2026-10-19',
    status: 'approved',
    reason: 'Cita médica especialista EPS Sura',
    created_at: '2026-10-16T14:30:00Z',
    reviewed_by: 'Coord. Académica María Elena Restrepo',
    reviewed_at: '2026-10-16T15:00:00Z',
    affected_periods: [1, 2],
    replacement_teacher_id: 't-sofia-ospina',
    replacement_teacher_name: 'Sofía Ospina',
    review_notes: 'Aprobado. Se asigna Prof. Sofía para guardia en periodo 1.',
  },
  {
    id: 'abs-req-002',
    teacher_id: 't-andres-giraldo',
    teacher_name: 'Andrés Giraldo',
    date: '2026-10-20',
    status: 'pending',
    reason: 'Capacitación Secretaría de Educación - Laboratorios STEM',
    created_at: '2026-10-16T18:15:00Z',
    reviewed_by: null,
    reviewed_at: null,
    affected_periods: [3, 4, 5],
    replacement_teacher_id: null,
    review_notes: null,
  },
  {
    id: 'abs-req-003',
    teacher_id: 't-diego-henao',
    teacher_name: 'Diego Henao',
    date: '2026-10-21',
    status: 'pending',
    reason: 'Calamidad doméstica justificada',
    created_at: '2026-10-16T19:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    affected_periods: [1, 2, 3, 4, 5, 6],
    replacement_teacher_id: null,
    review_notes: null,
  },
];
