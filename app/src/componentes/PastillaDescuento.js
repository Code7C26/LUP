// Pastilla "-40%" arriba a la izquierda de la foto de una oferta (Inicio y las filas de productos).
// Uso (dentro de un View que envuelve la foto):  <PastillaDescuento porcentaje={porcentajeDescuento(producto)} />
import { StyleSheet, Text, View } from 'react-native';

import { useIdioma } from '../contexto/Idioma';
import { fuentes, tamanos, useTema } from '../tema';

// Con el precio original y el precio Lüp (la API los manda como texto, "1500.00")
export function porcentajeDescuento(producto) {
  const original = Number(producto.precio_original);
  const lup = Number(producto.precio_descuento);
  if (!(original > 0) || !(lup >= 0) || lup >= original) return null;
  return Math.round((1 - lup / original) * 100) || null;
}

// "marca" (#073425 en los dos modos) con texto blanco: verdeProfundo en oscuro es verde claro
export default function PastillaDescuento({ porcentaje }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  if (!porcentaje) return null;
  return (
    <View style={[estilos.pastilla, { backgroundColor: colores.marca }]}>
      <Text style={[estilos.texto, { color: colores.sobreMarca }]}>{t('inicio.descuento', { n: porcentaje })}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pastilla: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  texto: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mini,
  },
});
