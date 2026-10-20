import React from 'react';
import { TimeBlock, Teacher, AbsenceRequest } from '../../types';
import { AlertCircle, CheckCircle2, User, Clock, AlertTriangle } from 'lucide-react';

interface MatrixCellProps {
  timeBlock: TimeBlock | null;
  teacher?: Teacher;
  replacementTeacher?: Teacher;
  pendingRequest?: AbsenceRequest;
  onSelect: (block: TimeBlock) => void;
}

export const MatrixCell: React.FC<MatrixCellProps> = ({
  timeBlock,
  teacher,
  replacementTeacher,
  pendingRequest,
  onSelect,
}) => {
  if (!timeBlock) {
    return (
      <div className="h-full min-h-[96px] p-2 bg-slate-900/40 border border-slate-800/50 rounded-lg flex items-center justify-center text-slate-600 text-xs italic">
        Sin asignar
      </div>
    );
  }

  const isAbsent = timeBlock.status === 'absent';
  const isCovered = timeBlock.status === 'covered';
  const hasPending = Boolean(pendingRequest);

  // Status styling
  let containerClasses = 'bg-slate-800/80 border-slate-700 hover:border-brand-500/80 hover:bg-slate-800';
  let badgeColor = 'bg-brand-500/10 text-brand-400 border-brand-500/20';

  if (isAbsent) {
    containerClasses = 'bg-rose-950/40 border-rose-600/70 hover:border-rose-500 hover:bg-rose-950/60 shadow-sm shadow-rose-950/50';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  } else if (isCovered) {
    containerClasses = 'bg-emerald-950/40 border-emerald-600/70 hover:border-emerald-500 hover:bg-emerald-950/60 shadow-sm shadow-emerald-950/50';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  } else if (hasPending) {
    containerClasses = 'bg-amber-950/30 border-amber-500/60 hover:border-amber-400 hover:bg-amber-950/50';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }

  return (
    <div
      onClick={() => onSelect(timeBlock)}
      className={`h-full min-h-[96px] p-2.5 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col justify-between group relative overflow-hidden select-none ${containerClasses}`}
    >
      {/* Pending maker indicator ribbon */}
      {hasPending && (
        <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded-bl uppercase tracking-tight flex items-center">
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
          Solicitud Maker
        </div>
      )}

      {/* Top: Subject & Classroom */}
      <div>
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="font-semibold text-xs text-slate-100 group-hover:text-brand-300 line-clamp-1">
            {timeBlock.subject}
          </span>
          <span className="text-[10px] text-slate-400 font-mono px-1 py-0.2 rounded bg-slate-950/60 border border-slate-800 shrink-0">
            {timeBlock.classroom}
          </span>
        </div>

        {/* Regular Teacher Name */}
        <div className="flex items-center text-[11px] text-slate-300 mb-1">
          <User className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
          <span className={`truncate ${isAbsent ? 'line-through text-slate-400' : ''}`}>
            {teacher ? teacher.name : 'Docente sin asignar'}
          </span>
        </div>
      </div>

      {/* Bottom: Status Pill / Replacement Info */}
      <div className="mt-1 pt-1.5 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
        {isCovered ? (
          <div className="flex items-center space-x-1 text-emerald-300 font-medium truncate">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Reemplazo: {replacementTeacher?.name || 'Asignado'}</span>
          </div>
        ) : isAbsent ? (
          <div className="flex items-center space-x-1 text-rose-300 font-medium">
            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>Sin cobertura docente</span>
          </div>
        ) : hasPending ? (
          <div className="flex items-center space-x-1 text-amber-300">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>En revisión por Checker</span>
          </div>
        ) : (
          <div className="text-slate-400 text-[10px]">
            {timeBlock.start_time} - {timeBlock.end_time}
          </div>
        )}
      </div>
    </div>
  );
};
