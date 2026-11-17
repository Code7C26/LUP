// 5 estrellas en ámbar, como la web (scr/templates/includes/_estrellas.html).
// De solo lectura muestra MEDIAS estrellas con la misma regla que la web (lup_tags.estrellas):
//   llena si el valor llega a n − 0,25 · media si llega a n − 0,75 · vacía si no   (4,5 → ★★★★½)
// Si se pasa "alElegir", se pueden tocar (enteras) para calificar.
// Uso:
//   <Estrellas valor={4.5} />                     tamaño normal
//   <Estrellas valor={4.5} tamano="chico" />      "chico" | "normal" | "grande" (o un número)
//   <Estrellas valor={puntaje} alElegir={(n) => calificar(n)} tamano={30} />
import { Pressable, StyleSheet, View } from 'react-native';

import { useIdioma } from '../contexto/Idioma';
import { useTema } from '../tema';
import Icono from './Icono';

const TAMANOS = { chico: 13, normal: 18, grande: 26 };

export function tipoEstrella(valor, n) {
  if (valor >= n - 0.25) return 'star';
  if (valor >= n - 0.75) return 'star-half';
  return 'star-outline';
}

export default function Estrellas({ valor = 0, alElegir, tamano = 'normal', estilo }) {
  const { colores } = useTema();
  const { t, idioma } = useIdioma();
  const px = typeof tamano === 'number' ? tamano : TAMANOS[tamano] || TAMANOS.normal;
  const numero = Number(valor) || 0;
  const texto = idioma === 'en' ? String(Math.round(numero * 10) / 10) : String(Math.round(numero * 10) / 10).replace('.', ',');

  return (
    <View
      style={[estilos.fila, { gap: Math.max(1, Math.round(px / 8)) }, estilo]}
      accessible={!alElegir}
      accessibilityRole={alElegir ? 'adjustable' : 'image'}
      accessibilityLabel={t('componentes.estrellas', { valor: texto })}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        if (alElegir) {
          const llena = n <= numero;
          return (
            <Pressable
              key={n}
              onPress={() => alElegir(n)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t('componentes.nEstrellas', { n })}
              accessibilityState={{ selected: llena }}
            >
              <Icono nombre={llena ? 'star' : 'star-outline'} tamano={px} color={llena ? colores.ambar : colores.gris} />
            </Pressable>
          );
        }
        return <Icono key={n} nombre={tipoEstrella(numero, n)} tamano={px} color={colores.ambar} />;
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
