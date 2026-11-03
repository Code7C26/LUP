// Fila de producto IGUAL AL MOCKUP (página 8): la foto cuadrada a la izquierda
// y una tarjeta gris a la derecha con el nombre, el precio y el botón "Reservar".
// Uso:  <FilaProducto producto={p} onPress={() => navigation.navigate('DetalleProducto', { id: p.id })} />
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { urlCompleta } from '../api/cliente';
import { espacio, fuentes, sombra, useTema } from '../tema';
import { emojiCategoria, formatoPrecio, textoDistancia } from '../utilidades';
import Icono from './Icono';

export default function FilaProducto({ producto, onPress, mostrarComercio }) {
  const { colores } = useTema();
  const distancia = textoDistancia(producto.distancia_km)?.replace('a ', '');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${producto.titulo}, ${formatoPrecio(producto.precio_descuento)}. Reservar`}
      style={({ pressed }) => [estilos.fila, pressed && { opacity: 0.85 }]}
    >
      <View style={[estilos.foto, { backgroundColor: colores.panel }]}>
        {producto.imagen ? (
          <Image source={{ uri: urlCompleta(producto.imagen) }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={estilos.emoji}>{emojiCategoria(producto.categoria)}</Text>
        )}
      </View>

      <View style={[estilos.tarjeta, { backgroundColor: colores.panel }, sombra(colores)]}>
        <Text style={[estilos.titulo, { color: colores.texto }]} numberOfLines={2}>
          {producto.titulo}
        </Text>
        {mostrarComercio ? (
          <Text style={[estilos.chico, { color: colores.gris }]} numberOfLines={1}>
            {producto.comercio}
            {distancia ? ` · ${distancia}` : ''}
          </Text>
        ) : null}
        <View style={estilos.abajo}>
          <View style={estilos.precios}>
            <Text style={[estilos.precio, { color: colores.texto }]}>{formatoPrecio(producto.precio_descuento)}</Text>
            <Text style={[estilos.tachado, { color: colores.gris }]}>{formatoPrecio(producto.precio_original)}</Text>
            {producto.es_donacion ? <Icono nombre="heart" tamano={12} color={colores.verde} /> : null}
          </View>
          <View style={[estilos.boton, { backgroundColor: colores.verdeProfundo }]}>
            <Text style={[estilos.textoBoton, { color: colores.sobreVerdeProfundo }]}>Reservar</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: espacio(1.5),
  },
  foto: {
    width: 92,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  tarjeta: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: espacio(1.5),
    paddingVertical: espacio(1.25),
    justifyContent: 'space-between',
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: 14,
  },
  chico: {
    fontFamily: fuentes.normal,
    fontSize: 11,
  },
  abajo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio(1),
  },
  precios: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexShrink: 1,
  },
  precio: {
    fontFamily: fuentes.negrita,
    fontSize: 15,
  },
  tachado: {
    fontFamily: fuentes.normal,
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  boton: {
    borderRadius: 999,
    paddingHorizontal: espacio(1.5),
    paddingVertical: 5,
  },
  textoBoton: {
    fontFamily: fuentes.botonMedio,
    fontSize: 11,
  },
});
