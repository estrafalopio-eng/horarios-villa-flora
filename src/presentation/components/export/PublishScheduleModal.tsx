import React, { useState, useEffect } from 'react';
import {
  Share2,
  X,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TimeBlockEntity } from '../../../domain/entities/time-block.entity';
import { UserEntity } from '../../../domain/entities/user.entity';
import {
  buildScheduleExportPayload,
  transmitScheduleToGoogleSheets,
  testWebhook,
  ScheduleExportPayload,
} from '../../../domain/services/matrix-export-engine.service';
import { serializeScheduleToMatrix } from '../../../domain/services/schedule-serializer.service';

interface PublishScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeBlocks: TimeBlockEntity[];
  teachers: UserEntity[];
}

export const PublishScheduleModal: React.FC<PublishScheduleModalProps> = ({
  isOpen,
  onClose,
  timeBlocks,
  teachers,
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('ievf_google_sheets_webhook_url') || '';
  });

  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishStatus, setPublishStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    timestamp?: string;
  }>({ type: null, message: '' });

  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(() => {
    return localStorage.getItem('ievf_last_published_at') || null;
  });

  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedIframe, setCopiedIframe] = useState<boolean>(false);

  // Guardar URL del Webhook automáticamente
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setWebhookUrl(val);
    localStorage.setItem('ievf_google_sheets_webhook_url', val);
    setPublishStatus({ type: null, message: '' });
  };

  // Consolidar payload para previsualización
  const [payloadPreview, setPayloadPreview] = useState<ScheduleExportPayload | null>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const payload = buildScheduleExportPayload(timeBlocks, teachers);
        setPayloadPreview(payload);
      } catch (err) {
        console.error('Error calculando payload de exportación:', err);
      }
    }
  }, [isOpen, timeBlocks, teachers]);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!webhookUrl) {
      setPublishStatus({
        type: 'error',
        message: 'Por favor ingresa la URL del Webhook de tu Google Apps Script desplegado.',
      });
      return;
    }

    setIsPublishing(true);
    setPublishStatus({ type: null, message: '' });

    try {
      console.log("Estado DND:", timeBlocks);
      const matrixData = { matrix: serializeScheduleToMatrix(timeBlocks, "601") };
      await testWebhook(matrixData);

      const timestampStr = new Date().toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });

      localStorage.setItem('ievf_last_published_at', timestampStr);
      setLastPublishedAt(timestampStr);

      setPublishStatus({
        type: 'success',
        message: 'Paquete enviado por túnel de formulario. Revisa Google Sheets.',
        timestamp: timestampStr,
      });
    } catch (err: any) {
      console.error('[PublishScheduleModal Error]:', err);
      setPublishStatus({
        type: 'error',
        message: err.message || 'Fallo de red al intentar sincronizar con Sheets.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyIframeSnippet = () => {
    const iframeSnippet = `<!-- Horario Institucional I.E. Villa Flora (Google Sheets Bridge) -->
<iframe 
  src="https://docs.google.com/spreadsheets/d/e/TU_ID_DE_PUBLICACION/pubhtml?widget=true&headers=false"
  width="100%" 
  height="850" 
  frameborder="0" 
  style="border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
  allowfullscreen>
</iframe>`;

    navigator.clipboard.writeText(iframeSnippet);
    setCopiedIframe(true);
    setTimeout(() => setCopiedIframe(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Share2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Publicar parrilla en Google Sheets
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Serverless Bridge
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Sincronización instantánea hacia Google Drive para publicación web y PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Tarjeta de Resumen de Carga a Publicar */}
          {payloadPreview && (
            <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Periodo Oficial
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {payloadPreview.metadata.academicPeriod}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {payloadPreview.metadata.academicWeekText}
                </span>
              </div>
              <div className="flex flex-col border-l border-slate-200 pl-3">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Docentes Activos
                </span>
                <span className="text-sm font-bold text-blue-700">
                  {payloadPreview.metadata.totalActiveTeachers} profesores
                </span>
                <span className="text-[10px] text-slate-500">Con control de 22h</span>
              </div>
              <div className="flex flex-col border-l border-slate-200 pl-3">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Bloques Asignados
                </span>
                <span className="text-sm font-bold text-emerald-700">
                  {payloadPreview.metadata.totalScheduledBlocks} celdas
                </span>
                <span className="text-[10px] text-slate-500">Todas las jornadas</span>
              </div>
            </div>
          )}

          {/* Configuración del Webhook URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                URL del Webhook (Google Apps Script Web App)
              </label>
              {webhookUrl ? (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Configurado
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-semibold px-2 py-0.5 rounded-full">
                  Pendiente por configurar
                </span>
              )}
            </div>
            <input
              type="url"
              value={webhookUrl}
              onChange={handleUrlChange}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-mono transition text-slate-800 outline-none"
            />
            <p className="text-[11px] text-slate-500">
              Pega aquí el enlace de tu Web App desplegada en Google Apps Script con acceso público.
            </p>
          </div>

          {/* Estado de Publicación (Alertas) */}
          {publishStatus.type === 'success' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-xs">{publishStatus.message}</p>
                <p className="text-[11px] text-emerald-700">
                  Tu hoja de cálculo ya contiene la parrilla actualizada con pestañas para Bachillerato, Primaria, Transición y Directorio Docente.
                </p>
              </div>
            </div>
          )}

          {publishStatus.type === 'error' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-900 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-xs">Error de Sincronización</p>
                <p className="text-[11px] text-red-700">{publishStatus.message}</p>
              </div>
            </div>
          )}

          {lastPublishedAt && (
            <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Última sincronización exitosa:</span>
              <span className="font-semibold text-slate-700 font-mono">{lastPublishedAt}</span>
            </div>
          )}

          {/* Acordeón: Instrucciones de Instalación y Código para el Webmaster */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-slate-800 hover:bg-slate-100/70 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                ¿Cómo conectar Google Sheets y obtener el Iframe para el Webmaster?
              </span>
              {showInstructions ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showInstructions && (
              <div className="p-4 pt-2 border-t border-slate-200 space-y-4 text-xs text-slate-600">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Abre <span className="font-semibold text-slate-800">Google Sheets</span> y crea un libro en blanco titulado{' '}
                    <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">Horarios Villa Flora 2026</span>.
                  </li>
                  <li>
                    Ve a <span className="font-semibold text-slate-800">Extensiones &gt; Apps Script</span>.
                  </li>
                  <li>
                    Copia y pega el código del archivo{' '}
                    <span className="font-mono bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                      google-apps-script/Code.gs
                    </span>{' '}
                    disponible en el proyecto.
                  </li>
                  <li>
                    Haz clic en <span className="font-semibold text-slate-800">Implementar &gt; Nueva implementación</span>,
                    selecciona tipo <span className="font-semibold">Aplicación web</span>, ejecuta como <span className="font-semibold">Yo</span> y acceso{' '}
                    <span className="font-semibold text-emerald-700">Cualquier persona</span>.
                  </li>
                  <li>Pega la URL resultante en el campo de arriba y haz clic en "Publicar ahora".</li>
                </ol>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      Código Iframe para el Webmaster del Colegio
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyIframeSnippet}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                    >
                      {copiedIframe ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Iframe
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10px] overflow-x-auto font-mono">
{`<iframe 
  src="https://docs.google.com/spreadsheets/d/e/TU_ID_PUBLICO/pubhtml?widget=true&headers=false"
  width="100%" 
  height="850" 
  frameborder="0">
</iframe>`}
                  </pre>
                  <p className="text-[10px] text-slate-500">
                    En Google Sheets ve a <span className="font-semibold">Archivo &gt; Compartir &gt; Publicar en la web</span> y reemplaza <code className="font-mono">TU_ID_PUBLICO</code> con el enlace generado.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || !webhookUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transmitiendo a Google Sheets...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Publicar ahora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
