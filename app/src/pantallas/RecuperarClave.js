// "¿Olvidaste tu contraseña?" (desde el Login): pide el email y Django manda por Gmail
// el link para elegir una contraseña nueva en la web (POST /api/auth/recuperar/).
// Con la contraseña nueva se vuelve a ingresar en la app.
// Estilo del Login del mockup: logo, título, recuadro gris con la explicación, campo y botón verde oscuro.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import BotonVolver from '../componentes/BotonVolver';
import Campo from '../componentes/Campo';
import Icono from '../componentes/Icono';
import Logo from '../componentes/Logo';
import MensajeError from '../componentes/MensajeError';
import { espacio, fuentes, tamanos, useTema } from '../tema';

export default function RecuperarClave({ navigation, route }) {
  const { colores } = useTema();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(''); // el mensaje de Django cuando se mandó

  async function enviar() {
    setError('');
    const limpio = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(limpio)) {
      setError('Escribí el email de tu cuenta.');
      return;
    }
    setEnviando(true);
    try {
      const r = await api('/auth/recuperar/', { metodo: 'POST', datos: { email: limpio } });
      setListo(r.mensaje);
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Logo ancho={110} />

        {listo ? (
          <>
            <View style={[estilos.circulo, { backgroundColor: colores.menta }]}>
              <Icono nombre="mail-unread-outline" tamano={38} color={colores.verdeHover} />
            </View>
            <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
              Revisá tu email
            </Text>
            <View style={[estilos.recuadro, { backgroundColor: colores.panel, borderColor: colores.borde }]} accessibilityLiveRegion="polite">
              <Text style={[estilos.textoRecuadro, { color: colores.texto }]}>{listo}</Text>
            </View>
            <Text style={[estilos.pasos, { color: colores.gris }]}>
              Abrí el link del email, elegí tu contraseña nueva y volvé acá para ingresar con ella.
            </Text>
            <Boton texto="Volver a iniciar sesión" onPress={() => navigation.goBack()} estilo={estilos.boton} />
            <Boton texto="No me llegó, mandar de nuevo" variante="texto" chico onPress={() => setListo('')} />
          </>
        ) : (
          <>
            <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
              ¿Olvidaste tu contraseña?
            </Text>
            <View style={[estilos.recuadro, { backgroundColor: colores.panel, borderColor: colores.borde }]}>
              <Text style={[estilos.textoRecuadro, { color: colores.texto }]}>
                Escribí el email de tu cuenta y te mandamos un link para elegir una nueva.
              </Text>
            </View>
            <Campo
              etiqueta="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={enviar}
              estilo={{ marginTop: espacio(1.5) }}
            />
            <MensajeError mensaje={error} />
            <Boton texto="Mandarme el link" onPress={enviar} cargando={enviando} estilo={estilos.boton} />
          </>
        )}
      </ScrollView>
      <BotonVolver navigation={navigation} />
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espacio(3),
    paddingTop: espacio(9),
    paddingBottom: espacio(4),
    gap: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.normal,
    fontSize: 20,
    textAlign: 'center',
  },
  recuadro: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: espacio(1.5),
    paddingVertical: espacio(1.25),
  },
  textoRecuadro: {
    fontFamily: fuentes.normal,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  circulo: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasos: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  boton: {
    alignSelf: 'center',
    width: '82%',
    marginTop: espacio(1),
  },
});
