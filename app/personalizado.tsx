import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WheelScrollPicker from "react-native-wheel-scrollview-picker";

export default function PersonalizadoScreen() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState("");
  const [month, setMonth] = useState("Enero");
  const [day, setDay] = useState("01");
  const [year, setYear] = useState("2000");
  const [height, setHeight] = useState("170 cm");
  const [weight, setWeight] = useState("70 kg");

  const TOTAL_STEPS = 3;
  const progress = step / TOTAL_STEPS;

  const back = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const next = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else {
      router.dismissAll();
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={back}>
          <Ionicons name="arrow-back" size={26} color="#000" />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* STEP 1 — Género */}
      {step === 1 && (
        <>
          <Text style={styles.title}>Elige tu género</Text>
          <Text style={styles.subtitle}>Esto se usará para ajustar tu plan.</Text>

          <View style={styles.options}>
            {["Femenino", "Masculino", "Otro"].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.option, gender === item && styles.optionSelected]}
                onPress={() => setGender(item)}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, !gender && { opacity: 0.3 }]}
            disabled={!gender}
            onPress={next}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </>
      )}

      {/* STEP 2 — Fecha de nacimiento */}
      {step === 2 && (
        <>
          <Text style={styles.title}>¿Cuándo naciste?</Text>
          <Text style={styles.subtitle}>Se usa para calcular tus objetivos nutricionales.</Text>

          <View style={styles.pickerRow}>
            <WheelScrollPicker
              dataSource={["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]}
              selectedIndex={0}
              onValueChange={(data) => setMonth(data)}
              wrapperHeight={180} wrapperWidth={120} itemHeight={40}
              highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
            />
            <WheelScrollPicker
              dataSource={Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))}
              selectedIndex={0}
              onValueChange={(data) => setDay(data)}
              wrapperHeight={180} wrapperWidth={80} itemHeight={40}
              highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
            />
            <WheelScrollPicker
              dataSource={Array.from({ length: 50 }, (_, i) => String(1980 + i))}
              selectedIndex={20}
              onValueChange={(data) => setYear(data)}
              wrapperHeight={180} wrapperWidth={100} itemHeight={40}
              highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={next}>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </>
      )}

      {/* STEP 3 — Altura y peso */}
      {step === 3 && (
        <>
          <Text style={styles.title}>Altura y peso</Text>
          <Text style={styles.subtitle}>Se usa para tu plan diario.</Text>

          <View style={styles.pickerRow}>
            <WheelScrollPicker
              dataSource={Array.from({ length: 100 }, (_, i) => `${140 + i} cm`)}
              selectedIndex={30}
              onValueChange={(data) => setHeight(data)}
              wrapperHeight={180} wrapperWidth={120} itemHeight={40}
              highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
            />
            <WheelScrollPicker
              dataSource={Array.from({ length: 100 }, (_, i) => `${40 + i} kg`)}
              selectedIndex={30}
              onValueChange={(data) => setWeight(data)}
              wrapperHeight={180} wrapperWidth={120} itemHeight={40}
              highlightBorderWidth={2} itemTextStyle={{ color: "#000" }}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={next}>
            <Text style={styles.buttonText}>Empezar</Text>
          </TouchableOpacity>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 50,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 10,
    marginLeft: 15,
  },
  progressFill: {
    height: 6,
    backgroundColor: "#ff4da6",
    borderRadius: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 40,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#777",
    marginTop: 10,
  },
  options: {
    marginTop: 40,
  },
  option: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: "center",
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: "#ff4da6",
  },
  optionText: {
    fontSize: 18,
    color: "#000",
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 40,
  },
  button: {
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
