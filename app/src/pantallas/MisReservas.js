// PASO 44 · Mis reservas:
// arriba, las pendientes con el código grande y el QR para mostrar en el local, y "Cancelar";
// abajo, el historial (retiradas y canceladas).
// Usa GET /api/mis-reservas/ y POST /api/reservas/<id>/cancelar/ (paso 29).
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cargando from '../componentes/Cargando';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { formatoPrecio, textoError } from '../utilidades';

// "2026-10-26T14:30:00-03:00" -> "26/10"
function textoFecha(fechaHora) {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

function TarjetaPendiente({ reserva, alCancelar, cancelando }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <Text style={[estilos.producto, { color: colores.titulo }]}>
        {reserva.cantidad} × {reserva.producto}
      </Text>
      <Text style={[estilos.detalle, { color: colores.gris }]}>🏪 {reserva.comercio}</Text>
      <Text style={[estilos.detalle, { color: colores.gris }]}>📍 {reserva.direccion}</Text>
      <Text style={[estilos.detalle, { color: colores.gris }]}>🕒 Retiro: {reserva.horario}</Text>

      {/* El QR va siempre sobre blanco, para que el comercio lo pueda escanear también en modo oscuro */}
      <View style={[estilos.codigoCaja, { backgroundColor: colores.menta }]}>
        <Text style={[estilos.textoCodigo, { color: colores.gris }]}>Mostrá este código en el local</Text>
        <Text
          style={[estilos.codigo, { color: colores.titulo }]}
          accessibilityLabel={`Código de retiro: ${reserva.codigo_retiro.split('').join(' ')}`}
        >
          {reserva.codigo_retiro}
        </Text>
        <View style={estilos.fondoQR}>
          <QRCode value={reserva.codigo_retiro} size={180} color={colores.verdeProfundo} backgroundColor="#FFFFFF" />
        </View>
      </View>

      <View style={estilos.filaTotal}>
        <Text style={[estilos.detalle, { color: colores.gris }]}>Total a pagar al retirar</Text>
        <Text style={[estilos.total, { color: colores.titulo }]}>{formatoPrecio(reserva.precio_total)}</Text>
      </View>

      <Boton texto="Cancelar reserva" variante="secundario" onPress={alCancelar} cargando={cancelando} />
    </View>
  );
}

function FilaHistorial({ reserva }) {
  const { colores } = useTema();
  const retirada = reserva.estado === 'retirada';
  return (
    <View style={[estilos.fila, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[estilos.textoFila, { color: colores.titulo }]} numberOfLines={1}>
          {reserva.cantidad} × {reserva.producto}
        </Text>
        <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={1}>
          {reserva.comercio} · {textoFecha(reserva.creada_en)} · {formatoPrecio(reserva.precio_total)}
        </Text>
      </View>
      <Text
        style={[
          estilos.estado,
          retirada
            ? { backgroundColor: colores.menta, color: colores.verdeHover }
            : { backgroundColor: colores.fondo, color: colores.gris },
        ]}
      >
        {reserva.estado_texto}
      </Text>
    </View>
  );
}

export default function MisReservas({ navigation }) {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const esConsumidor = usuario?.rol === 'consumidor';

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(null); // id de la reserva que se está cancelando

  const cargar = useCallback(async () => {
    if (!esConsumidor) {
      setCargando(false);
      return;
    }
    setError('');
    try {
      setReservas(await api('/mis-reservas/'));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [esConsumidor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al volver a esta pestaña se actualiza (por ejemplo, después de reservar o de retirar en el local)
  useEffect(() => navigation?.addListener?.('focus', cargar), [navigation, cargar]);

  function cancelar(reserva) {
    Alert.alert(
      '¿Cancelar la reserva?',
      `${reserva.cantidad} × ${reserva.producto} en ${reserva.comercio}. El producto vuelve a quedar disponible para otros.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelando(reserva.id);
            try {
              await api(`/reservas/${reserva.id}/cancelar/`, { metodo: 'POST' });
              await cargar();
            } catch (e) {
              Alert.alert('No se pudo cancelar', textoError(e) || 'Probá de nuevo.');
            } finally {
              setCancelando(null);
            }
          },
        },
      ]
    );
  }

  // Invitado o cuenta que no es de consumidor
  if (!esConsumidor) {
    return (
      <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
        <Text style={estilos.emojiVacio}>🎟️</Text>
        <Text style={[estilos.textoVacio, { color: colores.gris }]}>
          {usuario
            ? 'Las reservas son solo para cuentas de consumidor.'
            : 'Ingresá con tu cuenta para ver tus reservas y sus códigos de retiro.'}
        </Text>
        {!usuario ? <Boton texto="Iniciar sesión" onPress={() => navigation.navigate('Login')} /> : null}
      </View>
    );
  }

  if (cargando) return <Cargando texto="Buscando tus reservas…" />;

  const pendientes = reservas.filter((r) => r.estado === 'pendiente');
  const historial = reservas.filter((r) => r.estado !== 'pendiente');
  const secciones = [
    { titulo: 'Para retirar', data: pendientes, tipo: 'pendiente' },
    { titulo: 'Historial', data: historial, tipo: 'historial' },
  ].filter((s) => s.data.length > 0);

  return (
    <SectionList
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      sections={secciones}
      keyExtractor={(r) => String(r.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={actualizando}
          tintColor={colores.verde}
          onRefresh={() => {
            setActualizando(true);
            cargar();
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: espacio(1.5) }}>
          <Text style={[estilos.titulo, { color: colores.titulo }]}>Mis reservas</Text>
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <View style={estilos.vacio}>
            <Text style={estilos.emojiVacio}>🛍️</Text>
            <Text style={[estilos.textoVacio, { color: colores.gris }]}>
              Todavía no hiciste ninguna reserva. Buscá ofertas en el catálogo.
            </Text>
            <Boton texto="Ver catálogo" onPress={() => navigation.navigate('Catalogo')} />
          </View>
        ) : null
      }
      renderSectionHeader={({ section }) => (
        <Text style={[estilos.subtitulo, { color: colores.titulo }]}>{section.titulo}</Text>
      )}
      renderItem={({ item, section }) =>
        section.tipo === 'pendiente' ? (
          <TarjetaPendiente reserva={item} alCancelar={() => cancelar(item)} cancelando={cancelando === item.id} />
        ) : (
          <FilaHistorial reserva={item} />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  subtitulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    marginTop: espacio(2.5),
    marginBottom: espacio(1.5),
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(0.75),
  },
  producto: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  codigoCaja: {
    alignItems: 'center',
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(1),
    marginVertical: espacio(1),
  },
  textoCodigo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  codigo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.titulo,
    letterSpacing: 4,
  },
  fondoQR: {
    backgroundColor: '#FFFFFF',
    padding: espacio(1.5),
    borderRadius: 14,
  },
  filaTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espacio(1),
  },
  total: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    borderWidth: 1,
    borderRadius: radio,
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1.5),
  },
  textoFila: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  estado: {
    fontFamily: fuentes.media,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio(3),
    gap: espacio(1.5),
  },
  vacio: {
    alignItems: 'center',
    gap: espacio(1.5),
    marginTop: espacio(4),
  },
  emojiVacio: {
    fontSize: 40,
  },
  textoVacio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
  },
});
