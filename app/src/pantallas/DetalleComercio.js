// PASO 43 · Detalle del comercio con mapa:
// nombre, rubro, dirección, horario de retiro, el mapa con el pin del local,
// "Cómo llegar" (abre Google Maps) y sus ofertas.
// Usa GET /api/comercios/<id>/ (paso 40) y GET /api/productos/?comercio=<id> (paso 41).
// Se abre con: navigation.navigate('DetalleComercio', { id: comercio.id })
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cargando from '../componentes/Cargando';
import MensajeError from '../componentes/MensajeError';
import TarjetaProducto from '../componentes/TarjetaProducto';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { emojiRubro } from '../utilidades';

export default function DetalleComercio({ navigation, route }) {
  const { colores } = useTema();
  const id = route?.params?.id;

  const [comercio, setComercio] = useState(null);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [datos, ofertas] = await Promise.all([api(`/comercios/${id}/`), api(`/productos/?comercio=${id}`)]);
      setComercio(datos);
      setProductos(ofertas);
    } catch (e) {
      setError(e?.estado === 404 ? 'No encontramos este comercio.' : e);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <Cargando texto="Cargando el comercio…" />;

  if (!comercio) {
    return (
      <View style={[estilos.contenido, { flex: 1, backgroundColor: colores.fondo }]}>
        <MensajeError mensaje={error} alReintentar={cargar} />
      </View>
    );
  }

  const tieneUbicacion = comercio.latitud !== null && comercio.longitud !== null;

  const encabezado = (
    <View style={{ gap: espacio(2), marginBottom: espacio(1.5) }}>
      <View style={estilos.fila}>
        <View style={[estilos.icono, { backgroundColor: colores.menta }]}>
          <Text style={estilos.emoji}>{emojiRubro(comercio.rubro)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.nombre, { color: colores.titulo }]}>{comercio.nombre_fantasia}</Text>
          <Text style={[estilos.detalle, { color: colores.gris }]}>{comercio.rubro_texto}</Text>
        </View>
      </View>

      {comercio.descripcion ? (
        <Text style={[estilos.texto, { color: colores.texto }]}>{comercio.descripcion}</Text>
      ) : null}

      <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
        <Text style={[estilos.texto, { color: colores.texto }]}>📍 {comercio.direccion}</Text>
        <Text style={[estilos.texto, { color: colores.texto }]}>🕒 Retiro: {comercio.horario_atencion}</Text>

        {tieneUbicacion ? (
          // Mapa fijo (sin mover ni hacer zoom) para que no se trabe con el scroll de la pantalla
          <View style={estilos.mapa}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: comercio.latitud,
                longitude: comercio.longitud,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              accessibilityLabel={`Mapa con la ubicación de ${comercio.nombre_fantasia}`}
            >
              <Marker
                coordinate={{ latitude: comercio.latitud, longitude: comercio.longitud }}
                title={comercio.nombre_fantasia}
                description={comercio.direccion}
                pinColor={colores.verde}
              />
            </MapView>
          </View>
        ) : (
          <Text style={[estilos.detalle, { color: colores.gris }]}>
            Este comercio todavía no marcó su ubicación en el mapa.
          </Text>
        )}

        {/* Si no hay ubicación, la API arma el link con la dirección */}
        <Boton texto="Cómo llegar" variante="secundario" onPress={() => Linking.openURL(comercio.como_llegar)} />
      </View>

      <MensajeError mensaje={error} alReintentar={cargar} />

      <Text style={[estilos.subtitulo, { color: colores.titulo }]}>
        {productos.length === 1 ? '1 oferta disponible' : `${productos.length} ofertas disponibles`}
      </Text>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      data={productos}
      keyExtractor={(p) => String(p.id)}
      ListHeaderComponent={encabezado}
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
      ListEmptyComponent={
        <Text style={[estilos.vacio, { color: colores.gris }]}>Este comercio no tiene ofertas por ahora.</Text>
      }
      renderItem={({ item }) => (
        <TarjetaProducto producto={item} onPress={() => navigation.navigate('DetalleProducto', { id: item.id })} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  icono: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  subtitulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(1.5),
  },
  mapa: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden', // en Android, el mapa no respeta el borde redondeado sin esto
  },
  vacio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
    marginTop: espacio(2),
  },
});
