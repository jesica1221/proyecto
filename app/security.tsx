import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Config from '@/constants/config';
import AuthService from '@/services/auth';
import useAuthStore from '@/store/useAuthStore';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

export default function SecurityScreen() {
  const router = useRouter();
  const { user, logout, token, getAuthHeaders, hasRole } = useAuthStore();

  const [usuarioEncontrado, setUsuarioEncontrado] = useState<any>(null);
  const [placaDetectada, setPlacaDetectada] = useState("");
  const [cedulaManual, setCedulaManual] = useState("");
  const [loading, setLoading] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const [zonas, setZonas] = useState<any[]>([]);
  const [todosEspacios, setTodosEspacios] = useState<any[]>([]);
  const [espacios, setEspacios] = useState<any[]>([]);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [visitanteNombre, setVisitanteNombre] = useState("");
  const [visitantePlaca, setVisitantePlaca] = useState("");
  const [selectedEspacio, setSelectedEspacio] = useState<any>(null);

  useEffect(() => {
    if (!user || !token || !AuthService.validateToken(token) || !hasRole('security')) {
      logout();
      router.replace('/login');
      return;
    }

    cargarTodo();
    setLoading(false);
  }, [user, token, logout, router, hasRole]);

  const handleBarCodeScanned = ({ data }: any) => {
    setScanned(true);

    if (data.includes("USER-")) {
      handleVerifyQRWithData(data);
      return;
    }

    manejarPlacaEscaneada(data);
  };

  const manejarPlacaEscaneada = async (placaEscaneada: string) => {
    try {
      const placaLimpia = placaEscaneada.toUpperCase().replace(/[^A-Z0-9]/g, '');
      setPlacaDetectada(placaLimpia);

      const responseActiva = await fetch(
        `${Config.API_BASE_URL}/buscar_placa_activa.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            placa: placaLimpia,
            token: token,
          }),
        }
      );

      const activaData = await responseActiva.json();

      if (activaData.tieneParqueadero) {
        const usuario = activaData.usuario;
        Alert.alert(
          "✅ Parqueadero activo",
          `Usuario: ${usuario.nombre}\nPlaca: ${usuario.placa}\nEspacio: ${usuario.numero}`
        );
        return;
      }

      const responseUsuario = await fetch(
        `${Config.API_BASE_URL}/buscar_usuario_placa.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            placa: placaLimpia,
            token: token,
          }),
        }
      );

      const usuarioData = await responseUsuario.json();

      if (usuarioData.registrado) {
        setUsuarioEncontrado(usuarioData.usuario);
        Alert.alert("🚗 Usuario registrado", `${usuarioData.usuario.nombre}\nSeleccione un espacio`);
        return;
      }

      const responseVisitante = await fetch(
        `${Config.API_BASE_URL}/crear_visitante.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            placa: placaLimpia,
            token: token,
          }),
        }
      );

      const visitanteData = await responseVisitante.json();

      if (visitanteData.success) {
        setUsuarioEncontrado(visitanteData.usuario);
        Alert.alert("👤 Visitante creado", "Seleccione un espacio");
      }

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo procesar la placa");
    }
  };

  const buscarPorCedula = async () => {
    if (!cedulaManual) {
      Alert.alert("Error", "Ingresa una cédula");
      return;
    }

    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/buscar_usuario_placa.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            cedula: cedulaManual,
            token: token,
          }),
        }
      );

      const data = await response.json();

      if (data.registrado) {
        setUsuarioEncontrado(data.usuario);
        Alert.alert("👤 Usuario encontrado", `${data.usuario.nombre}\nSeleccione un espacio`);
      } else {
        setUsuarioEncontrado(null);
        setModalAsignar(true);
      }

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo buscar el usuario");
    }
  };

  const handleVerifyQRWithData = (dataQR: string) => {
    const parts = dataQR.split('-');

    if (parts[0] !== 'USER' || parts[3] !== 'ESPACIO') {
      Alert.alert('Error', 'Código QR inválido');
      return;
    }

    const nombre = parts[1];
    Alert.alert('✅ Acceso permitido', `Usuario: ${nombre}`);
  };

  const cargarTodo = async () => {
    try {
      const res = await fetch(
        `${Config.API_BASE_URL}/admin_espacios.php?token=${encodeURIComponent(token || '')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        }
      );

      const data = await res.json();
      console.log('Security data:', data);

      const todos = [
        ...(data.libres || []),
        ...(data.ocupados || []),
        ...(data.porVencer || []),
      ];

      setTodosEspacios(todos);

      const zonasMap: any = {};

      todos.forEach((e: any) => {
        if (!zonasMap[e.zonaId]) {
          let nombre = "";
          let color = "";

          switch (Number(e.zonaId)) {
            case 1: nombre = "🏢 Administrativa"; color = "#1D4ED8"; break;
            case 2: nombre = "📚 Biblioteca"; color = "#2563EB"; break;
            case 3: nombre = "🎭 Auditorio"; color = "#3B82F6"; break;
            case 4: nombre = "🍔 Cafetería"; color = "#60A5FA"; break;
            case 5: nombre = "🧪 Laboratorios"; color = "#93C5FD"; break;
          }

          zonasMap[e.zonaId] = { id: e.zonaId, nombre, color };
        }
      });

      setZonas(Object.values(zonasMap));
    } catch (error) {
      console.log(error);
    }
  };

  const seleccionarZona = (zona: any) => {
    const filtrados = todosEspacios.filter(
      (e: any) => Number(e.zonaId) === Number(zona.id)
    );
    setEspacios(filtrados);
  };

  const asignarUsuarioExistente = async (espacio: any) => {
    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/asignar_usuario.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            usuarioId: usuarioEncontrado.id,
            espacioId: espacio.id,
            token: token,
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("✅ Parqueadero asignado");
        setUsuarioEncontrado(null);
        setPlacaDetectada("");
        setCedulaManual("");
        cargarTodo();
      } else {
        Alert.alert("Error", data.message || "No se pudo asignar");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error servidor");
    }
  };

  const liberarEspacio = async (espacio: any) => {
    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/liberar.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            espacioId: espacio.id,
            token: token,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("✅ Espacio liberado");
        cargarTodo();
      } else {
        Alert.alert("Error", data.message || "No se pudo liberar");
      }
    } catch (error) {
      Alert.alert("Error servidor");
    }
  };

  const handleEspacioClick = (espacio: any) => {
    if (espacio.estado === "libre") {
      setSelectedEspacio(espacio);

      if (usuarioEncontrado) {
        asignarUsuarioExistente(espacio);
      } else {
        setModalAsignar(true);
      }
      return;
    }

    Alert.alert(
      espacio.estado === "ocupado" ? "Ocupado" : "Por vencer",
      `Usuario: ${espacio.nombre}\nCédula: ${espacio.cedula}`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Liberar espacio", style: "destructive", onPress: () => liberarEspacio(espacio) },
      ]
    );
  };

  const asignarVisitante = async () => {
    if (!visitanteNombre || !visitantePlaca) {
      Alert.alert("Error", "Completa los datos");
      return;
    }

    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/asignar_visitante.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            nombre: visitanteNombre,
            placa: visitantePlaca,
            espacioId: selectedEspacio.id,
            token: token,
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("✅ Asignado");
        setModalAsignar(false);
        setVisitanteNombre("");
        setVisitantePlaca("");
        setSelectedEspacio(null);
        cargarTodo();
      }
    } catch {
      Alert.alert("Error servidor");
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (loading) return null;

  return (
    <>
      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <ThemedView style={styles.container}>
            <View style={styles.safeTop} />

            <ThemedView style={styles.header}>
              <ThemedText style={styles.title}>🔐 Seguridad</ThemedText>
              <TouchableOpacity onPress={handleLogout}>
                <ThemedText style={styles.logout}>Salir</ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <View style={styles.cameraContainer}>
              {!permission ? (
                <ThemedText style={{ color: '#fff' }}>Permiso...</ThemedText>
              ) : !permission.granted ? (
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <ThemedText style={{ color: '#fff' }}>Dar permiso a cámara</ThemedText>
                </TouchableOpacity>
              ) : (
                <CameraView
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  style={styles.camera}
                />
              )}
            </View>

            <TouchableOpacity onPress={() => setScanned(false)} style={styles.scanAgainBtn}>
              <ThemedText style={{ color: '#fff' }}>Escanear nuevamente</ThemedText>
            </TouchableOpacity>

            <View style={styles.cedulaContainer}>
              <ThemedText style={styles.sectionTitle}>Buscar por cédula</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ingresa cédula"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={cedulaManual}
                onChangeText={setCedulaManual}
              />
              <TouchableOpacity style={styles.btnBuscar} onPress={buscarPorCedula}>
                <ThemedText style={{ color: '#fff' }}>Buscar</ThemedText>
              </TouchableOpacity>
            </View>

            {placaDetectada !== "" && (
              <View style={styles.placaBox}>
                <ThemedText style={styles.placaText}>🚗 {placaDetectada}</ThemedText>
              </View>
            )}

            {usuarioEncontrado && (
              <View style={styles.usuarioBox}>
                <ThemedText style={styles.usuarioText}>👤 {usuarioEncontrado.nombre}</ThemedText>
                <ThemedText style={styles.usuarioSubtext}>🆔 {usuarioEncontrado.cedula}</ThemedText>
              </View>
            )}

            <ThemedText style={styles.sectionTitle}>Seleccionar zona</ThemedText>
            <View style={styles.zonasContainer}>
              {zonas.map((zona) => (
                <TouchableOpacity
                  key={zona.id}
                  onPress={() => seleccionarZona(zona)}
                  style={[styles.zonaBtn, { backgroundColor: zona.color }]}
                >
                  <ThemedText style={styles.zonaText}>{zona.nombre}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ThemedView>
        }
        data={espacios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleEspacioClick(item)}
            style={[
              styles.espacioBox,
              {
                backgroundColor:
                  item.estado === "libre"
                    ? "#22C55E"
                    : item.estado === "por vencer"
                      ? "#F59E0B"
                      : "#EF4444",
              }
            ]}
          >
            <ThemedText style={styles.espacioText}>{item.numero}</ThemedText>
          </TouchableOpacity>
        )}
        numColumns={5}
      />

      <Modal visible={modalAsignar} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalAsignar(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <ThemedText style={styles.modalTitle}>👤 Registrar visitante</ThemedText>
                <TextInput
                  placeholder="Nombre visitante"
                  value={visitanteNombre}
                  onChangeText={setVisitanteNombre}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Placa"
                  value={visitantePlaca}
                  onChangeText={setVisitantePlaca}
                  style={styles.input}
                />
                <TouchableOpacity onPress={asignarVisitante} style={styles.btn}>
                  <ThemedText style={{ color: '#fff' }}>Asignar espacio</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0F172A'
  },
  safeTop: {
    height: 35
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold'
  },
  logout: {
    color: '#fff',
    fontSize: 16
  },
  cameraContainer: {
    height: 260,
    overflow: 'hidden',
    borderRadius: 20,
    marginTop: 20,
    backgroundColor: '#1E293B'
  },
  camera: {
    flex: 1
  },
  permissionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanAgainBtn: {
    marginTop: 15,
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  cedulaContainer: {
    marginTop: 20,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
  },
  placaBox: {
    marginTop: 15,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center'
  },
  usuarioBox: {
    marginTop: 15,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
  },
  usuarioText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  usuarioSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  placaText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold'
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    marginBottom: 12,
    fontWeight: 'bold'
  },
  zonasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  zonaBtn: {
    width: '48%',
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 12,
    alignItems: 'center'
  },
  zonaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  espacioBox: {
    width: 58,
    height: 58,
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14
  },
  espacioText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 16,
    width: '85%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  input: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  btnBuscar: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btn: {
    backgroundColor: '#10B981',
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 10
  }
});
