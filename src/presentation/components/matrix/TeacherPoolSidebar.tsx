import React, { useState, useMemo } from 'react';
import { UserEntity } from '../../../domain/entities/user.entity';
import { TimeBlockEntity } from '../../../domain/entities/time-block.entity';
import { useTeacherLoad } from '../../hooks/useTeacherLoad';
import {
  Users,
  Search,
  BookOpen,
  GripVertical,
  AlertCircle,
  X,
  ChevronLeft,
} from 'lucide-react';

interface TeacherPoolSidebarProps {
  teachers: UserEntity[];
  timeBlocks: TimeBlockEntity[];
  getTeacherColor?: (id: string, name?: string) => string;
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export const TeacherPoolSidebar: React.FC<TeacherPoolSidebarProps> = ({
  teachers,
  timeBlocks,
  getTeacherColor,
  isOpen = false,
  onToggle,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'bachillerato' | 'primaria'>('all');

  const { getTeacherLoad } = useTeacherLoad(teachers, timeBlocks);

  const filteredTeachers = useMemo(() => {
    return teachers
      .filter((t) => t.role === 'teacher' && t.isActive !== false)
      .filter((t) => {
        if (levelFilter !== 'all' && t.academicLevel && t.academicLevel !== levelFilter) {
          return false;
        }
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        const nameMatch = (t.displayName || '').toLowerCase().includes(term);
        const docMatch = (t.documentId || '').toLowerCase().includes(term);
        const subjMatch = (t.subjects || []).some((s) => s.toLowerCase().includes(term));
        return nameMatch || docMatch || subjMatch;
      });
  }, [teachers, searchTerm, levelFilter]);

  return (
    <aside
      className={`fixed top-0 right-0 h-screen w-80 bg-white shadow-2xl z-40 transition-transform duration-300 flex flex-col select-none border-l border-slate-200 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Construcción del Disparador Lateral (Edge Tab): Posicionamiento pegado al borde izquierdo del Drawer */}
      <button
        type="button"
        onClick={onToggle || onClose}
        aria-label={isOpen ? 'Cerrar panel de docentes disponibles' : 'Abrir panel de docentes disponibles'}
        title={isOpen ? 'Ocultar panel de docentes disponibles' : 'Mostrar docentes disponibles'}
        className="absolute right-full top-1/2 -translate-y-1/2 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-slate-900 font-bold py-4 px-2 rounded-l-2xl shadow-2xl border-l-2 border-y-2 border-yellow-500/40 flex flex-col items-center gap-2 cursor-pointer z-50 select-none transition-all group"
      >
        <ChevronLeft
          className={`w-4 h-4 text-slate-900 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
        <span
          className="text-xs font-bold tracking-tight select-none whitespace-nowrap text-slate-900"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Docentes disponibles...
        </span>
      </button>

      {/* Cabecera del Panel Lateral */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">
              Docentes Disponibles
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {filteredTeachers.length}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                title="Cerrar panel lateral"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mb-2.5 leading-snug">
          Arrastra un docente a cualquier celda disponible de la matriz para asignarle horario.
        </p>

        {/* Buscador Rápido de Docentes */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o materia..."
            className="w-full h-8 bg-white border border-slate-200 rounded-xl pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de Tarjetas de Docentes con Scroll Seguro */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 bg-slate-50/30">
        {filteredTeachers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-80" />
            <span>No se encontraron docentes disponibles.</span>
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            const { currentAssignedHours, maxWeeklyHours, isLimitReached, isExactLimit } =
              getTeacherLoad(teacher.id);

            const isExhausted = currentAssignedHours >= maxWeeklyHours;
            const teacherColor = getTeacherColor
              ? getTeacherColor(teacher.id, teacher.displayName)
              : teacher.color_hex || '#1E3A8A';

            const primarySubject =
              teacher.subjects?.[0] || teacher.assignedSubject || 'Docente General';

            return (
              <div
                key={teacher.id}
                draggable={!isExhausted}
                onDragStart={(e) => {
                  if (isExhausted) {
                    e.preventDefault();
                    return;
                  }
                  const dragPayload = {
                    item: {
                      id: `teacher-${teacher.id}`,
                      isTeacherCard: true,
                      teacherId: teacher.id,
                      teacherName: teacher.displayName,
                      subject: primarySubject,
                      color: teacherColor,
                    },
                    sourceId: `teacher-pool-${teacher.id}`,
                  };
                  e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
                  e.dataTransfer.effectAllowed = 'copyMove';
                  document.body.classList.add('is-dragging-matrix-slot');
                }}
                onDragEnd={() => {
                  document.body.classList.remove('is-dragging-matrix-slot');
                }}
                className={`p-3 rounded-2xl border transition-all bg-white shadow-2xs select-none ${
                  isExhausted
                    ? 'opacity-50 pointer-events-none border-red-500'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-grab active:cursor-grabbing'
                }`}
                title={
                  isExhausted
                    ? `Límite legal alcanzado (${currentAssignedHours}/${maxWeeklyHours} hrs). Bloqueado para nuevas asignaciones.`
                    : `Arrastrar a la matriz (${currentAssignedHours}/${maxWeeklyHours} hrs asignadas)`
                }
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Avatar y Nombre */}
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: teacherColor }}
                    >
                      {teacher.displayName
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {teacher.displayName}
                      </h4>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-500 truncate">
                        <BookOpen className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                        <span className="truncate">{primarySubject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badge Contador de Carga Laboral (ej. 18/22 hrs) */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        isExhausted
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : currentAssignedHours >= maxWeeklyHours - 2
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {currentAssignedHours}/{maxWeeklyHours} hrs
                    </span>
                    {!isExhausted && (
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pie de Panel Informativo */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-500 font-medium shrink-0">
        Control de Carga Laboral Legal (Decreto 1850 / MEN)
      </div>
    </aside>
  );
};
