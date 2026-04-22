import { ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { useParking } from '@/context/ParkingContext';
import DBService from '@/services/database';
import QRService from '@/services/qrService';
import { Reservation, ParkingZone, ParkingSpace } from '@/types/parking';
import QRCode from 'react-native-qrcode-svg';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { zonas, cargarZonas, zonaActual, seleccionarZona } = useParking();
  const [reservacion, setReservacion] = useState<Reservation | null>(null);
  const [mostrarQR, setMostrarQR] = useState(false);
  const [espaciosDisponibles, setEspaciosDisponibles] = useState<ParkingSpace[]>([]);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ParkingZone | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [fiveMinuteAlertShown, setFiveMinuteAlertShown] = useState(false);

  useEffect(() => {
    if (user) {
      cargarZonas(user.rol, user.tipoVehiculo);
    }
  }, [user]);

  useEffect(() => {
    if (!reservacion) {
      setRemainingSeconds(0);
      setFiveMinuteAlertShown(false);
      return;
    }

    const updateRemaining = () => {
      const vencimiento = new Date(reservacion.horaVencimiento).getTime();
      const ahora = Date.now();
      const diff = Math.max(0, Math.floor((vencimiento - ahora) / 1000));

      setRemainingSeconds(diff);

      if (diff === 300 && !fiveMinuteAlertShown) {
        setFiveMinuteAlertShown(true);
        Alert.alert('⏳ Atención', 'Le quedan 5 minutos para cancelar el cupo del parqueadero.');
      }

      if (diff === 0) {
        setReservacion(null);
        setMostrarQR(false);
        Alert.alert('Reserva expirada', 'Tu reserva de 15 minutos ha expirado.');
      }
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [reservacion, fiveMinuteAlertShown]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleReservar = (zona: ParkingZone) => {
    const espacios = DBService.getEspaciosDisponibles(zona.id);
    if (espacios.length === 0) {
      Alert.alert('Sin disponibilidad', 'No hay espacios disponibles en esta zona');
      return;
    }
    setZonaSeleccionada(zona);
    setEspaciosDisponibles(espacios);
  };

  const seleccionarEspacio = (espacio: ParkingSpace) => {
    if (!user || !zonaSeleccionada) return;

    const qrCode = QRService.generateQRCode(zonaSeleccionada.id);
    const nuevaReservacion = DBService.crearReservacion(user, zonaSeleccionada.id, espacio.id, qrCode);

    setReservacion(nuevaReservacion);
    setZonaSeleccionada(null);
    setMostrarQR(true);
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedView>
            <ThemedText type="title">🅿️ {user.nombre}</ThemedText>
            <ThemedText style={styles.roleText}>
              {user.rol === 'student'
                ? '👨‍🎓 Estudiante'
                : user.rol === 'admin'
                  ? '👔 Administrativo/Docente'
                  : '🔐 Seguridad'}
            </ThemedText>
          </ThemedView>
          <TouchableOpacity style={styles.logoutButton} onPress={() => { logout(); }}>
            <ThemedText style={styles.logoutText}>Salir</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.infoCard}>
          <ThemedText type="subtitle">📋 Mi Información</ThemedText>
          <ThemedView style={styles.infoRow}>
            <ThemedText>Cédula: {user.cedula}</ThemedText>
            <ThemedText>Placa: {user.placa}</ThemedText>
            <ThemedText>Vehículo: {user.tipoVehiculo === 'car' ? '🚗 Auto' : '🏍️ Moto'}</ThemedText>
          </ThemedView>
        </ThemedView>

        {reservacion && (
  <ThemedView style={[styles.card, styles.activeReservationCard]}>
    
    <ThemedText type="subtitle" style={styles.successText}>
      ✅ Reservación Confirmada
    </ThemedText>

    <ThemedView style={styles.reservationDetails}>
      <ThemedText>
        Zona: {DBService.getZonaById(reservacion.zonaId)?.nombre ?? reservacion.zonaId}
      </ThemedText>
      <ThemedText>Espacio: #{reservacion.espacioId}</ThemedText>
    </ThemedView>

    
    <View style={styles.qrRow}>

      {/* IZQUIERDA - TIEMPO */}
      <View style={styles.qrBoxItem}>
       <ThemedText style={[styles.boxTitle, { color: '#B22222' }, { fontWeight: 'bold' }, { fontSize: 30 }]}>Tiempo</ThemedText>
        <ThemedText style={[styles.countdownText, { color: '#000' }]}>
        {formatTime(remainingSeconds)}
      </ThemedText>
      </View>

      {/* DERECHA - QR */}
      <View style={styles.qrBoxItem}>
        <ThemedText style={[styles.boxTitle, { color: '#B22222' }, { fontWeight: 'bold' }, { fontSize: 30 }]}>QR</ThemedText>
        <QRCode value={reservacion.qrCode} size={100} />
      </View>

    </View>

  </ThemedView>
)}
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">
            {user.tipoVehiculo === 'car'
              ? '🚗 Zonas de Estacionamiento para Autos'
              : '🏍️ Zonas de Estacionamiento para Motos'}
          </ThemedText>
          <ThemedText style={styles.availabilityNote}>
            ℹ️ Solo se muestran zonas con disponibilidad
          </ThemedText>

          {zonas.length === 0 ? (
            <ThemedText style={styles.noAvailability}>
              😢 Sin zonas disponibles en este momento
            </ThemedText>
          ) : (
            zonas.map((zona) => (
              <TouchableOpacity
                key={zona.id}
                style={styles.zoneCard}
                onPress={() => handleReservar(zona)}
              >
                <ThemedView style={styles.zoneHeader}>
                  <ThemedText type="subtitle" style={styles.zoneName}>
                    {zona.nombre}
                  </ThemedText>
                  <ThemedView style={styles.availabilityBadge}>
                    <ThemedText style={styles.badgeText}>
                      {zona.disponible}/{zona.capacidad}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedView style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(zona.disponible / zona.capacidad) * 100}%`,
                      },
                    ]}
                  />
                </ThemedView>
                <ThemedText style={styles.zoneAction}>Presiona para reservar →</ThemedText>
              </TouchableOpacity>
            ))
          )}
        </ThemedView>
      </ThemedView>

      <Modal
        transparent={true}
        animationType="slide"
        visible={zonaSeleccionada !== null}
        onRequestClose={() => setZonaSeleccionada(null)}
      >
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle">
              Selecciona un espacio en {zonaSeleccionada?.nombre}
            </ThemedText>

            <ScrollView style={styles.spacesGrid}>
              {espaciosDisponibles.map((espacio) => (
                <TouchableOpacity
                  key={espacio.id}
                  style={[styles.spaceButton, !espacio.disponible && styles.spaceBusyButton]}
                  onPress={() => seleccionarEspacio(espacio)}
                  disabled={!espacio.disponible}
                >
                  <ThemedText style={styles.spaceNumber}>
                    {espacio.disponible ? '✅' : '❌'} #{espacio.numero}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setZonaSeleccionada(null);
                setEspaciosDisponibles([]);
              }}
            >
              <ThemedText style={styles.buttonText}>Cerrar</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>

      <Modal transparent={true} animationType="fade" visible={mostrarQR} onRequestClose={() => setMostrarQR(false)}>
        <ThemedView style={styles.qrModalContainer}>
          <ThemedView style={styles.qrModalContent}>
            <ThemedText type="title" style={styles.qrTitle}>
              📱 Tu Código QR
            </ThemedText>

            {reservacion && (
              <ThemedView style={styles.qrBox}>
                <ThemedText style={styles.qrCode}>{reservacion.qrCode}</ThemedText>
                <ThemedText style={styles.qrInstruction}>
                  Escanea este código en la barrera para acceder a tu espacio
                </ThemedText>
              </ThemedView>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setMostrarQR(false)}
            >
              <ThemedText style={styles.buttonText}>Cerrar</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
qrRow: {
  flexDirection: 'row',
  marginTop: 10,
},

qrBoxItem: {
  flex: 1,
  alignItems: 'center',
  backgroundColor: '#fff',
  padding: 10,
  borderRadius: 8,
  marginHorizontal: 5,
},

boxTitle: {
  fontSize: 12,
  marginBottom: 5,
},
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleText: {
    opacity: 0.7,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoRow: {
    gap: 4,
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 6,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  activeReservationCard: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  successText: {
    color: '#155724',
  },
  reservationDetails: {
    gap: 4,
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 6,
  },
  expiryText: {
    fontSize: 12,
    color: '#856404',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  countdownText: {
    color: '#B22222',
    fontWeight: 'bold',
    fontSize: 25,
  },
  showQRButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  availabilityNote: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  noAvailability: {
    textAlign: 'center',
    padding: 20,
    opacity: 0.6,
  },
  zoneCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#8fdd37',
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#2c3e50',
    padding: 8,
  borderRadius: 6,
  },
  zoneName: {
    flex: 1,
  },
  availabilityBadge: {
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
  },
  zoneAction: {
    fontSize: 12,
    color: '#007bff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
    gap: 12,
  },
  spacesGrid: {
    maxHeight: 300,
  },
  spaceButton: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#28a745',
  },
  spaceBusyButton: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  spaceNumber: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  qrModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  qrModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    alignItems: 'center',
    gap: 16,
  },
  qrTitle: {
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  qrCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
    textAlign: 'center',
  },
  qrInstruction: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
});
