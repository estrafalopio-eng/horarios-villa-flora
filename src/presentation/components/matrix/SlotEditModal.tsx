import React, { useState, useMemo, useEffect } from 'react';
import { TimeBlockEntity, TimeBlockStatus } from '../../../domain/entities/time-block.entity';
import { UserEntity } from '../../../domain/entities/user.entity';
import { ClassroomEntity } from '../../../domain/entities/classroom.entity';
import { ConstraintSolverService, CollisionValidationResult } from '../../../domain/services/constraint-solver.service';
import { getCanonicalSubjectName } from '../../../domain/services/subject-normalization.service';
import { asignaturasOficiales, findOfficialSubject } from '../../../domain/constants/subjects';
import { X, Save, AlertTriangle, UserCheck, CheckCircle2, ShieldAlert, BookOpen } from 'lucide-react';

interface SlotEditModalProps {
  block: TimeBlockEntity | null;
  allBlocks: TimeBlockEntity[];
  teachers: UserEntity[];
  classrooms: ClassroomEntity[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    blockId: string;
    subject?: string;
    teacherId?: string;
    teacherName?: string;
    classroomId?: string;
    classroomName?: string;
    replacementTeacherId?: string | null;
    replacementTeacherName?: string | null;
    status?: TimeBlockStatus;
    notes?: string | null;
  }) => Promise<void>;
}

export const SlotEditModal: React.FC<SlotEditModalProps> = ({
  block,
  allBlocks,
  teachers,
  classrooms,
  isOpen,
  onClose,
  onSave,
}) => {
  // Arquitectura de Bloqueo de Scroll y Prevención de Layout Shift
  useEffect(() => {
    if (!isOpen || !block) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, block]);

  if (!isOpen || !block) return null;

  const initialSubject = (() => {
    const match = findOfficialSubject(block.subject);
    return match ? match.officialName : (block.subject || asignaturasOficiales[0].materias[0].officialName);
  })();

  const [subject, setSubject] = useState(initialSubject);
  const [teacherId, setTeacherId] = useState(block.teacherId);
  const [classroomId, setClassroomId] = useState(block.classroomId);
  const [status, setStatus] = useState<TimeBlockStatus>(block.status);
  const [replacementTeacherId, setReplacementTeacherId] = useState<string>(block.replacementTeacherId || '');
  const [notes, setNotes] = useState(block.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live Constraint Solver Evaluation
  const candidateTeacher = teachers.find((t) => t.id === teacherId);
  const candidateClassroom = classrooms.find((c) => c.id === classroomId);
  const candidateReplacement = teachers.find((t) => t.id === replacementTeacherId);

  // Candidate Teacher's subjects (supports 1:N relationship)
  const availableTeacherSubjects: string[] = useMemo(() => {
    if (!candidateTeacher) return [];
    if (Array.isArray(candidateTeacher.subjects) && candidateTeacher.subjects.length > 0) {
      return candidateTeacher.subjects;
    }
    if (Array.isArray(candidateTeacher.specialty) && candidateTeacher.specialty.length > 0) {
      return candidateTeacher.specialty;
    }
    if (candidateTeacher.assignedSubject) {
      return [candidateTeacher.assignedSubject];
    }
    if (candidateTeacher.subject) {
      return [candidateTeacher.subject];
    }
    return [];
  }, [candidateTeacher]);

  const handleTeacherChange = (newTeacherId: string) => {
    setTeacherId(newTeacherId);
    const teacher = teachers.find((t) => t.id === newTeacherId);
    const subs: string[] = (teacher?.subjects && teacher.subjects.length > 0)
      ? teacher.subjects
      : (teacher?.specialty && teacher.specialty.length > 0)
        ? teacher.specialty
        : teacher?.assignedSubject
          ? [teacher.assignedSubject]
          : [];

    if (subs.length > 0) {
      const alreadyMatches = subs.some(
        (s) => s.toLowerCase() === subject.trim().toLowerCase()
      );
      if (!alreadyMatches) {
        setSubject(subs[0]);
      }
    }
  };

  const availableReplacementSubjects: string[] = useMemo(() => {
    if (!candidateReplacement) return [];
    if (Array.isArray(candidateReplacement.subjects) && candidateReplacement.subjects.length > 0) {
      return candidateReplacement.subjects;
    }
    if (Array.isArray(candidateReplacement.specialty) && candidateReplacement.specialty.length > 0) {
      return candidateReplacement.specialty;
    }
    if (candidateReplacement.assignedSubject) {
      return [candidateReplacement.assignedSubject];
    }
    return [];
  }, [candidateReplacement]);

  const handleReplacementChange = (newTeacherId: string) => {
    setReplacementTeacherId(newTeacherId);
    const teacher = teachers.find((t) => t.id === newTeacherId);
    const subs: string[] = (teacher?.subjects && teacher.subjects.length > 0)
      ? teacher.subjects
      : (teacher?.specialty && teacher.specialty.length > 0)
        ? teacher.specialty
        : teacher?.assignedSubject
          ? [teacher.assignedSubject]
          : [];

    if (subs.length > 0) {
      const alreadyMatches = subs.some(
        (s) => s.toLowerCase() === subject.trim().toLowerCase()
      );
      if (!alreadyMatches) {
        setSubject(subs[0]);
      }
    }
  };

  const validation: CollisionValidationResult = useMemo(() => {
    const effectiveTeacherId = status === 'covered' && replacementTeacherId ? replacementTeacherId : teacherId;
    const effectiveTeacherName = status === 'covered' && candidateReplacement ? candidateReplacement.displayName : candidateTeacher?.displayName;

    return ConstraintSolverService.validateSlot(
      allBlocks,
      {
        id: block.id,
        dayOfWeek: block.dayOfWeek,
        period: block.period,
        shift: block.shift,
        classroomId,
        classroomName: candidateClassroom?.name || classroomId,
        teacherId: effectiveTeacherId,
        teacherName: effectiveTeacherName || effectiveTeacherId,
        gradeId: block.gradeId,
        gradeName: block.gradeName,
      },
      block.id
    );
  }, [allBlocks, block, classroomId, teacherId, replacementTeacherId, status, candidateClassroom, candidateTeacher, candidateReplacement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validation.isValid) {
      setSubmitError(validation.message || 'Conflicto detectado en la asignación.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        blockId: block.id,
        subject: getCanonicalSubjectName(subject) || subject.trim(),
        teacherId,
        teacherName: candidateTeacher?.displayName || block.teacherName,
        classroomId,
        classroomName: candidateClassroom?.name || block.classroomName,
        status,
        replacementTeacherId: status === 'covered' ? replacementTeacherId : null,
        replacementTeacherName: status === 'covered' ? candidateReplacement?.displayName || null : null,
        notes,
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Error al guardar cambios en el bloque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 animate-in zoom-in-95 duration-150">
        {/* Cabecera Fija Estructural */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200 font-semibold">
                Grado {block.gradeName} • {block.dayOfWeek.toUpperCase()} • P{block.period}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                de {block.startTime} a {block.endTime}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Editar Bloque Horario & Asignaciones
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Constraint Banner - Strictly villa-magenta for alerts */}
        {!validation.isValid && (
          <div className="bg-white border-b-2 border-villa-magenta/40 px-6 py-3 flex items-start space-x-3 text-xs text-villa-dark shrink-0">
            <ShieldAlert className="w-4 h-4 text-villa-magenta shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold text-villa-magenta block mb-0.5">Alerta de Colisión (Constraint Solver)</span>
              <span className="text-villa-dark">{validation.message}</span>
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-white border-b-2 border-villa-magenta/40 px-6 py-2.5 text-xs text-villa-magenta flex items-center space-x-2 font-medium shrink-0">
            <AlertTriangle className="w-4 h-4 text-villa-magenta shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Body con Scroll Delegado */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Subject: Selector Estricto de Catálogo Maestro Oficial MEN (Sin Entradas Libres) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Asignatura Oficial (Catálogo Maestro) *</span>
              <span className="text-[10px] text-slate-400 font-normal">Sin entradas libres</span>
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
            >
              {asignaturasOficiales.map((area) => (
                <optgroup key={area.area} label={area.area}>
                  {area.materias.map((m) => (
                    <option key={m.id} value={m.officialName}>
                      {m.officialName} ({m.shortName})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Primary Teacher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Docente Titular
            </label>
            <select
              value={teacherId}
              onChange={(e) => handleTeacherChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
            >
              {teachers.map((t) => {
                const subs = (t.subjects && t.subjects.length > 0)
                  ? t.subjects.join(', ')
                  : t.assignedSubject || t.specialty?.join(', ') || 'General';
                return (
                  <option key={t.id} value={t.id}>
                    {t.displayName} ({subs})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sub-menú de Selección Específica de Materia (1:N) */}
          {availableTeacherSubjects.length > 1 && (
            <div className="p-3.5 bg-indigo-50/90 border-2 border-indigo-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Materia a impartir en esta hora ({candidateTeacher?.displayName}) *</span>
                </span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  {availableTeacherSubjects.length} habilitadas
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableTeacherSubjects.map((subj) => {
                  const isSelected = subject.trim().toLowerCase() === subj.trim().toLowerCase();
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSubject(subj)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400'
                          : 'bg-white text-slate-700 border-indigo-200 hover:border-indigo-300 hover:bg-white/80'
                      }`}
                    >
                      <span className="truncate">{subj}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1.5 text-white" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-indigo-800">
                Docente con múltiples materias asignadas. Haz clic en la asignatura específica para este bloque.
              </p>
            </div>
          )}

          {/* Classroom */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Aula / Espacio Físico
            </label>
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.building} - Aforo: {c.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Status Selection */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Estado Operacional del Bloque
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('regular')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  status === 'regular'
                    ? 'bg-brand-50 border-brand-500 text-brand-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Clase Regular
              </button>
              <button
                type="button"
                onClick={() => setStatus('absent')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  status === 'absent'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Ausencia
              </button>
              <button
                type="button"
                onClick={() => setStatus('covered')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  status === 'covered'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cubierto / Reemplazo
              </button>
            </div>
          </div>

          {/* Replacement Teacher if covered */}
          {status === 'covered' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <label className="block text-xs font-bold text-emerald-900 flex items-center space-x-1">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Docente de Reemplazo Designado</span>
              </label>
              <select
                value={replacementTeacherId}
                onChange={(e) => handleReplacementChange(e.target.value)}
                required
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 transition shadow-2xs"
              >
                <option value="">Selecciona docente disponible...</option>
                {teachers
                  .filter((t) => t.id !== teacherId)
                  .map((t) => {
                    const subs = (t.subjects && t.subjects.length > 0)
                      ? t.subjects.join(', ')
                      : t.assignedSubject || t.specialty?.join(', ') || 'General';
                    return (
                      <option key={t.id} value={t.id}>
                        {t.displayName} ({subs})
                      </option>
                    );
                  })}
              </select>

              {/* Sub-menú de selección de materia para el reemplazo si tiene múltiples materias */}
              {availableReplacementSubjects.length > 1 && (
                <div className="p-3 bg-white/90 border border-emerald-300 rounded-xl space-y-2 mt-2">
                  <label className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Materia de Reemplazo ({candidateReplacement?.displayName}) *</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {availableReplacementSubjects.length} habilitadas
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableReplacementSubjects.map((subj) => {
                      const isSelected = subject.trim().toLowerCase() === subj.trim().toLowerCase();
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => setSubject(subj)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left transition border flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400'
                              : 'bg-white text-slate-700 border-emerald-200 hover:border-emerald-300'
                          }`}
                        >
                          <span className="truncate">{subj}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observaciones Pedagógicas / Administrativas
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade notas sobre sustituciones, traslados de aula o novedades..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
            />
          </div>

          </div>

          {/* Footer Fijo con Botones de Acción (Separado del área de scroll) */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !validation.isValid}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer ${
                validation.isValid && !isSubmitting
                  ? 'bg-villa-blue-dark hover:bg-villa-blue-light text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Validando & Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
