// Recuerda qué bienvenidas (las tarjetas verdes del mockup) ya se vieron, una por rol.
// Se muestra la primera vez que alguien entra con ese rol (también como invitado).
// Uso:  const { cargada, vista, marcarVista } = useBienvenida();
//       vista('comercio') → true / false      marcarVista('comercio')
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

function marcarVista(rol) {
  const vistas = { ...estado.vistas, [rol]: true };
  cambiar({ vistas });
  SecureStore.setItemAsync(CLAVE, JSON.stringify(vistas)).catch(() => {});
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useBienvenida() {
  const { cargada, vistas } = useSyncExternalStore(suscribirse, () => estado);
  return { cargada, vista: (rol) => !!vistas[rol], marcarVista };
}
