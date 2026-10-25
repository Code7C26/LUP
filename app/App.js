// App.js DE PRUEBA para los pasos 36, 38, 39 y 40.
// Todavía no hay navegación (es el paso 37), así que acá se cambia de pantalla "a mano".
// Cuando se suba el paso 37, este archivo se reemplaza por el que muestra la navegación.
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import Cargando from './src/componentes/Cargando';
import { ProveedorSesion, useSesion } from './src/contexto/Sesion';
import Inicio from './src/pantallas/Inicio';
import Login from './src/pantallas/Login';
import Registro from './src/pantallas/Registro';
import RegistroSeleccion from './src/pantallas/RegistroSeleccion';
import { espacio, fuentes, tamanos, useTema } from './src/tema';

// Barra de arriba de prueba: muestra quién está logueado y el botón para salir
function BarraDePrueba() {
  const { colores } = useTema();
  const { usuario, cerrarSesion } = useSesion();
  const { top } = useSafeAreaInsets();

  return (
    <View style={[estilos.barra, { paddingTop: top + espacio(1), backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <Text style={[estilos.hola, { color: colores.titulo }]} numberOfLines={1}>
        {usuario ? `Hola, ${usuario.nombre}` : 'Invitado'}
      </Text>
      <Text style={[estilos.salir, { color: colores.verdeHover }]} onPress={cerrarSesion}>
        {usuario ? 'Cerrar sesión' : 'Iniciar sesión'}
      </Text>
    </View>
  );
}

function Pantallas() {
  const { usuario, cargando, invitado } = useSesion();
  const [pantalla, setPantalla] = useState({ nombre: 'Login', params: {} });

  // Al cerrar sesión, se vuelve al login (y no al formulario donde se había quedado)
  useEffect(() => {
    if (!usuario && !invitado) setPantalla({ nombre: 'Login', params: {} });
  }, [usuario, invitado]);

  if (cargando) return <Cargando texto="Abriendo Lüp…" />;

  // Con sesión (o como invitado): Inicio "Cerca tuyo"
  if (usuario || invitado) {
    const navegacionInicio = {
      navigate: (nombre) =>
        Alert.alert('Todavía no está', `La pantalla "${nombre}" se hace en el paso 41.`),
    };
    return (
      <View style={{ flex: 1 }}>
        <BarraDePrueba />
        <Inicio navigation={navegacionInicio} />
      </View>
    );
  }

  // Sin sesión: Login → elegir tipo de cuenta → formulario de registro
  const navegacionFalsa = {
    navigate: (nombre, params = {}) => setPantalla({ nombre, params }),
    goBack: () =>
      setPantalla((actual) =>
        actual.nombre === 'RegistroFormulario' ? { nombre: 'Registro', params: {} } : { nombre: 'Login', params: {} }
      ),
    canGoBack: () => false,
  };

  if (pantalla.nombre === 'Registro') return <RegistroSeleccion navigation={navegacionFalsa} />;
  if (pantalla.nombre === 'RegistroFormulario') {
    return <Registro navigation={navegacionFalsa} route={{ params: pantalla.params }} />;
  }
  return <Login navigation={navegacionFalsa} />;
}

export default function App() {
  const [fuentesListas] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
  const { esOscuro } = useTema();

  if (!fuentesListas) return null;

  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <Pantallas />
      </ProveedorSesion>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(1.5),
    borderBottomWidth: 1,
    gap: espacio(2),
  },
  hola: {
    flex: 1,
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  salir: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
});
