import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const FALLBACK_HOST = '10.0.2.2';

const getHostBase = () => {
  if (!__DEV__) return 'https://tu-api-produccion.com';
  if (Platform.OS === 'web') return 'http://localhost:8000';
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!debuggerHost || debuggerHost.includes('ngrok') || debuggerHost.includes('exp.direct')) {
    return `http://${FALLBACK_HOST}:8000`;
  }
  return `http://${debuggerHost}:8000`;
};

export const getStorageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getHostBase()}/storage/${path}`;
};

const getBaseUrl = () => {
  if (!__DEV__) return 'https://tu-api-produccion.com/api';
  if (Platform.OS === 'web') return 'http://localhost:8000/api';
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!debuggerHost || debuggerHost.includes('ngrok') || debuggerHost.includes('exp.direct')) {
    return `http://${FALLBACK_HOST}:8000/api`;
  }
  return `http://${debuggerHost}:8000/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(req => {
  console.log('[API] →', req.method?.toUpperCase(), (req.baseURL ?? '') + (req.url ?? ''));
  return req;
});

api.interceptors.response.use(
  res => {
    console.log('[API] ← OK', res.status);
    return res;
  },
  err => {
    console.log('[API] ← ERROR', err.message);
    console.log('[API]   status:', err.response?.status);
    console.log('[API]   data:', JSON.stringify(err.response?.data));
    return Promise.reject(err);
  }
);

/**
 * Multipart upload usando XMLHttpRequest.
 *
 * IMPORTANTE: fetch() en React Native 0.71+ tiene un bug donde descarta
 * silenciosamente los file-parts de FormData (el servidor recibe files:[]).
 * XMLHttpRequest usa el path nativo RCTNetworking que resuelve file:// y
 * content:// correctamente en iOS y Android.
 */
export const fetchMultipart = (
  endpoint: string,
  data: FormData,
  token: string,
): Promise<{ data: any }> => {
  const url = `${getBaseUrl()}${endpoint}`;
  console.log('[XHR] → POST', url);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    // Sólo estos headers — NO poner Content-Type, XHR lo setea con el boundary
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.timeout = 30000;

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;

      console.log('[XHR] ← status:', xhr.status);
      console.log('[XHR] ← body:', xhr.responseText?.slice(0, 400));

      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: json });
        } else {
          const err: any = new Error(json?.message ?? 'Request failed');
          err.response = { status: xhr.status, data: json };
          reject(err);
        }
      } catch {
        reject(new Error(`Parse error: ${xhr.responseText?.slice(0, 100)}`));
      }
    };

    xhr.onerror   = () => { console.log('[XHR] ← network error'); reject(new Error('Network error')); };
    xhr.ontimeout = () => { console.log('[XHR] ← timeout');       reject(new Error('Timeout')); };

    xhr.send(data);
  });
};

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post('/register', { name, email, password, password_confirmation: password }),

  login: (email: string, password: string) =>
    api.post('/login', { email, password }),

  logout: (token: string) =>
    api.post('/logout', {}, { headers: { Authorization: `Bearer ${token}` } }),

  googleLogin: (idToken: string) =>
    api.post('/auth/google', { id_token: idToken }),
};

export const badgeApi = {
  get: (token: string) =>
    api.get('/user/badges', { headers: { Authorization: `Bearer ${token}` } }),
};

export const inviteApi = {
  findByCode: (code: string) =>
    api.get(`/challenges/code/${code}`),

  join: (code: string, token: string) =>
    api.post(`/challenges/join/${code}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const userApi = {
  me: (token: string) =>
    api.get('/me', { headers: { Authorization: `Bearer ${token}` } }),

  stats: (token: string) =>
    api.get('/user/stats', { headers: { Authorization: `Bearer ${token}` } }),

  weekly: (token: string) =>
    api.get('/user/weekly', { headers: { Authorization: `Bearer ${token}` } }),

  myChallenges: (token: string) =>
    api.get('/challenges/mine', { headers: { Authorization: `Bearer ${token}` } }),

  updateProfile: (data: FormData, token: string) =>
    fetchMultipart('/user/profile', data, token),

  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    api.post('/user/password',
      { current_password: currentPassword, new_password: newPassword, new_password_confirmation: newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    ),

  getProfile: (userId: number | string, token: string) =>
    api.get(`/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),

  savePushToken: (pushToken: string, token: string) =>
    api.post('/user/push-token', { push_token: pushToken }, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const journeyApi = {
  list: (challengeId: number | string, token: string) =>
    api.get(`/challenges/${challengeId}/journey`, { headers: { Authorization: `Bearer ${token}` } }),

  listAll: (challengeId: number | string, token: string) =>
    api.get(`/challenges/${challengeId}/journey/all`, { headers: { Authorization: `Bearer ${token}` } }),

  create: (challengeId: number | string, data: FormData, token: string) =>
    fetchMultipart(`/challenges/${challengeId}/journey`, data, token),

  delete: (photoId: number | string, token: string) =>
    api.delete(`/journey/${photoId}`, { headers: { Authorization: `Bearer ${token}` } }),

  react: (photoId: number | string, reaction: string, token: string) =>
    api.post(`/journey/${photoId}/react`, { reaction }, { headers: { Authorization: `Bearer ${token}` } }),
};

export const messageApi = {
  inbox: (token: string) =>
    api.get('/messages/inbox', { headers: { Authorization: `Bearer ${token}` } }),

  roomMessages: (challengeId: number | string, token: string) =>
    api.get(`/challenges/${challengeId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),

  send: (challengeId: number | string, content: string, token: string) =>
    api.post(`/challenges/${challengeId}/messages`, { content }, { headers: { Authorization: `Bearer ${token}` } }),

  markRead: (messageId: number | string, token: string) =>
    api.post(`/messages/${messageId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } }),

  markAllRead: (token: string) =>
    api.post('/messages/read-all', {}, { headers: { Authorization: `Bearer ${token}` } }),
};

export const wrappedApi = {
  get: (challengeId: number | string, months: number, token: string) =>
    api.get(`/challenges/${challengeId}/wrapped?months=${months}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const pledgeApi = {
  get: (challengeId: number | string, token: string) =>
    api.get(`/challenges/${challengeId}/pledges`, { headers: { Authorization: `Bearer ${token}` } }),
  set: (challengeId: number | string, targetDays: number, token: string) =>
    api.post(`/challenges/${challengeId}/pledges`, { target_days: targetDays }, { headers: { Authorization: `Bearer ${token}` } }),
};

export const commitmentApi = {
  get: (challengeId: number | string, token: string) =>
    api.get(`/challenges/${challengeId}/commitments`, { headers: { Authorization: `Bearer ${token}` } }),
  set: (challengeId: number | string, days: number[], token: string) =>
    api.post(`/challenges/${challengeId}/commitments`, { committed_days: days }, { headers: { Authorization: `Bearer ${token}` } }),
};

export const battleApi = {
  list: (token: string) =>
    api.get('/battles', { headers: { Authorization: `Bearer ${token}` } }),
  create: (challengeId: number, opponentCode: string, durationDays: number, token: string) =>
    api.post('/battles', { challenge_id: challengeId, opponent_code: opponentCode, duration_days: durationDays }, { headers: { Authorization: `Bearer ${token}` } }),
  accept: (battleId: number, token: string) =>
    api.post(`/battles/${battleId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } }),
  show: (battleId: number, token: string) =>
    api.get(`/battles/${battleId}`, { headers: { Authorization: `Bearer ${token}` } }),
};

export const feedApi = {
  get: (token: string) =>
    api.get('/feed', { headers: { Authorization: `Bearer ${token}` } }),
};

export const attendanceApi = {
  attend: (challengeId: number | string, lat: number, lng: number, token: string) =>
    api.post(`/challenges/${challengeId}/attend`, { lat, lng }, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  myAttendance: (challengeId: number | string, token: string) =>
    api.get(`/challenges/${challengeId}/my-attendance`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  setGymLocation: (challengeId: number | string, lat: number, lng: number, token: string) =>
    api.post(`/challenges/${challengeId}/gym-location`, { lat, lng }, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  attendCamera: (challengeId: number | string, photoUri: string, token: string) => {
    const formData = new FormData();
    formData.append('photo', { uri: photoUri, name: 'attendance.jpg', type: 'image/jpeg' } as any);
    return api.post(`/challenges/${challengeId}/attend-camera`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
  },

  getPendingAttendances: (challengeId: number | string, token: string) =>
    api.get(`/challenges/${challengeId}/pending-attendances`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  confirmAttendance: (attendanceId: number, token: string) =>
    api.post(`/attendances/${attendanceId}/confirm`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const challengeApi = {
  list: (token: string) =>
    api.get('/challenges', { headers: { Authorization: `Bearer ${token}` } }),
  create: (form: {
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
  }, token: string) => {
    const data = new FormData();
    data.append('name', form.name);
    data.append('duration_days', String(form.durationDays));
    data.append('start_date', form.startDate.toISOString().split('T')[0]);
    data.append('gym_days_per_week', JSON.stringify(form.gymDaysPerWeek));
    data.append('challenge_mode', form.challengeMode);
    data.append('use_location', form.useLocation ? '1' : '0');
    data.append('meeting_point', form.meetingPoint);
    if (form.gymLat !== null && form.gymLat !== undefined) {
      data.append('gym_lat', String(form.gymLat));
      data.append('gym_lng', String(form.gymLng ?? 0));
    }
    data.append('use_camera', form.useCamera ? '1' : '0');

    // Debug: log full payload
    const debugPayload: Record<string, any> = {};
    data.forEach((value, key) => {
      if (typeof value === 'string') debugPayload[key] = value;
      else debugPayload[key] = `[File: ${(value as any).name}]`;
    });
    console.log('[CREATE] payload:', JSON.stringify(debugPayload));

    if (form.coverImage) {
      const fileName = form.coverImage.split('/').pop() ?? 'cover.jpg';
      const ext = fileName.split('.').pop() ?? 'jpg';
      data.append('cover_image', {
        uri: form.coverImage,
        name: fileName,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);
    }

    return fetchMultipart('/challenges', data, token);
  },

  leaderboard: (challengeId: number | string, period: 'semana' | 'mes' | 'año', token: string) =>
    api.get(`/challenges/${challengeId}/leaderboard?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  update: (id: number | string, data: { name: string }, token: string) =>
    api.put(`/challenges/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  delete: (id: number | string, token: string) =>
    api.delete(`/challenges/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export default api;
