// Hoja que sube desde abajo (bottom sheet) sobre un velo oscuro: Filtros de Buscar, Calificar en Mis reservas.
// Se cierra tocando afuera, con la X o con "atrás". Sube con el teclado si adentro hay un campo.
// Uso:
//   <HojaAbajo visible={abierta} alCerrar={() => setAbierta(false)} titulo="Filtros" subtitulo="…">
//     …contenido…
//   </HojaAbajo>
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function HojaAbajo({ visible, alCerrar, titulo, subtitulo, children }) {
  const { colores, esOscuro } = useTema();
  const { t } = useIdioma();
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={alCerrar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView style={estilos.velo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityLabel={t('comun.cerrar')} />
        <View
          style={[
            estilos.hoja,
            { backgroundColor: esOscuro ? colores.panel : colores.fondo, paddingBottom: bottom + espacio(2.5) },
          ]}
        >
          <View style={[estilos.agarre, { backgroundColor: colores.borde }]} />
          <View style={estilos.cabecera}>
            <View style={estilos.textos}>
              <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
                {titulo}
              </Text>
              {subtitulo ? (
                <Text style={[estilos.subtitulo, { color: colores.gris }]} numberOfLines={1}>
                  {subtitulo}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={alCerrar}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('comun.cerrar')}
              style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}
            >
              <Icono nombre="close" tamano={22} color={colores.gris} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  velo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  hoja: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: espacio(2.5),
    paddingTop: espacio(1.25),
    gap: espacio(2),
  },
  agarre: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  subtitulo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
