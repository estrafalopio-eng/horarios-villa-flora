import { useState, useEffect, useCallback } from 'react';

export function useMatrixZoom() {
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('matrix_zoom');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 50 && parsed <= 150) {
          return parsed;
        }
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 100;
  });

  useEffect(() => {
    try {
      localStorage.setItem('matrix_zoom', zoomLevel.toString());
    } catch {
      // Ignore storage errors
    }
  }, [zoomLevel]);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(150, prev + 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(50, prev - 5));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  return {
    zoomLevel,
    setZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
