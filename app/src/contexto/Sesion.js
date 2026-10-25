// PASO 36 · Sesión del usuario.
// Guarda quién está logueado y lo comparte con TODAS las pantallas.
// Uso en cualquier pantalla:
//   const { usuario, iniciarSesion, cerrarSesion } = useSesion();
//   usuario = { id, rol, nombre, foto, token }  o  null si no hay sesión
import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { api, borrarToken, guardarToken, leerToken } from '../api/cliente';

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

  async function iniciarSesion(username, password) {
    const datos = await api('/auth/login/', { metodo: 'POST', datos: { username, password } });
    await guardarSesion(datos);
    return datos;
  }

  async function registrar(rol, campos) {
    const datos = await api(`/auth/registro/${rol}/`, { metodo: 'POST', datos: campos });
    await guardarSesion(datos);
    return datos;
  }

  async function cerrarSesion() {
    await borrarToken();
    await SecureStore.deleteItemAsync(CLAVE_USUARIO);
    setUsuario(null);
    setInvitado(false); // vuelve a mostrar el login
  }

  const valor = {
    usuario,
    cargando,
    invitado,
    entrarComoInvitado: () => setInvitado(true),
    iniciarSesion,
    registrar,
    cerrarSesion,
  };

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  return useContext(ContextoSesion);
}
