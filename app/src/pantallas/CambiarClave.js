// Cambiar contraseña (desde Perfil), con la sesión abierta: actual, nueva y repetir la nueva.
// POST /api/auth/cambiar-clave/ {clave_actual, clave_nueva, clave_nueva2}
// Django valida con sus reglas de contraseña (largo, muy común, solo números, parecida al usuario)
// y devuelve los errores en castellano por campo. Después de cambiarla, la sesión sigue abierta.
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import { vibrar } from '../utilidades';

export default function CambiarClave({ navigation }) {
  const { colores } = useTema();
  const { usuario } = useSesion();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  async function guardar() {
    setErrores({});
    setErrorGeneral('');
    setGuardando(true);
    try {
      const r = await api('/auth/cambiar-clave/', {
        metodo: 'POST',
        datos: { clave_actual: actual, clave_nueva: nueva, clave_nueva2: repetir },
      });
      vibrar('exito');
      Alert.alert('Contraseña cambiada', r.mensaje || 'Listo, cambiaste tu contraseña.');
      navigation.goBack();
    } catch (e) {
      if (e?.sinConexion || e?.error || e?.detail) {
        setErrorGeneral(e);
      } else {
        setErrores(e || {}); // { clave_actual: [...], clave_nueva: [...], clave_nueva2: [...] }
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <Icono nombre="key-outline" tamano={28} color={colores.titulo} />
          <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
            Cambiar contraseña
          </Text>
        </View>

        <View style={estilos.campos}>
          <Campo
            etiqueta="Contraseña actual"
            value={actual}
            onChangeText={setActual}
            error={errores.clave_actual}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />
          <Pressable
            onPress={() => navigation.navigate('RecuperarClave', { email: usuario?.email || '' })}
            hitSlop={8}
            accessibilityRole="link"
            style={estilos.olvide}
          >
            <Text style={[estilos.textoOlvide, { color: colores.verdeHover }]}>¿No te acordás de la actual?</Text>
          </Pressable>
          <Campo
            etiqueta="Contraseña nueva"
            value={nueva}
            onChangeText={setNueva}
            error={errores.clave_nueva}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {!errores.clave_nueva ? (
            <Text style={[estilos.ayuda, { color: colores.gris }]}>Mínimo 8 caracteres, no solo números.</Text>
          ) : null}
          <Campo
            etiqueta="Repetí la contraseña nueva"
            value={repetir}
            onChangeText={setRepetir}
            error={errores.clave_nueva2}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={guardar}
          />
        </View>

        <MensajeError mensaje={errorGeneral} />
        <Boton
          texto="Guardar contraseña"
          onPress={guardar}
          cargando={guardando}
          deshabilitado={!actual || !nueva || !repetir}
          estilo={estilos.boton}
        />
        <Text style={[estilos.ayuda, { color: colores.gris, textAlign: 'center' }]}>
          Vas a seguir con la sesión abierta en este celular.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(3),
    paddingTop: espacio(1),
    paddingBottom: espacio(5),
    gap: espacio(2.5),
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  titulo: {
    fontFamily: fuentes.normal,
    fontSize: 26,
  },
  campos: {
    gap: espacio(2),
  },
  olvide: {
    alignSelf: 'flex-end',
    marginTop: -espacio(1),
  },
  textoOlvide: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.chico,
  },
  ayuda: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    marginTop: -espacio(1),
  },
  boton: {
    alignSelf: 'center',
    width: '82%',
    marginTop: espacio(1),
  },
});
