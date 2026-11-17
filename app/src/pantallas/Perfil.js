// PASO 49 · Perfil y soporte.
// Con sesión: los datos del usuario (GET /api/auth/yo/) con "Editar mis datos" (EditarPerfil) y
// "Cambiar contraseña" (CambiarClave), los de su comercio u organización (EditarComercio / EditarOrganizacion),
// el recuadro de soporte ("Chatear con Lü" → pantalla Ayuda, y WhatsApp / teléfono / Instagram) y "Cerrar sesión".
// Sin sesión: "Sumate a Lüp" con el logo, tres beneficios, "Crear cuenta gratis" e "Iniciar sesión".
// PROPUESTA DE ESTÉTICA: cabecera con foto, filas con íconos (menos texto) y el soporte en 3 botones redondos.
// Arriba a la derecha, el engranaje abre Configuración (apariencia, idioma, términos y privacidad).
// "Tu impacto": consumidor → comidas rescatadas, comercios y calificaciones (de /api/mis-reservas/);
//               organización → donaciones pedidas y recibidas (de /api/mis-solicitudes-donacion/).
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cifras from '../componentes/Cifras';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import Logo from '../componentes/Logo';
import { claveBienvenida, useBienvenida } from '../contexto/Bienvenida';
import { t as traducir, textoDesdeEspanol, useIdioma } from '../contexto/Idioma';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
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

function abrir(url) {
  Linking.openURL(url).catch(() => Alert.alert(traducir('comun.noSePudoAbrir'), traducir('comun.noSePudoAbrirTexto')));
}

// Grupo de filas con título chiquito arriba
function Grupo({ titulo, children }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={{ gap: espacio(1) }}>
      <Text style={[estilos.tituloGrupo, { color: colores.gris }]}>{titulo}</Text>
      <View style={[estilos.grupo, { backgroundColor: colores.superficie }, sombra(colores)]}>{children}</View>
    </View>
  );
}

// Una fila con ícono a la izquierda (no se muestra si el valor está vacío)
function Dato({ icono, valor, ultimo }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <View style={[estilos.fila, !ultimo && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colores.borde }]}>
      <View style={[estilos.iconoFila, { backgroundColor: colores.menta }]}>
        <Icono nombre={icono} tamano={17} color={colores.verdeHover} />
      </View>
      <Text style={[estilos.valor, { color: colores.texto }]} numberOfLines={2}>
        {valor}
      </Text>
    </View>
  );
}

// Fila que se toca (con flecha) para abrir una pantalla: "Cambiar contraseña", "Editar datos del comercio"
// "valor" (opcional): un dato a la derecha, antes de la flecha (el saldo en "Mis puntos")
function FilaAccion({ icono, texto, valor, alTocar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={valor ? `${texto}, ${valor}` : texto}
      style={({ pressed }) => [estilos.fila, pressed && { opacity: 0.7 }]}
    >
      <View style={[estilos.iconoFila, { backgroundColor: colores.verdeProfundo }]}>
        <Icono nombre={icono} tamano={17} color={colores.sobreVerdeProfundo} />
      </View>
      <Text style={[estilos.valor, { color: colores.texto, fontFamily: fuentes.media }]}>{texto}</Text>
      {valor ? (
        <Text style={[estilos.valorDerecha, { color: colores.verdeHover }]} numberOfLines={1}>
          {valor}
        </Text>
      ) : null}
      <Icono nombre="chevron-forward" tamano={16} color={colores.gris} />
    </Pressable>
  );
}

// Engranaje de arriba a la derecha: abre Configuración ("sobreMarca": blanco, para ir encima del bloque verde)
function BotonConfiguracion({ navigation, sobreMarca, estilo }) {
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
        <Icono nombre="settings-outline" tamano={20} color={sobreMarca ? colores.sobreMarca : colores.texto} />
      </Pressable>
    </View>
  );
}

// Hojas del logo, muy suaves, de decoración en las esquinas de los bloques verdes
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

// Consumidor: "Mis puntos" destacado arriba del Perfil, con el saldo grande y "Ver merch" (la única acción)
function TarjetaPuntos({ saldo, alVerMerch }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const cargado = saldo !== null && saldo !== undefined;
  return (
    <View style={[estilos.tarjetaPuntos, { backgroundColor: colores.marca }]}>
      <Hojas grande={110} />
      <View
        style={{ flex: 1, minWidth: 140, gap: 2 }}
        accessible
        accessibilityLabel={cargado ? `${t('perfil.puntosLup')}: ${t('puntos.saldoAccesible', { n: saldo })}` : t('perfil.puntosLup')}
      >
        <Text style={[estilos.etiquetaPuntos, { color: colores.sobreMarcaSuave }]}>{t('perfil.puntosLup')}</Text>
        <Text style={[estilos.saldoPuntos, { color: colores.sobreMarca }]} numberOfLines={1} adjustsFontSizeToFit>
          {cargado ? saldo : '-'}
          {cargado ? <Text style={estilos.unidadPuntos}> {t('puntos.unidad', { n: saldo })}</Text> : null}
        </Text>
      </View>
      <Pressable
        onPress={alVerMerch}
        accessibilityRole="button"
        accessibilityLabel={t('perfil.verMerch')}
        style={({ pressed }) => [estilos.botonPuntos, { backgroundColor: colores.sobreMarca }, pressed && { opacity: 0.85 }]}
      >
        <Icono nombre="gift-outline" tamano={16} color={colores.marca} />
        <Text style={[estilos.textoBotonPuntos, { color: colores.marca }]}>{t('perfil.verMerch')}</Text>
      </Pressable>
    </View>
  );
}

// Soporte: el chat con Lü (pantalla Ayuda) y 3 botones redondos (WhatsApp, llamar, Instagram)
function Soporte({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const botones = [
    ['logo-whatsapp', t('perfil.whatsapp'), SOPORTE.whatsapp],
    ['call-outline', t('perfil.llamar'), SOPORTE.telefono],
    ['logo-instagram', t('perfil.instagram'), SOPORTE.instagram],
  ];
  return (
    <Grupo titulo={t('perfil.necesitasAyuda')}>
      <Pressable
        onPress={() => navigation?.navigate?.('Ayuda', { desde: 'Perfil' })}
        accessibilityRole="button"
        accessibilityLabel={t('perfil.chatearAccesible')}
        style={({ pressed }) => [
          estilos.fila,
          { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colores.borde },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={[estilos.iconoFila, { backgroundColor: colores.verdeProfundo }]}>
          <Icono nombre="chatbubbles-outline" tamano={17} color={colores.sobreVerdeProfundo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.valor, { color: colores.texto, fontFamily: fuentes.media }]}>{t('perfil.chatear')}</Text>
          <Text style={[estilos.subtitulo, { color: colores.gris, textAlign: 'left' }]}>
            {t('perfil.chatearAyuda')}
          </Text>
        </View>
        <Icono nombre="chevron-forward" tamano={16} color={colores.gris} />
      </Pressable>
      <View style={estilos.soporte}>
        {botones.map(([icono, texto, url]) => (
          <Pressable
            key={texto}
            onPress={() => abrir(url)}
            accessibilityRole="button"
            accessibilityLabel={texto}
            style={({ pressed }) => [estilos.botonSoporte, pressed && { opacity: 0.7 }]}
          >
            <View style={[estilos.circuloSoporte, { backgroundColor: colores.menta }]}>
              <Icono nombre={icono} tamano={24} color={colores.verdeHover} />
            </View>
            <Text style={[estilos.textoSoporte, { color: colores.texto }]}>{texto}</Text>
          </Pressable>
        ))}
      </View>
    </Grupo>
  );
}

// Los números de "Tu impacto" según el rol ("texto" es una clave de idiomas/es.js: se muestra con t())
async function calcularImpacto(rol) {
  try {
    if (rol === 'consumidor') {
      const reservas = await api('/mis-reservas/');
      const retiradas = reservas.filter((r) => r.estado === 'retirada');
      return [
        { icono: 'leaf-outline', valor: retiradas.reduce((total, r) => total + r.cantidad, 0), texto: 'perfil.rescatadas' },
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
  const [merch, setMerch] = useState([]); // invitado: el merch de Puntos Lüp, si la API lo da sin sesión

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
    // El saldo de puntos va aparte: si falla, el resto del Perfil se ve igual
    if (usuario.rol === 'consumidor') {
      api('/puntos/')
        .then((r) => setSaldoPuntos(r.saldo))
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
  const rol = ROLES[datos?.rol] || ROLES.consumidor;
  const foto = urlCompleta(datos?.foto);
  const comercio = datos?.comercio;
  const organizacion = datos?.organizacion;

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
      <BotonConfiguracion navigation={navigation} />

      <View style={estilos.cabecera}>
        {foto ? (
          <Image source={{ uri: foto }} style={estilos.avatar} accessibilityLabel={t('perfil.tuFoto')} />
        ) : (
          <View style={[estilos.avatar, { backgroundColor: colores.menta }]}>
            <Icono nombre={rol.icono} tamano={38} color={colores.verdeHover} />
          </View>
        )}
        <Text style={[estilos.nombre, { color: colores.titulo }]}>{datos?.nombre}</Text>
        <View style={[estilos.rol, { backgroundColor: colores.menta }]}>
          <Icono nombre={rol.icono} tamano={13} color={colores.verdeHover} />
          <Text style={[estilos.textoRol, { color: colores.verdeHover }]}>{t(rol.titulo)}</Text>
        </View>
        <Boton
          texto={t('perfil.editarMisDatos')}
          icono="create-outline"
          variante="secundario"
          chico
          onPress={() => navigation.navigate('EditarPerfil')}
          estilo={{ marginTop: espacio(0.5) }}
        />
      </View>

      {/* Puntos Lüp destacado, arriba de todo lo demás */}
      {datos?.rol === 'consumidor' ? (
        <TarjetaPuntos saldo={saldoPuntos} alVerMerch={() => navigation.navigate('MisPuntos')} />
      ) : null}

      <MensajeError mensaje={error} alReintentar={cargar} />

      {impacto ? (
        <Grupo titulo={t('perfil.tuImpacto')}>
          <Cifras datos={impacto.map((d) => ({ ...d, texto: t(d.texto) }))} />
        </Grupo>
      ) : null}

      <Grupo titulo={t('perfil.tuCuenta')}>
        <Dato icono="at" valor={datos?.username} />
        <Dato icono="mail-outline" valor={datos?.email} />
        <Dato icono="call-outline" valor={datos?.telefono} />
        <Dato icono="location-outline" valor={datos?.ciudad} />
        <Dato
          icono={datos?.avisos_email === false ? 'notifications-off-outline' : 'notifications-outline'}
          valor={datos?.avisos_email === false ? t('perfil.avisosApagados') : t('perfil.avisosActivados')}
        />
        <FilaAccion icono="key-outline" texto={t('perfil.cambiarClave')} alTocar={() => navigation.navigate('CambiarClave')} />
      </Grupo>

      {comercio ? (
        <Grupo titulo={t('perfil.tuComercio')}>
          <Dato icono="storefront-outline" valor={comercio.nombre} />
          <Dato icono="pricetag-outline" valor={textoDesdeEspanol(t, 'rubros', comercio.rubro)} />
          <Dato icono="map-outline" valor={comercio.direccion} />
          <Dato icono="time-outline" valor={comercio.horario} />
          <Dato icono="document-text-outline" valor={comercio.cuit && `CUIT ${comercio.cuit}`} />
          <FilaAccion icono="create-outline" texto={t('perfil.editarComercio')} alTocar={() => navigation.navigate('EditarComercio')} />
        </Grupo>
      ) : null}

      {organizacion ? (
        <Grupo titulo={t('perfil.tuOrganizacion')}>
          <Dato icono="heart-outline" valor={organizacion.nombre} />
          <Dato icono="people-outline" valor={textoDesdeEspanol(t, 'tiposOrganizacion', organizacion.tipo)} />
          <Dato icono="map-outline" valor={organizacion.direccion} />
          <Dato
            icono="restaurant-outline"
            valor={organizacion.personas_asistidas ? t('perfil.personasPorSemana', { n: organizacion.personas_asistidas }) : null}
          />
          <Dato icono="document-text-outline" valor={organizacion.cuit && `CUIT ${organizacion.cuit}`} />
          <FilaAccion
            icono="create-outline"
            texto={t('perfil.editarOrganizacion')}
            alTocar={() => navigation.navigate('EditarOrganizacion')}
          />
        </Grupo>
      ) : null}

      <Soporte navigation={navigation} />

      <Boton texto={t('perfil.verBienvenida')} icono="sparkles-outline" variante="texto" chico onPress={() => navigation.navigate('VerBienvenida', { rol: usuario?.rol || 'consumidor' })} />
      <Boton texto={t('perfil.cerrarSesion')} icono="log-out-outline" variante="texto" onPress={confirmarSalida} cargando={saliendo} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(4),
    gap: espacio(2.5),
  },
  cabecera: {
    alignItems: 'center',
    gap: espacio(1),
    marginTop: -espacio(2), // el engranaje queda en la misma altura que la foto, a la derecha
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
  tarjetaPuntos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espacio(1.5),
    borderRadius: radio + 4,
    padding: espacio(2),
    overflow: 'hidden',
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
  botonPuntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: espacio(2),
    borderRadius: 999,
  },
  textoBotonPuntos: {
    fontFamily: fuentes.boton,
    fontSize: 13,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  rol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  textoRol: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  tituloGrupo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    marginLeft: espacio(1),
  },
  grupo: {
    borderRadius: radio,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingHorizontal: espacio(1.5),
    paddingVertical: espacio(1.25),
  },
  iconoFila: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  valorDerecha: {
    flexShrink: 0,
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  soporte: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: espacio(2),
  },
  botonSoporte: {
    alignItems: 'center',
    gap: espacio(0.75),
  },
  circuloSoporte: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSoporte: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
});
