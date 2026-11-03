// Botoncito redondeado para filtros y opciones.
// Uso:
//   <Chip texto="Panificados" emoji="🥐" activo={categoria === 'panificados'} onPress={...} />
//   <Chip texto="Más cerca" icono="navigate-outline" activo ... />
import { Pressable, StyleSheet, Text } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function Chip({ texto, emoji, icono, activo, onPress }) {
  const { colores } = useTema();
  const colorTexto = activo ? colores.sobreVerdeProfundo : colores.texto;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={({ pressed }) => [
        estilos.chip,
        { backgroundColor: activo ? colores.verdeProfundo : colores.superficie, borderColor: activo ? colores.verdeProfundo : colores.borde },
        pressed && { opacity: 0.8 },
      ]}
    >
      {emoji ? <Text style={estilos.emoji}>{emoji}</Text> : null}
      {icono ? <Icono nombre={icono} tamano={15} color={colorTexto} /> : null}
      <Text style={[estilos.texto, { color: colorTexto }]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: espacio(1.75),
    height: 38,
  },
  emoji: {
    fontSize: 15,
  },
  texto: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
});
