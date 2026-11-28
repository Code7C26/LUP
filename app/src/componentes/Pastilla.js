// Pastilla de texto finita: borde de 0,5, sin fondo ni ícono, texto verde (categorías, búsquedas, ideas).
// Elegida, se llena de verde oscuro.
// Uso:  <Pastilla texto="Panificados" activo={categoria === 'panificados'} alTocar={...} />
import { Pressable, StyleSheet, Text } from 'react-native';

import { fuentes, useTema } from '../tema';

export default function Pastilla({ texto, activo, alTocar, accessibilityLabel }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={activo === undefined ? undefined : { selected: activo }}
      style={({ pressed }) => [
        estilos.pastilla,
        { borderColor: activo ? colores.verdeProfundo : colores.bordeSuave },
        activo && { backgroundColor: colores.verdeProfundo },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={[estilos.texto, { color: activo ? colores.sobreVerdeProfundo : colores.verdeProfundo }]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pastilla: {
    borderWidth: 0.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  texto: {
    fontFamily: fuentes.media,
    fontSize: 12,
  },
});
