import React from 'react';

/**
 * Teacher Maker Page
 * Maker workflow: Teachers request absences without direct write access to time_blocks.
 */
export const TeacherMakerPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto text-slate-800 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Portal Docente - Gestión de Ausencias</h2>
        <p className="text-xs text-slate-500">
          Notificación y registro de ausencias institucionales para revisión por coordinación académica.
        </p>
      </div>

      <div className="border border-slate-200 bg-white rounded-3xl p-8 text-center text-slate-600 shadow-xs">
        <p className="font-semibold text-sm text-slate-800">Módulo de Solicitud de Ausencias Activo</p>
        <p className="text-xs text-slate-500 mt-1">
          Las solicitudes generadas se remiten a la bandeja de Novedades y Reemplazos de la Coordinación.
        </p>
      </div>
    </div>
  );
};
