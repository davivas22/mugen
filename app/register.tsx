import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { storage } from "../services/storage";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert,
  Modal,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from "react-native";
import WheelScrollPicker from "react-native-wheel-scrollview-picker";
import { useTranslation } from "react-i18next";
import { authApi } from "../services/api";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MIN_AGE = 18;

export default function RegisterScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const MONTHS = (i18n.resolvedLanguage ?? i18n.language ?? 'es').slice(0, 2) === 'en' ? MONTHS_EN : MONTHS_ES;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const [birthMonth, setBirthMonth] = useState(0); // índice 0-11
  const [birthDay, setBirthDay] = useState(1);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempDay, setTempDay] = useState(1);
  const [tempYear, setTempYear] = useState(currentYear - MIN_AGE);

  const birthdateStr = birthYear
    ? `${birthYear}-${String(birthMonth + 1).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`
    : null;

  const openDatePicker = () => {
    setTempMonth(birthMonth);
    setTempDay(birthDay);
    setTempYear(birthYear ?? currentYear - MIN_AGE);
    setShowDatePicker(true);
  };

  const confirmDatePicker = () => {
    setBirthMonth(tempMonth);
    setBirthDay(tempDay);
    setBirthYear(tempYear);
    setShowDatePicker(false);
  };

  const isAdult = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age >= MIN_AGE;
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !birthdateStr) {
      Alert.alert(t('common.error'), t('auth.fillAll'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordMin6'));
      return;
    }
    if (!isAdult(birthdateStr)) {
      Alert.alert(t('common.error'), t('auth.mustBeAdult'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.register(name, email, password, birthdateStr);
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
      const fieldErrors = error?.response?.data?.errors;
      const firstFieldMsg = fieldErrors ? (Object.values(fieldErrors)[0] as string[])?.[0] : null;
      const msg = firstFieldMsg || error?.response?.data?.message || t('auth.registerError');
      Alert.alert(t('common.error'), msg);
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
        <Text style={styles.title}>{t('auth.createAccount')}</Text>
        <Text style={styles.subtitle}>{t('auth.freeFast')}</Text>

        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#ff4da6" style={{ marginRight: 10 }} />
          <TextInput
            placeholder={t('auth.name')}
            placeholderTextColor="#999"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#ff4da6" style={{ marginRight: 10 }} />
          <TextInput
            placeholder={t('auth.email')}
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
            placeholder={t('auth.passwordMinPlaceholder')}
            placeholderTextColor="#999"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.inputContainer} onPress={openDatePicker}>
          <Ionicons name="calendar" size={20} color="#ff4da6" style={{ marginRight: 10 }} />
          <Text style={[styles.input, !birthdateStr && { color: "#999" }]}>
            {birthdateStr ? t('auth.birthdateValue', { day: birthDay, month: MONTHS[birthMonth], year: birthYear }) : t('auth.birthdate')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.createAccountBtn')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.loginText}>
          {t('auth.hasAccount')}{" "}
          <Text style={styles.loginLink} onPress={() => router.push("/login")}>
            {t('auth.loginCta')}
          </Text>
        </Text>
      </View>

      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('auth.birthdate')}</Text>
            <View style={styles.pickerRow}>
              <WheelScrollPicker
                dataSource={MONTHS}
                selectedIndex={tempMonth}
                onValueChange={(_data, index) => setTempMonth(index)}
                wrapperHeight={180} wrapperWidth={130} itemHeight={40}
                highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
              />
              <WheelScrollPicker
                dataSource={Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))}
                selectedIndex={tempDay - 1}
                onValueChange={(_data, index) => setTempDay(index + 1)}
                wrapperHeight={180} wrapperWidth={70} itemHeight={40}
                highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
              />
              <WheelScrollPicker
                dataSource={Array.from({ length: 90 }, (_, i) => String(currentYear - i))}
                selectedIndex={currentYear - tempYear}
                onValueChange={(_data, index) => setTempYear(currentYear - index)}
                wrapperHeight={180} wrapperWidth={90} itemHeight={40}
                highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#f5f5f5" }]} onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.modalBtnText, { color: "#000" }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#000" }]} onPress={confirmDatePicker}>
                <Text style={styles.modalBtnText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
