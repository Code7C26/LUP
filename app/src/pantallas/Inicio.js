// PASO 40 · Inicio, IGUAL AL MOCKUP (página 7 del PDF):
//   arriba: el menú ☰ a la izquierda (Perfil, Mis reservas, Mis favoritos, Apariencia y Soporte;
//   ver componentes/MenuLateral.js), al lado los auriculares de soporte (abren la Ayuda con Lü)
//   y compartir / carrito (con el número de productos) a la derecha
//   el mapa a todo lo ancho con los comercios y el logo en la esquina
//   "Cerca tuyo" con el buscador chiquito, y los comercios con foto, km y "Ver catálogo"
//   (agregado) "Vence hoy": las ofertas que hay que retirar hoy, si hay alguna
//   "Ver catálogo completo" y las fotos de las ofertas con sus km
//   (agregado) "Tus favoritos" al final, si marcaste alguno con el corazón
// Usa GET /api/comercios/?lat=&lng= y GET /api/productos/?orden=cercania&lat=&lng=
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
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
import CalificacionComercio, { textoCalificacion } from '../componentes/CalificacionComercio';
import Chip from '../componentes/Chip';
import Esqueleto from '../componentes/Esqueleto';
import Icono from '../componentes/Icono';
import Logo from '../componentes/Logo';
import MenuLateral from '../componentes/MenuLateral';
import MensajeError from '../componentes/MensajeError';
import { useBusquedas } from '../contexto/Busquedas';
import { useFavoritos } from '../contexto/Favoritos';
import { espacio, fuentes, useTema } from '../tema';
import { emojiCategoria, textoDistancia } from '../utilidades';

// "1 km", "350 m" (sin el "a" de adelante, como el mockup)
const km = (distancia) => textoDistancia(distancia)?.replace('a ', '') || null;

// La fecha de hoy en la hora del celular, como la manda Django: "2026-11-12"
// (no se usa toISOString() porque está en UTC y a la noche ya daría "mañana")
function hoyLocal() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

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

// Tarjeta de oferta (foto + km), la de "Vence hoy" y "Ver catálogo completo"
function TarjetaOferta({ producto, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${producto.titulo}, ${km(producto.distancia_km) || ''}`}
      style={({ pressed }) => [{ gap: 4 }, pressed && { opacity: 0.8 }]}
    >
      <Foto uri={producto.imagen} emoji={emojiCategoria(producto.categoria)} estilo={estilos.fotoProducto} />
      <Distancia valor={km(producto.distancia_km)} />
    </Pressable>
  );
}

// Tarjeta de comercio del carrusel "Cerca tuyo": foto, nombre, km, estrellas y "Ver catálogo"
function TarjetaComercio({ comercio, foto, onPress }) {
  const { colores } = useTema();
  const estrellas = textoCalificacion(comercio.calificacion_promedio, comercio.calificaciones);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[comercio.nombre_fantasia, estrellas, 'Ver catálogo'].filter(Boolean).join('. ')}
      style={({ pressed }) => [estilos.comercio, pressed && { opacity: 0.8 }]}
    >
      <View>
        <Foto uri={foto} icono="storefront-outline" estilo={estilos.fotoComercio} />
        <BotonFavorito id={comercio.id} chico estilo={[estilos.corazon, { backgroundColor: colores.superficie }]} />
      </View>
      <Text style={[estilos.nombreComercio, { color: colores.titulo }]} numberOfLines={1}>
        {comercio.nombre_fantasia}
      </Text>
      <View style={estilos.filaDatos}>
        <Distancia valor={km(comercio.distancia_km)} />
        <CalificacionComercio promedio={comercio.calificacion_promedio} cantidad={comercio.calificaciones} tamano={10} />
      </View>
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
  const [verMenu, setVerMenu] = useState(false);

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
  // "Vence hoy": de las mismas ofertas, las que hay que retirar hoy
  const hoy = hoyLocal();
  const vencenHoy = ofertas.filter((p) => String(p.fecha_vencimiento).slice(0, 10) === hoy);
  const abrirProducto = (p) => navigation?.navigate?.('DetalleProducto', { id: p.id });

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
      {/* Barra de arriba: el menú ☰ a la izquierda */}
      <View style={estilos.barra}>
        <Pressable
          onPress={() => setVerMenu(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Abrir el menú"
          style={[estilos.botonBarra, { backgroundColor: colores.panel }]}
        >
          <Icono nombre="menu" tamano={22} color={colores.texto} />
        </Pressable>
        {/* Soporte (auriculares, como el mockup): abre el chat de ayuda con Lü */}
        <Pressable
          onPress={() => navigation?.navigate?.('Ayuda', { desde: 'Inicio' })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ayuda: chatear con Lü"
          style={[estilos.botonBarra, { backgroundColor: colores.panel }]}
        >
          <Icono nombre="headset-outline" tamano={21} color={colores.texto} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={compartir} hitSlop={8} accessibilityRole="button" accessibilityLabel="Compartir Lüp" style={estilos.botonBarra}>
          <Icono nombre="share-social-outline" tamano={22} color={colores.texto} />
        </Pressable>
        <BotonCarrito navigation={navigation} />
      </View>

      <MenuLateral visible={verMenu} alCerrar={() => setVerMenu(false)} navigation={navigation} />

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

      {/* Agregado: "Vence hoy" (si no hay ninguna, no se muestra) */}
      {vencenHoy.length ? (
        <>
          <View style={[estilos.cuerpo, estilos.filaVenceHoy]}>
            <Icono nombre="time-outline" tamano={20} color={colores.ambar} />
            <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
              Vence hoy
            </Text>
          </View>
          <FlatList
            horizontal
            data={vencenHoy}
            keyExtractor={(p) => `hoy-${p.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.carrusel}
            renderItem={({ item }) => <TarjetaOferta producto={item} onPress={() => abrirProducto(item)} />}
          />
        </>
      ) : null}

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
        renderItem={({ item }) => <TarjetaOferta producto={item} onPress={() => abrirProducto(item)} />}
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
  filaVenceHoy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(0.75),
    marginTop: espacio(3),
    marginBottom: espacio(1.5),
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
  filaDatos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
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
