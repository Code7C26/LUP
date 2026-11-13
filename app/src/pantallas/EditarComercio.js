// Datos de mi comercio (desde Perfil): lo mismo que la sección "Comercio" y "Ubicación del local"
// de "Mis datos" en la web (TiendaForm): nombre, rubro, descripción, dirección, horario y ubicación.
// Usa GET y PATCH /api/mi-comercio/. Django valida igual que la web y devuelve los errores por campo.
// Ubicación: "Usar la ubicación de este dispositivo" (estando en el local). Si se cambia la dirección
// sin marcar la ubicación, Django la busca sola con Google Maps (como la web).
// El CUIT se muestra pero no se cambia (tampoco en la web).
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { textoError, vibrar } from '../utilidades';
import { Opciones } from './Registro';

const CAMPOS = ['nombre_fantasia', 'rubro', 'descripcion', 'direccion', 'horario_atencion'];

export default function EditarComercio({ navigation }) {
  const { colores } = useTema();
  const { actualizarUsuario } = useSesion();

  const [valores, setValores] = useState(null);
  const [rubros, setRubros] = useState([]);
  const [cuit, setCuit] = useState('');
  const [ubicacion, setUbicacion] = useState(null); // { latitud, longitud } o null
  const [marcada, setMarcada] = useState(false); // tocó "Usar la ubicación de este dispositivo"
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  function mostrar(datos) {
    setValores(Object.fromEntries(CAMPOS.map((c) => [c, datos[c] ?? ''])));
    setRubros(datos.rubros || []);
    setCuit(datos.cuit || '');
    setUbicacion(datos.latitud !== null && datos.longitud !== null ? { latitud: datos.latitud, longitud: datos.longitud } : null);
    setMarcada(false);
  }

  useEffect(() => {
    api('/mi-comercio/').then(mostrar).catch(setErrorGeneral);
  }, []);

  const cambiar = (campo) => (valor) => setValores((v) => ({ ...v, [campo]: valor }));

  async function usarUbicacion() {
    setErrores((e) => ({ ...e, non_field_errors: undefined }));
    setBuscando(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') {
        setErrorGeneral('Dale permiso a Lüp para usar la ubicación (en los ajustes del celular) y probá de nuevo.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUbicacion({ latitud: coords.latitude, longitud: coords.longitude });
      setMarcada(true);
    } catch {
      setErrorGeneral('No pudimos saber dónde estás. Revisá que la ubicación del celular esté prendida.');
    } finally {
      setBuscando(false);
    }
  }

  async function guardar() {
    setErrores({});
    setErrorGeneral('');
    const datos = Object.fromEntries(CAMPOS.map((c) => [c, String(valores[c]).trim()]));
    if (marcada && ubicacion) {
      datos.latitud = ubicacion.latitud;
      datos.longitud = ubicacion.longitud;
    }
    setGuardando(true);
    try {
      mostrar(await api('/mi-comercio/', { metodo: 'PATCH', datos }));
      api('/auth/yo/').then(actualizarUsuario).catch(() => {}); // el nombre del comercio se ve en toda la app
      vibrar('exito');
      navigation.goBack();
    } catch (e) {
      if (e?.sinConexion || e?.error || e?.detail) {
        setErrorGeneral(e);
      } else {
        setErrores(e || {});
        setErrorGeneral(e?.non_field_errors ? textoError(e.non_field_errors) : 'Revisá los campos marcados en rojo.');
      }
    } finally {
      setGuardando(false);
    }
  }

  if (!valores) {
    return errorGeneral ? (
      <View style={[estilos.contenido, { flex: 1, backgroundColor: colores.fondo }]}>
        <MensajeError mensaje={errorGeneral} />
      </View>
    ) : (
      <Cargando texto="Cargando tu comercio…" />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <Icono nombre="storefront-outline" tamano={28} color={colores.titulo} />
          <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
            Datos de mi comercio
          </Text>
        </View>

        <View style={estilos.campos}>
          <Campo
            etiqueta="Nombre del comercio"
            value={valores.nombre_fantasia}
            onChangeText={cambiar('nombre_fantasia')}
            error={errores.nombre_fantasia}
            maxLength={100}
          />
          <Opciones
            etiqueta="Rubro"
            opciones={rubros}
            valor={valores.rubro}
            alElegir={cambiar('rubro')}
            error={errores.rubro}
          />
          <Campo
            etiqueta="Descripción"
            placeholder="Qué vendés, especialidades, cómo retirar…"
            value={valores.descripcion}
            onChangeText={cambiar('descripcion')}
            error={errores.descripcion}
            multiline
            estiloInput={{ minHeight: 84 }}
          />
          <Campo
            etiqueta="Dirección del local"
            placeholder="Calle, número y ciudad"
            value={valores.direccion}
            onChangeText={cambiar('direccion')}
            error={errores.direccion}
            maxLength={200}
          />
          <Campo
            etiqueta="Horario de retiro"
            placeholder="Ej: Lun a Sáb de 18 a 20 hs"
            value={valores.horario_atencion}
            onChangeText={cambiar('horario_atencion')}
            error={errores.horario_atencion}
            maxLength={100}
          />
        </View>

        {/* Ubicación del local (igual que la web) */}
        <View style={{ gap: espacio(1) }}>
          <Text style={[estilos.seccion, { color: colores.titulo }]}>Ubicación del local</Text>
          <Text style={[estilos.ayuda, { color: colores.gris }]}>
            Así los clientes ven cuán cerca están y pueden abrir el recorrido en Google Maps. Si estás en el local,
            usá la ubicación de este celular.
          </Text>
          <View style={estilos.estadoUbicacion}>
            <Icono
              nombre={ubicacion ? 'checkmark-circle' : 'location-outline'}
              tamano={16}
              color={ubicacion ? colores.verde : colores.gris}
            />
            <Text style={[estilos.ayuda, { color: ubicacion ? colores.verdeHover : colores.gris }]}>
              {marcada ? 'Ubicación nueva (se guarda al tocar "Guardar cambios")' : ubicacion ? 'Ubicación guardada' : 'Todavía sin ubicación'}
            </Text>
          </View>
          {ubicacion ? (
            <View style={[estilos.mapa, { backgroundColor: colores.panel }]} pointerEvents="none">
              <MapView
                style={StyleSheet.absoluteFill}
                region={{ latitude: ubicacion.latitud, longitude: ubicacion.longitud, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
                scrollEnabled={false}
                zoomEnabled={false}
                accessibilityLabel="Mapa con la ubicación del local"
              >
                <Marker coordinate={{ latitude: ubicacion.latitud, longitude: ubicacion.longitud }} />
              </MapView>
            </View>
          ) : null}
          <Boton
            texto="Usar la ubicación de este dispositivo"
            icono="locate-outline"
            variante="secundario"
            chico
            cargando={buscando}
            onPress={usarUbicacion}
            estilo={{ alignSelf: 'flex-start' }}
          />
        </View>

        {cuit ? <Text style={[estilos.ayuda, { color: colores.gris }]}>CUIT {cuit} · no se puede cambiar.</Text> : null}

        <MensajeError mensaje={errorGeneral} />
        <Boton texto="Guardar cambios" onPress={guardar} cargando={guardando} estilo={estilos.boton} />
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
  seccion: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  ayuda: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    lineHeight: 18,
  },
  estadoUbicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapa: {
    height: 150,
    borderRadius: radio,
    overflow: 'hidden',
  },
  boton: {
    alignSelf: 'center',
    width: '82%',
    marginTop: espacio(1),
  },
});
