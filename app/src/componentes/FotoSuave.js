// Foto que aparece con un fundido suave cuando termina de cargar (en lugar de "saltar").
// Mientras carga se ve el fondo gris de atrás.
// Uso:  <FotoSuave uri={producto.imagen} estilo={StyleSheet.absoluteFill} />
import { useRef } from 'react';
import { Animated } from 'react-native';

import { urlCompleta } from '../api/cliente';

export default function FotoSuave({ uri, estilo, etiqueta }) {
  const opacidad = useRef(new Animated.Value(0)).current;
  if (!uri) return null;
  return (
    <Animated.Image
      source={{ uri: urlCompleta(uri) }}
      style={[estilo, { opacity: opacidad }]}
      onLoad={() => Animated.timing(opacidad, { toValue: 1, duration: 300, useNativeDriver: true }).start()}
      accessibilityLabel={etiqueta}
    />
  );
}
