// Botón redondo para volver, flotando arriba a la izquierda (encima de fotos y mapas).
// Uso (en una pantalla sin barra de arriba):  <BotonVolver navigation={navigation} />
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { espacio, sombra, useTema } from '../tema';
import Icono from './Icono';

export default function BotonVolver({ navigation, derecha }) {
  const { colores } = useTema();
  const { top } = useSafeAreaInsets();
  if (!navigation?.canGoBack?.()) return null;

  return (
    <Pressable
      onPress={() => navigation.goBack()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      style={({ pressed }) => [
        estilos.boton,
        { top: top + espacio(1), backgroundColor: colores.superficie },
        derecha ? { right: espacio(2) } : { left: espacio(2) },
        sombra(colores),
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icono nombre="chevron-back" tamano={22} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
