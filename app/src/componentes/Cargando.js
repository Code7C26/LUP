// Pantalla de "cargando..." para mientras se esperan datos de la API.
// Uso:  if (cargando) return <Cargando />;
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';

export default function Cargando({ texto = 'Cargando…' }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.fondo }]}>
      <ActivityIndicator size="large" color={colores.verde} />
      <Text style={[estilos.texto, { color: colores.gris }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio(1.5),
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
});
