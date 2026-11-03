// Botón chiquito con ícono y una palabra (para las acciones de cada tarjeta).
// Uso:  <BotonIcono icono="checkmark-circle-outline" texto="Vendido" onPress={...} />
//       <BotonIcono icono="trash-outline" texto="Borrar" peligro onPress={...} />
import { Pressable, StyleSheet, Text } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function BotonIcono({ icono, texto, onPress, peligro, deshabilitado }) {
  const { colores } = useTema();
  const color = peligro ? colores.error : colores.titulo;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: colores.campo },
        pressed && { opacity: 0.7 },
        deshabilitado && { opacity: 0.4 },
      ]}
    >
      <Icono nombre={icono} tamano={16} color={color} />
      <Text style={[estilos.texto, { color }]} numberOfLines={1}>
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    borderRadius: 999,
    paddingHorizontal: espacio(1),
  },
  texto: {
    fontFamily: fuentes.media,
    fontSize: tamanos.mini + 1,
  },
});
