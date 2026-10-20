import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Search, Filter, AlertCircle, CheckCircle2, BookOpen, Layers } from 'lucide-react';

const GRADES = ['all', '6°', '7°', '8°', '9°', '10°', '11°'];

export const MatrixFilters: React.FC = () => {
  const { filters, setFilters, timeBlocks, pendingRequests } = useSchool();

  // Metrics for active day & shift
  const currentBlocks = timeBlocks.filter(
    (b) => b.day_of_week === filters.day && b.shift === filters.shift
  );
  const absentCount = currentBlocks.filter((b) => b.status === 'absent').length;
  const coveredCount = currentBlocks.filter((b) => b.status === 'covered').length;
  const regularCount = currentBlocks.filter((b) => b.status === 'regular').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mb-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Left: Grade filters & Search */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 flex items-center mr-1">
          <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" /> Grado:
        </span>
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {GRADES.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, gradeFilter: grade }))}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filters.gradeFilter === grade
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {grade === 'all' ? 'Todos' : grade}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Buscar docente, materia o aula..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
          />
        </div>
      </div>

      {/* Right: Status Filters & Counters */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              statusFilter: prev.statusFilter === 'all' ? 'all' : 'all',
            }))
          }
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
            filters.statusFilter === 'all'
              ? 'bg-slate-800 border-slate-600 text-slate-200'
              : 'border-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-3 h-3 text-brand-400" />
          <span>Total: {currentBlocks.length}</span>
        </button>

        {/* Absent Filter */}
        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              statusFilter: prev.statusFilter === 'absent' ? 'all' : 'absent',
            }))
          }
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
            filters.statusFilter === 'absent'
              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
              : 'border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40'
          }`}
        >
          <AlertCircle className="w-3 h-3 text-rose-400" />
          <span>Sin Cobertura: {absentCount}</span>
        </button>

        {/* Covered Filter */}
        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              statusFilter: prev.statusFilter === 'covered' ? 'all' : 'covered',
            }))
          }
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
            filters.statusFilter === 'covered'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : 'border-emerald-900/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40'
          }`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Cubiertos: {coveredCount}</span>
        </button>
      </div>
    </div>
  );
};
