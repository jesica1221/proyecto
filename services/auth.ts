import { User } from '@/types/parking';
import DBService from './database';

export type AuthResponse = {
  success: boolean;
  user?: User;
  token?: string;
  message: string;
};

export const AuthService = {
  login: (cedula: string, nombre: string, placa: string, tipoVehiculo: string): AuthResponse => {
    try {
      const usuario = DBService.loginUser(cedula, nombre, placa, tipoVehiculo);

      if (!usuario) {
        return {
          success: false,
          message: 'Credenciales inválidas. Verifica cédula, nombre, placa y tipo de vehículo.',
        };
      }

      const token = `token-${usuario.id}-${Date.now()}`;

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

      const token = `token-${usuario.id}-${Date.now()}`;

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

  validateToken: (token: string): boolean => {
    return token.startsWith('token-');
  },
};

export default AuthService;
