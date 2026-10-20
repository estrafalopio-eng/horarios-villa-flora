import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { DayOfWeek, ShiftType } from '../../types';
import {
  Calendar,
  Clock,
  Bell,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Globe,
  School,
} from 'lucide-react';
import { generateWeekHeaders } from '../../domain/services/ChronologyEngine';

export const Header: React.FC = () => {
  const weekHeaders = React.useMemo(() => generateWeekHeaders(), []);
  const {
    filters,
    setFilters,
    pendingRequests,
    setIsReviewDrawerOpen,
    setIsTeacherModalOpen,
    userRole,
    setUserRole,
    resetToSeed,
  } = useSchool();

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 shadow-md">
      {/* Top Banner: Brand & Role Switcher */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: School Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-white tracking-tight">I.E. Villa Flora</h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                B2B Core Engine
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Firestore Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Motor de Agendamiento Escolar • Arquitectura Maker-Checker
            </p>
          </div>
        </div>

        {/* Center: Shift Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, shift: 'morning' }))}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filters.shift === 'morning'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Bachillerato (6:30 - 12:30)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, shift: 'afternoon' }))}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filters.shift === 'afternoon'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Primaria (12:30 - 18:30)</span>
          </button>
        </div>

        {/* Right: Maker-Checker Drawer Trigger & Role Switcher */}
        <div className="flex items-center space-x-3">
          {/* Docente Maker Button */}
          <button
            type="button"
            onClick={() => setIsTeacherModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shadow-sm"
            title="Registrar solicitud de ausencia docente (Maker)"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Notificar Ausencia (Docente)</span>
          </button>

          {/* Coordinadora Checker Notification Badge */}
          <button
            type="button"
            onClick={() => setIsReviewDrawerOpen(true)}
            className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm border ${
              pendingRequests.length > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 ring-2 ring-amber-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${pendingRequests.length > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
            <span>Bandeja Checker</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>

          {/* Reset seed demo */}
          <button
            type="button"
            onClick={resetToSeed}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
            title="Reiniciar datos de prueba"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Sub-Bar: Day Selector */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-slate-400 mr-2 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-brand-400" /> Día:
            </span>
            {weekHeaders.map((day) => {
              const isHoliday = Boolean(day.isHoliday);
              const isSelected = filters.day === day.id;

              return (
                <button
                  key={day.id}
                  type="button"
                  role="columnheader"
                  onClick={() => setFilters((prev) => ({ ...prev, day: day.id }))}
                  className={`px-3 py-1 rounded-md transition-all whitespace-nowrap text-xs md:text-sm border ${
                    isHoliday
                      ? 'bg-red-600 text-white font-bold border-red-700'
                      : isSelected
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30 font-bold'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-slate-100 font-medium'
                  }`}
                  title={isHoliday ? `${day.label} (${day.holidayName || 'Día Festivo'})` : `Ver horario del ${day.label}`}
                >
                  <span className="hidden sm:inline whitespace-nowrap text-xs md:text-sm font-bold">{day.label}</span>
                  <span className="sm:hidden whitespace-nowrap text-xs font-bold">{day.short}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-brand-400"></span>
            <span>Matriz de Escritorio de la Coordinadora</span>
          </div>
        </div>
      </div>
    </header>
  );
};
