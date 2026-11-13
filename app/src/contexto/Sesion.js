// PASO 36 · Sesión del usuario.
// Guarda quién está logueado y lo comparte con TODAS las pantallas.
// Uso en cualquier pantalla:
//   const { usuario, iniciarSesion, cerrarSesion } = useSesion();
//   usuario = { id, rol, nombre, foto, token }  o  null si no hay sesión
import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { api, borrarToken, guardarToken, leerToken } from '../api/cliente';
import { borrarPush, registrarPush } from '../servicios/push';
import { cancelarTodosLosRecordatorios } from '../servicios/recordatorios';
import { borrarBienvenidas } from './Bienvenida';
import { borrarBusquedas } from './Busquedas';
import { vaciar as vaciarCarrito } from './Carrito';
import { borrarFavoritos } from './Favoritos';

const ContextoSesion = createContext(null);
const CLAVE_USUARIO = 'lup_usuario';

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [invitado, setInvitado] = useState(false); // tocó "Omitir" en el login

  // Al abrir la app: si había una sesión guardada, la recupera.
  useEffect(() => {
    (async () => {
      try {
        const token = await leerToken();
        if (!token) return;
        const guardado = await SecureStore.getItemAsync(CLAVE_USUARIO);
        if (guardado) setUsuario(JSON.parse(guardado)); // se muestra al instante
        const actualizado = await api('/auth/yo/'); // y se actualiza con Django
        await guardarSesion(actualizado);
        registrarPush(); // por si el celular cambió de token (no se espera: la app abre igual)
      } catch (e) {
        // Si el token ya no sirve, se cierra la sesión.
        // Si solo no hay conexión, se mantiene la sesión guardada.
        if (!e?.sinConexion) await cerrarSesion();
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function guardarSesion(datos) {
    await guardarToken(datos.token);
    await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(datos));
    setUsuario(datos);
  }

  // rolEsperado (opcional): el tipo de cuenta elegido arriba en el login.
  // Se revisa ANTES de guardar la sesión: si no coincide, no se entra y se avisa,
  // sin que la app llegue a cambiar de pantalla.
  async function iniciarSesion(username, password, rolEsperado) {
    const datos = await api('/auth/login/', { metodo: 'POST', datos: { username, password } });
    if (rolEsperado && datos.rol !== rolEsperado) {
      throw { rolReal: datos.rol };
    }
    await guardarSesion(datos);
    registrarPush(); // avisos al celular ("Te hicieron una reserva"): pide permiso y registra el celular
    return datos;
  }

  async function registrar(rol, campos) {
    const datos = await api(`/auth/registro/${rol}/`, { metodo: 'POST', datos: campos });
    await guardarSesion(datos);
    registrarPush();
    return datos;
  }

  // Además de la sesión, borra todo lo que esa cuenta dejó guardado en el celular:
  // carrito, favoritos, búsquedas recientes, avisos de retiro y la bienvenida (se vuelve a ver al entrar).
  // Y deja de mandarle notificaciones push de esta cuenta a este celular.
  // Lo que está en Django (cuenta, reservas, productos) no se toca. La apariencia elegida se mantiene.
  async function cerrarSesion() {
    await borrarPush(); // primero, mientras la sesión sigue valiendo: así no le llegan más avisos de esta cuenta
    await borrarToken();
    await SecureStore.deleteItemAsync(CLAVE_USUARIO);
    vaciarCarrito();
    borrarFavoritos();
    borrarBusquedas();
    borrarBienvenidas();
    await cancelarTodosLosRecordatorios();
    setUsuario(null);
    setInvitado(false); // vuelve a mostrar el login
  }

  const valor = {
    usuario,
    cargando,
    invitado,
    entrarComoInvitado: () => setInvitado(true),
    actualizarUsuario: guardarSesion, // después de "Editar mis datos" (lo que devuelve PATCH /api/auth/yo/)
    iniciarSesion,
    registrar,
    cerrarSesion,
  };

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  return useContext(ContextoSesion);
}
