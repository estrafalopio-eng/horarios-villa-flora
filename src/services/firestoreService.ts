/**
 * Local Storage Service & Maker-Checker Engine
 * High-performance local storage persistence for PWA and offline resilience
 */

import { AbsenceRequest, TimeBlock, Teacher, Group } from '../types';
import {
  MOCK_TEACHERS,
  MOCK_GROUPS,
  MOCK_ABSENCE_REQUESTS,
  generateSeedTimeBlocks,
} from './mockDataService';

// Local storage keys
const LS_TIME_BLOCKS = 'ievf_time_blocks_v1';
const LS_ABSENCE_REQUESTS = 'ievf_absence_requests_v1';
const LS_TEACHERS = 'ievf_teachers_v1';
const LS_GROUPS = 'ievf_groups_v1';

// Initial local storage hydration
function initLocalStore() {
  if (!localStorage.getItem(LS_TEACHERS)) {
    localStorage.setItem(LS_TEACHERS, JSON.stringify(MOCK_TEACHERS));
  }
  if (!localStorage.getItem(LS_GROUPS)) {
    localStorage.setItem(LS_GROUPS, JSON.stringify(MOCK_GROUPS));
  }
  if (!localStorage.getItem(LS_ABSENCE_REQUESTS)) {
    localStorage.setItem(LS_ABSENCE_REQUESTS, JSON.stringify(MOCK_ABSENCE_REQUESTS));
  }
  if (!localStorage.getItem(LS_TIME_BLOCKS)) {
    localStorage.setItem(LS_TIME_BLOCKS, JSON.stringify(generateSeedTimeBlocks()));
  }
}

export class FirestoreService {
  constructor() {
    initLocalStore();
  }

  // ----------------------------------------------------
  // CATALOGS: TEACHERS & GROUPS
  // ----------------------------------------------------
  async getTeachers(): Promise<Teacher[]> {
    const raw = localStorage.getItem(LS_TEACHERS);
    return raw ? JSON.parse(raw) : MOCK_TEACHERS;
  }

  async getGroups(): Promise<Group[]> {
    const raw = localStorage.getItem(LS_GROUPS);
    return raw ? JSON.parse(raw) : MOCK_GROUPS;
  }

  // ----------------------------------------------------
  // TIME BLOCKS (SCHEDULE MATRIX)
  // ----------------------------------------------------
  subscribeTimeBlocks(callback: (blocks: TimeBlock[]) => void): () => void {
    // Immediately trigger local data
    callback(this.getLocalTimeBlocks());

    // Listen to local storage events for cross-tab or local updates
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_TIME_BLOCKS && e.newValue) {
        callback(JSON.parse(e.newValue));
      }
    };
    const onLocalUpdated = () => {
      callback(this.getLocalTimeBlocks());
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('local_schedule_updated', onLocalUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('local_schedule_updated', onLocalUpdated);
    };
  }

  getLocalTimeBlocks(): TimeBlock[] {
    const raw = localStorage.getItem(LS_TIME_BLOCKS);
    return raw ? JSON.parse(raw) : generateSeedTimeBlocks();
  }

  async updateTimeBlock(blockId: string, updates: Partial<TimeBlock>): Promise<void> {
    const blocks = this.getLocalTimeBlocks();
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx !== -1) {
      blocks[idx] = { ...blocks[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem(LS_TIME_BLOCKS, JSON.stringify(blocks));
      window.dispatchEvent(new Event('local_schedule_updated'));
    }
  }

  // ----------------------------------------------------
  // MAKER-CHECKER ABSENCE WORKFLOW
  // ----------------------------------------------------

  /**
   * Subscribe to Absence Requests in Real Time
   */
  subscribeAbsenceRequests(callback: (requests: AbsenceRequest[]) => void): () => void {
    callback(this.getLocalAbsenceRequests());

    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_ABSENCE_REQUESTS && e.newValue) {
        callback(JSON.parse(e.newValue));
      }
    };
    const onLocalUpdated = () => {
      callback(this.getLocalAbsenceRequests());
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('local_schedule_updated', onLocalUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('local_schedule_updated', onLocalUpdated);
    };
  }

  getLocalAbsenceRequests(): AbsenceRequest[] {
    const raw = localStorage.getItem(LS_ABSENCE_REQUESTS);
    return raw ? JSON.parse(raw) : MOCK_ABSENCE_REQUESTS;
  }

  /**
   * MAKER (Docente): Submits an absence request
   * PRD: Creates document in absence_requests with status "pending".
   * Teachers do NOT have write access to time_blocks directly.
   */
  async submitAbsenceRequest(data: {
    teacher_id: string;
    teacher_name: string;
    date: string;
    reason: string;
    affected_periods?: number[];
  }): Promise<AbsenceRequest> {
    const newRequest: AbsenceRequest = {
      id: `abs-req-${Date.now()}`,
      teacher_id: data.teacher_id,
      teacher_name: data.teacher_name,
      date: data.date,
      status: 'pending',
      reason: data.reason,
      created_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      affected_periods: data.affected_periods || [],
      replacement_teacher_id: null,
      replacement_teacher_name: null,
      review_notes: null,
    };

    const currentReqs = this.getLocalAbsenceRequests();
    currentReqs.unshift(newRequest);
    localStorage.setItem(LS_ABSENCE_REQUESTS, JSON.stringify(currentReqs));
    window.dispatchEvent(new Event('local_schedule_updated'));

    return newRequest;
  }

  /**
   * CHECKER (Coordinadora/Admin): Reviews and approves or rejects request
   * PRD: Upon approval, system/admin workflows update the corresponding time_blocks record
   */
  async reviewAbsenceRequest(params: {
    requestId: string;
    decision: 'approved' | 'rejected';
    reviewerName: string;
    replacementTeacherId?: string | null;
    replacementTeacherName?: string | null;
    reviewNotes?: string;
  }): Promise<void> {
    const { requestId, decision, reviewerName, replacementTeacherId, replacementTeacherName, reviewNotes } = params;

    const reqs = this.getLocalAbsenceRequests();
    const reqIndex = reqs.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) return;

    const request = reqs[reqIndex];
    const now = new Date().toISOString();

    const updatedRequest: AbsenceRequest = {
      ...request,
      status: decision,
      reviewed_by: reviewerName,
      reviewed_at: now,
      replacement_teacher_id: replacementTeacherId || null,
      replacement_teacher_name: replacementTeacherName || null,
      review_notes: reviewNotes || null,
    };

    reqs[reqIndex] = updatedRequest;
    localStorage.setItem(LS_ABSENCE_REQUESTS, JSON.stringify(reqs));

    // MAKER-CHECKER SIDE EFFECT:
    // If approved, update time_blocks matching this teacher and affected periods
    if (decision === 'approved') {
      const blocks = this.getLocalTimeBlocks();
      let updatedCount = 0;

      const modifiedBlocks = blocks.map((b) => {
        const matchesTeacher = b.teacher_id === request.teacher_id;
        const matchesPeriod = !request.affected_periods || request.affected_periods.length === 0 || request.affected_periods.includes(b.period);

        if (matchesTeacher && matchesPeriod) {
          updatedCount++;
          return {
            ...b,
            status: replacementTeacherId ? ('covered' as const) : ('absent' as const),
            absence_request_id: request.id,
            replacement_teacher_id: replacementTeacherId || null,
            notes: replacementTeacherName
              ? `Reemplazo asignado: ${replacementTeacherName}`
              : `Ausencia aprobada (${request.reason})`,
            updated_at: now,
          };
        }
        return b;
      });

      localStorage.setItem(LS_TIME_BLOCKS, JSON.stringify(modifiedBlocks));
      console.log(`[Checker] Approved absence: updated ${updatedCount} time_blocks in schedule matrix.`);
    }

    window.dispatchEvent(new Event('local_schedule_updated'));
  }

  /**
   * Reset to initial state for testing
   */
  resetToSeed(): void {
    localStorage.setItem(LS_TEACHERS, JSON.stringify(MOCK_TEACHERS));
    localStorage.setItem(LS_GROUPS, JSON.stringify(MOCK_GROUPS));
    localStorage.setItem(LS_ABSENCE_REQUESTS, JSON.stringify(MOCK_ABSENCE_REQUESTS));
    localStorage.setItem(LS_TIME_BLOCKS, JSON.stringify(generateSeedTimeBlocks()));
    window.dispatchEvent(new Event('local_schedule_updated'));
  }
}

export const firestoreService = new FirestoreService();
