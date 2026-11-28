// PASO 49 · Perfil y soporte.
// Con sesión: los datos del usuario (GET /api/auth/yo/) con "Editar mis datos" (EditarPerfil) y
// "Cambiar contraseña" (CambiarClave), los de su comercio u organización (EditarComercio / EditarOrganizacion),
// el soporte ("Chatear con Lü" → pantalla Ayuda, y WhatsApp / teléfono / Instagram) y "Cerrar sesión".
// Sin sesión: "Sumate a Lüp" con el logo, tres beneficios, "Crear cuenta gratis" e "Iniciar sesión".
// Con el estilo de Inicio: la tarjeta verde arriba con la foto montada sobre su borde (el engranaje de
// Configuración arriba a la derecha), las cifras de "Tu impacto" en tarjetitas, Puntos Lüp con el próximo premio,
// las listas en tarjetas blancas y el soporte en una tarjeta menta con 3 botones redondos.
// "Tu impacto": consumidor → comidas rescatadas, comercios y calificaciones (de /api/mis-reservas/);
//               organización → donaciones pedidas y recibidas (de /api/mis-solicitudes-donacion/).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import FotoMerch, { PROPORCION_MERCH } from '../componentes/FotoMerch';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import Logo from '../componentes/Logo';
import TarjetaVerde from '../componentes/TarjetaVerde';
import TituloSeccion from '../componentes/TituloSeccion';
import { claveBienvenida, useBienvenida } from '../contexto/Bienvenida';
import { t as traducir, textoDesdeEspanol, useIdioma } from '../contexto/Idioma';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { formatoPrecio, PESOS_POR_PUNTO } from '../utilidades';

// Mismos datos que el pie de página de la web (scr/templates/base.html)
const SOPORTE = {
  whatsapp: 'https://wa.me/5493547620629',
  telefono: 'tel:+5493547620629',
  telefonoTexto: '+54 9 3547 62-0629',
  instagram: 'https://www.instagram.com/lupcomidas/',
};

const ROLES = {
  consumidor: { titulo: 'tiposCuenta.consumidor', icono: 'bag-handle' },
  comercio: { titulo: 'tiposCuenta.comercio', icono: 'storefront' },
  organizacion: { titulo: 'tiposCuenta.organizacion', icono: 'heart' },
};

const TAMANO_AVATAR = 104; // la foto de 96 con el aro de 4

const presionado = { transform: [{ scale: 0.97 }] };

function abrir(url) {
  Linking.openURL(url).catch(() => Alert.alert(traducir('comun.noSePudoAbrir'), traducir('comun.noSePudoAbrirTexto')));
}

// Grupo de filas: un título verde arriba y las filas separadas por líneas finitas, sin caja.
// Todas las filas llevan una línea abajo; el margen negativo esconde la de la última.
function Grupo({ titulo, children }) {
  return (
    <View>
      <TituloSeccion texto={titulo} estilo={estilos.tituloGrupo} />
      <View style={estilos.grupo}>
        <View style={{ marginBottom: -StyleSheet.hairlineWidth }}>{children}</View>
      </View>
    </View>
  );
}

// Una fila con un dato (no se muestra si el valor está vacío). No se toca, así que no lleva flecha.
function Dato({ valor }) {
  const { colores } = useTema();
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <View style={[estilos.fila, { borderColor: colores.borde }]}>
      <Text style={[estilos.valor, { color: colores.texto }]} numberOfLines={2}>
        {valor}
      </Text>
    </View>
  );
}

// Fila que se toca (con flecha) para abrir una pantalla: "Cambiar contraseña", "Editar datos del comercio"
function FilaAccion({ texto, alTocar }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={({ pressed }) => [estilos.fila, { borderColor: colores.borde }, pressed && presionado]}
    >
      <Text style={[estilos.valor, { color: colores.texto, fontFamily: fuentes.media }]}>{texto}</Text>
      <Icono nombre="chevron-forward" tamano={16} color={colores.grisVerde} />
    </Pressable>
  );
}

// Engranaje de arriba a la derecha: abre Configuración ("sobreMarca": para ir encima de un bloque verde)
function BotonConfiguracion({ navigation, sobreMarca, colorIcono, estilo }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={[estilos.barraArriba, estilo]}>
      <Pressable
        onPress={() => navigation?.navigate?.('Configuracion')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('configuracion.abrir')}
        style={({ pressed }) => [
          estilos.botonBarra,
          { backgroundColor: sobreMarca ? 'rgba(255, 255, 255, 0.14)' : colores.panel },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icono
          nombre="settings-outline"
          tamano={20}
          color={colorIcono || (sobreMarca ? colores.sobreMarca : colores.texto)}
        />
      </Pressable>
    </View>
  );
}

// Hojas del logo, muy suaves, de decoración en las esquinas del bloque verde del invitado
function Hojas({ grande = 120 }) {
  const { colores } = useTema();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icono
        nombre="leaf"
        tamano={grande}
        color={colores.sobreMarcaSuave}
        estilo={[estilos.hoja, { top: -grande * 0.25, right: -grande * 0.2, transform: [{ rotate: '35deg' }] }]}
      />
      <Icono
        nombre="leaf"
        tamano={grande * 0.6}
        color={colores.sobreMarcaSuave}
        estilo={[estilos.hoja, { bottom: -grande * 0.1, left: -grande * 0.12, transform: [{ rotate: '-130deg' }] }]}
      />
    </View>
  );
}

// Tarjeta de un beneficio (Perfil de invitado): ícono en un círculo, título y una línea
function TarjetaBeneficio({ icono, titulo, texto, children }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.tarjetaBeneficio, { backgroundColor: colores.superficie }]}>
      <View style={estilos.filaBeneficio}>
        <View style={[estilos.circuloBeneficio, { backgroundColor: colores.suaves.verde.fondo }]}>
          <Icono nombre={icono} tamano={21} color={colores.suaves.verde.icono} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.tituloBeneficio, { color: colores.titulo }]}>{titulo}</Text>
          <Text style={[estilos.textoBeneficio, { color: colores.gris }]}>{texto}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

// Arriba: la tarjeta verde con el nombre y el rol, el engranaje encima y la foto montada sobre el borde de abajo
function Cabecera({ datos, navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const rol = ROLES[datos?.rol] || ROLES.consumidor;
  const foto = urlCompleta(datos?.foto);
  return (
    <View>
      <TarjetaVerde
        titulo={datos?.nombre || datos?.username || ''}
        estilo={estilos.cabeceraVerde}
        estiloTitulo={estilos.nombre}
      >
        <View style={estilos.rol}>
          <Text style={[estilos.textoRol, { color: colores.crema }]}>{t(rol.titulo)}</Text>
        </View>
      </TarjetaVerde>
      <BotonConfiguracion navigation={navigation} sobreMarca colorIcono={colores.crema} estilo={estilos.engranaje} />
      <View style={estilos.zonaAvatar}>
        {/* El aro es del color del fondo: en claro, blanco */}
        <View style={[estilos.avatar, { backgroundColor: colores.menta, borderColor: colores.fondo }]}>
          {foto ? (
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} accessibilityLabel={t('perfil.tuFoto')} />
          ) : (
            <Icono nombre={rol.icono} tamano={38} color={colores.verdeHover} />
          )}
        </View>
      </View>
    </View>
  );
}

// "Tu impacto": una frase y las cifras como texto (el número en verde y la palabra abajo), sin cajas ni íconos
function Impacto({ datos }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View>
      <TituloSeccion texto={t('perfil.tuImpacto')} estilo={estilos.tituloGrupo} />
      <Text style={[estilos.gracias, { color: colores.grisVerde }]}>{t('perfil.graciasImpacto')}</Text>
      <View style={estilos.cifras}>
        {datos.map((d) => (
          <View key={d.texto} style={estilos.cifra} accessible accessibilityLabel={`${d.valor} ${t(d.texto)}`}>
            <Text style={[estilos.numeroCifra, { color: colores.verdeProfundo }]}>{d.valor}</Text>
            <Text style={[estilos.textoCifra, { color: colores.grisVerde }]} numberOfLines={1}>
              {t(d.texto)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Consumidor: el saldo, cuánto falta para el próximo premio del merch (con su foto) y "Ver merch"
function TarjetaPuntos({ saldo, merch, alVerMerch }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const suave = colores.suaves.verde; // #B6D1A1 con texto verde oscuro en claro; verde oscuro con texto claro en oscuro
  const cargado = saldo !== null && saldo !== undefined;
  const ordenado = [...merch].sort((a, b) => a.puntos - b.puntos);
  const proximo = cargado ? ordenado.find((m) => m.puntos > saldo) : null;
  // Si ya le alcanza para todos, se muestra el más caro
  const premio = cargado ? proximo || ordenado[ordenado.length - 1] : null;
  const progreso = proximo ? saldo / proximo.puntos : 1;
  const textoPremio = proximo
    ? t('perfil.faltanPuntos', { n: proximo.puntos - saldo, nombre: proximo.nombre })
    : t('perfil.todosLosPremios');

  return (
    <View style={[estilos.tarjetaPuntos, { backgroundColor: suave.fondo }]}>
      <View style={estilos.datosPuntos}>
        <View
          accessible
          accessibilityLabel={cargado ? `${t('perfil.puntosLup')}: ${t('puntos.saldoAccesible', { n: saldo })}` : t('perfil.puntosLup')}
        >
          <Text style={[estilos.etiquetaPuntos, { color: suave.icono }]}>{t('perfil.puntosLup')}</Text>
          <Text style={[estilos.saldoPuntos, { color: suave.icono }]} numberOfLines={1} adjustsFontSizeToFit>
            {cargado ? saldo : '-'}
            {cargado ? <Text style={estilos.unidadPuntos}> {t('puntos.unidad', { n: saldo })}</Text> : null}
          </Text>
        </View>

        {premio ? (
          <View style={{ gap: 4 }}>
            <View
              style={[estilos.barraPuntos, { backgroundColor: colores.fondo }]}
              accessibilityRole="progressbar"
              accessibilityLabel={textoPremio}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progreso * 100) }}
            >
              <View style={[estilos.rellenoPuntos, { backgroundColor: suave.icono, width: `${Math.round(progreso * 100)}%` }]} />
            </View>
            <Text style={[estilos.textoPremio, { color: suave.icono }]} importantForAccessibility="no" accessibilityElementsHidden>
              {textoPremio}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={alVerMerch}
          accessibilityRole="button"
          accessibilityLabel={t('perfil.verMerch')}
          style={({ pressed }) => [estilos.botonPuntos, { backgroundColor: colores.verdeProfundo }, pressed && presionado]}
        >
          <Text style={[estilos.textoBotonPuntos, { color: colores.sobreVerdeProfundo }]}>{t('perfil.verMerch')}</Text>
        </Pressable>
      </View>

      {premio ? (
        <FotoMerch key={premio.id} producto={premio} proporcion={PROPORCION_MERCH} estilo={estilos.fotoPremio} />
      ) : null}
    </View>
  );
}

// Soporte: el chat con Lü (pantalla Ayuda) en una tarjeta menta y 3 botones redondos (WhatsApp, llamar, Instagram)
function Soporte({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const botones = [
    ['logo-whatsapp', t('perfil.whatsapp'), SOPORTE.whatsapp],
    ['call-outline', t('perfil.llamar'), SOPORTE.telefono],
    ['logo-instagram', t('perfil.instagram'), SOPORTE.instagram],
  ];
  return (
    <View>
      <TituloSeccion texto={t('perfil.necesitasAyuda')} estilo={estilos.tituloGrupo} />
      <Pressable
        onPress={() => navigation?.navigate?.('Ayuda', { desde: 'Perfil' })}
        accessibilityRole="button"
        accessibilityLabel={t('perfil.chatearAccesible')}
        style={({ pressed }) => [estilos.filaChat, { borderColor: colores.borde }, pressed && presionado]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[estilos.valor, { color: colores.texto, fontFamily: fuentes.media }]}>{t('perfil.chatear')}</Text>
          <Text style={[estilos.subtitulo, { color: colores.grisVerde }]}>{t('perfil.chatearAyuda')}</Text>
        </View>
        <Icono nombre="chevron-forward" tamano={16} color={colores.grisVerde} />
      </Pressable>
      <View style={estilos.soporte}>
        {botones.map(([icono, texto, url]) => (
          <Pressable
            key={texto}
            onPress={() => abrir(url)}
            accessibilityRole="button"
            accessibilityLabel={texto}
            style={({ pressed }) => [estilos.botonSoporte, pressed && presionado]}
          >
            <View style={[estilos.circuloSoporte, { backgroundColor: colores.menta }]}>
              <Icono nombre={icono} tamano={23} color={colores.verdeProfundo} />
            </View>
            <Text style={[estilos.textoSoporte, { color: colores.texto }]}>{texto}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Los números de "Tu impacto" según el rol ("texto" es una clave de idiomas/es.js: se muestra con t())
async function calcularImpacto(rol) {
  try {
    if (rol === 'consumidor') {
      const reservas = await api('/mis-reservas/');
      const retiradas = reservas.filter((r) => r.estado === 'retirada');
      return [
        { icono: 'fast-food-outline', valor: retiradas.reduce((total, r) => total + r.cantidad, 0), texto: 'perfil.rescatadas' },
        { icono: 'storefront-outline', valor: new Set(retiradas.map((r) => r.comercio)).size, texto: 'perfil.comercios' },
        { icono: 'star-outline', valor: retiradas.filter((r) => r.calificacion).length, texto: 'perfil.calificaste' },
      ];
    }
    if (rol === 'comercio') {
      const [productos, reservas] = await Promise.all([api('/mis-productos/'), api('/reservas-del-comercio/')]);
      const contar = (estado) => productos.filter((p) => p.estado === estado).length;
      return [
        { icono: 'storefront-outline', valor: contar('DISPONIBLE'), texto: 'perfil.enVenta' },
        { icono: 'bag-handle-outline', valor: reservas.length, texto: 'perfil.paraRetirar' },
        { icono: 'checkmark-done-outline', valor: contar('AGOTADO'), texto: 'perfil.vendidos' },
        { icono: 'heart-outline', valor: contar('DONADO'), texto: 'perfil.donados' },
      ];
    }
    if (rol === 'organizacion') {
      const solicitudes = await api('/mis-solicitudes-donacion/');
      return [
        { icono: 'paper-plane-outline', valor: solicitudes.length, texto: 'perfil.pedidas' },
        { icono: 'heart-outline', valor: solicitudes.filter((s) => s.estado === 'aprobada').length, texto: 'perfil.recibidas' },
        { icono: 'time-outline', valor: solicitudes.filter((s) => s.estado === 'pendiente').length, texto: 'perfil.esperando' },
      ];
    }
  } catch {
    // Si falla, simplemente no se muestra el recuadro
  }
  return null;
}

export default function Perfil({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario, cerrarSesion, entrarComoInvitado } = useSesion();
  const { marcarVista } = useBienvenida();

  const [datos, setDatos] = useState(usuario); // se muestra lo guardado y se actualiza con Django
  const [error, setError] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const [impacto, setImpacto] = useState(null); // los números de "Tu impacto"
  const [saldoPuntos, setSaldoPuntos] = useState(null); // Puntos Lüp (solo consumidor)
  // El merch de Puntos Lüp: el consumidor lo usa para el próximo premio; el invitado, para la lista
  const [merch, setMerch] = useState([]);

  // Invitado: se intenta traer el merch real (GET /api/puntos/). Hoy esa API es solo para consumidores con
  // sesión y responde 401: en ese caso se muestra la tarjeta de puntos sin la lista.
  useEffect(() => {
    if (usuario) return undefined;
    let activo = true;
    api('/puntos/')
      .then((r) => activo && setMerch(Array.isArray(r?.merch) ? r.merch : []))
      .catch(() => activo && setMerch([]));
    return () => {
      activo = false;
    };
  }, [usuario]);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setError('');
    // Los puntos van aparte: si fallan, el resto del Perfil se ve igual
    if (usuario.rol === 'consumidor') {
      api('/puntos/')
        .then((r) => {
          setSaldoPuntos(r.saldo);
          setMerch(Array.isArray(r?.merch) ? r.merch : []);
        })
        .catch(() => {});
    }
    try {
      setDatos(await api('/auth/yo/'));
      setImpacto(await calcularImpacto(usuario.rol));
    } catch (e) {
      setError(e);
    } finally {
      setActualizando(false);
    }
  }, [usuario]);

  useEffect(() => {
    setDatos(usuario);
    cargar();
  }, [usuario, cargar]);

  useEffect(() => navigation?.addListener?.('focus', cargar), [navigation, cargar]);

  // Antes de salir se avisa qué se borra del celular (ver cerrarSesion en contexto/Sesion.js)
  function confirmarSalida() {
    Alert.alert(
      t('perfil.cerrarSesionPregunta'),
      t('perfil.cerrarSesionTexto'),
      [
        { text: t('comun.cancelar'), style: 'cancel' },
        { text: t('perfil.cerrarYBorrar'), style: 'destructive', onPress: salir },
      ]
    );
  }

  async function salir() {
    setSaliendo(true);
    try {
      await cerrarSesion();
      marcarVista(claveBienvenida(null)); // recién salió: no hace falta mostrarle la bienvenida del invitado
      entrarComoInvitado(); // vuelve a la vista de invitado, como el botón "Omitir"
    } finally {
      setSaliendo(false);
    }
  }

  // ---- Sin sesión ----
  // Arriba el bloque verde de la marca con el logo y el lema; tres tarjetas (precio, desperdicio, puntos);
  // UN botón "Crear cuenta" y UN link "Ya tengo cuenta"; abajo, la ayuda.
  if (!usuario) {
    return (
      <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido}>
        <View style={[estilos.hero, { backgroundColor: colores.marca }]}>
          <Hojas grande={150} />
          <BotonConfiguracion navigation={navigation} sobreMarca estilo={estilos.engranajeHero} />
          <Logo ancho={104} claro />
          <Text style={[estilos.lema, { color: colores.sobreMarca }]} accessibilityRole="header">
            {t('perfil.lema')}
          </Text>
          <Text style={[estilos.lemaTexto, { color: colores.sobreMarcaSuave }]}>{t('perfil.lemaTexto')}</Text>
        </View>

        <View style={estilos.beneficios}>
          <TarjetaBeneficio icono="pricetag-outline" titulo={t('perfil.ahorroTitulo')} texto={t('perfil.ahorroTexto')} />
          <TarjetaBeneficio icono="leaf-outline" titulo={t('perfil.desperdicioTitulo')} texto={t('perfil.desperdicioTexto')} />
          <TarjetaBeneficio
            icono="star-outline"
            titulo={t('perfil.puntosLup')}
            texto={t('perfil.puntosTexto', { monto: formatoPrecio(PESOS_POR_PUNTO) })}
          >
            {merch.length ? (
              <View style={estilos.merch}>
                {merch.map((m) => (
                  <View key={m.id} style={[estilos.itemMerch, { backgroundColor: colores.fondo }]}>
                    <Text style={[estilos.textoMerch, { color: colores.texto }]} numberOfLines={1}>
                      {m.nombre}
                    </Text>
                    <Text style={[estilos.ptsMerch, { color: colores.verdeHover }]}>{t('puntos.pts', { n: m.puntos })}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </TarjetaBeneficio>
        </View>

        <View style={estilos.acciones}>
          <Boton texto={t('perfil.crearCuenta')} onPress={() => navigation.navigate('Registro')} />
          <Text
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="link"
            style={[estilos.yaTengoCuenta, { color: colores.verdeHover }]}
          >
            {t('perfil.yaTengoCuenta')}
          </Text>
        </View>

        <Soporte navigation={navigation} />
      </ScrollView>
    );
  }

  // ---- Con sesión ----
  const comercio = datos?.comercio;
  const organizacion = datos?.organizacion;
  const rojoSuave = colores.suaves.durazno.icono;

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
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
    >
      <Cabecera datos={datos} navigation={navigation} />

      {/* Puntos Lüp destacado, arriba de todo lo demás */}
      {datos?.rol === 'consumidor' ? (
        <TarjetaPuntos saldo={saldoPuntos} merch={merch} alVerMerch={() => navigation.navigate('MisPuntos')} />
      ) : null}

      <MensajeError mensaje={error} alReintentar={cargar} />

      {impacto ? <Impacto datos={impacto} /> : null}

      <Grupo titulo={t('perfil.tuCuenta')}>
        <Dato valor={datos?.username && `@${datos.username}`} />
        <Dato valor={datos?.email} />
        <Dato valor={datos?.telefono} />
        <Dato valor={datos?.ciudad} />
        <Dato valor={datos?.avisos_email === false ? t('perfil.avisosApagados') : t('perfil.avisosActivados')} />
        <FilaAccion texto={t('perfil.editarMisDatos')} alTocar={() => navigation.navigate('EditarPerfil')} />
        <FilaAccion texto={t('perfil.cambiarClave')} alTocar={() => navigation.navigate('CambiarClave')} />
        <FilaAccion texto={t('configuracion.titulo')} alTocar={() => navigation.navigate('Configuracion')} />
      </Grupo>

      {comercio ? (
        <Grupo titulo={t('perfil.tuComercio')}>
          <Dato valor={comercio.nombre} />
          <Dato valor={textoDesdeEspanol(t, 'rubros', comercio.rubro)} />
          <Dato valor={comercio.direccion} />
          <Dato valor={comercio.horario} />
          <Dato valor={comercio.cuit && `CUIT ${comercio.cuit}`} />
          <FilaAccion texto={t('perfil.editarComercio')} alTocar={() => navigation.navigate('EditarComercio')} />
        </Grupo>
      ) : null}

      {organizacion ? (
        <Grupo titulo={t('perfil.tuOrganizacion')}>
          <Dato valor={organizacion.nombre} />
          <Dato valor={textoDesdeEspanol(t, 'tiposOrganizacion', organizacion.tipo)} />
          <Dato valor={organizacion.direccion} />
          <Dato
            valor={organizacion.personas_asistidas ? t('perfil.personasPorSemana', { n: organizacion.personas_asistidas }) : null}
          />
          <Dato valor={organizacion.cuit && `CUIT ${organizacion.cuit}`} />
          <FilaAccion texto={t('perfil.editarOrganizacion')} alTocar={() => navigation.navigate('EditarOrganizacion')} />
        </Grupo>
      ) : null}

      <Soporte navigation={navigation} />

      <View style={estilos.final}>
        <Boton
          texto={t('perfil.verBienvenida')}
          variante="texto"
          chico
          onPress={() => navigation.navigate('VerBienvenida', { rol: usuario?.rol || 'consumidor' })}
        />
        <Pressable
          onPress={confirmarSalida}
          disabled={saliendo}
          accessibilityRole="button"
          accessibilityLabel={t('perfil.cerrarSesion')}
          accessibilityState={{ disabled: saliendo, busy: saliendo }}
          style={({ pressed }) => [estilos.cerrarSesion, pressed && presionado]}
        >
          {saliendo ? (
            <ActivityIndicator color={rojoSuave} />
          ) : (
            <Text style={[estilos.textoCerrarSesion, { color: rojoSuave }]}>{t('perfil.cerrarSesion')}</Text>
          )}
        </Pressable>

        <View style={estilos.pie}>
          <Logo ancho={56} />
          <Text style={[estilos.textoPie, { color: colores.gris }]}>{t('perfil.lema')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(4),
    gap: espacio(2.5),
  },
  barraArriba: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: -espacio(1.5),
  },
  botonBarra: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- Cabecera con sesión ----
  // Abajo queda lugar para la mitad de la foto, que se monta sobre el borde
  cabeceraVerde: {
    alignItems: 'center',
    paddingTop: espacio(2.5),
    paddingBottom: TAMANO_AVATAR / 2 + 16,
  },
  nombre: {
    textAlign: 'center',
    paddingLeft: 44, // lugar para el engranaje, así un nombre largo no queda abajo
    paddingRight: 44,
    marginTop: 0,
  },
  engranaje: {
    position: 'absolute',
    top: 12,
    right: 12,
    marginBottom: 0,
  },
  rol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: espacio(1),
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 241, 232, 0.16)',
  },
  textoRol: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  zonaAvatar: {
    alignItems: 'center',
    marginTop: -TAMANO_AVATAR / 2,
  },
  avatar: {
    width: TAMANO_AVATAR,
    height: TAMANO_AVATAR,
    borderRadius: TAMANO_AVATAR / 2,
    borderWidth: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- Invitado ----
  hero: {
    alignItems: 'center',
    gap: espacio(1.25),
    marginHorizontal: -espacio(2),
    marginTop: -espacio(2),
    paddingTop: espacio(2),
    paddingBottom: espacio(4),
    paddingHorizontal: espacio(3),
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  engranajeHero: {
    alignSelf: 'stretch',
    marginBottom: -espacio(1),
  },
  hoja: {
    position: 'absolute',
    opacity: 0.12,
  },
  lema: {
    fontFamily: fuentes.marca,
    fontSize: tamanos.grande,
    lineHeight: 32,
    textAlign: 'center',
    marginTop: espacio(1),
  },
  lemaTexto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    lineHeight: 21,
    textAlign: 'center',
  },
  beneficios: {
    gap: espacio(1.25),
  },
  tarjetaBeneficio: {
    borderRadius: radio + 4,
    padding: espacio(2),
    gap: espacio(1.5),
  },
  filaBeneficio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  circuloBeneficio: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloBeneficio: {
    fontFamily: fuentes.marca,
    fontSize: tamanos.normal,
  },
  textoBeneficio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    lineHeight: 18,
  },
  merch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio(1),
  },
  itemMerch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: espacio(1.25),
    paddingVertical: 6,
    borderRadius: 999,
  },
  textoMerch: {
    flexShrink: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  ptsMerch: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.chico,
  },
  acciones: {
    gap: espacio(1.5),
  },
  yaTengoCuenta: {
    alignSelf: 'center',
    fontFamily: fuentes.botonMedio,
    fontSize: tamanos.normal,
    textDecorationLine: 'underline',
    paddingVertical: espacio(0.5),
  },
  // ---- Tu impacto ----
  gracias: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    marginBottom: espacio(1.5),
  },
  cifras: {
    flexDirection: 'row',
    gap: espacio(2),
  },
  cifra: {
    flex: 1,
    gap: 2,
  },
  numeroCifra: {
    fontFamily: fuentes.semi,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  textoCifra: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  // ---- Puntos Lüp ----
  tarjetaPuntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    borderRadius: 20,
    padding: espacio(2),
  },
  datosPuntos: {
    flex: 1,
    gap: espacio(1),
  },
  etiquetaPuntos: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  saldoPuntos: {
    fontFamily: fuentes.marca,
    fontSize: 34,
  },
  unidadPuntos: {
    fontFamily: fuentes.botonMedio,
    fontSize: tamanos.normal,
  },
  barraPuntos: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rellenoPuntos: {
    height: '100%',
    borderRadius: 3,
  },
  textoPremio: {
    fontFamily: fuentes.media,
    fontSize: 12,
  },
  botonPuntos: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: espacio(2),
    borderRadius: 999,
  },
  textoBotonPuntos: {
    fontFamily: fuentes.boton,
    fontSize: 13,
  },
  // 44 × 55: la proporción 4:5 de las fotos del merch, así no se corta
  fotoPremio: {
    width: 44,
    aspectRatio: PROPORCION_MERCH,
    borderRadius: 8,
  },
  // ---- Listas ----
  // Los títulos de las secciones (el "gap" de la pantalla ya deja aire arriba)
  tituloGrupo: {
    marginTop: espacio(0.5),
    marginBottom: espacio(0.5),
  },
  grupo: {
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingVertical: espacio(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  valor: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  subtitulo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  // ---- Soporte ----
  filaChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingVertical: espacio(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  soporte: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: espacio(1),
  },
  botonSoporte: {
    alignItems: 'center',
    gap: espacio(0.75),
  },
  circuloSoporte: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSoporte: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  // ---- Final ----
  final: {
    alignItems: 'center',
    gap: espacio(1),
  },
  cerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio(1),
    minHeight: 44,
    paddingHorizontal: espacio(3),
    borderRadius: 999,
  },
  textoCerrarSesion: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  pie: {
    alignItems: 'center',
    gap: 4,
    marginTop: espacio(1.5),
  },
  textoPie: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
    textAlign: 'center',
  },
});
