// Producto en una lista (Buscar, detalle del comercio y Mis favoritos), sin caja: la foto a la izquierda con el
// "-40%", y a la derecha el nombre, una línea gris ("$1.500 · Panadería Sol · 1 km · ★ 4,6"), el selector de
// cantidad ("1 ⌄") y "Agregar al carrito".
// Tocar la fila abre el detalle; el selector abre la lista de 1 hasta el stock que queda
// y el botón suma esa cantidad al carrito.
// Uso:  <FilaProducto producto={p} onPress={() => navigation.navigate('DetalleProducto', { id: p.id })} />
//       <FilaProducto ... mostrarComercio calificacion={{ promedio, cantidad }} />  ← estrellas del comercio
//       (de /api/comercios/; la API de productos no las trae). Sin opiniones: "Nuevo".
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { mostrarAviso } from '../contexto/Aviso';
import { useCarrito } from '../contexto/Carrito';
import { useSesion } from '../contexto/Sesion';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
import { formatoPrecio, textoKm, venceHoy, vibrar } from '../utilidades';
import CalificacionComercio, { promedioConComa, textoCalificacion } from './CalificacionComercio';
import FotoSuave from './FotoSuave';
import IconoCategoria from './IconoCategoria';
import Icono from './Icono';
import PastillaDescuento, { porcentajeDescuento } from './PastillaDescuento';

// "conBarraCarrito": la pantalla ya tiene la barra "Ver carrito" abajo, así que el aviso no repite el botón "Ver"
export default function FilaProducto({ producto, onPress, mostrarComercio, calificacion, conBarraCarrito, variante = 'lista' }) {
  const { colores, esOscuro } = useTema();
  const card = variante === 'tarjeta';
  const { t } = useIdioma();
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
    mostrarAviso(
      conBarraCarrito
        ? { texto: t('fila.agregados', { n: elegida }) }
        : { texto: t('fila.agregados', { n: elegida }), boton: t('fila.ver'), alTocar: () => navigation.navigate('Carrito') }
    );
    setCantidad(1);
  }
  const porcentaje = porcentajeDescuento(producto);
  const promedio = calificacion ? promedioConComa(calificacion.promedio, calificacion.cantidad) : null;
  // Una sola línea gris: "$1.500 · Panadería Sol · 1 km · ★ 4,6" (el comercio y las estrellas, solo en Buscar)
  const linea = [
    formatoPrecio(producto.precio_descuento),
    mostrarComercio && producto.comercio,
    textoKm(producto.distancia_km),
    mostrarComercio && promedio && `★ ${promedio}`,
  ]
    .filter(Boolean)
    .join(' · ');

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
      accessibilityLabel={[
        t('fila.accesible', { titulo: producto.titulo, precio: formatoPrecio(producto.precio_descuento) }),
        mostrarComercio && producto.comercio,
        textoKm(producto.distancia_km),
        mostrarComercio && calificacion && textoCalificacion(calificacion.promedio, calificacion.cantidad),
        porcentaje && t('inicio.descuentoAccesible', { n: porcentaje }),
      ]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => [
        card ? estilos.tarjeta : estilos.fila,
        card && { backgroundColor: esOscuro ? colores.panel : colores.fondo, borderColor: colores.borde },
        card && sombra(colores),
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View>
        <View style={[estilos.foto, { backgroundColor: colores.panel }]}>
          {producto.imagen ? (
            <FotoSuave uri={producto.imagen} estilo={StyleSheet.absoluteFill} />
          ) : (
            <IconoCategoria categoria={producto.categoria} llenar tamano={34} />
          )}
        </View>
        <PastillaDescuento porcentaje={porcentaje} />
      </View>

      <View style={estilos.datos}>
        <Text style={[estilos.titulo, { color: colores.texto }]} numberOfLines={2}>
          {producto.titulo}
        </Text>
        {card ? (
          <>
            {mostrarComercio ? (
              <Text style={[estilos.chico, { color: colores.gris }]} numberOfLines={1}>
                {producto.comercio}
                {textoKm(producto.distancia_km) ? ` · ${textoKm(producto.distancia_km)}` : ''}
              </Text>
            ) : null}
            {mostrarComercio && calificacion ? (
              <CalificacionComercio promedio={calificacion.promedio} cantidad={calificacion.cantidad} tamano={11} />
            ) : null}
            {venceHoy(producto) ? (
              <View style={[estilos.venceHoy, { backgroundColor: colores.suaves.ambar.fondo }]}>
                <Icono nombre="time-outline" tamano={11} color={colores.suaves.ambar.icono} />
                <Text style={[estilos.textoVenceHoy, { color: colores.texto }]}>{t('fila.venceHoy')}</Text>
              </View>
            ) : null}
            <View style={estilos.precios}>
              <Text style={[estilos.precio, { color: colores.verdeTexto }]}>{formatoPrecio(producto.precio_descuento)}</Text>
              <Text style={[estilos.tachado, { color: colores.gris }]}>{formatoPrecio(producto.precio_original)}</Text>
            </View>
          </>
        ) : (
          <Text style={[estilos.linea, { color: colores.grisVerde }]} numberOfLines={2}>
            {linea}
          </Text>
        )}
        <View style={estilos.abajo}>
          {puedeComprar ? (
            <View style={estilos.acciones}>
              {/* Selector de cantidad "1 ⌄" (como el mockup) */}
              <Pressable
                onPress={() => setEligiendo(true)}
                disabled={lleno}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('fila.cantidadAccesible', { n: elegida })}
                accessibilityHint={t('fila.cantidadAyuda')}
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
                    ? t('fila.noQuedan', { n: enCarrito })
                    : t('fila.agregarN', { n: elegida }) + (enCarrito ? t('fila.yaHay', { n: enCarrito }) : '')
                }
                style={({ pressed }) => [
                  estilos.boton,
                  { backgroundColor: colores.verdeProfundo },
                  (pressed || lleno) && { opacity: 0.6 },
                ]}
              >
                <Icono nombre={enCarrito ? 'cart' : 'cart-outline'} tamano={12} color={colores.sobreVerdeProfundo} />
                <Text style={[estilos.textoBoton, { color: colores.sobreVerdeProfundo }]} numberOfLines={1}>
                  {enCarrito ? t('fila.enCarrito', { n: enCarrito }) : t('fila.agregar')}
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
  const { t } = useIdioma();
  const numeros = Array.from({ length: maximo }, (_, i) => i + 1);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={alCerrar}>
      <View style={[estilos.velo, { backgroundColor: colores.velo }]}>
        {/* Tocar afuera del cuadro lo cierra */}
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityLabel={t('comun.cerrar')} />
        <View style={[estilos.cuadro, { backgroundColor: colores.superficie }, sombra(colores, 3)]}>
          <Text style={[estilos.tituloCuadro, { color: colores.titulo }]}>{t('fila.cantidad')}</Text>
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
  // Sin caja: la foto, el nombre, una línea gris y los botones
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  foto: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titulo: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  linea: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    lineHeight: 17,
  },
  chico: {
    fontFamily: fuentes.normal,
    fontSize: 11,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    padding: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  venceHoy: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  textoVenceHoy: {
    fontFamily: fuentes.media,
    fontSize: 10,
  },
  precios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 6,
  },
  precio: {
    fontFamily: fuentes.marca,
    fontSize: 18,
  },
  tachado: {
    fontFamily: fuentes.normal,
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  abajo: {
    flexDirection: 'row',
    marginTop: 2,
  },
  // Selector + botón siempre juntos
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
