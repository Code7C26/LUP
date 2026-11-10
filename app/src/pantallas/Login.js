// PASO 38 · Login IGUAL AL MOCKUP (páginas 3, 5 y 9 del PDF):
// logo arriba, "Ingresá a tu cuenta", barra verde claro con los 3 roles,
// el recuadro gris con la frase del rol, los campos con su etiqueta en negrita,
// el botón verde oscuro y "¿Todavía no tenés una cuenta? Regístrate gratis acá".
import { useState } from 'react';
import {
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
import Icono from '../componentes/Icono';
import Logo from '../componentes/Logo';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, tamanos, useTema } from '../tema';

// Los textos son los del mockup
const ROLES = [
  {
    id: 'consumidor',
    titulo: 'Consumidor',
    icono: 'cart-outline',
    frase: 'Accedé para comprar productos con descuento cerca tuyo.',
    usuario: 'Usuario o Email',
    boton: 'Ingresar como Consumidor',
  },
  {
    id: 'organizacion',
    titulo: 'Fundación',
    icono: 'heart-outline',
    frase: 'Accedé para solicitar o recibir donaciones de alimentos.',
    usuario: 'Email Institucional o Usuario',
    boton: 'Ingresar como Fundación',
  },
  {
    id: 'comercio',
    titulo: 'Comercio',
    icono: 'storefront-outline',
    frase: 'Gestioná tus productos en oferta y donaciones publicadas.',
    usuario: 'Usuario del Comercio',
    boton: 'Ingresar a mi Comercio',
  },
];

export default function Login({ navigation, route }) {
  const { colores } = useTema();
  const { iniciarSesion, entrarComoInvitado, invitado } = useSesion();
  // Si ya estaba como invitado, el login se abrió como ventana (desde Perfil o "Reservar"): al terminar se cierra.
  // Si no, al entrar la navegación cambia sola a las pestañas.
  const enVentana = invitado;

  const [rol, setRol] = useState(route?.params?.rol || 'consumidor');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const rolElegido = ROLES.find((r) => r.id === rol) || ROLES[0];

  async function ingresar() {
    setError('');
    if (!usuario.trim() || !clave) {
      setError('Completá tu usuario y contraseña.');
      return;
    }
    setEnviando(true);
    try {
      // Igual que la web: la cuenta tiene que ser del tipo elegido arriba (se revisa antes de entrar)
      const datos = await iniciarSesion(usuario.trim(), clave, rol);
      // Al entrar, la navegación pasa sola a la bienvenida y la app. Si el login se abrió como ventana,
      // en su lugar se abre la bienvenida, y al terminarla se vuelve a donde estaba.
      if (enVentana) navigation.replace('VerBienvenida', { rol: datos.rol });
    } catch (e) {
      if (e?.rolReal) {
        const real = ROLES.find((r) => r.id === e.rolReal)?.titulo || e.rolReal;
        setError(`Esta cuenta es de ${real}. Elegí "${real}" arriba y volvé a ingresar.`);
      } else {
        setError(e);
      }
      setEnviando(false);
    }
  }

  function omitir() {
    if (enVentana && navigation?.canGoBack?.()) return navigation.goBack();
    entrarComoInvitado();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={omitir}
          hitSlop={10}
          accessibilityRole="button"
          style={[estilos.omitir, { backgroundColor: colores.borde }]}
        >
          <Text style={estilos.textoOmitir}>Omitir</Text>
        </Pressable>

        <Logo ancho={120} />

        <Text style={[estilos.titulo, { color: colores.titulo }]}>Ingresá a tu cuenta</Text>

        {/* Barra verde claro con los roles */}
        <View style={[estilos.roles, { backgroundColor: colores.verdeClaro, borderColor: colores.borde }]}>
          {ROLES.map((r) => {
            const activo = r.id === rol;
            const color = activo ? colores.sobreVerdeProfundo : colores.texto;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  setRol(r.id);
                  setError('');
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
                style={[estilos.rol, activo && { backgroundColor: colores.verdeProfundo }]}
              >
                <Icono nombre={r.icono} tamano={14} color={color} />
                <Text
                  numberOfLines={1}
                  style={[estilos.textoRol, { color, fontFamily: activo ? fuentes.negrita : fuentes.normal }]}
                >
                  {r.titulo}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Recuadro gris con la frase del rol */}
        <View style={[estilos.frase, { backgroundColor: colores.panel, borderColor: colores.borde }]}>
          <Text style={[estilos.textoFrase, { color: colores.texto }]}>{rolElegido.frase}</Text>
        </View>

        <View style={estilos.campos}>
          <Campo
            etiqueta={rolElegido.usuario}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={usuario}
            onChangeText={setUsuario}
          />
          <Campo
            etiqueta="Contraseña"
            secureTextEntry
            textContentType="password"
            value={clave}
            onChangeText={setClave}
            onSubmitEditing={ingresar}
          />
        </View>

        <MensajeError mensaje={error} />

        <Boton texto={rolElegido.boton} onPress={ingresar} cargando={enviando} estilo={estilos.boton} />

        <Pressable onPress={() => navigation?.navigate('Registro')} accessibilityRole="link" style={estilos.registro}>
          <Text style={[estilos.textoRegistro, { color: colores.titulo }]}>¿Todavía no tenés una cuenta?</Text>
          <Text style={[estilos.textoRegistro, { color: colores.verdeHover, fontFamily: fuentes.negrita }]}>
            Regístrate gratis acá
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espacio(3),
    paddingTop: espacio(8),
    paddingBottom: espacio(4),
    gap: espacio(2),
  },
  omitir: {
    position: 'absolute',
    top: espacio(6),
    right: espacio(3),
    paddingHorizontal: espacio(1.25),
    paddingVertical: 3,
    borderRadius: 999,
  },
  textoOmitir: {
    color: '#FAFAFA',
    fontFamily: fuentes.negrita,
    fontSize: 12,
  },
  titulo: {
    fontFamily: fuentes.normal,
    fontSize: 17,
    textAlign: 'center',
    marginTop: -espacio(0.5),
  },
  roles: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
  },
  rol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
  },
  textoRol: {
    fontSize: 13,
  },
  frase: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: espacio(1.5),
    paddingVertical: espacio(1.25),
  },
  textoFrase: {
    fontFamily: fuentes.normal,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  campos: {
    gap: espacio(2),
    marginTop: espacio(1.5),
  },
  boton: {
    alignSelf: 'center',
    width: '82%',
    marginTop: espacio(2),
  },
  registro: {
    alignItems: 'center',
    gap: 1,
  },
  textoRegistro: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
