// La barrita verde de abajo que muestra los avisos de contexto/Aviso.js.
// Entra deslizándose desde abajo y se va sola.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cerrarAviso, useAviso } from '../contexto/Aviso';
import { espacio, fuentes, useTema } from '../tema';
import Icono from './Icono';

export default function Aviso() {
  const { colores } = useTema();
  const { bottom } = useSafeAreaInsets();
  const aviso = useAviso();
  const animacion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animacion, { toValue: aviso ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
  }, [aviso, animacion]);

  if (!aviso) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        estilos.contenedor,
        { bottom: bottom + 84 }, // arriba de las pestañas y de las barras de abajo
        {
          opacity: animacion,
          transform: [{ translateY: animacion.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          aviso.alTocar?.();
          cerrarAviso();
        }}
        accessibilityRole="alert"
        accessibilityLabel={aviso.boton ? `${aviso.texto}. ${aviso.boton}` : aviso.texto}
        style={[estilos.aviso, { backgroundColor: colores.verdeProfundo }]}
      >
        <Icono nombre="checkmark-circle" tamano={20} color={colores.sobreVerdeProfundo} />
        <Text style={[estilos.texto, { color: colores.sobreVerdeProfundo }]} numberOfLines={1}>
          {aviso.texto}
        </Text>
        {aviso.boton ? (
          <Text style={[estilos.boton, { color: colores.sobreVerdeProfundo }]}>{aviso.boton}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espacio(2),
    right: espacio(2),
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: espacio(2),
  },
  texto: {
    flex: 1,
    fontFamily: fuentes.media,
    fontSize: 14,
  },
  boton: {
    fontFamily: fuentes.boton,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
