// Editar mis datos (desde Perfil): foto, nombre, apellido, email, teléfono, ciudad y avisos por email.
// Con el estilo de Inicio: la tarjeta verde arriba con la foto montada sobre su borde,
// los campos agrupados en tarjetas ("Datos personales", "Contacto", "Avisos") y el botón verde oscuro.
// Usa GET /api/auth/yo/ para completar y PATCH /api/auth/yo/ (multipart) para guardar.
// Django valida lo mismo que "Mis datos" de la web (la foto se recorta en un cuadrado de 400×400).
// Para cambiar el email pide la contraseña actual (el campo aparece solo si el email cambia).
// Los datos del comercio u organización se editan en EditarComercio / EditarOrganizacion (desde Perfil).
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import TarjetaVerde from '../componentes/TarjetaVerde';
import { useSesion } from '../contexto/Sesion';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, sombra, tamanos, useTema } from '../tema';
import { textoError, vibrar } from '../utilidades';

const CAMPOS = ['first_name', 'last_name', 'email', 'telefono', 'ciudad'];
const TAMANO_FOTO = 124; // con el aro de 4 incluido

// Tarjeta blanca (en oscuro, colores.panel) con un título chiquito con ícono arriba
function Grupo({ icono, titulo, children }) {
  const { colores, esOscuro } = useTema();
  return (
    <View
      style={[
        estilos.grupo,
        { backgroundColor: esOscuro ? colores.panel : colores.fondo, borderColor: colores.borde },
        sombra(colores),
      ]}
    >
      <View style={estilos.tituloGrupo}>
        <Icono nombre={icono} tamano={16} color={colores.verdeHover} />
        <Text style={[estilos.textoTituloGrupo, { color: colores.titulo }]} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function EditarPerfil({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario, actualizarUsuario } = useSesion();
  const responsable = usuario?.rol === 'comercio' || usuario?.rol === 'organizacion';

  const [valores, setValores] = useState({ first_name: '', last_name: '', email: '', telefono: '', ciudad: '' });
  const [emailGuardado, setEmailGuardado] = useState(''); // para saber si cambió (y pedir la contraseña)
  const [claveActual, setClaveActual] = useState('');
  const [avisos, setAvisos] = useState(true);
  const [fotoActual, setFotoActual] = useState(null); // la que ya está en Django
  const [fotoNueva, setFotoNueva] = useState(null); // la elegida en el celular (todavía sin subir)
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const yo = await api('/auth/yo/');
        setValores(Object.fromEntries(CAMPOS.map((c) => [c, yo[c] || ''])));
        setEmailGuardado(yo.email || '');
        setAvisos(yo.avisos_email !== false);
        setFotoActual(urlCompleta(yo.foto));
      } catch (e) {
        setErrorGeneral(e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const cambiar = (campo) => (valor) => setValores((v) => ({ ...v, [campo]: valor }));

  async function usarCamara() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(t('comun.sinPermiso'), t('foto.sinPermisoCamara'));
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!r.canceled) elegida(r.assets[0]);
  }

  async function usarGaleria() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!r.canceled) elegida(r.assets[0]);
  }

  function elegida(foto) {
    setFotoNueva(foto);
    setQuitarFoto(false);
    setErrores((e) => ({ ...e, foto: undefined }));
  }

  const foto = fotoNueva?.uri || (quitarFoto ? null : fotoActual);
  // Igual que Django: el email se compara sin mayúsculas ni espacios
  const cambioEmail = valores.email.trim().toLowerCase() !== emailGuardado.toLowerCase();

  function opcionesFoto() {
    const opciones = [
      { text: t('foto.sacarUna'), onPress: usarCamara },
      { text: t('foto.galeria'), onPress: usarGaleria },
    ];
    if (foto) {
      opciones.push({
        text: t('foto.quitar'),
        style: 'destructive',
        onPress: () => {
          setFotoNueva(null);
          setQuitarFoto(true);
        },
      });
    }
    opciones.push({ text: t('comun.cancelar'), style: 'cancel' });
    Alert.alert(t('editarPerfil.fotoDePerfil'), responsable ? t('editarPerfil.puedeSerLogo') : undefined, opciones);
  }

  async function guardar() {
    setErrores({});
    setErrorGeneral('');
    const datos = new FormData();
    CAMPOS.forEach((c) => datos.append(c, valores[c].trim()));
    datos.append('avisos_email', avisos ? 'true' : 'false');
    if (cambioEmail) datos.append('clave_actual', claveActual);
    if (fotoNueva) {
      // Igual que en FormProducto: la foto va como un File de expo-file-system (ya trae nombre y tipo)
      datos.append('foto', new File(fotoNueva.uri));
    } else if (quitarFoto) {
      datos.append('quitar_foto', 'true');
    }

    setGuardando(true);
    try {
      const actualizado = await api('/auth/yo/', { metodo: 'PATCH', datos });
      await actualizarUsuario(actualizado); // el nombre y la foto nuevos se ven en toda la app
      setClaveActual('');
      vibrar('exito');
      Alert.alert(t('comun.listo'), t('editarPerfil.datosActualizados'));
      navigation.goBack();
    } catch (e) {
      if (e?.sinConexion || e?.error || e?.detail) {
        setErrorGeneral(e);
      } else {
        // Errores de Django por campo: { "telefono": ["Asegúrese de que este valor tenga como máximo 20 caracteres..."] }
        setErrores(e || {});
        setErrorGeneral(e?.foto ? '' : t('comun.revisaCampos'));
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Cargando texto={t('editarPerfil.cargando')} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        {/* La tarjeta verde y la foto montada sobre su borde de abajo (mitad adentro, mitad afuera) */}
        <View>
          <TarjetaVerde titulo={t('editarPerfil.titulo')} abajo={t('editarPerfil.subtitulo')} estilo={estilos.cabecera} />
          <View style={estilos.zonaFoto}>
            <Pressable
              onPress={opcionesFoto}
              accessibilityRole="button"
              accessibilityLabel={foto ? t('editarPerfil.cambiarOQuitarFoto') : t('editarPerfil.agregarFotoAccesible')}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
            >
              {/* El aro es del color del fondo: en claro, blanco */}
              <View style={[estilos.foto, { backgroundColor: colores.campo, borderColor: colores.fondo }]}>
                {foto ? (
                  <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} />
                ) : (
                  <Icono nombre="image-outline" tamano={40} color={colores.titulo} />
                )}
              </View>
              {/* Afuera del círculo para que no lo recorte */}
              <View style={[estilos.lapiz, { backgroundColor: colores.verdeProfundo, borderColor: colores.fondo }]}>
                <Icono nombre="camera" tamano={15} color={colores.sobreVerdeProfundo} />
              </View>
            </Pressable>
            <Boton texto={foto ? t('editarPerfil.cambiarFoto') : t('editarPerfil.agregarFoto')} variante="texto" chico onPress={opcionesFoto} />
            {errores.foto ? (
              <Text style={[estilos.errorFoto, { color: colores.error }]}>{textoError(errores.foto)}</Text>
            ) : null}
          </View>
        </View>

        <Grupo icono="person-outline" titulo={t('editarPerfil.grupoPersonales')}>
          <Campo
            etiqueta={responsable ? t('editarPerfil.nombreResponsable') : t('editarPerfil.nombre')}
            value={valores.first_name}
            onChangeText={cambiar('first_name')}
            error={errores.first_name}
            autoComplete="given-name"
            maxLength={150}
          />
          <Campo
            etiqueta={responsable ? t('editarPerfil.apellidoResponsable') : t('editarPerfil.apellido')}
            value={valores.last_name}
            onChangeText={cambiar('last_name')}
            error={errores.last_name}
            autoComplete="family-name"
            maxLength={150}
          />
        </Grupo>

        <Grupo icono="mail-outline" titulo={t('editarPerfil.grupoContacto')}>
          <Campo
            etiqueta={t('editarPerfil.email')}
            placeholder={t('editarPerfil.emailEjemplo')}
            value={valores.email}
            onChangeText={cambiar('email')}
            error={errores.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={254}
          />
          {cambioEmail ? (
            <View style={{ gap: espacio(0.5) }}>
              <Campo
                etiqueta={t('editarPerfil.claveActual')}
                placeholder={t('editarPerfil.claveActualEjemplo')}
                value={claveActual}
                onChangeText={setClaveActual}
                error={errores.clave_actual}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
              />
              <Text style={[estilos.ayuda, { color: colores.gris }]}>
                {t('editarPerfil.emailNuevoAviso')}
              </Text>
            </View>
          ) : null}
          <Campo
            etiqueta={t('editarPerfil.telefono')}
            placeholder="351 555 1234"
            value={valores.telefono}
            onChangeText={cambiar('telefono')}
            error={errores.telefono}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={20}
          />
          <Campo
            etiqueta={t('editarPerfil.ciudad')}
            placeholder={t('editarPerfil.ciudadEjemplo')}
            value={valores.ciudad}
            onChangeText={cambiar('ciudad')}
            error={errores.ciudad}
            maxLength={100}
            onSubmitEditing={guardar}
          />
        </Grupo>

        {/* Avisos por email (igual que "Avisos por email" de la web) */}
        <Grupo icono="notifications-outline" titulo={t('editarPerfil.grupoAvisos')}>
          <View style={estilos.avisos}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.tituloAvisos, { color: colores.texto }]}>{t('editarPerfil.avisos')}</Text>
              <Text style={[estilos.ayuda, { color: colores.gris }]}>
                {t('editarPerfil.avisosAyuda')}
              </Text>
            </View>
            <Switch
              value={avisos}
              onValueChange={setAvisos}
              accessibilityLabel={t('editarPerfil.avisos')}
              trackColor={{ false: colores.borde, true: colores.verde }}
              thumbColor={Platform.OS === 'android' ? (avisos ? colores.verdeProfundo : colores.fondo) : undefined}
              ios_backgroundColor={colores.borde}
            />
          </View>
          {errores.avisos_email ? (
            <Text style={[estilos.ayuda, { color: colores.error }]}>{textoError(errores.avisos_email)}</Text>
          ) : null}
        </Grupo>

        <MensajeError mensaje={errorGeneral} />

        {/* Boton ya es verdeProfundo, redondeado y se achica un poco al tocarlo */}
        <Boton texto={t('comun.guardarCambios')} onPress={guardar} cargando={guardando} estilo={estilos.boton} />
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
  // Abajo queda lugar para la mitad de la foto, que se monta sobre el borde
  cabecera: {
    paddingBottom: TAMANO_FOTO / 2 + 16,
  },
  zonaFoto: {
    alignItems: 'center',
    gap: espacio(0.5),
    marginTop: -TAMANO_FOTO / 2,
  },
  foto: {
    width: TAMANO_FOTO,
    height: TAMANO_FOTO,
    borderRadius: TAMANO_FOTO / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lapiz: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorFoto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  grupo: {
    gap: espacio(2),
    padding: espacio(2),
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tituloGrupo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(0.75),
    marginBottom: -espacio(0.5),
  },
  textoTituloGrupo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.chico,
  },
  boton: {
    width: '100%',
    marginTop: espacio(1),
  },
  ayuda: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini + 1,
    lineHeight: 16,
  },
  avisos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  tituloAvisos: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
});
