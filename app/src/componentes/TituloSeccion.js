// Título de sección: texto verde semibold a la izquierda y, opcional, "Ver todo" (o "Historial") en gris a la derecha.
// Sin íconos. Deja 24 de aire arriba.
// Uso:  <TituloSeccion texto="Cerca tuyo" accion="Ver todo" alTocarAccion={() => navigation.navigate('Mapa')} />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, useTema } from '../tema';

export default function TituloSeccion({ texto, accion, alTocarAccion, estilo }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.fila, estilo]}>
      <Text style={[estilos.titulo, { color: colores.verdeProfundo }]} accessibilityRole="header" numberOfLines={1}>
        {texto}
      </Text>
      {accion ? (
        <Pressable
          onPress={alTocarAccion}
          hitSlop={10}
          accessibilityRole="link"
          accessibilityLabel={`${accion}: ${texto}`}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={[estilos.accion, { color: colores.grisVerde }]}>{accion}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: espacio(1),
    marginTop: espacio(3),
    marginBottom: espacio(1.25),
  },
  titulo: {
    flexShrink: 1,
    fontFamily: fuentes.semi,
    fontSize: 15,
  },
  accion: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
});
