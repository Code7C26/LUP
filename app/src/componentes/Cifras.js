// Fila de números grandes con su ícono y una palabra abajo (resumen e impacto).
// Uso:  <Cifras datos={[{ icono: 'cube-outline', valor: 4, texto: 'Activos' }, ...]} />
import { StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function Cifras({ datos }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.fila, { backgroundColor: colores.superficie }]}>
      {datos.map((d, i) => (
        <View
          key={d.texto}
          style={[estilos.dato, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: colores.borde }]}
          accessible
          accessibilityLabel={`${d.valor} ${d.texto}`}
        >
          <Icono nombre={d.icono} tamano={18} color={d.color || colores.verdeHover} />
          <Text style={[estilos.valor, { color: colores.titulo }]} numberOfLines={1} adjustsFontSizeToFit>
            {d.valor}
          </Text>
          <Text style={[estilos.texto, { color: colores.gris }]} numberOfLines={1}>
            {d.texto}
          </Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    borderRadius: radio,
    paddingVertical: espacio(1.5),
  },
  dato: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: espacio(0.5),
  },
  valor: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    fontVariant: ['tabular-nums'],
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
  },
});
