// Estrellas de un comercio, chiquitas: "★ 4,6 (23)". Si todavía no tiene opiniones, no muestra nada.
// Los datos vienen de /api/comercios/ (calificacion_promedio y calificaciones).
// Uso:
//   <CalificacionComercio promedio={c.calificacion_promedio} cantidad={c.calificaciones} />
//   <CalificacionComercio ... tamano={10} />        ← más chico (tarjetas de Inicio)
//   textoCalificacion(c.calificacion_promedio, c.calificaciones)  ← para los lectores de pantalla
import { StyleSheet, Text, View } from 'react-native';

import { fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

// 4.6 -> "4,6"   (null si no hay opiniones)
function promedioConComa(promedio, cantidad) {
  const numero = Number(promedio);
  if (!cantidad || promedio === null || promedio === undefined || Number.isNaN(numero)) return null;
  return numero.toFixed(1).replace('.', ',');
}

// "4,6 de 5 estrellas, 23 opiniones" (o '' si no tiene)
export function textoCalificacion(promedio, cantidad) {
  const valor = promedioConComa(promedio, cantidad);
  if (!valor) return '';
  return `${valor} de 5 estrellas, ${cantidad} ${cantidad === 1 ? 'opinión' : 'opiniones'}`;
}

export default function CalificacionComercio({ promedio, cantidad, tamano = tamanos.chico, estilo }) {
  const { colores } = useTema();
  const valor = promedioConComa(promedio, cantidad);
  if (!valor) return null;
  return (
    <View
      style={[estilos.fila, estilo]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={textoCalificacion(promedio, cantidad)}
    >
      <Icono nombre="star" tamano={tamano + 1} color={colores.ambar} />
      <Text style={[estilos.valor, { color: colores.titulo, fontSize: tamano }]}>{valor}</Text>
      <Text style={[estilos.cantidad, { color: colores.gris, fontSize: tamano }]}>({cantidad})</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  valor: {
    fontFamily: fuentes.negrita,
  },
  cantidad: {
    fontFamily: fuentes.normal,
  },
});
