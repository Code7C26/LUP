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

const CLAVE = 'lup_push_token'; // el token de este celular, para borrarlo al cerrar sesión

function projectId() {
  return Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
}

export async function registrarPush() {
  try {
    if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      console.info('Push: Expo Go en Android no recibe notificaciones push. Probá con un development build.');
      return;
    }
    const id = projectId();
    if (!id) {
      console.info('Push: falta el projectId de EAS en app.json (correr "npx eas init").');
      return;
    }
    // En Android, el canal "avisos" tiene que existir antes de pedir permiso (y es el que usa Django)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('avisos', {
        name: 'Avisos de Lüp',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#71A24D',
      });
    }
    const permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await api('/auth/push/', { metodo: 'POST', datos: { token } });
    await SecureStore.setItemAsync(CLAVE, token);
  } catch (e) {
    console.warn('Push: no se pudo registrar el celular', e?.message || e?.error || e);
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
