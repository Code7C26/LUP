// PASO 37 · Pestañas de la organización: Donaciones, Mis solicitudes y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Donaciones from '../pantallas/organizacion/Donaciones';
import MisSolicitudes from '../pantallas/organizacion/MisSolicitudes';
import Perfil from '../pantallas/Perfil';
import { useIdioma } from '../contexto/Idioma';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsOrganizacion() {
  const { t } = useIdioma();
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="Donaciones" component={Donaciones} options={{ title: t('pestanas.Donaciones'), tabBarIcon: icono('Donaciones') }} />
      <Tab.Screen name="MisSolicitudes" component={MisSolicitudes} options={{ title: t('pestanas.MisSolicitudes'), tabBarIcon: icono('MisSolicitudes') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: t('pestanas.Perfil'), tabBarIcon: icono('Perfil') }} />
    </Tab.Navigator>
  );
}
