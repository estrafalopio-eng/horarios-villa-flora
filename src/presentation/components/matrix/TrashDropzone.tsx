import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { TimeBlockEntity } from '../../../domain/entities/time-block.entity';
import { getGlobalActiveDraggedBlock } from './MatrixCell';
import { useCoordinatorMatrix } from '../../context/CoordinatorMatrixContext';

interface TrashDropzoneProps {
  className?: string;
  isMatrixActive?: boolean;
}

/**
 * Componente 'Eliminar' de Doble Propósito (Drag & Click):
 * - Visible y estático en la barra superior.
 * - Vía Clic: Si selectedCells.length > 0, dispare la mutación en lote (triggerBatchDelete).
 * - Vía Dropzone: onDragOver y onDrop. Se ilumina agresivamente al pasar materias por encima y ejecuta el borrado/novedad al soltarlas.
 * - Secuestro de Payload: Si el payload contiene { isBatch: true, items: selectedCells }, procesa el lote completo.
 * - Resolución de Memoria: Purga selectedCells devolviéndolo a vacío ([]).
 * - Route-Aware Context: Si isMatrixActive es false, bloquea hitbox y destruye drag listeners.
 */
export const TrashDropzone: React.FC<TrashDropzoneProps> = ({
  className = '',
  isMatrixActive: propIsMatrixActive,
}) => {
  const {
    selectedCells,
    clearSelectedCells,
    triggerBatchDelete,
    requestNoveltyModal,
    isMatrixActive: contextIsMatrixActive,
  } = useCoordinatorMatrix();

  const isMatrixActive = propIsMatrixActive !== undefined
    ? propIsMatrixActive
    : contextIsMatrixActive !== undefined
    ? contextIsMatrixActive
    : true;

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOver, setIsOver] = useState<boolean>(false);

  // Escucha reactiva del estado global de arrastre (bloqueado fuera de la matriz)
  useEffect(() => {
    if (!isMatrixActive) {
      setIsDragging(false);
      setIsOver(false);
      return;
    }

    const handleDragStart = () => {
      setIsDragging(true);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      setIsOver(false);
    };

    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    window.addEventListener('matrix_drag_start', handleDragStart);
    window.addEventListener('matrix_drag_end', handleDragEnd);

    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('matrix_drag_start', handleDragStart);
      window.removeEventListener('matrix_drag_end', handleDragEnd);
    };
  }, [isMatrixActive]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) {
      setIsOver(true);
    }
  }, [isOver]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
    }
  }, []);

  const handleTrashDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOver(false);
      setIsDragging(false);

      let parsedData: any = null;
      try {
        const raw = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/json');
        if (raw) {
          parsedData = JSON.parse(raw);
        }
      } catch (err) {
        console.warn('[TrashDropzone] Fallback drop parse error:', err);
      }

      // 1. Caso Lote (Batch Dragging): el payload tiene { isBatch: true, items: [...] } o hay celdas seleccionadas
      if ((parsedData?.isBatch && Array.isArray(parsedData?.items)) || selectedCells.length > 0) {
        const batchItems = parsedData?.items || selectedCells;
        window.dispatchEvent(
          new CustomEvent('trigger_batch_delete', { detail: { items: batchItems } })
        );
        if (triggerBatchDelete) {
          triggerBatchDelete();
        }
        clearSelectedCells();
        return;
      }

      // 2. Caso Individual:
      let block: TimeBlockEntity | null = null;
      if (parsedData?.item) {
        block = parsedData.item;
      } else if (parsedData && parsedData.id) {
        block = parsedData;
      }

      if (!block) {
        block = getGlobalActiveDraggedBlock();
      }

      if (block) {
        if (requestNoveltyModal) {
          requestNoveltyModal(block);
        }
        window.dispatchEvent(
          new CustomEvent('trigger_novelty_modal', { detail: { block } })
        );
      }
      clearSelectedCells();
    },
    [selectedCells, triggerBatchDelete, clearSelectedCells, requestNoveltyModal]
  );

  const handleClick = useCallback(() => {
    if (selectedCells.length > 0) {
      if (triggerBatchDelete) {
        triggerBatchDelete();
      }
    }
  }, [selectedCells.length, triggerBatchDelete]);

  const hasSelection = selectedCells.length > 0;

  return (
    <div
      onDragOver={isMatrixActive ? handleDragOver : undefined}
      onDragEnter={isMatrixActive ? handleDragEnter : undefined}
      onDragLeave={isMatrixActive ? handleDragLeave : undefined}
      onDrop={isMatrixActive ? handleTrashDrop : undefined}
      className={`transition-all duration-200 select-none ${className} ${
        !isMatrixActive ? 'pointer-events-none' : ''
      }`}
    >
      {!isMatrixActive ? (
        /* Estado de reposo gris forzado y deshabilitado fuera de la matriz */
        <button
          type="button"
          disabled={true}
          className="h-10 px-3.5 rounded-xl border flex items-center gap-2 transition-all shadow-none text-xs font-bold select-none cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200 opacity-40 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:hover:bg-gray-100 disabled:text-gray-400"
          title="Papelera desactivada fuera del lienzo de horarios (Inicio)"
          aria-label="Papelera desactivada"
        >
          <Trash2 className="w-4 h-4 shrink-0 text-gray-400" />
          <span className="tracking-tight uppercase">Eliminar</span>
        </button>
      ) : isDragging ? (
        /* Vía Dropzone: Iluminación agresiva al pasar materias por encima */
        <div
          className={`h-10 cursor-pointer transition-all duration-200 rounded-xl ${
            isOver
              ? 'bg-red-700 text-white border-2 border-red-300 ring-4 ring-red-400/50 scale-105 shadow-xl font-extrabold flex gap-2 px-5 py-2 justify-center items-center animate-pulse'
              : 'bg-red-500 text-white border border-red-600 px-4 py-2 font-bold flex gap-2 justify-center items-center shadow-md'
          }`}
          title="Soltar aquí para eliminar o registrar novedad"
        >
          <Trash2 className={`w-4 h-4 shrink-0 ${isOver ? 'animate-bounce text-white' : 'text-white'}`} />
          <span className="text-xs truncate uppercase tracking-tight font-extrabold">
            {isOver
              ? '¡Soltar para Eliminar!'
              : hasSelection
              ? `Soltar Lote (${selectedCells.length})`
              : 'Soltar para Novedad'}
          </span>
        </div>
      ) : (
        /* Vía Clic: Botón rojo 'Eliminar' visible y estático en la barra superior */
        <button
          type="button"
          onClick={handleClick}
          className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 transition-all shadow-2xs text-xs font-bold select-none cursor-pointer ${
            hasSelection
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-md active:scale-95 animate-in fade-in'
              : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300'
          }`}
          title={
            hasSelection
              ? `Clic para eliminar o registrar novedad a las ${selectedCells.length} casillas seleccionadas`
              : 'Zona de eliminación (Arrastra materias aquí o marca casillas para borrar en lote)'
          }
          aria-label="Botón Eliminar"
        >
          <Trash2 className={`w-4 h-4 shrink-0 ${hasSelection ? 'text-white' : 'text-red-600'}`} />
          <span className="tracking-tight uppercase">
            {hasSelection ? `Eliminar (${selectedCells.length})` : 'Eliminar'}
          </span>
        </button>
      )}
    </div>
  );
};
