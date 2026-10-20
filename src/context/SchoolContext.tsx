import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  TimeBlock,
  AbsenceRequest,
  Teacher,
  Group,
  MatrixFilterState,
  PeriodDefinition,
  DayOfWeek,
  ShiftType,
  TimeBlockStatus,
} from '../types';
import { firestoreService } from '../services/firestoreService';
import { MORNING_PERIODS, AFTERNOON_PERIODS } from '../services/mockDataService';

interface SchoolContextType {
  timeBlocks: TimeBlock[];
  absenceRequests: AbsenceRequest[];
  teachers: Teacher[];
  groups: Group[];
  filters: MatrixFilterState;
  setFilters: React.Dispatch<React.SetStateAction<MatrixFilterState>>;
  currentPeriods: PeriodDefinition[];
  pendingRequests: AbsenceRequest[];
  approvedRequests: AbsenceRequest[];
  rejectedRequests: AbsenceRequest[];
  selectedBlock: TimeBlock | null;
  setSelectedBlock: (block: TimeBlock | null) => void;
  isReviewDrawerOpen: boolean;
  setIsReviewDrawerOpen: (open: boolean) => void;
  isTeacherModalOpen: boolean;
  setIsTeacherModalOpen: (open: boolean) => void;
  userRole: 'coordinator' | 'teacher' | 'public';
  setUserRole: (role: 'coordinator' | 'teacher' | 'public') => void;
  // Maker-Checker Actions
  submitAbsenceRequest: (data: {
    teacher_id: string;
    teacher_name: string;
    date: string;
    reason: string;
    affected_periods?: number[];
  }) => Promise<void>;
  reviewAbsenceRequest: (params: {
    requestId: string;
    decision: 'approved' | 'rejected';
    replacementTeacherId?: string | null;
    reviewNotes?: string;
  }) => Promise<void>;
  assignDirectReplacement: (blockId: string, replacementTeacherId: string) => Promise<void>;
  resetToSeed: () => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const [filters, setFilters] = useState<MatrixFilterState>({
    day: 'lunes',
    shift: 'morning',
    gradeFilter: 'all',
    searchQuery: '',
    statusFilter: 'all',
  });

  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<'coordinator' | 'teacher' | 'public'>('coordinator');

  // Load catalogs
  useEffect(() => {
    firestoreService.getTeachers().then(setTeachers);
    firestoreService.getGroups().then(setGroups);
  }, []);

  // Subscribe to real-time TimeBlocks
  useEffect(() => {
    const unsub = firestoreService.subscribeTimeBlocks((blocks) => {
      setTimeBlocks(blocks);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time AbsenceRequests
  useEffect(() => {
    const unsub = firestoreService.subscribeAbsenceRequests((reqs) => {
      setAbsenceRequests(reqs);
    });
    return () => unsub();
  }, []);

  // Listen to local update events
  useEffect(() => {
    const handleLocalUpdate = () => {
      setTimeBlocks(firestoreService.getLocalTimeBlocks());
      setAbsenceRequests(firestoreService.getLocalAbsenceRequests());
    };
    window.addEventListener('local_schedule_updated', handleLocalUpdate);
    return () => window.removeEventListener('local_schedule_updated', handleLocalUpdate);
  }, []);

  // Filtered requests
  const pendingRequests = absenceRequests.filter((r) => r.status === 'pending');
  const approvedRequests = absenceRequests.filter((r) => r.status === 'approved');
  const rejectedRequests = absenceRequests.filter((r) => r.status === 'rejected');

  const currentPeriods = filters.shift === 'morning' ? MORNING_PERIODS : AFTERNOON_PERIODS;

  // MAKER ACTION
  const submitAbsenceRequest = async (data: {
    teacher_id: string;
    teacher_name: string;
    date: string;
    reason: string;
    affected_periods?: number[];
  }) => {
    await firestoreService.submitAbsenceRequest(data);
  };

  // CHECKER ACTION
  const reviewAbsenceRequest = async (params: {
    requestId: string;
    decision: 'approved' | 'rejected';
    replacementTeacherId?: string | null;
    reviewNotes?: string;
  }) => {
    const replacementTeacher = teachers.find((t) => t.id === params.replacementTeacherId);
    await firestoreService.reviewAbsenceRequest({
      requestId: params.requestId,
      decision: params.decision,
      reviewerName: 'Coordinación Académica - I.E. Villa Flora',
      replacementTeacherId: params.replacementTeacherId,
      replacementTeacherName: replacementTeacher ? replacementTeacher.name : undefined,
      reviewNotes: params.reviewNotes,
    });
  };

  const assignDirectReplacement = async (blockId: string, replacementTeacherId: string) => {
    const repTeacher = teachers.find((t) => t.id === replacementTeacherId);
    await firestoreService.updateTimeBlock(blockId, {
      status: 'covered',
      replacement_teacher_id: replacementTeacherId,
      notes: repTeacher ? `Reemplazo asignado manualmente: ${repTeacher.name}` : undefined,
    });
  };

  const resetToSeed = () => {
    firestoreService.resetToSeed();
  };

  return (
    <SchoolContext.Provider
      value={{
        timeBlocks,
        absenceRequests,
        teachers,
        groups,
        filters,
        setFilters,
        currentPeriods,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        selectedBlock,
        setSelectedBlock,
        isReviewDrawerOpen,
        setIsReviewDrawerOpen,
        isTeacherModalOpen,
        setIsTeacherModalOpen,
        userRole,
        setUserRole,
        submitAbsenceRequest,
        reviewAbsenceRequest,
        assignDirectReplacement,
        resetToSeed,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = (): SchoolContextType => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
