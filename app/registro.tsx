import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function Registro() {
  const router = useRouter();

  const [claveAdmin, setClaveAdmin] = useState("");
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("estudiante");
  const [placa, setPlaca] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("carro");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const registrar = async () => {

    if (!nombre || !cedula || !password) {
      Alert.alert("Error", "Debes completar los datos");
      return;
    }

    if (rol === "admin") {

      if (!claveAdmin) {
        Alert.alert("Error", "Ingresa la clave de administrador");
        return;
      }

      if (claveAdmin.trim() !== "12345") {
        Alert.alert("Error", "Clave de administrador incorrecta");
        return;
      }

    } else {

      if (!placa) {
        Alert.alert("Error", "Debes ingresar la placa");
        return;
      }
    }
    try {

      const data = {
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        clave: password,
        rol: rol.toLowerCase(),
        placa: rol === "admin" ? "" : placa.toUpperCase().trim(),
        tipoVehiculo: rol === "admin" ? "" : tipoVehiculo.toLowerCase(),
        aceptaTerminos: aceptaTerminos ? 1 : 0,
      };
      const response = await fetch(
        "http://192.168.26.9/eficient-parking-lot/registro.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (result.success) {

        Alert.alert("✅ Registro exitoso");

        setNombre("");
        setCedula("");
        setPassword("");
        setPlaca("");
        setAceptaTerminos(false);

        router.replace("/login");

      } else {
        Alert.alert("Error", result.message || "Ocurrió un error");
      }

    } catch (error) {
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* 🔥 LOGO */}
      <Image
        source={require("./logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={[styles.titulo, { color: "#fff" }]}>
        REGISTRO DE USUARIO
      </Text>

      <Text style={[styles.subtitulo, { color: "#fff" }]}>
        Completa los datos para crear tu cuenta
      </Text>

      <Text style={[styles.label, { color: "#fff" }]}>Nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={nombre}
        onChangeText={setNombre}
      />

      <Text style={[styles.label, { color: "#fff" }]}>Cédula</Text>
      <TextInput
        style={styles.input}
        placeholder="Número de cédula"
        keyboardType="numeric"
        value={cedula}
        onChangeText={setCedula}
      />

      <Text style={[styles.label, { color: "#fff" }]}>Contraseña</Text>
      <TextInput
        style={styles.input}
        placeholder="********"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={[styles.label, { color: "#fff" }]}>Rol</Text>
      <View style={styles.row}>

        <TouchableOpacity
          style={[styles.boton, rol === "estudiante" && styles.activo]}
          onPress={() => setRol("estudiante")}
        >
          <Text>🧑‍🎓 Estudiante</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boton, rol === "admin" && styles.activo]}
          onPress={() => setRol("admin")}
        >
          <Text>👨‍💻 Admin</Text>
        </TouchableOpacity>

      </View>
      {/* 🔥 CAMBIO DINÁMICO SEGÚN ROL */}
      {rol === "admin" ? (
        <>
          <Text style={[styles.label, { color: "#fff" }]}>
            Clave de administrador
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Clave secreta"
            secureTextEntry
            value={claveAdmin}
            onChangeText={setClaveAdmin}
          />
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: "#fff" }]}>Placa</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC123"
            value={placa}
            onChangeText={(text) => setPlaca(text.toUpperCase())}
          />
        </>
      )}

      {/* 🔥 SOLO PARA ESTUDIANTES */}
      {rol !== "admin" && (
        <>
          <Text style={[styles.label, { color: "#fff" }]}>
            Tipo de vehículo
          </Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.boton, tipoVehiculo === "carro" && styles.activo]}
              onPress={() => setTipoVehiculo("carro")}
            >
              <Text>🚗 Carro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.boton, tipoVehiculo === "moto" && styles.activo]}
              onPress={() => setTipoVehiculo("moto")}
            >
              <Text>🏍️ Moto</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.row}>

        <TouchableOpacity
          style={[styles.boton, tipoVehiculo === "carro" && styles.activo]}
          onPress={() => setTipoVehiculo("carro")}
        >
          <Text>🚗 Carro</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boton, tipoVehiculo === "moto" && styles.activo]}
          onPress={() => setTipoVehiculo("moto")}
        >
          <Text>🏍️ Moto</Text>
        </TouchableOpacity>

      </View>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => setAceptaTerminos(!aceptaTerminos)}
      >
        <Text>
          {aceptaTerminos
            ? "☑ Acepto términos y condiciones"
            : "☐ Acepto términos y condiciones"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonGuardar} onPress={registrar}>
        <Text style={styles.textoGuardar}>
          GUARDAR
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.link}>
          ¿Ya tienes cuenta? Iniciar sesión
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    paddingBottom: 100,
    alignItems: "center"
  },

  logo: {
    width: 140,
    height: 140,
    marginBottom: 10
  },

  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitulo: {
    textAlign: "center",
    marginBottom: 20,
  },

  label: {
    fontWeight: "bold",
    marginTop: 10,
    alignSelf: "flex-start"
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
    backgroundColor: "#fff"
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    justifyContent: "center"
  },

  boton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    marginTop: 10,
  },

  activo: {
    backgroundColor: "#007AFF",
  },

  botonGuardar: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    marginTop: 25,
    alignItems: "center",
    width: "100%"
  },

  textoGuardar: {
    color: "#fff",
    fontWeight: "bold",
  },

  link: {
    textAlign: "center",
    marginTop: 20,
    color: "#007AFF",
  },
});