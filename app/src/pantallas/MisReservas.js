// PASO 44 · Mis reservas (MINIMALISTA):
// arriba, las pendientes con el código grande ("Ver QR" lo despliega) y "Cancelar";
// abajo, el historial. En las retiradas se deja una opinión: estrellas al comercio, estrellas al
// producto y un comentario opcional ("Enviar opinión"). Si el comercio respondió, se ve debajo.
// Usa GET /api/mis-reservas/, POST /api/reservas/<id>/cancelar/ y POST /api/reservas/<id>/calificar/.
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import Esqueleto from '../componentes/Esqueleto';
import Encabezado from '../componentes/Encabezado';
import Estrellas from '../componentes/Estrellas';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import Vacio from '../componentes/Vacio';
import { mostrarAviso } from '../contexto/Aviso';
import { useSesion } from '../contexto/Sesion';
import { cancelarRecordatorio } from '../servicios/recordatorios';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
import { formatoPrecio, textoError, vibrar } from '../utilidades';

// "2026-10-26T14:30:00-03:00" -> "26/10"
function textoFecha(fechaHora) {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

// Una fila chiquita con ícono (comercio, dirección, horario)
function Linea({ icono, texto }) {
  const { colores } = useTema();
  return (
    <View style={estilos.linea}>
      <Icono nombre={icono} tamano={15} color={colores.gris} />
      <Text style={[estilos.detalle, { color: colores.gris, flex: 1 }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

function TarjetaPendiente({ reserva, alCancelar, cancelando }) {
  const { colores } = useTema();
  const [verQR, setVerQR] = useState(false);

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie }, sombra(colores)]}>
      <View style={estilos.filaTotal}>
        <Text style={[estilos.producto, { color: colores.titulo, flex: 1 }]} numberOfLines={2}>
          {reserva.cantidad} × {reserva.producto}
        </Text>
        <Text style={[estilos.total, { color: colores.titulo }]}>{formatoPrecio(reserva.precio_total)}</Text>
      </View>
      <Linea icono="storefront-outline" texto={reserva.comercio} />
      <Linea icono="location-outline" texto={reserva.direccion} />
      <Linea icono="time-outline" texto={reserva.horario} />

      {/* El código para mostrar en el local; el QR va siempre sobre blanco para que se pueda escanear */}
      <Pressable
        onPress={() => setVerQR((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Código de retiro ${reserva.codigo_retiro.split('').join(' ')}. ${verQR ? 'Ocultar QR' : 'Ver QR'}`}
        style={[estilos.codigoCaja, { backgroundColor: colores.menta }]}
      >
        <Text style={[estilos.codigo, { color: colores.titulo }]}>{reserva.codigo_retiro}</Text>
        {verQR ? (
          <View style={estilos.fondoQR}>
            <QRCode value={reserva.codigo_retiro} size={170} color="#073425" backgroundColor="#FFFFFF" />
          </View>
        ) : null}
        <View style={estilos.linea}>
          <Icono nombre={verQR ? 'chevron-up' : 'qr-code-outline'} tamano={15} color={colores.verdeHover} />
          <Text style={[estilos.detalle, { color: colores.verdeHover, fontFamily: fuentes.media }]}>
            {verQR ? 'Ocultar QR' : 'Ver QR'}
          </Text>
        </View>
      </Pressable>

      <Boton texto="Cancelar reserva" variante="texto" chico onPress={alCancelar} cargando={cancelando} />
    </View>
  );
}

// "El comercio  ★★★★☆": etiqueta a la izquierda y estrellas a la derecha (se pueden tocar si hay "alElegir")
function FilaEstrellas({ etiqueta, valor, alElegir, tamano }) {
  const { colores } = useTema();
  return (
    <View style={estilos.filaEstrellas}>
      <Text style={[estilos.detalle, { color: colores.gris }]}>{etiqueta}</Text>
      <Estrellas valor={valor} alElegir={alElegir} tamano={tamano} />
    </View>
  );
}

// La opinión ya enviada: estrellas, comentario y, si el comercio contestó, su respuesta
function MiOpinion({ reserva, alEditar }) {
  const { colores } = useTema();
  const opinion = reserva.calificacion;
  return (
    <View style={estilos.opinion}>
      <View style={estilos.filaTotal}>
        <Text style={[estilos.detalle, { color: colores.titulo, fontFamily: fuentes.media }]}>Tu opinión</Text>
        <Pressable onPress={alEditar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Editar tu opinión">
          <Text style={[estilos.detalle, { color: colores.verdeHover, fontFamily: fuentes.media }]}>Editar</Text>
        </Pressable>
      </View>
      <FilaEstrellas etiqueta="El comercio" valor={opinion.puntaje} tamano={16} />
      {opinion.puntaje_producto ? (
        <FilaEstrellas etiqueta="El producto" valor={opinion.puntaje_producto} tamano={16} />
      ) : null}
      {opinion.comentario ? (
        <Text style={[estilos.comentario, { color: colores.texto }]}>“{opinion.comentario}”</Text>
      ) : null}

      {opinion.respuesta ? (
        <View style={[estilos.respuesta, { backgroundColor: colores.menta, borderLeftColor: colores.verde }]}>
          <View style={estilos.linea}>
            <Icono nombre="chatbubble-ellipses-outline" tamano={14} color={colores.verdeHover} />
            <Text style={[estilos.detalle, { color: colores.verdeHover, fontFamily: fuentes.negrita, flex: 1 }]} numberOfLines={1}>
              Respuesta de {reserva.comercio}
            </Text>
          </View>
          <Text style={[estilos.comentario, { color: colores.texto }]}>{opinion.respuesta}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Formulario: primero solo "¿Qué tal estuvo? ☆☆☆☆☆"; al tocar una estrella aparece el resto
function FormOpinion({ reserva, alEnviar, alCancelar }) {
  const { colores } = useTema();
  const anterior = reserva.calificacion;
  const [puntaje, setPuntaje] = useState(anterior?.puntaje || 0);
  const [puntajeProducto, setPuntajeProducto] = useState(anterior?.puntaje_producto || 0);
  const [comentario, setComentario] = useState(anterior?.comentario || '');
  const [enviando, setEnviando] = useState(false);

  function elegir(setter) {
    return (n) => {
      vibrar();
      setter(n);
    };
  }

  async function enviar() {
    setEnviando(true);
    try {
      await alEnviar({
        puntaje,
        // Las estrellas del producto son opcionales: si no eligió, no se mandan
        ...(puntajeProducto ? { puntaje_producto: puntajeProducto } : {}),
        comentario: comentario.trim(),
      });
    } finally {
      setEnviando(false);
    }
  }

  if (!puntaje) {
    return <FilaEstrellas etiqueta="¿Qué tal estuvo?" valor={0} alElegir={elegir(setPuntaje)} />;
  }

  return (
    <View style={estilos.opinion}>
      <FilaEstrellas etiqueta="El comercio" valor={puntaje} alElegir={elegir(setPuntaje)} />
      <FilaEstrellas etiqueta="El producto" valor={puntajeProducto} alElegir={elegir(setPuntajeProducto)} />
      <Campo
        placeholder="Contanos cómo te fue (opcional)"
        value={comentario}
        onChangeText={setComentario}
        multiline
        maxLength={500}
        estiloInput={estilos.campoComentario}
      />
      <View style={estilos.botones}>
        {alCancelar ? (
          <Boton texto="Cancelar" variante="texto" chico onPress={alCancelar} deshabilitado={enviando} />
        ) : null}
        <Boton texto="Enviar opinión" icono="send" chico onPress={enviar} cargando={enviando} estilo={{ flex: 1 }} />
      </View>
      {comentario.length > 400 ? (
        <Text style={[estilos.mini, { color: colores.gris }]}>{500 - comentario.length} caracteres disponibles</Text>
      ) : null}
    </View>
  );
}

function FilaHistorial({ reserva, alEnviarOpinion }) {
  const { colores } = useTema();
  const retirada = reserva.estado === 'retirada';
  const [editando, setEditando] = useState(false);

  async function enviar(datos) {
    if (await alEnviarOpinion(reserva, datos)) setEditando(false);
  }

  return (
    <View style={[estilos.fila, { backgroundColor: colores.superficie }]}>
      <View style={estilos.filaTotal}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.textoFila, { color: colores.titulo }]} numberOfLines={1}>
            {reserva.cantidad} × {reserva.producto}
          </Text>
          <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={1}>
            {reserva.comercio} · {textoFecha(reserva.creada_en)}
          </Text>
        </View>
        <View style={estilos.linea}>
          <View style={[estilos.punto, { backgroundColor: retirada ? colores.verde : colores.borde }]} />
          <Text style={[estilos.detalle, { color: colores.gris }]}>{retirada ? 'Retirada' : 'Cancelada'}</Text>
        </View>
      </View>
      {retirada ? (
        <View style={[estilos.calificar, { borderColor: colores.borde }]}>
          {reserva.calificacion && !editando ? (
            <MiOpinion reserva={reserva} alEditar={() => setEditando(true)} />
          ) : (
            <FormOpinion
              reserva={reserva}
              alEnviar={enviar}
              alCancelar={reserva.calificacion ? () => setEditando(false) : null}
            />
          )}
        </View>
      ) : null}
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

  // Opinión sobre una reserva retirada (POST /api/reservas/<id>/calificar/).
  // Si ya había una, Django la actualiza. Devuelve true si se guardó.
  async function enviarOpinion(reserva, datos) {
    try {
      const actualizada = await api(`/reservas/${reserva.id}/calificar/`, { metodo: 'POST', datos });
      setReservas((lista) => lista.map((r) => (r.id === reserva.id ? actualizada : r)));
      vibrar('exito');
      mostrarAviso({ texto: '¡Gracias por tu opinión! 🌱' });
      return true;
    } catch (e) {
      Alert.alert('No se pudo enviar tu opinión', textoError(e) || 'Probá de nuevo.');
      return false;
    }
  }

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
              await cancelarRecordatorio(reserva.id); // ya no hace falta el aviso
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
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <Vacio
          icono="ticket-outline"
          texto={usuario ? 'Las reservas son para cuentas de consumidor.' : 'Ingresá para ver tus reservas.'}
          boton={usuario ? null : 'Iniciar sesión'}
          alTocar={() => navigation.navigate('Login')}
        />
      </View>
    );
  }

  if (cargando) return <Esqueleto tipo="filas" />;

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
      // Para escribir el comentario: "Enviar opinión" funciona con el teclado abierto y no queda tapado
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
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
          <Encabezado titulo="Mis reservas" />
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <Vacio
            icono="bag-handle-outline"
            texto="Todavía no reservaste nada"
            boton="Buscar ofertas"
            alTocar={() => navigation.navigate('Catalogo')}
          />
        ) : null
      }
      renderSectionHeader={({ section }) => (
        <Text style={[estilos.subtitulo, { color: colores.gris }]}>{section.titulo}</Text>
      )}
      renderItem={({ item, section }) =>
        section.tipo === 'pendiente' ? (
          <TarjetaPendiente reserva={item} alCancelar={() => cancelar(item)} cancelando={cancelando === item.id} />
        ) : (
          <FilaHistorial reserva={item} alEnviarOpinion={enviarOpinion} />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: espacio(1.25) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(4),
  },
  subtitulo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    marginTop: espacio(2.5),
    marginBottom: espacio(1),
    marginLeft: espacio(0.5),
  },
  tarjeta: {
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(0.75),
  },
  producto: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  linea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  codigoCaja: {
    alignItems: 'center',
    borderRadius: 16,
    padding: espacio(1.5),
    gap: espacio(1),
    marginTop: espacio(1),
  },
  codigo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.titulo,
    letterSpacing: 6,
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
    gap: espacio(1),
  },
  total: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  fila: {
    borderRadius: radio,
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1.5),
    gap: espacio(1),
  },
  textoFila: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  punto: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  calificar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: espacio(1),
  },
  opinion: {
    gap: espacio(1),
  },
  filaEstrellas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio(1),
  },
  comentario: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    lineHeight: 19,
  },
  respuesta: {
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: espacio(1.25),
    gap: 4,
  },
  campoComentario: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  botones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  mini: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
    textAlign: 'right',
  },
});
