import { useEffect } from 'react';

/**
 * Arquitectura de Bloqueo de Scroll y Prevención de Layout Shift
 * 
 * Calcula matemáticamente el ancho exacto de la barra de desplazamiento:
 * const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
 * Inyecta document.body.style.overflow = 'hidden' y document.body.style.paddingRight = `${scrollbarWidth}px`.
 * Al desmontar o cerrar, revierte ambos valores a su estado natural.
 */
export function useScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);
}
