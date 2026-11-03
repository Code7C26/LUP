// Portada, IGUAL AL MOCKUP (páginas 1 y 2 del PDF):
//   1. "Una segunda oportunidad para cada alimento" sobre blanco (un momento)
//   2. el logo grande y el botón "Iniciar sesión"
// Se ve al abrir la app sin sesión. Tocar la frase la saltea.
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import Boton from '../componentes/Boton';
import Logo from '../componentes/Logo';
import { espacio, fuentes, useTema } from '../tema';

export default function Portada({ navigation }) {
  const { colores } = useTema();
  const [paso, setPaso] = useState(1);
  const opacidad = useRef(new Animated.Value(0)).current;

  // Aparece suave cada paso; la frase pasa sola al logo después de 1,8 segundos
  useEffect(() => {
    opacidad.setValue(0);
    Animated.timing(opacidad, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    if (paso === 1) {
      const espera = setTimeout(() => setPaso(2), 1800);
      return () => clearTimeout(espera);
    }
  }, [paso, opacidad]);

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
