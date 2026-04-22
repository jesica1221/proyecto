// ===== TIPOS PRINCIPALES =====
export type UserRole = 'student' | 'admin' | 'security' | 'seguridad';
export type VehicleType = 'car' | 'motorcycle';

export interface User {
  id: string;
  cedula: string;
  nombre: string;
  placa: string;
  tipoVehiculo: VehicleType;
  rol: UserRole;
}

export interface ParkingZone {
  id: string;
  nombre: string;
  capacidad: number;
  disponible: number;
  tipo: VehicleType;
  accesible: UserRole[];
  espacios: ParkingSpace[];
}

export interface ParkingSpace {
  id: string;
  numero: string;
  disponible: boolean;
  ocupadoPor?: string;
}

export interface Reservation {
  id: string;
  usuarioId: string;
  cedula: string;
  zonaId: string;
  espacioId: string;
  horaReserva: string;
  horaVencimiento: string;
  estado: 'activa' | 'confirmada' | 'expirada' | 'cancelada';
  qrCode: string;
  placa: string;
  tipoVehiculo: VehicleType;
}
