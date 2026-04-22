import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { DBService } from '@/services/database';
import { ParkingZone } from '@/types/parking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera';

export default function AdminScreen() {

  const router = useRouter();
  const { user, logout } = useAuth();

  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [loading, setLoading] = useState(true);

  const [adminData, setAdminData] = useState<any>({
    libres: [],
    ocupados: [],
    porVencer: []
  });

  const [selectedEspacio, setSelectedEspacio] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 🔥 QR STATES
  const [verifications, setVerifications] = useState<any[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // 🔥 TRAER DATOS BACKEND
  const cargarAdmin = async () => {
    try {
      const response = await fetch(
        "http://192.168.26.9/eficient-parking-lot/admin_espacios.php"
      );

      const data = await response.json();

      if (data?.success) {
        setAdminData({
          libres: data.libres || [],
          ocupados: data.ocupados || [],
          porVencer: data.porVencer || [],
        });
      }

    } catch (error) {
      console.log("ERROR ADMIN:", error);
    }
  };

  // 🔥 ESCANEO QR
  const handleBarCodeScanned = ({ data }: any) => {
    setScanned(true);
    handleVerifyQRWithData(data);
  };

  // 🔥 VALIDACIÓN CONTRA BACKEND (NUEVO)
  const handleVerifyQRWithData = async (dataQR: string) => {
    try {
      const response = await fetch(
        "http://192.168.26.9/eficient-parking-lot/verificar_qr.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qr: dataQR,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        Alert.alert("❌ Acceso denegado", result.message);
        return;
      }

      const newVerification = {
        id: `verify-${Date.now()}`,
        nombre: result.usuario,
        espacio: result.espacio,
        timestamp: new Date().toLocaleTimeString(),
      };

      setVerifications((prev) => [newVerification, ...prev]);

      Alert.alert(
        "✅ Acceso permitido",
        `Usuario: ${result.usuario}\nEspacio: ${result.espacio}`
      );

    } catch (error) {
      Alert.alert("Error", "No se pudo validar QR");
    }
  };

  useEffect(() => {

    if (!user) {
      router.replace('/login');
      return;
    }

    const rol = user?.rol?.toLowerCase().trim();

    if (rol !== 'admin') {
      Alert.alert('Error', 'No autorizado');
      router.replace('/login');
      return;
    }

    const adminZones = DBService.getZonasPorTipo(
      user.tipoVehiculo,
      user.rol
    );

    setZones(adminZones);

    cargarAdmin();
    const interval = setInterval(cargarAdmin, 5000);

    setLoading(false);

    return () => clearInterval(interval);

  }, [user]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerTop}>

          <ThemedView>
            <ThemedText type="title">🏫 Administrador</ThemedText>
            <ThemedText style={styles.userInfo}>
              {user?.nombre}
            </ThemedText>
          </ThemedView>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <ThemedText style={styles.logoutButtonText}>
              Salir
            </ThemedText>
          </TouchableOpacity>

        </ThemedView>
      </ThemedView>

      {/* CONTENIDO */}
      <ThemedView style={styles.content}>

        {/* ESTADO GENERAL */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          📊 Estado General
        </ThemedText>

        <ThemedView style={styles.statsBox}>
          <ThemedText>🟢 Libres: {adminData.libres.length}</ThemedText>
          <ThemedText>🔴 Ocupados: {adminData.ocupados.length}</ThemedText>
          <ThemedText>⏳ Por vencer: {adminData.porVencer.length}</ThemedText>
        </ThemedView>

        {/* ZONAS */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          📊 Parqueaderos
        </ThemedText>

        {zones.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText>No hay parqueaderos asignados</ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={zones}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item: zone }) => {

              const disponibles = zone.espacios.filter(e => e.disponible).length;
              const ocupados = zone.capacidad - disponibles;

              const porcentaje = zone.capacidad > 0
                ? Math.round((ocupados / zone.capacidad) * 100)
                : 0;

              return (
                <ThemedView style={styles.zoneCard}>

                  <ThemedView style={styles.zoneHeader}>
                    <ThemedText type="subtitle">
                      {zone.nombre}
                    </ThemedText>

                    <ThemedText style={[
                      styles.occupancyBadge,
                      porcentaje > 80 && styles.occupancyBadgeRed,
                    ]}>
                      {porcentaje}% OCUPADO
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.stats}>
                    <View style={styles.statItem}>
                      <ThemedText style={styles.statLabel}>Disponibles</ThemedText>
                      <ThemedText style={styles.statValue}>{disponibles}</ThemedText>
                    </View>

                    <View style={styles.statItem}>
                      <ThemedText style={styles.statLabel}>Ocupados</ThemedText>
                      <ThemedText style={[styles.statValue, { color: '#E74C3C' }]}>
                        {ocupados}
                      </ThemedText>
                    </View>

                    <View style={styles.statItem}>
                      <ThemedText style={styles.statLabel}>Total</ThemedText>
                      <ThemedText style={styles.statValue}>{zone.capacidad}</ThemedText>
                    </View>
                  </ThemedView>

                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { width: `${porcentaje}%` },
                    ]} />
                  </View>

                </ThemedView>
              );
            }}
          />
        )}

        {/* OCUPADOS */}
        <ThemedText style={styles.sectionTitle}>
          🚗 Espacios Ocupados
        </ThemedText>

        {adminData.ocupados.length === 0 ? (
          <ThemedText>No hay ocupados</ThemedText>
        ) : (
          adminData.ocupados.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setSelectedEspacio(item);
                setModalVisible(true);
              }}
            >
              <ThemedView style={styles.card}>
                <ThemedText>🚗 Espacio #{item.numero}</ThemedText>
                <ThemedText>Zona: {item.zonaId}</ThemedText>
                <ThemedText>Vehículo: {item.tipoVehiculo}</ThemedText>
                <ThemedText>Usuario: {item.nombre}</ThemedText>

                <ThemedText style={{ fontWeight: 'bold', marginTop: 4 }}>
                  ⏱ {item.tiempoRestanteMin || 0} min
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
          ))
        )}

        {/* 🔐 ESCÁNER QR */}
        <ThemedText style={styles.sectionTitle}>
          🔐 Escanear Código QR
        </ThemedText>

        {!permission ? (
          <ThemedText>Solicitando permiso...</ThemedText>
        ) : !permission.granted ? (
          <TouchableOpacity onPress={requestPermission}>
            <ThemedText>Dar permiso a la cámara</ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={{ height: 300, overflow: 'hidden', borderRadius: 10 }}>
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={{ flex: 1 }}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.logoutButton, { marginTop: 10 }]}
          onPress={() => setScanned(false)}
        >
          <ThemedText style={styles.logoutButtonText}>
            🔄 Escanear de nuevo
          </ThemedText>
        </TouchableOpacity>

        {/* HISTORIAL */}
        <ThemedText style={styles.sectionTitle}>
          📋 Últimas Verificaciones
        </ThemedText>

        {verifications.length === 0 ? (
          <ThemedText>Sin registros</ThemedText>
        ) : (
          verifications.map((item) => (
            <ThemedView key={item.id} style={styles.card}>
              <ThemedText>{item.nombre}</ThemedText>
              <ThemedText>Espacio: #{item.espacio}</ThemedText>
              <ThemedText>{item.timestamp}</ThemedText>
            </ThemedView>
          ))
        )}

      </ThemedView>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 10
          }}>
            <ThemedText type="subtitle">👤 Usuario</ThemedText>

            <ThemedText>Nombre: {selectedEspacio?.nombre}</ThemedText>
            <ThemedText>Cédula: {selectedEspacio?.cedula}</ThemedText>
            <ThemedText>Espacio: #{selectedEspacio?.numero}</ThemedText>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                marginTop: 15,
                backgroundColor: '#007AFF',
                padding: 10,
                borderRadius: 6
              }}
            >
              <ThemedText style={{ color: '#fff', textAlign: 'center' }}>
                Cerrar
              </ThemedText>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#8B5CF6',
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  userInfo: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
    color: '#fff',
  },

  logoutButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },

  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  content: { padding: 16 },

  sectionTitle: {
    marginBottom: 16,
    marginTop: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  zoneCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  occupancyBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#27AE60',
  },

  occupancyBadgeRed: {
    color: '#E74C3C',
  },

  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },

  statItem: { alignItems: 'center' },

  statLabel: {
    fontSize: 11,
    opacity: 0.7,
  },

  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#E74C3C',
  },

  statsBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },

  card: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
});