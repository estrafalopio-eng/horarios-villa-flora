import React, { useState, useMemo } from 'react';
import {
  Bell,
  Plus,
  Search,
  Filter,
  Info,
  AlertTriangle,
  FileText,
  Clock,
  Calendar,
  Users,
  User,
  Trash2,
  CheckCircle2,
  Archive,
  Eye,
  X,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { useIncidences } from '../../hooks/useIncidences';
import { useCoordinatorMatrix } from '../../context/CoordinatorMatrixContext';
import { IncidenceEntity, IncidenceType } from '../../../domain/entities/incidence.entity';
import { RegisterIncidenceModal } from '../../components/incidences/RegisterIncidenceModal';

export const CoordinatorIncidencesPage: React.FC = () => {
  const {
    incidences,
    activeIncidences,
    historicalIncidences,
    isLoading,
    todayStr,
    createIncidence,
    deleteIncidence,
  } = useIncidences();

  const { teachers } = useCoordinatorMatrix();

  // Control de filtros: 'active' (Default - Auto Purge), 'historical', 'all'
  const [activeTab, setActiveTab] = useState<'active' | 'historical' | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | IncidenceType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedIncidence, setSelectedIncidence] = useState<IncidenceEntity | null>(null);
  const [incidenceToDelete, setIncidenceToDelete] = useState<IncidenceEntity | null>(null);

  // Filtrado de incidencias
  const displayedIncidences = useMemo(() => {
    let baseList: IncidenceEntity[] = [];
    if (activeTab === 'active') {
      baseList = activeIncidences;
    } else if (activeTab === 'historical') {
      baseList = historicalIncidences;
    } else {
      baseList = incidences;
    }

    return baseList.filter((item) => {
      // Filtro por tipo
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }
      // Filtro por búsqueda de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = item.title.toLowerCase().includes(query);
        const descMatch = item.description.toLowerCase().includes(query);
        const targetMatch = item.target.toLowerCase().includes(query);
        return titleMatch || descMatch || targetMatch;
      }
      return true;
    });
  }, [activeTab, activeIncidences, historicalIncidences, incidences, typeFilter, searchQuery]);

  const urgentActiveCount = useMemo(() => {
    return activeIncidences.filter((i) => i.type === 'Urgencia').length;
  }, [activeIncidences]);

  const handleDeleteConfirm = async () => {
    if (!incidenceToDelete) return;
    try {
      await deleteIncidence(incidenceToDelete.id);
      setIncidenceToDelete(null);
    } catch (err) {
      console.error('Error deleting incidence:', err);
    }
  };

  const renderTypeBadge = (type: IncidenceType) => {
    switch (type) {
      case 'Aviso':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            Aviso
          </span>
        );
      case 'Incapacidad':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <FileText className="w-3.5 h-3.5 shrink-0 text-purple-600" />
            Incapacidad
          </span>
        );
      case 'Permiso':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            Permiso
          </span>
        );
      case 'Urgencia':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-300/40">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
            Urgencia
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado Principal B2B */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
              Canal Oficial Unidireccional
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Smartphone className="w-3 h-3" />
              Preparado para App Móvil
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-800" />
            Tablero de Novedades e Incidencias
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tablero de control y difusión de incidencias, incapacidades, permisos y avisos oficiales emitidos desde
            Coordinación Académica hacia el cuerpo docente institucional.
          </p>
        </div>

        {/* Botón Primario: Registrar Novedad */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Novedad</span>
          </button>
        </div>
      </div>

      {/* KPI Micro-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Total Novedades</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{incidences.length}</span>
            <span className="text-[10px] text-slate-400">Histórico completo</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Activas (Vigentes)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">{activeIncidences.length}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Auto-Purge Activo</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Urgencias Activas
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-red-700">{urgentActiveCount}</span>
            <span className="text-[10px] text-red-600 font-medium">Prioridad Inmediata</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5" />
            Histórico (Vencidas)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-600">{historicalIncidences.length}</span>
            <span className="text-[10px] text-slate-400">Archivadas</span>
          </div>
        </div>
      </div>

      {/* Barra de Control, Tabs de Auto-Purge y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Segmented Control: Activas (Default) | Histórico | Todas */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium select-none">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Activas (Vigentes)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {activeIncidences.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('historical')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'historical'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Histórico (Vencidas)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {historicalIncidences.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {incidences.length}
              </span>
            </button>
          </div>

          {/* Búsqueda y Filtro de Tipo */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro por Tipo */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | IncidenceType)}
                className="bg-white border border-slate-300 text-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-slate-800 outline-none"
              >
                <option value="all">Todos los tipos</option>
                <option value="Aviso">Avisos</option>
                <option value="Incapacidad">Incapacidades</option>
                <option value="Permiso">Permisos</option>
                <option value="Urgencia">Urgencias</option>
              </select>
            </div>

            {/* Input de Búsqueda */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, contenido o docente..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Indicador de Auto-Purge activo */}
        {activeTab === 'active' && (
          <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
            <span>
              Mostrando únicamente novedades con vencimiento igual o posterior a hoy (<strong>{todayStr}</strong>).
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('historical')}
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Consultar novedades pasadas en el Histórico →
            </button>
          </div>
        )}
      </div>

      {/* DATA GRID (Tabla de Datos B2B) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Título y Contenido</th>
                <th className="py-3 px-4">Destinatario</th>
                <th className="py-3 px-4">Emisión</th>
                <th className="py-3 px-4">Vencimiento</th>
                <th className="py-3 px-4">Vigencia</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayedIncidences.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Bell className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="text-sm font-semibold text-slate-600">No se encontraron novedades</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {activeTab === 'active'
                          ? 'No hay novedades vigentes registradas. Puedes crear un nuevo comunicado con el botón superior.'
                          : 'No existen registros que coincidan con los filtros seleccionados.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedIncidences.map((inc) => {
                  const isExpired = inc.expirationDate < todayStr;
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedIncidence(inc)}
                    >
                      {/* Tipo */}
                      <td className="py-3 px-4 whitespace-nowrap">{renderTypeBadge(inc.type)}</td>

                      {/* Título & Descripción */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                          {inc.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{inc.description}</div>
                      </td>

                      {/* Destinatario */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {inc.target === 'Todos' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            <Users className="w-3 h-3 text-slate-500" />
                            Todos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <User className="w-3 h-3 text-indigo-600" />
                            {inc.target}
                          </span>
                        )}
                      </td>

                      {/* Fecha de Emisión */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {inc.date}
                      </td>

                      {/* Fecha de Vencimiento */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <span className={isExpired ? 'text-slate-400 line-through' : 'text-slate-800 font-semibold'}>
                          {inc.expirationDate}
                        </span>
                      </td>

                      {/* Estado de Vigencia */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {!isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Vigente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            Expirada
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedIncidence(inc)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIncidenceToDelete(inc)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Eliminar novedad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro de Novedades */}
      <RegisterIncidenceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        teachers={teachers}
        onSubmit={async (data) => {
          await createIncidence(data);
        }}
      />

      {/* Modal / Drawer de Detalle de Incidencia */}
      {selectedIncidence && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {renderTypeBadge(selectedIncidence.type)}
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedIncidence.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIncidence(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedIncidence.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Emisión: {selectedIncidence.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Vencimiento: {selectedIncidence.expirationDate}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Destinatario Oficial
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  {selectedIncidence.target === 'Todos' ? (
                    <>
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Todos los docentes de la institución</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>{selectedIncidence.target}</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Cuerpo del Comunicado
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  {selectedIncidence.description}
                </p>
              </div>

              {selectedIncidence.authorName && (
                <div className="text-[11px] text-slate-400 text-right">
                  Emitido por: <span className="font-semibold text-slate-600">{selectedIncidence.authorName}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedIncidence(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {incidenceToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">¿Eliminar Novedad?</h4>
                <p className="text-xs text-slate-500">Esta acción retirará el comunicado del tablero.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <strong>{incidenceToDelete.title}</strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIncidenceToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition cursor-pointer shadow-xs"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
