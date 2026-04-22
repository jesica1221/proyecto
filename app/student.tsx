import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function StudentScreen() {

  const router = useRouter();
  const { user, logout } = useAuth();
  const safeUser: any = user;

  const [zonasDisponibles, setZonasDisponibles] = useState<number[]>([]);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<number | null>(null);

  const [espaciosDisponibles, setEspaciosDisponibles] = useState<any[]>([]);
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<any>(null);

  const [reservaActual, setReservaActual] = useState<any | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // 🔥 LOGOUT (FALTABA)
  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // 🔥 DEFINIR ZONAS
  useEffect(() => {

    if (!safeUser) return;

    if (safeUser.tipoVehiculo === "moto") {
      setZonasDisponibles([1, 2]);
    } else if (safeUser.tipoVehiculo === "carro") {
      setZonasDisponibles([3]);
      setZonaSeleccionada(3);
    }

  }, [safeUser]);

  // 🔥 CARGAR RESERVA ACTIVA
  useEffect(() => {
    if (!safeUser) return;

    const cargarReserva = async () => {
      try {

        const response = await fetch("http://192.168.26.9/eficient-parking-lot/reserva_activa.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cedula: safeUser.cedula
          }),
        });

        const data = await response.json();

        console.log("RESERVA ACTIVA:", data);

        if (data.success) {

          const reserva = data.reserva;

          const horaReservaExpirar = reserva.remaining_seconds
            ? new Date(Date.now() + reserva.remaining_seconds * 1000)
            : new Date(Date.now() + 15 * 60000); // fallback seguro

          setReservaActual({
            espacioId: reserva.id,
            numero: reserva.numero,
            horaVencimiento: horaReservaExpirar,
            qrCode: `USER-${safeUser.nombre}-${safeUser.cedula}-ESPACIO-${reserva.numero}`
          });

        }

      } catch (error) {
        console.log("ERROR RESERVA:", error);
      }
    };

    cargarReserva();

  }, [safeUser]);

  // 🔥 CARGAR ESPACIOS
  const cargarEspacios = async (zonaId: number) => {
    try {

      const response = await fetch("http://192.168.26.9/eficient-parking-lot/espacios.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zona: zonaId,
          tipoVehiculo: safeUser.tipoVehiculo
        }),
      });

      const data = await response.json();

      console.log("ESPACIOS:", data);

      if (data.success) {
        setEspaciosDisponibles(data.espacios);
      } else {
        setEspaciosDisponibles([]);
      }

    } catch (error) {
      console.log("ERROR ESPACIOS:", error);
      Alert.alert("Error cargando espacios");
    }
  };

  useEffect(() => {
    if (zonaSeleccionada) {
      cargarEspacios(zonaSeleccionada);
    }
  }, [zonaSeleccionada]);

  // 🔥 TIMER
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
        Alert.alert('Reserva expirada');
      }

    }, 1000);

    return () => clearInterval(timer);

  }, [reservaActual]);

  if (!safeUser) return null;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 🔥 RESERVAR (ARREGLADO)
  const handleReserveSpot = async () => {

    if (!espacioSeleccionado) {
      Alert.alert("Selecciona un espacio");
      return;
    }

    try {

      const response = await fetch("http://192.168.26.9/eficient-parking-lot/reservar.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idEspacio: espacioSeleccionado.id,
          cedula: safeUser.cedula
        }),
      });

      const data = await response.json();

      if (data.success) {

        const now = Date.now();

        const horaExpira = data.remaining_seconds
          ? new Date(now + (data.remaining_seconds * 1000))
          : new Date(now + 15 * 60000);

        const reserva = {
          espacioId: espacioSeleccionado.id,
          numero: espacioSeleccionado.numero,
          horaVencimiento: horaExpira,
          qrCode: `USER-${safeUser.nombre}-${safeUser.cedula}-ESPACIO-${espacioSeleccionado.numero}`
        };

        setReservaActual(reserva);

        Alert.alert("Éxito", "Espacio reservado");

        cargarEspacios(zonaSeleccionada!);

      } else {
        Alert.alert("Error", data.message || "No se pudo reservar");
      }

    } catch (error) {
      console.log(error);
      Alert.alert("Error servidor");
    }
  };

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>
          👨‍🎓 {safeUser?.nombre}
        </ThemedText>

        <ThemedText style={styles.headerSub}>
          Placa: {safeUser?.placa}
        </ThemedText>

        <TouchableOpacity onPress={handleLogout}>
          <ThemedText style={styles.logout}>Salir</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* SIN RESERVA */}
      {!reservaActual && (

        <ThemedView style={{ padding: 16 }}>

          <ThemedText style={styles.sectionTitle}>
            Parqueadero
          </ThemedText>

          {safeUser.tipoVehiculo === "moto" && (
            <View style={{ marginTop: 10 }}>
              <ThemedText>Selecciona zona:</ThemedText>

              <View style={{ flexDirection: "row", marginTop: 10 }}>
                {zonasDisponibles.map((zona) => (
                  <TouchableOpacity
                    key={zona}
                    onPress={() => setZonaSeleccionada(zona)}
                    style={{
                      padding: 10,
                      marginRight: 10,
                      borderRadius: 6,
                      backgroundColor: zonaSeleccionada === zona ? "#007AFF" : "#ccc"
                    }}
                  >
                    <ThemedText style={{ color: "#fff" }}>
                      Zona {zona}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.mapContainer}>
            {espaciosDisponibles.map((espacio: any) => {

              const isSelected = espacioSeleccionado?.id === espacio.id;
              const isOcupado = espacio.disponible == 0;

              return (
                <TouchableOpacity
                  key={espacio.id}
                  disabled={isOcupado}
                  onPress={() => setEspacioSeleccionado(espacio)}
                  style={[
                    styles.espacioBox,
                    isOcupado && styles.ocupado,
                    isSelected && styles.seleccionado
                  ]}
                >
                  <ThemedText style={styles.espacioText}>
                    {espacio.numero}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
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

      {/* RESERVA */}
      {reservaActual && (

        <ThemedView style={{ padding: 16 }}>

          <ThemedView style={styles.successCard}>

            <ThemedText style={styles.successTitle}>
              ✅ Reservación Confirmada
            </ThemedText>

            <ThemedView style={styles.infoBox}>
              <ThemedText style={{ color: '#fff' }}>
                Nombre: {safeUser?.nombre}
              </ThemedText>

              <ThemedText style={{ color: '#fff' }}>
                Espacio: #{reservaActual.numero}
              </ThemedText>
            </ThemedView>

            <View style={styles.row}>

              <View style={styles.smallBox}>
                <ThemedText>Tiempo</ThemedText>
                <ThemedText style={styles.time}>
                  {formatTime(remainingSeconds)}
                </ThemedText>
              </View>

              <View style={styles.smallBox}>
                <QRCode value={reservaActual.qrCode} size={100} />
              </View>

            </View>

          </ThemedView>

        </ThemedView>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    padding: 16,
    backgroundColor: '#007AFF',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },

  headerSub: {
    color: '#fff',
    marginTop: 4
  },

  logout: {
    color: '#fff',
    marginTop: 10
  },

  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10
  },

  mapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
    justifyContent: 'center'
  },

  espacioBox: {
    width: 60,
    height: 60,
    margin: 5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50'
  },

  ocupado: {
    backgroundColor: '#E74C3C'
  },

  seleccionado: {
    backgroundColor: '#3498DB'
  },

  espacioText: {
    color: '#fff',
    fontWeight: 'bold'
  },

  successCard: {
    backgroundColor: '#D5F5E3',
    padding: 14,
    borderRadius: 10
  },

  successTitle: {
    color: '#27AE60',
    fontWeight: 'bold',
    marginBottom: 10
  },

  infoBox: {
    backgroundColor: '#2C3E50',
    padding: 10,
    borderRadius: 6
  },

  row: {
    flexDirection: 'row',
    marginTop: 12
  },

  smallBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    margin: 4,
    borderRadius: 8,
    alignItems: 'center'
  },

  time: {
    fontSize: 22,
    color: 'red',
    fontWeight: 'bold'
  },

  reserveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginTop: 15,
    alignItems: 'center'
  }
});