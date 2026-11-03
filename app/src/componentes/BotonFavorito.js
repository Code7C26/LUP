// Corazón para marcar un comercio como favorito.
// Uso:  <BotonFavorito id={comercio.id} />            ← redondo con fondo (sobre fotos y mapas)
//       <BotonFavorito id={comercio.id} chico />      ← solo el corazón (en tarjetas)
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useFavoritos } from '../contexto/Favoritos';
import { sombra, useTema } from '../tema';
import { vibrar } from '../utilidades';
import Icono from './Icono';

export default function BotonFavorito({ id, chico, estilo }) {
  const { colores } = useTema();
  const { esFavorito, alternar } = useFavoritos();
  const marcado = esFavorito(id);
  const escala = useRef(new Animated.Value(1)).current;

  function tocar() {
    alternar(id);
    vibrar();
    // El corazón "late": se agranda y vuelve
    escala.setValue(0.7);
    Animated.spring(escala, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  }

  return (
    <Pressable
      onPress={tocar}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: marcado }}
      accessibilityLabel={marcado ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      style={({ pressed }) => [
        chico ? estilos.chico : [estilos.grande, { backgroundColor: colores.superficie }, sombra(colores)],
        pressed && { transform: [{ scale: 0.9 }] },
        estilo,
      ]}
    >
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Icono nombre={marcado ? 'heart' : 'heart-outline'} tamano={chico ? 18 : 21} color={marcado ? colores.corazon : colores.titulo} />
      </Animated.View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  grande: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chico: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
