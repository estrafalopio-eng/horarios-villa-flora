import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ShiftType } from '../../domain/entities/grade.entity';
import { DayOfWeek, TimeBlockEntity } from '../../domain/entities/time-block.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { ensureSeedDataLoaded } from '../../infrastructure/seed/initial-seed';
import {
  TeacherVisualIdentity,
  getTeacherVisualIdentity,
  updateTeacherDictionaryColor,
} from '../../domain/services/teacher-visual-identity.service';
import { FirestoreUserRepository } from '../../infrastructure/repositories/firestore-user.repository';
import { FirestoreSettingsRepository } from '../../infrastructure/repositories/firestore-settings.repository';
import { useMatrixZoom } from '../hooks/useMatrixZoom';
import academicCalendarConfig from '../../config/academicCalendar.json';
import {
  getAcademicPeriodAndWeek,
  ACADEMIC_PERIODS_3,
  AcademicPeriodInfo,
  getStartOfWeek,
  generateWeekHeaders,
  DynamicDayHeader,
} from '../../domain/services/temporal-engine.service';
import { ALL_OFFICIAL_MATERIAS, getSubjectShortName } from '../../domain/constants/subjects';


export type MatrixStatusFilter = 'all' | 'covered' | 'uncovered';

export interface MatrixKpiStats {
  total: number;
  covered: number;
  uncovered: number;
  isLoading: boolean;
}

export interface ActiveTeacherSummaryItem {
  teacherId: string;
  teacherName: string;
  hoursCount: number;
  identity: TeacherVisualIdentity;
}

interface CoordinatorMatrixContextType {
  selectedShift: ShiftType;
  setSelectedShift: (shift: ShiftType) => void;
  isReviewDrawerOpen: boolean;
  setIsReviewDrawerOpen: (open: boolean) => void;
  pendingRequestsCount: number;
  setPendingRequestsCount: (count: number) => void;

  // KPIs
  kpiStats: MatrixKpiStats;
  setKpiStats: (stats: MatrixKpiStats) => void;

  // Status Filter
  statusFilter: MatrixStatusFilter;
  setStatusFilter: (filter: MatrixStatusFilter) => void;

  // Search Term
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Active Teachers for Legend Popover
  activeTeachers: ActiveTeacherSummaryItem[];
  setActiveTeachers: (teachers: ActiveTeacherSummaryItem[]) => void;

  // Official Subjects Catalog extracted from Teacher Roster
  officialSubjects: string[];
  setOfficialSubjects: (subjects: string[]) => void;

  // Persistent Zoom Engine
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Modo Reunión (Horario Recortado) per day
  meetingDays: Record<string, boolean>;
  setMeetingDay: (day: DayOfWeek, isMeeting: boolean, shift?: ShiftType) => void;

  // Modo Evento (Inicio 1:00 PM Primaria) per day
  eventDays: Record<string, boolean>;
  setEventDay: (day: DayOfWeek, isEvent: boolean) => void;

  // Calendario Académico (Motor Temporal)
  currentAcademicWeek: number;
  setCurrentAcademicWeek: (week: number) => void;
  currentPeriod: string;
  setCurrentPeriod: (period: string) => void;

  // Motor Cronológico y Fecha Ancla Dinámica (Date-Driven Columns)
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  weekStartDate: Date;
  weekHeaders: DynamicDayHeader[];
  customHolidays: Set<string>;
  toggleHoliday: (dateString: string) => void;


  // Docentes (Sincronización de Contexto e Inmutabilidad Global)
  teachers: UserEntity[];
  setTeachers: React.Dispatch<React.SetStateAction<UserEntity[]>>;
  updateTeacher: (editedTeacher: UserEntity) => Promise<void>;
  getTeacherColor: (teacherId?: string | null, teacherName?: string | null) => string;
  isTeacherModalOpen: boolean;
  setIsTeacherModalOpen: (open: boolean) => void;
  selectedTeacherForEdit: UserEntity | null;
  setSelectedTeacherForEdit: (teacher: UserEntity | null) => void;
  isEditTeacherMode: boolean;
  setIsEditTeacherMode: (isEdit: boolean) => void;
  openTeacherModal: (teacher?: UserEntity | null, isEdit?: boolean) => void;

  // System Reload Action
  triggerReload: () => void;
  setOnReload: (cb: () => void) => void;

  // Novelty Modal Trigger from Navbar Trash Dropzone
  requestNoveltyModal: (block: TimeBlockEntity) => void;
  setOnRequestNoveltyModal: (cb: (block: TimeBlockEntity) => void) => void;
  // Historial de Estados (Undo Stack)
  canUndo: boolean;
  setCanUndo: (can: boolean) => void;
  triggerUndo: () => void;
  setOnUndo: (cb: () => void) => void;

  // Estado Global de Lotes (selectedCells Array de IDs)
  selectedCells: string[];
  setSelectedCells: React.Dispatch<React.SetStateAction<string[]>>;
  toggleSelectedCell: (cellId: string) => void;
  clearSelectedCells: () => void;
  triggerBatchDelete: () => void;
  setOnBatchDelete: (cb: () => void) => void;
  requestBatchNoveltyModal: (blocks: TimeBlockEntity[]) => void;
  setOnRequestBatchNoveltyModal: (cb: (blocks: TimeBlockEntity[]) => void) => void;

  // Navegación y Contexto Lógico de Ruta (Route-Aware Controls)
  currentSection: string;
  isMatrixActive: boolean;
}

const CoordinatorMatrixContext = createContext<CoordinatorMatrixContextType | undefined>(undefined);

const loadInitialMeetingDays = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem('ievf_meeting_days');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

const loadInitialEventDays = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem('ievf_event_days');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

interface AcademicCalendarState {
  currentAcademicWeek: number;
  currentPeriod: string;
}

const loadInitialAcademicCalendar = (): AcademicCalendarState => {
  try {
    const raw = localStorage.getItem('ievf_academic_calendar');
    if (raw) {
      const parsed = JSON.parse(raw);
      let period = parsed.currentPeriod || '3°';
      // Destrucción estricta de cualquier residuo del 4° periodo
      if (period === '4°' || period === '4' || String(period).includes('4')) {
        period = '3°';
      }
      const rawWeek = Number(parsed.currentAcademicWeek) || 34;
      const week = Math.min(40, Math.max(1, rawWeek));
      return {
        currentAcademicWeek: week,
        currentPeriod: period,
      };
    }
  } catch {}

  const dynamicInfo = getAcademicPeriodAndWeek(new Date());
  return {
    currentAcademicWeek: dynamicInfo.globalWeek || 34,
    currentPeriod: dynamicInfo.periodName || '3°',
  };
};

const loadInitialTeachers = (): UserEntity[] => {
  try {
    const raw = localStorage.getItem('ievf_users_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((u: any) => u.role === 'teacher')
          .map((u: any) => ({
            ...u,
            maxWeeklyHours: u.maxWeeklyHours ?? 22,
            allowedSubjects: (Array.isArray(u.allowedSubjects) && u.allowedSubjects.length > 0)
              ? u.allowedSubjects
              : (Array.isArray(u.subjects) ? u.subjects : (u.assignedSubject ? [u.assignedSubject] : [])).map((s: string) => getSubjectShortName(s)),
          }));
      }
    }
  } catch {}
  return [];
};

export const CoordinatorMatrixProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { zoomLevel, setZoomLevel, zoomIn, zoomOut, resetZoom } = useMatrixZoom();
  const [selectedShift, setSelectedShift] = useState<ShiftType>('morning');
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState<boolean>(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<MatrixStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTeachers, setActiveTeachers] = useState<ActiveTeacherSummaryItem[]>([]);
  const [officialSubjects, setOfficialSubjects] = useState<string[]>(() =>
    ALL_OFFICIAL_MATERIAS.map((m) => m.officialName)
  );
  const [meetingDays, setMeetingDays] = useState<Record<string, boolean>>(loadInitialMeetingDays);
  const [eventDays, setEventDays] = useState<Record<string, boolean>>(loadInitialEventDays);
  const [academicCalendar, setAcademicCalendar] = useState<AcademicCalendarState>(loadInitialAcademicCalendar);
  
  // Estado de Fecha Ancla y Motor Cronológico (Date-Driven Columns)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [customHolidays, setCustomHolidays] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('ievf_custom_holidays');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const toggleHoliday = useCallback((dateString: string) => {
    setCustomHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(dateString)) {
        next.delete(dateString);
      } else {
        next.add(dateString);
      }
      try {
        localStorage.setItem('ievf_custom_holidays', JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn('[CoordinatorMatrixContext] Error saving custom holidays:', err);
      }
      return next;
    });
  }, []);

  const weekStartDate = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const weekHeaders = useMemo(
    () => generateWeekHeaders(weekStartDate, customHolidays),
    [weekStartDate, customHolidays]
  );

  // Inyección de Dependencia de Ruta y Evaluación de Contexto Lógico
  const location = useLocation();
  const currentSection = useMemo(() => {
    if (location.pathname === '/' || location.pathname === '/coordinator/matrix') {
      return 'Inicio';
    }
    if (location.pathname.startsWith('/coordinator/assignments')) {
      return 'Horarios';
    }
    if (location.pathname.startsWith('/teacher/absences')) {
      return 'Novedades';
    }
    return 'Otro';
  }, [location.pathname]);

  const isMatrixActive = currentSection === 'Inicio';


  // Repositorio y Estado Global de Docentes
  const userRepo = useMemo(() => new FirestoreUserRepository(), []);

  const [teachers, setTeachers] = useState<UserEntity[]>(loadInitialTeachers);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState<UserEntity | null>(null);
  const [isEditTeacherMode, setIsEditTeacherMode] = useState<boolean>(false);

  const openTeacherModal = useCallback((teacher?: UserEntity | null, isEdit = true) => {
    const target = teacher !== undefined ? teacher : (teachers.length > 0 ? teachers[0] : null);
    setSelectedTeacherForEdit(target);
    setIsEditTeacherMode(isEdit);
    setIsTeacherModalOpen(true);
  }, [teachers]);

  // Sincronización en tiempo real del catálogo de profesores
  useEffect(() => {
    const unsub = userRepo.subscribe((allUsers) => {
      const teacherList = allUsers
        .filter((u) => u.role === 'teacher')
        .map((u) => ({
          ...u,
          maxWeeklyHours: u.maxWeeklyHours ?? 22,
          allowedSubjects: (Array.isArray(u.allowedSubjects) && u.allowedSubjects.length > 0)
            ? u.allowedSubjects
            : (Array.isArray(u.subjects) ? u.subjects : (u.assignedSubject ? [u.assignedSubject] : [])).map((s: string) => getSubjectShortName(s)),
        }));
      setTeachers(teacherList);
    });
    return () => unsub();
  }, [userRepo]);

  // Función de guardado con inmutabilidad estricta y persistencia dual (LocalStorage + Firestore)
  const updateTeacher = useCallback(
    async (editedTeacher: UserEntity) => {
      const chosenColor = (editedTeacher.color_hex || editedTeacher.color || '#1E3A8A').trim().toUpperCase();
      const allowed = (Array.isArray(editedTeacher.allowedSubjects) && editedTeacher.allowedSubjects.length > 0)
        ? editedTeacher.allowedSubjects
        : (editedTeacher.subjects || []).map((s) => getSubjectShortName(s));

      const updatedEntity: UserEntity = {
        ...editedTeacher,
        allowedSubjects: allowed,
        color: chosenColor,
        color_hex: chosenColor,
        avatarColor: chosenColor,
        maxWeeklyHours: editedTeacher.maxWeeklyHours ?? 22,
        updatedAt: new Date().toISOString(),
      };

      // 1. Inmutabilidad del Estado Global: setTeachers con copia inmutable
      setTeachers((prev) => {
        const exists = prev.some((t) => t.id === editedTeacher.id);
        const updated = exists
          ? prev.map((t) => (t.id === editedTeacher.id ? updatedEntity : t))
          : [...prev, updatedEntity];

        // 2. Persistencia Inmediata en LocalStorage
        try {
          localStorage.setItem('ievf_users_v1', JSON.stringify(updated));
        } catch (err) {
          console.warn('[CoordinatorMatrixContext] Error saving users to localStorage:', err);
        }
        return updated;
      });

      // 3. Persistencia en Backend / Firestore
      try {
        await userRepo.update(editedTeacher.id, {
          displayName: updatedEntity.displayName,
          email: updatedEntity.email,
          phone: updatedEntity.phone,
          academicLevel: updatedEntity.academicLevel,
          subjects: updatedEntity.subjects,
          allowedSubjects: updatedEntity.allowedSubjects,
          assignedSubject: updatedEntity.assignedSubject,
          color: chosenColor,
          color_hex: chosenColor,
          avatarColor: chosenColor,
          maxWeeklyHours: updatedEntity.maxWeeklyHours,
        });
      } catch (err) {
        console.warn('[CoordinatorMatrixContext] Error updating teacher in Firestore:', err);
      }

      // 4. Actualizar Diccionario en memoria y emitir eventos para ruptura de caché visual
      updateTeacherDictionaryColor(editedTeacher.id, chosenColor);
      if (editedTeacher.displayName) {
        updateTeacherDictionaryColor(editedTeacher.displayName, chosenColor);
      }

      window.dispatchEvent(new Event('users_collection_updated'));
      window.dispatchEvent(
        new CustomEvent('teacher_color_updated', {
          detail: { teacherId: editedTeacher.id, color_hex: chosenColor },
        })
      );
    },
    [userRepo]
  );

  // Ruptura de Caché Visual: Cálculo en tiempo real del color del docente
  const getTeacherColor = useCallback(
    (teacherId?: string | null, teacherName?: string | null): string => {
      const cleanId = (teacherId || '').trim().toLowerCase();
      const cleanName = (teacherName || '').trim().toLowerCase();

      if (
        (!cleanId && !cleanName) ||
        cleanId === 'unassigned' ||
        cleanName === 'sin asignar' ||
        cleanName === 'sin asignación académica' ||
        cleanName === 'sin asignacion academica' ||
        cleanName === 'periodo libre'
      ) {
        return '#94A3B8';
      }

      // 1. Consumo directo en tiempo real del objeto actualizado en el estado global
      const found = teachers.find((t) => {
        const tId = (t.id || '').trim().toLowerCase();
        const tName = (t.displayName || '').trim().toLowerCase();
        return (
          (cleanId && tId === cleanId) ||
          (cleanName && tName === cleanName) ||
          (cleanName && (tName.includes(cleanName) || cleanName.includes(tName))) ||
          (cleanId && (tId.includes(cleanId) || cleanId.includes(tId)))
        );
      });

      if (found?.color_hex) return found.color_hex;
      if (found?.color) return found.color;
      if (found?.avatarColor) return found.avatarColor;

      // 2. Respaldo en identidad visual de normalización
      const identity = getTeacherVisualIdentity(teacherId, teacherName);
      return identity.color_hex || identity.accentColor || '#1E3A8A';
    },
    [teachers]
  );

  const [kpiStats, setKpiStats] = useState<MatrixKpiStats>({
    total: 0,
    covered: 0,
    uncovered: 0,
    isLoading: true,
  });

  const setCurrentAcademicWeek = useCallback((week: number) => {
    const safeWeek = Math.min(40, Math.max(1, week));
    const periodInfo = getAcademicPeriodAndWeek(new Date(), safeWeek);
    setAcademicCalendar((prev) => {
      const next = {
        ...prev,
        currentAcademicWeek: safeWeek,
        currentPeriod: periodInfo.periodName,
      };
      try {
        localStorage.setItem('ievf_academic_calendar', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setCurrentPeriod = useCallback((period: string) => {
    let normalized = period.trim();
    // Destrucción estricta de 4 periodos - únicamente se permite 1°, 2°, 3°
    if (normalized.includes('4')) {
      normalized = '3°';
    }
    setAcademicCalendar((prev) => {
      const next = { ...prev, currentPeriod: normalized };
      try {
        localStorage.setItem('ievf_academic_calendar', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const settingsRepo = useMemo(() => new FirestoreSettingsRepository(), []);

  // Sync meetingDays and eventDays with Firestore settings/general
  useEffect(() => {
    const unsub = settingsRepo.subscribe((settings) => {
      if (settings) {
        if (settings.meetingDays) {
          setMeetingDays((prev) => {
            const merged = { ...prev, ...settings.meetingDays };
            try {
              localStorage.setItem('ievf_meeting_days', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
        if (settings.eventDays) {
          setEventDays((prev) => {
            const merged = { ...prev, ...settings.eventDays };
            try {
              localStorage.setItem('ievf_event_days', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    });
    return () => unsub();
  }, [settingsRepo]);

  const setMeetingDay = useCallback(
    (day: DayOfWeek, isMeeting: boolean, shift?: ShiftType) => {
      setMeetingDays((prev) => {
        const next = { ...prev, [day]: isMeeting };
        if (shift) {
          next[`${shift}_${day}`] = isMeeting;
        }
        try {
          localStorage.setItem('ievf_meeting_days', JSON.stringify(next));
        } catch {}
        return next;
      });
      settingsRepo.updateMeetingDay(day, isMeeting).catch((err) => {
        console.warn('[CoordinatorMatrixContext] Error syncing meeting day to Firestore:', err);
      });
      if (shift) {
        settingsRepo.updateMeetingDay(`${shift}_${day}`, isMeeting).catch(() => {});
      }
    },
    [settingsRepo]
  );

  const setEventDay = useCallback(
    (day: DayOfWeek, isEvent: boolean) => {
      setEventDays((prev) => {
        const next = { ...prev, [day]: isEvent };
        try {
          localStorage.setItem('ievf_event_days', JSON.stringify(next));
        } catch {}
        return next;
      });
      settingsRepo.updateEventDay(day, isEvent).catch((err) => {
        console.warn('[CoordinatorMatrixContext] Error syncing event day to Firestore:', err);
      });
    },
    [settingsRepo]
  );

  const reloadCallbackRef = useRef<(() => void) | null>(null);

  const setOnReload = useCallback((cb: () => void) => {
    reloadCallbackRef.current = cb;
  }, []);

  const triggerReload = useCallback(() => {
    if (reloadCallbackRef.current) {
      reloadCallbackRef.current();
    } else {
      localStorage.removeItem('ievf_time_blocks_v1');
      localStorage.removeItem('ievf_absence_requests_v1');
      localStorage.removeItem('ievf_grades_v1');
      localStorage.removeItem('ievf_classrooms_v1');
      localStorage.removeItem('ievf_seed_version');
      ensureSeedDataLoaded();
      window.location.reload();
    }
  }, []);

  // Novelty Modal Trigger from Navbar Trash Dropzone
  const noveltyCallbackRef = useRef<((block: TimeBlockEntity) => void) | null>(null);

  const setOnRequestNoveltyModal = useCallback((cb: (block: TimeBlockEntity) => void) => {
    noveltyCallbackRef.current = cb;
  }, []);

  const requestNoveltyModal = useCallback((block: TimeBlockEntity) => {
    if (noveltyCallbackRef.current) {
      noveltyCallbackRef.current(block);
    }
  }, []);

  // Undo Action & History Callback
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const undoCallbackRef = useRef<(() => void) | null>(null);

  const setOnUndo = useCallback((cb: () => void) => {
    undoCallbackRef.current = cb;
  }, []);

  const triggerUndo = useCallback(() => {
    if (undoCallbackRef.current) {
      undoCallbackRef.current();
    }
  }, []);

  // Estado Global de Lotes (selectedCells Array de IDs)
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const batchDeleteCallbackRef = useRef<(() => void) | null>(null);
  const requestBatchNoveltyModalCallbackRef = useRef<((blocks: TimeBlockEntity[]) => void) | null>(null);

  const toggleSelectedCell = useCallback((cellId: string) => {
    setSelectedCells((prev) =>
      prev.includes(cellId) ? prev.filter((id) => id !== cellId) : [...prev, cellId]
    );
  }, []);

  const clearSelectedCells = useCallback(() => {
    setSelectedCells([]);
  }, []);

  const triggerBatchDelete = useCallback(() => {
    if (batchDeleteCallbackRef.current) {
      batchDeleteCallbackRef.current();
    }
  }, []);

  const setOnBatchDelete = useCallback((cb: () => void) => {
    batchDeleteCallbackRef.current = cb;
  }, []);

  const requestBatchNoveltyModal = useCallback((blocks: TimeBlockEntity[]) => {
    if (requestBatchNoveltyModalCallbackRef.current) {
      requestBatchNoveltyModalCallbackRef.current(blocks);
    }
  }, []);

  const setOnRequestBatchNoveltyModal = useCallback((cb: (blocks: TimeBlockEntity[]) => void) => {
    requestBatchNoveltyModalCallbackRef.current = cb;
  }, []);

  return (
    <CoordinatorMatrixContext.Provider
      value={{
        selectedShift,
        setSelectedShift,
        isReviewDrawerOpen,
        setIsReviewDrawerOpen,
        pendingRequestsCount,
        setPendingRequestsCount,
        kpiStats,
        setKpiStats,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        activeTeachers,
        setActiveTeachers,
        officialSubjects,
        setOfficialSubjects,
        zoomLevel,
        setZoomLevel,
        zoomIn,
        zoomOut,
        resetZoom,
        meetingDays,
        setMeetingDay,
        eventDays,
        setEventDay,
        currentAcademicWeek: academicCalendar.currentAcademicWeek,
        setCurrentAcademicWeek,
        currentPeriod: academicCalendar.currentPeriod,
        setCurrentPeriod,
        currentDate,
        setCurrentDate,
        weekStartDate,
        weekHeaders,
        customHolidays,
        toggleHoliday,

        teachers,
        setTeachers,
        updateTeacher,
        getTeacherColor,
        isTeacherModalOpen,
        setIsTeacherModalOpen,
        selectedTeacherForEdit,
        setSelectedTeacherForEdit,
        isEditTeacherMode,
        setIsEditTeacherMode,
        openTeacherModal,
        triggerReload,
        setOnReload,
        requestNoveltyModal,
        setOnRequestNoveltyModal,
        canUndo,
        setCanUndo,
        triggerUndo,
        setOnUndo,
        selectedCells,
        setSelectedCells,
        toggleSelectedCell,
        clearSelectedCells,
        triggerBatchDelete,
        setOnBatchDelete,
        requestBatchNoveltyModal,
        setOnRequestBatchNoveltyModal,
        currentSection,
        isMatrixActive,
      }}
    >
      {children}
    </CoordinatorMatrixContext.Provider>
  );
};

export const useCoordinatorMatrix = (): CoordinatorMatrixContextType => {
  const context = useContext(CoordinatorMatrixContext);
  if (!context) {
    throw new Error('useCoordinatorMatrix must be used within a CoordinatorMatrixProvider');
  }
  return context;
};

