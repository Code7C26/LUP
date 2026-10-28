// PASO 49 · Perfil y soporte.
// Con sesión: los datos del usuario (GET /api/auth/yo/), los de su comercio u organización,
// el recuadro de soporte (WhatsApp y teléfono, los mismos del pie de la web) y "Cerrar sesión".
// Sin sesión: "Iniciar sesión" y "Registrarme".
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';

// Mismos datos que el pie de página de la web (scr/templates/base.html)
const SOPORTE = {
  whatsapp: 'https://wa.me/5493547620629',
  telefono: 'tel:+5493547620629',
  telefonoTexto: '+54 9 3547 62-0629',
  instagram: 'https://www.instagram.com/lupcomidas/',
};

const ROLES = {
  consumidor: { titulo: 'Consumidor', soporte: 'Soporte al Consumidor', emoji: '🛍️' },
  comercio: { titulo: 'Comercio', soporte: 'Soporte al Comercio', emoji: '🏪' },
  organizacion: { titulo: 'Organización', soporte: 'Soporte a Organizaciones', emoji: '💚' },
};

function abrir(url) {
  Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir', 'Probá de nuevo desde otro celular o desde la web.'));
}

// Una fila "Etiqueta: valor" (no se muestra si está vacía)
function Dato({ etiqueta, valor }) {
  const { colores } = useTema();
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <View style={estilos.dato}>
      <Text style={[estilos.etiqueta, { color: colores.gris }]}>{etiqueta}</Text>
      <Text style={[estilos.valor, { color: colores.texto }]}>{valor}</Text>
    </View>
  );
}

function Tarjeta({ titulo, children }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <Text style={[estilos.tituloTarjeta, { color: colores.verdeHover }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function Soporte({ rol }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.menta, borderColor: colores.menta }]}>
      <Text style={[estilos.tituloSoporte, { color: colores.titulo }]}>{ROLES[rol]?.soporte || 'Soporte al usuario'}</Text>
      <Text style={[estilos.valor, { color: colores.texto }]}>¿Tenés alguna duda o problema? Escribinos o llamanos.</Text>
      <Boton texto="💬 Escribir por WhatsApp" onPress={() => abrir(SOPORTE.whatsapp)} />
      <Boton texto={`📞 ${SOPORTE.telefonoTexto}`} variante="secundario" onPress={() => abrir(SOPORTE.telefono)} />
      <Text
        style={[estilos.link, { color: colores.verdeHover }]}
        onPress={() => abrir(SOPORTE.instagram)}
        accessibilityRole="link"
      >
        Seguinos en Instagram: @lupcomidas
      </Text>
    </View>
  );
}

export default function Perfil({ navigation }) {
  const { colores } = useTema();
  const { usuario, cerrarSesion, entrarComoInvitado } = useSesion();

  const [datos, setDatos] = useState(usuario); // se muestra lo guardado y se actualiza con Django
  const [error, setError] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setError('');
    try {
      setDatos(await api('/auth/yo/'));
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

  async function salir() {
    setSaliendo(true);
    try {
      await cerrarSesion();
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
            <Text style={estilos.emojiAvatar}>👋</Text>
          </View>
          <Text style={[estilos.nombre, { color: colores.titulo }]}>Estás como invitado</Text>
          <Text style={[estilos.valor, { color: colores.gris, textAlign: 'center' }]}>
            Ingresá para reservar ofertas, ver tus códigos de retiro o publicar los excedentes de tu comercio.
          </Text>
        </View>
        <Boton texto="Iniciar sesión" onPress={() => navigation.navigate('Login')} />
        <Boton texto="Registrarme" variante="secundario" onPress={() => navigation.navigate('Registro')} />
        <Soporte rol="consumidor" />
      </ScrollView>
    );
  }

  // ---- Con sesión ----
  const rol = ROLES[datos?.rol] || ROLES.consumidor;
  const foto = urlCompleta(datos?.foto);

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
            <Text style={estilos.emojiAvatar}>{rol.emoji}</Text>
          </View>
        )}
        <Text style={[estilos.nombre, { color: colores.titulo }]}>{datos?.nombre}</Text>
        <Text style={[estilos.rol, { backgroundColor: colores.menta, color: colores.verdeHover }]}>{rol.titulo}</Text>
      </View>

      <MensajeError mensaje={error} alReintentar={cargar} />

      <Tarjeta titulo="Tu cuenta">
        <Dato etiqueta="Usuario" valor={datos?.username} />
        <Dato etiqueta="Email" valor={datos?.email} />
        <Dato etiqueta="Teléfono" valor={datos?.telefono} />
        <Dato etiqueta="Ciudad" valor={datos?.ciudad} />
      </Tarjeta>

      {datos?.comercio ? (
        <Tarjeta titulo="Tu comercio">
          <Dato etiqueta="Nombre" valor={datos.comercio.nombre} />
          <Dato etiqueta="Rubro" valor={datos.comercio.rubro} />
          <Dato etiqueta="CUIT" valor={datos.comercio.cuit} />
          <Dato etiqueta="Dirección" valor={datos.comercio.direccion} />
          <Dato etiqueta="Horario de retiro" valor={datos.comercio.horario} />
        </Tarjeta>
      ) : null}

      {datos?.organizacion ? (
        <Tarjeta titulo="Tu organización">
          <Dato etiqueta="Nombre" valor={datos.organizacion.nombre} />
          <Dato etiqueta="Tipo" valor={datos.organizacion.tipo} />
          <Dato etiqueta="CUIT / matrícula" valor={datos.organizacion.cuit} />
          <Dato etiqueta="Dirección" valor={datos.organizacion.direccion} />
          <Dato etiqueta="Personas asistidas por semana" valor={String(datos.organizacion.personas_asistidas)} />
        </Tarjeta>
      ) : null}

      <Text style={[estilos.nota, { color: colores.gris }]}>
        Para cambiar tus datos o tu foto, entrá a tu perfil en la web de Lüp.
      </Text>

      <Soporte rol={datos?.rol} />

      <Boton texto="Cerrar sesión" variante="secundario" onPress={salir} cargando={saliendo} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    gap: espacio(2),
  },
  cabecera: {
    alignItems: 'center',
    gap: espacio(1),
    marginTop: espacio(1),
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiAvatar: {
    fontSize: 40,
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
    textAlign: 'center',
  },
  rol: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(1.25),
  },
  tituloTarjeta: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    textTransform: 'uppercase',
  },
  tituloSoporte: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  dato: {
    gap: 2,
  },
  etiqueta: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  valor: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  link: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  nota: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
});
