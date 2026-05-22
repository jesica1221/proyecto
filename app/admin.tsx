import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Config from '@/constants/config';
import AuthService from '@/services/auth';
import useAuthStore from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

export default function AdminScreen() {

  const router = useRouter();
  const { user, logout, token, getAuthHeaders, hasRole } = useAuthStore();

  const [zonas, setZonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [adminData, setAdminData] = useState<any>({
    libres: [],
    ocupados: [],
    porVencer: []
  });

  /* =========================
     ZONAS
  ========================= */
  const getZonaInfo = (id: number | string) => {

    switch (Number(id)) {

      case 1:
        return {
          nombre: "🏢 Administrativa",
          color: "#1D4ED8"
        };

      case 2:
        return {
          nombre: "📚 Biblioteca",
          color: "#2563EB"
        };

      case 3:
        return {
          nombre: "🎭 Auditorio",
          color: "#3B82F6"
        };

      case 4:
        return {
          nombre: "🍔 Cafetería",
          color: "#60A5FA"
        };

      case 5:
        return {
          nombre: "🧪 Laboratorios",
          color: "#93C5FD"
        };

      default:
        return {
          nombre: `Zona ${id}`,
          color: "#64748B"
        };
    }
  };

  /* =========================
     CARGAR DATA
  ========================= */
  const cargarAdmin = async () => {

    try {

      const response = await fetch(
        `${Config.API_BASE_URL}/admin_espacios.php`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (data?.success) {

        setAdminData({
          libres: data.libres || [],
          ocupados: data.ocupados || [],
          porVencer: data.porVencer || [],
        });

        const todos = [
          ...(data.libres || []),
          ...(data.ocupados || []),
          ...(data.porVencer || []),
        ];

        const zonasMap: any = {};

        todos.forEach((e: any) => {

          if (!zonasMap[e.zonaId]) {

            zonasMap[e.zonaId] = {
              id: e.zonaId,
              tipo: e.tipoVehiculo || "carro",
            };

          }

        });

        setZonas(Object.values(zonasMap));

      }

    } catch (error) {

      console.log("ERROR ADMIN:", error);

    }
  };

  /* =========================
     ABRIR ZONA
  ========================= */
  const abrirZona = (zona: any) => {

    const zonaInfo = getZonaInfo(zona.id);

    router.push({
      pathname: "/zona-admin" as any,
      params: {
        zonaId: zona.id,
        zonaNombre: zonaInfo.nombre,
        zonaColor: zonaInfo.color,
      },
    });

  };

  /* =========================
     EFFECT
  ========================= */
  useEffect(() => {

    if (!user || !token || !AuthService.validateToken(token) || !hasRole('admin')) {
      logout();
      router.replace('/login');
      return;
    }

    cargarAdmin();

    const interval = setInterval(() => {

      cargarAdmin();

    }, 5000);

    setLoading(false);

    return () => clearInterval(interval);

  }, [user]);

  /* =========================
     LOGOUT
  ========================= */
  const handleLogout = () => {

    logout();
    router.replace('/login');

  };

  /* =========================
     LOADING
  ========================= */
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

        <View style={styles.headerTop}>

          <View>

            <ThemedText type="title">
              🏫 Administrador
            </ThemedText>

            <ThemedText style={styles.userInfo}>
              {user?.nombre}
            </ThemedText>

          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >

            <ThemedText style={styles.logoutButtonText}>
              Salir
            </ThemedText>

          </TouchableOpacity>

        </View>

      </ThemedView>

      {/* CONTENIDO */}
      <ThemedView style={styles.content}>

        {/* ESTADÍSTICAS */}
        <ThemedText style={styles.sectionTitle}>
          📊 Estado General
        </ThemedText>

        <View style={styles.statsContainer}>

          <View
            style={[
              styles.statCard,
              { backgroundColor: '#22C55E' }
            ]}
          >

            <ThemedText style={styles.statNumber}>
              {adminData.libres.length}
            </ThemedText>

            <ThemedText style={styles.statLabel}>
              Libres
            </ThemedText>

          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: '#EF4444' }
            ]}
          >

            <ThemedText style={styles.statNumber}>
              {adminData.ocupados.length}
            </ThemedText>

            <ThemedText style={styles.statLabel}>
              Ocupados
            </ThemedText>

          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: '#F59E0B' }
            ]}
          >

            <ThemedText style={styles.statNumber}>
              {adminData.porVencer.length}
            </ThemedText>

            <ThemedText style={styles.statLabel}>
              Por vencer
            </ThemedText>

          </View>

        </View>

        {/* ZONAS */}
        <ThemedText style={styles.sectionTitle}>
          🗺️ Zonas
        </ThemedText>

        <View style={styles.zonasContainer}>

          {zonas.map((zona: any) => {

            const zonaInfo = getZonaInfo(zona.id);

            return (

              <TouchableOpacity
                key={zona.id}
                style={[
                  styles.zonaCard,
                  {
                    backgroundColor: zonaInfo.color
                  }
                ]}
                onPress={() => abrirZona(zona)}
              >

                <ThemedText style={styles.zonaTitle}>
                  {zonaInfo.nombre}
                </ThemedText>

                <ThemedText style={styles.zonaSubtitle}>
                  {zona.tipo.toUpperCase()}
                </ThemedText>

                <ThemedText style={styles.verMas}>
                  Ver espacios →
                </ThemedText>

              </TouchableOpacity>

            );

          })}

        </View>

      </ThemedView>

    </ScrollView>

  );
}

/* =========================
   ESTILOS
========================= */
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  header: {
    padding: 20,
    paddingTop: 45,
    backgroundColor: '#1E293B',
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  userInfo: {
    color: '#94A3B8',
    marginTop: 4,
  },

  logoutButton: {
    backgroundColor: '#334155',
    padding: 10,
    borderRadius: 10,
  },

  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  content: {
    padding: 16,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  statCard: {
    width: '31%',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },

  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#fff',
    marginTop: 5,
    fontSize: 13,
  },

  zonasContainer: {
    marginBottom: 30,
  },

  zonaCard: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 15,
  },

  zonaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  zonaSubtitle: {
    color: '#E2E8F0',
    marginTop: 5,
  },

  verMas: {
    color: '#fff',
    marginTop: 12,
    fontWeight: 'bold',
  },

});