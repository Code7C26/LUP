// Funciones chiquitas que se usan en varias pantallas.

// "1700.00" -> "$1.700"
export function formatoPrecio(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '';
  return '$' + numero.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

// Mismo emoji por categoría que usa la web (templatetags/lup_tags.py)
const EMOJIS_CATEGORIA = {
  panificados: '🥐',
  comidas: '🍲',
  frutas_verduras: '🥕',
  lacteos: '🧀',
  carnes: '🍗',
  almacen: '🥫',
  bolsa_sorpresa: '🛍️',
  otros: '🍽️',
};

export function emojiCategoria(categoria) {
  return EMOJIS_CATEGORIA[categoria] || '🍽️';
}

// Emoji por rubro del comercio (stores/models.py → RUBROS)
const EMOJIS_RUBRO = {
  panaderia: '🥐',
  restaurante: '🍲',
  verduleria: '🥕',
  supermercado: '🛒',
  cafeteria: '☕',
  carniceria: '🥩',
  otro: '🏪',
};

export function emojiRubro(rubro) {
  return EMOJIS_RUBRO[rubro] || '🏪';
}

// "a 350 m" o "a 1,2 km"
export function textoDistancia(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `a ${Math.round(km * 1000)} m`;
  return `a ${km.toFixed(1).replace('.', ',')} km`;
}

// Django REST a veces devuelve los errores como lista: ["Este campo es obligatorio."]
// Esto los convierte siempre en un texto.
export function textoError(error) {
  if (!error) return '';
  if (Array.isArray(error)) return error.join(' ');
  if (typeof error === 'object') return error.error || error.detail || Object.values(error).flat().join(' ');
  return String(error);
}
