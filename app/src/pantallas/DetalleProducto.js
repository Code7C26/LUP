// PASO 42 · Detalle del producto y reservar, como "Detalles del producto" del mockup:
// foto, título, descripción, precios, descuento, fecha límite de retiro,
// el comercio con horario y dirección, el selector de cantidad y "Realizar compra".
// Usa GET /api/productos/<id>/ y POST /api/productos/<id>/reservar/ (paso 29).
// Se abre desde el catálogo: navigation.navigate('DetalleProducto', { id: producto.id })
// PROPUESTA DE ESTÉTICA: foto grande arriba, datos en "pastillas" con íconos
// y la barra de compra fija abajo (cantidad + botón con el total).
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import BotonVolver from '../componentes/BotonVolver';
import FotoSuave from '../componentes/FotoSuave';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import IconoCategoria from '../componentes/IconoCategoria';
import MensajeError from '../componentes/MensajeError';
import ModalSolicitudDonacion from '../componentes/ModalSolicitudDonacion';
import { mostrarAviso } from '../contexto/Aviso';
import { useCarrito } from '../contexto/Carrito';
import { programarRecordatorio, textoHora } from '../servicios/recordatorios';
import { useSesion } from '../contexto/Sesion';
import { textoDeOpcion, useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
import { formatoDiaMes, formatoPrecio, textoError, vibrar } from '../utilidades';

// "2026-10-26" -> cuántos días faltan (0 = hoy, 1 = mañana), o null si no hay fecha
function diasHasta(fecha) {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const limite = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((limite - hoy) / 86400000);
}

// Botón redondo de − y + para la cantidad
function BotonCantidad({ icono, onPress, deshabilitado, etiqueta }) {
  const { colores } = useTema();
  const { t } = useIdioma();
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
  const { t } = useIdioma();
  const { usuario } = useSesion();
  const { agregar } = useCarrito();
  const { top, bottom } = useSafeAreaInsets();
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
      setError(e?.estado === 404 ? t('detalleProducto.noDisponible') : e);
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
      vibrar('exito');
      // Aviso en el celular 30 minutos antes del horario de retiro
      const aviso = await programarRecordatorio({
        reservaId: reserva.id,
        producto: producto.titulo,
        comercio: reserva.comercio,
        codigo: reserva.codigo_retiro,
        horario: producto.horario,
        fecha: producto.fecha_vencimiento,
      });
      Alert.alert(
        t('detalleProducto.confirmada'),
        t('detalleProducto.mostraCodigo', { codigo: reserva.codigo_retiro, comercio: reserva.comercio }) +
          (aviso ? `\n\n${t('detalleProducto.teAvisamos', { hora: textoHora(aviso) })}` : '')
      );
      cargar(); // el stock bajó
      navigation.navigate('Pestanas', { screen: 'MisReservas' }); // la pestaña, dentro de las pestañas (paso 37)
    } catch (e) {
      Alert.alert(t('detalleProducto.noSePudo'), textoError(e) || t('detalleProducto.probaDeNuevo'));
      cargar(); // por si otro se llevó lo que quedaba
    } finally {
      setReservando(false);
    }
  }

  if (cargando) return <Cargando texto={t('detalleProducto.cargando')} />;

  if (!producto) {
    return (
      <View style={{ flex: 1, padding: espacio(2), paddingTop: espacio(10), backgroundColor: colores.fondo }}>
        <MensajeError mensaje={error} alReintentar={cargar} />
        <BotonVolver navigation={navigation} />
      </View>
    );
  }

  const dias = diasHasta(producto.fecha_vencimiento);
  const venceHoy = dias === 0;
  const fechaLimite =
    dias === null
      ? ''
      : dias === 0
        ? t('detalleProducto.hoy')
        : dias === 1
          ? t('detalleProducto.manana')
          : t('detalleProducto.elDia', { fecha: formatoDiaMes(producto.fecha_vencimiento) });
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
            <FotoSuave uri={producto.imagen} estilo={StyleSheet.absoluteFill} etiqueta={t('detalleProducto.fotoDe', { titulo: producto.titulo })} />
          ) : (
            <IconoCategoria categoria={producto.categoria} llenar tamano={72} />
          )}
          {producto.porcentaje_descuento > 0 ? (
            <Text style={[estilos.descuento, { backgroundColor: colores.suaves.durazno.fondo, color: colores.texto }]}>
              -{producto.porcentaje_descuento}%
            </Text>
          ) : null}
        </View>

        <View style={estilos.contenido}>
          <MensajeError mensaje={error} />

          {/* Título y precios */}
          <View style={{ gap: espacio(0.5) }}>
            <View style={estilos.filaCategoria}>
              <IconoCategoria categoria={producto.categoria} tamano={22} />
              <Text style={[estilos.categoria, { color: colores.verdeHover, flexShrink: 1 }]}>
                {textoDeOpcion(t, 'categorias', producto.categoria, producto.categoria_texto)}
              </Text>
            </View>
            <Text style={[estilos.titulo, { color: colores.titulo }]}>{producto.titulo}</Text>
            <View style={estilos.precios}>
              <Text style={[estilos.precio, { color: colores.titulo }]}>{formatoPrecio(producto.precio_descuento)}</Text>
              <Text style={[estilos.tachado, { color: colores.gris }]}>{formatoPrecio(producto.precio_original)}</Text>
            </View>
          </View>

          <View style={estilos.filaPastillas}>
            <Pastilla icono="time-outline" texto={t('detalleProducto.hasta', { fecha: fechaLimite })} aviso={venceHoy} />
            <Pastilla icono="cube-outline" texto={t('detalleProducto.quedan', { n: producto.stock })} />
            {producto.es_donacion ? <Pastilla icono="heart-outline" texto={t('detalleProducto.donable')} /> : null}
          </View>

          {producto.descripcion ? (
            <Text style={[estilos.texto, { color: colores.texto }]}>{producto.descripcion}</Text>
          ) : null}

          {/* El comercio: abre su detalle con el mapa (paso 43) */}
          <Pressable
            onPress={() => navigation.navigate('DetalleComercio', { id: producto.comercio_id })}
            accessibilityRole="button"
            accessibilityLabel={t('detalleProducto.verComercio', { comercio: producto.comercio })}
            style={({ pressed }) => [
              estilos.comercio,
              { backgroundColor: colores.superficie },
              sombra(colores),
              pressed && { opacity: 0.85 },
            ]}
          >
            <IconoCategoria rubro={producto.rubro} tamano={48} />
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
            <Text style={[estilos.aviso, { color: colores.gris }]}>{t('detalleProducto.soloConsumidores')}</Text>
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
              etiqueta={t('detalleProducto.restar')}
              deshabilitado={cantidad <= 1}
              onPress={() => setCantidad((c) => c - 1)}
            />
            <Text style={[estilos.cantidad, { color: colores.titulo }]} accessibilityLiveRegion="polite">
              {cantidad}
            </Text>
            <BotonCantidad
              icono="add"
              etiqueta={t('detalleProducto.sumar')}
              deshabilitado={cantidad >= producto.stock}
              onPress={() => setCantidad((c) => c + 1)}
            />
          </View>
          {/* Agregar al carrito (para comprar varias cosas juntas) */}
          <Pressable
            onPress={() => {
              agregar(producto, cantidad);
              vibrar();
              mostrarAviso({
                texto: t('detalleProducto.alCarrito', { n: cantidad, titulo: producto.titulo }),
                boton: t('detalleProducto.ver'),
                alTocar: () => navigation.navigate('Carrito'),
              });
            }}
            disabled={producto.stock < 1}
            accessibilityRole="button"
            accessibilityLabel={t('detalleProducto.agregarAlCarrito')}
            style={({ pressed }) => [
              estilos.botonCarrito,
              { borderColor: colores.verdeProfundo },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Icono nombre="cart-outline" tamano={21} color={colores.verdeProfundo} />
          </Pressable>
          <Boton
            texto={usuario ? t('detalleProducto.reservar', { total: formatoPrecio(total) }) : t('detalleProducto.ingresaParaReservar')}
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
            texto={pedido ? t('detalleProducto.yaLoPediste') : t('detalleProducto.pedirDonacion')}
            icono={pedido ? 'checkmark-circle' : 'heart'}
            onPress={() => setPidiendo(true)}
            deshabilitado={pedido}
            estilo={{ flex: 1 }}
          />
        </View>
      ) : null}

      <BotonVolver navigation={navigation} />
      {/* Compartir la oferta (WhatsApp, Instagram, etc.) */}
      <Pressable
        onPress={() =>
          Share.share({
            message: t('detalleProducto.compartirMensaje', {
              titulo: producto.titulo,
              precio: formatoPrecio(producto.precio_descuento),
              antes: formatoPrecio(producto.precio_original),
              comercio: producto.comercio,
              direccion: producto.direccion,
            }),
          }).catch(() => {})
        }
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('detalleProducto.compartir')}
        style={({ pressed }) => [
          estilos.compartir,
          { top: top + espacio(1), backgroundColor: colores.superficie },
          sombra(colores),
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icono nombre="share-social-outline" tamano={20} color={colores.texto} />
      </Pressable>

      <ModalSolicitudDonacion
        producto={pidiendo ? producto : null}
        alCerrar={() => setPidiendo(false)}
        alEnviar={() => {
          setPidiendo(false);
          setPedido(true);
          Alert.alert(t('detalleProducto.solicitudEnviada'), t('detalleProducto.solicitudEnviadaTexto', { comercio: producto.comercio }));
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
  descuento: {
    position: 'absolute',
    bottom: espacio(2),
    left: espacio(2),
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
  filaCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  compartir: {
    position: 'absolute',
    right: espacio(2),
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
