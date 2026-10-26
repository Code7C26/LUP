// App.js DE PRUEBA para los pasos 36 y 38 a 44.
// Todavía no hay navegación (es el paso 37), así que acá se cambia de pantalla "a mano".
// Cuando se suba el paso 37, este archivo se reemplaza por el que muestra la navegación.
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import Cargando from './src/componentes/Cargando';
import { ProveedorSesion, useSesion } from './src/contexto/Sesion';
import Catalogo from './src/pantallas/Catalogo';
import DetalleComercio from './src/pantallas/DetalleComercio';
import DetalleProducto from './src/pantallas/DetalleProducto';
import Inicio from './src/pantallas/Inicio';
import Login from './src/pantallas/Login';
import MisReservas from './src/pantallas/MisReservas';
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

// Barra de arriba para las pantallas que se abren "encima" (detalle, login): solo "Volver"
function BarraVolver({ alVolver }) {
  const { colores } = useTema();
  const { top } = useSafeAreaInsets();

  return (
    <View style={[estilos.barra, { paddingTop: top + espacio(1), backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <Text style={[estilos.salir, { color: colores.verdeHover }]} onPress={alVolver} accessibilityRole="button">
        ‹ Volver
      </Text>
    </View>
  );
}

// Pestañas de abajo de prueba (las de verdad son del paso 37)
function PestanasDePrueba({ activa, alCambiar }) {
  const { colores } = useTema();
  const { bottom } = useSafeAreaInsets();
  const pestanas = [
    ['Inicio', '📍 Cerca tuyo'],
    ['Catalogo', '🔎 Catálogo'],
    ['MisReservas', '🎟️ Reservas'],
  ];

  return (
    <View style={[estilos.pestanas, { paddingBottom: bottom + espacio(1), backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      {pestanas.map(([nombre, texto]) => (
        <Pressable key={nombre} onPress={() => alCambiar(nombre)} style={estilos.pestana} accessibilityRole="tab">
          <Text style={[estilos.textoPestana, { color: activa === nombre ? colores.verdeHover : colores.gris }]}>
            {texto}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const sinLoginNiRegistro = (pila) =>
  pila.filter((p) => !['Login', 'Registro', 'RegistroFormulario'].includes(p.nombre));

function Pantallas() {
  const { usuario, cargando, invitado } = useSesion();
  const [pantalla, setPantalla] = useState({ nombre: 'Login', params: {} });
  const [pestana, setPestana] = useState({ nombre: 'Inicio', params: {} });
  // Pantallas abiertas encima de las pestañas (como un "stack"): la última es la que se ve
  const [encima, setEncima] = useState([]);

  // Al cerrar sesión, se vuelve al login (y no al formulario donde se había quedado)
  useEffect(() => {
    if (!usuario && !invitado) {
      setPantalla({ nombre: 'Login', params: {} });
      setPestana({ nombre: 'Inicio', params: {} });
      setEncima([]);
    }
  }, [usuario, invitado]);

  // Si se creó la cuenta desde "Ingresá para reservar", se cierra el registro y se vuelve al detalle
  useEffect(() => {
    if (usuario) {
      setEncima((pila) => (pila[pila.length - 1]?.nombre === 'RegistroFormulario' ? sinLoginNiRegistro(pila) : pila));
    }
  }, [usuario]);

  if (cargando) return <Cargando texto="Abriendo Lüp…" />;

  // Con sesión (o como invitado): "Cerca tuyo" y "Catálogo"
  if (usuario || invitado) {
    const navegacion = {
      navigate: (nombre, params = {}) => {
        if (['Inicio', 'Catalogo', 'MisReservas'].includes(nombre)) {
          setEncima([]);
          setPestana({ nombre, params });
        } else if (['DetalleProducto', 'DetalleComercio', 'Login', 'Registro', 'RegistroFormulario'].includes(nombre)) {
          setEncima((pila) => [...pila, { nombre, params }]);
        } else {
          Alert.alert('Todavía no está', `La pantalla "${nombre}" se hace en otro paso.`);
        }
      },
      goBack: () => setEncima((pila) => pila.slice(0, -1)),
      canGoBack: () => encima.length > 0,
    };

    const arriba = encima[encima.length - 1];
    if (arriba) {
      // El login, al entrar o tocar "Omitir", cierra todo lo de cuentas y vuelve al detalle
      const navegacionLogin = { ...navegacion, goBack: () => setEncima(sinLoginNiRegistro), canGoBack: () => true };
      const esDetalle = arriba.nombre === 'DetalleProducto' || arriba.nombre === 'DetalleComercio';
      return (
        <View style={{ flex: 1 }}>
          {esDetalle ? <BarraVolver alVolver={navegacion.goBack} /> : null}
          <View style={{ flex: 1 }}>
            {arriba.nombre === 'DetalleProducto' ? (
              <DetalleProducto key={encima.length} navigation={navegacion} route={{ params: arriba.params }} />
            ) : arriba.nombre === 'DetalleComercio' ? (
              <DetalleComercio key={encima.length} navigation={navegacion} route={{ params: arriba.params }} />
            ) : arriba.nombre === 'Login' ? (
              <Login navigation={navegacionLogin} />
            ) : arriba.nombre === 'Registro' ? (
              <RegistroSeleccion navigation={navegacion} />
            ) : (
              <Registro navigation={navegacion} route={{ params: arriba.params }} />
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <BarraDePrueba />
        <View style={{ flex: 1 }}>
          {pestana.nombre === 'Catalogo' ? (
            <Catalogo navigation={navegacion} route={{ params: pestana.params }} />
          ) : pestana.nombre === 'MisReservas' ? (
            <MisReservas navigation={navegacion} />
          ) : (
            <Inicio navigation={navegacion} />
          )}
        </View>
        <PestanasDePrueba activa={pestana.nombre} alCambiar={(nombre) => setPestana({ nombre, params: {} })} />
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
  pestanas: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: espacio(1),
  },
  pestana: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espacio(1),
  },
  textoPestana: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
});
