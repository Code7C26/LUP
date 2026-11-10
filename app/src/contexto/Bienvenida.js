// Recuerda qué bienvenidas ya se vieron, una por CUENTA (y una para el invitado).
// Sale apenas se entra: al iniciar sesión, al crear la cuenta o al tocar "Omitir".
// Como "Cerrar sesión" las borra (borrarBienvenidas), al volver a entrar se ve de nuevo.
// Uso:  const { cargada, vista, marcarVista } = useBienvenida();
//       const clave = claveBienvenida(usuario);   vista(clave) → true / false   marcarVista(clave)
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'lup_bienvenidas_vistas';
let estado = { cargada: false, vistas: {} };
const oyentes = new Set();

function cambiar(nuevo) {
  estado = { ...estado, ...nuevo };
  oyentes.forEach((oyente) => oyente());
}

SecureStore.getItemAsync(CLAVE)
  .then((valor) => cambiar({ cargada: true, vistas: JSON.parse(valor || '{}') || {} }))
  .catch(() => cambiar({ cargada: true }));

// "cuenta-12" para alguien con sesión, "invitado" si entró con "Omitir"
export function claveBienvenida(usuario) {
  return usuario ? `cuenta-${usuario.id}` : 'invitado';
}

function marcarVista(clave) {
  const vistas = { ...estado.vistas, [clave]: true };
  cambiar({ vistas });
  SecureStore.setItemAsync(CLAVE, JSON.stringify(vistas)).catch(() => {});
}

// Al cerrar sesión (contexto/Sesion.js)
export function borrarBienvenidas() {
  cambiar({ vistas: {} });
  SecureStore.deleteItemAsync(CLAVE).catch(() => {});
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useBienvenida() {
  const { cargada, vistas } = useSyncExternalStore(suscribirse, () => estado);
  return { cargada, vista: (clave) => !!vistas[clave], marcarVista };
}
