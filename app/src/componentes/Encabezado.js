// Título grande de cada pestaña, con un botón redondo opcional a la derecha.
// Uso:
//   <Encabezado titulo="Mis productos" icono="add" alTocar={() => navigation.navigate('FormProducto')} etiqueta="Nuevo producto" />
//   <Encabezado titulo="Mis reservas" subtitulo="2 para retirar" />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function Encabezado({ titulo, subtitulo, icono, alTocar, etiqueta }) {
  const { colores } = useTema();
  return (
    <View style={estilos.fila}>
      <View style={{ flex: 1 }}>
        {subtitulo ? <Text style={[estilos.subtitulo, { color: colores.gris }]}>{subtitulo}</Text> : null}
        <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {icono ? (
        <Pressable
          onPress={alTocar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={etiqueta}
          style={({ pressed }) => [estilos.boton, { backgroundColor: colores.verdeProfundo }, pressed && { opacity: 0.8 }]}
        >
          <Icono nombre={icono} tamano={22} color={colores.sobreVerdeProfundo} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  subtitulo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  boton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
