// PASO 37 · Navegación por rol.
// - Sin sesión: el login (con "Omitir" se entra como invitado) y el registro.
// - Con sesión o como invitado: las pestañas de su rol. Arriba de las pestañas se abren
//   los detalles y el formulario de producto, y el login y el registro como ventanas modales
//   (desde Perfil, o al querer reservar sin sesión).
// Todas las pantallas navegan con los mismos nombres: navigation.navigate('DetalleProducto', { id })
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Cargando from '../componentes/Cargando';
import { useSesion } from '../contexto/Sesion';
import FormProducto from '../pantallas/comercio/FormProducto';
import DetalleComercio from '../pantallas/DetalleComercio';
import DetalleProducto from '../pantallas/DetalleProducto';
import Login from '../pantallas/Login';
import Registro from '../pantallas/Registro';
import RegistroSeleccion from '../pantallas/RegistroSeleccion';
import { useOpcionesStack, useTemaNavegacion } from './opciones';
import TabsComercio from './TabsComercio';
import TabsConsumidor from './TabsConsumidor';
import TabsOrganizacion from './TabsOrganizacion';

const Stack = createNativeStackNavigator();

// Las pestañas según el rol. Sin sesión (invitado) se ve la parte del consumidor.
function Pestanas() {
  const { usuario } = useSesion();
  if (usuario?.rol === 'comercio') return <TabsComercio />;
  if (usuario?.rol === 'organizacion') return <TabsOrganizacion />;
  return <TabsConsumidor />;
}

export default function Navegacion() {
  const { usuario, cargando, invitado } = useSesion();
  const tema = useTemaNavegacion();
  const opciones = useOpcionesStack();

  if (cargando) return <Cargando texto="Abriendo Lüp…" />;

  // Login y registro: tienen su propio "Omitir" y "Volver", así que van sin barra arriba
  const pantallasDeCuenta = (
    <>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Registro" component={RegistroSeleccion} />
      <Stack.Screen name="RegistroFormulario" component={Registro} />
    </>
  );

  return (
    <NavigationContainer theme={tema}>
      <Stack.Navigator screenOptions={opciones}>
        {usuario || invitado ? (
          <>
            <Stack.Screen name="Pestanas" component={Pestanas} options={{ headerShown: false }} />
            <Stack.Screen name="DetalleProducto" component={DetalleProducto} options={{ title: 'Oferta' }} />
            <Stack.Screen name="DetalleComercio" component={DetalleComercio} options={{ title: 'Comercio' }} />
            <Stack.Screen
              name="FormProducto"
              component={FormProducto}
              options={({ route }) => ({ title: route.params?.id ? 'Editar producto' : 'Nuevo producto' })}
            />
            <Stack.Group screenOptions={{ presentation: 'modal', headerShown: false }}>{pantallasDeCuenta}</Stack.Group>
          </>
        ) : (
          <Stack.Group screenOptions={{ headerShown: false }}>{pantallasDeCuenta}</Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
