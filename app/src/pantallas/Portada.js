// Portada (se ve al abrir la app sin sesión):
//   0. INTRO EN VIDEO: el logo blanco se arma con rebotes, estilo Pixar (assets/intro.mp4)
//   1. "Una segunda oportunidad para cada alimento" sobre blanco (mockup, página 1)
//   2. el logo grande y el botón "Iniciar sesión" (mockup, página 2)
// Tocar la pantalla saltea la intro y la frase.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import Boton from '../componentes/Boton';
import Logo from '../componentes/Logo';
import { espacio, fuentes, useTema } from '../tema';

// true: la intro sale solo la primera vez que se abre la app.
// false: sale cada vez que se abre la app sin sesión (útil para mostrarla en la presentación).
const SOLO_PRIMERA_VEZ = false;
const CLAVE_INTRO = 'lup_intro_vista';

// Intro en video (assets/intro.mp4): las letras aparecen con rebote, los puntitos llegan saltando
// y aplastan la "ü", la hoja cae sobre la "p", festejan y aparece la sonrisa (estilo Pixar).
// Si el video no carga, a los 6 segundos sigue igual.
function Intro({ alTerminar }) {
  const reproductor = useVideoPlayer(require('../../assets/intro.mp4'), (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const fin = reproductor.addListener('playToEnd', alTerminar);
    const porLasDudas = setTimeout(alTerminar, 6000);
    return () => {
      fin.remove();
      clearTimeout(porLasDudas);
    };
  }, [reproductor, alTerminar]);

  return (
    <Pressable
      onPress={alTerminar}
      accessibilityRole="button"
      accessibilityLabel="Lüp. Tocá para continuar"
      style={[estilos.pantalla, { backgroundColor: '#073425' }]}
    >
      <StatusBar style="light" />
      <VideoView
        player={reproductor}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        pointerEvents="none"
      />
    </Pressable>
  );
}

export default function Portada({ navigation }) {
  const { colores } = useTema();
  const [paso, setPaso] = useState(null); // null mientras se fija si ya se vio la intro
  const opacidad = useRef(new Animated.Value(0)).current;

  // ¿Va la intro?
  useEffect(() => {
    if (!SOLO_PRIMERA_VEZ) return setPaso(0);
    SecureStore.getItemAsync(CLAVE_INTRO)
      .then((vista) => setPaso(vista === 'si' ? 1 : 0))
      .catch(() => setPaso(1));
  }, []);

  // Aparece suave cada paso; la frase pasa sola al logo después de 1,8 segundos
  useEffect(() => {
    if (paso !== 1 && paso !== 2) return;
    opacidad.setValue(0);
    Animated.timing(opacidad, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    if (paso === 1) {
      const espera = setTimeout(() => setPaso(2), 1800);
      return () => clearTimeout(espera);
    }
  }, [paso, opacidad]);

  // useCallback: así el video no se reinicia cada vez que la pantalla se vuelve a dibujar
  const terminarIntro = useCallback(() => {
    SecureStore.setItemAsync(CLAVE_INTRO, 'si').catch(() => {});
    setPaso((actual) => (actual === 0 ? 1 : actual));
  }, []);

  if (paso === null) return <View style={[estilos.pantalla, { backgroundColor: '#073425' }]} />;
  if (paso === 0) return <Intro alTerminar={terminarIntro} />;

  const oscuro = colores.verdeProfundo; // en modo claro, el verde oscuro de la marca

  return (
    <View style={[estilos.pantalla, { backgroundColor: colores.fondo }]}>
      {paso === 1 ? (
        <Pressable onPress={() => setPaso(2)} style={estilos.centro} accessibilityRole="button" accessibilityLabel="Continuar">
          <Animated.Text style={[estilos.frase, { color: oscuro, opacity: opacidad }]}>
            Una segunda{'\n'}
            <Text style={{ color: colores.verde }}>oportunidad</Text> para{'\n'}
            cada alimento
          </Animated.Text>
        </Pressable>
      ) : (
        <Animated.View style={[estilos.centro, { opacity: opacidad, gap: espacio(6) }]}>
          <Logo ancho={190} />
          <Boton texto="Iniciar sesión" chico onPress={() => navigation.navigate('Login')} estilo={estilos.boton} />
        </Animated.View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frase: {
    fontFamily: fuentes.marca,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  boton: {
    paddingHorizontal: espacio(4),
  },
});
