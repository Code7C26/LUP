// Notificaciones push: avisos al celular aunque la app esté cerrada
// ("Te hicieron una reserva", "Aceptaron tu donación"). Las manda Django con el servicio de Expo
// (scr/bd_lup/users/push.py) a los celulares registrados en POST /api/auth/push/.
// Uso (ya está conectado en contexto/Sesion.js y navegacion/index.js):
//   registrarPush()   ← al iniciar sesión o abrir la app con sesión: pide permiso y registra el celular
//   borrarPush()      ← al cerrar sesión, ANTES de borrar el token de la sesión
//   abrirPantallaDelAviso(navegacion, datos)   ← al tocar un aviso
//
// Para que funcione hace falta el "projectId" de EAS en app.json (se agrega con "npx eas init")
// y, en Android, probar con un development build: Expo Go ya no recibe push en Android.
// Si falta algo, no pasa nada: la app sigue igual y los avisos llegan por email.
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { api } from '../api/cliente';
import { t } from '../contexto/Idioma';

const CLAVE = 'lup_push_token'; // el token de este celular, para borrarlo al cerrar sesión

function projectId() {
  return Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
}

export async function registrarPush() {
  try {
    // En Expo Go en Android, las notificaciones push NO funcionan (es una limitación de Expo Go)
    if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      console.info('Push: Expo Go en Android no recibe notificaciones push. Probá con el APK de EAS.');
      return;
    }
    const id = projectId();
    if (!id) {
      console.error('Push: falta el projectId en app.json (correr "npx eas init")');
      return;
    }

    // En Android, crear el canal "avisos" ANTES de pedir permiso (obligatorio en Android 8+)
    if (Platform.OS === 'android') {
      console.info('Push: creando canal "avisos" en Android');
      await Notifications.setNotificationChannelAsync('avisos', {
        name: t('push.canal'),
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#71A24D',
        enableSound: true,
        enableVibrate: true,
        sound: 'default',
      });
      console.info('Push: canal "avisos" creado');
    }

    // En Android 13+, pedir permiso explícito (en versiones anteriores se da automático)
    console.info('Push: pidiendo permiso de notificaciones');
    const permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) {
      console.warn('Push: permiso denegado por el usuario');
      return;
    }
    console.info('Push: permiso otorgado');

    console.info('Push: obteniendo token de Expo');
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    console.info(`Push: token obtenido: ${token.substring(0, 20)}...`);

    console.info('Push: registrando token en el servidor');
    await api('/auth/push/', { metodo: 'POST', datos: { token } });
    await SecureStore.setItemAsync(CLAVE, token);
    console.info('Push: token registrado en el servidor y guardado localmente');
  } catch (e) {
    console.error('Push: error al registrar', {
      mensaje: e?.message,
      codigo: e?.code,
      error: e?.error || String(e),
    });
  }
}

export async function borrarPush() {
  try {
    const token = await SecureStore.getItemAsync(CLAVE);
    if (!token) return;
    await SecureStore.deleteItemAsync(CLAVE);
    // Como mucho 3 segundos: sin conexión, cerrar sesión no se queda esperando
    await Promise.race([
      api('/auth/push/', { metodo: 'DELETE', datos: { token } }).catch(() => {}),
      new Promise((listo) => setTimeout(listo, 3000)),
    ]);
  } catch {
    // sin conexión: Django lo pasa a la cuenta nueva cuando este celular vuelva a iniciar sesión
  }
}

// "datos" es lo que manda Django: { pantalla: 'MisReservas' } o { pantalla: 'DetalleProducto', id: 8 }
const PANTALLAS_SUELTAS = ['DetalleProducto', 'DetalleComercio']; // están arriba de las pestañas

export function abrirPantallaDelAviso(navegacion, datos) {
  const pantalla = datos?.pantalla;
  if (!pantalla || !navegacion?.isReady?.()) return false;
  try {
    if (PANTALLAS_SUELTAS.includes(pantalla)) {
      navegacion.navigate(pantalla, { id: datos.id });
    } else {
      navegacion.navigate('Pestanas', { screen: pantalla }); // una pestaña del rol
    }
    return true;
  } catch {
    return false;
  }
}
