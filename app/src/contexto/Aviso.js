// Avisos cortitos que aparecen abajo y se van solos ("Agregado al carrito · Ver").
// Uso desde cualquier pantalla:
//   mostrarAviso({ texto: 'Agregado al carrito', boton: 'Ver', alTocar: () => navigation.navigate('Carrito') });
// El componente <Aviso /> ya está puesto en la navegación (navegacion/index.js).
import { useSyncExternalStore } from 'react';

let aviso = null; // { id, texto, boton, alTocar }
const oyentes = new Set();
let temporizador = null;

function cambiar(nuevo) {
  aviso = nuevo;
  oyentes.forEach((oyente) => oyente());
}

export function mostrarAviso({ texto, boton, alTocar, duracion = 2500 }) {
  clearTimeout(temporizador);
  cambiar({ id: Date.now(), texto, boton, alTocar });
  temporizador = setTimeout(() => cambiar(null), duracion);
}

export function cerrarAviso() {
  clearTimeout(temporizador);
  cambiar(null);
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useAviso() {
  return useSyncExternalStore(suscribirse, () => aviso);
}
