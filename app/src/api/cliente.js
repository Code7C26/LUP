// PASO 36 · Conexión con la API de Django.
// Todas las pantallas hablan con Django a través de la función api():
//   const productos = await api('/productos/');
//   const reserva = await api('/productos/8/reservar/', { metodo: 'POST', datos: { cantidad: 1 } });
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Dirección del servidor de Django.
// En desarrollo, se usa la MISMA compu que está corriendo Expo, en el puerto 8000.
// (Expo ya sabe la IP de la compu: la saca del QR que escaneaste).
// Si el celular no llega a esa IP (Expo con --tunnel, otra red, la IP de VirtualBox), se puede
// fijar la dirección a mano en app/.env y reiniciar Expo:
//   EXPO_PUBLIC_URL_SERVIDOR=http://192.168.1.9:8000
// Cuando la web esté publicada (paso 32), poner ahí la dirección real, por ejemplo:
//   EXPO_PUBLIC_URL_SERVIDOR=https://lup.onrender.com
function servidorDeDesarrollo() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:8000` : 'http://127.0.0.1:8000';
}

export const URL_SERVIDOR = (process.env.EXPO_PUBLIC_URL_SERVIDOR || servidorDeDesarrollo()).replace(/\/$/, '');
export const URL_API = `${URL_SERVIDOR}/api`;

// ---- Token de la sesión (se guarda cifrado en el celular) ----
const CLAVE_TOKEN = 'lup_token';

export const guardarToken = (token) => SecureStore.setItemAsync(CLAVE_TOKEN, token);
export const leerToken = () => SecureStore.getItemAsync(CLAVE_TOKEN);
export const borrarToken = () => SecureStore.deleteItemAsync(CLAVE_TOKEN);

// Las fotos pueden venir como "/media/productos/x.jpg": esto les agrega el servidor.
export function urlCompleta(ruta) {
  if (!ruta) return null;
  return ruta.startsWith('http') ? ruta : URL_SERVIDOR + ruta;
}

// ---- La función para hablar con Django ----
export async function api(ruta, { metodo = 'GET', datos } = {}) {
  const token = await leerToken();
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Token ${token}`;

  let body;
  if (datos instanceof FormData) {
    body = datos; // fotos: el celular arma solo el "Content-Type"
  } else if (datos !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(datos);
  }

  // Sin esto, si el celular no llega al servidor, fetch se queda esperando varios minutos.
  // Las fotos tardan más en subir, así que tienen más margen.
  const control = new AbortController();
  const espera = setTimeout(() => control.abort(), datos instanceof FormData ? 60000 : 15000);

  let respuesta;
  try {
    respuesta = await fetch(URL_API + ruta, { method: metodo, headers, body, signal: control.signal });
  } catch (e) {
    // No llegó ni a Django (servidor apagado, otra red, un FormData mal armado, etc.)
    // El error real queda en la terminal de Expo para poder ver qué pasó.
    console.warn(`api(${metodo} ${ruta}) falló antes de llegar a Django (${URL_SERVIDOR}):`, e?.message || e);
    throw {
      sinConexion: true,
      error: `No pudimos conectar con Lüp (${URL_SERVIDOR}). Revisá que Django esté corriendo y que el celular esté en el mismo Wi-Fi que la compu.`,
    };
  } finally {
    clearTimeout(espera);
  }

  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    // Django respondió con un error: lo pasamos tal cual a la pantalla
    throw { ...json, estado: respuesta.status };
  }
  return json;
}
