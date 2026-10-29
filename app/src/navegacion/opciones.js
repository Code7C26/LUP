// PASO 37 · Estilos de la navegación, con los colores y la tipografía de Lüp (tema.js).
import { Text } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fuentes, tamanos, useTema } from '../tema';

// Tema de React Navigation (fondo, barras, bordes) con la paleta de Lüp, claro u oscuro
export function useTemaNavegacion() {
  const { colores, esOscuro } = useTema();
  const base = esOscuro ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.verde,
      background: colores.fondo,
      card: colores.superficie,
      text: colores.titulo,
      border: colores.borde,
    },
  };
}

// Barra de arriba de las pantallas de detalle (con la flecha para volver)
export function useOpcionesStack() {
  const { colores } = useTema();
  return {
    headerStyle: { backgroundColor: colores.superficie },
    headerTintColor: colores.verdeHover,
    headerTitleStyle: { fontFamily: fuentes.media, fontSize: tamanos.mediano, color: colores.titulo },
    headerShadowVisible: false,
    headerBackTitle: 'Volver',
    contentStyle: { backgroundColor: colores.fondo },
  };
}

// Pestañas de abajo. Cada pantalla ya tiene su título adentro, así que van sin barra arriba:
// solo se deja el espacio de la barra de estado del celular.
export function useOpcionesPestanas() {
  const { colores } = useTema();
  const { top } = useSafeAreaInsets();
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: colores.fondo, paddingTop: top },
    tabBarActiveTintColor: colores.verdeHover,
    tabBarInactiveTintColor: colores.gris,
    tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.borde },
    tabBarLabelStyle: { fontFamily: fuentes.media, fontSize: 12 },
  };
}

// Ícono de pestaña con un emoji (no hace falta instalar una librería de íconos)
export function icono(emoji) {
  return function IconoPestana({ focused }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
  };
}
