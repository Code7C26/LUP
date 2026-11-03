// PASO 42 · Detalle del producto y reservar, como "Detalles del producto" del mockup:
// foto, título, descripción, precios, descuento, fecha límite de retiro,
// el comercio con horario y dirección, el selector de cantidad y "Realizar compra".
// Usa GET /api/productos/<id>/ y POST /api/productos/<id>/reservar/ (paso 29).
// Se abre desde el catálogo: navigation.navigate('DetalleProducto', { id: producto.id })
// PROPUESTA DE ESTÉTICA: foto grande arriba, datos en "pastillas" con íconos
// y la barra de compra fija abajo (cantidad + botón con el total).
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import BotonVolver from '../componentes/BotonVolver';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import ModalSolicitudDonacion from '../componentes/ModalSolicitudDonacion';
import { useCarrito } from '../contexto/Carrito';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
import { emojiCategoria, emojiRubro, formatoPrecio, textoError } from '../utilidades';

// "2026-10-26" -> "hoy", "mañana" o "el 28/10"
function textoFechaLimite(fecha) {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const limite = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((limite - hoy) / 86400000);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `el ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

// Botón redondo de − y + para la cantidad
function BotonCantidad({ icono, onPress, deshabilitado, etiqueta }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => [
        estilos.botonCantidad,
        { backgroundColor: pressed ? colores.menta : colores.campo },
        deshabilitado && { opacity: 0.4 },
      ]}
    >
      <Icono nombre={icono} tamano={18} color={colores.titulo} />
    </Pressable>
  );
}

export default function DetalleProducto({ navigation, route }) {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const { agregar } = useCarrito();
  const { bottom } = useSafeAreaInsets();
  const id = route?.params?.id;

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [reservando, setReservando] = useState(false);
  const [pidiendo, setPidiendo] = useState(false); // cuadro para pedirlo en donación (organizaciones)
  const [pedido, setPedido] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const datos = await api(`/productos/${id}/`);
      setProducto(datos);
      setCantidad((c) => Math.min(Math.max(c, 1), datos.stock || 1));
    } catch (e) {
      // El catálogo solo muestra productos disponibles: un 404 es porque se agotó o venció
      setError(e?.estado === 404 ? 'Esta oferta ya no está disponible.' : e);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function reservar() {
    if (!usuario) return navigation.navigate('Login');
    setReservando(true);
    try {
      const reserva = await api(`/productos/${producto.id}/reservar/`, { metodo: 'POST', datos: { cantidad } });
      Alert.alert(
        '¡Reserva confirmada!',
        `Mostrá el código ${reserva.codigo_retiro} en ${reserva.comercio} para retirar tu pedido.`
      );
      cargar(); // el stock bajó
      navigation.navigate('Pestanas', { screen: 'MisReservas' }); // la pestaña, dentro de las pestañas (paso 37)
    } catch (e) {
      Alert.alert('No se pudo reservar', textoError(e) || 'Probá de nuevo.');
      cargar(); // por si otro se llevó lo que quedaba
    } finally {
      setReservando(false);
    }
  }

  if (cargando) return <Cargando texto="Cargando la oferta…" />;

  if (!producto) {
    return (
      <View style={{ flex: 1, padding: espacio(2), paddingTop: espacio(10), backgroundColor: colores.fondo }}>
        <MensajeError mensaje={error} alReintentar={cargar} />
        <BotonVolver navigation={navigation} />
      </View>
    );
  }

  const fechaLimite = textoFechaLimite(producto.fecha_vencimiento);
  const venceHoy = fechaLimite === 'hoy';
  const puedeReservar = !usuario || usuario.rol === 'consumidor';
  const total = Number(producto.precio_descuento) * cantidad;

  // "Pastilla" con ícono: hasta cuándo, cuántos quedan, donación
  const Pastilla = ({ icono, texto, aviso }) => (
    <View style={[estilos.pastilla, { backgroundColor: aviso ? colores.ambarClaro : colores.menta }]}>
      <Icono nombre={icono} tamano={14} color={aviso ? colores.ambar : colores.verdeHover} />
      <Text style={[estilos.textoPastilla, { color: aviso ? colores.texto : colores.verdeHover }]}>{texto}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView contentContainerStyle={{ paddingBottom: espacio(4) }}>
        {/* Foto grande */}
        <View style={[estilos.foto, { backgroundColor: colores.menta }]}>
          {producto.imagen ? (
            <Image
              source={{ uri: urlCompleta(producto.imagen) }}
              style={StyleSheet.absoluteFill}
              accessibilityLabel={`Foto de ${producto.titulo}`}
            />
          ) : (
            <Text style={estilos.emoji}>{emojiCategoria(producto.categoria)}</Text>
          )}
          {producto.porcentaje_descuento > 0 ? (
            <Text style={[estilos.descuento, { backgroundColor: colores.ambar }]}>-{producto.porcentaje_descuento}%</Text>
          ) : null}
        </View>

        <View style={estilos.contenido}>
          <MensajeError mensaje={error} />

          {/* Título y precios */}
          <View style={{ gap: espacio(0.5) }}>
            <Text style={[estilos.categoria, { color: colores.verdeHover }]}>
              {emojiCategoria(producto.categoria)} {producto.categoria_texto}
            </Text>
            <Text style={[estilos.titulo, { color: colores.titulo }]}>{producto.titulo}</Text>
            <View style={estilos.precios}>
              <Text style={[estilos.precio, { color: colores.titulo }]}>{formatoPrecio(producto.precio_descuento)}</Text>
              <Text style={[estilos.tachado, { color: colores.gris }]}>{formatoPrecio(producto.precio_original)}</Text>
            </View>
          </View>

          <View style={estilos.filaPastillas}>
            <Pastilla icono="time-outline" texto={`Hasta ${fechaLimite}`} aviso={venceHoy} />
            <Pastilla icono="cube-outline" texto={producto.stock === 1 ? 'Queda 1' : `Quedan ${producto.stock}`} />
            {producto.es_donacion ? <Pastilla icono="heart-outline" texto="Donable" /> : null}
          </View>

          {producto.descripcion ? (
            <Text style={[estilos.texto, { color: colores.texto }]}>{producto.descripcion}</Text>
          ) : null}

          {/* El comercio: abre su detalle con el mapa (paso 43) */}
          <Pressable
            onPress={() => navigation.navigate('DetalleComercio', { id: producto.comercio_id })}
            accessibilityRole="button"
            accessibilityLabel={`Ver el comercio ${producto.comercio}`}
            style={({ pressed }) => [
              estilos.comercio,
              { backgroundColor: colores.superficie },
              sombra(colores),
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[estilos.avatarComercio, { backgroundColor: colores.menta }]}>
              <Text style={{ fontSize: 22 }}>{emojiRubro(producto.rubro)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[estilos.nombreComercio, { color: colores.titulo }]} numberOfLines={1}>
                {producto.comercio}
              </Text>
              <View style={estilos.fila}>
                <Icono nombre="location-outline" tamano={13} color={colores.gris} />
                <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={1}>
                  {producto.direccion}
                </Text>
              </View>
              <View style={estilos.fila}>
                <Icono nombre="time-outline" tamano={13} color={colores.gris} />
                <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={1}>
                  {producto.horario}
                </Text>
              </View>
            </View>
            <Icono nombre="chevron-forward" tamano={20} color={colores.gris} />
          </Pressable>

          {!puedeReservar && usuario?.rol !== 'organizacion' ? (
            <Text style={[estilos.aviso, { color: colores.gris }]}>Las reservas son solo para consumidores.</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Barra fija abajo: cantidad + reservar */}
      {puedeReservar ? (
        <View
          style={[
            estilos.barra,
            { backgroundColor: colores.superficie, paddingBottom: bottom + espacio(1.5) },
            sombra(colores, 2),
          ]}
        >
          <View style={estilos.selector}>
            <BotonCantidad
              icono="remove"
              etiqueta="Restar uno"
              deshabilitado={cantidad <= 1}
              onPress={() => setCantidad((c) => c - 1)}
            />
            <Text style={[estilos.cantidad, { color: colores.titulo }]} accessibilityLiveRegion="polite">
              {cantidad}
            </Text>
            <BotonCantidad
              icono="add"
              etiqueta="Sumar uno"
              deshabilitado={cantidad >= producto.stock}
              onPress={() => setCantidad((c) => c + 1)}
            />
          </View>
          {/* Agregar al carrito (para comprar varias cosas juntas) */}
          <Pressable
            onPress={() => {
              agregar(producto, cantidad);
              Alert.alert('Agregado al carrito', `${cantidad} × ${producto.titulo}`, [
                { text: 'Seguir mirando', style: 'cancel' },
                { text: 'Ver carrito', onPress: () => navigation.navigate('Carrito') },
              ]);
            }}
            disabled={producto.stock < 1}
            accessibilityRole="button"
            accessibilityLabel="Agregar al carrito"
            style={({ pressed }) => [
              estilos.botonCarrito,
              { borderColor: colores.verdeProfundo },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Icono nombre="cart-outline" tamano={21} color={colores.verdeProfundo} />
          </Pressable>
          <Boton
            texto={usuario ? `Reservar · ${formatoPrecio(total)}` : 'Ingresá para reservar'}
            icono={usuario ? 'bag-check-outline' : 'log-in-outline'}
            onPress={reservar}
            cargando={reservando}
            deshabilitado={producto.stock < 1}
            estilo={{ flex: 1 }}
          />
        </View>
      ) : usuario?.rol === 'organizacion' && producto.es_donacion ? (
        // La organización lo puede pedir en donación desde acá (paso 48)
        <View
          style={[
            estilos.barra,
            { backgroundColor: colores.superficie, paddingBottom: bottom + espacio(1.5) },
            sombra(colores, 2),
          ]}
        >
          <Boton
            texto={pedido ? 'Ya lo pediste' : 'Pedir en donación'}
            icono={pedido ? 'checkmark-circle' : 'heart'}
            onPress={() => setPidiendo(true)}
            deshabilitado={pedido}
            estilo={{ flex: 1 }}
          />
        </View>
      ) : null}

      <BotonVolver navigation={navigation} />

      <ModalSolicitudDonacion
        producto={pidiendo ? producto : null}
        alCerrar={() => setPidiendo(false)}
        alEnviar={() => {
          setPidiendo(false);
          setPedido(true);
          Alert.alert('Solicitud enviada', `${producto.comercio} recibió tu pedido. Vas a ver su respuesta en "Mis solicitudes".`);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    gap: espacio(2),
  },
  foto: {
    width: '100%',
    height: 280,
    borderBottomLeftRadius: radio * 1.5,
    borderBottomRightRadius: radio * 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 96,
  },
  descuento: {
    position: 'absolute',
    bottom: espacio(2),
    left: espacio(2),
    color: '#FFFFFF',
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  categoria: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  precios: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: espacio(1),
  },
  precio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.titulo,
  },
  tachado: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textDecorationLine: 'line-through',
  },
  filaPastillas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio(1),
  },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  textoPastilla: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    lineHeight: 22,
  },
  comercio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    borderRadius: radio,
    padding: espacio(1.5),
  },
  avatarComercio: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombreComercio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detalle: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingHorizontal: espacio(2),
    paddingTop: espacio(1.5),
    borderTopLeftRadius: radio,
    borderTopRightRadius: radio,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  botonCarrito: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCantidad: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidad: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    minWidth: 22,
    textAlign: 'center',
  },
  aviso: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
});
