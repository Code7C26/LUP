// Menú ☰ de Inicio (como el mockup): un panel que entra desde la izquierda con
// Perfil, Mis reservas, Mis favoritos, Apariencia (Auto / Claro / Oscuro) y Soporte (WhatsApp).
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
import { espacio, fuentes, sombra, tamanos, useTema } from '../tema';
import Icono from './Icono';
import Logo from './Logo';
import SelectorApariencia from './SelectorApariencia';

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

  function soporte() {
    Linking.openURL(WHATSAPP_SOPORTE).catch(() =>
      Alert.alert('Soporte al Consumidor', `Escribinos por WhatsApp al ${TELEFONO_SOPORTE}`)
    );
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
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityRole="button" accessibilityLabel="Cerrar el menú" />
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
            accessibilityLabel="Cerrar el menú"
            style={[estilos.cerrar, { backgroundColor: colores.panel }]}
          >
            <Icono nombre="close" tamano={20} color={colores.texto} />
          </Pressable>
        </View>
        <Text style={[estilos.saludo, { color: colores.titulo }]} numberOfLines={1}>
          {nombre ? `Hola, ${nombre}` : 'Hola 👋'}
        </Text>

        <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
          <View>
            <Opcion icono="person-outline" texto="Perfil" alTocar={() => ir('Perfil')} />
            <Opcion icono="ticket-outline" texto="Mis reservas" alTocar={() => ir('MisReservas')} />
            <Opcion icono="heart-outline" texto="Mis favoritos" numero={favoritos.length} alTocar={() => ir('MisFavoritos')} />
          </View>

          <View style={[estilos.separador, { backgroundColor: colores.borde }]} />

          <View style={{ gap: espacio(1) }}>
            <Text style={[estilos.tituloGrupo, { color: colores.gris }]}>Apariencia</Text>
            <SelectorApariencia />
          </View>

          <View style={[estilos.separador, { backgroundColor: colores.borde }]} />

          <Opcion icono="logo-whatsapp" texto="Soporte" subtitulo="Escribinos por WhatsApp" alTocar={soporte} />
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
