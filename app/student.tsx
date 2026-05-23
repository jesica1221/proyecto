import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Config from '@/constants/config';
import AuthService from '@/services/auth';
import useAuthStore from '@/store/useAuthStore';

export default function StudentScreen() {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const router = useRouter();
  const { user, logout, token, getAuthHeaders, hasRole } = useAuthStore();

  const safeUser: any = user;

  const [zonasDisponibles, setZonasDisponibles] = useState<number[]>([]);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<number | null>(null);
  const [espaciosDisponibles, setEspaciosDisponibles] = useState<any[]>([]);
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<any>(null);
  const [reservaActual, setReservaActual] = useState<any | null>(null);

  /* =========================
     NOMBRES DE ZONAS
  ========================= */
  const getNombreZona = (id: number) => {
    switch (id) {
      case 1: return "🏢 Administrativa";
      case 2: return "📚 Biblioteca";
      case 3: return "🎭 Auditorio";
      case 4: return "🍔 Cafetería";
      case 5: return "🧪 Laboratorios";
      default: return `Zona ${id}`;
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  /* =========================
     ZONAS SEGÚN VEHÍCULO
  ========================= */
  /* =========================
     TEMPORIZADOR DE RESERVA
  ========================= */
  useEffect(() => {
    if (!reservaActual) return;

    const timer = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor(
          (new Date(reservaActual.horaVencimiento).getTime() - Date.now()) / 1000
        )
      );

      setRemainingSeconds(diff);

      if (diff === 0) {
        setReservaActual(null);
        Alert.alert('⏰ Reserva expirada');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reservaActual]);

  /* =========================
     ZONAS SEGÚN VEHÍCULO
  ========================= */
  useEffect(() => {
    if (!token || !safeUser || !AuthService.validateToken(token) || !hasRole('student')) {
      logout();
      router.replace('/login');
      return;
    }

    const tipo = safeUser.tipoVehiculo?.toLowerCase().trim();

    if (tipo === 'moto') {
      setZonasDisponibles([4, 5]);
    } else if (tipo === 'carro') {
      setZonasDisponibles([1, 2, 3]);
    }

    setZonaSeleccionada(null);
    setEspaciosDisponibles([]);

  }, [safeUser, token, logout, router, hasRole]);

  /* =========================
     CARGAR ESPACIOS
  ========================= */
  const cargarEspacios = async (zonaId: number) => {
    try {
      console.log('Cargando espacios para zona:', zonaId);
      console.log('Tipo vehículo:', safeUser.tipoVehiculo?.toLowerCase().trim());
      
      const response = await fetch(
        `${Config.API_BASE_URL}/espacios.php`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            zona: zonaId,
            tipoVehiculo: safeUser.tipoVehiculo?.toLowerCase().trim(),
          }),
        }
      );

      const data = await response.json();
      console.log('Respuesta espacios:', data);

      if (data.success) {
        setEspaciosDisponibles(data.espacios);
      } else {
        setEspaciosDisponibles([]);
        Alert.alert('Error', data.message || 'No hay espacios disponibles');
      }

    } catch (error) {
      console.log('Error cargando espacios:', error);
      Alert.alert('Error cargando espacios');
    }
  };

  useEffect(() => {
    if (zonaSeleccionada) {
      cargarEspacios(zonaSeleccionada);
    }
  }, [zonaSeleccionada]);

  /* =========================
     RESERVA ACTIVA (RECUPERAR)
  ========================= */
  useEffect(() => {
    if (!safeUser) return;

    const cargarReserva = async () => {
      try {
        const response = await fetch(
          `${Config.API_BASE_URL}/reserva_activa.php`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ cedula: safeUser.cedula }),
          }
        );

        const data = await response.json();

        if (data.success) {
          const reserva = data.reserva;

          setReservaActual({
            numero: reserva.numero,
            qrCode: `USER-${safeUser.nombre}-${safeUser.cedula}-ESPACIO-${reserva.numero}`,
          });
        } else {
          setReservaActual(null);
        }
      } catch {
        setReservaActual(null);
      }
    };

    cargarReserva();
  }, [safeUser, getAuthHeaders]);

  /* =========================
     RESERVAR
  ========================= */
  const handleReserveSpot = async () => {

    if (!espacioSeleccionado) {
      Alert.alert('Selecciona un espacio');
      return;
    }

    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/reservar.php`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            idEspacio: espacioSeleccionado.id,
            cedula: safeUser.cedula,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Obtenemos la hora de vencimiento desde el backend, o usamos un fallback de 15 min
        const horaExpira = data.horaVencimiento || new Date(Date.now() + 15 * 60000).toISOString();

        setReservaActual({
          numero: espacioSeleccionado.numero,
          zona: zonaSeleccionada, // 🔥 AGREGADO
          horaVencimiento: horaExpira,
          qrCode: `USER-${safeUser.nombre}-${safeUser.cedula}-ESPACIO-${espacioSeleccionado.numero}`,
        });

        Alert.alert('Espacio reservado');
        cargarEspacios(zonaSeleccionada!);
      }

    } catch {
      Alert.alert('Error servidor');
    }
  };

  /* =========================
     CANCELAR RESERVA
  ========================= */
  const cancelarReserva = async () => {
    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/cancelar.php`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ cedula: safeUser.cedula }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setReservaActual(null);

        const tipo = safeUser.tipoVehiculo?.toLowerCase().trim();

        if (tipo === 'moto') {
          setZonasDisponibles([4, 5]);
        } else {
          setZonasDisponibles([1, 2, 3]);
        }

        setZonaSeleccionada(null);
        setEspaciosDisponibles([]);

        Alert.alert('Reserva cancelada');
      }

    } catch {
      Alert.alert('Error servidor');
    }
  };

  if (!safeUser) return null;

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>
          👨‍🎓 {safeUser.nombre}
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          🆔 CC: {safeUser.cedula} | 🚗 Vehículo: {safeUser.tipoVehiculo?.toUpperCase()}
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/historial')} style={[styles.logoutBtn, { backgroundColor: '#2563EB' }]}>
            <ThemedText style={styles.logout}>📋 Historial</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <ThemedText style={styles.logout}>Salir</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* SIN RESERVA */}
      {!reservaActual && (
        <ThemedView style={styles.mainContainer}>

          <ThemedText style={styles.sectionTitle}>
            Parqueadero
          </ThemedText>

          {/* ZONAS */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {zonasDisponibles.map((zona) => (
              <TouchableOpacity
                key={zona}
                onPress={() => setZonaSeleccionada(zona)}
                style={[
                  styles.zoneBtn,
                  zonaSeleccionada === zona && styles.zoneBtnActive
                ]}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {getNombreZona(zona)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* ESPACIOS */}
          <View style={styles.mapContainer}>
            {espaciosDisponibles.map((espacio: any) => (
              <TouchableOpacity
                key={espacio.id}
                onPress={() => setEspacioSeleccionado(espacio)}
                style={[
                  styles.espacioBox,
                  espacioSeleccionado?.id === espacio.id && styles.espacioBoxSelected
                ]}
              >
                <ThemedText style={styles.espacioText}>
                  {espacio.numero}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.reserveButton}
            onPress={handleReserveSpot}
          >
            <ThemedText style={{ color: '#fff' }}>
              RESERVAR
            </ThemedText>
          </TouchableOpacity>

        </ThemedView>
      )}

      {/* CON RESERVA */}
      {reservaActual && (
        <ThemedView style={styles.mainContainer}>

          <ThemedText style={{ color: '#10B981', fontWeight: 'bold' }}>
            Espacio #{reservaActual.numero}
          </ThemedText>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>

            <QRCode value={reservaActual.qrCode} size={120} />

            <View style={{ marginLeft: 15 }}>

              <ThemedText style={{ color: '#10B981' }}>
                📍 {getNombreZona(reservaActual.zona)}
              </ThemedText>

              <ThemedText style={{ color: '#fff' }}>
                🅿️ Espacio #{reservaActual.numero}
              </ThemedText>

              <ThemedText style={{ color: '#FACC15' }}>
                ⏱️ {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, '0')}
              </ThemedText>

            </View>

          </View>

          <TouchableOpacity
            onPress={cancelarReserva}
            style={styles.cancelBtn}
          >
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>
              CANCELAR RESERVA
            </ThemedText>
          </TouchableOpacity>

        </ThemedView>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  mainContainer: { padding: 20 },

  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#1E293B'
  },

  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold'
  },

  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4
  },

  logoutBtn: {
    position: 'absolute',
    right: 20,
    top: 40,
    backgroundColor: '#334155',
    padding: 10,
    borderRadius: 8
  },

  logout: { color: '#fff' },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10
  },

  zoneBtn: {
    padding: 10,
    margin: 5,
    backgroundColor: '#1E293B',
    borderRadius: 10
  },

  zoneBtnActive: {
    backgroundColor: '#2563EB'
  },

  mapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20
  },

  espacioBox: {
    width: 60,
    height: 60,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10
  },

  espacioBoxSelected: {
    backgroundColor: '#FACC15', // Color amarillo para resaltar
    borderWidth: 2,
    borderColor: '#fff'
  },

  espacioText: { color: '#fff', fontWeight: 'bold' },

  reserveButton: {
    backgroundColor: '#10B981',
    padding: 15,
    marginTop: 20,
    borderRadius: 10,
    alignItems: 'center'
  },

  cancelBtn: {
    backgroundColor: '#EF4444',
    padding: 15,
    marginTop: 20,
    borderRadius: 10,
    alignItems: 'center'
  }
});