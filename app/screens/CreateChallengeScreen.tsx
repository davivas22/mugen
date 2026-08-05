import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { storage } from "../../services/storage";
import { useRouter } from "expo-router";
import { challengeApi } from "../../services/api";

// ─── Icons (using text-based icons compatible with Expo without extra libs) ───
// If you have @expo/vector-icons installed, replace these with Ionicons/Feather
const Icon = ({ name, size = 20, color = "#1a1a1a" }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    close: "✕",
    chevronRight: "›",
    chevronLeft: "‹",
    chevronDown: "⌄",
    camera: "⊙",
    image: "⊞",
    map: "◎",
    clock: "◷",
    calendar: "▦",
    dumbbell: "⊗",
    shield: "◈",
    check: "✓",
    plus: "+",
    trash: "⊘",
    flag: "⚑",
    zap: "⚡",
    heart: "♡",
    star: "◆",
    users: "⊕",
    lock: "⊛",
  };
  return (
    <Text style={{ fontSize: size, color, lineHeight: size + 4, fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" }}>
      {icons[name] || "•"}
    </Text>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PINK = "#E8285A";
const PINK_LIGHT = "#FDE8EE";
const PINK_DARK = "#C01E47";
const GRAY_100 = "#F7F7F8";
const GRAY_200 = "#EBEBED";
const GRAY_400 = "#AEAEB2";
const GRAY_600 = "#636366";
const GRAY_800 = "#2C2C2E";
const WHITE = "#FFFFFF";
const BLACK = "#000000";

const STEPS = ["INFO", "AJUSTES", "AVANZADO", "LISTO"];

const CHALLENGE_MODES = [
  {
    id: "no_excuses",
    label: "Sin Excusas",
    description: "Máxima disciplina. Cada día cuenta, sin excepciones.",
    icon: "shield",
  },
  {
    id: "tracking",
    label: "Seguimiento",
    description: "Registro detallado de progreso y métricas diarias.",
    icon: "zap",
  },
  {
    id: "friendly",
    label: "Amigable",
    description: "Flexible y motivador, ideal para comenzar.",
    icon: "heart",
  },
];

const DAYS_OF_WEEK = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChallengeForm {
  name: string;
  coverImage: string | null;
  durationDays: number;
  startDate: Date;
  gymDaysPerWeek: number[];
  challengeMode: string;
  useLocation: boolean;
  meetingPoint: string;
  useCamera: boolean;
  gymLat: number | null;
  gymLng: number | null;
}

// ─── Helper: Mini Calendar ────────────────────────────────────────────────────
const MiniCalendar = ({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < adjustedFirst; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (day: number) =>
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  const isToday = (day: number) => {
    const t = new Date();
    return t.getDate() === day && t.getMonth() === month && t.getFullYear() === year;
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <View style={cal.container}>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Icon name="chevronLeft" size={18} color={GRAY_800} />
        </TouchableOpacity>
        <Text style={cal.monthLabel}>
          {MONTHS[month]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Icon name="chevronRight" size={18} color={GRAY_800} />
        </TouchableOpacity>
      </View>
      <View style={cal.dayHeaders}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={cal.dayHeader}>
            {d}
          </Text>
        ))}
      </View>
      <View style={cal.grid}>
        {cells.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[
              cal.cell,
              day && isSelected(day) ? cal.selectedCell : null,
              day && isToday(day) && !isSelected(day) ? cal.todayCell : null,
            ]}
            onPress={() => day && onSelect(new Date(year, month, day))}
            disabled={!day}
          >
            {day ? (
              <Text
                style={[
                  cal.cellText,
                  isSelected(day) ? cal.selectedText : null,
                  isToday(day) && !isSelected(day) ? cal.todayText : null,
                ]}
              >
                {day}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const cal = StyleSheet.create({
  container: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginTop: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 14, fontWeight: "600", color: GRAY_800 },
  dayHeaders: { flexDirection: "row", marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: GRAY_400, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 100 },
  selectedCell: { backgroundColor: PINK },
  todayCell: { borderWidth: 1.5, borderColor: PINK },
  cellText: { fontSize: 13, color: GRAY_800 },
  selectedText: { color: WHITE, fontWeight: "700" },
  todayText: { color: PINK, fontWeight: "600" },
});

// ─── Step Progress Bar ────────────────────────────────────────────────────────
const StepBar = ({ current, total }: { current: number; total: number }) => {
  return (
    <View style={sb.container}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={[sb.dot, i < current ? sb.dotDone : i === current ? sb.dotActive : sb.dotInactive]}>
            {i < current ? (
              <Icon name="check" size={10} color={WHITE} />
            ) : (
              <View style={[sb.innerDot, i === current ? sb.innerDotActive : sb.innerDotInactive]} />
            )}
          </View>
          {i < total - 1 && (
            <View style={[sb.line, i < current ? sb.lineDone : sb.lineInactive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const sb = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: PINK },
  dotActive: { backgroundColor: WHITE, borderWidth: 2, borderColor: PINK },
  dotInactive: { backgroundColor: GRAY_200 },
  innerDot: { width: 10, height: 10, borderRadius: 5 },
  innerDotActive: { backgroundColor: PINK },
  innerDotInactive: { backgroundColor: GRAY_400 },
  line: { flex: 1, height: 2 },
  lineDone: { backgroundColor: PINK },
  lineInactive: { backgroundColor: GRAY_200 },
});

// ─── Step Labels ─────────────────────────────────────────────────────────────
const StepLabels = ({ current }: { current: number }) => (
  <View style={{ flexDirection: "row", paddingHorizontal: 8, marginBottom: 8 }}>
    {STEPS.map((label, i) => (
      <Text
        key={label}
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: 9,
          fontWeight: i === current ? "700" : "400",
          color: i === current ? PINK : GRAY_400,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    ))}
  </View>
);

// ─── Field Components ─────────────────────────────────────────────────────────
const FieldLabel = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 11, fontWeight: "600", color: GRAY_400, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, marginTop: 20 }}>
    {children}
  </Text>
);

const InputField = ({
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={GRAY_400}
    multiline={multiline}
    style={[
      {
        backgroundColor: GRAY_100,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: GRAY_800,
        borderWidth: 1.5,
        borderColor: "transparent",
      },
      multiline && { height: 90, textAlignVertical: "top" },
    ]}
  />
);

const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: WHITE, borderRadius: 16, padding: 16, marginTop: 12, shadowColor: BLACK, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
    {children}
  </View>
);

// ─── STEP 1: Información básica ───────────────────────────────────────────────
const Step1 = ({ form, update }: { form: ChallengeForm; update: (k: keyof ChallengeForm, v: any) => void }) => {

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Necesitas dar permiso para acceder a la galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      update("coverImage", result.assets[0].uri);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.stepTitle}>Crea tu desafío</Text>
      <Text style={s.stepSubtitle}>Define el nombre y una imagen de portada que inspire a tu comunidad.</Text>

      {/* Cover Image */}
      <TouchableOpacity
        style={[s.coverPicker, form.coverImage ? { borderStyle: "solid", borderColor: PINK, padding: 0, overflow: "hidden" } : {}]}
        onPress={pickImage}
        activeOpacity={0.8}
      >
        {form.coverImage ? (
          <View style={{ width: "100%", height: "100%" }}>
            <Image source={{ uri: form.coverImage }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            <View style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, color: "#fff", fontWeight: "600" }}>Cambiar</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <View style={s.coverPlaceholderIcon}>
              <Icon name="image" size={28} color={GRAY_400} />
            </View>
            <Text style={{ fontSize: 13, color: GRAY_600, fontWeight: "600", marginTop: 8 }}>Foto de portada</Text>
            <Text style={{ fontSize: 11, color: GRAY_400, marginTop: 2 }}>Toca para seleccionar</Text>
          </View>
        )}
      </TouchableOpacity>

      <FieldLabel>Nombre del desafío</FieldLabel>
      <InputField
        value={form.name}
        onChangeText={(t) => update("name", t)}
        placeholder="Ej: Guerreros del gimnasio"
      />

      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: GRAY_400, textAlign: "right" }}>
          {form.name.length} / 50
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── STEP 2: Ajustes del desafío ──────────────────────────────────────────────
const Step2 = ({ form, update }: { form: ChallengeForm; update: (k: keyof ChallengeForm, v: any) => void }) => {
  const DURATION_OPTIONS = [7, 14, 21, 30, 60, 90];
  const [showCalendar, setShowCalendar] = useState(false);

  const toggleDay = (idx: number) => {
    const days = form.gymDaysPerWeek.includes(idx)
      ? form.gymDaysPerWeek.filter((d) => d !== idx)
      : [...form.gymDaysPerWeek, idx];
    update("gymDaysPerWeek", days);
  };

  const formatDate = (d: Date) =>
    `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.stepTitle}>Ajustes del desafío</Text>
      <Text style={s.stepSubtitle}>Define la duración, fechas y los días de asistencia al gimnasio.</Text>

      {/* Duration */}
      <FieldLabel>Duración del desafío</FieldLabel>
      <SectionCard>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DURATION_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => update("durationDays", d)}
              style={[
                s.chipBtn,
                form.durationDays === d ? s.chipBtnActive : s.chipBtnInactive,
              ]}
            >
              <Text style={[s.chipText, form.durationDays === d ? s.chipTextActive : s.chipTextInactive]}>
                {d} días
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      {/* Start Date */}
      <FieldLabel>Fecha de inicio</FieldLabel>
      <TouchableOpacity
        style={s.dateRow}
        onPress={() => setShowCalendar(!showCalendar)}
        activeOpacity={0.8}
      >
        <View style={s.dateIconWrap}>
          <Icon name="calendar" size={16} color={PINK} />
        </View>
        <Text style={{ flex: 1, fontSize: 14, color: GRAY_800, marginLeft: 12 }}>
          {formatDate(form.startDate)}
        </Text>
        <Icon name={showCalendar ? "chevronLeft" : "chevronDown"} size={18} color={GRAY_400} />
      </TouchableOpacity>

      {showCalendar && (
        <MiniCalendar
          selectedDate={form.startDate}
          onSelect={(d) => {
            update("startDate", d);
            setShowCalendar(false);
          }}
        />
      )}

      {/* Gym days */}
      <FieldLabel>Días de asistencia al gimnasio</FieldLabel>
      <SectionCard>
        <Text style={{ fontSize: 12, color: GRAY_400, marginBottom: 14 }}>
          Selecciona los días que contarán como asistencia
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {DAYS_OF_WEEK.map((day, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => toggleDay(idx)}
              style={[
                s.dayCircle,
                form.gymDaysPerWeek.includes(idx) ? s.dayCircleActive : s.dayCircleInactive,
              ]}
            >
              <Text
                style={[
                  s.dayCircleText,
                  form.gymDaysPerWeek.includes(idx) ? s.dayCircleTextActive : s.dayCircleTextInactive,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: GRAY_200 }}>
          <Text style={{ fontSize: 12, color: GRAY_400 }}>
            {form.gymDaysPerWeek.length === 0
              ? "Ningún día seleccionado"
              : `${form.gymDaysPerWeek.length} día${form.gymDaysPerWeek.length > 1 ? "s" : ""} por semana`}
          </Text>
        </View>
      </SectionCard>
    </ScrollView>
  );
};

// ─── Map Picker Modal ─────────────────────────────────────────────────────────
const MapPickerModal = ({
  visible,
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) => {
  const [center, setCenter] = useState({ lat: initialLat, lng: initialLng });

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Header */}
        <SafeAreaView style={{ backgroundColor: "#1a1a1a" }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ paddingRight: 16 }}>
              <Text style={{ color: "#aaa", fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Ubicación del gym
            </Text>
            <TouchableOpacity
              onPress={() => onConfirm(center.lat, center.lng)}
              style={{ paddingLeft: 16 }}
            >
              <Text style={{ color: PINK, fontSize: 15, fontWeight: "700" }}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Hint */}
        <View style={{ backgroundColor: "#222", paddingVertical: 8, alignItems: "center" }}>
          <Text style={{ color: "#ccc", fontSize: 12 }}>Mueve el mapa para centrar el pin en el gym</Text>
        </View>

        {/* Map + crosshair pin fijo */}
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: initialLat,
              longitude: initialLng,
              latitudeDelta: 0.003,
              longitudeDelta: 0.003,
            }}
            onRegionChangeComplete={(region) => {
              setCenter({ lat: region.latitude, lng: region.longitude });
            }}
          />
          {/* Pin fijo en el centro (no se mueve con el mapa) */}
          <View pointerEvents="none" style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center", justifyContent: "center",
          }}>
            {/* Sombra */}
            <View style={{
              width: 12, height: 4, borderRadius: 6,
              backgroundColor: "rgba(0,0,0,0.25)", marginTop: 44,
              position: "absolute",
            }} />
            {/* Pin */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: PINK, borderWidth: 3, borderColor: WHITE,
                alignItems: "center", justifyContent: "center",
                shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 4,
                elevation: 8,
              }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: WHITE }} />
              </View>
              <View style={{
                width: 3, height: 14, backgroundColor: PINK,
                marginTop: -2,
              }} />
            </View>
          </View>
        </View>

        {/* Coords bar */}
        <View style={{ backgroundColor: "#1a1a1a", paddingVertical: 10, alignItems: "center" }}>
          <Text style={{ color: "#888", fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }}>
            {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// ─── STEP 3: Opciones avanzadas ───────────────────────────────────────────────
const Step3 = ({ form, update }: { form: ChallengeForm; update: (k: keyof ChallengeForm, v: any) => void }) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 13.7109, lng: -89.1397 });

  const openMapPicker = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMapCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else if (form.gymLat) {
        setMapCenter({ lat: form.gymLat, lng: form.gymLng! });
      }
    } catch {
      if (form.gymLat) setMapCenter({ lat: form.gymLat, lng: form.gymLng! });
    } finally {
      setLoadingLocation(false);
      setShowMap(true);
    }
  };

  const handleConfirm = (lat: number, lng: number) => {
    update("gymLat", lat);
    update("gymLng", lng);
    update("meetingPoint", `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setShowMap(false);
  };

  return (
    <>
      <MapPickerModal
        visible={showMap}
        initialLat={mapCenter.lat}
        initialLng={mapCenter.lng}
        onConfirm={handleConfirm}
        onClose={() => setShowMap(false)}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.stepTitle}>Opciones avanzadas</Text>
        <Text style={s.stepSubtitle}>Configura el modo del desafío y el sistema de verificación de asistencia.</Text>

        {/* Challenge Mode */}
        <FieldLabel>Modo del desafío</FieldLabel>
        {CHALLENGE_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            onPress={() => update("challengeMode", mode.id)}
            style={[s.modeCard, form.challengeMode === mode.id ? s.modeCardActive : s.modeCardInactive]}
            activeOpacity={0.85}
          >
            <View style={[s.modeIconWrap, form.challengeMode === mode.id ? { backgroundColor: PINK } : { backgroundColor: GRAY_200 }]}>
              <Icon name={mode.icon} size={18} color={form.challengeMode === mode.id ? WHITE : GRAY_600} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[s.modeName, form.challengeMode === mode.id ? { color: PINK } : { color: GRAY_800 }]}>
                {mode.label}
              </Text>
              <Text style={s.modeDesc}>{mode.description}</Text>
            </View>
            <View style={[s.modeRadio, form.challengeMode === mode.id ? { borderColor: PINK } : { borderColor: GRAY_400 }]}>
              {form.challengeMode === mode.id && <View style={s.modeRadioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Verificación de asistencia */}
        <FieldLabel>Verificación de asistencia</FieldLabel>
        <Text style={{ fontSize: 12, color: GRAY_400, marginBottom: 12 }}>
          Elige cómo los participantes demostrarán su asistencia diaria
        </Text>

        {/* Location option */}
        <SectionCard>
          <View style={s.optionRow}>
            <View style={[s.optionIconWrap, { backgroundColor: form.useLocation ? PINK_LIGHT : GRAY_100 }]}>
              <Icon name="map" size={18} color={form.useLocation ? PINK : GRAY_400} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.optionTitle}>Localización mutua</Text>
              <Text style={s.optionDesc}>
                Define un punto de reunión. Los participantes deben estar presentes para contar asistencia.
              </Text>
            </View>
            <Switch
              value={form.useLocation}
              onValueChange={(v) => {
                update("useLocation", v);
                if (v) update("useCamera", false);
              }}
              trackColor={{ false: GRAY_200, true: PINK }}
              thumbColor={WHITE}
            />
          </View>

          {form.useLocation && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: GRAY_200 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: GRAY_600, marginBottom: 10 }}>
                Punto de reunión
              </Text>

              {form.gymLat ? (
                /* Ubicación ya seleccionada — muestra mini preview */
                <TouchableOpacity
                  onPress={openMapPicker}
                  activeOpacity={0.85}
                  disabled={loadingLocation}
                  style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: "#86EFAC" }}
                >
                  <MapView
                    style={{ height: 140, width: "100%" }}
                    region={{
                      latitude: form.gymLat,
                      longitude: form.gymLng!,
                      latitudeDelta: 0.003,
                      longitudeDelta: 0.003,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    pointerEvents="none"
                  >
                    <Marker coordinate={{ latitude: form.gymLat, longitude: form.gymLng! }} pinColor={PINK} />
                  </MapView>
                  <View style={{ backgroundColor: "#F0FDF4", padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 13 }}>📍</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: "#166534", fontWeight: "600" }}>
                      {form.gymLat.toFixed(5)}, {form.gymLng?.toFixed(5)}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#16A34A", fontWeight: "700" }}>Cambiar</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                /* Sin ubicación */
                <TouchableOpacity
                  style={[s.mapPlaceholder, { borderColor: PINK, borderStyle: "dashed" }]}
                  onPress={openMapPicker}
                  activeOpacity={0.8}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <ActivityIndicator color={PINK} size="small" />
                  ) : (
                    <>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: PINK_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                        <Icon name="map" size={22} color={PINK} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: GRAY_800 }}>
                        Seleccionar en el mapa
                      </Text>
                      <Text style={{ fontSize: 11, color: GRAY_400, marginTop: 4, textAlign: "center" }}>
                        Toca para abrir el mapa y fijar el punto del gym
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </SectionCard>

        {/* Camera option */}
        <SectionCard>
          <View style={s.optionRow}>
            <View style={[s.optionIconWrap, { backgroundColor: form.useCamera ? PINK_LIGHT : GRAY_100 }]}>
              <Icon name="camera" size={18} color={form.useCamera ? PINK : GRAY_400} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.optionTitle}>Foto de asistencia</Text>
              <Text style={s.optionDesc}>
                Los participantes deben tomar una foto en el momento. Solo cámara directa, sin galería.
              </Text>
            </View>
            <Switch
              value={form.useCamera}
              onValueChange={(v) => {
                update("useCamera", v);
                if (v) update("useLocation", false);
              }}
              trackColor={{ false: GRAY_200, true: PINK }}
              thumbColor={WHITE}
            />
          </View>

          {form.useCamera && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: GRAY_200, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View style={{ backgroundColor: PINK_LIGHT, borderRadius: 8, padding: 8 }}>
                <Icon name="lock" size={14} color={PINK} />
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: GRAY_600, lineHeight: 18 }}>
                Solo se permite el uso de la cámara en tiempo real. El acceso a la galería queda deshabilitado para garantizar la autenticidad de la asistencia.
              </Text>
            </View>
          )}
        </SectionCard>

        {!form.useLocation && !form.useCamera && (
          <View style={{ backgroundColor: "#FFF8E1", borderRadius: 12, padding: 14, marginTop: 12, flexDirection: "row", alignItems: "center" }}>
            <Icon name="flag" size={16} color="#F59E0B" />
            <Text style={{ flex: 1, fontSize: 12, color: "#92400E", marginLeft: 10, lineHeight: 18 }}>
              Sin verificación activa. Se recomienda activar al menos una opción para garantizar la integridad del desafío.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
};

// ─── STEP 4: Confirmación ─────────────────────────────────────────────────────
const Step4 = ({ form }: { form: ChallengeForm }) => {
  const formatDate = (d: Date) =>
    `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const endDate = new Date(form.startDate);
  endDate.setDate(endDate.getDate() + form.durationDays);

  const mode = CHALLENGE_MODES.find((m) => m.id === form.challengeMode);
  const selectedDayNames = form.gymDaysPerWeek
    .sort()
    .map((i) => ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i])
    .join(", ");

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.stepTitle}>Todo listo</Text>
      <Text style={s.stepSubtitle}>Revisa los detalles de tu desafío antes de publicarlo.</Text>

      {/* Cover preview */}
      <View style={s.previewCover}>
        <View style={{ alignItems: "center" }}>
          <Icon name="image" size={32} color={form.coverImage ? PINK : GRAY_400} />
          <Text style={{ fontSize: 20, fontWeight: "700", color: WHITE, marginTop: 12, textAlign: "center" }}>
            {form.name || "Sin nombre"}
          </Text>
        </View>
      </View>

      {/* Summary cards */}
      <SectionCard>
        <SummaryRow icon="clock" label="Duración" value={`${form.durationDays} días`} />
        <SummaryRow icon="calendar" label="Inicio" value={formatDate(form.startDate)} />
        <SummaryRow icon="calendar" label="Fin estimado" value={formatDate(endDate)} />
        <SummaryRow
          icon="dumbbell"
          label="Días de gym"
          value={selectedDayNames || "No definidos"}
          last
        />
      </SectionCard>

      <SectionCard>
        <SummaryRow icon={mode?.icon || "star"} label="Modo" value={mode?.label || "-"} />
        <SummaryRow
          icon="map"
          label="Localización"
          value={form.useLocation ? "Activada" : "Desactivada"}
        />
        <SummaryRow
          icon="camera"
          label="Foto de asistencia"
          value={form.useCamera ? "Activada" : "Desactivada"}
          last
        />
      </SectionCard>

      <View style={s.publishNote}>
        <Icon name="users" size={16} color={PINK} />
        <Text style={{ flex: 1, fontSize: 12, color: GRAY_600, marginLeft: 10, lineHeight: 18 }}>
          Al publicar el desafío, otros usuarios de Mugen podrán encontrarlo y unirse.
        </Text>
      </View>
    </ScrollView>
  );
};

const SummaryRow = ({
  icon,
  label,
  value,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View style={[{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }, !last && { borderBottomWidth: 1, borderBottomColor: GRAY_200 }]}>
    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: GRAY_100, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={14} color={GRAY_600} />
    </View>
    <Text style={{ flex: 1, fontSize: 13, color: GRAY_400, marginLeft: 12 }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: "600", color: GRAY_800 }}>{value}</Text>
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function CreateChallengeScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ChallengeForm>({
    name: "",
    coverImage: null,
    durationDays: 30,
    startDate: new Date(),
    gymDaysPerWeek: [0, 1, 2, 3, 4],
    challengeMode: "tracking",
    useLocation: false,
    meetingPoint: "",
    useCamera: false,
    gymLat: null,
    gymLng: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ code: string; name: string } | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const update = (key: keyof ChallengeForm, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    if (submitting) return false;
    if (step === 0) return form.name.trim().length >= 3;
    if (step === 1) return form.gymDaysPerWeek.length > 0;
    return true;
  };

  const animateStep = (direction: number, callback: () => void) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -direction * 30, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();
    callback();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const token = await storage.get("token") ?? "";
      console.log("[SUBMIT] token:", token ? "OK" : "VACÍO");
      console.log("[SUBMIT] form:", JSON.stringify({ name: form.name, durationDays: form.durationDays, mode: form.challengeMode }));
      const { data } = await challengeApi.create(form, token);
      console.log("[SUBMIT] respuesta:", JSON.stringify(data));
      setInviteModal({ code: data.challenge.invite_code, name: data.challenge.name });
    } catch (error: any) {
      console.log("[SUBMIT] ERROR:", error?.message);
      console.log("[SUBMIT] status:", error?.response?.status);
      console.log("[SUBMIT] data:", JSON.stringify(error?.response?.data));
      const msg = error?.response?.data?.message || "No se pudo crear el desafío. Intenta de nuevo.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const shareInvite = (code: string, name: string) => {
    Share.share({
      message: `¡Únete a mi sala "${name}" en Mugen! 💪\nUsa el código: ${code}\nDescarga la app y ve a Salas → Unirse con código.`,
    });
  };

  const next = () => {
    if (!canProceed()) return;
    if (step < STEPS.length - 1) {
      animateStep(1, () => setStep((s) => s + 1));
    } else {
      submit();
    }
  };

  const back = () => {
    if (step > 0) animateStep(-1, () => setStep((s) => s - 1));
    else router.back();
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <Step1 form={form} update={update} />;
      case 1: return <Step2 form={form} update={update} />;
      case 2: return <Step3 form={form} update={update} />;
      case 3: return <Step4 form={form} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={back} style={s.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name={step === 0 ? "close" : "chevronLeft"} size={step === 0 ? 14 : 22} color={GRAY_800} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nuevo desafío</Text>
        <View style={s.headerBtn} />
      </View>

      {/* Progress */}
      <StepBar current={step} total={STEPS.length} />
      <StepLabels current={step} />

      {/* Content */}
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </Animated.View>

      {/* Footer */}
      <View style={s.footer}>
        {step > 0 && (
          <TouchableOpacity onPress={back} style={s.backBtn} activeOpacity={0.8}>
            <Icon name="chevronLeft" size={18} color={GRAY_600} />
            <Text style={s.backBtnText}>Atrás</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={next}
          style={[s.nextBtn, !canProceed() ? s.nextBtnDisabled : {}, step === 0 && { flex: 1 }]}
          activeOpacity={0.85}
          disabled={!canProceed()}
        >
          {submitting ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <>
              <Text style={s.nextBtnText}>
                {step === STEPS.length - 1 ? "Publicar desafío" : "Siguiente"}
              </Text>
              {step < STEPS.length - 1 && <Icon name="chevronRight" size={18} color={WHITE} />}
            </>
          )}
        </TouchableOpacity>
      </View>
      {/* Modal de invitación */}
      {inviteModal && (
        <Modal transparent animationType="fade" visible statusBarTranslucent>
          <View style={inv.overlay}>
            <View style={inv.sheet}>
              <Text style={inv.emoji}>🎉</Text>
              <Text style={inv.title}>¡Sala creada!</Text>
              <Text style={inv.subtitle}>Comparte este código con tus amigos para que se unan</Text>

              {/* Código */}
              <View style={inv.codeBox}>
                <Text style={inv.code}>{inviteModal.code}</Text>
              </View>

              {/* QR (imagen remota generada al vuelo) */}
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=MUGEN-${inviteModal.code}&bgcolor=ffffff&color=FF2E63&qzone=2` }}
                style={inv.qr}
              />
              <Text style={inv.qrHint}>Tus amigos pueden escanear este QR desde la app</Text>

              {/* Botones */}
              <TouchableOpacity
                style={inv.shareBtn}
                onPress={() => shareInvite(inviteModal.code, inviteModal.name)}
                activeOpacity={0.85}
              >
                <Text style={inv.shareBtnText}>Compartir invitación</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={inv.doneBtn}
                onPress={() => { setInviteModal(null); router.back(); }}
              >
                <Text style={inv.doneBtnText}>Ir a mis salas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const inv = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet:        { backgroundColor: '#fff', borderRadius: 28, padding: 28, width: '100%', alignItems: 'center' },
  emoji:        { fontSize: 40, marginBottom: 8 },
  title:        { fontSize: 22, fontWeight: '900', color: '#1a1a1a', marginBottom: 6 },
  subtitle:     { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  codeBox:      { backgroundColor: '#FDE8EE', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14, marginBottom: 20 },
  code:         { fontSize: 32, fontWeight: '900', color: '#E8285A', letterSpacing: 8 },
  qr:           { width: 160, height: 160, borderRadius: 12, marginBottom: 8 },
  qrHint:       { fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: 24 },
  shareBtn:     { backgroundColor: '#E8285A', width: '100%', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  doneBtn:      { width: '100%', padding: 14, borderRadius: 14, alignItems: 'center' },
  doneBtnText:  { color: '#888', fontWeight: '600', fontSize: 14 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GRAY_100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: GRAY_100,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: GRAY_800,
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: GRAY_800,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: GRAY_400,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GRAY_100,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: GRAY_600,
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PINK,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextBtnDisabled: {
    backgroundColor: GRAY_200,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: WHITE,
  },
  coverPicker: {
    marginTop: 16,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GRAY_200,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GRAY_100,
  },
  coverPlaceholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GRAY_200,
    alignItems: "center",
    justifyContent: "center",
  },
  chipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  chipBtnActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  chipBtnInactive: {
    backgroundColor: WHITE,
    borderColor: GRAY_200,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: WHITE,
  },
  chipTextInactive: {
    color: GRAY_600,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: GRAY_200,
  },
  dateIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PINK_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  dayCircleActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  dayCircleInactive: {
    backgroundColor: WHITE,
    borderColor: GRAY_200,
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dayCircleTextActive: {
    color: WHITE,
  },
  dayCircleTextInactive: {
    color: GRAY_600,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    borderWidth: 1.5,
  },
  modeCardActive: {
    backgroundColor: PINK_LIGHT,
    borderColor: PINK,
  },
  modeCardInactive: {
    backgroundColor: WHITE,
    borderColor: GRAY_200,
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modeName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  modeDesc: {
    fontSize: 12,
    color: GRAY_400,
    lineHeight: 17,
  },
  modeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  modeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PINK,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GRAY_800,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: GRAY_400,
    lineHeight: 17,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: GRAY_100,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: GRAY_200,
    borderStyle: "dashed",
  },
  previewCover: {
    height: 180,
    borderRadius: 20,
    backgroundColor: PINK_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 4,
  },
  publishNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PINK_LIGHT,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
});
