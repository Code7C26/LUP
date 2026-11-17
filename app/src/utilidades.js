import * as Haptics from 'expo-haptics';

import { idiomaActual, t } from './contexto/Idioma';

// Funciones chiquitas que se usan en varias pantallas.
// Las de números y fechas siguen el idioma elegido (contexto/Idioma.js). Las pantallas que las usan
// llaman a useIdioma(), así que se vuelven a dibujar solas al cambiar el idioma.

const enIngles = () => idiomaActual() === 'en';

// Separador de miles a mano (igual en Android y iPhone): "1.700" en español, "1,700" en inglés
function miles(entero) {
  return String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, enIngles() ? ',' : '.');
}

// "1700.00" -> "$1.700" (español) o "$1,700" (inglés)
export function formatoPrecio(valor) {
  const numero = Number(valor);
  if (valor === null || valor === undefined || valor === '' || Number.isNaN(numero)) return '';
  return (numero < 0 ? '-$' : '$') + miles(Math.round(numero));
}

// ---- Fechas: "16/11/2026" en español, "11/16/2026" en inglés ----
// Aceptan un Date o un texto de Django ("2026-11-16" o "2026-11-16T18:30:00-03:00").
function aFecha(valor) {
  if (valor instanceof Date) return valor;
  const texto = String(valor || '');
  const soloDia = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  // "2026-11-16" se toma como día local (new Date() lo tomaría en UTC y podría dar el día anterior)
  if (soloDia) return new Date(Number(soloDia[1]), Number(soloDia[2]) - 1, Number(soloDia[3]));
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

const dos = (n) => String(n).padStart(2, '0');

export function formatoFecha(valor) {
  const f = aFecha(valor);
  if (!f) return '';
  const [d, m] = [dos(f.getDate()), dos(f.getMonth() + 1)];
  return enIngles() ? `${m}/${d}/${f.getFullYear()}` : `${d}/${m}/${f.getFullYear()}`;
}

// "16/11" o "11/16"
export function formatoDiaMes(valor) {
  const f = aFecha(valor);
  if (!f) return '';
  const [d, m] = [dos(f.getDate()), dos(f.getMonth() + 1)];
  return enIngles() ? `${m}/${d}` : `${d}/${m}`;
}

// "16 nov" o "Nov 16" (con el año si no es el actual)
export function formatoDiaMesTexto(valor) {
  const f = aFecha(valor);
  if (!f) return '';
  const mes = t('fechas.meses')[f.getMonth()] ?? '';
  const anio = f.getFullYear() !== new Date().getFullYear() ? ` ${f.getFullYear()}` : '';
  return enIngles() ? `${mes} ${f.getDate()}${anio && ','}${anio}` : `${f.getDate()} ${mes}${anio}`;
}

// "18:30" (las dos usan 24 horas, como la web)
export function formatoHora(valor) {
  const f = aFecha(valor);
  return f ? `${dos(f.getHours())}:${dos(f.getMinutes())}` : '';
}

// ---- Puntos Lüp: la MISMA regla que la web (scr/bd_lup/puntos/models.py → puntos_por_monto) ----
// 1 punto cada $2.000, solo bloques completos: $1.900 → 0 · $2.000 → 1 · $3.900 → 1 · $6.500 → 3
export const PESOS_POR_PUNTO = 2000;

export function puntosPorMonto(monto) {
  const numero = Number(monto);
  return numero > 0 ? Math.floor(numero / PESOS_POR_PUNTO) : 0;
}

// Las ilustraciones de cada categoría y rubro están en componentes/ilustraciones.js.

// Fondo suave de cada categoría (tema.js → colores.suaves[tono]), para los chips del catálogo
const TONOS_CATEGORIA = {
  panificados: 'ambar',
  comidas: 'durazno',
  frutas_verduras: 'verde',
  lacteos: 'menta',
  carnes: 'durazno',
  almacen: 'ambar',
  bolsa_sorpresa: 'verde',
  otros: 'menta',
};

export function tonoCategoria(categoria) {
  return TONOS_CATEGORIA[categoria] || 'menta';
}

// "350 m" o "1,2 km" ("1.2 km" en inglés), sin el "a" de adelante (como el mockup)
export function textoKm(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const numero = km.toFixed(1);
  return `${enIngles() ? numero : numero.replace('.', ',')} km`;
}

// "a 350 m" o "a 1,2 km" ("350 m away" en inglés)
export function textoDistancia(km) {
  const corta = textoKm(km);
  return corta ? t('distancia.a', { d: corta }) : null;
}

// Django REST a veces devuelve los errores como lista: ["Este campo es obligatorio."]
// Esto los convierte siempre en un texto.
export function textoError(error) {
  if (!error) return '';
  if (Array.isArray(error)) return error.join(' ');
  if (typeof error === 'object') return error.error || error.detail || Object.values(error).flat().join(' ');
  return String(error);
}

// Vibración suave al tocar algo importante (agregar al carrito, favorito, reservar).
// Si el celular no vibra o no hay permiso, no pasa nada.

export function vibrar(tipo = 'suave') {
  try {
    if (tipo === 'exito') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // nada
  }
}
