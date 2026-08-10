import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { storage } from './storage';

export const REQUIRED_SECONDS = 300;

export type AttendanceTrackerState = {
  active: boolean;
  challengeId: number | null;
  gymLat: number | null;
  gymLng: number | null;
  gymRadius: number;
  requiredSeconds: number;
  posLat: number | null;
  posLng: number | null;
  distance: number | null;
  inRange: boolean;
  secondsInRange: number;
  attendedToday: boolean;
  streak: number;
};

type SessionConfig = {
  challengeId: number;
  gymLat: number;
  gymLng: number;
  gymRadius: number;
};

type Persisted = {
  acc: number;
  attended: boolean;
  streak: number;
  date: string;
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const keyFor = (id: number) => `mugen_ci_${id}`;

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const clampAcc = (v: number) => Math.min(REQUIRED_SECONDS, Math.max(0, Math.floor(v)));

class AttendanceTracker {
  private config: SessionConfig | null = null;
  private acc = 0;
  private since: number | null = null;
  private posLat: number | null = null;
  private posLng: number | null = null;
  private distance: number | null = null;
  private inRange = false;
  private attended = false;
  private streak = 0;
  private watcher: Location.LocationSubscription | null = null;
  private listeners = new Set<() => void>();
  private lastEmitKey = '';
  private appState = AppState.currentState;

  constructor() {
    AppState.addEventListener('change', (s) => {
      if (s === 'active' && this.appState === 'active') {
        return;
      }
      if (s === 'active') {
        this.since = null;
      } else {
        this.freeze();
      }
      this.appState = s;
      this.emit();
    });
    setInterval(() => this.emit(), 1000);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    fn();
    return () => {
      this.listeners.delete(fn);
    };
  };

  get state(): AttendanceTrackerState {
    const seconds = Math.min(REQUIRED_SECONDS, this.acc + (this.since != null ? (Date.now() - this.since) / 1000 : 0));
    return {
      active: !!this.config,
      challengeId: this.config?.challengeId ?? null,
      gymLat: this.config?.gymLat ?? null,
      gymLng: this.config?.gymLng ?? null,
      gymRadius: this.config?.gymRadius ?? 0,
      requiredSeconds: REQUIRED_SECONDS,
      posLat: this.posLat,
      posLng: this.posLng,
      distance: this.distance,
      inRange: this.inRange,
      secondsInRange: Math.floor(seconds),
      attendedToday: this.attended,
      streak: this.streak,
    };
  }

  start(config: SessionConfig): void {
    const cur = this.config;
    if (
      cur &&
      cur.challengeId === config.challengeId &&
      cur.gymLat === config.gymLat &&
      cur.gymLng === config.gymLng &&
      cur.gymRadius === config.gymRadius
    ) {
      this.mountWatcher();
      return;
    }
    this.teardown();
    this.config = { ...config };
    this.acc = 0;
    this.since = null;
    this.posLat = null;
    this.posLng = null;
    this.distance = null;
    this.inRange = false;
    this.restore();
  }

  stop(): void {
    if (!this.config) return;
    this.teardown();
    this.config = null;
    this.acc = 0;
    this.since = null;
    this.posLat = null;
    this.posLng = null;
    this.distance = null;
    this.inRange = false;
    this.emit();
  }

  syncFromServer(attended: boolean, streak: number): void {
    this.attended = attended;
    this.streak = streak;
    if (!attended) this.acc = 0;
    this.save();
    this.emit();
  }

  markAttended(streak: number): void {
    this.attended = true;
    this.streak = streak;
    this.since = null;
    this.acc = 0;
    this.save();
    this.emit();
  }

  private freeze(): void {
    if (this.since == null) return;
    this.acc = clampAcc(this.acc + (Date.now() - this.since) / 1000);
    this.since = null;
    this.save();
  }

  private onLocation = (loc: Location.LocationObject): void => {
    const cfg = this.config;
    if (!cfg) return;
    const d = haversine(loc.coords.latitude, loc.coords.longitude, cfg.gymLat, cfg.gymLng);
    this.posLat = loc.coords.latitude;
    this.posLng = loc.coords.longitude;
    this.distance = Math.round(d);
    const inside = d <= cfg.gymRadius;
    this.inRange = inside;
    const now = Date.now();
    if (inside && this.since == null) {
      this.since = now;
    } else if (!inside) {
      if (this.since != null) this.acc = 0;
      this.since = null;
    }
    this.emit();
  };

  private async restore(): Promise<void> {
    const cfg = this.config;
    if (!cfg) return;
    try {
      const raw = await storage.get(keyFor(cfg.challengeId));
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        if (p.date === todayKey()) {
          this.acc = clampAcc(p.acc ?? 0);
          this.attended = !!p.attended;
          this.streak = p.streak ?? 0;
        }
      }
    } catch {}
    this.save();
    this.emit();
    this.mountWatcher();
  }

  private async mountWatcher(): Promise<void> {
    if (this.watcher || !this.config) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      this.watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20 },
        this.onLocation,
      );
    } catch {}
  }

  private teardown(): void {
    if (this.watcher) {
      try {
        this.watcher.remove();
      } catch {}
      this.watcher = null;
    }
  }

  private save(): void {
    const cfg = this.config;
    if (!cfg) return;
    const p: Persisted = { acc: clampAcc(this.acc), attended: this.attended, streak: this.streak, date: todayKey() };
    storage.set(keyFor(cfg.challengeId), JSON.stringify(p)).catch(() => {});
  }

  private emit(): void {
    const st = this.state;
    const k = `${st.active}|${st.inRange}|${st.secondsInRange}|${st.attendedToday}|${st.streak}|${st.distance}|${st.posLat}|${st.posLng}|${st.challengeId}|${st.gymRadius}`;
    if (k === this.lastEmitKey) return;
    this.lastEmitKey = k;
    this.listeners.forEach((fn) => fn());
  }
}

export const attendanceTracker = new AttendanceTracker();