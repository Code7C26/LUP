// Tema visual de Lüp para la app.
// Usa los MISMOS colores que la web (scr/static/css/lup.css), en modo claro y oscuro.
import { useColorScheme } from 'react-native';

// Modo claro (igual que :root en lup.css)
const paletaClara = {
  fondo: '#F7F5EE', // --lup-crema
  superficie: '#FFFFFF', // tarjetas
  campo: '#FCFDFB', // fondo de los inputs
  borde: '#E2E8DF',
  texto: '#1D2B23',
  titulo: '#073425',
  gris: '#5C6B62', // textos secundarios
  verde: '#71A24D', // color principal (botones)
  verdeHover: '#5E8C3D', // links y botón apretado
  verdeProfundo: '#073425', // verde oscuro de la marca
  menta: '#E9F2E3', // fondos suaves
  ambar: '#E39B2D', // avisos ("vence hoy")
  ambarClaro: '#FDF1DE',
  error: '#B3261E',
  sobreVerde: '#FFFFFF', // texto encima de un botón verde
};

// Modo oscuro (igual que [data-bs-theme="dark"] en lup.css)
const paletaOscura = {
  ...paletaClara,
  fondo: '#0E1713',
  superficie: '#16221C',
  campo: '#1A2821',
  borde: '#2A3B32',
  texto: '#E2EAE4',
  titulo: '#E7F2DF',
  gris: '#9DB0A4',
  verdeHover: '#93C46E',
  menta: '#1F3329',
  ambarClaro: '#3A2B13',
  error: '#F2B8B5',
};

// Tipografía Poppins (se carga en App.js)
export const fuentes = {
  normal: 'Poppins_400Regular',
  media: 'Poppins_500Medium',
  negrita: 'Poppins_700Bold',
};

// Tamaños de letra: usar siempre estos para que todo se vea parejo
export const tamanos = {
  chico: 13,
  normal: 15,
  mediano: 18,
  grande: 24,
  titulo: 30,
};

// Espacios: espacio(1) = 8, espacio(2) = 16, espacio(3) = 24...
export const espacio = (n) => n * 8;

// Bordes redondeados, igual que la web (--lup-radio: 20px)
export const radio = 20;

// Hook para usar en cualquier pantalla:
//   const { colores, esOscuro } = useTema();
// Cambia solo según el modo (claro u oscuro) que tenga el celular.
export function useTema() {
  const esOscuro = useColorScheme() === 'dark';
  return { colores: esOscuro ? paletaOscura : paletaClara, esOscuro };
}
