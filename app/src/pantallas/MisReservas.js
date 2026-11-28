// PASO 44 · Mis reservas.
// Cabecera verde ("Tus reservas" y los pendientes y retiradas), la tarjeta "Tu impacto" y los Puntos Lüp.
// Para retirar: la reserva que vence hoy destacada arriba; el resto en tarjetas con una cuenta regresiva.
// Historial agrupado por mes, con "Calificar" en las retiradas sin opinión y "Volver a pedir" por comercio.
// Usa GET /api/mis-reservas/, POST /api/reservas/<id>/cancelar/ y POST /api/reservas/<id>/calificar/.
// Para las fotos, el "vence hoy" y el comercio de cada reserva se cruza con GET /api/productos/ y /api/comercios/
// (la reserva no trae esos datos). Los puntos vienen de GET /api/puntos/.
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import CabeceraUsuario from '../componentes/CabeceraUsuario';
import Esqueleto from '../componentes/Esqueleto';
import EstadoVacio from '../componentes/EstadoVacio';
import Estrellas from '../componentes/Estrellas';
import HojaAbajo from '../componentes/HojaAbajo';
import Icono from '../componentes/Icono';
import IconoCategoria from '../componentes/IconoCategoria';
import MensajeError from '../componentes/MensajeError';
import Pestanas from '../componentes/Pestanas';
import TituloSeccion from '../componentes/TituloSeccion';
import { mostrarAviso } from '../contexto/Aviso';
import { t as traducir, useIdioma } from '../contexto/Idioma';
import { useSesion } from '../contexto/Sesion';
import { cancelarRecordatorio } from '../servicios/recordatorios';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import { formatoDiaMes, formatoPrecio, hoyLocal, textoError, textoKm, vibrar } from '../utilidades';

const presionado = { transform: [{ scale: 0.97 }] };

// El QR va siempre sobre una tarjeta blanca (en los dos modos) para que se pueda escanear
const QR = { fondo: '#FFFFFF', tinta: '#073425', texto: '#4D4C4C' };

// El mismo link que arma Django para "Cómo llegar" (stores/ubicacion.py), con la dirección del comercio
function abrirMapa(direccion) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}`;
  Linking.openURL(url).catch(() => Alert.alert(traducir('comun.noSePudoAbrir'), traducir('comun.noSePudoAbrirTexto')));
}

// La hora de cierre de retiro, del texto de horario del comercio ("Lun a Sáb de 18 a 20 hs" → 20:00 de hoy)
function horaCierre(horario) {
  const coincidencias = [...String(horario || '').matchAll(/(\d{1,2})(?::(\d{2}))?\s*hs/gi)];
  if (!coincidencias.length) return null;
  const ultima = coincidencias[coincidencias.length - 1];
  const cierre = new Date();
  cierre.setHours(Number(ultima[1]), Number(ultima[2] || 0), 0, 0);
  return cierre;
}

// "3 h" o "40 min" para lo que falta hasta el cierre (null si ya cerró)
function diferencia(cierre, ahora) {
  const ms = cierre - ahora;
  if (ms <= 0) return null;
  const horas = Math.floor(ms / 3600000);
  return horas >= 1 ? { horas } : { minutos: Math.max(1, Math.floor(ms / 60000)) };
}

const diaDe = (valor) => String(valor || '').slice(0, 10);

// Ubicación sin volver a pedir permiso (como en Buscar)
async function ubicacionSiHayPermiso() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const posicion =
      (await Location.getLastKnownPositionAsync()) ||
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return posicion?.coords || null;
  } catch {
    return null;
  }
}

function FotoReserva({ imagen, tamano }) {
  const { colores } = useTema();
  return (
    <View
      style={[
        estilos.foto,
        { width: tamano, height: tamano, borderRadius: Math.round(tamano * 0.25), backgroundColor: colores.menta },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {imagen ? (
        <Image source={{ uri: urlCompleta(imagen) }} style={StyleSheet.absoluteFill} />
      ) : (
        <Icono nombre="bag-handle-outline" tamano={Math.round(tamano * 0.42)} color={colores.verdeHover} />
      )}
    </View>
  );
}

// Cuadro centrado con el QR grande para mostrar en el local. Se cierra tocando afuera o con la X.
function ModalQR({ reserva, alCerrar }) {
  const { t } = useIdioma();
  return (
    <Modal visible={Boolean(reserva)} transparent animationType="fade" onRequestClose={alCerrar} statusBarTranslucent>
      <View style={estilos.veloCentro}>
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityLabel={t('comun.cerrar')} />
        {reserva ? (
          <View style={[estilos.tarjetaQR, { backgroundColor: QR.fondo }]}>
            <Pressable
              onPress={alCerrar}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('comun.cerrar')}
              style={({ pressed }) => [estilos.cerrarQR, pressed && presionado]}
            >
              <Icono nombre="close" tamano={22} color={QR.texto} />
            </Pressable>
            <QRCode value={reserva.codigo_retiro} size={220} color={QR.tinta} backgroundColor={QR.fondo} />
            <Text
              selectable
              style={[estilos.codigo, { color: QR.tinta }]}
              accessibilityLabel={t('misReservas.codigoAccesible', { codigo: reserva.codigo_retiro.split('').join(' ') })}
            >
              {reserva.codigo_retiro}
            </Text>
            <Text style={[estilos.producto, { color: QR.tinta, textAlign: 'center' }]}>{reserva.comercio}</Text>
            <Text style={[estilos.detalle, { color: QR.texto, textAlign: 'center' }]}>{t('misReservas.mostralo')}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

// "El comercio  ★★★★☆": etiqueta a la izquierda y estrellas a la derecha
function FilaEstrellas({ etiqueta, valor, alElegir, tamano }) {
  const { colores } = useTema();
  return (
    <View style={estilos.filaEstrellas}>
      <Text style={[estilos.detalle, { color: colores.texto, flex: 1 }]}>{etiqueta}</Text>
      <Estrellas valor={valor} alElegir={alElegir} tamano={tamano} />
    </View>
  );
}

// El formulario de la hoja: arranca con la opinión anterior (si había) para poder editarla
function FormOpinion({ reserva, alEnviar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
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

  return (
    <View style={estilos.form}>
      <FilaEstrellas etiqueta={t('misReservas.elComercio')} valor={puntaje} alElegir={elegir(setPuntaje)} tamano={28} />
      <FilaEstrellas etiqueta={t('misReservas.elProducto')} valor={puntajeProducto} alElegir={elegir(setPuntajeProducto)} tamano={28} />
      <Campo
        placeholder={t('misReservas.contanos')}
        value={comentario}
        onChangeText={setComentario}
        multiline
        maxLength={500}
        estiloInput={estilos.campoComentario}
      />
      {comentario.length > 400 ? (
        <Text style={[estilos.mini, { color: colores.gris }]}>{t('misReservas.caracteres', { n: 500 - comentario.length })}</Text>
      ) : null}
      {/* Como antes: sin estrellas al comercio no se puede enviar */}
      <Boton texto={t('misReservas.enviarOpinion')} icono="send" onPress={enviar} cargando={enviando} deshabilitado={!puntaje} />
    </View>
  );
}

// Hoja desde abajo para calificar (o editar la opinión) de una reserva retirada
function HojaOpinion({ reserva, alCerrar, alEnviar }) {
  const { t } = useIdioma();
  return (
    <HojaAbajo
      visible={Boolean(reserva)}
      alCerrar={alCerrar}
      titulo={t('misReservas.queTal')}
      subtitulo={reserva ? `${reserva.producto} · ${reserva.comercio}` : ''}
    >
      {reserva ? <FormOpinion key={reserva.id} reserva={reserva} alEnviar={alEnviar} /> : null}
    </HojaAbajo>
  );
}

// La reserva que vence hoy: destacada en verde de la marca, con el código y los botones en crema
function DestacadaHoy({ reserva, cierre, imagen, alVerQR, alComoLlegar, alCancelar, cancelando }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const hasta = cierre ? cierre.toTimeString().slice(0, 5) : null;
  return (
    <View style={[estilos.destacada, { backgroundColor: colores.marca }]}>
      <View style={estilos.fila}>
        <FotoReserva imagen={imagen} tamano={56} />
        <View style={estilos.datos}>
          <Text style={[estilos.etiquetaDestacada, { color: colores.sobreMarcaSuave }]}>
            {hasta ? t('misReservas.hoyRetiraHasta', { hora: hasta }) : t('misReservas.hoyRetira')}
          </Text>
          <Text style={[estilos.producto, { color: colores.crema }]} numberOfLines={2}>
            {reserva.producto}
          </Text>
          <Text style={[estilos.detalle, { color: colores.sobreMarcaSuave }]} numberOfLines={1}>
            {reserva.comercio}
          </Text>
        </View>
      </View>

      <View style={[estilos.pastillaCodigo, { backgroundColor: colores.crema }]}>
        <Text
          selectable
          style={[estilos.codigo, { color: colores.marca }]}
          accessibilityLabel={t('misReservas.codigoAccesible', { codigo: reserva.codigo_retiro.split('').join(' ') })}
        >
          {reserva.codigo_retiro}
        </Text>
      </View>

      <View style={estilos.botones}>
        <Pressable
          onPress={alVerQR}
          accessibilityRole="button"
          accessibilityLabel={t('misReservas.verQr')}
          style={({ pressed }) => [estilos.botonCrema, { backgroundColor: colores.crema }, pressed && presionado]}
        >
          <Text style={[estilos.textoBoton, { color: colores.marca }]}>{t('misReservas.verQr')}</Text>
        </Pressable>
        {reserva.direccion ? (
          <Pressable
            onPress={alComoLlegar}
            accessibilityRole="button"
            accessibilityLabel={t('misReservas.comoLlegar')}
            style={({ pressed }) => [estilos.botonBorde, { borderColor: colores.crema }, pressed && presionado]}
          >
            <Text style={[estilos.textoBoton, { color: colores.crema }]}>{t('misReservas.comoLlegar')}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={alCancelar}
        disabled={cancelando}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('misReservas.cancelarReserva')}
        accessibilityState={{ disabled: cancelando, busy: cancelando }}
        style={({ pressed }) => [estilos.cancelarDestacada, pressed && presionado]}
      >
        {cancelando ? (
          <ActivityIndicator size="small" color={colores.crema} />
        ) : (
          <Text style={[estilos.textoCancelar, { color: colores.sobreMarcaSuave }]}>{t('misReservas.cancelarReserva')}</Text>
        )}
      </Pressable>
    </View>
  );
}

// Una reserva para retirar (las demás): tarjeta blanca con la cuenta regresiva chiquita
function TarjetaPendiente({ reserva, cierre, imagen, alVerQR, alComoLlegar, alCancelar, cancelando }) {
  const { colores, esOscuro } = useTema();
  const { t } = useIdioma();
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    if (!cierre) return undefined;
    const reloj = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(reloj);
  }, [cierre]);
  const falta = cierre ? diferencia(cierre, ahora) : null;
  const linea = [reserva.comercio, t('misReservas.unidades', { n: reserva.cantidad })].join(' · ');

  return (
    <View style={[estilos.tarjeta, { backgroundColor: esOscuro ? colores.panel : colores.fondo, borderColor: colores.borde }]}>
      <View style={estilos.fila}>
        <FotoReserva imagen={imagen} tamano={48} />
        <View style={estilos.datos}>
          <Text style={[estilos.producto, { color: colores.texto }]} numberOfLines={2}>
            {reserva.producto}
          </Text>
          <Text style={[estilos.detalle, { color: colores.grisVerde }]} numberOfLines={1}>
            {linea}
          </Text>
        </View>
        {falta ? (
          <Text style={[estilos.cuenta, { color: colores.verdeTexto }]}>
            {falta.horas ? t('misReservas.faltanHoras', { n: falta.horas }) : t('misReservas.faltanMinutos', { n: falta.minutos })}
          </Text>
        ) : null}
      </View>

      <View style={[estilos.pastillaCodigo, { backgroundColor: colores.menta }]}>
        <Text
          selectable
          style={[estilos.codigo, { color: colores.verdeProfundo }]}
          accessibilityLabel={t('misReservas.codigoAccesible', { codigo: reserva.codigo_retiro.split('').join(' ') })}
        >
          {reserva.codigo_retiro}
        </Text>
      </View>

      <View style={estilos.botonesFila}>
        <Boton texto={t('misReservas.verQr')} chico onPress={alVerQR} estilo={estilos.botonFila} />
        {reserva.direccion ? (
          <Boton texto={t('misReservas.comoLlegar')} variante="secundario" chico onPress={alComoLlegar} estilo={estilos.botonFila} />
        ) : null}
      </View>

      <Pressable
        onPress={alCancelar}
        disabled={cancelando}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('misReservas.cancelarReserva')}
        accessibilityState={{ disabled: cancelando, busy: cancelando }}
        style={({ pressed }) => [estilos.cancelar, pressed && presionado]}
      >
        {cancelando ? (
          <ActivityIndicator size="small" color={colores.gris} />
        ) : (
          <Text style={[estilos.textoCancelar, { color: colores.gris }]}>{t('misReservas.cancelarReserva')}</Text>
        )}
      </Pressable>
    </View>
  );
}

function FilaHistorial({ reserva, imagen, alCalificar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const [verRespuesta, setVerRespuesta] = useState(false);
  const retirada = reserva.estado === 'retirada';
  const opinion = reserva.calificacion;
  const linea = [retirada ? t('misReservas.retirada') : t('misReservas.cancelada'), reserva.comercio, formatoDiaMes(reserva.creada_en)]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={estilos.filaHistorial}>
      <View style={estilos.fila}>
        <FotoReserva imagen={imagen} tamano={48} />
        <View style={estilos.datos}>
          <Text style={[estilos.textoFila, { color: colores.texto }]} numberOfLines={1}>
            {reserva.cantidad} × {reserva.producto}
          </Text>
          <View style={estilos.linea}>
            <View style={[estilos.puntito, { backgroundColor: retirada ? colores.verde : colores.gris }]} />
            <Text style={[estilos.detalle, { color: colores.grisVerde, flex: 1 }]} numberOfLines={1}>
              {linea}
            </Text>
          </View>
          {retirada && opinion ? (
            <View style={estilos.linea}>
              <Estrellas valor={opinion.puntaje} tamano="chico" />
              <Pressable
                onPress={() => alCalificar(reserva)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('misReservas.editarOpinion')}
                style={({ pressed }) => pressed && presionado}
              >
                <Text style={[estilos.mini, { color: colores.grisVerde }]}>{t('comun.editar')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={estilos.derecha}>
          {/* Puntos Lüp que sumó esta compra (Django manda "puntos_sumados" solo en las retiradas) */}
          {retirada && reserva.puntos_sumados > 0 ? (
            <Text style={[estilos.puntosSumados, { color: colores.verdeTexto }]}>
              {t('misReservas.puntosSumados', { n: reserva.puntos_sumados })}
            </Text>
          ) : null}
          {retirada && !opinion ? (
            <Pressable
              onPress={() => alCalificar(reserva)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('misReservas.calificarAccesible', { producto: reserva.producto })}
              style={({ pressed }) => pressed && presionado}
            >
              <Text style={[estilos.textoCalificar, { color: colores.verdeTexto }]}>{t('misReservas.calificar')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* La respuesta del comercio: se despliega al tocar */}
      {opinion?.respuesta ? (
        <Pressable
          onPress={() => setVerRespuesta((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: verRespuesta }}
          style={({ pressed }) => [estilos.respuesta, pressed && presionado]}
        >
          <View style={estilos.linea}>
            <Text style={[estilos.mini, { color: colores.verdeProfundo, fontFamily: fuentes.semi }]}>
              {t('misReservas.respuestaComercio')}
            </Text>
            <Icono nombre={verRespuesta ? 'chevron-up' : 'chevron-down'} tamano={13} color={colores.verdeProfundo} />
          </View>
          {verRespuesta ? <Text style={[estilos.comentario, { color: colores.texto }]}>{opinion.respuesta}</Text> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

// "Volver a pedir": los comercios donde ya retiró más de una vez, para ir a sus ofertas
function VolverAPedir({ comercios, alTocar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={estilos.bloque}>
      <TituloSeccion texto={t('misReservas.volverAPedir')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaHorizontal}>
        {comercios.map((c) => (
          <Pressable
            key={c.nombre}
            onPress={() => alTocar(c)}
            accessibilityRole="button"
            accessibilityLabel={`${c.nombre}. ${t('misReservas.verOfertas')}`}
            style={({ pressed }) => [estilos.comercioTarjeta, { backgroundColor: colores.menta }, pressed && presionado]}
          >
            <View style={estilos.comercioFoto}>
              {c.imagen ? (
                <Image source={{ uri: urlCompleta(c.imagen) }} style={StyleSheet.absoluteFill} />
              ) : (
                <IconoCategoria categoria={c.categoria} llenar tamano={30} />
              )}
            </View>
            <Text style={[estilos.comercioNombre, { color: colores.titulo }]} numberOfLines={1}>
              {c.nombre}
            </Text>
            <Text style={[estilos.verOfertas, { color: colores.verdeTexto }]}>{t('misReservas.verOfertas')}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// "Cerca tuyo ahora": las primeras ofertas, para cuando no hay reservas pendientes
function CercaTuyo({ ofertas, alTocar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={estilos.bloque}>
      <TituloSeccion texto={t('misReservas.cercaTuyoAhora')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaHorizontal}>
        {ofertas.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => alTocar(p)}
            accessibilityRole="button"
            accessibilityLabel={`${p.titulo}, ${formatoPrecio(p.precio_descuento)}`}
            style={({ pressed }) => [estilos.ofertaTarjeta, pressed && presionado]}
          >
            <View style={[estilos.ofertaFoto, { backgroundColor: colores.panel }]}>
              {p.imagen ? (
                <Image source={{ uri: urlCompleta(p.imagen) }} style={StyleSheet.absoluteFill} />
              ) : (
                <IconoCategoria categoria={p.categoria} llenar tamano={30} />
              )}
            </View>
            <Text style={[estilos.comercioNombre, { color: colores.texto }]} numberOfLines={1}>
              {p.titulo}
            </Text>
            <Text style={[estilos.detalle, { color: colores.grisVerde }]} numberOfLines={1}>
              {[formatoPrecio(p.precio_descuento), textoKm(p.distancia_km)].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function MisReservas({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario } = useSesion();
  const esConsumidor = usuario?.rol === 'consumidor';

  const [reservas, setReservas] = useState([]);
  const [ofertas, setOfertas] = useState([]); // para las fotos, el "vence hoy" y la fila "Cerca tuyo"
  const [comercios, setComercios] = useState([]); // para el id de cada comercio (Volver a pedir)
  const [saldoPuntos, setSaldoPuntos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(null); // id de la reserva que se está cancelando
  const [pestana, setPestana] = useState('pendientes');
  const [qrDe, setQrDe] = useState(null); // la reserva cuyo QR se está mostrando
  const [calificando, setCalificando] = useState(null); // la reserva que se está calificando

  // Opinión sobre una reserva retirada (POST /api/reservas/<id>/calificar/).
  // Si ya había una, Django la actualiza. Si se guardó, se cierra la hoja.
  async function enviarOpinion(datos) {
    const reserva = calificando;
    try {
      const actualizada = await api(`/reservas/${reserva.id}/calificar/`, { metodo: 'POST', datos });
      setReservas((lista) => lista.map((r) => (r.id === reserva.id ? actualizada : r)));
      vibrar('exito');
      mostrarAviso({ texto: t('misReservas.gracias') });
      setCalificando(null);
    } catch (e) {
      Alert.alert(t('misReservas.noSeEnvio'), textoError(e) || t('misReservas.probaDeNuevo'));
    }
  }

  const cargar = useCallback(async () => {
    if (!esConsumidor) {
      setCargando(false);
      return;
    }
    setError('');
    // Lo que no viene de las reservas se pide aparte: si falla, las reservas se ven igual
    const coords = await ubicacionSiHayPermiso();
    const ubicacion = coords ? `&lat=${coords.latitude}&lng=${coords.longitude}` : '';
    const [listaOfertas, listaComercios, puntos] = await Promise.all([
      api(`/productos/?orden=${coords ? 'cercania' : 'recientes'}${ubicacion}`).catch(() => []),
      api('/comercios/').catch(() => []),
      api('/puntos/').catch(() => null),
    ]);
    setOfertas(listaOfertas);
    setComercios(listaComercios);
    setSaldoPuntos(puntos?.saldo ?? null);
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
      t('misReservas.cancelarPregunta'),
      t('misReservas.cancelarTexto', { n: reserva.cantidad, producto: reserva.producto, comercio: reserva.comercio }),
      [
        { text: t('misReservas.no'), style: 'cancel' },
        {
          text: t('misReservas.siCancelar'),
          style: 'destructive',
          onPress: async () => {
            setCancelando(reserva.id);
            try {
              await api(`/reservas/${reserva.id}/cancelar/`, { metodo: 'POST' });
              await cancelarRecordatorio(reserva.id); // ya no hace falta el aviso
              await cargar();
            } catch (e) {
              Alert.alert(t('misReservas.noSeCancelo'), textoError(e) || t('misReservas.probaDeNuevo'));
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
        <EstadoVacio texto={usuario ? t('misReservas.soloConsumidores') : t('misReservas.ingresaParaVer')} />
      </View>
    );
  }

  if (cargando) return <Esqueleto tipo="reservas" />;

  // Lo que sale de cruzar las reservas con las ofertas y los comercios
  const ofertaDe = Object.fromEntries(ofertas.map((p) => [p.id, p]));
  const imagenDe = (reserva) => ofertaDe[reserva.producto_id]?.imagen;
  const hoy = hoyLocal();
  const venceHoy = (reserva) => diaDe(ofertaDe[reserva.producto_id]?.fecha_vencimiento) === hoy;

  const pendientes = reservas.filter((r) => r.estado === 'pendiente');
  const retiradas = reservas.filter((r) => r.estado === 'retirada');
  const historial = reservas.filter((r) => r.estado !== 'pendiente');
  const pendientesOrdenados = [...pendientes].sort((a, b) => Number(venceHoy(b)) - Number(venceHoy(a)));
  const destacada = pendientesOrdenados.find(venceHoy) || null;
  const resto = pendientesOrdenados.filter((r) => r !== destacada);

  // Tu impacto: lo retirado y en cuántos comercios
  const comidas = retiradas.reduce((suma, r) => suma + (Number(r.cantidad) || 0), 0);
  const comerciosVisitados = new Set(retiradas.map((r) => r.comercio)).size;

  // Volver a pedir: comercios donde retiró más de una vez
  const veces = {};
  retiradas.forEach((r) => {
    veces[r.comercio] = (veces[r.comercio] || 0) + 1;
  });
  const comerciosDeNuevo = Object.entries(veces)
    .filter(([, n]) => n > 1)
    .map(([nombre]) => {
      const comercio = comercios.find((c) => c.nombre_fantasia === nombre);
      const oferta = comercio && ofertas.find((p) => p.comercio_id === comercio.id);
      return { nombre, id: comercio?.id, imagen: oferta?.imagen, categoria: oferta?.categoria };
    })
    .filter((c) => c.id);

  // El historial, agrupado por mes ("Noviembre", "Octubre")
  const meses = traducir('fechas.meses');
  const historialConMeses = [];
  let mesAnterior = null;
  [...historial]
    .sort((a, b) => String(b.creada_en).localeCompare(String(a.creada_en)))
    .forEach((r) => {
      const fecha = new Date(r.creada_en);
      const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      if (clave !== mesAnterior) {
        historialConMeses.push({ tipo: 'mes', clave, titulo: `${meses[fecha.getMonth()]} ${fecha.getFullYear()}` });
        mesAnterior = clave;
      }
      historialConMeses.push({ tipo: 'reserva', reserva: r });
    });

  const enPendientes = pestana === 'pendientes';
  const datos = enPendientes ? [] : historialConMeses;

  const cabecera = (
    <View style={estilos.cabecera}>
      <CabeceraUsuario
        foto={urlCompleta(usuario?.foto)}
        nombre={usuario?.nombre}
        arriba={t('misReservas.subtitulo')}
        titulo={t('misReservas.titulo')}
        resumen={`${t('misReservas.resumenPendientes', { n: pendientes.length })} · ${t('misReservas.resumenRetiradas', { n: retiradas.length })}`}
        alTocar={() => navigation.navigate('Perfil')}
      />

      <View style={[estilos.impacto, { backgroundColor: colores.menta }]}>
        <Text style={[estilos.impactoTitulo, { color: colores.verdeProfundo }]}>{t('misReservas.impactoTitulo')}</Text>
        <View style={estilos.impactoFila}>
          <View style={estilos.impactoDato}>
            <Text style={[estilos.impactoNumero, { color: colores.verdeProfundo }]}>{comidas}</Text>
            <Text style={[estilos.impactoTexto, { color: colores.grisVerde }]}>
              {t('misReservas.comidasSalvadas', { n: comidas })}
            </Text>
          </View>
          <View style={estilos.impactoDato}>
            <Text style={[estilos.impactoNumero, { color: colores.verdeProfundo }]}>{comerciosVisitados}</Text>
            <Text style={[estilos.impactoTexto, { color: colores.grisVerde }]}>
              {t('misReservas.comerciosVisitados', { n: comerciosVisitados })}
            </Text>
          </View>
        </View>
      </View>

      {saldoPuntos !== null ? (
        <Pressable
          onPress={() => navigation.navigate('MisPuntos')}
          accessibilityRole="link"
          style={({ pressed }) => [estilos.puntosLinea, pressed && presionado]}
        >
          <Text style={[estilos.detalle, { color: colores.grisVerde }]}>{t('misReservas.tenesPuntos', { n: saldoPuntos })}</Text>
          <Text style={[estilos.detalle, { color: colores.verdeTexto, fontFamily: fuentes.semi }]}>
            {' · '}
            {t('perfil.verMerch')}
          </Text>
        </Pressable>
      ) : null}

      <MensajeError mensaje={error} alReintentar={cargar} />

      <Pestanas
        opciones={[
          ['pendientes', t('misReservas.tabParaRetirar', { n: pendientes.length })],
          ['historial', t('misReservas.historial')],
        ]}
        activa={pestana}
        alCambiar={setPestana}
      />

      {!enPendientes && comerciosDeNuevo.length ? (
        <VolverAPedir
          comercios={comerciosDeNuevo}
          alTocar={(c) => navigation.navigate('Catalogo', { comercio: c.id, nombre: c.nombre, t: Date.now() })}
        />
      ) : null}
    </View>
  );

  return (
    <>
      <FlatList
        key={pestana}
        style={{ backgroundColor: colores.fondo }}
        contentContainerStyle={estilos.contenido}
        data={enPendientes ? resto : datos}
        keyExtractor={(item) => (item.tipo === 'mes' ? item.clave : String(item.reserva ? item.reserva.id : item.id))}
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
          <>
            {cabecera}
            {enPendientes && destacada ? (
              <DestacadaHoy
                reserva={destacada}
                cierre={horaCierre(destacada.horario)}
                imagen={imagenDe(destacada)}
                alVerQR={() => setQrDe(destacada)}
                alComoLlegar={() => abrirMapa(destacada.direccion)}
                alCancelar={() => cancelar(destacada)}
                cancelando={cancelando === destacada.id}
              />
            ) : null}
          </>
        }
        ListEmptyComponent={
          error ? null : enPendientes ? (
            <EstadoVacio texto={t('misReservas.vacioPendientesTitulo')}>
              <Text style={[estilos.tip, { color: colores.gris }]}>{t('misReservas.tipVacio')}</Text>
              <Boton
                texto={t('misReservas.buscarOfertas')}
                onPress={() => navigation.navigate('Catalogo')}
                estilo={estilos.botonVacio}
              />
              {ofertas.length ? (
                <View style={{ alignSelf: 'stretch' }}>
                  <CercaTuyo
                    ofertas={ofertas.slice(0, 3)}
                    alTocar={(p) => navigation.navigate('DetalleProducto', { id: p.id })}
                  />
                </View>
              ) : null}
            </EstadoVacio>
          ) : (
            <EstadoVacio texto={t('misReservas.vacioHistorialTitulo')}>
              <Boton
                texto={t('misReservas.buscarOfertas')}
                onPress={() => navigation.navigate('Catalogo')}
                estilo={estilos.botonVacio}
              />
            </EstadoVacio>
          )
        }
        renderItem={({ item }) => {
          if (enPendientes) {
            return (
              <TarjetaPendiente
                reserva={item}
                cierre={horaCierre(item.horario)}
                imagen={imagenDe(item)}
                alVerQR={() => setQrDe(item)}
                alComoLlegar={() => abrirMapa(item.direccion)}
                alCancelar={() => cancelar(item)}
                cancelando={cancelando === item.id}
              />
            );
          }
          if (item.tipo === 'mes') {
            return <Text style={[estilos.mes, { color: colores.gris }]}>{item.titulo}</Text>;
          }
          return <FilaHistorial reserva={item.reserva} imagen={imagenDe(item.reserva)} alCalificar={setCalificando} />;
        }}
        ItemSeparatorComponent={() => (enPendientes ? null : <View style={[estilos.separador, { backgroundColor: colores.borde }]} />)}
      />
      <ModalQR reserva={qrDe} alCerrar={() => setQrDe(null)} />
      <HojaOpinion reserva={calificando} alCerrar={() => setCalificando(null)} alEnviar={enviarOpinion} />
    </>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(4),
    flexGrow: 1,
  },
  cabecera: {
    gap: espacio(2),
    marginBottom: espacio(2),
  },
  bloque: {
    gap: espacio(0.5),
  },
  filaHorizontal: {
    gap: espacio(1.5),
    paddingRight: espacio(2),
  },
  // ---- Tu impacto ----
  impacto: {
    padding: espacio(2.25),
    gap: espacio(1.25),
    borderRadius: 20,
  },
  impactoTitulo: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  impactoFila: {
    flexDirection: 'row',
    gap: espacio(2),
  },
  impactoDato: {
    flex: 1,
    gap: 2,
  },
  impactoNumero: {
    fontFamily: fuentes.marca,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  impactoTexto: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  puntosLinea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: espacio(0.5),
  },
  // ---- Comunes ----
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  datos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  foto: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  producto: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  mini: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini + 1,
  },
  mes: {
    fontFamily: fuentes.media,
    fontSize: 12,
    marginTop: espacio(2),
    marginBottom: espacio(0.5),
  },
  tip: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    textAlign: 'center',
  },
  botonVacio: {
    marginTop: espacio(1),
  },
  // ---- Destacada (vence hoy) ----
  destacada: {
    padding: 20,
    gap: espacio(1.5),
    borderRadius: 22,
    marginBottom: espacio(1),
  },
  etiquetaDestacada: {
    fontFamily: fuentes.media,
    fontSize: 12,
  },
  pastillaCodigo: {
    alignItems: 'center',
    paddingVertical: espacio(1.5),
    borderRadius: 16,
  },
  botones: {
    flexDirection: 'row',
    gap: espacio(1),
  },
  botonCrema: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  botonBorde: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  textoBoton: {
    fontFamily: fuentes.semi,
    fontSize: 13,
  },
  cancelarDestacada: {
    alignSelf: 'center',
    minHeight: 28,
    justifyContent: 'center',
  },
  // ---- Para retirar (tarjeta blanca) ----
  tarjeta: {
    padding: 16,
    gap: espacio(1.25),
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: espacio(1.5),
  },
  cuenta: {
    fontFamily: fuentes.semi,
    fontSize: 12,
    alignSelf: 'flex-start',
  },
  botonesFila: {
    flexDirection: 'row',
    gap: espacio(1),
  },
  botonFila: {
    flex: 1,
    paddingHorizontal: espacio(1),
  },
  cancelar: {
    alignSelf: 'center',
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: espacio(1),
  },
  textoCancelar: {
    fontFamily: fuentes.media,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  codigo: {
    fontFamily: fuentes.marca,
    fontSize: 26,
    letterSpacing: 6,
  },
  // ---- Historial ----
  filaHistorial: {
    gap: espacio(1),
    paddingVertical: espacio(0.5),
  },
  textoFila: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  puntito: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  derecha: {
    alignItems: 'flex-end',
    gap: 6,
  },
  puntosSumados: {
    fontFamily: fuentes.semi,
    fontSize: tamanos.mini,
  },
  textoCalificar: {
    fontFamily: fuentes.semi,
    fontSize: 13,
  },
  respuesta: {
    marginLeft: 48 + espacio(1.5),
    gap: 4,
  },
  comentario: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    lineHeight: 19,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    marginVertical: espacio(0.5),
  },
  // ---- Volver a pedir / Cerca tuyo ----
  comercioTarjeta: {
    width: 128,
    padding: 10,
    gap: 6,
    borderRadius: 18,
  },
  comercioFoto: {
    width: '100%',
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comercioNombre: {
    fontFamily: fuentes.semi,
    fontSize: 13,
  },
  verOfertas: {
    fontFamily: fuentes.semi,
    fontSize: 12,
  },
  ofertaTarjeta: {
    width: 130,
    gap: 4,
  },
  ofertaFoto: {
    width: '100%',
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- Modal del QR ----
  veloCentro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio(3),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  tarjetaQR: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: espacio(1),
    paddingTop: espacio(5),
    paddingBottom: espacio(3),
    paddingHorizontal: espacio(2.5),
    borderRadius: 24,
  },
  cerrarQR: {
    position: 'absolute',
    top: espacio(1.5),
    right: espacio(1.5),
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- Hoja de calificar ----
  form: {
    gap: espacio(1.75),
  },
  filaEstrellas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  campoComentario: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
});
