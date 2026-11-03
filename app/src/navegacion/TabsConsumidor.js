// PASO 37 · Pestañas del consumidor (y del invitado): Inicio, Catálogo, Mis reservas y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Catalogo from '../pantallas/Catalogo';
import Inicio from '../pantallas/Inicio';
import MisReservas from '../pantallas/MisReservas';
import Perfil from '../pantallas/Perfil';
import { TEXTOS_PESTANAS } from '../componentes/iconosPestanas';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsConsumidor() {
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="Inicio" component={Inicio} options={{ title: TEXTOS_PESTANAS.Inicio, tabBarIcon: icono('Inicio') }} />
      <Tab.Screen name="Catalogo" component={Catalogo} options={{ title: TEXTOS_PESTANAS.Catalogo, tabBarIcon: icono('Catalogo') }} />
      <Tab.Screen name="MisReservas" component={MisReservas} options={{ title: TEXTOS_PESTANAS.MisReservas, tabBarIcon: icono('MisReservas') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: TEXTOS_PESTANAS.Perfil, tabBarIcon: icono('Perfil') }} />
    </Tab.Navigator>
  );
}
