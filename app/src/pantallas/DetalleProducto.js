// PASO 42 · Detalle del producto y reservar, como "Detalles del producto" del mockup:
// foto, título, descripción, precios, descuento, fecha límite de retiro,
// el comercio con horario y dirección, el selector de cantidad y "Realizar compra".
// Usa GET /api/productos/<id>/ y POST /api/productos/<id>/reservar/ (paso 29).
// Se abre desde el catálogo: navigation.navigate('DetalleProducto', { id: producto.id })
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cargando from '../componentes/Cargando';
import MensajeError from '../componentes/MensajeError';
import ModalSolicitudDonacion from '../componentes/ModalSolicitudDonacion';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { emojiCategoria, formatoPrecio, textoError } from '../utilidades';

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
function BotonCantidad({ texto, onPress, deshabilitado, etiqueta }) {
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
        { borderColor: colores.verde, backgroundColor: pressed ? colores.menta : 'transparent' },
        deshabilitado && { opacity: 0.4 },
      ]}
    >
      <Text style={[estilos.textoBotonCantidad, { color: colores.verdeHover }]}>{texto}</Text>
    </Pressable>
  );
}

export default function DetalleProducto({ navigation, route }) {
  const { colores } = useTema();
  const { usuario } = useSesion();
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
      <View style={[estilos.contenido, { flex: 1, backgroundColor: colores.fondo }]}>
        <MensajeError mensaje={error} alReintentar={cargar} />
      </View>
    );
  }

  const fechaLimite = textoFechaLimite(producto.fecha_vencimiento);
  const venceHoy = fechaLimite === 'hoy';
  const puedeReservar = !usuario || usuario.rol === 'consumidor';
  const total = Number(producto.precio_descuento) * cantidad;

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido}>
      {producto.imagen ? (
        <Image
          source={{ uri: urlCompleta(producto.imagen) }}
          style={estilos.foto}
          accessibilityLabel={`Foto de ${producto.titulo}`}
        />
      ) : (
        <View style={[estilos.foto, estilos.sinFoto, { backgroundColor: colores.menta }]}>
          <Text style={estilos.emoji}>{emojiCategoria(producto.categoria)}</Text>
        </View>
      )}

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
          {producto.porcentaje_descuento > 0 ? (
            <Text style={[estilos.etiqueta, { backgroundColor: colores.verde, color: colores.sobreVerde }]}>
              -{producto.porcentaje_descuento}%
            </Text>
          ) : null}
        </View>
      </View>

      {producto.descripcion ? (
        <Text style={[estilos.texto, { color: colores.texto }]}>{producto.descripcion}</Text>
      ) : null}

      {/* Fecha límite y stock */}
      <View style={estilos.filaEtiquetas}>
        <Text
          style={[
            estilos.etiqueta,
            venceHoy
              ? { backgroundColor: colores.ambarClaro, color: colores.texto }
              : { backgroundColor: colores.menta, color: colores.verdeHover },
          ]}
        >
          🕒 Retirá hasta {fechaLimite}
        </Text>
        <Text style={[estilos.etiqueta, { backgroundColor: colores.menta, color: colores.verdeHover }]}>
          {producto.stock === 1 ? 'Queda 1' : `Quedan ${producto.stock}`}
        </Text>
        {producto.es_donacion ? (
          <Text style={[estilos.etiqueta, { backgroundColor: colores.menta, color: colores.verdeHover }]}>
            💚 También para donación
          </Text>
        ) : null}
      </View>

      {/* El comercio: abre su detalle con el mapa (paso 43) */}
      <Pressable
        onPress={() => navigation.navigate('DetalleComercio', { id: producto.comercio_id })}
        accessibilityRole="button"
        accessibilityLabel={`Ver el comercio ${producto.comercio}`}
        style={({ pressed }) => [
          estilos.tarjeta,
          { backgroundColor: colores.superficie, borderColor: colores.borde },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={estilos.filaComercio}>
          <Text style={[estilos.nombreComercio, { color: colores.titulo }]} numberOfLines={1}>
            🏪 {producto.comercio}
          </Text>
          <Text style={[estilos.link, { color: colores.verdeHover }]}>Ver comercio ›</Text>
        </View>
        <Text style={[estilos.detalle, { color: colores.gris }]}>📍 {producto.direccion}</Text>
        <Text style={[estilos.detalle, { color: colores.gris }]}>🕒 Retiro: {producto.horario}</Text>
      </Pressable>

      {/* Cantidad, total y reservar */}
      {puedeReservar ? (
        <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
          <View style={estilos.filaCantidad}>
            <Text style={[estilos.nombreComercio, { color: colores.titulo }]}>Cantidad</Text>
            <View style={estilos.selector}>
              <BotonCantidad
                texto="−"
                etiqueta="Restar uno"
                deshabilitado={cantidad <= 1}
                onPress={() => setCantidad((c) => c - 1)}
              />
              <Text style={[estilos.cantidad, { color: colores.titulo }]} accessibilityLiveRegion="polite">
                {cantidad}
              </Text>
              <BotonCantidad
                texto="+"
                etiqueta="Sumar uno"
                deshabilitado={cantidad >= producto.stock}
                onPress={() => setCantidad((c) => c + 1)}
              />
            </View>
          </View>
          <View style={estilos.filaCantidad}>
            <Text style={[estilos.texto, { color: colores.gris }]}>Total</Text>
            <Text style={[estilos.precio, { color: colores.titulo }]}>{formatoPrecio(total)}</Text>
          </View>
          <Boton
            texto={usuario ? 'Realizar compra' : 'Ingresá para reservar'}
            onPress={reservar}
            cargando={reservando}
            deshabilitado={producto.stock < 1}
          />
          <Text style={[estilos.aviso, { color: colores.gris }]}>
            Recibirás un código para mostrar al retirar.
          </Text>
        </View>
      ) : usuario.rol === 'organizacion' && producto.es_donacion ? (
        // La organización lo puede pedir en donación desde acá (paso 48)
        <View style={{ gap: espacio(1) }}>
          <Boton
            texto={pedido ? '✓ Ya lo pediste' : 'Pedir en donación'}
            onPress={() => setPidiendo(true)}
            deshabilitado={pedido}
          />
          <Text style={[estilos.aviso, { color: colores.gris }]}>
            El comercio recibe tu mensaje y te responde en "Mis solicitudes".
          </Text>
        </View>
      ) : (
        <Text style={[estilos.aviso, { color: colores.gris }]}>Las reservas son solo para cuentas de consumidor.</Text>
      )}

      <ModalSolicitudDonacion
        producto={pidiendo ? producto : null}
        alCerrar={() => setPidiendo(false)}
        alEnviar={() => {
          setPidiendo(false);
          setPedido(true);
          Alert.alert('Solicitud enviada', `${producto.comercio} recibió tu pedido. Vas a ver su respuesta en "Mis solicitudes".`);
        }}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    gap: espacio(2),
  },
  foto: {
    width: '100%',
    height: 240,
    borderRadius: radio,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
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
    alignItems: 'center',
    gap: espacio(1),
  },
  precio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  tachado: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textDecorationLine: 'line-through',
  },
  etiqueta: {
    fontFamily: fuentes.media,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  filaEtiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio(1),
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(1),
  },
  filaComercio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  nombreComercio: {
    flex: 1,
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  link: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  filaCantidad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  botonCantidad: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonCantidad: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  cantidad: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    minWidth: 24,
    textAlign: 'center',
  },
  aviso: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
});
