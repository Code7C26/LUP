// 5 estrellas para calificar. Si se pasa "alElegir", se pueden tocar.
// Uso:  <Estrellas valor={4} />   <Estrellas valor={puntaje} alElegir={(n) => calificar(n)} />
import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../tema';
import Icono from './Icono';

export default function Estrellas({ valor = 0, alElegir, tamano = 22 }) {
  const { colores } = useTema();
  return (
    <View style={estilos.fila} accessibilityRole={alElegir ? 'adjustable' : 'text'} accessibilityLabel={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const llena = n <= valor;
        const estrella = <Icono nombre={llena ? 'star' : 'star-outline'} tamano={tamano} color={llena ? colores.ambar : colores.gris} />;
        return alElegir ? (
          <Pressable key={n} onPress={() => alElegir(n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${n} estrellas`}>
            {estrella}
          </Pressable>
        ) : (
          <View key={n}>{estrella}</View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: 4,
  },
});
