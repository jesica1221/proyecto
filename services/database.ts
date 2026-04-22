import { User, ParkingZone, Reservation, ParkingSpace } from '@/types/parking';

const generateSpaces = (cantidad: number): ParkingSpace[] => {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `space-${i + 1}`,
    numero: `${i + 1}`,
    disponible: Math.random() > 0.3,
  }));
};

// Mock Database
const database = {
  usuarios: [
    {
      id: 'user-1',
      cedula: '1023456789',
      nombre: 'Juan Estudiante',
      placa: 'ABC-1234',
      tipoVehiculo: 'car' as const,
      rol: 'student' as const,
    },
    {
      id: 'user-2',
      cedula: '1012345678',
      nombre: 'Maria Admin',
      placa: 'ADM-5678',
      tipoVehiculo: 'car' as const,
      rol: 'admin' as const,
    },
    {
      id: 'user-3',
      cedula: '1087654321',
      nombre: 'Carlos Seguridad',
      placa: 'SEG-9999',
      tipoVehiculo: 'motorcycle' as const,
      rol: 'security' as const,
    },
  ] as User[],

  zonas: [
    {
      id: 'zone-admin-1',
      nombre: 'Administrativos/Docentes - Zona 1',
      capacidad: 25,
      disponible: 18,
      tipo: 'car' as const,
      accesible: ['admin'] as const,
      espacios: generateSpaces(25),
    },
    {
      id: 'zone-admin-2',
      nombre: 'Administrativos/Docentes - Zona 2',
      capacidad: 20,
      disponible: 14,
      tipo: 'car' as const,
      accesible: ['admin'] as const,
      espacios: generateSpaces(20),
    },
    {
      id: 'zone-student-car',
      nombre: 'Estudiantes - Carros',
      capacidad: 30,
      disponible: 22,
      tipo: 'car' as const,
      accesible: ['student'] as const,
      espacios: generateSpaces(30),
    },
    {
      id: 'zone-student-moto-1',
      nombre: 'Estudiantes - Motos 1',
      capacidad: 50,
      disponible: 45,
      tipo: 'motorcycle' as const,
      accesible: ['student'] as const,
      espacios: generateSpaces(50),
    },
    {
      id: 'zone-student-moto-2',
      nombre: 'Estudiantes - Motos 2',
      capacidad: 50,
      disponible: 48,
      tipo: 'motorcycle' as const,
      accesible: ['student'] as const,
      espacios: generateSpaces(50),
    },
  ] as ParkingZone[],

  reservaciones: [] as Reservation[],
};

export const DBService = {
  loginUser: (cedula: string, nombre: string, placa: string, tipoVehiculo: string): User | null => {
    const usuario = database.usuarios.find(
      (u) => u.cedula === cedula && u.nombre.toLowerCase() === nombre.toLowerCase() && u.placa === placa && u.tipoVehiculo === tipoVehiculo
    );
    return usuario || null;
  },

  registerUser: (cedula: string, nombre: string, placa: string, tipoVehiculo: string, rol: string): User | null => {
    const existing = database.usuarios.find(
      (u) => u.cedula === cedula || u.placa === placa
    );
    if (existing) {
      return null;
    }

    const nuevoUsuario: User = {
      id: `user-${Date.now()}`,
      cedula,
      nombre,
      placa,
      tipoVehiculo: tipoVehiculo as any,
      rol: rol as any,
    };

    database.usuarios.push(nuevoUsuario);
    return nuevoUsuario;
  },

  getZonasPorRol: (rol: string): ParkingZone[] => {
    return database.zonas.filter((zona) => zona.accesible.includes(rol as any) && zona.disponible > 0);
  },

  getZonasPorTipo: (tipo: string, rol: string): ParkingZone[] => {
    return database.zonas.filter((zona) => zona.tipo === tipo && zona.accesible.includes(rol as any) && zona.disponible > 0);
  },

  getZonaById: (id: string): ParkingZone | null => {
    return database.zonas.find((zona) => zona.id === id) || null;
  },

  getEspaciosDisponibles: (zonaId: string): ParkingSpace[] => {
    const zona = database.zonas.find((z) => z.id === zonaId);
    return zona ? zona.espacios.filter((e) => e.disponible) : [];
  },

  crearReservacion: (usuario: User, zonaId: string, espacioId: string, qrCode: string): Reservation => {
    const ahora = new Date();
    const vencimiento = new Date(ahora.getTime() + 15 * 60000);

    const reserva: Reservation = {
      id: `res-${Date.now()}`,
      usuarioId: usuario.id,
      cedula: usuario.cedula,
      zonaId,
      espacioId,
      horaReserva: ahora.toISOString(),
      horaVencimiento: vencimiento.toISOString(),
      estado: 'activa',
      qrCode,
      placa: usuario.placa,
      tipoVehiculo: usuario.tipoVehiculo,
    };

    database.reservaciones.push(reserva);

    const zona = database.zonas.find((z) => z.id === zonaId);
    if (zona) {
      const espacio = zona.espacios.find((e) => e.id === espacioId);
      if (espacio) {
        espacio.disponible = false;
        espacio.ocupadoPor = usuario.cedula;
        zona.disponible = zona.espacios.filter((e) => e.disponible).length;
      }
    }

    return reserva;
  },

  getDatabase: () => database,
};

export default DBService;
