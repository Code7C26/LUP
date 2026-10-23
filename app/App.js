// Pantalla de prueba del paso 34: muestra el logo, los colores y la tipografía de Lüp.
// En el paso 37 este archivo se cambia para mostrar la navegación de la app.
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { espacio, fuentes, radio, tamanos, useTema } from './src/tema';

export default function App() {
  const [fuentesListas] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
  const { colores, esOscuro } = useTema();

  // Hasta que no carga Poppins, no se muestra nada (así no se ve la letra cambiar).
  if (!fuentesListas) return null;

  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.fondo }]}>
      {/* El logo va sobre un círculo crema para que se lea también en modo oscuro */}
      <View style={estilos.circuloLogo}>
        <Image source={require('./assets/logo.png')} style={estilos.logo} resizeMode="contain" />
      </View>

      <Text style={[estilos.titulo, { color: colores.titulo }]}>
        Una segunda oportunidad para cada alimento
      </Text>
      <Text style={[estilos.texto, { color: colores.gris }]}>Más valor. Menos desperdicio.</Text>

      {/* Muestra de los colores principales */}
      <View style={estilos.muestras}>
        {[colores.verdeProfundo, colores.verde, colores.menta, colores.ambar].map((color) => (
          <View key={color} style={[estilos.muestra, { backgroundColor: color, borderColor: colores.borde }]} />
        ))}
      </View>

      <StatusBar style={esOscuro ? 'light' : 'dark'} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio(3),
    gap: espacio(2),
  },
  circuloLogo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F7F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 125,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
    textAlign: 'center',
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
  },
  muestras: {
    flexDirection: 'row',
    gap: espacio(1),
    marginTop: espacio(1),
  },
  muestra: {
    width: 40,
    height: 40,
    borderRadius: radio,
    borderWidth: 1,
  },
});
