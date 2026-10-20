import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicLevel, UserEntity } from '../../../domain/entities/user.entity';
import { getSubjectsByLevel } from '../../../domain/constants/subjects';
import { RegisterTeacherUseCase } from '../../../application/use-cases/teacher/register-teacher.usecase';
import { FirestoreUserRepository } from '../../../infrastructure/repositories/firestore-user.repository';
import { getNextAvailableTeacherColor } from '../../../domain/services/teacher-color.service';
import { School, UserPlus, CheckCircle2, AlertCircle, ArrowRight, BookOpen, Layers, Palette, AlertTriangle } from 'lucide-react';

export const TeacherOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const userRepo = new FirestoreUserRepository();
  const registerUseCase = new RegisterTeacherUseCase(userRepo);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('bachillerato');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Tecnología e Informática']);
  const [docente, setDocente] = useState<{ color_hex: string }>({ color_hex: '#1E3A8A' });
  const [allTeachers, setAllTeachers] = useState<UserEntity[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    userRepo.getAll().then((users) => {
      const teachers = users.filter((u) => u.role === 'teacher');
      setAllTeachers(teachers);
      const used = teachers.map((t) => t.color_hex || t.color).filter((c): c is string => Boolean(c));
      const freeColor = getNextAvailableTeacherColor(used);
      setDocente({ color_hex: freeColor });
    });
  }, []);

  const usedColorsMap = useMemo(() => {
    return allTeachers.map((t) => ({
      id: t.id,
      name: t.displayName,
      hex: (t.color_hex || t.color || '#94A3B8').toUpperCase(),
    }));
  }, [allTeachers]);

  // Closed master list of subjects based on selected level
  const availableSubjects = getSubjectsByLevel(academicLevel);

  const handleLevelChange = (level: AcademicLevel) => {
    setAcademicLevel(level);
    const subjectsForLevel = getSubjectsByLevel(level);
    if (subjectsForLevel.length > 0) {
      setSelectedSubjects([subjectsForLevel[0].name]);
    } else {
      setSelectedSubjects([]);
    }
  };

  const handleToggleSubject = (name: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(name)) {
        if (prev.length <= 1) return prev; // At least one subject
        return prev.filter((s) => s !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedSubjects.length === 0) {
      setErrorMessage('Debes seleccionar al menos una asignatura oficial del catálogo.');
      return;
    }

    try {
      setIsSubmitting(true);
      await registerUseCase.execute({
        displayName,
        email,
        documentId,
        phone,
        academicLevel,
        subjects: selectedSubjects,
        assignedSubject: selectedSubjects[0],
        customColorHex: docente.color_hex,
      });

      // Propagar evento en tiempo real
      window.dispatchEvent(new Event('users_collection_updated'));

      // Save session info for the locked page
      sessionStorage.setItem('locked_teacher_name', displayName);
      sessionStorage.setItem('locked_teacher_subject', selectedSubjects.join(', '));
      sessionStorage.setItem('locked_teacher_level', academicLevel);

      // REDIRECT IMMEDIATELY TO LOCKED HOLDING STATE
      navigate('/teacher/locked');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al completar el registro docente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 sm:p-8 text-white relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center font-bold">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-100">
                I.E. Villa Flora • Portal Académico
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Registro de Nuevo Docente
              </h2>
            </div>
          </div>
          <p className="text-xs text-brand-100 max-w-md">
            Ingresa tus datos institucionales y selecciona tu nivel y asignatura del catálogo curricular oficial.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 text-xs text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Mateo Arango"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="docente@ievillaflora.edu.co"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cédula de Ciudadanía *
              </label>
              <input
                type="text"
                required
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Ej. 1020456789"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Teléfono Celular *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 3146665544"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Control Cromático Manual (Color Picker) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-brand-600" />
                <span>Firma Cromática (Color Picker) *</span>
              </label>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800">
                {docente.color_hex.toUpperCase()}
              </span>
            </div>

            {/* Inyección de Input Nativo */}
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={docente.color_hex}
                onChange={(e) => setDocente({ ...docente, color_hex: e.target.value })}
                className="h-10 w-20 cursor-pointer"
              />
              <span className="text-xs text-slate-500">
                Elige el tono identificador para tus bloques de clase en la matriz horaria institucional.
              </span>
            </div>

            {/* Auditoría Visual de Colisiones (Mapa de Uso) */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Colores ya en uso por otros profesores ({usedColorsMap.length}):
              </span>
              <div className="flex gap-1 flex-wrap">
                {usedColorsMap.map((color) => (
                  <div
                    key={color.id}
                    style={{ backgroundColor: color.hex }}
                    className="w-4 h-4 rounded-full border border-gray-300"
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Academic Level (Dropdown Closed Control) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
              Nivel Académico de Desempeño *
            </label>
            <select
              value={academicLevel}
              onChange={(e) => handleLevelChange(e.target.value as AcademicLevel)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-brand-600 transition shadow-2xs"
            >
              <option value="bachillerato">Bachillerato (Grados 6° a 11°)</option>
              <option value="primaria">Básica Primaria (Grados 1° a 5°)</option>
            </select>
          </div>

          {/* Closed Master Subject Selection (MULTI-SELECT TAGS / CHECKBOXES) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                Asignaturas Oficiales de Contratación (Selección Múltiple) *
              </label>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                {selectedSubjects.length} seleccionada{selectedSubjects.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Selected Tags Preview */}
            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-24 overflow-y-auto">
                {selectedSubjects.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center text-xs font-bold bg-brand-600 text-white px-2.5 py-1 rounded-lg shadow-2xs group"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSubject(name)}
                      className="ml-1.5 hover:text-rose-200 transition text-[11px] font-extrabold focus:outline-none"
                      title="Quitar asignatura"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Scrollable Checkbox / Tag Grid */}
            <div className="border border-slate-300 rounded-2xl p-2 max-h-52 overflow-y-auto bg-white grid grid-cols-1 sm:grid-cols-2 gap-1.5 shadow-2xs">
              {availableSubjects.map((subject) => {
                const isChecked = selectedSubjects.includes(subject.name);
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleToggleSubject(subject.name)}
                    className={`flex items-start p-2 rounded-xl text-left transition border ${
                      isChecked
                        ? 'bg-brand-50 border-brand-500 text-brand-950 font-semibold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 mr-2 flex items-center justify-center border transition shrink-0 ${
                        isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{subject.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">
                        {subject.area}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Catálogo curricular normativo cerrado. Puedes seleccionar una o múltiples materias habilitadas para tu perfil docente (ej. Alex: Tecnología, Artística, Bases de datos, etc.).
            </p>
          </div>

          {/* Policy Notice */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <p>
              Al completar el registro, tu cuenta entrará en estado de revisión. La Coordinación Académica revisará tu perfil y te asignará los grupos y horas correspondientes en la matriz institucional.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs ${
                isSubmitting
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/25'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando docente...' : 'Completar Registro Docente'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
