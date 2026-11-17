// Selector Automático / Español / English, con el mismo diseño que SelectorApariencia.
// Se usa en Perfil. Lo elegido queda guardado en el celular y toda la app cambia al instante
// (contexto/Idioma.js). "Español" y "English" se muestran siempre en su idioma, para encontrarlos.
// Uso:  <SelectorIdioma />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function SelectorIdioma() {
  const { colores } = useTema();
  const { opcion, t, cambiarIdioma } = useIdioma();
  const opciones = [
    ['auto', t('idioma.auto'), 'phone-portrait-outline', t('idioma.autoAccesible')],
    ['es', 'Español', 'language-outline', 'Español'],
    ['en', 'English', 'language-outline', 'English'],
  ];
  return (
    <View style={[estilos.segmento, { backgroundColor: colores.campo }]} accessibilityRole="radiogroup">
      {opciones.map(([clave, texto, icono, accesible]) => {
        const activa = opcion === clave;
        const color = activa ? colores.sobreVerdeProfundo : colores.gris;
        return (
          <Pressable
            key={clave}
            onPress={() => cambiarIdioma(clave)}
            accessibilityRole="radio"
            accessibilityLabel={accesible}
            accessibilityState={{ selected: activa }}
            style={[estilos.opcion, activa && { backgroundColor: colores.verdeProfundo }]}
          >
            <Icono nombre={icono} tamano={16} color={color} />
            <Text style={[estilos.textoOpcion, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {texto}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  segmento: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
  },
  opcion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: espacio(1),
    paddingHorizontal: 4,
    borderRadius: 999,
  },
  textoOpcion: {
    flexShrink: 1,
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
});
