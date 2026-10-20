/**
 * Motor de Volcado (Export Engine): Google Sheets Serverless Bridge
 * 
 * Consolida el estado transaccional completo de la PWA (docentes con carga legal,
 * matriz de horarios por jornada y catálogo de materias) en un objeto estructurado
 * y ejecuta el webhook POST hacia la Web App de Google Apps Script.
 * 
 * Regla de Oro: SUPRESIÓN DE API DIRECTA (Sin googleapis, sin tokens, sin OAuth en cliente).
 */

import { TimeBlockEntity, DayOfWeek } from '../entities/time-block.entity';
import { UserEntity } from '../entities/user.entity';
import { GradeEntity, ShiftType } from '../entities/grade.entity';
import { calculateTeacherAssignedHours } from '../../presentation/hooks/useTeacherLoad';
import { getWeekDateRangeString } from './temporal-engine.service';
import { getCurrentWeekText, getOrdinalSuffix } from './ChronologyEngine';
import { BACHILLERATO_PERIODS, PRIMARIA_PERIODS } from '../../presentation/components/matrix/DesktopMatrixGrid';

export interface ExportTeacherItem {
  id: string;
  displayName: string;
  documentId: string;
  maxWeeklyHours: number;
  currentAssignedHours: number;
  remainingHours: number;
  isOverloaded: boolean;
  allowedSubjects: string[];
}

export interface ExportGridCell {
  subject: string;
  teacherName: string;
  classroomName: string;
  status: string;
  blockType: string;
}

export interface ExportDaySchedule {
  dayId: DayOfWeek;
  dayLabel: string;
  // Matriz [gradeFullName][periodNumber] -> cell data
  grid: Record<string, Record<number, ExportGridCell>>;
}

export interface ExportShiftData {
  shiftId: ShiftType;
  shiftName: string;
  grades: string[];
  periodHeaders: { period: number; time: string; label: string }[];
  days: Record<DayOfWeek, ExportDaySchedule>;
}

export interface ScheduleExportPayload {
  version: string;
  institution: {
    name: string;
    dane: string;
    nit: string;
    city: string;
  };
  metadata: {
    exportedAt: string;
    academicPeriod: string;
    academicWeekText: string;
    totalActiveTeachers: number;
    totalScheduledBlocks: number;
  };
  teachersSummary: ExportTeacherItem[];
  shifts: {
    bachillerato: ExportShiftData;
    primaria: ExportShiftData;
    transicion: ExportShiftData;
  };
  rawBlocksCount: number;
}

const DAYS_OF_WEEK: { id: DayOfWeek; label: string }[] = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
];

const BACHILLERATO_GRADE_NAMES = [
  '6°1', '6°2', '7°1', '7°2', '8°1', '8°2', '9°1', '9°2', '10°1', '10°2', '11°1', '11°2'
];

const PRIMARIA_GRADE_NAMES = [
  'Transición 2', '1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2', '5.1', '5.2'
];

const TRANSICION_GRADE_NAMES = [
  'Transición 1'
];

/**
 * Consolida el estado actual en un objeto JSON limpio y preparado para Google Sheets.
 */
export function buildScheduleExportPayload(
  timeBlocks: TimeBlockEntity[],
  teachers: UserEntity[]
): ScheduleExportPayload {
  const now = new Date();
  const chronology = getCurrentWeekText(now);
  const weekDateRange = getWeekDateRangeString(now);

  // 1. Resumen de Carga Docente
  const teachersSummary: ExportTeacherItem[] = teachers
    .filter((t) => t.role === 'teacher' && t.isActive !== false)
    .map((t) => {
      const assigned = calculateTeacherAssignedHours(t.id, t.displayName, timeBlocks);
      const max = t.maxWeeklyHours || 22;
      return {
        id: t.id,
        displayName: t.displayName,
        documentId: t.documentId || 'S/N',
        maxWeeklyHours: max,
        currentAssignedHours: assigned,
        remainingHours: Math.max(0, max - assigned),
        isOverloaded: assigned > max,
        allowedSubjects: t.allowedSubjects || [],
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  // 2. Auxiliar para construir cuadrícula por jornada
  const buildShiftData = (
    shiftId: ShiftType,
    shiftName: string,
    gradeNames: string[],
    periods: { period: number; time: string; label?: string; ordinal?: string }[]
  ): ExportShiftData => {
    const periodHeaders = periods.map((p) => ({
      period: p.period,
      time: p.time,
      label: p.label || p.ordinal || `P${p.period}`,
    }));

    const days = {} as Record<DayOfWeek, ExportDaySchedule>;

    DAYS_OF_WEEK.forEach(({ id, label }) => {
      const dayGrid: Record<string, Record<number, ExportGridCell>> = {};

      gradeNames.forEach((grade) => {
        dayGrid[grade] = {};
        periods.forEach((p) => {
          // Buscar el bloque correspondiente
          const block = timeBlocks.find((b) => {
            if (b.dayOfWeek !== id) return false;
            if (b.period !== p.period) return false;
            // Match de grado: b.gradeName o b.gradeId
            const blockGrade = (b.gradeName || '').trim();
            return (
              blockGrade === grade ||
              blockGrade.replace('°', '.') === grade.replace('°', '.') ||
              (grade.includes('Transición') && blockGrade.includes('Transición'))
            );
          });

          if (block) {
            dayGrid[grade][p.period] = {
              subject: block.subject || 'Sin Asignar',
              teacherName: block.teacherName || 'Sin Docente',
              classroomName: block.classroomName || '',
              status: block.status || 'regular',
              blockType: block.block_type || 'class',
            };
          } else {
            dayGrid[grade][p.period] = {
              subject: '',
              teacherName: '',
              classroomName: '',
              status: 'regular',
              blockType: 'class',
            };
          }
        });
      });

      days[id] = {
        dayId: id,
        dayLabel: label,
        grid: dayGrid,
      };
    });

    return {
      shiftId,
      shiftName,
      grades: gradeNames,
      periodHeaders,
      days,
    };
  };

  const bachilleratoData = buildShiftData(
    'morning',
    'Bachillerato',
    BACHILLERATO_GRADE_NAMES,
    BACHILLERATO_PERIODS.slice(0, 6) // Horas regulares 1 a 6
  );

  const primariaData = buildShiftData(
    'afternoon',
    'Primaria y Transición 2',
    PRIMARIA_GRADE_NAMES,
    PRIMARIA_PERIODS.slice(0, 5) // Horas regulares 1 a 5
  );

  const transicionData = buildShiftData(
    'transicion-1',
    'Transición 1',
    TRANSICION_GRADE_NAMES,
    [
      { period: 1, time: '12:45 - 13:40', label: '1ª Hora' },
      { period: 2, time: '13:40 - 14:35', label: '2ª Hora' },
      { period: 3, time: '14:35 - 15:30', label: '3ª Hora' },
      { period: 4, time: '16:00 - 16:45', label: '4ª Hora' },
      { period: 5, time: '16:45 - 17:15', label: '5ª Hora' },
    ]
  );

  return {
    version: '1.0.0',
    institution: {
      name: 'Institución Educativa Villa Flora',
      dane: '105001001981',
      nit: '811019776-1',
      city: 'Medellín, Colombia',
    },
    metadata: {
      exportedAt: now.toISOString(),
      academicPeriod: `${chronology.periodNumber}${getOrdinalSuffix(chronology.periodNumber)} Periodo`,
      academicWeekText: weekDateRange,
      totalActiveTeachers: teachersSummary.length,
      totalScheduledBlocks: timeBlocks.filter((b) => b.status !== 'cancelled').length,
    },
    teachersSummary,
    shifts: {
      bachillerato: bachilleratoData,
      primaria: primariaData,
      transicion: transicionData,
    },
    rawBlocksCount: timeBlocks.length,
  };
}

/**
 * Despacha el POST mediante URLSearchParams y mode: 'no-cors' (Arquitectura de Evasión CORS).
 * Empaqueta el JSON bajo el parámetro 'data' con Content-Type: application/x-www-form-urlencoded.
 */
export async function transmitScheduleToGoogleSheets(
  webhookUrl: string,
  payload: ScheduleExportPayload | any
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const cleanUrl = webhookUrl.trim();
  if (!cleanUrl || !cleanUrl.startsWith('https://script.google.com/macros/s/')) {
    throw new Error(
      'La URL del Webhook debe comenzar con "https://script.google.com/macros/s/.../exec". Verifica la URL de tu Web App desplegada.'
    );
  }

  // Empaquetado de formulario clásico para evadir CORS preflight
  const formData = new URLSearchParams();
  formData.append('data', JSON.stringify(payload));

  // Modo 'no-cors' garantiza que el navegador no bloquee el envío
  await fetch(cleanUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  return {
    success: true,
    message: 'Paquete enviado por túnel de formulario. Revisa Google Sheets.',
    timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

export const testWebhook = async (matrixData: any): Promise<void> => {
  try {
    const formData = new URLSearchParams();
    formData.append('data', JSON.stringify(matrixData));

    await fetch(import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK as string, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    alert('Paquete enviado por túnel de formulario. Revisa Google Sheets.');
  } catch (error) {
    console.error("Error en sincronización:", error);
    alert('Fallo de red al intentar sincronizar con Sheets.');
  }
};

