// Comercios favoritos (el corazón). Se guardan en el celular, no en Django:
// así funciona también como invitado y no hace falta cambiar la API.
// Uso en cualquier pantalla (no necesita "Provider"):
//   const { esFavorito, alternar } = useFavoritos();
//   esFavorito(comercio.id)  → true / false
//   alternar(comercio.id)    → lo agrega o lo saca
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'lup_favoritos';
let favoritos = []; // ids de comercios
const oyentes = new Set();

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

// Al abrir la app se leen los guardados
SecureStore.getItemAsync(CLAVE)
  .then((guardado) => {
    const lista = JSON.parse(guardado || '[]');
    if (Array.isArray(lista)) {
      favoritos = lista;
      avisar();
    }
  })
  .catch(() => {});

function alternar(id) {
  favoritos = favoritos.includes(id) ? favoritos.filter((f) => f !== id) : [...favoritos, id];
  avisar();
  SecureStore.setItemAsync(CLAVE, JSON.stringify(favoritos)).catch(() => {});
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useFavoritos() {
  const lista = useSyncExternalStore(suscribirse, () => favoritos);
  return { favoritos: lista, esFavorito: (id) => lista.includes(id), alternar };
}
