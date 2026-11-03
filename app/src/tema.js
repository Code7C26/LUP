// Tema visual de Lüp para la app.
// Usa los MISMOS colores que la web (scr/static/css/lup.css), en modo claro y oscuro.
//
// Colores y letras copiados del mockup. El modo se puede ELEGIR desde Perfil → Apariencia
// ("Automático", "Claro" u "Oscuro") y queda guardado en el celular.
// No hace falta ningún "Provider": cualquier pantalla que use useTema() se actualiza sola.
import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Modo claro: IGUAL AL MOCKUP (doc/manuales - de empresa/MOCK UP - LÚP.pdf)
//   fondo blanco, textos gris oscuro, campos grises con borde, botones verde oscuro
//   y el verde claro de la barra de roles y de la bienvenida.
const paletaClara = {
  fondo: '#FFFFFF', // el mockup es blanco
  superficie: '#F3F3F3', // tarjetas y recuadros: gris muy claro sobre el blanco
  panel: '#EDEDED', // las tarjetas grises de los productos (mockup)
  campo: '#E6E6E6', // relleno de los campos
  borde: '#D2D2D2', // borde fino de campos y recuadros
  texto: '#1F1F1F', // texto común (en el mockup, casi negro)
  titulo: '#4D4C4C', // títulos ("Ingresá a tu cuenta", "Cerca tuyo", "Mi Perfil")
  gris: '#6B6A6A', // textos secundarios y etiquetas
  verde: '#71A24D', // verde de la hoja del logo
  verdeHover: '#153D30', // links ("Regístrate gratis acá")
  verdeProfundo: '#073425', // botones y pestaña elegida
  verdeClaro: '#B6D1A1', // barra de roles y tarjeta de bienvenida
  menta: '#EEF4EA', // fondos suaves (círculos de íconos)
  ambar: '#E39B2D', // avisos ("vence hoy")
  ambarClaro: '#FDF1DE',
  error: '#D32F2F', // "Eliminar" en rojo como el mockup
  sobreVerde: '#FFFFFF',
  sobreVerdeProfundo: '#FFFFFF', // texto de los botones
  corazon: '#E0533D', // favoritos
  sombra: '#000000',
  velo: 'rgba(0, 0, 0, 0.45)',
};

// Modo oscuro: la misma estructura, con los verdes oscuros de la web
const paletaOscura = {
  ...paletaClara,
  fondo: '#0E1713',
  superficie: '#16221C',
  panel: '#1B2822',
  campo: '#1E2C25',
  borde: '#2E4036',
  texto: '#E2EAE4',
  titulo: '#E7F2DF',
  gris: '#A3B2A9',
  verdeHover: '#93C46E',
  verdeProfundo: '#93C46E',
  verdeClaro: '#24392D',
  menta: '#1F3329',
  ambarClaro: '#3A2B13',
  error: '#F2B8B5',
  sobreVerdeProfundo: '#0E1713',
  velo: 'rgba(0, 0, 0, 0.55)',
};

// Tipografías del mockup (se cargan en App.js):
//   DM Sans para casi todo el texto, Poppins para botones y frases de marca.
export const fuentes = {
  normal: 'DMSans_400Regular',
  media: 'DMSans_500Medium',
  negrita: 'DMSans_700Bold',
  boton: 'Poppins_700Bold', // "Ingresar como Consumidor", "Publicar"
  botonMedio: 'Poppins_500Medium', // "Iniciar sesión", botones chicos
  marca: 'Poppins_700Bold', // "Una segunda oportunidad para cada alimento"
};

// Tamaños de letra: usar siempre estos para que todo se vea parejo
export const tamanos = {
  mini: 11,
  chico: 13,
  normal: 15,
  mediano: 18,
  grande: 24,
  titulo: 30,
};

// Espacios: espacio(1) = 8, espacio(2) = 16, espacio(3) = 24...
export const espacio = (n) => n * 8;

// Bordes redondeados como el mockup (tarjetas y campos)
export const radio = 14;

// Sombra MUY suave para las tarjetas (estilo minimalista) (en Android se usa "elevation")
export function sombra(colores, nivel = 1) {
  return {
    shadowColor: colores.sombra,
    shadowOpacity: 0.04 * nivel,
    shadowRadius: 10 * nivel,
    shadowOffset: { width: 0, height: 2 * nivel },
    elevation: nivel,
  };
}

// ---- Apariencia elegida: 'sistema' | 'claro' | 'oscuro' ----
const CLAVE_APARIENCIA = 'lup_apariencia';
let apariencia = 'sistema';
const oyentes = new Set();

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

// Al abrir la app se lee lo que eligió la última vez
SecureStore.getItemAsync(CLAVE_APARIENCIA)
  .then((guardada) => {
    if (guardada === 'claro' || guardada === 'oscuro') {
      apariencia = guardada;
      avisar();
    }
  })
  .catch(() => {});

export function cambiarApariencia(nueva) {
  apariencia = nueva;
  avisar();
  SecureStore.setItemAsync(CLAVE_APARIENCIA, nueva).catch(() => {});
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

// Hook para usar en cualquier pantalla:
//   const { colores, esOscuro, apariencia } = useTema();
export function useTema() {
  const elegida = useSyncExternalStore(suscribirse, () => apariencia);
  const delSistema = useColorScheme();
  const esOscuro = elegida === 'sistema' ? delSistema === 'dark' : elegida === 'oscuro';
  return { colores: esOscuro ? paletaOscura : paletaClara, esOscuro, apariencia: elegida };
}
