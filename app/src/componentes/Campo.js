// Campo de texto con etiqueta arriba y mensaje de error abajo.
// Uso:
//   <Campo etiqueta="Usuario o email" value={usuario} onChangeText={setUsuario} />
//   <Campo etiqueta="Contraseña" secureTextEntry value={clave} onChangeText={setClave} error={errores.password} />
// Acepta cualquier otra propiedad de TextInput (placeholder, keyboardType, autoCapitalize...).
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';

export default function Campo({ etiqueta, error, estilo, ...propsDelInput }) {
  const { colores } = useTema();
  const mensaje = textoError(error);

  return (
    <View style={[estilos.contenedor, estilo]}>
      {etiqueta ? <Text style={[estilos.etiqueta, { color: colores.texto }]}>{etiqueta}</Text> : null}
      <TextInput
        placeholderTextColor={colores.gris}
        accessibilityLabel={etiqueta}
        style={[
          estilos.input,
          {
            backgroundColor: colores.campo,
            borderColor: mensaje ? colores.error : colores.borde,
            color: colores.texto,
          },
        ]}
        {...propsDelInput}
      />
      {mensaje ? <Text style={[estilos.error, { color: colores.error }]}>{mensaje}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espacio(0.75),
  },
  etiqueta: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: espacio(2),
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  error: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
