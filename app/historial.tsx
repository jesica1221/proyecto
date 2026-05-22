import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import useAuthStore from "@/store/useAuthStore";
import Config from "@/constants/config";

interface HistorialItem {
  id: string;
  fecha: string;
  horaIngreso: string;
  horaSalida: string | null;
  zona: string;
  espacio: string;
  placa: string;
}

export default function Historial() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarHistorial = async () => {
    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/historial.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cedula: user?.cedula }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setHistorial(result.historial);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderItem = ({ item }: { item: HistorialItem }) => (
    <ThemedView style={styles.item}>
      <ThemedView style={styles.itemHeader}>
        <ThemedText style={styles.date}>{formatDate(item.fecha)}</ThemedText>
        <ThemedText
          style={[
            styles.status,
            item.horaSalida ? styles.statusCompletado : styles.statusActivo,
          ]}
        >
          {item.horaSalida ? "Completado" : "Activo"}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.itemDetails}>
        <ThemedText style={styles.detail}>
          📍 {item.zona} - Espacio {item.espacio}
        </ThemedText>
        <ThemedText style={styles.detail}>🚗 Placa: {item.placa}</ThemedText>
        <ThemedText style={styles.detail}>
          ⏰ Ingreso: {item.horaIngreso}
          {item.horaSalida && ` - Salida: ${item.horaSalida}`}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backButton}>← Volver</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.title}>Historial de Parqueo</ThemedText>
        <View style={{ width: 60 }} />
      </ThemedView>

      {loading ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <ThemedText style={styles.loadingText}>Cargando historial...</ThemedText>
        </ThemedView>
      ) : historial.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            No tienes registros de parqueo aún
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={historial}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 45,
    backgroundColor: "#1E293B",
  },
  backButton: {
    color: "#60A5FA",
    fontSize: 16,
    width: 60,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 16,
    textAlign: "center",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  item: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  date: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "bold",
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompletado: {
    backgroundColor: "#10B981",
    color: "#fff",
  },
  statusActivo: {
    backgroundColor: "#F59E0B",
    color: "#fff",
  },
  itemDetails: {
    gap: 6,
  },
  detail: {
    color: "#94A3B8",
    fontSize: 14,
  },
});
