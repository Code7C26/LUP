// PASO 40 · Inicio, IGUAL AL MOCKUP (página 7 del PDF):
//   arriba: soporte a la izquierda y compartir / carrito (con el número de productos) a la derecha
//   el mapa a todo lo ancho con los comercios y el logo en la esquina
//   "Cerca tuyo" con el buscador chiquito, y los comercios con foto, km y "Ver catálogo"
//   "Ver catálogo completo" y las fotos de las ofertas con sus km
//   (agregado) "Tus favoritos" al final, si marcaste alguno con el corazón
// Usa GET /api/comercios/?lat=&lng= y GET /api/productos/?orden=cercania&lat=&lng=
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { api, urlCompleta } from '../api/cliente';
import BotonCarrito from '../componentes/BotonCarrito';
import BotonFavorito from '../componentes/BotonFavorito';
import Chip from '../componentes/Chip';
import Esqueleto from '../componentes/Esqueleto';
import Icono from '../componentes/Icono';
import Logo from '../componentes/Logo';
import MensajeError from '../componentes/MensajeError';
import { useBusquedas } from '../contexto/Busquedas';
import { useFavoritos } from '../contexto/Favoritos';
import { espacio, fuentes, useTema } from '../tema';
import { emojiCategoria, textoDistancia } from '../utilidades';

const WHATSAPP_SOPORTE = 'https://wa.me/5493547620629';

// "1 km", "350 m" (sin el "a" de adelante, como el mockup)
const km = (distancia) => textoDistancia(distancia)?.replace('a ', '') || null;

// Pin + distancia chiquitos
function Distancia({ valor }) {
  const { colores } = useTema();
  if (!valor) return null;
  return (
    <View style={estilos.distancia}>
      <Icono nombre="location-sharp" tamano={11} color={colores.titulo} />
      <Text style={[estilos.textoKm, { color: colores.titulo }]}>{valor}</Text>
    </View>
  );
}

// Foto (o, si no hay, un cuadro gris con un ícono) con bordes redondeados
function Foto({ uri, icono, emoji, estilo }) {
  const { colores } = useTema();
  return (
    <View style={[estilo, { backgroundColor: colores.panel, overflow: 'hidden' }]}>
      {uri ? (
        <Image source={{ uri: urlCompleta(uri) }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={estilos.sinFoto}>
          {emoji ? <Text style={{ fontSize: 34 }}>{emoji}</Text> : <Icono nombre={icono} tamano={30} color={colores.gris} />}
        </View>
      )}
    </View>
  );
}

// Tarjeta de comercio del carrusel "Cerca tuyo": foto, nombre, km y "Ver catálogo"
function TarjetaComercio({ comercio, foto, onPress }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${comercio.nombre_fantasia}. Ver catálogo`}
      style={({ pressed }) => [estilos.comercio, pressed && { opacity: 0.8 }]}
    >
      <View>
        <Foto uri={foto} icono="storefront-outline" estilo={estilos.fotoComercio} />
        <BotonFavorito id={comercio.id} chico estilo={[estilos.corazon, { backgroundColor: colores.superficie }]} />
      </View>
      <Text style={[estilos.nombreComercio, { color: colores.titulo }]} numberOfLines={1}>
        {comercio.nombre_fantasia}
      </Text>
      <Distancia valor={km(comercio.distancia_km)} />
      <Text style={[estilos.verCatalogo, { color: colores.titulo }]}>
        {comercio.ofertas ? 'Ver catálogo' : 'Sin ofertas por ahora'}
      </Text>
    </Pressable>
  );
}

export default function Inicio({ navigation }) {
  const { colores } = useTema();
  const { favoritos } = useFavoritos();
  const { recientes } = useBusquedas();

  const [comercios, setComercios] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [coords, setCoords] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [verSoporte, setVerSoporte] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      let ubicacion = '';
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status === 'granted') {
        const { coords: c } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ latitude: c.latitude, longitude: c.longitude });
        ubicacion = `lat=${c.latitude}&lng=${c.longitude}`;
      }
      const [listaComercios, listaOfertas] = await Promise.all([
        api(`/comercios/?${ubicacion}`),
        api(`/productos/?orden=${ubicacion ? 'cercania' : 'recientes'}&${ubicacion}`),
      ]);
      setComercios(listaComercios);
      setOfertas(listaOfertas);
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

  const abrirComercio = (c) => navigation?.navigate?.('DetalleComercio', { id: c.id });

  function compartir() {
    Share.share({ message: 'Rescatá comida rica con descuento cerca tuyo con Lüp 🌱' }).catch(() => {});
  }

  if (cargando) return <Esqueleto tipo="inicio" />;

  // La foto de cada comercio: la de su primera oferta con foto (la API no tiene foto del local)
  const fotoDe = {};
  ofertas.forEach((p) => {
    if (p.imagen && !fotoDe[p.comercio_id]) fotoDe[p.comercio_id] = p.imagen;
  });

  const conUbicacion = comercios.filter((c) => c.latitud !== null && c.longitud !== null);
  const centro =
    coords ||
    (conUbicacion[0] && { latitude: Number(conUbicacion[0].latitud), longitude: Number(conUbicacion[0].longitud) });
  const misFavoritos = comercios.filter((c) => favoritos.includes(c.id));

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={{ paddingBottom: espacio(4) }}
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
    >
      {/* Barra de arriba */}
      <View style={estilos.barra}>
        <Pressable
          onPress={() => setVerSoporte((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Soporte al Consumidor"
          style={[estilos.botonBarra, { backgroundColor: colores.panel }]}
        >
          <Icono nombre="chatbubble-ellipses-outline" tamano={20} color={colores.texto} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={compartir} hitSlop={8} accessibilityRole="button" accessibilityLabel="Compartir Lüp" style={estilos.botonBarra}>
          <Icono nombre="share-social-outline" tamano={22} color={colores.texto} />
        </Pressable>
        <BotonCarrito navigation={navigation} />
      </View>

      {/* Cartelito de soporte, como el mockup */}
      {verSoporte ? (
        <Pressable
          onPress={() => Linking.openURL(WHATSAPP_SOPORTE).catch(() => Alert.alert('Soporte', '+54 9 3547 62-0629'))}
          style={[estilos.soporte, { backgroundColor: colores.panel }]}
        >
          <Text style={[estilos.tituloSoporte, { color: colores.titulo }]}>Soporte al Consumidor</Text>
          <Text style={[estilos.textoSoporte, { color: colores.titulo }]}>
            Por cualquier duda, consulta o inquietud, comuníquese al{' '}
            <Text style={{ textDecorationLine: 'underline' }}>+54 9 3547620629</Text>
          </Text>
        </Pressable>
      ) : null}

      {/* Mapa a todo lo ancho */}
      {centro ? (
        <View style={[estilos.mapa, { backgroundColor: colores.panel }]}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ ...centro, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
            showsUserLocation={!!coords}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            accessibilityLabel="Mapa con los comercios cerca tuyo"
          >
            {conUbicacion.map((c) => (
              <Marker
                key={c.id}
                coordinate={{ latitude: Number(c.latitud), longitude: Number(c.longitud) }}
                title={c.nombre_fantasia}
                description="Tocá para ver su catálogo"
                pinColor={colores.verdeProfundo}
                onCalloutPress={() => abrirComercio(c)}
              />
            ))}
          </MapView>
          <Logo ancho={52} estilo={estilos.logoMapa} />
          {/* Tocar el mapa lo abre a pantalla completa */}
          <Pressable
            onPress={() => navigation?.navigate?.('Mapa')}
            accessibilityRole="button"
            accessibilityLabel="Abrir el mapa a pantalla completa"
            style={StyleSheet.absoluteFill}
          >
            <View style={[estilos.agrandar, { backgroundColor: colores.fondo }]}>
              <Icono nombre="expand-outline" tamano={16} color={colores.texto} />
              <Text style={[estilos.textoAgrandar, { color: colores.texto }]}>Ver mapa</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      <View style={estilos.cuerpo}>
        {error ? <MensajeError mensaje={error} alReintentar={cargar} /> : null}

        {/* "Cerca tuyo" con el buscador */}
        <View style={estilos.filaTitulo}>
          <Text style={[estilos.titulo, { color: colores.titulo }]}>Cerca tuyo</Text>
          <Pressable
            onPress={() => navigation?.navigate?.('Catalogo')}
            accessibilityRole="search"
            accessibilityLabel="Buscar"
            style={estilos.buscar}
          >
            <View style={[estilos.cajaBuscar, { backgroundColor: colores.panel, borderColor: colores.borde }]} />
            <Icono nombre="search" tamano={20} color={colores.texto} />
          </Pressable>
        </View>
      </View>

      {/* Búsquedas recientes: al tocar una, el catálogo se abre buscándola */}
      {recientes.length ? (
        <View style={estilos.recientes}>
          <Text style={[estilos.textoRecientes, { color: colores.gris, paddingHorizontal: espacio(2) }]}>
            Buscaste hace poco
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaRecientes}>
            {recientes.map((r) => (
              <Chip
                key={r}
                texto={r}
                icono="time-outline"
                onPress={() => navigation?.navigate?.('Catalogo', { q: r, t: Date.now() })}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        horizontal
        data={comercios}
        keyExtractor={(c) => String(c.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.carrusel}
        renderItem={({ item }) => (
          <TarjetaComercio comercio={item} foto={fotoDe[item.id]} onPress={() => abrirComercio(item)} />
        )}
        ListEmptyComponent={
          <Text style={[estilos.vacio, { color: colores.gris }]}>Todavía no hay comercios adheridos.</Text>
        }
      />

      {/* "Ver catálogo completo" y las ofertas */}
      <View style={estilos.cuerpo}>
        <Text
          onPress={() => navigation?.navigate?.('Catalogo')}
          accessibilityRole="link"
          style={[estilos.titulo, estilos.subrayado, { color: colores.titulo, marginTop: espacio(3) }]}
        >
          Ver catálogo completo
        </Text>
      </View>

      <FlatList
        horizontal
        data={ofertas.slice(0, 12)}
        keyExtractor={(p) => String(p.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.carrusel}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation?.navigate?.('DetalleProducto', { id: item.id })}
            accessibilityRole="button"
            accessibilityLabel={`${item.titulo}, ${km(item.distancia_km) || ''}`}
            style={({ pressed }) => [{ gap: 4 }, pressed && { opacity: 0.8 }]}
          >
            <Foto uri={item.imagen} emoji={emojiCategoria(item.categoria)} estilo={estilos.fotoProducto} />
            <Distancia valor={km(item.distancia_km)} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={[estilos.vacio, { color: colores.gris }]}>No hay ofertas por ahora.</Text>
        }
      />

      {/* Agregado: favoritos */}
      {misFavoritos.length ? (
        <>
          <View style={estilos.cuerpo}>
            <Text style={[estilos.titulo, { color: colores.titulo, marginTop: espacio(3) }]}>Tus favoritos</Text>
          </View>
          <FlatList
            horizontal
            data={misFavoritos}
            keyExtractor={(c) => `fav-${c.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.carrusel}
            renderItem={({ item }) => (
              <TarjetaComercio comercio={item} foto={fotoDe[item.id]} onPress={() => abrirComercio(item)} />
            )}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1),
  },
  botonBarra: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soporte: {
    marginHorizontal: espacio(2),
    marginBottom: espacio(1),
    borderRadius: 10,
    padding: espacio(1.25),
    gap: 2,
  },
  tituloSoporte: {
    fontFamily: fuentes.normal,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  textoSoporte: {
    fontFamily: fuentes.normal,
    fontSize: 11,
  },
  mapa: {
    height: 230,
  },
  agrandar: {
    position: 'absolute',
    top: espacio(1),
    left: espacio(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: espacio(1),
    paddingVertical: 4,
    borderRadius: 999,
  },
  textoAgrandar: {
    fontFamily: fuentes.negrita,
    fontSize: 11,
  },
  logoMapa: {
    position: 'absolute',
    right: espacio(1.5),
    bottom: espacio(1),
  },
  cuerpo: {
    paddingHorizontal: espacio(2),
  },
  recientes: {
    gap: espacio(0.75),
    marginTop: -espacio(0.5),
    marginBottom: espacio(1.5),
  },
  textoRecientes: {
    fontFamily: fuentes.media,
    fontSize: 12,
  },
  filaRecientes: {
    gap: espacio(1),
    paddingHorizontal: espacio(2),
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espacio(2.5),
    marginBottom: espacio(1.5),
  },
  titulo: {
    fontFamily: fuentes.normal,
    fontSize: 18,
  },
  subrayado: {
    textDecorationLine: 'underline',
    marginBottom: espacio(1.5),
  },
  buscar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  cajaBuscar: {
    width: 130,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  carrusel: {
    paddingHorizontal: espacio(2),
    gap: espacio(1.5),
  },
  comercio: {
    width: 150,
    gap: 3,
  },
  fotoComercio: {
    width: 150,
    height: 86,
    borderRadius: 10,
  },
  corazon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  sinFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombreComercio: {
    fontFamily: fuentes.negrita,
    fontSize: 12,
    marginTop: 3,
  },
  distancia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  textoKm: {
    fontFamily: fuentes.negrita,
    fontSize: 10,
  },
  verCatalogo: {
    fontFamily: fuentes.normal,
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  fotoProducto: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  vacio: {
    fontFamily: fuentes.normal,
    fontSize: 13,
  },
});
