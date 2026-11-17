// Términos y condiciones y Política de privacidad: abren las páginas de la web en el navegador
// (URL_SERVIDOR + '/terminos/' y '/privacidad/', las mismas que el pie de la web).
// Uso:
//   abrirTerminos()  /  abrirPrivacidad()            ← desde un link (por ejemplo, en el registro)
//   <LinksLegales />                                   ← dos filas con ícono (pantalla Configuración)
//   <LinksLegales chico />                             ← "Términos · Privacidad" chiquito (abajo del menú ☰)
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { URL_SERVIDOR } from '../api/cliente';
import { t, useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

function abrir(ruta) {
  Linking.openURL(URL_SERVIDOR + ruta).catch(() => Alert.alert(t('comun.noSePudoAbrir'), t('comun.noSePudoAbrirTexto')));
}

export const abrirTerminos = () => abrir('/terminos/');
export const abrirPrivacidad = () => abrir('/privacidad/');

export default function LinksLegales({ chico }) {
  const { colores } = useTema();
  const { t: traducir } = useIdioma();
  const links = [
    ['document-text-outline', traducir('legal.terminos'), abrirTerminos],
    ['shield-checkmark-outline', traducir('legal.privacidad'), abrirPrivacidad],
  ];

  if (chico) {
    return (
      <View style={estilos.filaChica}>
        {links.map(([, texto, alTocar], i) => (
          <View key={texto} style={estilos.filaChica}>
            {i > 0 ? <Text style={[estilos.textoChico, { color: colores.gris }]}>·</Text> : null}
            <Text
              onPress={alTocar}
              accessibilityRole="link"
              accessibilityHint={traducir('legal.abreNavegador')}
              style={[estilos.textoChico, estilos.subrayado, { color: colores.gris }]}
            >
              {texto}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      {links.map(([icono, texto, alTocar], i) => (
        <Pressable
          key={texto}
          onPress={alTocar}
          accessibilityRole="link"
          accessibilityLabel={texto}
          accessibilityHint={traducir('legal.abreNavegador')}
          style={({ pressed }) => [
            estilos.fila,
            i < links.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colores.borde },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={[estilos.circulo, { backgroundColor: colores.menta }]}>
            <Icono nombre={icono} tamano={17} color={colores.verdeHover} />
          </View>
          <Text style={[estilos.texto, { color: colores.texto }]}>{texto}</Text>
          <Icono nombre="open-outline" tamano={16} color={colores.gris} />
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingVertical: espacio(1.25),
    paddingHorizontal: espacio(1.5),
  },
  circulo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    flex: 1,
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  filaChica: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espacio(1),
  },
  textoChico: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
  },
  subrayado: {
    textDecorationLine: 'underline',
  },
});
