// Ícono del carrito con el número de productos (arriba en Inicio, como el mockup).
// Uso:  <BotonCarrito navigation={navigation} />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCarrito } from '../contexto/Carrito';
import { fuentes, useTema } from '../tema';
import Icono from './Icono';

export default function BotonCarrito({ navigation, estilo }) {
  const { colores } = useTema();
  const { cantidadTotal } = useCarrito();

  return (
    <Pressable
      onPress={() => navigation.navigate('Carrito')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={cantidadTotal ? `Carrito, ${cantidadTotal} productos` : 'Carrito vacío'}
      style={[estilos.boton, { backgroundColor: colores.panel }, estilo]}
    >
      <Icono nombre="cart-outline" tamano={22} color={colores.texto} />
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
