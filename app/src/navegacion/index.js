// PASO 37 · Navegación por rol.
// - Sin sesión: la portada del mockup ("Una segunda oportunidad…" y el logo con "Iniciar sesión"),
//   el login (con "Omitir" se entra como invitado) y el registro.
// - Apenas se entra (al iniciar sesión, crear la cuenta o tocar "Omitir"), antes de las pestañas, va la bienvenida.
// - Con sesión o como invitado: las pestañas de su rol. Arriba de las pestañas se abren
//   los detalles y el formulario de producto, y el login y el registro como ventanas modales
//   (desde Perfil, o al querer reservar sin sesión).
// Todas las pantallas navegan con los mismos nombres: navigation.navigate('DetalleProducto', { id })
import { useEffect, useRef, useState } from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

import Aviso from '../componentes/Aviso';
import Cargando from '../componentes/Cargando';
import { claveBienvenida, useBienvenida } from '../contexto/Bienvenida';
import { useSesion } from '../contexto/Sesion';
import FormProducto from '../pantallas/comercio/FormProducto';
import DetalleComercio from '../pantallas/DetalleComercio';
import Bienvenida from '../pantallas/Bienvenida';
import Carrito from '../pantallas/Carrito';
import DetalleProducto from '../pantallas/DetalleProducto';
import Login from '../pantallas/Login';
import Mapa from '../pantallas/Mapa';
import MisFavoritos from '../pantallas/MisFavoritos';
import Portada from '../pantallas/Portada';
import Registro from '../pantallas/Registro';
import RegistroSeleccion from '../pantallas/RegistroSeleccion';
import { abrirPantallaDelAviso } from '../servicios/push';
import { useOpcionesStack, useTemaNavegacion } from './opciones';
import TabsComercio from './TabsComercio';
import TabsConsumidor from './TabsConsumidor';
import TabsOrganizacion from './TabsOrganizacion';

const Stack = createNativeStackNavigator();
// Para abrir pantallas desde afuera de ellas (al tocar una notificación push)
const navegacion = createNavigationContainerRef();

// Las pestañas según el rol. Sin sesión (invitado) se ve la parte del consumidor.
function Pestanas() {
  const { usuario } = useSesion();
  if (usuario?.rol === 'comercio') return <TabsComercio />;
  if (usuario?.rol === 'organizacion') return <TabsOrganizacion />;
  return <TabsConsumidor />;
}

export default function Navegacion() {
  const { usuario, cargando, invitado } = useSesion();
  const bienvenida = useBienvenida();
  const tema = useTemaNavegacion();
  const opciones = useOpcionesStack();

  // Al tocar una notificación (también si la app estaba cerrada), se abre la pantalla que dice el aviso.
  // Se espera a que la navegación esté lista, haya sesión y ya se haya visto la bienvenida.
  const ultimoAviso = Notifications.useLastNotificationResponse();
  const [lista, setLista] = useState(false);
  const avisoAbierto = useRef(null);
  const listoParaAvisos = lista && usuario && bienvenida.vista(claveBienvenida(usuario));
  useEffect(() => {
    const id = ultimoAviso?.notification?.request?.identifier;
    if (!id || !listoParaAvisos || avisoAbierto.current === id) return;
    if (abrirPantallaDelAviso(navegacion, ultimoAviso.notification.request.content.data)) {
      avisoAbierto.current = id;
      Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
    }
  }, [ultimoAviso, listoParaAvisos]);

  if (cargando || !bienvenida.cargada) return <Cargando texto="Abriendo Lüp…" />;

  // Una bienvenida por cuenta (y una para el invitado): "Cerrar sesión" las borra, así que se ve cada vez que se entra
  const bienvenidaVista = bienvenida.vista(claveBienvenida(usuario));

  // Login y registro: tienen su propio "Omitir" y "Volver", así que van sin barra arriba.
  // "navigationKey": como estas pantallas existen con y sin sesión, al entrar (o tocar "Omitir") y al
  // cerrar sesión se sacan de la pila y se va a la primera pantalla que corresponde. Sin esto, la app
  // se quedaba en el login (con el botón cargando para siempre) aunque la cuenta ya hubiera entrado.
  const pantallasDeCuenta = (
    <Stack.Group navigationKey={usuario || invitado ? 'app' : 'cuenta'}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Registro" component={RegistroSeleccion} />
      <Stack.Screen name="RegistroFormulario" component={Registro} />
    </Stack.Group>
  );

  return (
    <NavigationContainer ref={navegacion} theme={tema} onReady={() => setLista(true)}>
      <Stack.Navigator screenOptions={opciones}>
        {usuario || invitado ? (
          <>
            {/* Recién entró: la bienvenida va primero. Al terminarla desaparece sola. */}
            {!bienvenidaVista ? (
              <Stack.Screen name="Bienvenida" component={Bienvenida} options={{ headerShown: false, gestureEnabled: false }} />
            ) : null}
            <Stack.Screen name="Pestanas" component={Pestanas} options={{ headerShown: false }} />
            {/* Los detalles tienen la foto o el mapa hasta arriba y su propio botón redondo para volver */}
            <Stack.Screen name="DetalleProducto" component={DetalleProducto} options={{ headerShown: false }} />
            <Stack.Screen name="DetalleComercio" component={DetalleComercio} options={{ headerShown: false }} />
            <Stack.Screen name="Carrito" component={Carrito} options={{ title: '' }} />
            <Stack.Screen name="Mapa" component={Mapa} options={{ headerShown: false }} />
            {/* Desde el menú ☰ de Inicio. El título grande está dentro de la pantalla */}
            <Stack.Screen name="MisFavoritos" component={MisFavoritos} options={{ title: '' }} />
            <Stack.Screen
              name="FormProducto"
              component={FormProducto}
              options={{ title: '' }} // el título grande ("Nuevo Producto") está dentro de la pantalla
            />
            <Stack.Group screenOptions={{ presentation: 'modal', headerShown: false }}>
              {pantallasDeCuenta}
              {/* Para volver a ver la bienvenida desde Perfil */}
              <Stack.Screen name="VerBienvenida" component={Bienvenida} />
            </Stack.Group>
          </>
        ) : (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Portada" component={Portada} />
            {pantallasDeCuenta}
          </Stack.Group>
        )}
      </Stack.Navigator>
      {/* Avisos cortitos ("Agregado al carrito · Ver"), encima de todas las pantallas */}
      <Aviso />
    </NavigationContainer>
  );
}
