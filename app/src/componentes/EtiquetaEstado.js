// Etiquetas chicas para el comercio y la organización.
//
// <EtiquetaEstado>: el ESTADO de algo, con un punto de color. Tonos:
//   'verde'   → Disponible, Aprobada
//   'naranja' → Vendido, Donado, Pendiente, Ya lo pediste
//   'gris'    → Vencido, No disponible, Rechazada
//   <EtiquetaEstado texto={t('estadosProducto.DISPONIBLE')} tono="verde" />
//
// <EtiquetaInfo>: un DATO (no se toca): "Descuento", "Donaciones". Más suave que un botón:
// sin relleno fuerte ni borde, con un ícono chico.
//   <EtiquetaInfo icono="heart-outline" texto={t('catalogo.soloDonables')} />
//
// El texto del naranja va en el color de texto común (el naranja sobre naranja claro no se lee bien).
import { StyleSheet, Text, View } from 'react-native';

import { fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

function tonos(colores) {
  return {
    verde: { fondo: colores.menta, punto: colores.verde, texto: colores.verdeHover },
    naranja: { fondo: colores.ambarClaro, punto: colores.ambar, texto: colores.texto },
    // texto "titulo" (no "gris"): el gris sobre gris no llega al contraste mínimo en modo claro
    gris: { fondo: colores.campo, punto: colores.gris, texto: colores.titulo },
  };
}

export function EtiquetaEstado({ texto, tono = 'gris' }) {
  const { colores } = useTema();
  const c = tonos(colores)[tono] || tonos(colores).gris;
  return (
    <View style={[estilos.estado, { backgroundColor: c.fondo }]}>
      <View style={[estilos.punto, { backgroundColor: c.punto }]} />
      <Text style={[estilos.textoEstado, { color: c.texto }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

export function EtiquetaInfo({ icono, texto }) {
  const { colores } = useTema();
  return (
    <View style={estilos.info}>
      {icono ? <Icono nombre={icono} tamano={12} color={colores.gris} /> : null}
      <Text style={[estilos.textoInfo, { color: colores.gris }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textoEstado: {
    fontFamily: fuentes.media,
    fontSize: tamanos.mini,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  textoInfo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
  },
});
