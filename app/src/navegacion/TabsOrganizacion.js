// PASO 37 · Pestañas de la organización: Donaciones, Mis solicitudes y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Donaciones from '../pantallas/organizacion/Donaciones';
import MisSolicitudes from '../pantallas/organizacion/MisSolicitudes';
import Perfil from '../pantallas/Perfil';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsOrganizacion() {
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="Donaciones" component={Donaciones} options={{ title: 'Donaciones', tabBarIcon: icono('💚') }} />
      <Tab.Screen name="MisSolicitudes" component={MisSolicitudes} options={{ title: 'Mis solicitudes', tabBarIcon: icono('📋') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: 'Perfil', tabBarIcon: icono('👤') }} />
    </Tab.Navigator>
  );
}
