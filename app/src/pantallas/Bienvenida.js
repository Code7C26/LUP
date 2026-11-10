// Bienvenida: sale apenas se entra (al iniciar sesión, crear la cuenta o tocar "Omitir") y desde Perfil
// con "Ver la bienvenida" ("VerBienvenida"). Pantalla completa en el verde de la marca, simple:
// 3 pantallas por rol con un ícono, un título y una frase corta, que se pasan deslizando o con "Siguiente".
// Al invitado, la última pantalla lo invita a crear su cuenta gratis.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icono from '../componentes/Icono';
import { claveBienvenida, useBienvenida } from '../contexto/Bienvenida';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes } from '../tema';

// Colores de la marca (iguales en modo claro y oscuro, como la intro de la Portada)
const VERDE_OSCURO = '#073425';
const VERDE_MEDIO = '#0F4A35';
const VERDE_HOJA = '#71A24D';
const VERDE_CLARO = '#B6D1A1';
const TEXTO_SUAVE = '#D5E6C8';

// Una idea por pantalla: ícono, título y una frase corta
const PANTALLAS = {
  consumidor: [
    { icono: 'location-outline', titulo: 'Ofertas cerca tuyo', texto: 'Comida rica de tu barrio, con descuento.' },
    { icono: 'bag-check-outline', titulo: 'Reservá y retirá', texto: 'Pagás en el local con tu código.' },
    { icono: 'leaf-outline', titulo: 'Salvá comida', texto: 'Cada reserva es comida que no se tira.' },
  ],
  organizacion: [
    { icono: 'heart-outline', titulo: 'Donaciones cerca', texto: 'Comercios de la zona que donan alimentos.' },
    { icono: 'paper-plane-outline', titulo: 'Pedí lo que necesitás', texto: 'Contales para cuántas personas es.' },
    { icono: 'checkmark-done-outline', titulo: 'Retirá y listo', texto: 'Seguí cada pedido desde la app.' },
  ],
  comercio: [
    { icono: 'camera-outline', titulo: 'Publicá en un minuto', texto: 'Una foto, el precio y listo.' },
    { icono: 'cash-outline', titulo: 'Vendé lo que sobra', texto: 'En vez de tirarlo.' },
    { icono: 'qr-code-outline', titulo: 'Entregá con un código', texto: 'El cliente lo muestra y confirmás.' },
  ],
};

// Ícono en un círculo verde claro que flota suave
function Ilustracion({ icono, moverse }) {
  const flotar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moverse) return undefined;
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(flotar, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(flotar, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    animacion.start();
    return () => animacion.stop();
  }, [flotar, moverse]);

  const subir = flotar.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <Animated.View style={[estilos.circulo, { transform: [{ translateY: subir }] }]}>
      <Icono nombre={icono} tamano={64} color={VERDE_OSCURO} />
    </Animated.View>
  );
}

// Botón grande verde claro (el de la acción principal de la bienvenida)
function BotonClaro({ texto, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.botonClaro, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <Text style={estilos.textoBotonClaro}>{texto}</Text>
    </Pressable>
  );
}

export default function Bienvenida({ navigation, route }) {
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const { marcarVista } = useBienvenida();
  const { usuario } = useSesion();
  const lista = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [pagina, setPagina] = useState(0);
  const [moverse, setMoverse] = useState(true);

  const rol = route?.params?.rol || usuario?.rol || 'consumidor';
  const pantallas = PANTALLAS[rol] || PANTALLAS.consumidor;
  const ultima = pagina === pantallas.length - 1;
  const desdePerfil = route?.name === 'VerBienvenida';

  // Si el celular tiene "reducir movimiento", el ícono no flota
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reducir) => setMoverse(!reducir))
      .catch(() => {});
  }, []);

  function terminar() {
    marcarVista(claveBienvenida(usuario)); // al entrar, la navegación pasa sola a las pestañas
    if (desdePerfil) navigation.goBack();
  }

  // Invitado: "Crear mi cuenta gratis" o "Ya tengo cuenta"
  function irA(pantalla) {
    if (desdePerfil) return navigation.replace(pantalla);
    // Abajo quedan las pestañas, así al cerrar el registro se vuelve a la app
    navigation.reset({ index: 1, routes: [{ name: 'Pestanas' }, { name: pantalla }] });
    marcarVista(claveBienvenida(usuario));
  }

  // Las animaciones siguen al dedo; la página actual se actualiza al pasar la mitad
  const alDeslizar = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: true,
      listener: (e) => setPagina(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)),
    })
  ).current;

  function siguiente() {
    const nueva = Math.min(pagina + 1, pantallas.length - 1);
    lista.current?.scrollTo({ x: nueva * width, animated: true });
    setPagina(nueva);
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: top + espacio(1.5), paddingBottom: bottom + espacio(2) }]}>
      <StatusBar style="light" />
      {/* Círculos de fondo */}
      <View style={[estilos.mancha, { width: width * 1.1, height: width * 1.1, top: -width * 0.45, right: -width * 0.45 }]} />
      <View style={[estilos.mancha, estilos.manchaHoja, { width: width * 0.9, height: width * 0.9, bottom: -width * 0.35, left: -width * 0.4 }]} />

      {/* Arriba a la derecha, "Omitir" */}
      <Pressable onPress={terminar} hitSlop={10} accessibilityRole="button" style={estilos.omitir}>
        <Text style={estilos.textoOmitir}>Omitir</Text>
      </Pressable>

      {/* Las 3 pantallas */}
      <Animated.ScrollView
        ref={lista}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1, marginHorizontal: -espacio(3) }}
        scrollEventThrottle={16}
        onScroll={alDeslizar}
      >
        {pantallas.map((p, i) => {
          const rango = [(i - 1) * width, i * width, (i + 1) * width];
          const escala = scrollX.interpolate({ inputRange: rango, outputRange: [0.7, 1, 0.7], extrapolate: 'clamp' });
          const opacidad = scrollX.interpolate({ inputRange: rango, outputRange: [0, 1, 0], extrapolate: 'clamp' });
          const correr = scrollX.interpolate({ inputRange: rango, outputRange: [width * 0.3, 0, -width * 0.3], extrapolate: 'clamp' });
          return (
            <View key={p.titulo} style={[estilos.pagina, { width }]} accessible accessibilityLabel={`${p.titulo}. ${p.texto}`}>
              <Animated.View style={{ opacity: opacidad, transform: [{ scale: escala }] }}>
                <Ilustracion icono={p.icono} moverse={moverse && i === pagina} />
              </Animated.View>
              <Animated.View style={[estilos.textos, { opacity: opacidad, transform: [{ translateX: correr }] }]}>
                <Text style={estilos.titulo}>{p.titulo}</Text>
                <Text style={estilos.texto}>{p.texto}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Puntitos: el actual más grande y claro */}
      <View style={estilos.puntos} accessibilityLabel={`Pantalla ${pagina + 1} de ${pantallas.length}`}>
        {pantallas.map((p, i) => {
          const rango = [(i - 1) * width, i * width, (i + 1) * width];
          return (
            <Animated.View
              key={p.titulo}
              style={[
                estilos.punto,
                {
                  opacity: scrollX.interpolate({ inputRange: rango, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' }),
                  transform: [{ scale: scrollX.interpolate({ inputRange: rango, outputRange: [1, 1.5, 1], extrapolate: 'clamp' }) }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Abajo: "Siguiente", y en la última "Empezar" (o crear la cuenta, si es invitado) */}
      <View style={estilos.abajo}>
        {!ultima ? (
          <BotonClaro texto="Siguiente" onPress={siguiente} />
        ) : usuario ? (
          <BotonClaro texto="Empezar" onPress={terminar} />
        ) : (
          <>
            <BotonClaro texto="Crear mi cuenta gratis" onPress={() => irA('Registro')} />
            <Text onPress={() => irA('Login')} accessibilityRole="link" style={estilos.link}>
              Ya tengo cuenta
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: VERDE_OSCURO,
    paddingHorizontal: espacio(3),
    overflow: 'hidden',
  },
  mancha: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: VERDE_MEDIO,
  },
  manchaHoja: {
    backgroundColor: VERDE_HOJA,
    opacity: 0.16,
  },
  omitir: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: espacio(1.5),
    paddingVertical: 5,
    borderRadius: 999,
  },
  textoOmitir: {
    color: '#FFFFFF',
    fontFamily: fuentes.negrita,
    fontSize: 13,
  },
  pagina: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio(5),
    gap: espacio(4),
  },
  circulo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: VERDE_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    alignItems: 'center',
    gap: espacio(1),
  },
  titulo: {
    color: '#FFFFFF',
    fontFamily: fuentes.marca,
    fontSize: 26,
    textAlign: 'center',
  },
  texto: {
    color: TEXTO_SUAVE,
    fontFamily: fuentes.normal,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: espacio(2),
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: VERDE_CLARO,
  },
  abajo: {
    gap: espacio(1.5),
  },
  botonClaro: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 999,
    backgroundColor: VERDE_CLARO,
  },
  textoBotonClaro: {
    color: VERDE_OSCURO,
    fontFamily: fuentes.boton,
    fontSize: 16,
  },
  link: {
    color: '#FFFFFF',
    fontFamily: fuentes.negrita,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
