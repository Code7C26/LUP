// PASO 40 · Inicio del consumidor:
//   arriba: el menú ☰ a la izquierda (Perfil, Mis reservas, Mis favoritos, Apariencia y Soporte;
//   ver componentes/MenuLateral.js), al lado el botón "Ayuda" (abre el chat con Lü, como el de la web)
//   y compartir / carrito (con el número de productos) a la derecha
//   la cabecera verde ("Hola, Ana" · "Salvá comida rica" y el buscador, que abre la pestaña Buscar)
//   las categorías en pastillas de texto (abren Buscar con esa categoría)
//   el mapa a todo lo ancho con los comercios y el logo en la esquina
//   "Cerca tuyo" (los comercios con foto, km y estrellas), "Vence hoy" (si hay alguna), "Ofertas"
//   y "Tus favoritos" (si marcaste alguno con el corazón). Al final, "¿Sabías que…?" con un tip al azar.
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
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

import { api, urlCompleta } from '../api/cliente';
import BotonCarrito from '../componentes/BotonCarrito';
import BotonFavorito from '../componentes/BotonFavorito';
import CabeceraUsuario from '../componentes/CabeceraUsuario';
import { promedioConComa, textoCalificacion } from '../componentes/CalificacionComercio';
import Esqueleto from '../componentes/Esqueleto';
import Icono from '../componentes/Icono';
import IconoCategoria from '../componentes/IconoCategoria';
import Logo from '../componentes/Logo';
import MenuLateral from '../componentes/MenuLateral';
import MensajeError from '../componentes/MensajeError';
import Pastilla from '../componentes/Pastilla';
import PastillaDescuento, { porcentajeDescuento } from '../componentes/PastillaDescuento';
import TituloSeccion from '../componentes/TituloSeccion';
import { useBusquedas } from '../contexto/Busquedas';
import { useFavoritos } from '../contexto/Favoritos';
import { useIdioma } from '../contexto/Idioma';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, useTema } from '../tema';
import { CATEGORIAS, formatoPrecio, hoyLocal, textoKm } from '../utilidades';

// "1 km", "350 m" (sin el "a" de adelante, como el mockup)
const km = (distancia) => textoKm(distancia) || null;

const presionado = { transform: [{ scale: 0.97 }] };

// Un tip al azar que no sea el que se estaba mostrando: se sortea entre los otros n - 1
function otroTip(anterior, cantidad) {
  if (cantidad <= 1) return 0;
  if (anterior === null) return Math.floor(Math.random() * cantidad);
  const nuevo = Math.floor(Math.random() * (cantidad - 1));
  return nuevo >= anterior ? nuevo + 1 : nuevo;
}

// Foto con bordes redondeados. Sin foto: la ilustración de la categoría (producto) o del rubro (comercio)
function Foto({ uri, categoria, rubro, estilo }) {
  const { colores } = useTema();
  return (
    <View style={[estilo, { backgroundColor: colores.panel, overflow: 'hidden' }]}>
      {uri ? (
        <Image source={{ uri: urlCompleta(uri) }} style={StyleSheet.absoluteFill} />
      ) : (
        <IconoCategoria categoria={categoria} rubro={rubro} llenar tamano={34} />
      )}
    </View>
  );
}

// Al final: "¿Sabías que…?" (Inicio elige el tip: cambia al abrir la pantalla y al deslizar para actualizar)
function TarjetaTip({ tip }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  if (!tip) return null;
  return (
    <View style={[estilos.tip, { backgroundColor: colores.menta }]} accessible>
      <Text style={[estilos.tituloTip, { color: colores.verdeProfundo }]}>{t('inicio.sabiasQue')}</Text>
      <Text style={[estilos.textoTip, { color: colores.texto }]}>{tip}</Text>
    </View>
  );
}

// Oferta de los carruseles ("Vence hoy" y "Ofertas"): la foto grande, el nombre y "precio · km"
function TarjetaOferta({ producto, onPress }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const porcentaje = porcentajeDescuento(producto);
  const linea = [formatoPrecio(producto.precio_descuento), km(producto.distancia_km)].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[producto.titulo, linea, porcentaje && t('inicio.descuentoAccesible', { n: porcentaje })]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [estilos.oferta, pressed && presionado]}
    >
      <View>
        <Foto uri={producto.imagen} categoria={producto.categoria} estilo={estilos.fotoOferta} />
        <PastillaDescuento porcentaje={porcentaje} />
      </View>
      <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={1}>
        {producto.titulo}
      </Text>
      <Text style={[estilos.linea, { color: colores.grisVerde }]} numberOfLines={1}>
        {linea}
      </Text>
    </Pressable>
  );
}

// Comercio de "Cerca tuyo" y "Tus favoritos": la foto con el corazón, el nombre y "km · ★ 4,6"
function TarjetaComercio({ comercio, foto, onPress }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const promedio = promedioConComa(comercio.calificacion_promedio, comercio.calificaciones);
  const linea = [
    km(comercio.distancia_km),
    promedio && `★ ${promedio}`,
    !comercio.ofertas && t('inicio.sinOfertas'),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        comercio.nombre_fantasia,
        km(comercio.distancia_km),
        textoCalificacion(comercio.calificacion_promedio, comercio.calificaciones),
        comercio.ofertas ? t('inicio.verCatalogo') : t('inicio.sinOfertas'),
      ]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => [estilos.comercio, pressed && presionado]}
    >
      <View>
        <Foto uri={foto} rubro={comercio.rubro} estilo={estilos.fotoComercio} />
        <BotonFavorito id={comercio.id} chico estilo={[estilos.corazon, { backgroundColor: colores.superficie }]} />
      </View>
      <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={1}>
        {comercio.nombre_fantasia}
      </Text>
      {linea ? (
        <Text style={[estilos.linea, { color: colores.grisVerde }]} numberOfLines={1}>
          {linea}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function Inicio({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { favoritos } = useFavoritos();
  const { recientes } = useBusquedas();
  const { usuario } = useSesion();
  const primerNombre = usuario?.nombre?.split(' ')[0];

  const [comercios, setComercios] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [coords, setCoords] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [verMenu, setVerMenu] = useState(false);

  const tips = t('inicio.tips');
  const cantidadTips = Array.isArray(tips) ? tips.length : 0;
  const [indiceTip, setIndiceTip] = useState(null);
  const cambiarTip = useCallback(() => setIndiceTip((anterior) => otroTip(anterior, cantidadTips)), [cantidadTips]);

  // Al abrir Inicio y cada vez que se vuelve a esta pestaña
  useFocusEffect(cambiarTip);

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
    Share.share({ message: t('inicio.compartirMensaje') }).catch(() => {});
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
  const saludo = primerNombre ? t('inicio.holaNombre', { nombre: primerNombre }) : t('inicio.hola');

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
            cambiarTip();
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
          accessibilityLabel={t('inicio.abrirMenu')}
          style={[estilos.botonBarra, { backgroundColor: colores.panel }]}
        >
          <Icono nombre="menu" tamano={22} color={colores.texto} />
        </Pressable>
        {/* "Ayuda" (el mismo botón del chat de la web, más chico): abre el chat de ayuda con Lü */}
        <Pressable
          onPress={() => navigation?.navigate?.('Ayuda', { desde: 'Inicio' })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('inicio.ayudaAccesible')}
          style={({ pressed }) => [
            estilos.botonAyuda,
            { backgroundColor: colores.verdeProfundo },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Icono nombre="chatbubble-ellipses" tamano={15} color={colores.sobreVerdeProfundo} />
          <Text style={[estilos.textoAyuda, { color: colores.sobreVerdeProfundo }]}>{t('inicio.ayuda')}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={compartir} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('inicio.compartir')} style={estilos.botonBarra}>
          <Icono nombre="share-social-outline" tamano={22} color={colores.texto} />
        </Pressable>
        <BotonCarrito navigation={navigation} />
      </View>

      <MenuLateral visible={verMenu} alCerrar={() => setVerMenu(false)} navigation={navigation} />

      {/* La cabecera: tocarla (o el buscador) abre la pestaña Buscar */}
      <CabeceraUsuario
        foto={urlCompleta(usuario?.foto)}
        nombre={primerNombre}
        arriba={saludo}
        titulo={t('inicio.saludoTitulo')}
        alTocar={() => navigation?.navigate?.('Catalogo')}
        accessibilityLabel={`${saludo}. ${t('inicio.saludoTitulo')}. ${t('inicio.buscar')}`}
        accessibilityHint={t('inicio.saludoPista')}
        estilo={estilos.cabecera}
      >
        <View style={estilos.buscador}>
          <Icono nombre="search" tamano={17} color={colores.crema} />
          <Text style={[estilos.textoBuscador, { color: colores.crema }]}>{t('inicio.buscar')}</Text>
        </View>
      </CabeceraUsuario>

      {/* Categorías: abren "Buscar" con esa categoría ya filtrada */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaPastillas}>
        {CATEGORIAS.map(([clave, texto]) => (
          <Pastilla
            key={clave}
            texto={t(texto)}
            accessibilityLabel={t('inicio.verCategoria', { nombre: t(texto) })}
            alTocar={() => navigation?.navigate?.('Catalogo', { categoria: clave, t: Date.now() })}
          />
        ))}
      </ScrollView>

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
            accessibilityLabel={t('inicio.mapaAccesible')}
          >
            {conUbicacion.map((c) => (
              <Marker
                key={c.id}
                coordinate={{ latitude: Number(c.latitud), longitude: Number(c.longitud) }}
                title={c.nombre_fantasia}
                description={t('inicio.tocaParaVer')}
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
            accessibilityLabel={t('inicio.mapaCompleto')}
            style={StyleSheet.absoluteFill}
          >
            <View style={[estilos.agrandar, { backgroundColor: colores.fondo }]}>
              <Icono nombre="expand-outline" tamano={16} color={colores.texto} />
              <Text style={[estilos.textoAgrandar, { color: colores.texto }]}>{t('inicio.verMapa')}</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      <View style={estilos.cuerpo}>
        {error ? <MensajeError mensaje={error} alReintentar={cargar} /> : null}
        {/* "Cerca tuyo": "Ver todo" abre el mapa con todos los comercios */}
        <TituloSeccion
          texto={t('inicio.cercaTuyo')}
          accion={t('inicio.verTodo')}
          alTocarAccion={() => navigation?.navigate?.('Mapa')}
        />
      </View>

      {/* Búsquedas recientes: al tocar una, el catálogo se abre buscándola */}
      {recientes.length ? (
        <View style={estilos.recientes}>
          <Text style={[estilos.textoRecientes, { color: colores.grisVerde }]}>{t('inicio.buscasteHacePoco')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaPastillas}>
            {recientes.map((r) => (
              <Pastilla key={r} texto={r} alTocar={() => navigation?.navigate?.('Catalogo', { q: r, t: Date.now() })} />
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
        ListEmptyComponent={<Text style={[estilos.vacio, { color: colores.gris }]}>{t('inicio.sinComercios')}</Text>}
      />

      {/* "Vence hoy" (si no hay ninguna, no se muestra) */}
      {vencenHoy.length ? (
        <>
          <View style={estilos.cuerpo}>
            <TituloSeccion texto={t('inicio.venceHoy')} />
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

      {/* Las ofertas: "Ver todo" abre el catálogo completo */}
      <View style={estilos.cuerpo}>
        <TituloSeccion
          texto={t('inicio.ofertas')}
          accion={t('inicio.verTodo')}
          alTocarAccion={() => navigation?.navigate?.('Catalogo')}
        />
      </View>
      <FlatList
        horizontal
        data={ofertas.slice(0, 12)}
        keyExtractor={(p) => String(p.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.carrusel}
        renderItem={({ item }) => <TarjetaOferta producto={item} onPress={() => abrirProducto(item)} />}
        ListEmptyComponent={<Text style={[estilos.vacio, { color: colores.gris }]}>{t('inicio.noHayOfertas')}</Text>}
      />

      {/* Favoritos */}
      {misFavoritos.length ? (
        <>
          <View style={estilos.cuerpo}>
            <TituloSeccion
              texto={t('inicio.tusFavoritos')}
              accion={t('inicio.verTodo')}
              alTocarAccion={() => navigation?.navigate?.('MisFavoritos')}
            />
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

      <View style={estilos.cuerpo}>
        <TarjetaTip tip={indiceTip === null ? null : tips[indiceTip]} />
      </View>
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
  botonAyuda: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  textoAyuda: {
    fontFamily: fuentes.boton,
    fontSize: 13,
  },
  // ---- Cabecera ----
  cabecera: {
    marginHorizontal: espacio(2),
    marginTop: espacio(0.5),
  },
  buscador: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    paddingHorizontal: espacio(1.5),
    borderRadius: 14,
    backgroundColor: 'rgba(244, 241, 232, 0.13)',
  },
  textoBuscador: {
    fontFamily: fuentes.normal,
    fontSize: 14,
    opacity: 0.9,
  },
  filaPastillas: {
    gap: espacio(1),
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1.5),
  },
  // ---- Mapa ----
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
  // ---- Secciones ----
  cuerpo: {
    paddingHorizontal: espacio(2),
  },
  recientes: {
    marginTop: -espacio(0.5),
  },
  textoRecientes: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    paddingHorizontal: espacio(2),
  },
  carrusel: {
    paddingHorizontal: espacio(2),
    gap: espacio(1.75),
  },
  // ---- Tarjetas (sin caja: la foto, el nombre y una línea gris) ----
  oferta: {
    width: 136,
    gap: 2,
  },
  fotoOferta: {
    width: 136,
    height: 140,
    borderRadius: 14,
    marginBottom: 6,
  },
  comercio: {
    width: 168,
    gap: 2,
  },
  fotoComercio: {
    width: 168,
    height: 112,
    borderRadius: 14,
    marginBottom: 6,
  },
  corazon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  nombre: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  linea: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  vacio: {
    fontFamily: fuentes.normal,
    fontSize: 13,
  },
  // ---- Tip ----
  tip: {
    gap: 4,
    marginTop: espacio(4),
    padding: espacio(2),
    borderRadius: 14,
  },
  tituloTip: {
    fontFamily: fuentes.semi,
    fontSize: 13,
  },
  textoTip: {
    fontFamily: fuentes.normal,
    fontSize: 13,
    lineHeight: 19,
  },
});
