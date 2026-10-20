/**
 * Motor de Serialización: Array Filter & Isolation
 * 
 * Filtra el arreglo plano de time_blocks por día (dayOfWeek), período (period: 1-6)
 * y grado específico (targetGroup: ej. "601" para Grado 6°1) extrayendo la propiedad 'subject'.
 */
export const serializeScheduleToMatrix = (scheduleArray: any[], targetGroup: string = "601"): string[][] => {
  const matrix: string[][] = [["HORA", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"]];
  
  // Correlación de periodos y días exactos de la consola
  const periods = [1, 2, 3, 4, 5, 6]; 
  const days = ["lunes", "martes", "miercoles", "jueves", "viernes"];

  const items = Array.isArray(scheduleArray) ? scheduleArray : [];

  periods.forEach(periodNum => {
    const row = [`Bloque ${periodNum}`];
    days.forEach(day => {
      // Búsqueda cruzada de 3 variables: Día + Periodo + Identificador de Grupo
      const cellData = items.find(item => 
        item &&
        item.dayOfWeek === day && 
        item.period === periodNum &&
        (
          (typeof item.id === 'string' && item.id.includes(`-g-${targetGroup}-`)) ||
          item.gradeId === `g-${targetGroup}` ||
          (typeof item.gradeName === 'string' && item.gradeName.replace('°', '') === targetGroup) ||
          (typeof item.gradeName === 'string' && item.gradeName === targetGroup)
        )
      );
      
      // Mapeo de la propiedad real 'subject' (identificada en la entidad de TimeBlock)
      let cellText = "";
      if (cellData && cellData.subject) {
        if (cellData.teacherName && cellData.teacherName !== "Sin Asignar") {
          cellText = `${cellData.subject} (${cellData.teacherName})`;
        } else {
          cellText = cellData.subject;
        }
      } else if (cellData && cellData.name) {
        cellText = cellData.name;
      }

      row.push(cellText);
    });
    matrix.push(row);
  });

  return matrix;
};

export default serializeScheduleToMatrix;
