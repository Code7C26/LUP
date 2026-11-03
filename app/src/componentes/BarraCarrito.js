// Barrita fija abajo "Ver carrito (3) · $4.500" que aparece cuando hay algo en el carrito.
// Uso (al final de una pantalla, dentro de un View con flex: 1):  <BarraCarrito navigation={navigation} />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCarrito } from '../contexto/Carrito';
import { espacio, fuentes, useTema } from '../tema';
import { formatoPrecio } from '../utilidades';
import Icono from './Icono';

export default function BarraCarrito({ navigation }) {
  const { colores } = useTema();
  const { cantidadTotal, total } = useCarrito();
  if (!cantidadTotal) return null;

  return (
    <View style={estilos.contenedor} pointerEvents="box-none">
      <Pressable
        onPress={() => navigation.navigate('Carrito')}
        accessibilityRole="button"
        accessibilityLabel={`Ver carrito: ${cantidadTotal} productos, ${formatoPrecio(total)}`}
        style={({ pressed }) => [estilos.barra, { backgroundColor: colores.verdeProfundo }, pressed && { opacity: 0.9 }]}
      >
        <Icono nombre="cart" tamano={20} color={colores.sobreVerdeProfundo} />
        <Text style={[estilos.texto, { color: colores.sobreVerdeProfundo }]}>Ver carrito ({cantidadTotal})</Text>
        <Text style={[estilos.texto, { color: colores.sobreVerdeProfundo, marginLeft: 'auto' }]}>{formatoPrecio(total)}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espacio(2),
    right: espacio(2),
    bottom: espacio(1.5),
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    height: 48,
    borderRadius: 999,
    paddingHorizontal: espacio(2.5),
  },
  texto: {
    fontFamily: fuentes.boton,
    fontSize: 14,
  },
});
