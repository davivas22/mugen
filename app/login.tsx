import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { storage } from "../services/storage";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { authApi } from "../services/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      const token = data.token ?? data.access_token ?? "";
      const user = data.user ?? {};
      try {
        await storage.set("token", token);
        await storage.set("user", JSON.stringify(user));
      } catch (storeErr) {
        console.warn("SecureStore error:", storeErr);
      }
      console.log('[LOGIN] router.replace antes');
      router.dismissAll();
      router.replace("/(tabs)");
      console.log('[LOGIN] router.replace después');
    } catch (error: any) {
      const msg = error?.response?.data?.message || "No se pudo iniciar sesión.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/onboarding")}>
        <Ionicons name="arrow-back" size={26} color="#000" />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitle}>Inicia sesión</Text>

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
            placeholder="Contraseña"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity onPress={login} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
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
    marginBottom: 25,
    color: "#666",
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
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
});
