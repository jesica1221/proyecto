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
  View
} from "react-native";

export default function Login() {

  const router = useRouter();
  const { setUser } = useAuth();

  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");

  const iniciarSesion = async () => {

    console.log("BOTON INICIAR SESIÓN PRESIONADO");

    if (!cedula || !password) {
      Alert.alert("Error", "Ingresa cédula y contraseña");
      return;
    }

    try {

      console.log("ANTES DEL FETCH");

      const response = await fetch("http://192.168.26.9/eficient-parking-lot/login.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `cedula=${cedula}&password=${password}`
      });

      console.log("DESPUES DEL FETCH");

      const data = await response.json();

      console.log("DATA COMPLETA:", data);
      console.log("ZONA QUE LLEGA:", data?.zona || data?.user?.zona);

      if (!data || !data.success) {
        Alert.alert("Error", data?.message || "Credenciales incorrectas");
        return;
      }

      const userData = data.user ? {
        ...data.user,
        zona: data.user.zona
      } : {
        nombre: data.nombre,
        cedula: data.cedula,
        rol: data.rol,
        placa: data.placa,
        tipoVehiculo: data.tipoVehiculo,
        zona: data.zona
      };

      console.log("USUARIO FINAL:", userData);

      setUser(userData);

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

  return (

    <View style={styles.container}>

      {/* 🔥 LOGO */}
      <Image
        source={require('./logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* 🔥 TITULO */}
      <Text style={[styles.titulo, { color: '#fff' }]}>
        EFICIENT PARKING LOT
      </Text>

      <Text style={styles.subtitle}>
        Eficiencia de parqueo a un click
      </Text>

      <Text style={styles.label}>CÉDULA</Text>

      <TextInput
        style={styles.input}
        placeholder="Ingresa tu cédula"
        keyboardType="numeric"
        value={cedula}
        onChangeText={setCedula}
      />

      <Text style={styles.label}>CONTRASEÑA</Text>

      <TextInput
        style={styles.input}
        placeholder="********"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.boton} onPress={iniciarSesion}>
        <Text style={styles.texto}>INICIAR SESIÓN</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/registro")}>
        <Text style={styles.link}>
          ¿No tienes cuenta? Registrarse
        </Text>
      </TouchableOpacity>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#2C3E50"
  },

  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 10
  },

  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10
  },

  subtitle: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 25
  },

  label: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#fff"
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
    backgroundColor: "#fff"
  },

  boton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginTop: 25,
    alignItems: "center"
  },

  texto: {
    color: "#fff",
    fontWeight: "bold"
  },

  link: {
    textAlign: "center",
    marginTop: 20,
    color: "#fff"
  }

});