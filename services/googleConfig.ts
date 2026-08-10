// Configuración OAuth de Google para MUGEN.
//
// 1. Ve a https://console.cloud.google.com/apis/credentials
// 2. Crea o selecciona tu proyecto (mismo que usa la Google Maps API si existe).
// 3. Pantalla de consentimiento OAuth: añade como Web Client IDs los de esta app.
// 4. Credenciales → "Crear credenciales" → "ID de cliente OAuth":
//    - Aplicación web      → obtienes el Web Client ID.
//    - Android             → introduce el nombre del paquete `com.anonymous.mugen`
//                            y el SHA-1 (expo fetch:android:hashes) → obtienes el Android Client ID.
//    - iOS                 → si testeas en iOS, crea uno con tu Bundle ID.
// 5. Pega aquí los IDs que empiezan por `xxxx.apps.googleusercontent.com`.

export const GOOGLE_CLIENT_ID = {
  // Client ID base. En Expo Go / web se usa el de la "aplicación web".
  clientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com',

  // Web Client ID (obligatorio para web / Expo Go).
  webClientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com',

  // Client ID de Android (se usa al compilar con expo run:android).
  androidClientId: 'TU_ANDROID_CLIENT_ID.apps.googleusercontent.com',

  // Client ID de iOS (solo si pruebas en un iPhone).
  iosClientId: 'TU_IOS_CLIENT_ID.apps.googleusercontent.com',
};

const valid = (id: string | null | undefined) =>
  typeof id === 'string' && id.includes('apps.googleusercontent.com') && !id.startsWith('TU_');

export const GOOGLE_CONFIGURED = valid(GOOGLE_CLIENT_ID.clientId) && valid(GOOGLE_CLIENT_ID.webClientId);