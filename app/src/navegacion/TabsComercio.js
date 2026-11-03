// PASO 37 · Pestañas del comercio: Mis productos, Retiros, Donaciones y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ConfirmarRetiro from '../pantallas/comercio/ConfirmarRetiro';
import MisProductos from '../pantallas/comercio/MisProductos';
import Solicitudes from '../pantallas/comercio/Solicitudes';
import Perfil from '../pantallas/Perfil';
import { TEXTOS_PESTANAS } from '../componentes/iconosPestanas';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsComercio() {
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="MisProductos" component={MisProductos} options={{ title: TEXTOS_PESTANAS.MisProductos, tabBarIcon: icono('MisProductos') }} />
      <Tab.Screen name="ConfirmarRetiro" component={ConfirmarRetiro} options={{ title: TEXTOS_PESTANAS.ConfirmarRetiro, tabBarIcon: icono('ConfirmarRetiro') }} />
      <Tab.Screen name="Solicitudes" component={Solicitudes} options={{ title: TEXTOS_PESTANAS.Solicitudes, tabBarIcon: icono('Solicitudes') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: TEXTOS_PESTANAS.Perfil, tabBarIcon: icono('Perfil') }} />
    </Tab.Navigator>
  );
}
