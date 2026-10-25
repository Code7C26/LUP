// Tarjeta de un producto, como en el catálogo de la web.
// Uso:
//   <TarjetaProducto producto={producto} onPress={() => navigation.navigate('DetalleProducto', { id: producto.id })} />
// "producto" es un objeto como los que devuelve /api/productos/.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { emojiCategoria, formatoPrecio } from '../utilidades';

export default function TarjetaProducto({ producto, onPress }) {
  const { colores } = useTema();
  const tieneDistancia = producto.distancia_km !== undefined && producto.distancia_km !== null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${producto.titulo}, de ${producto.comercio}, ${formatoPrecio(producto.precio_descuento)}`}
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: colores.superficie, borderColor: colores.borde },
        pressed && { opacity: 0.85 },
      ]}
    >
      {producto.imagen ? (
        <Image source={{ uri: producto.imagen }} style={estilos.foto} />
      ) : (
        <View style={[estilos.foto, estilos.sinFoto, { backgroundColor: colores.menta }]}>
          <Text style={estilos.emoji}>{emojiCategoria(producto.categoria)}</Text>
        </View>
      )}

      <View style={estilos.info}>
        <Text numberOfLines={2} style={[estilos.titulo, { color: colores.titulo }]}>
          {producto.titulo}
        </Text>
        <Text numberOfLines={1} style={[estilos.comercio, { color: colores.gris }]}>
          {producto.comercio}
          {tieneDistancia ? ` · a ${Number(producto.distancia_km).toFixed(1)} km` : ''}
        </Text>

        <View style={estilos.precios}>
          <Text style={[estilos.tachado, { color: colores.gris }]}>{formatoPrecio(producto.precio_original)}</Text>
          <Text style={[estilos.precio, { color: colores.titulo }]}>{formatoPrecio(producto.precio_descuento)}</Text>
          {producto.porcentaje_descuento > 0 ? (
            <Text style={[estilos.descuento, { backgroundColor: colores.verde, color: colores.sobreVerde }]}>
              -{producto.porcentaje_descuento}%
            </Text>
          ) : null}
        </View>

        {producto.es_donacion ? (
          <Text style={[estilos.donacion, { color: colores.verdeHover }]}>También para donación</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(1.5),
    gap: espacio(1.5),
  },
  foto: {
    width: 88,
    height: 88,
    borderRadius: 14,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  comercio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  precios: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    marginTop: espacio(0.5),
  },
  tachado: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textDecorationLine: 'line-through',
  },
  precio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  descuento: {
    fontFamily: fuentes.media,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  donacion: {
    fontFamily: fuentes.media,
    fontSize: 12,
  },
});
