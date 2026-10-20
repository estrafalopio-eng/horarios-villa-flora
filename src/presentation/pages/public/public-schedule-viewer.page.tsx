import React from 'react';

/**
 * Public Web Client Viewer Page
 * PRD §1 & §4: Firebase Hosting Web Client
 * Public read-only viewing platform for schedules and updates.
 */
export const PublicScheduleViewerPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto text-slate-800 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Horarios Escolares - I.E. Villa Flora</h2>
        <p className="text-xs text-slate-500">
          Cliente Web Público (Lectura) para padres de familia, acudientes y estudiantes.
        </p>
      </div>

      <div className="border border-slate-200 bg-white rounded-3xl p-8 text-center text-slate-600 shadow-xs">
        <p className="font-semibold text-sm text-slate-800">Cliente Web Público PWA (Modo Lectura)</p>
        <p className="text-xs text-slate-500 mt-1">
          Visualización de la jornada escolar en modo de solo lectura.
        </p>
      </div>
    </div>
  );
};
