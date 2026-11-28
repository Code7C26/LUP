// Pestañas de texto: se ve una sección por vez (Mis reservas, Mis productos).
// La elegida, en verde con una rayita debajo; la otra, en gris.
// Uso:  <Pestanas opciones={[['pendientes', 'Para retirar (2)'], ['historial', 'Historial']]} activa={pestana} alCambiar={setPestana} />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, useTema } from '../tema';

export default function Pestanas({ opciones, activa, alCambiar }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.pestanas, { borderBottomColor: colores.borde }]} accessibilityRole="tablist">
      {opciones.map(([clave, texto]) => {
        const elegida = activa === clave;
        return (
          <Pressable
            key={clave}
            onPress={() => alCambiar(clave)}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: elegida }}
            style={({ pressed }) => [estilos.pestana, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Text
              style={[
                estilos.texto,
                { color: elegida ? colores.verdeProfundo : colores.grisVerde, fontFamily: elegida ? fuentes.semi : fuentes.normal },
              ]}
              numberOfLines={1}
            >
              {texto}
            </Text>
            <View style={[estilos.rayita, elegida && { backgroundColor: colores.verde }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  pestanas: {
    flexDirection: 'row',
    gap: espacio(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pestana: {
    paddingTop: espacio(1),
    gap: espacio(1),
  },
  texto: {
    fontSize: 14,
  },
  rayita: {
    height: 2,
    borderRadius: 1,
    marginBottom: -StyleSheet.hairlineWidth, // tapa la línea finita de abajo
  },
});
