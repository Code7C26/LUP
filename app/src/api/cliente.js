// PASO 36 · Conexión con la API de Django.
// Todas las pantallas hablan con Django a través de la función api():
//   const productos = await api('/productos/');
//   const reserva = await api('/productos/8/reservar/', { metodo: 'POST', datos: { cantidad: 1 } });
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Dirección del servidor de Django.
// En desarrollo, se usa la MISMA compu que está corriendo Expo, en el puerto 8000.
// (Expo ya sabe la IP de la compu: la saca del QR que escaneaste).
// Cuando la web esté publicada (paso 32), cambiar esto por la dirección real, por ejemplo:
//   export const URL_SERVIDOR = 'https://lup.onrender.com';
function servidorDeDesarrollo() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:8000` : 'http://127.0.0.1:8000';
}

export const URL_SERVIDOR = servidorDeDesarrollo();
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

  let respuesta;
  try {
    respuesta = await fetch(URL_API + ruta, { method: metodo, headers, body });
  } catch {
    // No llegó ni a Django (servidor apagado, otra red, etc.)
    throw {
      sinConexion: true,
      error: 'No pudimos conectar con Lüp. Revisá que el servidor de Django esté corriendo.',
    };
  }

  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    // Django respondió con un error: lo pasamos tal cual a la pantalla
    throw { ...json, estado: respuesta.status };
  }
  return json;
}
