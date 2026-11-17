// Menú ☰ (como el mockup): un panel que entra desde la izquierda. Las opciones cambian según la cuenta:
//   consumidor (y invitado): Perfil, Mis reservas, Mis favoritos, Mis puntos (solo con cuenta),
//                            Apariencia y Soporte (WhatsApp)
//   comercio: Mi perfil, Mis productos, Publicar producto, Confirmar retiro, Solicitudes de donación,
//             Datos de mi comercio, Apariencia, Idioma y Soporte
//   organización: Mi perfil, Donaciones disponibles, Mis solicitudes, Datos de mi organización,
//                 Apariencia, Idioma y Soporte
// Cada opción abre una pestaña o pantalla que ya existe (navegacion/index.js y Tabs*.js).
// Se cierra tocando afuera, con la X o con el botón "atrás" de Android.
// Uso:  <MenuLateral visible={verMenu} alCerrar={() => setVerMenu(false)} navigation={navigation} />
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFavoritos } from '../contexto/Favoritos';
import { useSesion } from '../contexto/Sesion';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, sombra, tamanos, useTema } from '../tema';
import Icono from './Icono';
import Logo from './Logo';
import SelectorApariencia from './SelectorApariencia';
import SelectorIdioma from './SelectorIdioma';

// Mismo número que el pie de la web y que Perfil
const WHATSAPP_SOPORTE = 'https://wa.me/5493547620629';
const TELEFONO_SOPORTE = '+54 9 3547 62-0629';

// Una opción del menú: ícono en un círculo verde suave, el texto y (opcional) un número a la derecha
function Opcion({ icono, texto, subtitulo, numero, alTocar }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={[texto, subtitulo, numero ? `${numero}` : ''].filter(Boolean).join(', ')}
      style={({ pressed }) => [estilos.opcion, pressed && { backgroundColor: colores.superficie }]}
    >
      <View style={[estilos.circulo, { backgroundColor: colores.menta }]}>
        <Icono nombre={icono} tamano={19} color={colores.verdeHover} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[estilos.textoOpcion, { color: colores.texto }]}>{texto}</Text>
        {subtitulo ? <Text style={[estilos.subtitulo, { color: colores.gris }]}>{subtitulo}</Text> : null}
      </View>
      {numero ? (
        <View style={[estilos.numero, { backgroundColor: colores.verdeProfundo }]}>
          <Text style={[estilos.textoNumero, { color: colores.sobreVerdeProfundo }]}>{numero}</Text>
        </View>
      ) : null}
      <Icono nombre="chevron-forward" tamano={16} color={colores.gris} />
    </Pressable>
  );
}

export default function MenuLateral({ visible, alCerrar, navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario } = useSesion();
  const { favoritos } = useFavoritos();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ancho = Math.min(320, Math.round(width * 0.82));

  // El Modal queda abierto hasta que termina la animación de salida
  const [montado, setMontado] = useState(visible);
  const avance = useRef(new Animated.Value(0)).current; // 0 = cerrado, 1 = abierto

  useEffect(() => {
    if (visible) {
      setMontado(true);
      Animated.timing(avance, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    } else {
      Animated.timing(avance, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMontado(false);
      });
    }
  }, [visible, avance]);

  // Cierra el menú y abre la pantalla
  function ir(pantalla) {
    alCerrar();
    navigation?.navigate?.(pantalla);
  }

  const rol = usuario?.rol;
  const deCuenta = rol === 'comercio' || rol === 'organizacion';

  function soporte() {
    const titulo =
      rol === 'comercio' ? t('menu.soporteComercio') : rol === 'organizacion' ? t('menu.soporteOrganizacion') : t('menu.soporteTitulo');
    Linking.openURL(WHATSAPP_SOPORTE).catch(() => Alert.alert(titulo, t('menu.escribinosAl', { tel: TELEFONO_SOPORTE })));
  }

  const nombre = usuario?.nombre?.split(' ')[0];

  return (
    <Modal
      visible={montado}
      transparent
      animationType="none"
      onRequestClose={alCerrar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* El fondo oscuro: tocarlo cierra el menú */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colores.velo, opacity: avance }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityRole="button" accessibilityLabel={t('menu.cerrarMenu')} />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[
          estilos.panel,
          sombra(colores, 3),
          {
            width: ancho,
            backgroundColor: colores.fondo,
            paddingTop: top + espacio(2),
            paddingBottom: bottom + espacio(2),
            transform: [{ translateX: avance.interpolate({ inputRange: [0, 1], outputRange: [-ancho - 20, 0] }) }],
          },
        ]}
      >
        {/* Arriba: el logo, el saludo y la X */}
        <View style={estilos.cabecera}>
          <Logo ancho={58} estilo={{ alignSelf: 'flex-start' }} />
          <Pressable
            onPress={alCerrar}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('menu.cerrarMenu')}
            style={[estilos.cerrar, { backgroundColor: colores.panel }]}
          >
            <Icono nombre="close" tamano={20} color={colores.texto} />
          </Pressable>
        </View>
        <Text style={[estilos.saludo, { color: colores.titulo }]} numberOfLines={1}>
          {nombre ? t('menu.holaNombre', { nombre }) : t('menu.hola')}
        </Text>

        <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
          {rol === 'comercio' ? (
            <View>
              <Opcion icono="person-outline" texto={t('menu.miPerfil')} alTocar={() => ir('Perfil')} />
              <Opcion icono="cube-outline" texto={t('menu.misProductos')} alTocar={() => ir('MisProductos')} />
              <Opcion icono="add-circle-outline" texto={t('menu.publicarProducto')} alTocar={() => ir('FormProducto')} />
              <Opcion icono="qr-code-outline" texto={t('menu.confirmarRetiro')} alTocar={() => ir('ConfirmarRetiro')} />
              <Opcion icono="heart-outline" texto={t('menu.solicitudesDonacion')} alTocar={() => ir('Solicitudes')} />
              <Opcion icono="storefront-outline" texto={t('menu.datosComercio')} alTocar={() => ir('EditarComercio')} />
            </View>
          ) : rol === 'organizacion' ? (
            <View>
              <Opcion icono="person-outline" texto={t('menu.miPerfil')} alTocar={() => ir('Perfil')} />
              <Opcion icono="heart-outline" texto={t('menu.donacionesDisponibles')} alTocar={() => ir('Donaciones')} />
              <Opcion icono="clipboard-outline" texto={t('menu.misSolicitudes')} alTocar={() => ir('MisSolicitudes')} />
              <Opcion icono="people-outline" texto={t('menu.datosOrganizacion')} alTocar={() => ir('EditarOrganizacion')} />
            </View>
          ) : (
            <View>
              <Opcion icono="person-outline" texto={t('menu.perfil')} alTocar={() => ir('Perfil')} />
              <Opcion icono="ticket-outline" texto={t('menu.misReservas')} alTocar={() => ir('MisReservas')} />
              <Opcion icono="heart-outline" texto={t('menu.misFavoritos')} numero={favoritos.length} alTocar={() => ir('MisFavoritos')} />
              {/* Puntos Lüp: solo con una cuenta de consumidor (el invitado no suma puntos) */}
              {rol === 'consumidor' ? (
                <Opcion icono="star-outline" texto={t('menu.misPuntos')} alTocar={() => ir('MisPuntos')} />
              ) : null}
            </View>
          )}

          <View style={[estilos.separador, { backgroundColor: colores.borde }]} />

          <View style={{ gap: espacio(1) }}>
            <Text style={[estilos.tituloGrupo, { color: colores.gris }]}>{t('menu.apariencia')}</Text>
            <SelectorApariencia />
          </View>

          {/* Comercio y organización: también el idioma (el consumidor lo tiene en Perfil) */}
          {deCuenta ? (
            <View style={{ gap: espacio(1) }}>
              <Text style={[estilos.tituloGrupo, { color: colores.gris }]}>{t('idioma.titulo')}</Text>
              <SelectorIdioma />
            </View>
          ) : null}

          <View style={[estilos.separador, { backgroundColor: colores.borde }]} />

          <Opcion icono="logo-whatsapp" texto={t('menu.soporte')} subtitulo={t('menu.escribinos')} alTocar={soporte} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: espacio(2),
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saludo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    marginTop: espacio(1.5),
    marginBottom: espacio(2),
  },
  contenido: {
    gap: espacio(2),
    paddingBottom: espacio(2),
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingVertical: espacio(1),
    paddingHorizontal: espacio(1),
    marginHorizontal: -espacio(1),
    borderRadius: 12,
  },
  circulo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoOpcion: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  subtitulo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
  },
  numero: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mini,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
  },
  tituloGrupo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
});
