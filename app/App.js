// App.js DE PRUEBA para los pasos 36 y 38 (sesión + login).
// Todavía no hay navegación: eso es el paso 37.
// Cuando se suba el paso 37, este archivo se reemplaza por el que muestra la navegación.
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import Boton from './src/componentes/Boton';
import Cargando from './src/componentes/Cargando';
import { ProveedorSesion, useSesion } from './src/contexto/Sesion';
import Login from './src/pantallas/Login';
import { espacio, fuentes, tamanos, useTema } from './src/tema';

const NOMBRE_ROL = { consumidor: 'Consumidor', comercio: 'Comercio', organizacion: 'Organización' };

// Pantalla que se ve después de iniciar sesión (solo para probar)
function Bienvenida() {
  const { colores } = useTema();
  const { usuario, invitado, cerrarSesion } = useSesion();

  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.fondo }]}>
      <Text style={[estilos.titulo, { color: colores.titulo }]}>
        {usuario ? `¡Hola, ${usuario.nombre}!` : 'Entraste como invitado'}
      </Text>
      {usuario ? (
        <Text style={[estilos.texto, { color: colores.gris }]}>
          Iniciaste sesión como {NOMBRE_ROL[usuario.rol]}.{'\n'}
          Cerrá la app y abrila de nuevo: tenés que seguir logueada.
        </Text>
      ) : null}
      <Boton
        texto={usuario ? 'Cerrar sesión' : 'Volver al login'}
        variante="secundario"
        onPress={cerrarSesion}
      />
    </View>
  );
}

// Decide qué mostrar según haya sesión o no
function Pantalla() {
  const { usuario, cargando, invitado } = useSesion();
  if (cargando) return <Cargando texto="Abriendo Lüp…" />;
  if (!usuario && !invitado) return <Login />;
  return <Bienvenida />;
}

export default function App() {
  const [fuentesListas] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
  const { esOscuro } = useTema();

  if (!fuentesListas) return null;

  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <Pantalla />
      </ProveedorSesion>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    padding: espacio(3),
    gap: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
    textAlign: 'center',
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
  },
});
