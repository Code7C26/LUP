// Siluetas grises que "respiran" mientras carga una lista (en lugar de la ruedita).
// Uso:
//   if (cargando) return <Esqueleto tipo="filas" />;     ← catálogo, comercio, reservas, mis productos
//   if (cargando) return <Esqueleto tipo="inicio" />;    ← Inicio (mapa + carruseles)
//   if (cargando) return <Esqueleto tipo="reservas" />;  ← Mis reservas (pestañas + tarjetas con código)
//   if (cargando) return <Esqueleto tipo="catalogo" />;  ← Buscar (buscador + pastillas + tarjetas de producto)
//   if (cargando) return <Esqueleto tipo="comercio" />;  ← Mis productos (cabecera, resumen, publicar y tarjetas)
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useIdioma } from '../contexto/Idioma';
import { espacio, useTema } from '../tema';

// Un bloque gris con el "brillo" suave
function Bloque({ estilo, opacidad }) {
  const { colores } = useTema();
  return <Animated.View style={[{ backgroundColor: colores.panel, borderRadius: 10, opacity: opacidad }, estilo]} />;
}

export default function Esqueleto({ tipo = 'filas' }) {
  const { colores } = useTema();
  const { t } = useIdioma();
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
      accessibilityLabel={t('comun.cargando')}
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
      ) : tipo === 'comercio' ? (
        <>
          <View style={estilos.fila}>
            <Bloque opacidad={opacidad} estilo={{ width: 38, height: 38, borderRadius: 19 }} />
            <Bloque opacidad={opacidad} estilo={{ width: 84, height: 32, borderRadius: 999, alignSelf: 'center' }} />
          </View>
          <Bloque opacidad={opacidad} estilo={{ height: 100, borderRadius: 18 }} />
          <View style={estilos.fila}>
            <Bloque opacidad={opacidad} estilo={{ width: 110, height: 16 }} />
            <Bloque opacidad={opacidad} estilo={{ width: 70, height: 16 }} />
          </View>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={estilos.fila}>
              <Bloque opacidad={opacidad} estilo={{ width: 88, height: 88, borderRadius: 14 }} />
              <View style={estilos.lineas}>
                <Bloque opacidad={opacidad} estilo={{ width: '75%', height: 14 }} />
                <Bloque opacidad={opacidad} estilo={{ width: '55%', height: 11 }} />
              </View>
            </View>
          ))}
        </>
      ) : tipo === 'catalogo' ? (
        <>
          <View style={estilos.fila}>
            <Bloque opacidad={opacidad} estilo={{ flex: 1, height: 50, borderRadius: 16 }} />
            <Bloque opacidad={opacidad} estilo={{ width: 50, height: 50, borderRadius: 16 }} />
          </View>
          <View style={estilos.filaCarrusel}>
            {[96, 120, 88].map((ancho, i) => (
              <Bloque key={i} opacidad={opacidad} estilo={{ width: ancho, height: 36, borderRadius: 999 }} />
            ))}
          </View>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={estilos.fila}>
              <Bloque opacidad={opacidad} estilo={{ width: 88, height: 88, borderRadius: 14 }} />
              <View style={estilos.lineas}>
                <Bloque opacidad={opacidad} estilo={{ width: '80%', height: 14 }} />
                <Bloque opacidad={opacidad} estilo={{ width: '55%', height: 11 }} />
                <Bloque opacidad={opacidad} estilo={{ width: '40%', height: 18, marginTop: 6 }} />
              </View>
            </View>
          ))}
        </>
      ) : tipo === 'reservas' ? (
        <>
          <Bloque opacidad={opacidad} estilo={{ width: 160, height: 24 }} />
          <View style={estilos.fila}>
            <Bloque opacidad={opacidad} estilo={{ width: 110, height: 16 }} />
            <Bloque opacidad={opacidad} estilo={{ width: 70, height: 16 }} />
          </View>
          {[0, 1].map((i) => (
            <View key={i} style={estilos.tarjetaReserva}>
              <View style={estilos.fila}>
                <Bloque opacidad={opacidad} estilo={{ width: 64, height: 64, borderRadius: 14 }} />
                <View style={estilos.lineas}>
                  <Bloque opacidad={opacidad} estilo={{ width: '75%', height: 16 }} />
                  <Bloque opacidad={opacidad} estilo={{ width: '50%', height: 12 }} />
                  <Bloque opacidad={opacidad} estilo={{ width: '35%', height: 12 }} />
                </View>
              </View>
              <Bloque opacidad={opacidad} estilo={{ height: 64, borderRadius: 16 }} />
              <View style={estilos.fila}>
                <Bloque opacidad={opacidad} estilo={{ flex: 1, height: 36, borderRadius: 999 }} />
                <Bloque opacidad={opacidad} estilo={{ flex: 1, height: 36, borderRadius: 999 }} />
              </View>
            </View>
          ))}
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
  tarjetaReserva: {
    gap: espacio(1.5),
  },
  lineas: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
});
