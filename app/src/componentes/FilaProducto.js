// Fila de producto IGUAL AL MOCKUP (página 8): la foto cuadrada a la izquierda
// y una tarjeta gris a la derecha con el nombre, el precio y "Agregar al carrito"
// (en pantallas chicas el botón baja abajo de los precios).
// Tocar la fila abre el detalle; el botón lo suma al carrito (si ya está, suma uno más).
// Uso:  <FilaProducto producto={p} onPress={() => navigation.navigate('DetalleProducto', { id: p.id })} />
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { mostrarAviso } from '../contexto/Aviso';
import { useCarrito } from '../contexto/Carrito';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, sombra, useTema } from '../tema';
import { emojiCategoria, formatoPrecio, textoDistancia, vibrar } from '../utilidades';
import FotoSuave from './FotoSuave';
import Icono from './Icono';

export default function FilaProducto({ producto, onPress, mostrarComercio }) {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const { agregar, cantidadDe } = useCarrito();
  const enCarrito = cantidadDe(producto.id);
  const puedeComprar = !usuario || usuario.rol === 'consumidor';
  const lleno = enCarrito >= producto.stock;
  const navigation = useNavigation();

  // La fila aparece suave (sube un poquito y se hace visible)
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [entrada]);

  function agregarAlCarrito() {
    agregar(producto, 1);
    vibrar();
    mostrarAviso({ texto: 'Agregado al carrito', boton: 'Ver', alTocar: () => navigation.navigate('Carrito') });
  }
  const distancia = textoDistancia(producto.distancia_km)?.replace('a ', '');

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${producto.titulo}, ${formatoPrecio(producto.precio_descuento)}. Ver detalle`}
      style={({ pressed }) => [estilos.fila, pressed && { opacity: 0.85 }]}
    >
      <View style={[estilos.foto, { backgroundColor: colores.panel }]}>
        {producto.imagen ? (
          <FotoSuave uri={producto.imagen} estilo={StyleSheet.absoluteFill} />
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
              onPress={agregarAlCarrito}
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
    </Animated.View>
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
  // Precios y botón en la misma línea si entran; si no (pantallas chicas, precios largos),
  // el botón baja a su propia línea: nunca se tapan.
  abajo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: espacio(1),
    rowGap: espacio(0.75),
    marginTop: espacio(0.5),
  },
  precios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 6,
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
