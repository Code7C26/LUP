// PASO 38 · Pantalla de login, como en el mockup:
// pestañas Consumidor / Organización / Comercio, usuario o email, contraseña,
// "Ingresar como...", "Registrate gratis acá" y "Omitir".
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';

// Mismos textos que la web (scr/bd_lup/users/views.py → INFO_ROLES)
const ROLES = [
  {
    id: 'consumidor',
    titulo: 'Consumidor',
    descripcion: 'Rescatá comida rica a precios reducidos en comercios cerca tuyo.',
  },
  {
    id: 'organizacion',
    titulo: 'Organización',
    descripcion: 'Recibí donaciones de alimentos para comedores, merenderos y fundaciones.',
  },
  {
    id: 'comercio',
    titulo: 'Comercio',
    descripcion: 'Vendé tus excedentes del día y recuperá ingresos en lugar de tirarlos.',
  },
];

export default function Login({ navigation }) {
  const { colores } = useTema();
  const { iniciarSesion, cerrarSesion, entrarComoInvitado } = useSesion();

  const [rol, setRol] = useState('consumidor');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const rolElegido = ROLES.find((r) => r.id === rol);

  async function ingresar() {
    setError('');
    if (!usuario.trim() || !clave) {
      setError('Completá tu usuario o email y la contraseña.');
      return;
    }
    setEnviando(true);
    try {
      const datos = await iniciarSesion(usuario.trim(), clave);
      // Igual que la web: la cuenta tiene que ser del tipo de la pestaña elegida
      if (datos.rol !== rol) {
        await cerrarSesion();
        const real = ROLES.find((r) => r.id === datos.rol)?.titulo || datos.rol;
        setError(`Esta cuenta está registrada como ${real}. Elegí esa pestaña para ingresar.`);
        return;
      }
      if (navigation?.canGoBack?.()) navigation.goBack(); // si se abrió desde Perfil (paso 37)
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  }

  function omitir() {
    entrarComoInvitado();
    if (navigation?.canGoBack?.()) navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Pressable onPress={omitir} style={estilos.omitir} accessibilityRole="button">
          <Text style={[estilos.textoOmitir, { color: colores.gris }]}>Omitir</Text>
        </Pressable>

        <View style={estilos.circuloLogo}>
          <Image source={require('../../assets/logo.png')} style={estilos.logo} resizeMode="contain" />
        </View>
        <Text style={[estilos.lema, { color: colores.gris }]}>Una segunda oportunidad para cada alimento</Text>

        <Text style={[estilos.titulo, { color: colores.titulo }]}>Ingresá a tu cuenta</Text>

        {/* Pestañas de rol */}
        <View style={[estilos.pestanas, { backgroundColor: colores.menta }]}>
          {ROLES.map((r) => {
            const activa = r.id === rol;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  setRol(r.id);
                  setError('');
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                style={[estilos.pestana, activa && { backgroundColor: colores.superficie }]}
              >
                <Text
                  numberOfLines={1}
                  style={[estilos.textoPestana, { color: activa ? colores.titulo : colores.gris }]}
                >
                  {r.titulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[estilos.descripcion, { color: colores.gris }]}>{rolElegido.descripcion}</Text>

        <Campo
          etiqueta="Usuario o email"
          placeholder="tu_usuario o tu@email.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          value={usuario}
          onChangeText={setUsuario}
        />
        <Campo
          etiqueta="Contraseña"
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
          value={clave}
          onChangeText={setClave}
          onSubmitEditing={ingresar}
        />

        <MensajeError mensaje={error} />

        <Boton texto={`Ingresar como ${rolElegido.titulo}`} onPress={ingresar} cargando={enviando} />

        <Text style={[estilos.registro, { color: colores.gris }]}>
          ¿Todavía no tenés una cuenta?{' '}
          <Text
            style={{ color: colores.verdeHover, fontFamily: fuentes.media }}
            onPress={() => navigation?.navigate('Registro')}
          >
            Registrate gratis acá
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(3),
    paddingTop: espacio(6),
    gap: espacio(2),
  },
  omitir: {
    alignSelf: 'flex-end',
    padding: espacio(1),
  },
  textoOmitir: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  circuloLogo: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F7F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 105,
    height: 88,
  },
  lema: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
    textAlign: 'center',
    marginTop: espacio(1),
  },
  pestanas: {
    flexDirection: 'row',
    borderRadius: radio,
    padding: 4,
  },
  pestana: {
    flex: 1,
    paddingVertical: espacio(1.25),
    borderRadius: radio - 4,
    alignItems: 'center',
  },
  textoPestana: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  descripcion: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  registro: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
});
