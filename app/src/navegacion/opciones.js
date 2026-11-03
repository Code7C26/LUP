// PASO 37 · Estilos de la navegación, con los colores y la tipografía de Lüp (tema.js).
import { StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icono from '../componentes/Icono';
import { ICONOS_PESTANAS } from '../componentes/iconosPestanas';
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

// Barra de arriba de las pantallas de detalle (con la flecha para volver).
// Minimalista: sin línea abajo, mismo fondo que la pantalla y solo la flecha.
export function useOpcionesStack() {
  const { colores } = useTema();
  return {
    headerStyle: { backgroundColor: colores.fondo },
    headerTintColor: colores.titulo,
    headerTitleStyle: { fontFamily: fuentes.media, fontSize: tamanos.normal, color: colores.titulo },
    headerTitleAlign: 'center',
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal', // solo la flecha, sin el texto "Volver"
    contentStyle: { backgroundColor: colores.fondo },
  };
}

// Pestañas de abajo. Cada pantalla ya tiene su título adentro, así que van sin barra arriba:
// solo se deja el espacio de la barra de estado del celular.
export function useOpcionesPestanas() {
  const { colores } = useTema();
  const { top, bottom } = useSafeAreaInsets();
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: colores.fondo, paddingTop: top },
    tabBarActiveTintColor: colores.verdeProfundo,
    tabBarInactiveTintColor: colores.gris,
    tabBarStyle: { backgroundColor: colores.fondo, borderTopWidth: 0, elevation: 0, paddingTop: 8, height: 64 + bottom },
    tabBarItemStyle: { gap: 2 },
    tabBarLabelStyle: { fontFamily: fuentes.media, fontSize: tamanos.mini },
  };
}

// Ícono de cada pestaña: la elegida lleva una "pastilla" verde claro detrás (como las apps nuevas).
// Los íconos están en componentes/iconosPestanas.js
function IconoPestana({ nombrePestana, focused, color }) {
  const { colores } = useTema();
  const [vacio, lleno] = ICONOS_PESTANAS[nombrePestana] || ['ellipse-outline', 'ellipse'];
  return (
    <View style={[estilosPestana.pastilla, focused && { backgroundColor: colores.verdeClaro }]}>
      <Icono nombre={focused ? lleno : vacio} tamano={22} color={color} />
    </View>
  );
}

export function icono(nombrePestana) {
  return function MostrarIcono({ focused, color }) {
    return <IconoPestana nombrePestana={nombrePestana} focused={focused} color={color} />;
  };
}

const estilosPestana = StyleSheet.create({
  pastilla: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
