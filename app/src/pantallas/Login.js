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
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, tamanos, useTema } from '../tema';

// Los textos son los del mockup (claves de idiomas/es.js, se muestran con t())
const ROLES = [
  {
    id: 'consumidor',
    titulo: 'login.consumidor',
    icono: 'cart-outline',
    frase: 'login.consumidorFrase',
    usuario: 'login.consumidorUsuario',
    boton: 'login.consumidorBoton',
  },
  {
    id: 'organizacion',
    titulo: 'login.fundacion',
    icono: 'heart-outline',
    frase: 'login.fundacionFrase',
    usuario: 'login.fundacionUsuario',
    boton: 'login.fundacionBoton',
  },
  {
    id: 'comercio',
    titulo: 'login.comercio',
    icono: 'storefront-outline',
    frase: 'login.comercioFrase',
    usuario: 'login.comercioUsuario',
    boton: 'login.comercioBoton',
  },
];

export default function Login({ navigation, route }) {
  const { colores } = useTema();
  const { t } = useIdioma();
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
      setError(t('login.completa'));
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
        const tituloReal = ROLES.find((r) => r.id === e.rolReal)?.titulo;
        setError(t('login.otroRol', { rol: tituloReal ? t(tituloReal) : e.rolReal }));
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
          <Text style={estilos.textoOmitir}>{t('login.omitir')}</Text>
        </Pressable>

        <Logo ancho={120} />

        <Text style={[estilos.titulo, { color: colores.titulo }]}>{t('login.ingresaATuCuenta')}</Text>

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
                  {t(r.titulo)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Recuadro gris con la frase del rol */}
        <View style={[estilos.frase, { backgroundColor: colores.panel, borderColor: colores.borde }]}>
          <Text style={[estilos.textoFrase, { color: colores.texto }]}>{t(rolElegido.frase)}</Text>
        </View>

        <View style={estilos.campos}>
          <Campo
            etiqueta={t(rolElegido.usuario)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={usuario}
            onChangeText={setUsuario}
          />
          <Campo
            etiqueta={t('login.contrasena')}
            secureTextEntry
            textContentType="password"
            value={clave}
            onChangeText={setClave}
            onSubmitEditing={ingresar}
          />
          <Pressable
            onPress={() => navigation?.navigate('RecuperarClave', { email: usuario.includes('@') ? usuario.trim() : '' })}
            hitSlop={8}
            accessibilityRole="link"
            style={estilos.olvide}
          >
            <Text style={[estilos.textoOlvide, { color: colores.verdeHover }]}>{t('login.olvidaste')}</Text>
          </Pressable>
        </View>

        <MensajeError mensaje={error} />

        <Boton texto={t(rolElegido.boton)} onPress={ingresar} cargando={enviando} estilo={estilos.boton} />

        <Pressable onPress={() => navigation?.navigate('Registro')} accessibilityRole="link" style={estilos.registro}>
          <Text style={[estilos.textoRegistro, { color: colores.titulo }]}>{t('login.sinCuenta')}</Text>
          <Text style={[estilos.textoRegistro, { color: colores.verdeHover, fontFamily: fuentes.negrita }]}>
            {t('login.registrate')}
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
  olvide: {
    alignSelf: 'flex-end',
    marginTop: -espacio(1),
  },
  textoOlvide: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.chico,
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
