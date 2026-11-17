// Mis favoritos: los comercios guardados con el corazón (contexto/Favoritos.js),
// cada uno con sus ofertas de hoy (disponibles, con stock y sin vencer).
// Se abre desde el menú ☰ de Inicio:  navigation.navigate('MisFavoritos')
// Usa GET /api/comercios/ (nombre, rubro, estrellas) y GET /api/productos/?comercio=<id> (sus ofertas).
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/cliente';
import BotonFavorito from '../componentes/BotonFavorito';
import CalificacionComercio from '../componentes/CalificacionComercio';
import Encabezado from '../componentes/Encabezado';
import Esqueleto from '../componentes/Esqueleto';
import FilaProducto from '../componentes/FilaProducto';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import Vacio from '../componentes/Vacio';
import { useFavoritos } from '../contexto/Favoritos';
import { textoDeOpcion, useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
import { emojiRubro } from '../utilidades';

const OFERTAS_A_MOSTRAR = 3; // el resto, con "Ver las N ofertas" (abre el comercio)

// Un comercio favorito: su cabecera (tocarla abre el comercio) y sus ofertas de hoy
function TarjetaFavorito({ comercio, ofertas, navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const abrirComercio = () => navigation.navigate('DetalleComercio', { id: comercio.id });
  const visibles = (ofertas || []).slice(0, OFERTAS_A_MOSTRAR);
  const resto = (ofertas?.length || 0) - visibles.length;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie }, sombra(colores)]}>
      <View style={estilos.cabecera}>
        <Pressable
          onPress={abrirComercio}
          accessibilityRole="button"
          accessibilityLabel={t('favoritos.verComercio', { nombre: comercio.nombre_fantasia })}
          style={({ pressed }) => [estilos.filaComercio, pressed && { opacity: 0.8 }]}
        >
          <View style={[estilos.icono, { backgroundColor: colores.panel }]}>
            <Text style={{ fontSize: 24 }}>{emojiRubro(comercio.rubro)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[estilos.nombre, { color: colores.titulo }]} numberOfLines={1}>
              {comercio.nombre_fantasia}
            </Text>
            <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={1}>
              {[textoDeOpcion(t, 'rubros', comercio.rubro, comercio.rubro_texto), comercio.horario_atencion].filter(Boolean).join(' · ')}
            </Text>
            <CalificacionComercio promedio={comercio.calificacion_promedio} cantidad={comercio.calificaciones} tamano={12} />
          </View>
        </Pressable>
        {/* Sacarlo de favoritos: desaparece de la lista al instante */}
        <BotonFavorito id={comercio.id} chico />
      </View>

      {ofertas === null ? (
        <Text style={[estilos.detalle, { color: colores.gris }]}>{t('favoritos.noCargaron')}</Text>
      ) : visibles.length ? (
        <View style={{ gap: espacio(1.5) }}>
          <Text style={[estilos.subtitulo, { color: colores.gris }]}>
            {t('favoritos.ofertasHoy', { n: ofertas.length })}
          </Text>
          {visibles.map((p) => (
            <FilaProducto key={p.id} producto={p} onPress={() => navigation.navigate('DetalleProducto', { id: p.id })} />
          ))}
          {resto > 0 ? (
            <Pressable onPress={abrirComercio} accessibilityRole="link" style={estilos.verMas} hitSlop={6}>
              <Text style={[estilos.textoVerMas, { color: colores.verdeHover }]}>{t('favoritos.verLasOfertas', { n: ofertas.length })}</Text>
              <Icono nombre="chevron-forward" tamano={14} color={colores.verdeHover} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={[estilos.sinOfertas, { backgroundColor: colores.fondo }]}>
          <Icono nombre="basket-outline" tamano={18} color={colores.gris} />
          <Text style={[estilos.detalle, { color: colores.gris, flex: 1 }]}>{t('favoritos.sinOfertasHoy')}</Text>
        </View>
      )}
    </View>
  );
}

export default function MisFavoritos({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { favoritos } = useFavoritos();
  const [datos, setDatos] = useState([]); // [{ comercio, ofertas }] (ofertas = null si no se pudieron cargar)
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  // Siempre los favoritos de ahora (sin volver a crear "cargar" cada vez que cambian)
  const idsFavoritos = useRef(favoritos);
  idsFavoritos.current = favoritos;

  const cargar = useCallback(async () => {
    const ids = idsFavoritos.current;
    setError('');
    try {
      if (!ids.length) {
        setDatos([]);
        return;
      }
      const comercios = (await api('/comercios/')).filter((c) => ids.includes(c.id));
      // Las ofertas de cada uno, en paralelo. Si falla uno, los demás se muestran igual.
      const ofertas = await Promise.all(
        comercios.map((c) => api(`/productos/?comercio=${c.id}`).catch(() => null))
      );
      setDatos(comercios.map((comercio, i) => ({ comercio, ofertas: ofertas[i] })));
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

  // Si se agregó un favorito que todavía no está cargado (por ejemplo, desde DetalleComercio), se recarga
  const cargados = datos.map((d) => d.comercio.id);
  const faltaAlguno = !cargando && favoritos.some((id) => !cargados.includes(id));
  useEffect(() => {
    if (faltaAlguno) cargar();
  }, [faltaAlguno, cargar]);

  if (cargando) return <Esqueleto tipo="filas" />;

  // Los que siguen marcados, del último guardado al primero
  const lista = datos
    .filter((d) => favoritos.includes(d.comercio.id))
    .sort((a, b) => favoritos.indexOf(b.comercio.id) - favoritos.indexOf(a.comercio.id));

  return (
    <FlatList
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      data={lista}
      keyExtractor={(d) => String(d.comercio.id)}
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
        <View style={{ gap: espacio(1.5), marginBottom: espacio(2) }}>
          <Encabezado
            titulo={t('favoritos.titulo')}
            subtitulo={lista.length ? t('favoritos.guardados', { n: lista.length }) : null}
          />
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <Vacio
            icono="heart-outline"
            texto={t('favoritos.vacio')}
            boton={t('favoritos.buscarComercios')}
            alTocar={() => navigation.navigate('Pestanas', { screen: 'Inicio' })}
          />
        ) : null
      }
      renderItem={({ item }) => <TarjetaFavorito comercio={item.comercio} ofertas={item.ofertas} navigation={navigation} />}
      ItemSeparatorComponent={() => <View style={{ height: espacio(2) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(4),
  },
  tarjeta: {
    borderRadius: radio,
    padding: espacio(1.5),
    gap: espacio(1.5),
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  filaComercio: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.25),
  },
  icono: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: 16,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  subtitulo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  verMas: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 2,
  },
  textoVerMas: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  sinOfertas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    borderRadius: 12,
    padding: espacio(1.25),
  },
});
