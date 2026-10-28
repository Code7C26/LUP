// PASO 48 · Organización: mis solicitudes.
// Cada pedido de donación con su estado: pendiente, aprobada o rechazada.
// Las aprobadas muestran dónde y cuándo retirar.
// Usa GET /api/mis-solicitudes-donacion/ (paso 31).
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/cliente';
import Boton from '../../componentes/Boton';
import Cargando from '../../componentes/Cargando';
import MensajeError from '../../componentes/MensajeError';
import { espacio, fuentes, radio, tamanos, useTema } from '../../tema';

// "2026-10-26T14:30:00-03:00" -> "26/10"
function textoFecha(fechaHora) {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

function TarjetaSolicitud({ solicitud, alVerComercio }) {
  const { colores } = useTema();
  const colorEstado = {
    aprobada: { backgroundColor: colores.menta, color: colores.verdeHover },
    pendiente: { backgroundColor: colores.ambarClaro, color: colores.texto },
    rechazada: { backgroundColor: colores.fondo, color: colores.gris },
  }[solicitud.estado];

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <View style={estilos.fila}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.producto, { color: colores.titulo }]} numberOfLines={2}>
            {solicitud.producto}
          </Text>
          <Text style={[estilos.detalle, { color: colores.gris }]}>
            🏪 {solicitud.comercio} · pedido el {textoFecha(solicitud.creada_en)}
          </Text>
        </View>
        <Text style={[estilos.estado, colorEstado]}>{solicitud.estado_texto}</Text>
      </View>

      <Text style={[estilos.mensaje, { color: colores.texto, backgroundColor: colores.fondo }]}>
        “{solicitud.mensaje}”
      </Text>

      {solicitud.estado === 'aprobada' ? (
        <View style={[estilos.aviso, { backgroundColor: colores.menta }]}>
          <Text style={[estilos.textoAviso, { color: colores.titulo }]}>🎉 ¡Aprobada! Pasá a retirarla:</Text>
          <Text style={[estilos.detalle, { color: colores.texto }]}>📍 {solicitud.direccion}</Text>
          <Text style={[estilos.detalle, { color: colores.texto }]}>🕒 {solicitud.horario}</Text>
          <Boton texto="Ver comercio y cómo llegar" variante="secundario" onPress={alVerComercio} />
        </View>
      ) : solicitud.estado === 'pendiente' ? (
        <Text style={[estilos.detalle, { color: colores.gris }]}>Esperando la respuesta del comercio.</Text>
      ) : null}
    </View>
  );
}

export default function MisSolicitudes({ navigation }) {
  const { colores } = useTema();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      setSolicitudes(await api('/mis-solicitudes-donacion/'));
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

  // Al volver a la pestaña se actualiza, por si el comercio ya respondió
  useEffect(() => navigation?.addListener?.('focus', cargar), [navigation, cargar]);

  if (cargando) return <Cargando texto="Cargando tus solicitudes…" />;

  const secciones = [
    { titulo: 'Para retirar', estado: 'aprobada' },
    { titulo: 'Esperando respuesta', estado: 'pendiente' },
    { titulo: 'Rechazadas', estado: 'rechazada' },
  ]
    .map((s) => ({ ...s, data: solicitudes.filter((sol) => sol.estado === s.estado) }))
    .filter((s) => s.data.length > 0);

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
          <Text style={[estilos.titulo, { color: colores.titulo }]}>Mis solicitudes</Text>
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <View style={estilos.vacio}>
            <Text style={estilos.emojiVacio}>📋</Text>
            <Text style={[estilos.textoVacio, { color: colores.gris }]}>
              Todavía no pediste ninguna donación.
            </Text>
            <Boton texto="Ver donaciones" onPress={() => navigation.navigate('Donaciones')} />
          </View>
        ) : null
      }
      renderSectionHeader={({ section }) => (
        <Text style={[estilos.subtitulo, { color: colores.titulo }]}>{section.titulo}</Text>
      )}
      renderItem={({ item }) => (
        <TarjetaSolicitud
          solicitud={item}
          alVerComercio={() => navigation.navigate('DetalleComercio', { id: item.comercio_id })}
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
    borderWidth: 1,
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
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  estado: {
    fontFamily: fuentes.media,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  mensaje: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    borderRadius: 12,
    padding: espacio(1.5),
    overflow: 'hidden',
  },
  aviso: {
    borderRadius: 14,
    padding: espacio(1.5),
    gap: espacio(0.75),
  },
  textoAviso: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  vacio: {
    alignItems: 'center',
    gap: espacio(1.5),
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
