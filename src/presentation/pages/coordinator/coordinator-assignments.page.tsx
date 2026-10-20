import React, { useState, useEffect, useMemo } from 'react';
import { UserEntity } from '../../../domain/entities/user.entity';
import { GradeEntity } from '../../../domain/entities/grade.entity';
import { TimeBlockEntity } from '../../../domain/entities/time-block.entity';
import { FirestoreUserRepository } from '../../../infrastructure/repositories/firestore-user.repository';
import { FirestoreGradeRepository } from '../../../infrastructure/repositories/firestore-grade.repository';
import { FirestoreTimeBlockRepository } from '../../../infrastructure/repositories/firestore-time-block.repository';
import { AssignAcademicLoadUseCase } from '../../../application/use-cases/coordinator/assign-academic-load.usecase';
import { ensureSeedDataLoaded } from '../../../infrastructure/seed/initial-seed';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  Square,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Palette,
} from 'lucide-react';
import { TeacherFormModal } from '../../components/teacher/TeacherFormModal';

export const CoordinatorAssignmentsPage: React.FC = () => {
  const userRepo = useMemo(() => new FirestoreUserRepository(), []);
  const gradeRepo = useMemo(() => new FirestoreGradeRepository(), []);
  const timeBlockRepo = useMemo(() => new FirestoreTimeBlockRepository(), []);
  const assignUseCase = useMemo(
    () => new AssignAcademicLoadUseCase(userRepo, timeBlockRepo, gradeRepo),
    [userRepo, timeBlockRepo, gradeRepo]
  );

  const [teachers, setTeachers] = useState<UserEntity[]>([]);
  const [grades, setGrades] = useState<GradeEntity[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockEntity[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);

  useEffect(() => {
    ensureSeedDataLoaded();

    const unsubUsers = userRepo.subscribe((allUsers) => {
      setTeachers(allUsers.filter((u) => u.role === 'teacher'));
    });
    const unsubBlocks = timeBlockRepo.subscribe((blocks) => setTimeBlocks(blocks));

    gradeRepo.getAll().then((g) => setGrades(g));

    return () => {
      unsubUsers();
      unsubBlocks();
    };
  }, [userRepo, gradeRepo, timeBlockRepo]);

  // Separate pending vs assigned teachers
  const pendingTeachers = useMemo(
    () => teachers.filter((t) => t.academicAssignmentStatus === 'pending_assignment'),
    [teachers]
  );
  const assignedTeachers = useMemo(
    () => teachers.filter((t) => t.academicAssignmentStatus === 'assigned'),
    [teachers]
  );

  // Automatically select the first pending teacher if none selected
  useEffect(() => {
    if (!selectedTeacherId && pendingTeachers.length > 0) {
      setSelectedTeacherId(pendingTeachers[0].id);
      setSelectedGradeIds(pendingTeachers[0].assignedGradeIds || []);
    }
  }, [pendingTeachers, selectedTeacherId]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  const teacherSubjects = useMemo(() => {
    if (!selectedTeacher) return [];
    if (selectedTeacher.subjects && selectedTeacher.subjects.length > 0) return selectedTeacher.subjects;
    if (selectedTeacher.assignedSubject) return [selectedTeacher.assignedSubject];
    if (selectedTeacher.specialty && selectedTeacher.specialty.length > 0) return selectedTeacher.specialty;
    return [];
  }, [selectedTeacher]);

  const teacherSubject = teacherSubjects.join(', ');

  // Calculate matching blocks count for selected grades
  const matchingBlocksCount = useMemo(() => {
    if (teacherSubjects.length === 0 || selectedGradeIds.length === 0) return 0;
    return timeBlocks.filter(
      (b) =>
        selectedGradeIds.includes(b.gradeId) &&
        teacherSubjects.some(
          (ts) =>
            b.subject.toLowerCase().includes(ts.toLowerCase()) ||
            ts.toLowerCase().includes(b.subject.toLowerCase())
        )
    ).length;
  }, [timeBlocks, selectedGradeIds, teacherSubjects]);

  const toggleGrade = (gradeId: string) => {
    setSuccessNotice(null);
    setErrorNotice(null);
    setSelectedGradeIds((prev) =>
      prev.includes(gradeId) ? prev.filter((id) => id !== gradeId) : [...prev, gradeId]
    );
  };

  const selectQuickCycle = (levels: string[]) => {
    const matching = grades.filter((g) => levels.includes(g.gradeLevel)).map((g) => g.id);
    setSelectedGradeIds((prev) => Array.from(new Set([...prev, ...matching])));
  };

  const handleExecuteAssignment = async () => {
    if (!selectedTeacher) return;
    setSuccessNotice(null);
    setErrorNotice(null);

    try {
      setIsSubmitting(true);
      const res = await assignUseCase.execute({
        teacherId: selectedTeacher.id,
        selectedGradeIds,
      });

      setSuccessNotice(
        `¡Asignación exitosa! Se vincularon ${selectedGradeIds.length} grupos y ${res.updatedBlocksCount} bloques horarios para "${selectedTeacher.displayName}" (${teacherSubject}).`
      );

      // Select next pending if available
      const remainingPending = pendingTeachers.filter((t) => t.id !== selectedTeacher.id);
      if (remainingPending.length > 0) {
        setSelectedTeacherId(remainingPending[0].id);
        setSelectedGradeIds(remainingPending[0].assignedGradeIds || []);
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Error al ejecutar la asignación de carga horaria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto space-y-6 text-villa-dark">
      {/* Header - Official Palette */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-villa-dark tracking-tight">
              Bandeja de Asignación de Carga Académica
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-villa-blue-light/10 text-villa-blue-dark border border-villa-blue-light/20">
              Coordinación B2B
            </span>
          </div>
          <p className="text-xs text-villa-gray">
            Revisión de docentes registrados y vinculación explícita de grados a la colección de horarios (`time_blocks`).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/register/teacher"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-villa-dark text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5"
          >
            <span>+ Simular Registro Docente</span>
          </Link>
          <Link
            to="/coordinator/matrix"
            className="px-4 py-2 rounded-xl bg-villa-blue-dark hover:bg-villa-blue-light text-white text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <span>Ver Matriz Horaria</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pending & Active Teachers List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900">Docentes Pendientes por Asignar</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {pendingTeachers.length} en espera
              </span>
            </div>

            {pendingTeachers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700">Todos los docentes tienen carga asignada</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Usa "Simular Registro Docente" para probar el onboarding de nuevos perfiles.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTeachers.map((teacher) => {
                  const isSelected = selectedTeacherId === teacher.id;
                  const subjectTag =
                    (teacher.subjects && teacher.subjects.length > 0)
                      ? teacher.subjects.join(', ')
                      : teacher.assignedSubject || (teacher.specialty && teacher.specialty[0]) || 'General';

                  return (
                    <div
                      key={teacher.id}
                      onClick={() => {
                        setSelectedTeacherId(teacher.id);
                        setSelectedGradeIds(teacher.assignedGradeIds || []);
                        setSuccessNotice(null);
                        setErrorNotice(null);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
                        isSelected
                          ? 'bg-amber-50/90 border-amber-400 shadow-xs ring-2 ring-amber-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                            <span>{teacher.displayName}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              (CC: {teacher.documentId})
                            </span>
                          </h4>
                          <span className="text-xs text-slate-500 block mt-0.5">{teacher.email}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500 text-white shadow-2xs">
                          Pendiente
                        </span>
                      </div>

                      {/* Tag Required by User */}
                      <div className="mt-3 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                          <BookOpen className="w-3 h-3 mr-1.5 text-brand-600" />
                          {subjectTag}
                        </span>
                        <span className="capitalize text-[11px] text-slate-600 px-2 py-0.5 rounded bg-white border border-slate-200 font-medium">
                          {teacher.academicLevel || 'Bachillerato'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Teachers Accordion / Mini List */}
          {assignedTeachers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Docentes con Carga Activa ({assignedTeachers.length})</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {assignedTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    onClick={() => {
                      setSelectedTeacherId(teacher.id);
                      setSelectedGradeIds(teacher.assignedGradeIds || []);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      selectedTeacherId === teacher.id
                        ? 'bg-slate-100 border-brand-500 text-slate-900 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{teacher.displayName}</span>
                      <span className="text-[10px] text-emerald-700 font-bold font-mono">Activo</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                      <span>
                        {(teacher.subjects && teacher.subjects.length > 0)
                          ? teacher.subjects.join(', ')
                          : teacher.assignedSubject || teacher.specialty?.join(', ')}
                      </span>
                      <span>{teacher.assignedGradeIds?.length || 0} grupos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Grades Checklist and Execution (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            {selectedTeacher ? (
              <>
                {/* Selected Profile Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Asignando Carga Curricular para:
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {selectedTeacher.displayName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                        Materia: {teacherSubject}
                      </span>
                      <span className="text-xs text-slate-500">
                        Nivel: <strong className="capitalize text-slate-800">{selectedTeacher.academicLevel || 'Bachillerato'}</strong>
                      </span>
                      {/* Badge de Color y Botón de Edición Cromática */}
                      <div className="flex items-center gap-1.5 ml-1">
                        <div
                          style={{ backgroundColor: selectedTeacher.color_hex || selectedTeacher.color || '#1E3A8A' }}
                          className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                          title={`Color actual: ${selectedTeacher.color_hex || selectedTeacher.color}`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditTeacherModalOpen(true)}
                          className="px-2.5 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 flex items-center space-x-1 shadow-2xs transition"
                          title="Editar color asignado o datos del docente"
                        >
                          <Palette className="w-3 h-3 text-villa-blue" />
                          <span>Editar Color</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4">
                    <span className="text-xs text-slate-400 block font-medium">Grados Marcados:</span>
                    <span className="text-2xl font-black text-brand-600 font-mono">
                      {selectedGradeIds.length}
                    </span>
                  </div>
                </div>

                {successNotice && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-800 flex items-start space-x-3 shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Operación Completada</span>
                      {successNotice}
                    </div>
                  </div>
                )}

                {errorNotice && (
                  <div className="bg-white border-2 border-villa-magenta/40 p-4 rounded-2xl text-xs text-villa-magenta flex items-start space-x-3 shadow-2xs font-medium">
                    <AlertCircle className="w-5 h-5 text-villa-magenta shrink-0 mt-0.5" />
                    <span>{errorNotice}</span>
                  </div>
                )}

                {/* Quick Selection Shortcuts */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-1.5 text-brand-600" />
                    Selecciona los Grados y Grupos Correspondientes:
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => selectQuickCycle(['6°', '7°', '8°'])}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                    >
                      Ciclo 6°-8°
                    </button>
                    <button
                      type="button"
                      onClick={() => selectQuickCycle(['9°', '10°', '11°'])}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                    >
                      Ciclo 9°-11°
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGradeIds(grades.map((g) => g.id))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                    >
                      Marcar Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGradeIds([])}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-[11px] font-semibold transition"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Checkboxes Grid of Grades */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {grades.map((grade) => {
                    const isChecked = selectedGradeIds.includes(grade.id);

                    return (
                      <div
                        key={grade.id}
                        onClick={() => toggleGrade(grade.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 select-none ${
                          isChecked
                            ? 'bg-brand-50 border-brand-500 shadow-2xs text-brand-950 ring-1 ring-brand-300'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <div className="shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-brand-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-sm block text-slate-900">
                            Grado {grade.fullName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Nivel {grade.shift === 'morning' ? 'Bachillerato' : 'Primaria'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Impact Preview & Enlace Final */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Impacto en la Colección: </span>
                    <strong className="text-slate-900 font-mono font-bold">
                      {matchingBlocksCount} bloques de "{teacherSubject}"
                    </strong>{' '}
                    en <strong className="text-brand-700 font-mono font-bold">{selectedGradeIds.length} grados</strong> serán
                    vinculados a este docente.
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteAssignment}
                    disabled={isSubmitting || selectedGradeIds.length === 0}
                    className={`px-6 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs ${
                      selectedGradeIds.length > 0 && !isSubmitting
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{isSubmitting ? 'Ejecutando enlace...' : 'Ejecutar Enlace de Carga Horaria'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <p>Selecciona un docente de la lista para gestionar su asignación de carga académica.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Control Cromático y Edición Docente */}
      <TeacherFormModal
        isOpen={isEditTeacherModalOpen}
        onClose={() => setIsEditTeacherModalOpen(false)}
        teacher={selectedTeacher}
        onSuccess={() => {
          setIsEditTeacherModalOpen(false);
        }}
      />
    </div>
  );
};
