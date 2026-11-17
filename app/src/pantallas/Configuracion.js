// Configuración (todos los roles y el invitado): Apariencia (Automático / Claro / Oscuro), Idioma
// (Automático / Español / English) y los links a Términos y condiciones y Política de privacidad de la web.
// Se abre con el engranaje de arriba a la derecha en Perfil y desde el menú ☰.
// Lo elegido se guarda en el celular y toda la app cambia al instante (tema.js y contexto/Idioma.js).
// Solo en desarrollo (__DEV__): "Reiniciar primera vez (prueba)" borra el idioma guardado y las bienvenidas vistas
// y vuelve a "Elegí tu idioma" (en iPhone SecureStore no se borra al desinstalar Expo Go). No sale en el APK.
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Boton from '../componentes/Boton';
import Encabezado from '../componentes/Encabezado';
import LinksLegales from '../componentes/LinksLegales';
import SelectorApariencia from '../componentes/SelectorApariencia';
import SelectorIdioma from '../componentes/SelectorIdioma';
import { borrarBienvenidas } from '../contexto/Bienvenida';
import { olvidarIdiomaElegido, useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';

// Mismo grupo que Perfil: título chiquito arriba y una caja gris suave
function Grupo({ titulo, children }) {
  const { colores } = useTema();
  return (
    <View style={{ gap: espacio(1) }}>
      <Text style={[estilos.tituloGrupo, { color: colores.gris }]} accessibilityRole="header">
        {titulo}
      </Text>
      <View style={[estilos.grupo, { backgroundColor: colores.superficie }, sombra(colores)]}>{children}</View>
    </View>
  );
}

export default function Configuracion() {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido}>
      <Encabezado titulo={t('configuracion.titulo')} />

      <Grupo titulo={t('configuracion.apariencia')}>
        <View style={{ padding: espacio(1) }}>
          <SelectorApariencia />
        </View>
      </Grupo>

      <Grupo titulo={t('idioma.titulo')}>
        <View style={{ padding: espacio(1) }}>
          <SelectorIdioma />
        </View>
      </Grupo>

      <Grupo titulo={t('configuracion.legal')}>
        <LinksLegales />
      </Grupo>

      {__DEV__ ? (
        <Boton
          texto={t('configuracion.reiniciarPrueba')}
          icono="refresh-outline"
          variante="secundario"
          chico
          onPress={() => {
            borrarBienvenidas(); // la intro se vuelve a ver
            olvidarIdiomaElegido(); // y la navegación muestra "Elegí tu idioma"
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(5),
    gap: espacio(2.5),
  },
  tituloGrupo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    marginLeft: espacio(1),
  },
  grupo: {
    borderRadius: radio,
    overflow: 'hidden',
  },
});
