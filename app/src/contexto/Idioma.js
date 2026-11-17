// Idioma de la app: español o inglés, igual que la web (botón EN/ES).
// Funciona como el tema (tema.js): un "store" con useSyncExternalStore, sin Provider.
// Lo elegido ("auto", "es" o "en") queda guardado en el celular. "auto" usa el idioma del celular.
//
// En un componente:
//   const { t, idioma } = useIdioma();
//   <Text>{t('perfil.cerrarSesion')}</Text>
//   t('carrito.productos', { n: 2 })          → "2 productos" / "2 products"  (plural con "one" y "other")
//   t('inicio.hola', { nombre: 'Ana' })       → "Hola, Ana"   (las {variables} se reemplazan)
// Fuera de un componente (notificaciones, servicios):  import { t } from '../contexto/Idioma';
// Los textos están en src/idiomas/es.js y en.js. Si falta uno en inglés, se usa el español.
import { useCallback, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

import en from '../idiomas/en';
import es from '../idiomas/es';

const TEXTOS = { es, en };
const CLAVE = 'lup_idioma';
let opcion = 'auto'; // 'auto' | 'es' | 'en'
const oyentes = new Set();
// La primera vez que se abre la app no hay nada guardado: se muestra "Elegí tu idioma" (pantallas/ElegirIdioma.js).
// cargado = ya se leyó el celular · elegido = hay un idioma guardado (o se acaba de elegir)
let inicio = { cargado: false, elegido: false };

// El idioma del celular, sin librerías nativas (así el APK no cambia)
export function idiomaDelCelular() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

const resolver = (elegida) => (elegida === 'es' || elegida === 'en' ? elegida : idiomaDelCelular());

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

// Al abrir la app se lee lo que eligió la última vez
SecureStore.getItemAsync(CLAVE)
  .then((guardada) => {
    if (guardada === 'es' || guardada === 'en') opcion = guardada;
    inicio = { cargado: true, elegido: guardada === 'es' || guardada === 'en' || guardada === 'auto' };
    avisar();
  })
  .catch(() => {
    // Si no se puede leer, no se pregunta (tampoco se podría guardar la respuesta)
    inicio = { cargado: true, elegido: true };
    avisar();
  });

export function cambiarIdioma(nueva) {
  opcion = nueva === 'es' || nueva === 'en' ? nueva : 'auto';
  inicio = { cargado: true, elegido: true };
  avisar();
  SecureStore.setItemAsync(CLAVE, opcion).catch(() => {});
}

// SOLO PARA PROBAR (Configuración, en modo desarrollo): olvida el idioma guardado y vuelve a "Elegí tu idioma".
// Hace falta porque en iPhone lo guardado en SecureStore queda aunque se borre Expo Go.
export function olvidarIdiomaElegido() {
  opcion = 'auto';
  inicio = { cargado: true, elegido: false };
  avisar();
  SecureStore.deleteItemAsync(CLAVE).catch(() => {});
}

// 'es' o 'en' (ya resuelto "auto"): para el código que no es un componente
export function idiomaActual() {
  return resolver(opcion);
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

function buscar(diccionario, clave) {
  return clave.split('.').reduce((nodo, parte) => (nodo && typeof nodo === 'object' ? nodo[parte] : undefined), diccionario);
}

// En español y en inglés el plural es igual: 1 → "one", el resto → "other"
const formaPlural = (n) => (Math.abs(Number(n)) === 1 ? 'one' : 'other');

export function traducir(idioma, clave, variables) {
  let texto = buscar(TEXTOS[idioma] || es, clave);
  if (texto === undefined) texto = buscar(es, clave); // si falta en inglés, en español
  if (Array.isArray(texto)) return texto; // listas (por ejemplo, los nombres de los meses)
  if (texto && typeof texto === 'object' && variables?.n !== undefined) {
    texto = texto[formaPlural(variables.n)] ?? texto.other;
  }
  if (typeof texto !== 'string') {
    if (__DEV__) console.warn(`Idioma: falta el texto "${clave}"`);
    return clave;
  }
  if (!variables) return texto;
  return texto.replace(/\{(\w+)\}/g, (marca, nombre) =>
    variables[nombre] === undefined || variables[nombre] === null ? marca : String(variables[nombre])
  );
}

// Opciones que vienen de Django en español (rubros, tipos de organización, categorías):
// se traducen por su código ('panaderia', 'comedor'...). Si no hay traducción, queda el texto de Django.
//   opciones.map(([valor, texto]) => [valor, textoDeOpcion(t, 'rubros', valor, texto)])
export function textoDeOpcion(traducirCon, seccion, valor, porDefecto) {
  const clave = `${seccion}.${valor}`;
  const texto = buscar(es, clave) === undefined ? undefined : traducirCon(clave);
  return texto ?? porDefecto;
}

// Lo mismo, pero cuando Django manda solo el texto en español (sin el código):
//   textoDesdeEspanol(t, 'rubros', 'Panadería / Confitería')  → "Bakery / Pastry shop" en inglés
export function textoDesdeEspanol(traducirCon, seccion, textoEspanol) {
  const opciones = es[seccion] || {};
  const clave = Object.keys(opciones).find((k) => opciones[k] === textoEspanol);
  return clave ? traducirCon(`${seccion}.${clave}`) : textoEspanol;
}

// Para servicios y funciones sueltas (usa el idioma de este momento)
export const t = (clave, variables) => traducir(idiomaActual(), clave, variables);

// Para la navegación: { cargado, elegido }. Mientras no esté cargado se espera; si no se eligió, "Elegí tu idioma".
export function useIdiomaInicial() {
  return useSyncExternalStore(suscribirse, () => inicio);
}

// Hook para usar en cualquier pantalla o componente: al cambiar el idioma se vuelve a dibujar
export function useIdioma() {
  const elegida = useSyncExternalStore(suscribirse, () => opcion);
  const idioma = resolver(elegida);
  const traducirAca = useCallback((clave, variables) => traducir(idioma, clave, variables), [idioma]);
  return { idioma, opcion: elegida, t: traducirAca, cambiarIdioma };
}
