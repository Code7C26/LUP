// Editar mis datos (desde Perfil): foto, nombre, apellido, teléfono y ciudad.
// Estilo del mockup (página 12, "Nuevo Producto"): título grande con ícono, la foto en un recuadro,
// campos grises redondeados y el botón verde oscuro.
// Usa GET /api/auth/yo/ para completar y PATCH /api/auth/yo/ (multipart) para guardar.
// Django valida lo mismo que "Mis datos" de la web (la foto se recorta en un cuadrado de 400×400).
// El email y los datos del comercio u organización se cambian desde la web.
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import { textoError, vibrar } from '../utilidades';

const CAMPOS = ['first_name', 'last_name', 'telefono', 'ciudad'];

export default function EditarPerfil({ navigation }) {
  const { colores } = useTema();
  const { usuario, actualizarUsuario } = useSesion();
  const responsable = usuario?.rol === 'comercio' || usuario?.rol === 'organizacion';

  const [valores, setValores] = useState({ first_name: '', last_name: '', telefono: '', ciudad: '' });
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
      Alert.alert('Sin permiso', 'Dale permiso a Lüp para usar la cámara, o elegí una foto de la galería.');
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

  function opcionesFoto() {
    const opciones = [
      { text: 'Sacar una foto', onPress: usarCamara },
      { text: 'Elegir de la galería', onPress: usarGaleria },
    ];
    if (foto) {
      opciones.push({
        text: 'Quitar la foto',
        style: 'destructive',
        onPress: () => {
          setFotoNueva(null);
          setQuitarFoto(true);
        },
      });
    }
    opciones.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Foto de perfil', responsable ? 'Puede ser el logo de tu comercio u organización.' : undefined, opciones);
  }

  async function guardar() {
    setErrores({});
    setErrorGeneral('');
    const datos = new FormData();
    CAMPOS.forEach((c) => datos.append(c, valores[c].trim()));
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
      vibrar('exito');
      Alert.alert('Listo', 'Tus datos se actualizaron.');
      navigation.goBack();
    } catch (e) {
      if (e?.sinConexion || e?.error || e?.detail) {
        setErrorGeneral(e);
      } else {
        // Errores de Django por campo: { "telefono": ["Asegúrese de que este valor tenga como máximo 20 caracteres..."] }
        setErrores(e || {});
        setErrorGeneral(e?.foto ? '' : 'Revisá los campos marcados en rojo.');
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Cargando texto="Cargando tus datos…" />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <Icono nombre="person-circle-outline" tamano={30} color={colores.titulo} />
          <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
            Editar mis datos
          </Text>
        </View>

        {/* Foto: el recuadro gris del mockup, redondo como en Perfil */}
        <View style={estilos.zonaFoto}>
          <Pressable
            onPress={opcionesFoto}
            accessibilityRole="button"
            accessibilityLabel={foto ? 'Cambiar o quitar la foto de perfil' : 'Agregar una foto de perfil'}
            style={({ pressed }) => pressed && { opacity: 0.8 }}
          >
            <View style={[estilos.foto, { backgroundColor: colores.campo }]}>
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
          <Boton texto={foto ? 'Cambiar foto' : 'Agregar foto'} variante="texto" chico onPress={opcionesFoto} />
          {errores.foto ? (
            <Text style={[estilos.errorFoto, { color: colores.error }]}>{textoError(errores.foto)}</Text>
          ) : null}
        </View>

        <View style={estilos.campos}>
          <Campo
            etiqueta={responsable ? 'Nombre del responsable' : 'Nombre'}
            value={valores.first_name}
            onChangeText={cambiar('first_name')}
            error={errores.first_name}
            autoComplete="given-name"
            maxLength={150}
          />
          <Campo
            etiqueta={responsable ? 'Apellido del responsable' : 'Apellido'}
            value={valores.last_name}
            onChangeText={cambiar('last_name')}
            error={errores.last_name}
            autoComplete="family-name"
            maxLength={150}
          />
          <Campo
            etiqueta="Teléfono"
            placeholder="351 555 1234"
            value={valores.telefono}
            onChangeText={cambiar('telefono')}
            error={errores.telefono}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={20}
          />
          <Campo
            etiqueta="Ciudad"
            placeholder="Ej: Alta Gracia"
            value={valores.ciudad}
            onChangeText={cambiar('ciudad')}
            error={errores.ciudad}
            maxLength={100}
            onSubmitEditing={guardar}
          />
        </View>

        <MensajeError mensaje={errorGeneral} />

        <Boton texto="Guardar cambios" onPress={guardar} cargando={guardando} estilo={estilos.boton} />
        <Text style={[estilos.nota, { color: colores.gris }]}>
          El email{responsable ? ' y los datos de tu comercio u organización' : ''} se cambian desde la web, en Mis datos.
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
  zonaFoto: {
    alignItems: 'center',
    gap: espacio(0.5),
  },
  foto: {
    width: 116,
    height: 116,
    borderRadius: 58,
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
  campos: {
    gap: espacio(2),
  },
  boton: {
    alignSelf: 'center',
    width: '82%',
    marginTop: espacio(1),
  },
  nota: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mini,
    textAlign: 'center',
    marginTop: -espacio(1),
  },
});
