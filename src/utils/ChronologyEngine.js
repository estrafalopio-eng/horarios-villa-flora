import academicCalendarData from '../config/academicCalendar.json';

/**
 * Motor Cronológico Institucional (ChronologyEngine.js):
 * Recibe un array JSON con las semanas y periodos académicos y evalúa new Date() contra
 * los rangos del cronograma para retornar la cadena exacta (ej. 'Semana 12 del Periodo 1...').
 *
 * @param {Date|string} [targetDate=new Date()] Fecha a evaluar
 * @param {Array} [periods=academicCalendarData.periods] Array JSON con los periodos académicos
 * @returns {string} Cadena exacta calculada, ej: 'Semana 12 del Periodo 1'
 */
export function evaluateChronology(targetDate = new Date(), periods = academicCalendarData.periods) {
  const d = typeof targetDate === 'string' ? new Date(targetDate) : new Date(targetDate.getTime());
  if (isNaN(d.getTime())) {
    return 'Semana 1 del Periodo 1';
  }

  const periodsList = Array.isArray(periods) && periods.length > 0
    ? periods
    : academicCalendarData.periods;

  const targetTime = d.getTime();

  // Si la fecha es anterior al primer periodo escolar del año
  const firstPeriod = periodsList[0];
  const firstStart = new Date(`${firstPeriod.startDate}T00:00:00`).getTime();
  if (targetTime < firstStart) {
    const cleanName = firstPeriod.name.replace('°', '');
    return `Semana 1 del Periodo ${cleanName}`;
  }

  // Iterar sobre los periodos definidos en el JSON
  for (let i = 0; i < periodsList.length; i++) {
    const p = periodsList[i];
    const pStart = new Date(`${p.startDate}T00:00:00`).getTime();
    const pEnd = new Date(`${p.endDate}T23:59:59`).getTime();

    // Si la fecha cae dentro del rango o es el último periodo y la fecha lo sobrepasa
    if (targetTime <= pEnd || i === periodsList.length - 1) {
      const diffMs = Math.max(0, targetTime - pStart);
      const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      const weekInPeriod = Math.min(p.weeks, Math.max(1, diffWeeks + 1));
      const cleanName = p.name.replace('°', '');

      return `Semana ${weekInPeriod} del Periodo ${cleanName}`;
    }
  }

  const lastPeriod = periodsList[periodsList.length - 1];
  const lastCleanName = lastPeriod.name.replace('°', '');
  return `Semana ${lastPeriod.weeks} del Periodo ${lastCleanName}`;
}

export const calculateCurrentAcademicWeek = evaluateChronology;
export const getChronologyHeaderText = evaluateChronology;
export const evaluateAcademicCalendar = evaluateChronology;

/**
 * Calcula el lunes de la semana para una fecha dada (Fecha Ancla).
 * @param {Date|string} [currentDate=new Date()] Fecha base
 * @returns {Date} Instancia de Date configurada al lunes a las 00:00:00.000 local
 */
export function getStartOfWeek(currentDate = new Date()) {
  const d = typeof currentDate === 'string' && currentDate.length === 10
    ? new Date(`${currentDate}T00:00:00`)
    : typeof currentDate === 'string'
    ? new Date(currentDate)
    : new Date(currentDate.getTime());

  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const day = fallback.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    fallback.setDate(fallback.getDate() + diff);
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Motor de Generación Dinámica de Cabeceras (Date-Driven Columns):
 * Itera 5 veces (de lunes a viernes), sumando un día por cada ciclo a la fecha base.
 * Extrae la cadena de texto usando la API de internacionalización del navegador:
 * new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: '2-digit', month: 'short' }).format(date)
 * Capitaliza la primera letra (ej. 'Lunes 19 de oct').
 *
 * @param {Date|string} [startDate=new Date()] Fecha ancla
 * @returns {Array} Array dinámico de cabeceras de lunes a viernes
 */
export function generateWeekHeaders(startDate = new Date(), customHolidays = null) {
  const baseMonday = getStartOfWeek(startDate);
  const dayIds = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
  const dayShorts = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

  const formatter = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });

  const headers = [];

  for (let i = 0; i < 5; i++) {
    const currentDay = new Date(baseMonday);
    currentDay.setDate(baseMonday.getDate() + i);

    const rawFormatted = formatter.format(currentDay);
    const cleanFormatted = rawFormatted.replace(/,/g, '').trim();
    const capitalized = cleanFormatted.charAt(0).toUpperCase() + cleanFormatted.slice(1);

    const id = dayIds[i];
    const dayNum = currentDay.getDate().toString().padStart(2, '0');
    const shortLabel = `${dayShorts[i]} ${dayNum}`;
    const y = currentDay.getFullYear();
    const m = String(currentDay.getMonth() + 1).padStart(2, '0');
    const dStr = String(currentDay.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${dStr}`;

    const isHoliday = customHolidays && (customHolidays.has ? customHolidays.has(dateString) : customHolidays.includes(dateString));

    headers.push({
      id,
      dayOfWeek: id,
      label: capitalized,
      short: shortLabel,
      date: currentDay,
      dateString,
      formatted: capitalized,
      isHoliday: Boolean(isHoliday),
    });
  }

  return headers;
}

export default evaluateChronology;
