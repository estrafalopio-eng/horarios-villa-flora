import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Calendar,
  Bell,
  UserPlus,
  UserCog,
  AlertTriangle,
  Loader2,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  Undo2,
  Camera,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Download,
  Share2,
} from 'lucide-react';
import { testWebhook, serializeScheduleToMatrix } from '../../services/webhookSync';
import { useCoordinatorMatrix } from '../context/CoordinatorMatrixContext';
import { TeacherFormModal } from '../components/teacher/TeacherFormModal';
import { TrashDropzone } from '../components/matrix/TrashDropzone';
import { UserEntity } from '../../domain/entities/user.entity';
import { TimeBlockEntity } from '../../domain/entities/time-block.entity';
import { FirestoreUserRepository } from '../../infrastructure/repositories/firestore-user.repository';
import { getCurrentWeekText, getOrdinalSuffix } from '../../domain/services/ChronologyEngine';
import { ensureSeedDataLoaded } from '../../infrastructure/seed/initial-seed';
import { ResetConfirmationModal } from '../components/common/ResetConfirmationModal';
import { PublishScheduleModal } from '../components/export/PublishScheduleModal';

export const MainLayout: React.FC = () => {
  const {
    selectedShift,
    setSelectedShift,
    pendingRequestsCount,
    kpiStats,
    statusFilter,
    setStatusFilter,
    activeTeachers,
    triggerReload,
    currentAcademicWeek,
    setCurrentAcademicWeek,
    currentPeriod: contextAcademicPeriod,
    setCurrentPeriod: setContextAcademicPeriod,
    teachers,
    isTeacherModalOpen,
    setIsTeacherModalOpen,
    selectedTeacherForEdit,
    setSelectedTeacherForEdit,
    openTeacherModal,
    canUndo,
    triggerUndo,
    currentSection: contextSection,
    isMatrixActive: contextIsMatrixActive,
  } = useCoordinatorMatrix();

  // Inyección de Dependencia de Ruta y Evaluación de Contexto Lógico (Route-Aware Controls)
  const location = useLocation();
  const currentSection = useMemo(() => {
    if (contextSection) return contextSection;
    if (location.pathname === '/' || location.pathname === '/coordinator/matrix') {
      return 'Inicio';
    }
    if (location.pathname.startsWith('/coordinator/assignments')) {
      return 'Horarios';
    }
    if (location.pathname.startsWith('/coordinator/novedades') || location.pathname.startsWith('/teacher/absences')) {
      return 'Novedades';
    }
    return 'Otro';
  }, [contextSection, location.pathname]);

  const isMatrixActive = typeof contextIsMatrixActive === 'boolean'
    ? contextIsMatrixActive
    : currentSection === 'Inicio';

  // Cronología Académica Oficial (Estrictamente de Solo Lectura)
  const { lunesFormat, viernesFormat, weekNumber, periodNumber, totalWeeksInPeriod } = useMemo(
    () => getCurrentWeekText(new Date()),
    []
  );

  // Destrucción de Caché Visual (Busting) y Gestión Dinámica de Logo
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem('ievf_logo_url') || '/logo-institucional.png';
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación estricta en cliente (tamaño <= 2MB y formatos admitidos)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

    if (file.size > MAX_SIZE) {
      setUploadError('El archivo excede el tamaño máximo permitido de 2MB.');
      e.target.value = '';
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Formato inválido. Solo se admiten archivos PNG, JPEG y SVG.');
      e.target.value = '';
      return;
    }

    setIsUploadingLogo(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Error al procesar y guardar el logo en el servidor.');
      }

      // Destrucción de Caché Visual (Busting):
      const newTimestampUrl = `/logo-institucional.png?t=${Date.now()}`;
      setLogoUrl(newTimestampUrl);
      localStorage.setItem('ievf_logo_url', newTimestampUrl);

      // Respaldo en Data URL para renderizado local inmediato
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          localStorage.setItem('ievf_logo_data_url', reader.result);
        }
      };
      reader.readAsDataURL(file);

      setUploadSuccess('¡Logo institucional actualizado correctamente!');
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      console.error('[Upload-Logo Error]:', err);
      setUploadError(err.message || 'Error al actualizar el logo institucional.');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const [connectionStatus, setConnectionStatus] = useState<{
    loading: boolean;
    success: boolean;
    message: string;
  }>({
    loading: false,
    success: true,
    message: 'Almacenamiento Local (PWA) / Google Sheets Serverless Bridge Activo',
  });

  // Estado y disparador directo de Publicación en Google Sheets
  const [isPublishingMatrix, setIsPublishingMatrix] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const getCurrentTimeBlocks = useCallback((): TimeBlockEntity[] => {
    try {
      const saved = localStorage.getItem('villaFloraMatrix') || localStorage.getItem('ievf_time_blocks_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('[MainLayout] Error leyendo bloques de tiempo para publicación:', err);
    }
    ensureSeedDataLoaded();
    try {
      const fallback = localStorage.getItem('villaFloraMatrix') || localStorage.getItem('ievf_time_blocks_v1');
      return fallback ? JSON.parse(fallback) : [];
    } catch {
      return [];
    }
  }, []);

  const handlePublishSchedule = async () => {
    setIsPublishingMatrix(true);
    try {
      const currentBlocks = getCurrentTimeBlocks();
      console.log("Estado DND:", currentBlocks);
      const matrixData = { matrix: serializeScheduleToMatrix(currentBlocks, "601") };
      await testWebhook(matrixData);
    } catch (err) {
      console.error('Error publicando parrilla:', err);
      alert('Fallo de red al intentar sincronizar con Sheets.');
    } finally {
      setIsPublishingMatrix(false);
    }
  };

  // Estado para el modal de validación de intención positiva (Hard-Confirm Modal)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Ejecución y Limpieza de Factory Reset tras Hard-Confirm en ResetConfirmationModal
  const handleExecuteFactoryReset = useCallback(() => {
    // 1. Vaciar por completo el localStorage
    localStorage.clear();

    // 2. Restaurar semilla institucional oficial del MEN
    ensureSeedDataLoaded();

    // 3. Cerrar el modal
    setIsResetModalOpen(false);

    // 4. Recargar el entorno para reiniciar todos los estados y contextos globales a sus valores por defecto
    window.location.reload();
  }, []);

  // Gestión de Instalación PWA (Zero-Privilege Native Simulation)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si la aplicación ya se ejecuta en modo standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) {
      alert('Para instalar la aplicación, haz clic en el icono "Instalar" que aparece a la derecha de la barra de direcciones de tu navegador (Chrome o Edge).');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-villa-dark flex font-sans antialiased">
      {/* EXPLICIT PERMANENT LEFT SIDEBAR - flex flex-col h-full */}
      <aside className="sticky top-0 h-screen w-44 sm:w-48 bg-white border-r border-slate-200 flex flex-col h-full z-40 shrink-0 select-none shadow-xs">
        {/* Arquitectura Visual de Alta Jerarquía: Tarjeta Estructural (Card) Estrictamente de Solo Lectura */}
        <div className="bg-slate-50 border-l-4 border-blue-600 p-4 shadow-sm mb-6 flex flex-col gap-1">
          {/* Nivel 1: Indicador de Periodo (Badge) */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-baseline">
              <span>
                {periodNumber}
                <span className="text-[0.65em] relative -top-[0.25em] ml-[1px] lowercase font-semibold">
                  {getOrdinalSuffix(periodNumber)}
                </span>
              </span>
              <span className="ml-1">Periodo</span>
            </span>
          </div>
          
          {/* Nivel 2: Rango de Fechas (Primario) */}
          <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
            Semana del {lunesFormat} al {viernesFormat}.
          </h2>
          
          {/* Nivel 3: Conteo Académico (Secundario) */}
          <span className="text-xs font-medium text-slate-500">
            Semana académica {weekNumber} de {totalWeeksInPeriod}.
          </span>
        </div>

        {/* Navigation Items: Explicit Labels with Icons */}
        <nav className="p-2 space-y-1 overflow-y-auto min-h-0">
          {/* 1. Parrilla académica */}
          <NavLink
            to="/coordinator/matrix"
            className={({ isActive }) =>
              `flex items-center rounded-xl px-2.5 py-2 space-x-2 transition-all ${
                isActive
                  ? 'bg-villa-blue-light text-white font-bold shadow-xs'
                  : 'text-villa-dark hover:bg-slate-100 hover:text-villa-blue-dark font-medium'
              }`
            }
          >
            <LayoutGrid className="shrink-0 w-4 h-4" />
            <span className="text-xs tracking-tight truncate">Parrilla académica</span>
          </NavLink>

          {/* 2. Horarios */}
          <NavLink
            to="/coordinator/assignments"
            className={({ isActive }) =>
              `flex items-center rounded-xl px-2.5 py-2 space-x-2 transition-all ${
                isActive
                  ? 'bg-villa-blue-light text-white font-bold shadow-xs'
                  : 'text-villa-dark hover:bg-slate-100 hover:text-villa-blue-dark font-medium'
              }`
            }
          >
            <Calendar className="shrink-0 w-4 h-4" />
            <span className="text-xs tracking-tight truncate">Horarios</span>
          </NavLink>

          {/* Separación de Entidades (Spacing): mt-4 antes de Registrar docente para separar Gestión de Personal */}
          <div className="mt-4 space-y-1">
            {/* 3. Registrar docente: Primary Monocromo (Gris de alta densidad / Acción primaria) */}
            <button
              type="button"
              onClick={() => {
                openTeacherModal(null, false);
              }}
              className="w-full flex items-center rounded-xl px-2.5 py-2 space-x-2 transition-all bg-slate-800 text-white hover:bg-slate-900 border-transparent shadow-sm font-medium text-xs cursor-pointer group text-left"
              title="Registrar nuevo docente en el sistema"
            >
              <UserPlus className="shrink-0 w-4 h-4 text-current group-hover:scale-105 transition-transform" />
              <span className="tracking-tight truncate">Registrar docente</span>
            </button>

            {/* 4. Editar docentes: Secondary Monocromo (Outline / Ghost con borde definido) */}
            <button
              type="button"
              onClick={() => {
                const initialTeacher = (teachers && teachers.length > 0) ? teachers[0] : null;
                openTeacherModal(initialTeacher, true);
              }}
              className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer group"
              title="Administrar y editar perfiles docentes"
            >
              <div className="flex items-center space-x-2 truncate">
                <UserCog className="shrink-0 w-4 h-4 text-current group-hover:scale-105 transition-transform" />
                <span className="tracking-tight truncate">Editar docentes</span>
              </div>
              {teachers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold shrink-0">
                  {teachers.length}
                </span>
              )}
            </button>
          </div>

          {/* 5. Novedades */}
          <NavLink
            to="/coordinator/novedades"
            className={({ isActive }) =>
              `flex items-center rounded-xl px-2.5 py-2 space-x-2 transition-all ${
                isActive
                  ? 'bg-villa-blue-light text-white font-bold shadow-xs'
                  : 'text-villa-dark hover:bg-slate-100 hover:text-villa-blue-dark font-medium'
              }`
            }
          >
            <Bell className="shrink-0 w-4 h-4" />
            <span className="text-xs tracking-tight truncate">Novedades</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-auto px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* Panel de Salud: Micro-Métricas en el Sidebar */}
        <div className="grid grid-cols-1 gap-2 p-3 border-t border-gray-200 w-full shrink-0">
          {/* Total: Fondo neutro (bg-gray-100 text-gray-700) */}
          <div className="flex justify-between items-center rounded-md px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 select-none">
            <span>Total:</span>
            <span className="font-bold font-mono text-xs text-gray-800">
              {kpiStats.isLoading ? '-' : kpiStats.total}
            </span>
          </div>

          {/* Sin Cobertura: Nivel crítico (bg-red-50 border border-red-200 text-red-700, número en negrita grande) */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'uncovered' ? 'all' : 'uncovered')}
            className={`flex justify-between items-center rounded-md px-3 py-2 text-xs font-medium bg-red-50 border border-red-200 text-red-700 transition cursor-pointer select-none text-left ${
              statusFilter === 'uncovered' ? 'ring-2 ring-red-400 bg-red-100/70' : 'hover:bg-red-100/50'
            }`}
            title="Filtrar bloques sin cobertura"
          >
            <span>Sin Cobertura:</span>
            <span className="font-bold font-mono text-sm text-red-700">
              {kpiStats.isLoading ? '-' : kpiStats.uncovered}
            </span>
          </button>

          {/* Cubiertos: Nivel óptimo (bg-green-50 border border-green-200 text-green-700) */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'covered' ? 'all' : 'covered')}
            className={`flex justify-between items-center rounded-md px-3 py-2 text-xs font-medium bg-green-50 border border-green-200 text-green-700 transition cursor-pointer select-none text-left ${
              statusFilter === 'covered' ? 'ring-2 ring-green-400 bg-green-100/70' : 'hover:bg-green-100/50'
            }`}
            title="Filtrar bloques cubiertos"
          >
            <span>Cubiertos:</span>
            <span className="font-bold font-mono text-xs text-green-700">
              {kpiStats.isLoading ? '-' : kpiStats.covered}
            </span>
          </button>
        </div>

        {/* Zona de Peligro: Relocalización Periférica de Comandos Destructivos */}
        <div className="mt-auto border-t border-slate-100 p-3 w-full shrink-0 space-y-2">
          {/* PWA Install Button oculto temporalmente para pruebas */}
          {/* {!isAppInstalled && (
            <button
              type="button"
              onClick={handleInstallPwa}
              className="w-full flex items-center justify-start gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors py-1.5 px-3 rounded-md text-xs font-semibold cursor-pointer shadow-2xs group"
              title="Instalar como aplicación de escritorio nativa (sin barras de navegador, 100% offline)"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Instalar en PC</span>
            </button>
          )} */}

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="group w-full flex items-center justify-start gap-2 text-slate-500 bg-transparent hover:bg-red-50 hover:text-red-700 transition-colors py-1.5 px-3 rounded-md text-xs font-normal whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
            title="Restaurar toda la matriz y horarios a la configuración de fábrica original (borra modificaciones locales)"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 transition-colors shrink-0" />
            <span className="truncate">Reset de fábrica</span>
          </button>
        </div>

        {/* Anclaje Inferior del Copyright */}
        <div className="p-4 text-[10px] text-gray-400 text-center border-t border-gray-200 shrink-0">
          <div className="mb-1 flex items-center justify-center">
            <div
              className="flex items-center space-x-1 text-emerald-700"
              title={connectionStatus.message}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[8px] truncate max-w-[140px]">
                Sheets Webhook Bridge
              </span>
            </div>
          </div>
          <p className="leading-tight">
            © 2026 Desarrollado y diseñado por Reakta Group
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified Top Navbar / Header: Sincronización Geométrica Eje Y (h-[84px]) */}
        <header className="h-[84px] border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          {/* Left: Interactive Institutional Logo with Dynamic Upload & Cache Busting */}
          <div className="flex items-center gap-3">
            <div
              className="relative group cursor-pointer flex items-center"
              onClick={() => fileInputRef.current?.click()}
              title="Haga clic para actualizar el logo institucional"
            >
              <img
                src={logoUrl}
                alt="Logo Institucional"
                className="h-[76px] w-auto object-contain shrink-0 transition-opacity group-hover:opacity-85"
                onError={(e) => {
                  const fallback = localStorage.getItem('ievf_logo_data_url') || '/logo.png';
                  if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                    (e.currentTarget as HTMLImageElement).src = fallback;
                  }
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 select-none">
                {isUploadingLogo ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 mb-0.5 text-white" />
                    <span className="leading-tight">Cambiar</span>
                  </>
                )}
              </div>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              className="hidden"
              onChange={handleLogoFileChange}
            />

            {/* Botón explícito 'Actualizar Logo' */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
              className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
              title="Subir nuevo logo institucional"
            >
              {isUploadingLogo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-villa-blue-light" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5 text-villa-blue-light" />
              )}
              <span>Actualizar Logo</span>
            </button>
          </div>

          {/* Right: Filtro de Grados y Botón de Recargar */}
          <div className="flex items-center gap-3">
            {/* 1. Filtro de Grados (Jornadas / Niveles) */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs h-10 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedShift('morning')}
                className={`h-full flex items-center space-x-1.5 px-3 rounded-lg text-xs transition-all ${
                  selectedShift === 'morning'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-medium'
                }`}
                title="Jornada Bachillerato"
              >
                <Sun
                  className={`w-3.5 h-3.5 ${
                    selectedShift === 'morning' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span>Bachillerato</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('afternoon')}
                className={`h-full flex items-center space-x-1.5 px-3 rounded-lg text-xs transition-all ${
                  selectedShift === 'afternoon'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-medium'
                }`}
                title="Jornada Primaria y Transición 2"
              >
                <Moon
                  className={`w-3.5 h-3.5 ${
                    selectedShift === 'afternoon' ? 'text-sky-300' : 'text-slate-500'
                  }`}
                />
                <span>Primaria y T2</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('transicion-1')}
                className={`h-full flex items-center space-x-1.5 px-3 rounded-lg text-xs transition-all ${
                  selectedShift === 'transicion-1'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-medium'
                }`}
                title="Vista / Matriz Exclusiva de Transición 1 (Aislada)"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${
                    selectedShift === 'transicion-1' ? 'text-purple-400' : 'text-slate-500'
                  }`}
                />
                <span>Transición 1</span>
              </button>
            </div>

            {/* TrashDropzone Reactivo: Papelera / Registro de Novedades con Expansión Hitbox Bloqueable */}
            <TrashDropzone isMatrixActive={isMatrixActive} />

            {/* Botón visual de 'Deshacer' (Undo Action con flecha curva) */}
            <button
              type="button"
              onClick={triggerUndo}
              disabled={!isMatrixActive || !canUndo}
              className="w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center transition shadow-2xs hover:shadow-xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400/20 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:hover:bg-gray-100 disabled:text-gray-400 transition-all"
              title={
                !isMatrixActive
                  ? 'Desactivado fuera del lienzo de Parrilla académica'
                  : canUndo
                  ? 'Deshacer último cambio (Ctrl + Z)'
                  : 'Sin acciones previas para deshacer'
              }
              aria-label="Deshacer último cambio"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* 2. Acción de Sistema: Botón de 'Recargar' (Sincronización segura sin pérdida de datos) */}
            <button
              type="button"
              onClick={triggerReload}
              disabled={!isMatrixActive}
              className="w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition shadow-2xs hover:shadow-xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400/20 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:hover:bg-gray-100 disabled:text-gray-400 transition-all"
              title={
                !isMatrixActive
                  ? 'Desactivado fuera del lienzo de Parrilla académica'
                  : 'Recargar y sincronizar horario (no borra los cambios locales)'
              }
              aria-label="Recargar y sincronizar horario"
            >
              <RotateCcw className="w-4 h-4 text-slate-600 hover:text-slate-900" />
            </button>

            {/* 3. Acción de Publicación: Botón 'Publicar parrilla' (Google Sheets Serverless Bridge) */}
            <button
              type="button"
              onClick={handlePublishSchedule}
              disabled={isPublishingMatrix}
              className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-2xs hover:shadow-xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title="Publicar y volcar parrilla de horarios en Google Sheets para el sitio web institucional"
            >
              {isPublishingMatrix ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 text-white" />
              )}
              <span className="hidden sm:inline">
                {isPublishingMatrix ? 'Publicando...' : 'Publicar parrilla'}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-slate-50 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Modal de Registrar / Editar Docente */}
      <TeacherFormModal
        isOpen={isTeacherModalOpen}
        onClose={() => {
          setIsTeacherModalOpen(false);
          setSelectedTeacherForEdit(null);
        }}
        teacher={selectedTeacherForEdit}
        onSelectTeacher={(t) => setSelectedTeacherForEdit(t)}
        onSuccess={() => {
          setIsTeacherModalOpen(false);
          setSelectedTeacherForEdit(null);
        }}
      />


      {/* Toast de Alerta Visual para Carga de Logo (Manejo de Errores Estricto) */}
      {uploadError && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-200 max-w-md select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-white" />
          <span className="text-xs font-semibold">{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-auto text-white/80 hover:text-white p-1 cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-200 max-w-md select-none">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          <span className="text-xs font-semibold">{uploadSuccess}</span>
          <button
            type="button"
            onClick={() => setUploadSuccess(null)}
            className="ml-auto text-white/80 hover:text-white p-1 cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Validación de Intención Positiva (Hard-Confirm Modal) para Factory Reset */}
      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleExecuteFactoryReset}
      />

      {/* Modal de Publicación en Google Sheets (Serverless Bridge) */}
      <PublishScheduleModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        timeBlocks={getCurrentTimeBlocks()}
        teachers={teachers}
      />
    </div>
  );
};
