// PASO 49 · Perfil y soporte.
// Con sesión: los datos del usuario (GET /api/auth/yo/) con "Editar mis datos" (pantalla EditarPerfil),
// los de su comercio u organización,
// el recuadro de soporte ("Chatear con Lü" → pantalla Ayuda, y WhatsApp / teléfono / Instagram) y "Cerrar sesión".
// Sin sesión: "Iniciar sesión" y "Registrarme".
// PROPUESTA DE ESTÉTICA: cabecera con foto, filas con íconos (menos texto),
// "Apariencia" para elegir claro / oscuro / automático y el soporte en 3 botones redondos.
// "Tu impacto": consumidor → comidas rescatadas, comercios y calificaciones (de /api/mis-reservas/);
//               organización → donaciones pedidas y recibidas (de /api/mis-solicitudes-donacion/).
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cifras from '../componentes/Cifras';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import SelectorApariencia from '../componentes/SelectorApariencia';
import { claveBienvenida, useBienvenida } from '../contexto/Bienvenida';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';

// Mismos datos que el pie de página de la web (scr/templates/base.html)
const SOPORTE = {
  whatsapp: 'https://wa.me/5493547620629',
  telefono: 'tel:+5493547620629',
  telefonoTexto: '+54 9 3547 62-0629',
  instagram: 'https://www.instagram.com/lupcomidas/',
};

const ROLES = {
  consumidor: { titulo: 'Consumidor', icono: 'bag-handle' },
  comercio: { titulo: 'Comercio', icono: 'storefront' },
  organizacion: { titulo: 'Organización', icono: 'heart' },
};

function abrir(url) {
  Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir', 'Probá de nuevo desde otro celular o desde la web.'));
}

// Grupo de filas con título chiquito arriba
function Grupo({ titulo, children }) {
  const { colores } = useTema();
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

// Soporte: el chat con Lü (pantalla Ayuda) y 3 botones redondos (WhatsApp, llamar, Instagram)
function Soporte({ navigation }) {
  const { colores } = useTema();
  const botones = [
    ['logo-whatsapp', 'WhatsApp', SOPORTE.whatsapp],
    ['call-outline', 'Llamar', SOPORTE.telefono],
    ['logo-instagram', 'Instagram', SOPORTE.instagram],
  ];
  return (
    <Grupo titulo="¿Necesitás ayuda?">
      <Pressable
        onPress={() => navigation?.navigate?.('Ayuda', { desde: 'Perfil' })}
        accessibilityRole="button"
        accessibilityLabel="Chatear con Lü. Respuestas al instante o hablá con una persona"
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
          <Text style={[estilos.valor, { color: colores.texto, fontFamily: fuentes.media }]}>Chatear con Lü</Text>
          <Text style={[estilos.subtitulo, { color: colores.gris, textAlign: 'left' }]}>
            Respuestas al instante o hablá con una persona
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

// Los números de "Tu impacto" según el rol
async function calcularImpacto(rol) {
  try {
    if (rol === 'consumidor') {
      const reservas = await api('/mis-reservas/');
      const retiradas = reservas.filter((r) => r.estado === 'retirada');
      return [
        { icono: 'leaf-outline', valor: retiradas.reduce((total, r) => total + r.cantidad, 0), texto: 'Rescatadas' },
        { icono: 'storefront-outline', valor: new Set(retiradas.map((r) => r.comercio)).size, texto: 'Comercios' },
        { icono: 'star-outline', valor: retiradas.filter((r) => r.calificacion).length, texto: 'Calificaste' },
      ];
    }
    if (rol === 'comercio') {
      const [productos, reservas] = await Promise.all([api('/mis-productos/'), api('/reservas-del-comercio/')]);
      const contar = (estado) => productos.filter((p) => p.estado === estado).length;
      return [
        { icono: 'storefront-outline', valor: contar('DISPONIBLE'), texto: 'En venta' },
        { icono: 'bag-handle-outline', valor: reservas.length, texto: 'Para retirar' },
        { icono: 'checkmark-done-outline', valor: contar('AGOTADO'), texto: 'Vendidos' },
        { icono: 'heart-outline', valor: contar('DONADO'), texto: 'Donados' },
      ];
    }
    if (rol === 'organizacion') {
      const solicitudes = await api('/mis-solicitudes-donacion/');
      return [
        { icono: 'paper-plane-outline', valor: solicitudes.length, texto: 'Pedidas' },
        { icono: 'heart-outline', valor: solicitudes.filter((s) => s.estado === 'aprobada').length, texto: 'Recibidas' },
        { icono: 'time-outline', valor: solicitudes.filter((s) => s.estado === 'pendiente').length, texto: 'Esperando' },
      ];
    }
  } catch {
    // Si falla, simplemente no se muestra el recuadro
  }
  return null;
}

export default function Perfil({ navigation }) {
  const { colores } = useTema();
  const { usuario, cerrarSesion, entrarComoInvitado } = useSesion();
  const { marcarVista } = useBienvenida();

  const [datos, setDatos] = useState(usuario); // se muestra lo guardado y se actualiza con Django
  const [error, setError] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const [impacto, setImpacto] = useState(null); // los números de "Tu impacto"

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setError('');
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
      '¿Cerrar sesión?',
      'Se van a borrar de este celular tu carrito, tus comercios favoritos, tus búsquedas recientes y los avisos de retiro.\n\n' +
        'Tu cuenta, tus reservas y tus publicaciones siguen guardadas: las ves de nuevo al volver a entrar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión y borrar', style: 'destructive', onPress: salir },
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
  if (!usuario) {
    return (
      <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido}>
        <View style={estilos.cabecera}>
          <View style={[estilos.avatar, { backgroundColor: colores.menta }]}>
            <Icono nombre="person-outline" tamano={40} color={colores.verdeHover} />
          </View>
          <Text style={[estilos.nombre, { color: colores.titulo }]}>Estás como invitado</Text>
          <Text style={[estilos.subtitulo, { color: colores.gris }]}>Ingresá para reservar y ver tus códigos.</Text>
        </View>
        <Boton texto="Iniciar sesión" icono="log-in-outline" onPress={() => navigation.navigate('Login')} />
        <Boton texto="Crear cuenta" variante="secundario" onPress={() => navigation.navigate('Registro')} />
        <Grupo titulo="Apariencia">
          <View style={{ padding: espacio(1) }}>
            <SelectorApariencia />
          </View>
        </Grupo>
        <Soporte navigation={navigation} />
        <Boton texto="Ver la bienvenida" icono="sparkles-outline" variante="texto" chico onPress={() => navigation.navigate('VerBienvenida', { rol: usuario?.rol || 'consumidor' })} />
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
      <View style={estilos.cabecera}>
        {foto ? (
          <Image source={{ uri: foto }} style={estilos.avatar} accessibilityLabel="Tu foto de perfil" />
        ) : (
          <View style={[estilos.avatar, { backgroundColor: colores.menta }]}>
            <Icono nombre={rol.icono} tamano={38} color={colores.verdeHover} />
          </View>
        )}
        <Text style={[estilos.nombre, { color: colores.titulo }]}>{datos?.nombre}</Text>
        <View style={[estilos.rol, { backgroundColor: colores.menta }]}>
          <Icono nombre={rol.icono} tamano={13} color={colores.verdeHover} />
          <Text style={[estilos.textoRol, { color: colores.verdeHover }]}>{rol.titulo}</Text>
        </View>
        <Boton
          texto="Editar mis datos"
          icono="create-outline"
          variante="secundario"
          chico
          onPress={() => navigation.navigate('EditarPerfil')}
          estilo={{ marginTop: espacio(0.5) }}
        />
      </View>

      <MensajeError mensaje={error} alReintentar={cargar} />

      {impacto ? (
        <Grupo titulo="Tu impacto">
          <Cifras datos={impacto} />
        </Grupo>
      ) : null}

      <Grupo titulo="Tu cuenta">
        <Dato icono="at" valor={datos?.username} />
        <Dato icono="mail-outline" valor={datos?.email} />
        <Dato icono="call-outline" valor={datos?.telefono} />
        <Dato icono="location-outline" valor={datos?.ciudad} ultimo />
      </Grupo>

      {comercio ? (
        <Grupo titulo="Tu comercio">
          <Dato icono="storefront-outline" valor={comercio.nombre} />
          <Dato icono="pricetag-outline" valor={comercio.rubro} />
          <Dato icono="map-outline" valor={comercio.direccion} />
          <Dato icono="time-outline" valor={comercio.horario} />
          <Dato icono="document-text-outline" valor={comercio.cuit && `CUIT ${comercio.cuit}`} ultimo />
        </Grupo>
      ) : null}

      {organizacion ? (
        <Grupo titulo="Tu organización">
          <Dato icono="heart-outline" valor={organizacion.nombre} />
          <Dato icono="people-outline" valor={organizacion.tipo} />
          <Dato icono="map-outline" valor={organizacion.direccion} />
          <Dato
            icono="restaurant-outline"
            valor={organizacion.personas_asistidas ? `${organizacion.personas_asistidas} personas por semana` : null}
          />
          <Dato icono="document-text-outline" valor={organizacion.cuit && `CUIT ${organizacion.cuit}`} ultimo />
        </Grupo>
      ) : null}

      <Grupo titulo="Apariencia">
        <View style={{ padding: espacio(1) }}>
          <SelectorApariencia />
        </View>
      </Grupo>

      <Soporte navigation={navigation} />

      <Boton texto="Ver la bienvenida" icono="sparkles-outline" variante="texto" chico onPress={() => navigation.navigate('VerBienvenida', { rol: usuario?.rol || 'consumidor' })} />
      <Boton texto="Cerrar sesión" icono="log-out-outline" variante="texto" onPress={confirmarSalida} cargando={saliendo} />
      <Text style={[estilos.nota, { color: colores.gris }]}>
        El email{comercio || organizacion ? ' y los datos de tu comercio u organización' : ''} se cambian desde la web.
      </Text>
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
    marginTop: espacio(1),
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
  nota: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
    textAlign: 'center',
    marginTop: -espacio(1.5),
  },
});
