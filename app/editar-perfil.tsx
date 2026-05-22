import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import useAuthStore from "@/store/useAuthStore";
import Config from "@/constants/config";

export default function EditarPerfil() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [nombre, setNombre] = useState(user?.nombre || "");
  const [placa, setPlaca] = useState(user?.placa || "");
  const [loading, setLoading] = useState(false);

  const guardarCambios = async () => {
    if (!nombre) {
      Alert.alert("Error", "El nombre no puede estar vacío");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/actualizar_usuario.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cedula: user?.cedula,
            nombre,
            placa,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setUser({ ...user!, nombre, placa });
        Alert.alert("✅ Perfil actualizado", "", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", result.message || "Ocurrió un error");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar al servidor");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backButton}>← Volver</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.title}>Editar Perfil</ThemedText>
        <View style={{ width: 60 }} />
      </ThemedView>

      <ThemedView style={styles.form}>
        <ThemedText style={styles.label}>Nombre</ThemedText>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholderTextColor="#64748B"
        />

        {user.rol === "student" && (
          <>
            <ThemedText style={styles.label}>Placa</ThemedText>
            <TextInput
              style={styles.input}
              value={placa}
              onChangeText={(text) => setPlaca(text.toUpperCase())}
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={guardarCambios}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? "Guardando..." : "GUARDAR CAMBIOS"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
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
  form: {
    padding: 20,
    gap: 15,
  },
  label: {
    color: "#CBD5E1",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#64748B",
    shadowColor: "transparent",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
