import Config from '@/constants/config';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function Registro() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("estudiante");
  const [placa, setPlaca] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("carro");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [claveAdmin, setClaveAdmin] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const registrar = async () => {
    setError("");
    setMensaje("");

    if (!nombre || !cedula || !password) {
      setError("Debes completar nombre, cédula y contraseña.");
      return;
    }

    if (rol === "estudiante" && !placa) {
      setError("Debes ingresar la placa del vehículo.");
      return;
    }

    if (rol === "admin" || rol === "seguridad") {
      if (!claveAdmin) {
        setError("Ingresa la clave de registro autorizada.");
        return;
      }
    }

    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/registro.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombre.trim(),
            cedula: cedula.trim(),
            clave: password,
            rol: rol.toLowerCase(),
            placa: placa.toUpperCase().trim(),
            tipoVehiculo: tipoVehiculo.toLowerCase(),
            aceptaTerminos: aceptaTerminos ? '1' : '0',
            claveAdmin,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        router.replace({ pathname: "/login", params: { registered: "1" } });
      } else {
        setError(result.message || "No fue posible crear la cuenta.");
      }
    } catch {
      setError("No se pudo conectar al servidor. Revisa que la API esté iniciada e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
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

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#64748B"
        value={nombre}
        onChangeText={setNombre}
      />

      <Text style={styles.label}>Cédula</Text>
      <TextInput
        style={styles.input}
        placeholder="Número de cédula"
        placeholderTextColor="#64748B"
        keyboardType="numeric"
        value={cedula}
        onChangeText={setCedula}
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        placeholder="********"
        placeholderTextColor="#64748B"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Rol</Text>
      <View style={styles.row}>

        <TouchableOpacity
          style={[styles.boton, rol === "estudiante" && styles.activo]}
          onPress={() => setRol("estudiante")}
        >
          <Text style={{ color: rol === "estudiante" ? "#fff" : "#94A3B8" }}>🧑‍🎓 Usuario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boton, rol === "admin" && styles.activo]}
          onPress={() => setRol("admin")}
        >
          <Text style={{ color: rol === "admin" ? "#fff" : "#94A3B8" }}>👨‍💻 Administrador</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boton, rol === "seguridad" && styles.activo]}
          onPress={() => setRol("seguridad")}
        >
          <Text style={{ color: rol === "seguridad" ? "#fff" : "#94A3B8" }}>👮 Seguridad</Text>
        </TouchableOpacity>

      </View>

      {rol === "estudiante" ? (
        <View>
          <Text style={styles.label}>Placa</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC123"
            placeholderTextColor="#64748B"
            value={placa}
            onChangeText={(text) => setPlaca(text.toUpperCase())}
          />

          <Text style={styles.label}>
            Tipo de vehículo
          </Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.boton, tipoVehiculo === "carro" && styles.activo]}
              onPress={() => setTipoVehiculo("carro")}
            >
              <Text style={{ color: tipoVehiculo === "carro" ? "#fff" : "#94A3B8" }}>🚗 Carro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.boton, tipoVehiculo === "moto" && styles.activo]}
              onPress={() => setTipoVehiculo("moto")}
            >
              <Text style={{ color: tipoVehiculo === "moto" ? "#fff" : "#94A3B8" }}>🏍️ Moto</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.label}>
            Clave de administrador
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Clave secreta"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={claveAdmin}
            onChangeText={setClaveAdmin}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.terminos, { backgroundColor: "transparent" }]}
        onPress={() => setAceptaTerminos(!aceptaTerminos)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceptaTerminos }}
      >
        <Text style={{ color: "#94A3B8" }}>
          {aceptaTerminos ? "☑ " : "☐ "}Acepto términos y condiciones
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          Linking.openURL(
            "https://www.minjusticia.gov.co/ministerio/Documents/SIG/_pol%C3%ADtica%20de%20tratamiento%20y%20protecci%C3%B3n%20datos%20personales.pdf"
          )
        }
      >
        <Text style={[styles.link, { marginTop: 12 }]}>Leer política de tratamiento de datos</Text>
      </TouchableOpacity>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {mensaje ? <Text accessibilityRole="alert" style={styles.success}>{mensaje}</Text> : null}

      <TouchableOpacity
        style={[styles.botonGuardar, guardando && { opacity: 0.7 }]}
        onPress={registrar}
        disabled={guardando}
      >
        <Text style={styles.textoGuardar}>
          {guardando ? "CREANDO CUENTA..." : "GUARDAR"}
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
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: "stretch",
    backgroundColor: "#0F172A",
    flexGrow: 1,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 10,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitulo: {
    textAlign: "center",
    marginBottom: 20,
    color: "#94A3B8",
    fontSize: 16,
  },
  label: {
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 5,
    alignSelf: "flex-start",
    color: "#CBD5E1",
    fontSize: 14,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  rowVehiculo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  boton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 6,
    marginTop: 10,
    alignItems: "center",
  },
  activo: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
  },
  botonGuardar: {
    backgroundColor: "#10B981", // Emerald Green for success/save
    padding: 16,
    borderRadius: 12,
    marginTop: 25,
    alignItems: "center",
    width: "100%",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  textoGuardar: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  terminos: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    marginTop: 25,
  },
  error: {
    color: "#FCA5A5",
    textAlign: "center",
    marginTop: 14,
    fontSize: 14,
  },
  success: {
    color: "#6EE7B7",
    textAlign: "center",
    marginTop: 14,
    fontSize: 14,
  },
  link: {
    textAlign: "center",
    marginTop: 35,
    color: "#94A3B8",
    fontSize: 15,
  },
});
