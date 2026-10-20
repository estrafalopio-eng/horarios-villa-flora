import { useState, useEffect, useCallback, useMemo } from 'react';
import { IncidenceEntity } from '../../domain/entities/incidence.entity';
import { incidenceRepository } from '../../infrastructure/repositories/firestore-incidence.repository';

export const useIncidences = () => {
  const [incidences, setIncidences] = useState<IncidenceEntity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getTodayString = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayStr = useMemo(() => getTodayString(), [getTodayString]);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = incidenceRepository.subscribe((items) => {
      setIncidences(items);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const activeIncidences = useMemo(() => {
    return incidences.filter((inc) => inc.expirationDate >= todayStr);
  }, [incidences, todayStr]);

  const historicalIncidences = useMemo(() => {
    return incidences.filter((inc) => inc.expirationDate < todayStr);
  }, [incidences, todayStr]);

  const createIncidence = useCallback(
    async (data: Omit<IncidenceEntity, 'id'>) => {
      return await incidenceRepository.create(data);
    },
    []
  );

  const deleteIncidence = useCallback(
    async (id: string) => {
      await incidenceRepository.delete(id);
    },
    []
  );

  return {
    incidences,
    activeIncidences,
    historicalIncidences,
    isLoading,
    todayStr,
    createIncidence,
    deleteIncidence,
  };
};
