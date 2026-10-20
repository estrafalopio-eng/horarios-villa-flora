import { useMemo } from 'react';
import { UserEntity } from '../../domain/entities/user.entity';
import { TimeBlockEntity } from '../../domain/entities/time-block.entity';

export interface TeacherLoadSummary {
  teacherId: string;
  teacherName: string;
  maxWeeklyHours: number;
  currentAssignedHours: number;
  remainingHours: number;
  isLimitReached: boolean; // currentAssignedHours >= maxWeeklyHours
  isExactLimit: boolean;   // currentAssignedHours === maxWeeklyHours
  isOverloaded: boolean;   // currentAssignedHours > maxWeeklyHours
}

/**
 * Escanea la lista completa de TimeBlocks y calcula dinámicamente las horas lectivas
 * semanales asignadas a un docente (incluyendo titularidades activas y reemplazos cubiertos).
 */
export function calculateTeacherAssignedHours(
  teacherId: string,
  teacherName: string | undefined,
  timeBlocks: TimeBlockEntity[]
): number {
  if (!teacherId || teacherId === 'unassigned') return 0;

  const normId = teacherId.toLowerCase().trim();
  const normName = teacherName ? teacherName.toLowerCase().trim() : '';

  const validBlocks = timeBlocks.filter((b) => {
    // 1. Descartar bloques cancelados o recreos
    if (b.status === 'cancelled') return false;
    if (b.block_type === 'break' || b.block_type === 'exit') return false;

    // 2. Si el bloque tiene al docente como titular
    const bTeacherId = (b.teacherId || '').toLowerCase().trim();
    const bTeacherName = (b.teacherName || '').toLowerCase().trim();

    if (bTeacherId === normId || (normName && bTeacherName === normName)) {
      // Si el docente está marcado ausente y cubierto por otro, no cuenta para el titular
      if (b.status === 'covered' && b.replacementTeacherId && b.replacementTeacherId.toLowerCase() !== normId) {
        return false;
      }
      return true;
    }

    // 3. Si el docente actúa como reemplazo cubriendo la ausencia de otro
    const bRepId = (b.replacementTeacherId || '').toLowerCase().trim();
    const bRepName = (b.replacementTeacherName || '').toLowerCase().trim();
    if (b.status === 'covered' && (bRepId === normId || (normName && bRepName === normName))) {
      return true;
    }

    return false;
  });

  return validBlocks.length;
}

/**
 * Hook reactivo de Cálculo en Tiempo Real: useTeacherLoad
 * Escanea toda la MatrixGrid y calcula dinámicamente currentAssignedHours para cada profesor.
 */
export function useTeacherLoad(
  teachers: UserEntity[],
  timeBlocks: TimeBlockEntity[]
) {
  return useMemo(() => {
    const loadMap = new Map<string, TeacherLoadSummary>();

    for (const teacher of teachers) {
      const maxWeeklyHours = Number(teacher.maxWeeklyHours) || 22;
      const currentAssignedHours = calculateTeacherAssignedHours(
        teacher.id,
        teacher.displayName,
        timeBlocks
      );
      const isLimitReached = currentAssignedHours >= maxWeeklyHours;
      const isExactLimit = currentAssignedHours === maxWeeklyHours;
      const isOverloaded = currentAssignedHours > maxWeeklyHours;
      const remainingHours = Math.max(0, maxWeeklyHours - currentAssignedHours);

      loadMap.set(teacher.id, {
        teacherId: teacher.id,
        teacherName: teacher.displayName,
        maxWeeklyHours,
        currentAssignedHours,
        remainingHours,
        isLimitReached,
        isExactLimit,
        isOverloaded,
      });
    }

    const getTeacherLoad = (teacherId: string): TeacherLoadSummary => {
      const existing = loadMap.get(teacherId);
      if (existing) return existing;

      const t = teachers.find((u) => u.id === teacherId);
      const maxH = Number(t?.maxWeeklyHours) || 22;
      const assigned = calculateTeacherAssignedHours(teacherId, t?.displayName, timeBlocks);
      return {
        teacherId,
        teacherName: t?.displayName || 'Docente',
        maxWeeklyHours: maxH,
        currentAssignedHours: assigned,
        remainingHours: Math.max(0, maxH - assigned),
        isLimitReached: assigned >= maxH,
        isExactLimit: assigned === maxH,
        isOverloaded: assigned > maxH,
      };
    };

    return {
      loadMap,
      getTeacherLoad,
      calculateHours: (teacherId: string, teacherName?: string) =>
        calculateTeacherAssignedHours(teacherId, teacherName, timeBlocks),
    };
  }, [teachers, timeBlocks]);
}
