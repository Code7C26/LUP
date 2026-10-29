// PASO 37 · Pestañas del comercio: Mis productos, Retiros, Donaciones y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ConfirmarRetiro from '../pantallas/comercio/ConfirmarRetiro';
import MisProductos from '../pantallas/comercio/MisProductos';
import Solicitudes from '../pantallas/comercio/Solicitudes';
import Perfil from '../pantallas/Perfil';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsComercio() {
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="MisProductos" component={MisProductos} options={{ title: 'Mis productos', tabBarIcon: icono('📦') }} />
      <Tab.Screen name="ConfirmarRetiro" component={ConfirmarRetiro} options={{ title: 'Retiros', tabBarIcon: icono('📷') }} />
      <Tab.Screen name="Solicitudes" component={Solicitudes} options={{ title: 'Donaciones', tabBarIcon: icono('💚') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: 'Perfil', tabBarIcon: icono('👤') }} />
    </Tab.Navigator>
  );
}
