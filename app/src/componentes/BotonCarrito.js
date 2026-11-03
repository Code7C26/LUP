// Ícono del carrito con el número de productos (arriba en Inicio, como el mockup).
// Uso:  <BotonCarrito navigation={navigation} />
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCarrito } from '../contexto/Carrito';
import { fuentes, useTema } from '../tema';
import Icono from './Icono';

export default function BotonCarrito({ navigation, estilo }) {
  const { colores } = useTema();
  const { cantidadTotal } = useCarrito();
  const salto = useRef(new Animated.Value(0)).current;
  const anterior = useRef(cantidadTotal);

  // Cuando se agrega algo, el carrito da un saltito
  useEffect(() => {
    if (cantidadTotal > anterior.current) {
      salto.setValue(0);
      Animated.sequence([
        Animated.timing(salto, { toValue: -6, duration: 120, useNativeDriver: true }),
        Animated.spring(salto, { toValue: 0, friction: 3, useNativeDriver: true }),
      ]).start();
    }
    anterior.current = cantidadTotal;
  }, [cantidadTotal, salto]);

  return (
    <Pressable
      onPress={() => navigation.navigate('Carrito')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={cantidadTotal ? `Carrito, ${cantidadTotal} productos` : 'Carrito vacío'}
      style={[estilos.boton, { backgroundColor: colores.panel }, estilo]}
    >
      <Animated.View style={{ transform: [{ translateY: salto }] }}>
        <Icono nombre="cart-outline" tamano={22} color={colores.texto} />
      </Animated.View>
      {cantidadTotal ? (
        <View style={[estilos.numero, { backgroundColor: colores.verde }]}>
          <Text style={estilos.textoNumero}>{cantidadTotal > 9 ? '9+' : cantidadTotal}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: {
    color: '#FFFFFF',
    fontFamily: fuentes.negrita,
    fontSize: 10,
  },
});
