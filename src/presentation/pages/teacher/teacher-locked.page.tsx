import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Clock, ArrowLeft } from 'lucide-react';

export const TeacherLockedPage: React.FC = () => {
  const teacherName = sessionStorage.getItem('locked_teacher_name') || 'Docente Registrado';
  const teacherSubject = sessionStorage.getItem('locked_teacher_subject') || 'Asignatura Seleccionada';
  const teacherLevel = sessionStorage.getItem('locked_teacher_level') || 'Bachillerato';

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-500/5 text-center relative overflow-hidden text-slate-800">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-100/60 rounded-full blur-3xl pointer-events-none"></div>

        {/* Lock Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mb-6 shadow-inner">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Badge */}
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 mb-3">
          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 animate-spin" /> Estado: En Espera de Coordinación
        </span>

        {/* REQUIRED EXACT MESSAGE */}
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug px-2 mb-3">
          Cuenta en revisión. Esperando asignación de carga académica por Coordinación.
        </h2>

        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Tu registro se ha almacenado exitosamente en la base de datos de la I.E. Villa Flora. Por motivos de seguridad y control curricular B2B, el acceso a la matriz de agendamiento permanece restringido hasta que la Coordinación Académica vincule tus grupos de clase.
        </p>

        {/* Teacher Snapshot Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 mb-6 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Docente Titular:</span>
            <span className="font-bold text-slate-800">{teacherName}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Asignatura Declarada:</span>
            <span className="font-bold text-brand-700">{teacherSubject}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Nivel Curricular:</span>
            <span className="capitalize font-semibold text-slate-700">{teacherLevel}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/coordinator/assignments"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1.5"
          >
            <span>Ver como Coordinadora</span>
          </Link>

          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-200 flex items-center justify-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
