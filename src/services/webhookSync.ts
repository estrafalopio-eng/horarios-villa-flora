/**
 * Servicio de Sincronización Webhook: Google Sheets Serverless Bridge (TypeScript)
 * 
 * Implementa el túnel de formulario clásico con URLSearchParams y mode: 'no-cors'
 * para perforar el bloqueo de Google Sheets sin preflight CORS.
 */

import { serializeScheduleToMatrix } from '../utils/serializer';

export const testWebhook = async (matrixData: any): Promise<void> => {
  try {
    const formData = new URLSearchParams();
    formData.append('data', JSON.stringify(matrixData));

    await fetch(import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK as string, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    alert('Paquete enviado por túnel de formulario. Revisa Google Sheets.');
  } catch (error) {
    console.error("Error en sincronización:", error);
    alert('Fallo de red al intentar sincronizar con Sheets.');
  }
};

export const publishSchedule = async (currentSchedule?: any, targetGroup: string = "601"): Promise<void> => {
  const matrix = serializeScheduleToMatrix(currentSchedule, targetGroup);
  const matrixData = { matrix };
  await testWebhook(matrixData);
};

export { serializeScheduleToMatrix };

export default {
  testWebhook,
  publishSchedule,
  serializeScheduleToMatrix,
};
