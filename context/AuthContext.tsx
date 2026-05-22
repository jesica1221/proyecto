import AuthService, { AuthResponse } from '@/services/auth';
import { User } from '@/types/parking';
import React, { createContext, useContext, useState } from 'react';

/* =========================
   Tipos e Interfaces
========================= */
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (
    cedula: string,
    nombre: string,
    placa: string,
    tipoVehiculo: string
  ) => Promise<AuthResponse>;
  register: (
    cedula: string,
    nombre: string,
    placa: string,
    tipoVehiculo: string,
    rol: string
  ) => Promise<AuthResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

/* =========================
   Contexto
========================= */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* =========================
   Provider
========================= */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /* ===== Estado ===== */
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ===== Login ===== */
  const login = async (
    cedula: string,
    nombre: string,
    placa: string,
    tipoVehiculo: string
  ): Promise<AuthResponse> => {
    setIsLoading(true);

    try {
      const response = await AuthService.login(
        cedula,
        nombre,
        placa,
        tipoVehiculo
      );

      if (response.success && response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message:
          (error as Error).message || 'Error inesperado en login',
      } as AuthResponse;
    } finally {
      setIsLoading(false);
    }
  };

  /* ===== Registro ===== */
  const register = async (
    cedula: string,
    nombre: string,
    placa: string,
    tipoVehiculo: string,
    rol: string
  ): Promise<AuthResponse> => {
    setIsLoading(true);

    try {
      const response = await AuthService.register(
        cedula,
        nombre,
        placa,
        tipoVehiculo,
        rol
      );

      if (response.success && response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message:
          (error as Error).message || 'Error inesperado en registro',
      } as AuthResponse;
    } finally {
      setIsLoading(false);
    }
  };

  /* ===== Logout ===== */
  const logout = () => {
    setUser(null);
    setToken(null);
  };

  /* ===== Provider ===== */
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =========================
   Hook personalizado
========================= */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};