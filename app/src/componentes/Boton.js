// Botón de Lüp.
// Uso:
//   <Boton texto="Ingresar" onPress={ingresar} />
//   <Boton texto="Cancelar" variante="secundario" onPress={...} />
//   <Boton texto="Guardando..." cargando />
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { espacio, fuentes, radio, tamanos, useTema } from '../tema';

export default function Boton({
  texto,
  onPress,
  variante = 'principal', // 'principal' (verde lleno) o 'secundario' (con borde)
  cargando = false,
  deshabilitado = false,
  estilo,
}) {
  const { colores } = useTema();
  const esPrincipal = variante === 'principal';
  const inactivo = deshabilitado || cargando;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.boton,
        esPrincipal
          ? { backgroundColor: pressed ? colores.verdeHover : colores.verde }
          : {
              backgroundColor: pressed ? colores.menta : 'transparent',
              borderWidth: 1.5,
              borderColor: colores.verde,
            },
        inactivo && { opacity: 0.6 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={esPrincipal ? colores.sobreVerde : colores.verde} />
      ) : (
        <Text style={[estilos.texto, { color: esPrincipal ? colores.sobreVerde : colores.verdeHover }]}>
          {texto}
        </Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 50,
    borderRadius: radio,
    paddingHorizontal: espacio(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
});
