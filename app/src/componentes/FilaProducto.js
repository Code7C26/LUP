// Fila de producto IGUAL AL MOCKUP (página 8): la foto cuadrada a la izquierda
// y una tarjeta gris a la derecha con el nombre, el precio y "Agregar al carrito".
// Tocar la fila abre el detalle; el botón lo suma al carrito (si ya está, suma uno más).
// Uso:  <FilaProducto producto={p} onPress={() => navigation.navigate('DetalleProducto', { id: p.id })} />
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { urlCompleta } from '../api/cliente';
import { useCarrito } from '../contexto/Carrito';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, sombra, useTema } from '../tema';
import { emojiCategoria, formatoPrecio, textoDistancia } from '../utilidades';
import Icono from './Icono';

export default function FilaProducto({ producto, onPress, mostrarComercio }) {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const { agregar, cantidadDe } = useCarrito();
  const enCarrito = cantidadDe(producto.id);
  const puedeComprar = !usuario || usuario.rol === 'consumidor';
  const lleno = enCarrito >= producto.stock;
  const distancia = textoDistancia(producto.distancia_km)?.replace('a ', '');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${producto.titulo}, ${formatoPrecio(producto.precio_descuento)}. Ver detalle`}
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
          {puedeComprar ? (
            <Pressable
              onPress={() => agregar(producto, 1)}
              disabled={lleno}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={enCarrito ? `Sumar otro al carrito, hay ${enCarrito}` : 'Agregar al carrito'}
              style={({ pressed }) => [
                estilos.boton,
                { backgroundColor: colores.verdeProfundo },
                (pressed || lleno) && { opacity: 0.6 },
              ]}
            >
              <Icono nombre={enCarrito ? 'cart' : 'cart-outline'} tamano={12} color={colores.sobreVerdeProfundo} />
              <Text style={[estilos.textoBoton, { color: colores.sobreVerdeProfundo }]}>
                {enCarrito ? `En el carrito · ${enCarrito}` : 'Agregar al carrito'}
              </Text>
            </Pressable>
          ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: espacio(1.5),
    paddingVertical: 5,
  },
  textoBoton: {
    fontFamily: fuentes.botonMedio,
    fontSize: 11,
  },
});
