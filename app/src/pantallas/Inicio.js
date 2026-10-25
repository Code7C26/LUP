// PASO 40 · Inicio "Cerca tuyo", como en el mockup:
// la lista de comercios ordenada por distancia, con los km, las ofertas y "Ver catálogo".
// Usa la ubicación del celular (expo-location) y GET /api/comercios/?lat=&lng=
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cargando from '../componentes/Cargando';
import MensajeError from '../componentes/MensajeError';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';

const EMOJI_RUBRO = {
  panaderia: '🥐',
  restaurante: '🍲',
  verduleria: '🥕',
  supermercado: '🛒',
  cafeteria: '☕',
  carniceria: '🥩',
  otro: '🏪',
};

// "a 350 m" o "a 1,2 km"
function textoDistancia(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `a ${Math.round(km * 1000)} m`;
  return `a ${km.toFixed(1).replace('.', ',')} km`;
}

function TarjetaComercio({ comercio, alVerCatalogo }) {
  const { colores } = useTema();
  const distancia = textoDistancia(comercio.distancia_km);

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <View style={estilos.fila}>
        <View style={[estilos.icono, { backgroundColor: colores.menta }]}>
          <Text style={estilos.emoji}>{EMOJI_RUBRO[comercio.rubro] || '🏪'}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.nombre, { color: colores.titulo }]} numberOfLines={1}>
            {comercio.nombre_fantasia}
          </Text>
          <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={1}>
            {comercio.rubro_texto}
          </Text>
        </View>
        {distancia ? (
          <Text style={[estilos.km, { backgroundColor: colores.menta, color: colores.verdeHover }]}>{distancia}</Text>
        ) : null}
      </View>

      <Text style={[estilos.detalle, { color: colores.gris }]}>🕒 Retiro: {comercio.horario_atencion}</Text>
      <Text style={[estilos.ofertas, { color: comercio.ofertas ? colores.verdeHover : colores.gris }]}>
        {comercio.ofertas === 0
          ? 'Sin ofertas por ahora'
          : `${comercio.ofertas} ${comercio.ofertas === 1 ? 'oferta disponible' : 'ofertas disponibles'}`}
      </Text>

      <View style={estilos.botones}>
        <Boton texto="Ver catálogo" onPress={alVerCatalogo} estilo={{ flex: 1 }} deshabilitado={!comercio.ofertas} />
        <Boton
          texto="Cómo llegar"
          variante="secundario"
          onPress={() => Linking.openURL(comercio.como_llegar)}
          estilo={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

export default function Inicio({ navigation }) {
  const { colores } = useTema();
  const [comercios, setComercios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [sinUbicacion, setSinUbicacion] = useState(false);
  // "Ver catálogo" abre el catálogo filtrado por ese comercio (paso 41)

  const cargar = useCallback(async () => {
    setError('');
    try {
      let ruta = '/comercios/';
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status === 'granted') {
        const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        ruta += `?lat=${coords.latitude}&lng=${coords.longitude}`;
        setSinUbicacion(false);
      } else {
        setSinUbicacion(true); // igual se muestran, pero sin distancias
      }
      setComercios(await api(ruta));
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

  if (cargando) return <Cargando texto="Buscando comercios cerca tuyo…" />;

  return (
    <FlatList
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      data={comercios}
      keyExtractor={(c) => String(c.id)}
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
        <View style={{ gap: espacio(1.5), marginBottom: espacio(1) }}>
          <Text style={[estilos.titulo, { color: colores.titulo }]}>Cerca tuyo</Text>
          {sinUbicacion ? (
            <Text style={[estilos.detalle, { color: colores.gris }]}>
              Activá la ubicación para ver qué comercios te quedan más cerca.
            </Text>
          ) : null}
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <Text style={[estilos.vacio, { color: colores.gris }]}>Todavía no hay comercios adheridos.</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <TarjetaComercio
          comercio={item}
          alVerCatalogo={() => navigation?.navigate?.('Catalogo', { comercio: item.id, nombre: item.nombre_fantasia })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingTop: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(1),
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  km: {
    fontFamily: fuentes.media,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  ofertas: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  botones: {
    flexDirection: 'row',
    gap: espacio(1),
    marginTop: espacio(0.5),
  },
  vacio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
    marginTop: espacio(4),
  },
});
