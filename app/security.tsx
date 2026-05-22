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

  const [loading, setLoading] = useState(true);

  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);

  // 🅿️ ESPACIOS
  const [zonas, setZonas] = useState<any[]>([]);

  const [todosEspacios, setTodosEspacios] = useState<any[]>([]);

  const [espacios, setEspacios] = useState<any[]>([]);

  // 👤 VISITANTES
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

  /* ========================================
      ESCANEAR QR / PLACA
  ======================================== */

  const handleBarCodeScanned = ({ data }: any) => {

    setScanned(true);

    // QR
    if (data.includes("USER-")) {

      handleVerifyQRWithData(data);

      return;

    }

    // PLACA
    manejarPlacaEscaneada(data);

  };

  /* ========================================
      MANEJAR PLACA
  ======================================== */

  const manejarPlacaEscaneada = async (
    placaEscaneada: string
  ) => {

    try {

      const placaLimpia = placaEscaneada
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      setPlacaDetectada(placaLimpia);

      // ¿YA TIENE PARQUEADERO?

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
          }),
        }
      );

      const activaData = await responseActiva.json();

      if (activaData.tieneParqueadero) {

        const usuario = activaData.usuario;

        Alert.alert(
          "✅ Parqueadero activo",

          `Usuario: ${usuario.nombre}
Placa: ${usuario.placa}
Espacio: ${usuario.numero}`
        );

        return;

      }

      // BUSCAR USUARIO

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
          }),
        }
      );

      const usuarioData = await responseUsuario.json();

      if (usuarioData.registrado) {

        setUsuarioEncontrado(
          usuarioData.usuario
        );

        Alert.alert(
          "🚗 Usuario registrado",

          `${usuarioData.usuario.nombre}
Seleccione un espacio`
        );

        return;

      }

      // CREAR VISITANTE

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
          }),
        }
      );

      const visitanteData =
        await responseVisitante.json();

      if (visitanteData.success) {

        setUsuarioEncontrado(
          visitanteData.usuario
        );

        Alert.alert(
          "👤 Visitante creado",
          "Seleccione un espacio"
        );

      }

    } catch (error) {

      console.log(error);

      Alert.alert(
        "Error",
        "No se pudo procesar la placa"
      );

    }

  };

  /* ========================================
      VALIDAR QR
  ======================================== */

  const handleVerifyQRWithData = (
    dataQR: string
  ) => {

    const parts = dataQR.split('-');

    if (
      parts[0] !== 'USER' ||
      parts[3] !== 'ESPACIO'
    ) {

      Alert.alert(
        'Error',
        'Código QR inválido'
      );

      return;

    }

    const nombre = parts[1];

    Alert.alert(
      '✅ Acceso permitido',
      `Usuario: ${nombre}`
    );

  };

  /* ========================================
      CARGAR ESPACIOS
  ======================================== */

  const cargarTodo = async () => {

    try {

      const res = await fetch(
        `${Config.API_BASE_URL}/admin_espacios.php`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        }
      );

      const data = await res.json();

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

            case 1:
              nombre = "🏢 Administrativa";
              color = "#1D4ED8";
              break;

            case 2:
              nombre = "📚 Biblioteca";
              color = "#2563EB";
              break;

            case 3:
              nombre = "🎭 Auditorio";
              color = "#3B82F6";
              break;

            case 4:
              nombre = "🍔 Cafetería";
              color = "#60A5FA";
              break;

            case 5:
              nombre = "🧪 Laboratorios";
              color = "#93C5FD";
              break;

          }

          zonasMap[e.zonaId] = {

            id: e.zonaId,

            nombre,

            color

          };

        }

      });

      setZonas(
        Object.values(zonasMap)
      );

    } catch (error) {

      console.log(error);

    }

  };

  /* ========================================
      FILTRAR ZONA
  ======================================== */

  const seleccionarZona = (zona: any) => {

    const filtrados = todosEspacios.filter(
      (e: any) =>
        Number(e.zonaId) === Number(zona.id)
    );

    setEspacios(filtrados);

  };

  /* ========================================
      ASIGNAR USUARIO
  ======================================== */

  const asignarUsuarioExistente = async (
    espacio: any
  ) => {

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

            espacioId: espacio.id

          })
        }
      );

      const data = await response.json();

      if (data.success) {

        Alert.alert(
          "✅ Parqueadero asignado"
        );

        setUsuarioEncontrado(null);

        setPlacaDetectada("");

        cargarTodo();

      } else {

        Alert.alert(
          "Error",
          data.message || "No se pudo asignar"
        );

      }

    } catch (error) {

      console.log(error);

      Alert.alert(
        "Error servidor"
      );

    }

  };

  /* ========================================
      CLICK ESPACIO
  ======================================== */

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

  const handleEspacioClick = (
    espacio: any
  ) => {

    if (espacio.estado === "libre") {

      setSelectedEspacio(espacio);

      if (usuarioEncontrado) {

        asignarUsuarioExistente(
          espacio
        );

      } else {

        setModalAsignar(true);

      }

      return;

    }

    Alert.alert(
      espacio.estado === "ocupado" ? "Ocupado" : "Por vencer",

      `Usuario: ${espacio.nombre}
Cédula: ${espacio.cedula}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Liberar espacio",
          style: "destructive",
          onPress: () => liberarEspacio(espacio),
        },
      ]
    );

  };

  /* ========================================
      VISITANTE MANUAL
  ======================================== */

  const asignarVisitante = async () => {

    if (
      !visitanteNombre ||
      !visitantePlaca
    ) {

      Alert.alert(
        "Error",
        "Completa los datos"
      );

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

            espacioId: selectedEspacio.id

          })
        }
      );

      const data = await response.json();

      if (data.success) {

        Alert.alert(
          "✅ Asignado"
        );

        setModalAsignar(false);

        setVisitanteNombre("");

        setVisitantePlaca("");

        cargarTodo();

      }

    } catch {

      Alert.alert(
        "Error servidor"
      );

    }

  };

  /* ========================================
      LOGOUT
  ======================================== */

  const handleLogout = () => {

    logout();

    router.replace('/login');

  };

  if (loading) return null;

  return (

    <>

      <FlatList

        contentContainerStyle={{
          paddingBottom: 40
        }}

        ListHeaderComponent={

          <ThemedView style={styles.container}>

            <View style={styles.safeTop} />

            {/* HEADER */}
            <ThemedView style={styles.header}>

              <ThemedText style={styles.title}>
                🔐 Seguridad
              </ThemedText>

              <TouchableOpacity
                onPress={handleLogout}
              >

                <ThemedText style={styles.logout}>
                  Salir
                </ThemedText>

              </TouchableOpacity>

            </ThemedView>

            {/* CÁMARA */}
            <View style={styles.cameraContainer}>

              {!permission ? (

                <ThemedText style={{ color: '#fff' }}>
                  Permiso...
                </ThemedText>

              ) : !permission.granted ? (

                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={requestPermission}
                >

                  <ThemedText style={{ color: '#fff' }}>
                    Dar permiso a cámara
                  </ThemedText>

                </TouchableOpacity>

              ) : (

                <CameraView
                  onBarcodeScanned={
                    scanned
                      ? undefined
                      : handleBarCodeScanned
                  }

                  style={styles.camera}
                />

              )}

            </View>

            {/* REESCANEAR */}
            <TouchableOpacity
              onPress={() => setScanned(false)}
              style={styles.scanAgainBtn}
            >

              <ThemedText style={{ color: '#fff' }}>
                Escanear nuevamente
              </ThemedText>

            </TouchableOpacity>

            {/* PLACA */}
            {placaDetectada !== "" && (

              <View style={styles.placaBox}>

                <ThemedText style={styles.placaText}>
                  🚗 {placaDetectada}
                </ThemedText>

              </View>

            )}

            {/* ZONAS */}
            <ThemedText style={styles.sectionTitle}>
              Seleccionar zona
            </ThemedText>

            <View style={styles.zonasContainer}>

              {zonas.map((zona) => (

                <TouchableOpacity

                  key={zona.id}

                  onPress={() =>
                    seleccionarZona(zona)
                  }

                  style={[
                    styles.zonaBtn,
                    {
                      backgroundColor:
                        zona.color
                    }
                  ]}
                >

                  <ThemedText style={styles.zonaText}>
                    {zona.nombre}
                  </ThemedText>

                </TouchableOpacity>

              ))}

            </View>

          </ThemedView>

        }

        data={espacios}

        keyExtractor={(item) =>
          item.id.toString()
        }

        renderItem={({ item }) => (

          <TouchableOpacity

            onPress={() =>
              handleEspacioClick(item)
            }

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

            <ThemedText style={styles.espacioText}>
              {item.numero}
            </ThemedText>

          </TouchableOpacity>

        )}

        numColumns={5}

      />

      {/* MODAL */}
      <Modal
        visible={modalAsignar}
        transparent
        animationType="fade"
      >

        <TouchableWithoutFeedback
          onPress={() => setModalAsignar(false)}
        >

          <View style={styles.modalOverlay}>

            <TouchableWithoutFeedback>

              <View style={styles.modalBox}>

                <ThemedText style={styles.modalTitle}>
                  👤 Registrar visitante
                </ThemedText>

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

                <TouchableOpacity
                  onPress={asignarVisitante}
                  style={styles.btn}
                >

                  <ThemedText style={{ color: '#fff' }}>
                    Asignar espacio
                  </ThemedText>

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

  placaBox: {
    marginTop: 15,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center'
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

  btn: {
    backgroundColor: '#10B981',
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 10
  }

});