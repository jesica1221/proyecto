import { Reservation } from '@/types/parking';

export const QRService = {
  generateQRCode: (zonaId: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BARRERA-${zonaId}-${timestamp}-${random}`;
  },

  validateQRCode: (qrCode: string, zonaId: string): boolean => {
    return qrCode.includes(`BARRERA-${zonaId}`);
  },

  parseQRData: (qrCode: string): { zonaId: string; timestamp: string } | null => {
    const parts = qrCode.split('-');
    if (parts.length >= 3 && parts[0] === 'BARRERA') {
      return {
        zonaId: parts[1],
        timestamp: parts[2],
      };
    }
    return null;
  },

  generateQRContent: (reservacion: Reservation): string => {
    return JSON.stringify({
      qr: reservacion.qrCode,
      zona: reservacion.zonaId,
      placa: reservacion.placa,
      cedula: reservacion.cedula,
      timestamp: new Date().toISOString(),
    });
  },
};

export default QRService;
