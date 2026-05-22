import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Config from "@/constants/config";

export default function RecuperarContrasena() {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [paso, setPaso] = useState(1);

  const verificarUsuario = async () => {
    if (!cedula) {
      Alert.alert("Error", "Ingresa tu cédula");
      return;
    }

    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/verificar_usuario.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cedula }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setPaso(2);
      } else {
        Alert.alert("Error", result.message || "Usuario no encontrado");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  const cambiarContrasena = async () => {
    if (!nuevaContrasena || !confirmarContrasena) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/cambiar_contrasena.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cedula,
            nuevaContrasena,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        Alert.alert("✅ Contraseña actualizada", "", [
          { text: "OK", onPress: () => router.replace("/login") },
        ]);
      } else {
        Alert.alert("Error", result.message || "Ocurrió un error");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("./logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.titulo}>RECUPERAR CONTRASEÑA</Text>
      <Text style={styles.subtitle}>
        {paso === 1
          ? "Ingresa tu cédula para verificar tu cuenta"
          : "Crea una nueva contraseña"}
      </Text>

      {paso === 1 ? (
        <>
          <Text style={styles.label}>CÉDULA</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa tu cédula"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            value={cedula}
            onChangeText={setCedula}
          />

          <TouchableOpacity style={styles.boton} onPress={verificarUsuario}>
            <Text style={styles.texto}>VERIFICAR</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>NUEVA CONTRASEÑA</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={nuevaContrasena}
            onChangeText={setNuevaContrasena}
          />

          <Text style={styles.label}>CONFIRMAR CONTRASEÑA</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={confirmarContrasena}
            onChangeText={setConfirmarContrasena}
          />

          <TouchableOpacity style={styles.boton} onPress={cambiarContrasena}>
            <Text style={styles.texto}>CAMBIAR CONTRASEÑA</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.link}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#0F172A",
  },
  logo: {
    width: 130,
    height: 130,
    alignSelf: "center",
    marginBottom: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1,
    color: "#fff",
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 35,
  },
  label: {
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 5,
    color: "#CBD5E1",
    fontSize: 14,
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
  boton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    marginTop: 35,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  texto: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  link: {
    textAlign: "center",
    marginTop: 25,
    color: "#60A5FA",
    fontSize: 15,
  },
});
