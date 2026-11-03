// PASO 37 · Pestañas de la organización: Donaciones, Mis solicitudes y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Donaciones from '../pantallas/organizacion/Donaciones';
import MisSolicitudes from '../pantallas/organizacion/MisSolicitudes';
import Perfil from '../pantallas/Perfil';
import { TEXTOS_PESTANAS } from '../componentes/iconosPestanas';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsOrganizacion() {
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="Donaciones" component={Donaciones} options={{ title: TEXTOS_PESTANAS.Donaciones, tabBarIcon: icono('Donaciones') }} />
      <Tab.Screen name="MisSolicitudes" component={MisSolicitudes} options={{ title: TEXTOS_PESTANAS.MisSolicitudes, tabBarIcon: icono('MisSolicitudes') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: TEXTOS_PESTANAS.Perfil, tabBarIcon: icono('Perfil') }} />
    </Tab.Navigator>
  );
}
