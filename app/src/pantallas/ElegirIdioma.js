// "Elegí tu idioma / Choose your language": la PRIMERA vez que se abre la app (no hay idioma guardado),
// antes de la portada y de la bienvenida. El logo y dos tarjetas grandes: Español y English.
// Al tocar una se guarda (cambiarIdioma) y la app sigue sola (navegacion/index.js). Las veces siguientes no aparece.
// Los títulos se muestran en los DOS idiomas a la vez, porque todavía no se sabe cuál lee la persona.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icono from '../componentes/Icono';
import Logo from '../componentes/Logo';
import { cambiarIdioma, idiomaDelCelular, traducir } from '../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';

function Tarjeta({ codigo, sugerido, alElegir }) {
  const { colores } = useTema();
  const nombre = traducir(codigo, 'idiomaInicial.nombre');
  const detalle = sugerido ? traducir(codigo, 'idiomaInicial.delCelular') : traducir(codigo, 'idiomaInicial.detalle');
  return (
    <Pressable
      onPress={alElegir}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}. ${detalle}`}
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: colores.superficie, borderColor: sugerido ? colores.verde : colores.borde },
        sombra(colores),
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[estilos.sigla, { backgroundColor: colores.suaves.verde.fondo }]}>
        <Text style={[estilos.textoSigla, { color: colores.suaves.verde.icono }]}>{codigo.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[estilos.nombre, { color: colores.titulo }]}>{nombre}</Text>
        <Text style={[estilos.detalle, { color: colores.gris }]}>{detalle}</Text>
      </View>
      <Icono nombre="chevron-forward" tamano={20} color={colores.gris} />
    </Pressable>
  );
}

export default function ElegirIdioma() {
  const { colores } = useTema();
  const { top, bottom } = useSafeAreaInsets();
  const delCelular = idiomaDelCelular();

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={[estilos.contenido, { paddingTop: top + espacio(6), paddingBottom: bottom + espacio(4) }]}
    >
      <Logo ancho={130} />
      <View style={estilos.titulos}>
        <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
          {traducir('es', 'idiomaInicial.titulo')}
        </Text>
        <Text style={[estilos.titulo, { color: colores.gris }]}>
          {traducir('en', 'idiomaInicial.titulo')}
        </Text>
      </View>

      <View style={estilos.tarjetas}>
        <Tarjeta codigo="es" sugerido={delCelular === 'es'} alElegir={() => cambiarIdioma('es')} />
        <Tarjeta codigo="en" sugerido={delCelular === 'en'} alElegir={() => cambiarIdioma('en')} />
      </View>

      <Text style={[estilos.pie, { color: colores.gris }]}>
        {traducir('es', 'idiomaInicial.despues')}
        {'\n'}
        {traducir('en', 'idiomaInicial.despues')}
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espacio(3),
    gap: espacio(4),
  },
  titulos: {
    alignItems: 'center',
    gap: 4,
  },
  titulo: {
    fontFamily: fuentes.marca,
    fontSize: tamanos.grande,
    textAlign: 'center',
  },
  tarjetas: {
    gap: espacio(2),
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(2),
    minHeight: 92,
    paddingHorizontal: espacio(2.5),
    paddingVertical: espacio(2),
    borderRadius: radio + 4,
    borderWidth: 1.5,
  },
  sigla: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSigla: {
    fontFamily: fuentes.marca,
    fontSize: tamanos.mediano,
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  pie: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
    lineHeight: 20,
  },
});
