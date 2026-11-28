// Botoncito redondeado para filtros y opciones.
// Uso:
//   <Chip texto="Panificados" icono="cafe-outline" tono="ambar" activo={categoria === 'panificados'} onPress={...} />
//   <Chip texto="Más cerca" icono="navigate-outline" activo ... />
//   <Chip texto="Lácteos" categoria="lacteos" tono="menta" ... />   ← con el ícono de la categoría (28 px) adelante
import { Pressable, StyleSheet, Text } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';
import IconoCategoria from './IconoCategoria';

// "tono" (opcional): 'verde' | 'menta' | 'durazno' | 'ambar' → el fondo suave de tema.js cuando NO está elegido
// (las categorías del catálogo). Elegido, siempre verde oscuro.
export default function Chip({ texto, icono, categoria, activo, tono, onPress }) {
  const { colores } = useTema();
  const colorTexto = activo ? colores.sobreVerdeProfundo : colores.texto;
  const suave = tono ? colores.suaves[tono] : null;
  const fondo = activo ? colores.verdeProfundo : suave ? suave.fondo : colores.superficie;
  const borde = activo ? colores.verdeProfundo : suave ? suave.fondo : colores.borde;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={({ pressed }) => [
        estilos.chip,
        { backgroundColor: fondo, borderColor: borde },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {categoria ? <IconoCategoria categoria={categoria} tamano={28} estilo={estilos.icono} /> : null}
      {icono ? <Icono nombre={icono} tamano={15} color={!activo && suave ? suave.icono : colorTexto} /> : null}
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
  texto: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  icono: {
    marginLeft: -espacio(1), // el ícono va cerca del borde del chip
  },
});
