// Siluetas grises que "respiran" mientras carga una lista (en lugar de la ruedita).
// Uso:
//   if (cargando) return <Esqueleto tipo="filas" />;     ← catálogo, comercio, reservas, mis productos
//   if (cargando) return <Esqueleto tipo="inicio" />;    ← Inicio (mapa + carruseles)
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { espacio, useTema } from '../tema';

// Un bloque gris con el "brillo" suave
function Bloque({ estilo, opacidad }) {
  const { colores } = useTema();
  return <Animated.View style={[{ backgroundColor: colores.panel, borderRadius: 10, opacity: opacidad }, estilo]} />;
}

export default function Esqueleto({ tipo = 'filas' }) {
  const { colores } = useTema();
  const opacidad = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const respirar = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    respirar.start();
    return () => respirar.stop();
  }, [opacidad]);

  const fila = (i) => (
    <View key={i} style={estilos.fila}>
      <Bloque opacidad={opacidad} estilo={{ width: 92, height: 92, borderRadius: 12 }} />
      <Bloque opacidad={opacidad} estilo={{ flex: 1, height: 92, borderRadius: 12 }} />
    </View>
  );

  return (
    <View
      style={[estilos.pantalla, { backgroundColor: colores.fondo }]}
      accessibilityLabel="Cargando"
      accessibilityRole="progressbar"
    >
      {tipo === 'inicio' ? (
        <>
          <Bloque opacidad={opacidad} estilo={{ height: 230, borderRadius: 0, marginHorizontal: -espacio(2) }} />
          <Bloque opacidad={opacidad} estilo={{ width: 120, height: 18, marginTop: espacio(1) }} />
          <View style={estilos.filaCarrusel}>
            {[0, 1, 2].map((i) => (
              <Bloque key={i} opacidad={opacidad} estilo={{ width: 150, height: 120 }} />
            ))}
          </View>
          <Bloque opacidad={opacidad} estilo={{ width: 180, height: 18, marginTop: espacio(1) }} />
          <View style={estilos.filaCarrusel}>
            {[0, 1, 2, 3].map((i) => (
              <Bloque key={i} opacidad={opacidad} estilo={{ width: 100, height: 100, borderRadius: 12 }} />
            ))}
          </View>
        </>
      ) : (
        <>
          <Bloque opacidad={opacidad} estilo={{ width: 160, height: 24, marginBottom: espacio(1) }} />
          {[0, 1, 2, 3, 4].map(fila)}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    paddingHorizontal: espacio(2),
    paddingTop: espacio(2),
    gap: espacio(2),
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    gap: espacio(1.5),
  },
  filaCarrusel: {
    flexDirection: 'row',
    gap: espacio(1.5),
  },
});
