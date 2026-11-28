// Estado vacío chico: un ícono en un círculo menta de 80 y un texto. Abajo, opcional, lo que venga como children.
// Uso:  <EstadoVacio texto="No tenés reservas pendientes" />
//       <EstadoVacio icono="search" texto='No encontramos "pan"'>…ideas…</EstadoVacio>
import { StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function EstadoVacio({ icono = 'leaf', texto, children }) {
  const { colores } = useTema();
  return (
    <View style={estilos.vacio}>
      <View
        style={[estilos.circulo, { backgroundColor: colores.menta }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icono nombre={icono} tamano={34} color={colores.verde} />
      </View>
      <Text style={[estilos.texto, { color: colores.gris }]}>{texto}</Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio(1.5),
    paddingHorizontal: espacio(3),
    paddingVertical: espacio(4),
  },
  circulo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    lineHeight: 19,
    textAlign: 'center',
  },
});
