// Ayuda: chat con Lü, el asistente de soporte de Lüp (el mismo del widget de la web).
// Se abre desde el botón "Ayuda" de la barra de Inicio (el mismo del chat de la web) y desde Perfil,
// con sesión o como invitado:  navigation.navigate('Ayuda', { desde: 'Inicio' })
//   POST /api/soporte/mensaje/  {texto, conversacion, pagina, invitado}  → {conversacion, respuesta, con_ia}
//   POST /api/soporte/persona/  {email, detalle, conversacion, ...}      → {respuesta}  ("Hablar con una persona")
// Sin sesión, Django devuelve una clave de invitado ("invitado") que se guarda en el celular:
// con ella se sigue la misma charla y se cuentan los mensajes por hora (como la cookie de la web).
// La charla queda en memoria mientras la app está abierta (una por cuenta y otra para el invitado).
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import Chip from '../componentes/Chip';
import Icono from '../componentes/Icono';
import { useSesion } from '../contexto/Sesion';
import { t as traducir, useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';

const MAX_CARACTERES = 800; // igual que Django (soporte/views.py)
const ESPERA_IA = 40000; // la IA puede tardar hasta 25 s en Django: se le da margen
const WHATSAPP = 'https://wa.me/5493547620629';

// ---- Clave de invitado (se guarda en el celular) ----
const CLAVE_INVITADO = 'lup_soporte_invitado';
let claveInvitado = null;

async function leerClaveInvitado() {
  if (claveInvitado === null) claveInvitado = (await SecureStore.getItemAsync(CLAVE_INVITADO).catch(() => null)) || '';
  return claveInvitado || undefined;
}

function guardarClaveInvitado(clave) {
  if (!clave || clave === claveInvitado) return;
  claveInvitado = clave;
  SecureStore.setItemAsync(CLAVE_INVITADO, clave).catch(() => {});
}

// ---- Charlas en memoria: al volver a abrir la ayuda sigue la misma ----
const charlas = new Map();
let siguienteId = 1;
const nuevoMensaje = (rol, texto) => ({ id: String(siguienteId++), rol, texto });

// Mismas sugerencias que el widget de la web (templates/includes/_chat_soporte.html)
function sugerencias(rol) {
  const porRol = {
    comercio: ['ayuda.confirmoRetiro', 'ayuda.marcoVendido'],
    organizacion: ['ayuda.pidoDonacion'],
  }[rol] || ['ayuda.canceloReserva', 'ayuda.miCodigo'];
  return [...porRol, 'ayuda.noLleganEmails', 'ayuda.noFuncionaUbicacion'].map((clave) => traducir(clave));
}

// El saludo se arma al dibujarlo (rol "saludo"), así cambia si se cambia el idioma
function saludo(usuario) {
  const nombre = usuario?.nombre?.split(' ')[0];
  return `${nombre ? traducir('ayuda.holaNombre', { nombre }) : traducir('ayuda.hola')} ${traducir('ayuda.contame')}`;
}

// Lü marca los botones con **negrita**: se muestran en negrita (sin los asteriscos)
function TextoConNegritas({ texto, estilo }) {
  const partes = texto.split(/\*\*(.+?)\*\*/g);
  return (
    <Text style={estilo}>
      {partes.map((parte, i) =>
        i % 2 ? (
          <Text key={i} style={{ fontFamily: fuentes.negrita }}>
            {parte}
          </Text>
        ) : (
          parte
        )
      )}
    </Text>
  );
}

function Burbuja({ mensaje, usuario }) {
  const { colores } = useTema();
  const { t } = useIdioma();

  if (mensaje.rol === 'aviso') {
    return (
      <View style={estilos.aviso} accessibilityLiveRegion="polite">
        <Icono nombre="alert-circle-outline" tamano={16} color={colores.error} />
        <Text style={[estilos.textoAviso, { color: colores.error }]}>{mensaje.texto}</Text>
      </View>
    );
  }

  const mio = mensaje.rol === 'usuario';
  const texto = mensaje.rol === 'saludo' ? saludo(usuario) : mensaje.texto;
  return (
    <View
      accessible
      accessibilityLabel={`${mio ? t('ayuda.vos') : 'Lü'}: ${texto.replace(/\*\*/g, '')}`}
      style={[
        estilos.burbuja,
        mio
          ? [estilos.burbujaMia, { backgroundColor: colores.verdeProfundo }]
          : [estilos.burbujaLu, { backgroundColor: colores.campo }],
      ]}
    >
      <TextoConNegritas
        texto={texto}
        estilo={[estilos.textoBurbuja, { color: mio ? colores.sobreVerdeProfundo : colores.texto }]}
      />
    </View>
  );
}

function Escribiendo() {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={[estilos.burbuja, estilos.burbujaLu, estilos.escribiendo, { backgroundColor: colores.campo }]}>
      <ActivityIndicator size="small" color={colores.verde} />
      <Text style={[estilos.textoEscribiendo, { color: colores.gris }]}>{t('ayuda.escribiendo')}</Text>
    </View>
  );
}

// "Hablar con una persona": le pasa la charla al equipo, que responde por email
function PanelPersona({ usuario, enviando, error, alEnviar, alCancelar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const [email, setEmail] = useState(usuario?.email || '');
  const [detalle, setDetalle] = useState('');

  return (
    <View style={[estilos.panelPersona, { backgroundColor: colores.superficie, borderColor: colores.borde }, sombra(colores, 2)]}>
      <Text style={[estilos.tituloPersona, { color: colores.titulo }]}>{t('ayuda.hablarConPersona')}</Text>
      <Text style={[estilos.textoPersona, { color: colores.gris }]}>
        {t('ayuda.leMandamos')}
      </Text>
      <Campo
        placeholder={usuario ? t('ayuda.tuEmailCuenta') : t('ayuda.tuEmail')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        maxLength={254}
      />
      <Campo
        placeholder={t('ayuda.agregarAlgo')}
        value={detalle}
        onChangeText={setDetalle}
        multiline
        maxLength={MAX_CARACTERES}
        estiloInput={{ minHeight: 48, maxHeight: 96 }}
        error={error}
      />
      <View style={estilos.botonesPersona}>
        <Pressable onPress={() => Linking.openURL(WHATSAPP).catch(() => {})} hitSlop={8} accessibilityRole="link" style={estilos.whatsapp}>
          <Icono nombre="logo-whatsapp" tamano={16} color={colores.verdeHover} />
          <Text style={[estilos.textoWhatsapp, { color: colores.verdeHover }]}>{t('ayuda.urgente')}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Boton texto={t('comun.cancelar')} variante="texto" chico onPress={alCancelar} deshabilitado={enviando} />
        <Boton texto={t('ayuda.enviarAlEquipo')} chico cargando={enviando} onPress={() => alEnviar(email.trim(), detalle.trim())} />
      </View>
    </View>
  );
}

export default function Ayuda({ navigation, route }) {
  const { colores } = useTema();
  const { t, idioma } = useIdioma();
  const { usuario } = useSesion();
  const { top, bottom } = useSafeAreaInsets();
  const desde = route?.params?.desde || '';

  const claveCharla = usuario ? `usuario-${usuario.id}` : 'invitado';
  const guardada = charlas.get(claveCharla);
  const [mensajes, setMensajes] = useState(guardada?.mensajes || [nuevoMensaje('saludo', '')]);
  const [conversacion, setConversacion] = useState(guardada?.conversacion || null);
  const [conIa, setConIa] = useState(guardada?.conIa ?? null); // null = todavía no se sabe

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verPersona, setVerPersona] = useState(false);
  const [derivando, setDerivando] = useState(false);
  const [errorPersona, setErrorPersona] = useState('');
  const lista = useRef(null);

  useEffect(() => {
    charlas.set(claveCharla, { mensajes, conversacion, conIa });
  }, [claveCharla, mensajes, conversacion, conIa]);

  const agregar = (rol, contenido) => setMensajes((anteriores) => [...anteriores, nuevoMensaje(rol, contenido)]);

  // Lo que se manda siempre: la charla, desde qué pantalla y (si es invitado) su clave
  async function datosBase() {
    return {
      conversacion,
      pagina: desde,
      // 'es' o 'en': para que Lü conteste en el idioma de la app. OJO: Django todavía no lo lee
      // (soporte/asistente.py usa el idioma activo y scr/lup/idioma.py fija español en /api/).
      idioma,
      ...(usuario ? {} : { invitado: await leerClaveInvitado() }),
    };
  }

  async function enviar(contenido) {
    const limpio = contenido.trim().slice(0, MAX_CARACTERES);
    if (!limpio || enviando) return;
    setTexto('');
    agregar('usuario', limpio);
    setEnviando(true);
    try {
      const r = await api('/soporte/mensaje/', {
        metodo: 'POST',
        datos: { ...(await datosBase()), texto: limpio },
        espera: ESPERA_IA,
      });
      guardarClaveInvitado(r.invitado);
      setConversacion(r.conversacion);
      setConIa(r.con_ia);
      agregar('asistente', r.respuesta);
    } catch (e) {
      agregar('aviso', textoError(e) || t('ayuda.noSeMando'));
      setTexto((actual) => actual || limpio); // para reintentar sin volver a escribir
    } finally {
      setEnviando(false);
    }
  }

  async function derivar(email, detalle) {
    setErrorPersona('');
    setDerivando(true);
    try {
      const r = await api('/soporte/persona/', {
        metodo: 'POST',
        datos: { ...(await datosBase()), email, detalle },
      });
      guardarClaveInvitado(r.invitado);
      if (r.conversacion) setConversacion(r.conversacion);
      if (detalle) agregar('usuario', detalle);
      agregar('asistente', r.respuesta);
      setVerPersona(false);
    } catch (e) {
      setErrorPersona(textoError(e) || t('ayuda.noSeAviso'));
    } finally {
      setDerivando(false);
    }
  }

  function empezarDeNuevo() {
    Alert.alert(t('ayuda.empezarDeNuevoPregunta'), t('ayuda.seBorra'), [
      { text: t('comun.cancelar'), style: 'cancel' },
      {
        text: t('ayuda.empezarDeNuevo'),
        onPress: () => {
          setMensajes([nuevoMensaje('saludo', '')]);
          setConversacion(null);
          setVerPersona(false);
          setTexto('');
        },
      },
    ]);
  }

  const soloSaludo = mensajes.length === 1;
  const subtitulo =
    conIa === true ? t('ayuda.conIa') : conIa === false ? t('ayuda.automaticas') : t('ayuda.asistente');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Cabecera: volver, Lü, y empezar de nuevo */}
      <View style={[estilos.cabecera, { paddingTop: top + espacio(1), borderColor: colores.borde }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('comun.volver')}
          style={[estilos.botonRedondo, { backgroundColor: colores.panel }]}
        >
          <Icono nombre="chevron-back" tamano={22} color={colores.texto} />
        </Pressable>
        <View style={[estilos.avatar, { backgroundColor: colores.verdeProfundo }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={[estilos.textoAvatar, { color: colores.sobreVerdeProfundo }]}>Lü</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
            {t('ayuda.titulo')}
          </Text>
          <View style={estilos.filaSubtitulo}>
            {conIa ? <View style={[estilos.punto, { backgroundColor: colores.verde }]} /> : null}
            <Text style={[estilos.subtitulo, { color: colores.gris }]} numberOfLines={1}>
              {subtitulo}
            </Text>
          </View>
        </View>
        {!soloSaludo ? (
          <Pressable
            onPress={empezarDeNuevo}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('ayuda.empezarDeNuevo')}
            style={[estilos.botonRedondo, { backgroundColor: colores.panel }]}
          >
            <Icono nombre="refresh-outline" tamano={20} color={colores.texto} />
          </Pressable>
        ) : null}
      </View>

      {/* La charla */}
      <FlatList
        ref={lista}
        data={mensajes}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Burbuja mensaje={item} usuario={usuario} />}
        extraData={idioma} // el saludo cambia con el idioma
        contentContainerStyle={estilos.mensajes}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          enviando ? (
            <Escribiendo />
          ) : soloSaludo ? (
            <View style={estilos.sugerencias}>
              {sugerencias(usuario?.rol).map((s) => (
                <Chip key={s} texto={s} onPress={() => enviar(s)} />
              ))}
            </View>
          ) : null
        }
      />

      {verPersona ? (
        <PanelPersona
          usuario={usuario}
          enviando={derivando}
          error={errorPersona}
          alEnviar={derivar}
          alCancelar={() => {
            setVerPersona(false);
            setErrorPersona('');
          }}
        />
      ) : null}

      {/* Abajo: "Hablar con una persona" y el campo para escribir */}
      <View style={[estilos.abajo, { paddingBottom: Math.max(bottom, espacio(1)) }]}>
        {!verPersona ? (
          <Pressable
            onPress={() => setVerPersona(true)}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.persona, { borderColor: colores.verdeProfundo }, pressed && { opacity: 0.7 }]}
          >
            <Icono nombre="person-outline" tamano={15} color={colores.verdeHover} />
            <Text style={[estilos.textoPersonaBoton, { color: colores.verdeHover }]}>{t('ayuda.hablarConPersona')}</Text>
          </Pressable>
        ) : null}
        <View style={estilos.filaEscribir}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder={t('ayuda.escribiConsulta')}
            placeholderTextColor={colores.gris}
            accessibilityLabel={t('ayuda.escribiConsultaAccesible')}
            multiline
            maxLength={MAX_CARACTERES}
            style={[estilos.input, { backgroundColor: colores.campo, borderColor: colores.borde, color: colores.texto }]}
          />
          <Pressable
            onPress={() => enviar(texto)}
            disabled={!texto.trim() || enviando}
            accessibilityRole="button"
            accessibilityLabel={t('comun.enviar')}
            accessibilityState={{ disabled: !texto.trim() || enviando }}
            style={({ pressed }) => [
              estilos.enviar,
              { backgroundColor: colores.verdeProfundo },
              (!texto.trim() || enviando) && { opacity: 0.4 },
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
          >
            <Icono nombre="arrow-up" tamano={22} color={colores.sobreVerdeProfundo} />
          </Pressable>
        </View>
        <Text style={[estilos.nota, { color: colores.gris }]}>
          {conIa ? t('ayuda.notaIa') : ''}
          {t('ayuda.notaDatos')}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.25),
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(1.25),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  botonRedondo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAvatar: {
    fontFamily: fuentes.marca,
    fontSize: tamanos.normal,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  filaSubtitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  punto: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subtitulo: {
    flexShrink: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico - 1,
  },
  mensajes: {
    padding: espacio(2),
    gap: espacio(1),
  },
  burbuja: {
    maxWidth: '84%',
    paddingHorizontal: espacio(1.75),
    paddingVertical: espacio(1.25),
    borderRadius: 20,
  },
  burbujaLu: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  burbujaMia: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  textoBurbuja: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    lineHeight: 21,
  },
  escribiendo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    marginTop: espacio(1),
  },
  textoEscribiendo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    maxWidth: '90%',
    paddingVertical: espacio(0.5),
  },
  textoAviso: {
    flexShrink: 1,
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  sugerencias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio(1),
    marginTop: espacio(1),
  },
  panelPersona: {
    marginHorizontal: espacio(2),
    marginBottom: espacio(1),
    padding: espacio(2),
    gap: espacio(1),
    borderRadius: radio,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tituloPersona: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  textoPersona: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    marginBottom: espacio(0.5),
  },
  botonesPersona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(0.5),
    marginTop: espacio(0.5),
  },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoWhatsapp: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  abajo: {
    paddingHorizontal: espacio(2),
    paddingTop: espacio(1),
    gap: espacio(1),
  },
  persona: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espacio(1.5),
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  textoPersonaBoton: {
    fontFamily: fuentes.botonMedio,
    fontSize: 12,
  },
  filaEscribir: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espacio(1),
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 23,
    paddingHorizontal: espacio(2),
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  enviar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nota: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
    textAlign: 'center',
  },
});
