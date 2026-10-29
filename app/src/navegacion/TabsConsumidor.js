// PASO 37 · Pestañas del consumidor (y del invitado): Inicio, Catálogo, Mis reservas y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Catalogo from '../pantallas/Catalogo';
import Inicio from '../pantallas/Inicio';
import MisReservas from '../pantallas/MisReservas';
import Perfil from '../pantallas/Perfil';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsConsumidor() {
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="Inicio" component={Inicio} options={{ title: 'Cerca tuyo', tabBarIcon: icono('📍') }} />
      <Tab.Screen name="Catalogo" component={Catalogo} options={{ title: 'Catálogo', tabBarIcon: icono('🔎') }} />
      <Tab.Screen name="MisReservas" component={MisReservas} options={{ title: 'Mis reservas', tabBarIcon: icono('🎟️') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: 'Perfil', tabBarIcon: icono('👤') }} />
    </Tab.Navigator>
  );
}
