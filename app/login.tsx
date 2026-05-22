import { useAuth } from "@/context/AuthContext";
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

/* =========================
   Componente Login
========================= */
export default function Login() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  /* ===== Estados ===== */
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");

  /* =========================
     Función iniciar sesión
  ========================= */
  const iniciarSesion = async () => {
    console.log("BOTON INICIAR SESIÓN PRESIONADO");

    /* ===== Validación ===== */
    if (!cedula || !password) {
      Alert.alert("Error", "Ingresa cédula y contraseña");
      return;
    }

    try {
      console.log("ANTES DEL FETCH");

      const response = await fetch(
        "http://192.168.1.40/eficient-parking-lot/login.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `cedula=${cedula}&password=${password}`,
        }
      );

      console.log("DESPUES DEL FETCH");

      const data = await response.json();

      /* ===== Debug ===== */
      console.log("DATA COMPLETA:", data);
      console.log("ZONA QUE LLEGA:", data?.zona || data?.user?.zona);

      /* ===== Validación respuesta ===== */
      if (!data || !data.success) {
        Alert.alert("Error", data?.message || "Credenciales incorrectas");
        return;
      }

      /* ===== Construcción del usuario ===== */
      const userData = data.user
        ? {
          ...data.user,
          zona: data.user.zona,
        }
        : {
          nombre: data.nombre,
          cedula: data.cedula,
          rol: data.rol,
          placa: data.placa,
          tipoVehiculo: data.tipoVehiculo,
          zona: data.zona,
        };

      console.log("USUARIO FINAL:", userData);

      /* ===== Guardar usuario ===== */
      setUser(userData);

      /* ===== Redirección por rol ===== */
      console.log("ROL QUE LLEGA:", userData?.rol);
      const rol = (userData?.rol || "").toLowerCase().trim();
      console.log("ROL:", rol);

      if (rol.includes("admin")) {
        router.replace("/admin");
      } else if (rol.includes("student") || rol === "estudiante") {
        router.replace("/student");
      } else if (rol.includes("security") || rol === "seguridad") {
        router.replace("/security");
      } else {
        Alert.alert("Error", "Rol no reconocido: " + rol);
      }
    } catch (error) {
      console.log("ERROR EN EL FETCH", error);
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  /* =========================
     Render
  ========================= */
  return (
    <View style={styles.container}>
      {/* ===== Logo ===== */}
      <Image
        source={require("./logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* ===== Títulos ===== */}
      <Text style={[styles.titulo, { color: "#fff" }]}>
        EFICIENT PARKING LOT
      </Text>
      <Text style={styles.subtitle}>
        Eficiencia de parqueo a un click
      </Text>

      {/* ===== Input Cédula ===== */}
      <Text style={styles.label}>CÉDULA</Text>
      <TextInput
        style={styles.input}
        placeholder="Ingresa tu cédula"
        placeholderTextColor="#64748B"
        keyboardType="numeric"
        value={cedula}
        onChangeText={setCedula}
      />

      {/* ===== Input Contraseña ===== */}
      <Text style={styles.label}>CONTRASEÑA</Text>
      <TextInput
        style={styles.input}
        placeholder="********"
        placeholderTextColor="#64748B"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* ===== Botón Login ===== */}
      <TouchableOpacity style={styles.boton} onPress={iniciarSesion}>
        <Text style={styles.texto}>INICIAR SESIÓN</Text>
      </TouchableOpacity>

      {/* ===== Link Registro ===== */}
      <TouchableOpacity onPress={() => router.push("/registro")}>
        <Text style={styles.link}>
          ¿No tienes cuenta? Registrarse
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================
   Estilos
========================= */
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