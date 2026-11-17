// PASO 48 · Organización: mis solicitudes (con el estilo de Inicio y del comercio).
// Arriba la misma barra que Inicio: el menú ☰ y el botón verde "Ayuda" (chat con Lü), y el círculo con el
// nombre de la organización y un resumen ("1 para retirar · 2 esperando respuesta").
// Cada pedido de donación en una tarjeta, con su estado como etiqueta de color:
// Aprobada verde, Pendiente naranja, Rechazada gris. Las aprobadas muestran dónde y cuándo retirar.
// Usa GET /api/mis-solicitudes-donacion/ (paso 31).
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/cliente';
import BarraSuperior from '../../componentes/BarraSuperior';
import Boton from '../../componentes/Boton';
import CabeceraCuenta from '../../componentes/CabeceraCuenta';
import Cargando from '../../componentes/Cargando';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import Icono from '../../componentes/Icono';
import MensajeError from '../../componentes/MensajeError';
import Vacio from '../../componentes/Vacio';
import { useSesion } from '../../contexto/Sesion';
import { textoDeOpcion, useIdioma } from '../../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../../tema';
import { formatoDiaMes } from '../../utilidades';

const TONOS = { aprobada: 'verde', pendiente: 'naranja', rechazada: 'gris' };

function TarjetaSolicitud({ solicitud, alVerComercio }) {
  const { colores } = useTema();
  const { t } = useIdioma();

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.panel }, sombra(colores)]}>
      <View style={{ gap: espacio(0.5) }}>
        <Text style={[estilos.producto, { color: colores.texto }]} numberOfLines={3}>
          {solicitud.producto}
        </Text>
        <Text style={[estilos.detalle, { color: colores.gris }]}>
          {solicitud.comercio}
          {'  ·  '}
          {formatoDiaMes(solicitud.creada_en)}
        </Text>
        <View style={estilos.infos}>
          <EtiquetaEstado
            texto={textoDeOpcion(t, 'estadosSolicitud', solicitud.estado, solicitud.estado_texto)}
            tono={TONOS[solicitud.estado] || 'gris'}
          />
        </View>
      </View>

      <Text style={[estilos.mensaje, { color: colores.texto, backgroundColor: colores.fondo }]}>“{solicitud.mensaje}”</Text>

      {solicitud.estado === 'aprobada' ? (
        <View style={[estilos.aviso, { backgroundColor: colores.menta }]}>
          <Text style={[estilos.textoAviso, { color: colores.titulo }]}>{t('misSolicitudes.aprobadaRetirar')}</Text>
          <View style={estilos.dato}>
            <Icono nombre="location-outline" tamano={15} color={colores.verdeHover} />
            <Text style={[estilos.detalle, { color: colores.texto, flex: 1 }]}>{solicitud.direccion}</Text>
          </View>
          <View style={estilos.dato}>
            <Icono nombre="time-outline" tamano={15} color={colores.verdeHover} />
            <Text style={[estilos.detalle, { color: colores.texto, flex: 1 }]}>{solicitud.horario}</Text>
          </View>
          <Boton
            texto={t('misSolicitudes.comoLlegar')}
            icono="navigate"
            chico
            onPress={alVerComercio}
            estilo={estilos.principal}
          />
        </View>
      ) : solicitud.estado === 'pendiente' ? (
        <Text style={[estilos.detalle, { color: colores.gris }]}>{t('misSolicitudes.esperando')}</Text>
      ) : null}
    </View>
  );
}

export default function MisSolicitudes({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario } = useSesion();
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

  if (cargando) return <Cargando texto={t('misSolicitudes.cargando')} />;

  const secciones = [
    { titulo: t('misSolicitudes.paraRetirar'), estado: 'aprobada' },
    { titulo: t('misSolicitudes.esperandoRespuesta'), estado: 'pendiente' },
    { titulo: t('misSolicitudes.rechazadas'), estado: 'rechazada' },
  ]
    .map((s) => ({ ...s, data: solicitudes.filter((sol) => sol.estado === s.estado) }))
    .filter((s) => s.data.length > 0);

  const nombre = usuario?.organizacion?.nombre || usuario?.nombre || t('donaciones.miOrganizacion');
  const contar = (estado) => solicitudes.filter((s) => s.estado === estado).length;
  const resumen = `${t('misSolicitudes.resumenParaRetirar', { n: contar('aprobada') })} · ${t('misSolicitudes.resumenEsperando', {
    n: contar('pendiente'),
  })}`;

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
        <View style={estilos.cabecera}>
          {/* Igual que Inicio: ☰ y "Ayuda" */}
          <BarraSuperior navigation={navigation} desde="MisSolicitudes" estilo={estilos.barra} />
          <CabeceraCuenta nombre={nombre} resumen={resumen} alTocar={() => navigation.navigate('Perfil')} />
          <Text style={[estilos.tituloPantalla, { color: colores.titulo }]} accessibilityRole="header">
            {t('misSolicitudes.titulo')}
          </Text>
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <Vacio
            icono="clipboard-outline"
            texto={t('misSolicitudes.vacio')}
            boton={t('misSolicitudes.verDonaciones')}
            alTocar={() => navigation.navigate('Donaciones')}
          />
        ) : null
      }
      renderSectionHeader={({ section }) => (
        <Text style={[estilos.subtitulo, { color: colores.gris }]} accessibilityRole="header">
          {section.titulo}
        </Text>
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
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(4),
  },
  cabecera: {
    gap: espacio(2),
  },
  barra: {
    paddingHorizontal: 0, // la lista ya tiene el margen a los costados
    marginBottom: -espacio(1),
  },
  // Igual que estilos.titulo de Inicio.js
  tituloPantalla: {
    fontFamily: fuentes.normal,
    fontSize: 18,
    marginTop: espacio(0.5),
  },
  subtitulo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    marginTop: espacio(2),
    marginBottom: espacio(1),
  },
  tarjeta: {
    borderRadius: radio,
    padding: espacio(1.5),
    gap: espacio(1.5),
  },
  producto: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  infos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espacio(1),
    marginTop: 2,
  },
  mensaje: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    borderRadius: 12,
    padding: espacio(1.25),
    overflow: 'hidden',
  },
  aviso: {
    borderRadius: 12,
    padding: espacio(1.5),
    gap: espacio(0.75),
  },
  textoAviso: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  principal: {
    alignSelf: 'flex-start',
    minHeight: 36,
    height: 36,
    maxWidth: '100%',
    marginTop: espacio(0.5),
  },
});
