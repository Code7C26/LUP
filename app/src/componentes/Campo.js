// Campo de texto como el mockup: etiqueta en negrita arriba y caja gris con borde fino.
// Uso:
//   <Campo etiqueta="Usuario o email" value={usuario} onChangeText={setUsuario} />
//   <Campo icono="search" placeholder="Buscar..." value={texto} onChangeText={setTexto} />
//   <Campo icono="lock-closed-outline" placeholder="Contraseña" secureTextEntry ... />  ← agrega el ojito
//   <Campo etiqueta="Descripción" multiline estiloInput={{ minHeight: 96 }} />
// Acepta cualquier otra propiedad de TextInput (placeholder, keyboardType, autoCapitalize...).
// "estilo" es para el contenedor y "estiloInput" se suma al estilo de la caja de texto.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';
import Icono from './Icono';

export default function Campo({ etiqueta, error, icono, estilo, estiloInput, secureTextEntry, ...propsDelInput }) {
  const { colores } = useTema();
  const mensaje = textoError(error);
  const [enfocado, setEnfocado] = useState(false);
  const [verClave, setVerClave] = useState(false);

  const colorBorde = mensaje ? colores.error : enfocado ? colores.verde : colores.borde;

  return (
    <View style={[estilos.contenedor, estilo]}>
      {etiqueta ? <Text style={[estilos.etiqueta, { color: colores.titulo }]}>{etiqueta}</Text> : null}
      <View
        style={[
          estilos.caja,
          { backgroundColor: colores.campo, borderColor: colorBorde },
          propsDelInput.multiline && { alignItems: 'flex-start', paddingVertical: espacio(1.5) },
        ]}
      >
        {icono ? <Icono nombre={icono} tamano={20} color={enfocado ? colores.verde : colores.gris} /> : null}
        <TextInput
          placeholderTextColor={colores.gris}
          accessibilityLabel={etiqueta || propsDelInput.placeholder}
          secureTextEntry={secureTextEntry && !verClave}
          style={[estilos.input, { color: colores.texto }, estiloInput]}
          {...propsDelInput}
          onFocus={(e) => {
            setEnfocado(true);
            propsDelInput.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            propsDelInput.onBlur?.(e);
          }}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setVerClave((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Icono nombre={verClave ? 'eye-off-outline' : 'eye-outline'} tamano={20} color={colores.gris} />
          </Pressable>
        ) : null}
      </View>
      {mensaje ? <Text style={[estilos.error, { color: colores.error }]}>{mensaje}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espacio(0.75),
  },
  etiqueta: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.chico,
  },
  caja: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: espacio(2),
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  error: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
