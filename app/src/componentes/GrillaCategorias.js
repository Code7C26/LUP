// Categorías como cuadraditos menta con su ícono y el nombre abajo, de a 4 por fila (Inicio y Buscar).
// Uso:  <GrillaCategorias categorias={[['panificados', 'categorias.panificados'], ...]} alElegir={(clave) => ...} />
//       (cada categoría: [clave de la API, clave de idiomas/es.js con el nombre])
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, useTema } from '../tema';
import IconoCategoria from './IconoCategoria';

export default function GrillaCategorias({ categorias, alElegir, estilo }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={[estilos.grilla, estilo]}>
      {categorias.map(([clave, texto]) => (
        <Pressable
          key={clave}
          onPress={() => alElegir(clave)}
          accessibilityRole="button"
          accessibilityLabel={t('inicio.verCategoria', { nombre: t(texto) })}
          style={({ pressed }) => [estilos.categoria, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <View style={[estilos.cuadro, { backgroundColor: colores.menta }]}>
            <IconoCategoria categoria={clave} tamano={36} />
          </View>
          <Text style={[estilos.texto, { color: colores.texto }]} numberOfLines={2}>
            {t(texto)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: espacio(2),
  },
  categoria: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  cuadro: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: fuentes.media,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
