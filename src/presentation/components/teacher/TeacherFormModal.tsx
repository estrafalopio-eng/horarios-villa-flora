import React, { useState, useEffect, useMemo } from 'react';
import { UserEntity, AcademicLevel } from '../../../domain/entities/user.entity';
import {
  asignaturasOficiales,
  ALL_OFFICIAL_MATERIAS,
  getSubjectsByLevel,
  getSubjectShortName,
  getSubjectColor,
} from '../../../domain/constants/subjects';
import { FirestoreUserRepository } from '../../../infrastructure/repositories/firestore-user.repository';
import { RegisterTeacherUseCase } from '../../../application/use-cases/teacher/register-teacher.usecase';
import { updateTeacherDictionaryColor } from '../../../domain/services/teacher-normalization.service';
import {
  VILLA_FLORA_PALETTE,
  getNextAvailableTeacherColor,
  calculateLuminanceContrast,
} from '../../../domain/services/teacher-color.service';
import {
  X,
  User,
  Palette,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Mail,
  CreditCard,
  Phone,
  Save,
  UserCog,
  Search,
} from 'lucide-react';
import { useCoordinatorMatrix } from '../../context/CoordinatorMatrixContext';

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: UserEntity | null; // Si se provee, modo Edición; si es null/undefined, modo Registro
  onSelectTeacher?: (teacher: UserEntity) => void;
  onSuccess?: (savedTeacher: UserEntity) => void;
}

export const TeacherFormModal: React.FC<TeacherFormModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onSelectTeacher,
  onSuccess,
}) => {
  const userRepo = useMemo(() => new FirestoreUserRepository(), []);
  const registerUseCase = useMemo(() => new RegisterTeacherUseCase(userRepo), [userRepo]);
  const { updateTeacher, teachers: contextTeachers, setSelectedTeacherForEdit } = useCoordinatorMatrix();

  const isEditing = Boolean(teacher);

  const [allTeachers, setAllTeachers] = useState<UserEntity[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState<number>(22);
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('bachillerato');
  const [allowedSubjects, setAllowedSubjects] = useState<string[]>(['Tecnología']);
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');
  
  // Objeto de estado del docente requerido por el usuario: docente.color_hex
  const [docente, setDocente] = useState<{ color_hex: string }>({ color_hex: '#1E3A8A' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Arquitectura de Bloqueo de Scroll y Prevención de Layout Shift
  useEffect(() => {
    if (!isOpen) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Cargar lista completa de docentes para el Mapa de Uso (Auditoría de Colisiones)
  useEffect(() => {
    if (isOpen) {
      userRepo.getAll().then((users) => {
        setAllTeachers(users.filter((u) => u.role === 'teacher'));
      });
    }
  }, [isOpen, userRepo]);

  // Renderizado de Estado Actual: Al abrir el modal, lee y muestra inmediatamente el color asignado
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSubjectSearchTerm('');
      if (teacher) {
        // Modo Edición: Precargar todos los datos del profesor existente
        setDisplayName(teacher.displayName || '');
        setEmail(teacher.email || '');
        setDocumentId(teacher.documentId || '');
        setPhone(teacher.phone || '');
        setMaxWeeklyHours(teacher.maxWeeklyHours ?? 22);
        setAcademicLevel(teacher.academicLevel || 'bachillerato');

        const initialAllowed =
          Array.isArray(teacher.allowedSubjects) && teacher.allowedSubjects.length > 0
            ? teacher.allowedSubjects
            : Array.isArray(teacher.subjects) && teacher.subjects.length > 0
            ? teacher.subjects.map(getSubjectShortName)
            : teacher.assignedSubject
            ? [getSubjectShortName(teacher.assignedSubject)]
            : ['Tecnología'];
        setAllowedSubjects(initialAllowed);

        // Leer inmediatamente el color asignado en base de datos
        const currentHex = teacher.color_hex || teacher.color || '#1E3A8A';
        setDocente({ color_hex: currentHex });
      } else {
        // Modo Registro: Sugerir primer color libre sin colisión y prellenar 22h y catálogo
        setDisplayName('');
        setEmail('');
        setDocumentId('');
        setPhone('');
        setMaxWeeklyHours(22);
        setAcademicLevel('bachillerato');
        setAllowedSubjects(['Matemáticas']); // Prellenado con 1 asignatura inicial del catálogo

        const usedColors = allTeachers
          .map((t) => t.color_hex || t.color)
          .filter((c): c is string => Boolean(c));
        const suggestedColor = getNextAvailableTeacherColor(usedColors);
        setDocente({ color_hex: suggestedColor });
      }
    }
  }, [isOpen, teacher, allTeachers]);

  const handleToggleAllowedSubject = (shortName: string) => {
    setAllowedSubjects((prev) => {
      if (prev.includes(shortName)) {
        return prev.filter((s) => s !== shortName);
      } else {
        return [...prev, shortName];
      }
    });
  };

  const filteredCatalogAreas = useMemo(() => {
    const term = subjectSearchTerm.toLowerCase().trim();
    if (!term) return asignaturasOficiales;

    return asignaturasOficiales
      .map((areaGroup) => ({
        ...areaGroup,
        materias: areaGroup.materias.filter(
          (m) =>
            m.shortName.toLowerCase().includes(term) ||
            m.officialName.toLowerCase().includes(term) ||
            areaGroup.area.toLowerCase().includes(term)
        ),
      }))
      .filter((areaGroup) => areaGroup.materias.length > 0);
  }, [subjectSearchTerm]);

  // Auditoría Visual de Colisiones (Mapa de Uso):
  // Excluye al docente actual si está en edición para no reportar auto-colisión
  const otherTeachers = useMemo(() => {
    return allTeachers.filter((t) => (teacher ? t.id !== teacher.id : true));
  }, [allTeachers, teacher]);

  const usedColorsMap = useMemo(() => {
    return otherTeachers.map((t) => ({
      id: t.id,
      teacherName: t.displayName,
      color: (t.color_hex || t.color || '#94A3B8').toUpperCase(),
    }));
  }, [otherTeachers]);

  // Detección de colisión cromática con otro profesor
  const collidingTeacher = useMemo(() => {
    const selectedHex = docente.color_hex.trim().toUpperCase();
    return usedColorsMap.find((u) => u.color === selectedHex) || null;
  }, [docente.color_hex, usedColorsMap]);

  // Contraste tipográfico dinámico (WCAG ITU-R BT.601)
  const contrastClass = calculateLuminanceContrast(docente.color_hex);

  // Iniciales para el preview
  const initials = useMemo(() => {
    const clean = (displayName || 'Docente').trim().split(/\s+/).filter(Boolean);
    if (clean.length === 0) return 'DO';
    if (clean.length === 1) return clean[0].substring(0, 2).toUpperCase();
    return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase();
  }, [displayName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim() || !email.trim() || !documentId.trim()) {
      setErrorMessage('Nombre, correo y documento son campos obligatorios.');
      return;
    }

    if (allowedSubjects.length === 0) {
      setErrorMessage('Debes seleccionar al menos una asignatura oficial del catálogo del MEN.');
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenColor = docente.color_hex.trim().toUpperCase();

      if (isEditing && teacher) {
        const updatedEntity: UserEntity = {
          ...teacher,
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          academicLevel,
          allowedSubjects,
          subjects: allowedSubjects,
          assignedSubject: allowedSubjects[0] || 'Clase',
          color: chosenColor,
          color_hex: chosenColor,
          avatarColor: chosenColor,
          maxWeeklyHours: Number(maxWeeklyHours) || 22,
          updatedAt: new Date().toISOString(),
        };

        // Inmutabilidad del Estado Global y Persistencia Dual (LocalStorage + Firestore)
        await updateTeacher(updatedEntity);

        onSuccess?.(updatedEntity);
      } else {
        // Registrar nuevo docente con el color seleccionado y límite semanal
        const created = await registerUseCase.execute({
          displayName,
          email,
          documentId,
          phone,
          academicLevel,
          allowedSubjects,
          subjects: allowedSubjects,
          assignedSubject: allowedSubjects[0] || 'Clase',
          customColorHex: chosenColor,
          maxWeeklyHours: Number(maxWeeklyHours) || 22,
        });

        // Sincronización inmutable en contexto
        await updateTeacher(created);

        onSuccess?.(created);
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar los cambios del docente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150">
        {/* Cabecera Fija Estructural */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border border-white/20 shadow-xs transition-colors shrink-0"
              style={{ backgroundColor: docente.color_hex }}
            >
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                {isEditing ? 'Editar Perfil Docente' : 'Registrar Nuevo Docente'}
              </h3>
              <p className="text-xs text-slate-300">
                {isEditing
                  ? `Modificando identidad de ${teacher?.displayName || 'profesor'}`
                  : 'Alta curricular y configuración de firma cromática'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación de Error Fija */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 text-xs text-rose-800 flex items-center space-x-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body con Scroll Delegado al Contenedor Central */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Selector Rápido de Docente en Modo Edición */}
          {isEditing && (allTeachers.length > 0 || contextTeachers.length > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2 shrink-0">
                <UserCog className="w-4 h-4 text-villa-blue" />
                <span>Docente seleccionado:</span>
              </label>
              <select
                value={teacher?.id || ''}
                onChange={(e) => {
                  const targetList = allTeachers.length > 0 ? allTeachers : contextTeachers;
                  const selected = targetList.find((t) => t.id === e.target.value);
                  if (selected) {
                    if (onSelectTeacher) {
                      onSelectTeacher(selected);
                    } else if (setSelectedTeacherForEdit) {
                      setSelectedTeacherForEdit(selected);
                    }
                  }
                }}
                className="w-full sm:w-auto flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-villa-blue shadow-2xs transition-colors"
              >
                {(allTeachers.length > 0 ? allTeachers : contextTeachers).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.displayName} ({t.documentId || t.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fila 1: Nombre y Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Nombre Completo *</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Alejandro Restrepo"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-villa-blue focus:ring-1 focus:ring-villa-blue transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Correo Institucional *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="docente@ievillaflora.edu.co"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-villa-blue focus:ring-1 focus:ring-villa-blue transition shadow-2xs"
              />
            </div>
          </div>

          {/* Fila 2: Documento, Teléfono y Carga Horaria Semanal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Cédula *</span>
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Ej. 70889900"
                className={`w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-villa-blue focus:ring-1 focus:ring-villa-blue transition shadow-2xs ${
                  isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Celular</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 3107771122"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-villa-blue focus:ring-1 focus:ring-villa-blue transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Horas Máximas *</span>
                <span className="text-[10px] text-blue-600 font-bold">Legal: 22h</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={45}
                  required
                  value={maxWeeklyHours}
                  onChange={(e) => setMaxWeeklyHours(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  title="Límite legal semanal de horas lectivas (Decreto 1850). Prellenado en 22, editable para excepciones sindicales o medias jornadas."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-villa-blue focus:ring-1 focus:ring-villa-blue transition shadow-2xs"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">
                  hrs/sem
                </span>
              </div>
            </div>
          </div>

          {/* Fila 3: CONTROL CROMÁTICO MANUAL (Color Picker Nativo) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-villa-blue" />
                <span>Firma Cromática (Color Picker)</span>
              </label>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-800">
                {docente.color_hex.toUpperCase()}
              </span>
            </div>

            {/* Inyección del Input Nativo HTML5 */}
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={docente.color_hex}
                onChange={(e) => setDocente({ ...docente, color_hex: e.target.value })}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300 p-0.5 bg-white shadow-2xs"
              />

              {/* Previsualización en Vivo de la Celda (Bloque 40%) */}
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 block mb-1">
                  Vista previa en la celda de la matriz:
                </span>
                <div
                  className="w-full h-8 flex items-center rounded border border-gray-300 overflow-hidden shadow-2xs"
                  style={{ backgroundColor: docente.color_hex }}
                >
                  <div className="w-6 flex-shrink-0 flex items-center justify-center h-full bg-black/20 font-bold text-[10px] text-white select-none">
                    {initials}
                  </div>
                  <span
                    className={`flex-1 px-1.5 text-[10px] font-semibold truncate ${contrastClass}`}
                  >
                    {displayName || 'Nombre del Docente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Auditoría Visual de Colisiones (Mapa de Uso) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">
                  Colores en uso por otros docentes ({usedColorsMap.length}):
                </span>
                {collidingTeacher && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>¡En uso por {collidingTeacher.teacherName}!</span>
                  </span>
                )}
              </div>

              {/* Matriz diminuta de colores en uso */}
              <div className="flex gap-1 flex-wrap p-2 bg-white border border-gray-200 rounded-xl max-h-24 overflow-y-auto">
                {usedColorsMap.map((item) => {
                  const isCurrentSelected =
                    docente.color_hex.trim().toUpperCase() === item.color;
                  return (
                    <div
                      key={item.id}
                      style={{ backgroundColor: item.color }}
                      className={`w-4 h-4 rounded-full border border-gray-300 shrink-0 transition-transform ${
                        isCurrentSelected
                          ? 'ring-2 ring-red-500 ring-offset-1 scale-125 z-10'
                          : 'hover:scale-125'
                      }`}
                      title={`${item.teacherName} (${item.color})`}
                      onClick={() => {
                        // Clic en un color existente para referencia o selección
                        setDocente({ ...docente, color_hex: item.color });
                      }}
                    />
                  );
                })}
              </div>

              {/* Sugerencias Rápidas de Paleta Curada Libre */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-500 block mb-1">
                  Tonos curados sugeridos (sin colisión):
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {VILLA_FLORA_PALETTE.filter(
                    (hex) => !usedColorsMap.some((u) => u.color === hex.toUpperCase())
                  )
                    .slice(0, 10)
                    .map((freeHex) => (
                      <button
                        key={freeHex}
                        type="button"
                        onClick={() => setDocente({ ...docente, color_hex: freeHex })}
                        style={{ backgroundColor: freeHex }}
                        className={`w-5 h-5 rounded-md border border-gray-300 shrink-0 transition-transform hover:scale-110 ${
                          docente.color_hex.toUpperCase() === freeHex.toUpperCase()
                            ? 'ring-2 ring-villa-blue ring-offset-1 scale-110'
                            : ''
                        }`}
                        title={`Sugerido: ${freeHex}`}
                      />
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fila 4: Nivel Académico y Multi-Select de Asignaturas del Catálogo MEN */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nivel Académico *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAcademicLevel('bachillerato')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition text-center cursor-pointer ${
                    academicLevel === 'bachillerato'
                      ? 'border-villa-blue bg-villa-blue/10 text-villa-blue-dark shadow-2xs font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Bachillerato
                </button>
                <button
                  type="button"
                  onClick={() => setAcademicLevel('primaria')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition text-center cursor-pointer ${
                    academicLevel === 'primaria'
                      ? 'border-villa-blue bg-villa-blue/10 text-villa-blue-dark shadow-2xs font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Primaria
                </button>
              </div>
            </div>

            {/* Componente Multi-Select Poblado Estrictamente por el Catálogo Maestro de Asignaturas (MEN) */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-villa-blue" />
                  <span>Catálogo de Asignaturas Autorizadas (MEN) *</span>
                </label>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    allowedSubjects.length === 0
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {allowedSubjects.length} {allowedSubjects.length === 1 ? 'materia' : 'materias'}
                </span>
              </div>

              {/* Input de Búsqueda Rápida en el Catálogo */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={subjectSearchTerm}
                  onChange={(e) => setSubjectSearchTerm(e.target.value)}
                  placeholder="Buscar asignatura oficial (ej. Matemáticas, Física, Biología)..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-villa-blue focus:ring-1 focus:ring-villa-blue transition shadow-2xs"
                />
                {subjectSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setSubjectSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Alerta de bloqueo condicional si el array está vacío */}
              {allowedSubjects.length === 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Requisito estricto:</strong> Debes seleccionar al menos una asignatura oficial para registrar o guardar el docente.
                  </span>
                </div>
              )}

              {/* Resumen de Asignaturas Seleccionadas (Chips Removibles) */}
              {allowedSubjects.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Asignaturas Habilitadas en el Perfil ({allowedSubjects.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-xl max-h-24 overflow-y-auto">
                    {allowedSubjects.map((shortName) => (
                      <span
                        key={shortName}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-white shadow-2xs"
                      >
                        <span>{shortName}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAllowedSubject(shortName)}
                          className="hover:text-rose-300 ml-0.5 cursor-pointer"
                          title="Eliminar de materias autorizadas"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Catálogo Maestro Agrupado por Área Curricular */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {filteredCatalogAreas.map((areaGroup) => (
                  <div key={areaGroup.area} className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        {areaGroup.area}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {areaGroup.materias.map((materia) => {
                        const isSelected = allowedSubjects.includes(materia.shortName);
                        return (
                          <button
                            key={materia.id}
                            type="button"
                            onClick={() => handleToggleAllowedSubject(materia.shortName)}
                            title={`${materia.officialName} (${materia.shortName})`}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              isSelected
                                ? 'bg-villa-blue-dark text-white shadow-2xs font-bold ring-1 ring-villa-blue-dark'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                            }`}
                          >
                            <span>{materia.shortName}</span>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          </div>

          {/* Pie de Página Fijo Estructural (Sticky/Fixed Footer) */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || allowedSubjects.length === 0}
              className="px-5 py-2.5 rounded-xl bg-villa-blue-dark hover:bg-villa-blue-light text-white text-xs font-bold transition shadow-xs flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Docente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
