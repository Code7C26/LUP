// PASO 48 · Organización: mis pedidos de donación (con el estilo de Inicio y del comercio).
// Arriba, la cabecera verde ("Tus pedidos", "Seguí tus donaciones" y lo que hay para retirar y esperando respuesta).
// Dos pestañas: "En curso" (pendientes y aprobadas) e "Historial" (rechazadas).
// Cada pedido en una tarjeta con su estado como puntito de color y una línea de tiempo de 3 pasos. Si está
// aprobado, dónde y cuándo retirar, y "Cómo llegar" (abre Google Maps con la dirección del comercio).
// Usa GET /api/mis-solicitudes-donacion/ (paso 31).
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../../api/cliente';
import BarraSuperior from '../../componentes/BarraSuperior';
import Boton from '../../componentes/Boton';
import CabeceraUsuario from '../../componentes/CabeceraUsuario';
import Esqueleto from '../../componentes/Esqueleto';
import EstadoVacio from '../../componentes/EstadoVacio';
import Icono from '../../componentes/Icono';
import MensajeError from '../../componentes/MensajeError';
import Pestanas from '../../componentes/Pestanas';
import { t as traducir, useIdioma } from '../../contexto/Idioma';
import { useSesion } from '../../contexto/Sesion';
import { espacio, fuentes, useTema } from '../../tema';
import { formatoDiaMes } from '../../utilidades';

// El mismo link que arma Django para "Cómo llegar" (stores/ubicacion.py), con la dirección del comercio
function abrirMapa(direccion) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}`;
  Linking.openURL(url).catch(() => Alert.alert(traducir('comun.noSePudoAbrir'), traducir('comun.noSePudoAbrirTexto')));
}

// Los pasos de la línea de tiempo: enviado (siempre), aprobado y retirado.
// El modelo no tiene un estado "retirada" para las donaciones, así que el último paso queda sin marcar.
const hecho = (paso, estado) => paso === 0 || (paso === 1 && estado === 'aprobada');

function LineaDeTiempo({ estado }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const pasos = [t('misSolicitudes.pasoEnviado'), t('misSolicitudes.pasoAprobado'), t('misSolicitudes.pasoRetirado')];
  return (
    <View style={estilos.linea}>
      {pasos.map((texto, i) => {
        const marcado = hecho(i, estado);
        const color = marcado ? colores.verde : colores.borde;
        return (
          <View key={texto} style={[estilos.paso, { alignItems: i === 0 ? 'flex-start' : i === 2 ? 'flex-end' : 'center' }]}>
            <View style={estilos.puntos}>
              {i > 0 ? <View style={[estilos.segmento, { backgroundColor: hecho(i, estado) ? colores.verde : colores.borde }]} /> : null}
              <View style={[estilos.punto, { backgroundColor: color }]} />
              {i < pasos.length - 1 ? (
                <View style={[estilos.segmento, { backgroundColor: hecho(i + 1, estado) ? colores.verde : colores.borde }]} />
              ) : null}
            </View>
            <Text style={[estilos.textoPaso, { color: marcado ? colores.verdeHover : colores.gris }]}>{texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TarjetaSolicitud({ solicitud }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const aprobada = solicitud.estado === 'aprobada';
  const pendiente = solicitud.estado === 'pendiente';
  const color = aprobada ? colores.verde : pendiente ? colores.ambar : colores.gris;
  const texto = aprobada
    ? t('misSolicitudes.estadoAprobado')
    : pendiente
      ? t('misSolicitudes.estadoEspera')
      : t('misSolicitudes.estadoRechazado');

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.panel }]}>
      <View style={estilos.fila}>
        <View style={[estilos.cuadro, { backgroundColor: colores.menta }]}>
          <Icono nombre="bag-handle-outline" tamano={24} color={colores.verdeHover} />
        </View>
        <View style={estilos.datos}>
          <Text style={[estilos.producto, { color: colores.texto }]} numberOfLines={2}>
            {solicitud.producto}
          </Text>
          <Text style={[estilos.detalle, { color: colores.grisVerde }]} numberOfLines={1}>
            {solicitud.comercio} · {formatoDiaMes(solicitud.creada_en)}
          </Text>
          <View style={estilos.filaEstado}>
            <View style={[estilos.puntito, { backgroundColor: color }]} />
            <Text style={[estilos.estado, { color: colores.texto }]}>{texto}</Text>
          </View>
        </View>
      </View>

      {!solicitud.estado || solicitud.estado === 'rechazada' ? null : <LineaDeTiempo estado={solicitud.estado} />}

      {aprobada ? (
        <View style={estilos.retiro}>
          <Text style={[estilos.detalle, { color: colores.texto }]}>{solicitud.direccion}</Text>
          <Text style={[estilos.detalle, { color: colores.grisVerde }]}>{t('misSolicitudes.horario', { horario: solicitud.horario })}</Text>
          <Boton
            texto={t('misSolicitudes.comoLlegar')}
            icono="navigate-outline"
            variante="secundario"
            chico
            onPress={() => abrirMapa(solicitud.direccion)}
            estilo={estilos.comoLlegar}
          />
        </View>
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
  const [pestana, setPestana] = useState('enCurso');

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

  if (cargando) return <Esqueleto tipo="reservas" />;

  const enCurso = solicitudes.filter((s) => s.estado !== 'rechazada');
  const historial = solicitudes.filter((s) => s.estado === 'rechazada');
  const contar = (estado) => solicitudes.filter((s) => s.estado === estado).length;
  const nombre = usuario?.organizacion?.nombre || usuario?.nombre || t('donaciones.miOrganizacion');
  const resumen = `${t('misSolicitudes.resumenParaRetirar', { n: contar('aprobada') })} · ${t('misSolicitudes.resumenEsperando', {
    n: contar('pendiente'),
  })}`;
  const enCursoActiva = pestana === 'enCurso';
  const recibidas = contar('aprobada');

  return (
    <FlatList
      key={pestana}
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      data={enCursoActiva ? enCurso : historial}
      keyExtractor={(s) => String(s.id)}
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

          <CabeceraUsuario
            foto={urlCompleta(usuario?.foto)}
            nombre={nombre}
            arriba={t('misSolicitudes.subtitulo')}
            titulo={t('misSolicitudes.titulo')}
            resumen={resumen}
            alTocar={() => navigation.navigate('Perfil')}
          />

          {/* Tu impacto: lo que ya te aprobaron */}
          <View style={[estilos.impacto, { backgroundColor: colores.menta }]}>
            <Text style={[estilos.impactoTitulo, { color: colores.verdeProfundo }]}>{t('misSolicitudes.impactoTitulo')}</Text>
            <Text style={[estilos.impactoNumero, { color: colores.verdeProfundo }]}>{recibidas}</Text>
            <Text style={[estilos.impactoTexto, { color: colores.grisVerde }]}>
              {t('misSolicitudes.impactoDonaciones', { n: recibidas })}
            </Text>
          </View>

          <MensajeError mensaje={error} alReintentar={cargar} />

          <Pestanas
            opciones={[
              ['enCurso', t('misSolicitudes.enCurso')],
              ['historial', t('misSolicitudes.historial')],
            ]}
            activa={pestana}
            alCambiar={setPestana}
          />
        </View>
      }
      ListEmptyComponent={
        error ? null : enCursoActiva ? (
          <EstadoVacio icono="heart-outline" texto={t('misSolicitudes.vacio')}>
            <Boton
              texto={t('misSolicitudes.verDonaciones')}
              onPress={() => navigation.navigate('Donaciones')}
              estilo={estilos.botonVacio}
            />
          </EstadoVacio>
        ) : null
      }
      renderItem={({ item }) => <TarjetaSolicitud solicitud={item} />}
      ItemSeparatorComponent={() => <View style={{ height: espacio(2) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(4),
    flexGrow: 1,
  },
  cabecera: {
    gap: espacio(2),
    marginBottom: espacio(2.5),
  },
  barra: {
    paddingHorizontal: 0,
    marginBottom: -espacio(1),
  },
  // ---- Tu impacto ----
  impacto: {
    padding: espacio(2.25),
    gap: 2,
    borderRadius: 20,
  },
  impactoTitulo: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  impactoNumero: {
    fontFamily: fuentes.marca,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
  impactoTexto: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  // ---- Pedido ----
  tarjeta: {
    padding: espacio(2),
    gap: espacio(1.75),
    borderRadius: 20,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  cuadro: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  producto: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  puntito: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  estado: {
    fontFamily: fuentes.media,
    fontSize: 12,
  },
  // ---- Línea de tiempo ----
  linea: {
    flexDirection: 'row',
  },
  paso: {
    flex: 1,
    gap: 6,
  },
  puntos: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  punto: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  segmento: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  textoPaso: {
    fontFamily: fuentes.normal,
    fontSize: 11,
  },
  // ---- Retiro ----
  retiro: {
    gap: 3,
  },
  comoLlegar: {
    alignSelf: 'flex-start',
    marginTop: espacio(0.75),
  },
  botonVacio: {
    marginTop: espacio(1),
  },
});
