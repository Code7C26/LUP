// Selector Automático / Claro / Oscuro (una "pastilla" con 3 opciones).
// Se usa en Perfil y en el menú ☰ de Inicio. Lo elegido queda guardado en el celular (tema.js).
// Uso:  <SelectorApariencia />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cambiarApariencia, espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

const OPCIONES = [
  ['sistema', 'Auto', 'phone-portrait-outline'],
  ['claro', 'Claro', 'sunny-outline'],
  ['oscuro', 'Oscuro', 'moon-outline'],
];

export default function SelectorApariencia() {
  const { colores, apariencia } = useTema();
  return (
    <View style={[estilos.segmento, { backgroundColor: colores.campo }]} accessibilityRole="radiogroup">
      {OPCIONES.map(([clave, texto, icono]) => {
        const activa = apariencia === clave;
        const color = activa ? colores.sobreVerdeProfundo : colores.gris;
        return (
          <Pressable
            key={clave}
            onPress={() => cambiarApariencia(clave)}
            accessibilityRole="radio"
            accessibilityLabel={texto === 'Auto' ? 'Automático' : texto}
            accessibilityState={{ selected: activa }}
            style={[estilos.opcion, activa && { backgroundColor: colores.verdeProfundo }]}
          >
            <Icono nombre={icono} tamano={16} color={color} />
            <Text style={[estilos.textoOpcion, { color }]}>{texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  segmento: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
  },
  opcion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: espacio(1),
    borderRadius: 999,
  },
  textoOpcion: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
});
