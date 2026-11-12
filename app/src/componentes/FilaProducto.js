// Fila de producto IGUAL AL MOCKUP (página 8): la foto cuadrada a la izquierda
// y una tarjeta gris a la derecha con el nombre, el precio, el selector de cantidad ("1 ⌄")
// y "Agregar al carrito" (en pantallas chicas los dos bajan abajo de los precios).
// Tocar la fila abre el detalle; el selector abre la lista de 1 hasta el stock que queda
// y el botón suma esa cantidad al carrito.
// Uso:  <FilaProducto producto={p} onPress={() => navigation.navigate('DetalleProducto', { id: p.id })} />
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { mostrarAviso } from '../contexto/Aviso';
import { useCarrito } from '../contexto/Carrito';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
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
  // Lo que todavía se puede sumar (agregar() nunca pasa del stock)
  const disponible = Math.max((producto.stock || 1) - enCarrito, 1);
  const [cantidad, setCantidad] = useState(1);
  const [eligiendo, setEligiendo] = useState(false);
  const elegida = Math.min(cantidad, disponible);
  const navigation = useNavigation();

  // La fila aparece suave (sube un poquito y se hace visible)
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [entrada]);

  function agregarAlCarrito() {
    agregar(producto, elegida);
    vibrar();
    mostrarAviso({
      texto: elegida > 1 ? `${elegida} agregados al carrito` : 'Agregado al carrito',
      boton: 'Ver',
      alTocar: () => navigation.navigate('Carrito'),
    });
    setCantidad(1);
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
            <View style={estilos.acciones}>
              {/* Selector de cantidad "1 ⌄" (como el mockup) */}
              <Pressable
                onPress={() => setEligiendo(true)}
                disabled={lleno}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Cantidad: ${elegida}`}
                accessibilityHint="Elegir cuántos agregar al carrito"
                style={({ pressed }) => [
                  estilos.selector,
                  { backgroundColor: colores.campo, borderColor: colores.borde },
                  (pressed || lleno) && { opacity: 0.6 },
                ]}
              >
                <Text style={[estilos.textoSelector, { color: colores.texto }]}>{elegida}</Text>
                <Icono nombre="chevron-down" tamano={12} color={colores.gris} />
              </Pressable>

              <Pressable
                onPress={agregarAlCarrito}
                disabled={lleno}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={
                  lleno
                    ? `No quedan más, hay ${enCarrito} en el carrito`
                    : `Agregar ${elegida} al carrito${enCarrito ? `, ya hay ${enCarrito}` : ''}`
                }
                style={({ pressed }) => [
                  estilos.boton,
                  { backgroundColor: colores.verdeProfundo },
                  (pressed || lleno) && { opacity: 0.6 },
                ]}
              >
                <Icono nombre={enCarrito ? 'cart' : 'cart-outline'} tamano={12} color={colores.sobreVerdeProfundo} />
                <Text style={[estilos.textoBoton, { color: colores.sobreVerdeProfundo }]} numberOfLines={1}>
                  {enCarrito ? `En el carrito · ${enCarrito}` : 'Agregar al carrito'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>

    {/* Se monta solo mientras está abierta (hay muchas filas en las listas) */}
    {puedeComprar && eligiendo ? (
      <ListaCantidades
        maximo={disponible}
        elegida={elegida}
        titulo={producto.titulo}
        alElegir={(n) => {
          setCantidad(n);
          setEligiendo(false);
        }}
        alCerrar={() => setEligiendo(false)}
      />
    ) : null}
    </Animated.View>
  );
}

// Lista de 1 hasta "maximo" en un cuadro centrado (se scrollea si el stock es grande)
const ALTO_OPCION = 44;

function ListaCantidades({ maximo, elegida, titulo, alElegir, alCerrar }) {
  const { colores } = useTema();
  const numeros = Array.from({ length: maximo }, (_, i) => i + 1);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={alCerrar}>
      <View style={[estilos.velo, { backgroundColor: colores.velo }]}>
        {/* Tocar afuera del cuadro lo cierra */}
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityLabel="Cerrar" />
        <View style={[estilos.cuadro, { backgroundColor: colores.superficie }, sombra(colores, 3)]}>
          <Text style={[estilos.tituloCuadro, { color: colores.titulo }]}>Cantidad</Text>
          <Text style={[estilos.chico, { color: colores.gris }]} numberOfLines={1}>
            {titulo}
          </Text>
          <FlatList
            data={numeros}
            keyExtractor={(n) => String(n)}
            style={{ maxHeight: ALTO_OPCION * 6, marginTop: espacio(1) }}
            getItemLayout={(_, i) => ({ length: ALTO_OPCION, offset: ALTO_OPCION * i, index: i })}
            initialScrollIndex={Math.min(Math.max(elegida - 3, 0), Math.max(maximo - 6, 0))}
            accessibilityRole="radiogroup"
            renderItem={({ item: n }) => {
              const activa = n === elegida;
              return (
                <Pressable
                  onPress={() => alElegir(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activa }}
                  accessibilityLabel={String(n)}
                  style={({ pressed }) => [
                    estilos.opcion,
                    activa && { backgroundColor: colores.verdeProfundo },
                    pressed && !activa && { backgroundColor: colores.campo },
                  ]}
                >
                  <Text style={[estilos.textoOpcion, { color: activa ? colores.sobreVerdeProfundo : colores.texto }]}>
                    {n}
                  </Text>
                  {activa ? <Icono nombre="checkmark" tamano={18} color={colores.sobreVerdeProfundo} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
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
  // Selector + botón siempre juntos (si no entran al lado de los precios, bajan los dos)
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(0.75),
    flexShrink: 1,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: espacio(1.25),
    paddingRight: espacio(1),
    paddingVertical: 4,
  },
  textoSelector: {
    fontFamily: fuentes.negrita,
    fontSize: 12,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: espacio(1.5),
    paddingVertical: 5,
  },
  textoBoton: {
    flexShrink: 1,
    fontFamily: fuentes.botonMedio,
    fontSize: 11,
  },
  // Cuadro de la lista de cantidades
  velo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacio(3),
  },
  cuadro: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radio,
    padding: espacio(2),
  },
  tituloCuadro: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  opcion: {
    height: ALTO_OPCION,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio(1.5),
    borderRadius: 10,
  },
  textoOpcion: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
});
