import React, { createContext, useContext, useState } from 'react';
import { ParkingZone } from '@/types/parking';
import DBService from '@/services/database';

interface ParkingContextType {
  zonas: ParkingZone[];
  zonaActual: ParkingZone | null;
  cargarZonas: (rol: string, tipo?: string) => void;
  seleccionarZona: (zonaId: string | null) => void;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

export const ParkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [zonas, setZonas] = useState<ParkingZone[]>([]);
  const [zonaActual, setZonaActual] = useState<ParkingZone | null>(null);

  const cargarZonas = (rol: string, tipo?: string) => {
    let zonasData: ParkingZone[];
    if (tipo) {
      zonasData = DBService.getZonasPorTipo(tipo, rol);
    } else {
      zonasData = DBService.getZonasPorRol(rol);
    }
    setZonas(zonasData.filter((z) => z.disponible > 0));
  };

  const seleccionarZona = (zonaId: string | null) => {
    if (!zonaId) {
      setZonaActual(null);
      return;
    }
    const zona = DBService.getZonaById(zonaId);
    setZonaActual(zona);
  };

  return (
    <ParkingContext.Provider
      value={{
        zonas,
        zonaActual,
        cargarZonas,
        seleccionarZona,
      }}
    >
      {children}
    </ParkingContext.Provider>
  );
};

export const useParking = () => {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParking debe usarse dentro de ParkingProvider');
  }
  return context;
};
