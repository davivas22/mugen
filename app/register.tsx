import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { storage } from "../services/storage";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from "react-native";
import { authApi } from "../services/api";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Completa todos los campos.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.register(name, email, password);
      const token = data.token ?? data.access_token ?? "";
      const user = data.user ?? {};
      try {
        await storage.set("token", token);
        await storage.set("user", JSON.stringify(user));
      } catch (storeErr) {
        console.warn("SecureStore error:", storeErr);
      }
      router.dismissAll();
      router.replace("/(tabs)");
    } catch (error: any) {
      const msg = error?.response?.data?.message || "No se pudo crear la cuenta.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={26} color="#000" />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Crea tu cuenta</Text>
        <Text style={styles.subtitle}>Es gratis y solo toma un momento.</Text>

        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#ff4da6" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Nombre"
            placeholderTextColor="#999"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#ff4da6" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#ff4da6" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Contraseña (mín. 6 caracteres)"
            placeholderTextColor="#999"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Crear cuenta</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.loginText}>
          ¿Ya tienes cuenta?{" "}
          <Text style={styles.loginLink} onPress={() => router.push("/login")}>
            Iniciar sesión
          </Text>
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
  card: {
    width: "90%",
    padding: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#000",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 25,
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    color: "#000",
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loginText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
  loginLink: {
    color: "#ff4da6",
    fontWeight: "bold",
  },
});
