// PASO 47 · Comercio: solicitudes de donación.
// Lista lo que pidieron las organizaciones, con su mensaje y los botones "Aprobar" y "Rechazar".
// Usa GET /api/mis-solicitudes/ y POST /api/solicitudes/<id>/aprobar|rechazar/ (paso 30).
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/cliente';
import Boton from '../../componentes/Boton';
import Cargando from '../../componentes/Cargando';
import MensajeError from '../../componentes/MensajeError';
import { espacio, fuentes, radio, tamanos, useTema } from '../../tema';
import { textoError } from '../../utilidades';
import Encabezado from '../../componentes/Encabezado';
import Vacio from '../../componentes/Vacio';

function TarjetaSolicitud({ solicitud, ocupado, alResponder }) {
  const { colores } = useTema();
  const pendiente = solicitud.estado === 'pendiente';
  const aprobada = solicitud.estado === 'aprobada';

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <View style={estilos.fila}>
        <Text style={[estilos.producto, { color: colores.titulo }]} numberOfLines={2}>
          {solicitud.producto}
        </Text>
        {!pendiente ? (
          <Text
            style={[
              estilos.estado,
              aprobada
                ? { backgroundColor: colores.menta, color: colores.verdeHover }
                : { backgroundColor: colores.fondo, color: colores.gris },
            ]}
          >
            {solicitud.estado_texto}
          </Text>
        ) : null}
      </View>
      <Text style={[estilos.detalle, { color: colores.gris }]}>{solicitud.organizacion}</Text>
      <Text style={[estilos.mensaje, { color: colores.texto, backgroundColor: colores.fondo }]}>
        “{solicitud.mensaje}”
      </Text>

      {pendiente ? (
        <View style={estilos.botones}>
          <Boton texto="Aprobar" icono="checkmark" chico onPress={() => alResponder('aprobar')} cargando={ocupado} estilo={{ flex: 1 }} />
          <Boton
            texto="Rechazar"
            chico
            variante="secundario"
            onPress={() => alResponder('rechazar')}
            deshabilitado={ocupado}
            estilo={{ flex: 1 }}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function Solicitudes({ navigation }) {
  const { colores } = useTema();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setSolicitudes(await api('/mis-solicitudes/'));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => navigation?.addListener?.('focus', cargar), [navigation, cargar]);

  async function enviarRespuesta(solicitud, accion) {
    setOcupado(solicitud.id);
    try {
      await api(`/solicitudes/${solicitud.id}/${accion}/`, { metodo: 'POST' });
      // Al aprobar, el resto de los pedidos por ese producto quedan rechazados: se recarga todo
      await cargar();
    } catch (e) {
      Alert.alert('No se pudo responder', textoError(e) || 'Probá de nuevo.');
    } finally {
      setOcupado(null);
    }
  }

  function responder(solicitud, accion) {
    if (accion === 'rechazar') {
      enviarRespuesta(solicitud, accion);
      return;
    }
    Alert.alert(
      '¿Aprobar la donación?',
      `"${solicitud.producto}" queda marcado como donado a ${solicitud.organizacion} y sale del catálogo. ` +
        'Si otras organizaciones lo pidieron, sus solicitudes se rechazan.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, aprobar', onPress: () => enviarRespuesta(solicitud, accion) },
      ]
    );
  }

  if (cargando) return <Cargando texto="Cargando solicitudes…" />;

  const secciones = [
    { titulo: 'Para responder', data: solicitudes.filter((s) => s.estado === 'pendiente') },
    { titulo: 'Respondidas', data: solicitudes.filter((s) => s.estado !== 'pendiente') },
  ].filter((s) => s.data.length > 0);

  return (
    <SectionList
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      sections={secciones}
      keyExtractor={(s) => String(s.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={actualizando}
          tintColor={colores.verde}
          onRefresh={() => {
            setActualizando(true);
            cargar();
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: espacio(1.5) }}>
          <Encabezado titulo="Donaciones" />
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <Vacio icono="heart-outline" texto="Sin pedidos todavía. Marcá productos como donables para recibirlos." />
        ) : null
      }
      renderSectionHeader={({ section }) => (
        <Text style={[estilos.subtitulo, { color: colores.gris }]}>{section.titulo}</Text>
      )}
      renderItem={({ item }) => (
        <TarjetaSolicitud
          solicitud={item}
          ocupado={ocupado === item.id}
          alResponder={(accion) => responder(item, accion)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  subtitulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    marginTop: espacio(2.5),
    marginBottom: espacio(1.5),
  },
  tarjeta: {
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(1),
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio(1),
  },
  producto: {
    flex: 1,
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  mensaje: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    borderRadius: 12,
    padding: espacio(1.5),
    overflow: 'hidden',
  },
  estado: {
    fontFamily: fuentes.media,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  botones: {
    flexDirection: 'row',
    gap: espacio(1),
    marginTop: espacio(0.5),
  },
  vacio: {
    alignItems: 'center',
    gap: espacio(1),
    marginTop: espacio(4),
  },
  emojiVacio: {
    fontSize: 40,
  },
  textoVacio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
  },
});
