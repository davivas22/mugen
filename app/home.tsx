import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from "react-native";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function Home() {

  const days = [
    { day: "Sáb", num: 18 },
    { day: "Dom", num: 19 },
    { day: "Lun", num: 20 },
    { day: "Mar", num: 21 },
    { day: "Mié", num: 22 },
    { day: "Jue", num: 23 },
    { day: "Vie", num: 24 },
  ];

  return (

    <View style={styles.root}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 130,
        }}
      >

        {/* HEADER */}

        <View style={styles.header}>

          <View style={styles.logoRow}>

          <Image
  source={require("../assets/images/logom.jpg")}
  style={styles.logo}
/>

          </View>

          <View style={styles.streakBox}>

            <Ionicons
              name="flame"
              size={18}
              color="#ff5c8a"
            />

            <Text style={styles.streakText}>
              0
            </Text>

          </View>

        </View>

        {/* DAYS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 20 }}
        >

          {days.map((d, i) => (

            <View
              key={i}
              style={[
                styles.dayItem,
                d.day === "Jue" && styles.selectedDay,
              ]}
            >

              <Text style={styles.dayText}>
                {d.day}
              </Text>

              <View
                style={[
                  styles.circle,
                  d.day === "Jue" && styles.circleActive,
                ]}
              >

                <Text
                  style={{
                    fontWeight:
                      d.day === "Jue"
                        ? "700"
                        : "400",
                  }}
                >
                  {d.num}
                </Text>

              </View>

            </View>

          ))}

        </ScrollView>

        {/* CALORÍAS */}

        <View style={styles.calorieCard}>

          <View>

            <Text style={styles.caloriesNumber}>
              2538
            </Text>

            <Text style={styles.caloriesText}>
              Calorías restantes
            </Text>

          </View>

          {/* CIRCLE VISUAL */}

          <View style={styles.progressCircleOuter}>

            <View style={styles.progressCircleInner}>

              <Ionicons
                name="flame"
                size={22}
                color="#111"
              />

            </View>

          </View>

        </View>

        {/* MACROS */}

        <View style={styles.macroRow}>

          {/* Proteína */}

          <View style={styles.macroCard}>

            <Text style={styles.macroNumber}>
              142g
            </Text>

            <Text style={styles.macroLabel}>
              Proteína restante
            </Text>

            <View style={styles.smallCircleOuter}>

              <View style={styles.smallCircleInnerPink}>

                <MaterialIcons
                  name="restaurant"
                  size={16}
                  color="#ff5c8a"
                />

              </View>

            </View>

          </View>

          {/* Carbohidratos */}

          <View style={styles.macroCard}>

            <Text style={styles.macroNumber}>
              334g
            </Text>

            <Text style={styles.macroLabel}>
              Carbohidratos restantes
            </Text>

            <View style={styles.smallCircleOuter}>

              <View style={styles.smallCircleInnerPink}>

                <MaterialIcons
                  name="grain"
                  size={16}
                  color="#ff5c8a"
                />

              </View>

            </View>

          </View>

          {/* Grasas */}

          <View style={styles.macroCard}>

            <Text style={styles.macroNumber}>
              70g
            </Text>

            <Text style={styles.macroLabel}>
              Grasas restantes
            </Text>

            <View style={styles.smallCircleOuter}>

              <View style={styles.smallCircleInnerPink}>

                <MaterialIcons
                  name="opacity"
                  size={16}
                  color="#ff5c8a"
                />

              </View>

            </View>

          </View>

        </View>

        {/* RECIENTES */}

        <Text style={styles.sectionTitle}>
          Subidos recientemente
        </Text>

        <View style={styles.placeholderCard} />

      </ScrollView>

      {/* FLOATING BUTTON */}

      <TouchableOpacity style={styles.floatingButton}>

        <Ionicons
          name="add"
          size={30}
          color="#fff"
        />

      </TouchableOpacity>

      {/* BOTTOM MENU */}

      <View style={styles.bottomMenu}>

        <TouchableOpacity style={styles.menuItem}>

          <Ionicons
            name="home"
            size={24}
            color="#111"
          />

          <Text style={styles.menuTextActive}>
            Inicio
          </Text>

        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>

          <Ionicons
            name="bar-chart"
            size={24}
            color="#aaa"
          />

          <Text style={styles.menuText}>
            Progreso
          </Text>

        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>

          <Ionicons
            name="people"
            size={24}
            color="#aaa"
          />

          <Text style={styles.menuText}>
            Grupos
          </Text>

        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>

          <Ionicons
            name="person"
            size={24}
            color="#ff5c8a"
          />

          <View style={styles.profileDot} />

        </TouchableOpacity>

      </View>

    </View>

  );

}
const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  logo: {
  width: 200,
  height: 90,
  resizeMode: "contain",
},
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
  },

  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  streakText: {
    marginLeft: 6,
    fontWeight: "600",
  },

  dayItem: {
    alignItems: "center",
    marginLeft: 16,
  },

  selectedDay: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 14,
  },

  dayText: {
    marginBottom: 6,
    color: "#555",
  },

  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },

  circleActive: {
    borderColor: "#111",
  },

  calorieCard: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },

  caloriesNumber: {
    fontSize: 40,
    fontWeight: "700",
  },

  caloriesText: {
    color: "#777",
    marginTop: 4,
  },

  progressCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },

  progressCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
  },

  macroCard: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  macroNumber: {
    fontSize: 20,
    fontWeight: "700",
  },

  macroLabel: {
    color: "#777",
    marginBottom: 14,
  },

  smallCircleOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
  },

  smallCircleInnerPink: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 30,
    marginLeft: 16,
  },

  placeholderCard: {
    height: 120,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 18,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 85,

    width: 64,
    height: 64,
    borderRadius: 32,

    backgroundColor: "#111",

    justifyContent: "center",
    alignItems: "center",

    elevation: 6,
  },

  bottomMenu: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,

    backgroundColor: "#fff",

    borderRadius: 28,

    flexDirection: "row",
    justifyContent: "space-around",

    paddingVertical: 12,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },

  menuItem: {
    alignItems: "center",
  },

  menuText: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },

  menuTextActive: {
    fontSize: 12,
    color: "#111",
    marginTop: 4,
    fontWeight: "600",
  },

  profileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff5c8a",
    marginTop: 4,
  },

});