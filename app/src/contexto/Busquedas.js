// Búsquedas recientes del catálogo (las últimas 6), guardadas en el celular.
// Uso:  const { recientes, guardarBusqueda, quitarBusqueda, borrarBusquedas } = useBusquedas();
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'lup_busquedas';
const MAXIMO = 6;
let recientes = [];
const oyentes = new Set();

function cambiar(nuevas) {
  recientes = nuevas;
  oyentes.forEach((oyente) => oyente());
  SecureStore.setItemAsync(CLAVE, JSON.stringify(recientes)).catch(() => {});
}

SecureStore.getItemAsync(CLAVE)
  .then((guardado) => {
    const lista = JSON.parse(guardado || '[]');
    if (Array.isArray(lista)) {
      recientes = lista;
      oyentes.forEach((oyente) => oyente());
    }
  })
  .catch(() => {});

function guardarBusqueda(texto) {
  const limpio = texto.trim();
  if (limpio.length < 3) return;
  // La más nueva primero y sin repetir (sin importar mayúsculas)
  const sinRepetir = recientes.filter((r) => r.toLowerCase() !== limpio.toLowerCase());
  cambiar([limpio, ...sinRepetir].slice(0, MAXIMO));
}

function quitarBusqueda(texto) {
  cambiar(recientes.filter((r) => r !== texto));
}

// También lo usa "Cerrar sesión" (contexto/Sesion.js)
export function borrarBusquedas() {
  cambiar([]);
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useBusquedas() {
  const lista = useSyncExternalStore(suscribirse, () => recientes);
  return { recientes: lista, guardarBusqueda, quitarBusqueda, borrarBusquedas };
}
