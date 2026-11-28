// Calificación de un comercio, como la web (stores/detalle_tienda.html): estrellas en ámbar (con medias),
// el promedio en negrita y la cantidad de opiniones. Si todavía no tiene opiniones: "Nuevo".
// Los datos vienen de /api/comercios/ (calificacion_promedio y calificaciones). Si no se sabe (undefined),
// no muestra nada.
// Uso:
//   <CalificacionComercio promedio={c.calificacion_promedio} cantidad={c.calificaciones} />
//        → ★★★★½ 4,5 (12)       compacta, para tarjetas (tamano = tamaño de la letra; 13 por defecto)
//   <CalificacionComercio ... variante="completa" alTocar={irAOpiniones} />
//        → ★★★★½ 4,5 · 12 opiniones   (arriba de DetalleComercio; al tocar baja a las opiniones)
//   textoCalificacion(c.calificacion_promedio, c.calificaciones)  ← para los lectores de pantalla
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { idiomaActual, t, useIdioma } from '../contexto/Idioma';
import { fuentes, tamanos, useTema } from '../tema';
import Estrellas from './Estrellas';

// 4.6 -> "4,6" ("4.6" en inglés)   (null si no hay opiniones). También para la línea gris de las tarjetas: "★ 4,6"
export function promedioConComa(promedio, cantidad) {
  const numero = Number(promedio);
  if (!cantidad || promedio === null || promedio === undefined || Number.isNaN(numero)) return null;
  return idiomaActual() === 'en' ? numero.toFixed(1) : numero.toFixed(1).replace('.', ',');
}

// "4,6 de 5 estrellas, 23 opiniones" ("Nuevo, todavía sin opiniones" si no tiene; '' si no se sabe)
export function textoCalificacion(promedio, cantidad) {
  if (cantidad === undefined || cantidad === null) return '';
  const valor = promedioConComa(promedio, cantidad);
  if (!valor) return t('componentes.nuevoAccesible');
  return t('componentes.calificacion', { valor, n: cantidad });
}

export default function CalificacionComercio({ promedio, cantidad, variante = 'compacta', tamano = tamanos.chico, alTocar, estilo }) {
  const { colores } = useTema();
  const { t: traducir } = useIdioma(); // también hace que se vuelva a dibujar al cambiar el idioma
  if (cantidad === undefined || cantidad === null) return null;
  const valor = promedioConComa(promedio, cantidad);
  const completa = variante === 'completa';

  // Sin opiniones: "Nuevo" en vez de estrellas vacías
  if (!valor) {
    return (
      <View
        style={[estilos.nuevo, { backgroundColor: colores.suaves.verde.fondo }, estilo]}
        accessible
        accessibilityLabel={traducir('componentes.nuevoAccesible')}
      >
        <Text style={[estilos.textoNuevo, { color: colores.titulo, fontSize: completa ? tamanos.chico : Math.min(tamano, 12) }]}>
          {traducir('componentes.nuevo')}
        </Text>
      </View>
    );
  }

  const letra = completa ? tamanos.chico : tamano;
  const contenido = (
    <>
      <Estrellas valor={Number(promedio)} tamano={completa ? 'normal' : letra + 1} />
      <Text style={[estilos.valor, { color: colores.titulo, fontSize: letra }]}>{valor}</Text>
      <Text style={[estilos.cantidad, { color: colores.gris, fontSize: letra }]}>
        {completa ? `· ${traducir('detalleComercio.cantidadOpiniones', { n: cantidad })}` : `(${cantidad})`}
      </Text>
    </>
  );
  const etiqueta = textoCalificacion(promedio, cantidad);

  if (alTocar) {
    return (
      <Pressable
        onPress={alTocar}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityHint={traducir('componentes.verOpiniones')}
        style={({ pressed }) => [estilos.fila, estilo, pressed && { opacity: 0.6 }]}
      >
        {contenido}
      </Pressable>
    );
  }
  return (
    <View style={[estilos.fila, estilo]} accessible accessibilityRole="text" accessibilityLabel={etiqueta}>
      {contenido}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 4,
    rowGap: 2,
  },
  valor: {
    fontFamily: fuentes.negrita,
  },
  cantidad: {
    fontFamily: fuentes.normal,
  },
  nuevo: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
  },
  textoNuevo: {
    fontFamily: fuentes.negrita,
  },
});
