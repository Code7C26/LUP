// Botón de Lüp: píldora verde oscuro con letra Poppins en negrita, igual al mockup.
// Uso:
//   <Boton texto="Ingresar" onPress={ingresar} />
//   <Boton texto="Cómo llegar" icono="navigate-outline" variante="secundario" onPress={...} />
//   <Boton texto="Cancelar" variante="texto" onPress={...} />
//   <Boton texto="Guardando..." cargando />
//   <Boton texto="Chico" chico />
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import Icono from './Icono';

export default function Boton({
  texto,
  onPress,
  variante = 'principal', // 'principal' (lleno), 'secundario' (con borde) o 'texto' (sin fondo)
  icono, // nombre de Ionicons, opcional
  etiqueta, // texto para lectores de pantalla (si el botón es solo un ícono)
  chico = false,
  cargando = false,
  deshabilitado = false,
  estilo,
}) {
  const { colores } = useTema();
  const inactivo = deshabilitado || cargando;

  const fondo = {
    principal: colores.verdeProfundo,
    secundario: 'transparent',
    texto: 'transparent',
  }[variante];
  const colorTexto = variante === 'principal' ? colores.sobreVerdeProfundo : colores.verdeHover;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={etiqueta || texto}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.boton,
        chico && estilos.chico,
        { backgroundColor: fondo },
        variante === 'secundario' && { borderWidth: 1.5, borderColor: colores.verdeProfundo },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        inactivo && { opacity: 0.45 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <View style={estilos.fila}>
          {icono ? <Icono nombre={icono} tamano={chico ? 16 : 19} color={colorTexto} /> : null}
          {texto ? (
            <Text numberOfLines={1} style={[estilos.texto, chico && estilos.textoChico, { color: colorTexto }]}>
              {texto}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: espacio(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chico: {
    minHeight: 34,
    paddingHorizontal: espacio(2),
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  texto: {
    fontFamily: fuentes.boton,
    fontSize: 14,
  },
  textoChico: {
    fontFamily: fuentes.botonMedio,
    fontSize: 12,
  },
});
