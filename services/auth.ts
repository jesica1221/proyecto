import { User } from '@/types/parking';
import DBService from './database';

export type AuthPayload = {
  userId: string;
  rol: string;
  iat: number;
  exp: number;
};

export type AuthResponse = {
  success: boolean;
  user?: User;
  token?: string;
  message: string;
};

const formatTokenPayload = (payload: AuthPayload) => encodeURIComponent(JSON.stringify(payload));
const parseTokenPayload = (token: string): AuthPayload | null => {
  try {
    const parts = token.split('token.');
    if (parts.length !== 2) return null;
    return JSON.parse(decodeURIComponent(parts[1]));
  } catch {
    return null;
  }
};

export const AuthService = {
  createToken: (user: User): string => {
    const payload: AuthPayload = {
      userId: user.id,
      rol: user.rol,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24h de vigencia
    };

    return `token.${formatTokenPayload(payload)}`;
  },

  parseToken: (token: string): AuthPayload | null => {
    return parseTokenPayload(token);
  },

  validateToken: (token: string): boolean => {
    const payload = parseTokenPayload(token);
    return !!payload && Date.now() < payload.exp;
  },

  getAuthHeaders: (token: string | null): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  login: (cedula: string, nombre: string, placa: string, tipoVehiculo: string): AuthResponse => {
    try {
      const usuario = DBService.loginUser(cedula, nombre, placa, tipoVehiculo);

      if (!usuario) {
        return {
          success: false,
          message: 'Credenciales inválidas. Verifica cédula, nombre, placa y tipo de vehículo.',
        };
      }

      const token = AuthService.createToken(usuario);

      return {
        success: true,
        user: usuario,
        token,
        message: 'Login exitoso',
      };
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        message: 'Error en el servidor',
      };
    }
  },

  register: (cedula: string, nombre: string, placa: string, tipoVehiculo: string, rol: string): AuthResponse => {
    try {
      const usuario = DBService.registerUser(cedula, nombre, placa, tipoVehiculo, rol);

      if (!usuario) {
        return {
          success: false,
          message: 'Ya existe un usuario con esa cédula o placa.',
        };
      }

      const token = AuthService.createToken(usuario);

      return {
        success: true,
        user: usuario,
        token,
        message: 'Registro exitoso',
      };
    } catch (error) {
      console.error('Error en register:', error);
      return {
        success: false,
        message: 'Error en el servidor',
      };
    }
  },

  logout: () => {
    return { success: true, message: 'Logout exitoso' };
  },
};

export default AuthService;
