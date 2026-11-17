// PASO 37 · Pestañas del consumidor (y del invitado): Inicio, Catálogo, Mis reservas y Perfil.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Catalogo from '../pantallas/Catalogo';
import Inicio from '../pantallas/Inicio';
import MisReservas from '../pantallas/MisReservas';
import Perfil from '../pantallas/Perfil';
import { useIdioma } from '../contexto/Idioma';
import { icono, useOpcionesPestanas } from './opciones';

const Tab = createBottomTabNavigator();

export default function TabsConsumidor() {
  const { t } = useIdioma();
  return (
    <Tab.Navigator screenOptions={useOpcionesPestanas()}>
      <Tab.Screen name="Inicio" component={Inicio} options={{ title: t('pestanas.Inicio'), tabBarIcon: icono('Inicio') }} />
      <Tab.Screen name="Catalogo" component={Catalogo} options={{ title: t('pestanas.Catalogo'), tabBarIcon: icono('Catalogo') }} />
      <Tab.Screen name="MisReservas" component={MisReservas} options={{ title: t('pestanas.MisReservas'), tabBarIcon: icono('MisReservas') }} />
      <Tab.Screen name="Perfil" component={Perfil} options={{ title: t('pestanas.Perfil'), tabBarIcon: icono('Perfil') }} />
    </Tab.Navigator>
  );
}
