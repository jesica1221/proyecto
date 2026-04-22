import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera';

export default function SecurityScreen() {

  const router = useRouter();
  const { user, logout } = useAuth();

  const [qrCode, setQrCode] = useState('');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.rol !== 'security' && user.rol !== 'seguridad') {
      Alert.alert('Error', 'No autorizado');
      router.replace('/login');
      return;
    }

    setLoading(false);

  }, [user]);

  // 🔥 NUEVA LÓGICA DE QR
  const handleVerifyQR = () => {

    if (!qrCode.trim()) {
      Alert.alert('Error', 'Ingresa o escanea un código QR');
      return;
    }

    const parts = qrCode.split('-');

    // 🔥 VALIDAR FORMATO NUEVO
    if (parts[0] !== 'USER' || parts[3] !== 'ESPACIO') {
      Alert.alert('Error', 'Código QR inválido');
      return;
    }

    const nombre = parts[1];
    const cedula = parts[2];
    const espacio = parts[4];

    const newVerification = {
      id: `verify-${Date.now()}`,
      nombre,
      cedula,
      espacio,
      verificadoPor: user?.nombre,
      timestamp: new Date().toLocaleTimeString(),
    };

    setVerifications([newVerification, ...verifications]);
    setQrCode('');
    setScanned(false);

    Alert.alert(
      '✅ Acceso permitido',
      `Usuario: ${nombre}\nEspacio: ${espacio}`
    );
  };

  // 📷 ESCANEO QR
  const handleBarCodeScanned = ({ data }: any) => {
    setScanned(true);
    setQrCode(data);

    // 🔥 IMPORTANTE: usar directamente el data
    setTimeout(() => {
      handleVerifyQRWithData(data);
    }, 300);
  };

  // 🔥 FUNCIÓN EXTRA PARA EVITAR ERROR DE ESTADO
  const handleVerifyQRWithData = (dataQR: string) => {

    const parts = dataQR.split('-');

    if (parts[0] !== 'USER' || parts[3] !== 'ESPACIO') {
      Alert.alert('Error', 'Código QR inválido');
      return;
    }

    const nombre = parts[1];
    const cedula = parts[2];
    const espacio = parts[4];

    const newVerification = {
      id: `verify-${Date.now()}`,
      nombre,
      cedula,
      espacio,
      verificadoPor: user?.nombre,
      timestamp: new Date().toLocaleTimeString(),
    };

    setVerifications((prev) => [newVerification, ...prev]);

    Alert.alert(
      '✅ Acceso permitido',
      `Usuario: ${nombre}\nEspacio: ${espacio}`
    );
  };

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
            <ThemedText type="title" style={styles.headerTitle}>
              🔐 Guarda de Seguridad
            </ThemedText>

            <ThemedText style={styles.userInfo}>
              {user?.nombre} ({user?.cedula})
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

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          🚗 Escanear Código QR
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
          style={[styles.verifyButton, { backgroundColor: '#3498DB' }]}
          onPress={() => setScanned(false)}
        >
          <ThemedText style={styles.verifyButtonText}>
            🔄 Escanear de nuevo
          </ThemedText>
        </TouchableOpacity>

        {/* HISTORIAL */}
        <ThemedText
          type="subtitle"
          style={[styles.sectionTitle, { marginTop: 24 }]}
        >
          📋 Últimas Verificaciones
        </ThemedText>

        {verifications.length === 0 ? (

          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>
              Sin registros aún
            </ThemedText>
          </ThemedView>

        ) : (

          <FlatList
            data={verifications.slice(0, 10)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (

              <ThemedView style={styles.certCard}>

                <ThemedView style={styles.certHeader}>
                  <ThemedText style={styles.certPlate}>
                    {item.nombre}
                  </ThemedText>

                  <ThemedText style={styles.certTime}>
                    {item.timestamp}
                  </ThemedText>
                </ThemedView>

                <ThemedText style={styles.certInfo}>
                  Espacio: #{item.espacio}
                </ThemedText>

              </ThemedView>

            )}
          />

        )}

      </ThemedView>

    </ScrollView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#E74C3C',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff' },
  userInfo: {
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
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
  sectionTitle: { marginBottom: 16, marginTop: 8 },
  verifyButton: {
    marginTop: 16,
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: { color: '#999' },
  certCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  certPlate: { fontWeight: 'bold' },
  certTime: {
    fontSize: 11,
    opacity: 0.6,
  },
  certInfo: { fontSize: 12 },
});