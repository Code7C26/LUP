// PASO 43 · Detalle del comercio con mapa:
// nombre, rubro, dirección, horario de retiro, el mapa con el pin del local,
// "Cómo llegar" (abre Google Maps) y sus ofertas.
// Usa GET /api/comercios/<id>/ (paso 40) y GET /api/productos/?comercio=<id> (paso 41).
// Se abre con: navigation.navigate('DetalleComercio', { id: comercio.id })
// IGUAL AL MOCKUP (página 8): portada arriba (una foto de sus productos; si no hay, el mapa),
// el nombre en negrita con la flechita (despliega dirección, horario y "Cómo llegar")
// y los productos en filas: foto a la izquierda y tarjeta gris con "Reservar".
// Al final, "Opiniones": el promedio grande y las últimas 20 (con la respuesta del comercio, si hay).
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, urlCompleta } from '../api/cliente';
import BarraCarrito from '../componentes/BarraCarrito';
import Boton from '../componentes/Boton';
import BotonFavorito from '../componentes/BotonFavorito';
import BotonVolver from '../componentes/BotonVolver';
import CalificacionComercio from '../componentes/CalificacionComercio';
import Esqueleto from '../componentes/Esqueleto';
import Estrellas from '../componentes/Estrellas';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import FilaProducto from '../componentes/FilaProducto';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';

// "2026-10-26T14:30:00-03:00" -> "26/10/2026"
function textoFecha(fechaHora) {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return '';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

// Una opinión: estrellas y fecha, nombre y producto, comentario y la respuesta del comercio
function Opinion({ opinion, comercio }) {
  const { colores } = useTema();
  return (
    <View style={[estilos.opinion, { backgroundColor: colores.superficie }]}>
      <View style={estilos.filaEntre}>
        <Estrellas valor={opinion.puntaje} tamano={15} />
        <Text style={[estilos.mini, { color: colores.gris }]}>{textoFecha(opinion.creada_en)}</Text>
      </View>
      <Text style={[estilos.autor, { color: colores.titulo }]} numberOfLines={1}>
        {opinion.autor}
      </Text>
      {opinion.producto ? (
        <View style={estilos.linea}>
          <Icono nombre="bag-handle-outline" tamano={13} color={colores.gris} />
          <Text style={[estilos.mini, { color: colores.gris, flexShrink: 1 }]} numberOfLines={1}>
            {opinion.producto}
          </Text>
          {opinion.puntaje_producto ? (
            <View
              style={estilos.linea}
              accessible
              accessibilityLabel={`El producto: ${opinion.puntaje_producto} de 5 estrellas`}
            >
              <Icono nombre="star" tamano={11} color={colores.ambar} />
              <Text style={[estilos.mini, { color: colores.gris }]}>{opinion.puntaje_producto}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {opinion.comentario ? (
        <Text style={[estilos.comentario, { color: colores.texto }]}>{opinion.comentario}</Text>
      ) : null}

      {opinion.respuesta ? (
        <View style={[estilos.respuesta, { backgroundColor: colores.menta, borderLeftColor: colores.verde }]}>
          <View style={estilos.linea}>
            <Icono nombre="chatbubble-ellipses-outline" tamano={14} color={colores.verdeHover} />
            <Text style={[estilos.mini, { color: colores.verdeHover, fontFamily: fuentes.negrita, flex: 1 }]} numberOfLines={1}>
              Respuesta de {comercio}
            </Text>
          </View>
          <Text style={[estilos.comentario, { color: colores.texto }]}>{opinion.respuesta}</Text>
        </View>
      ) : null}
    </View>
  );
}

// "Opiniones": "★ 4,0 · 1 opinión" grande y la lista (o "Todavía no tiene opiniones")
function Opiniones({ comercio }) {
  const { colores } = useTema();
  const opiniones = comercio.opiniones || [];
  const cantidad = comercio.calificaciones || 0;
  const promedio = Number(comercio.calificacion_promedio);
  const hayPromedio = cantidad > 0 && comercio.calificacion_promedio !== null && !Number.isNaN(promedio);
  const textoCantidad = `${cantidad} ${cantidad === 1 ? 'opinión' : 'opiniones'}`;

  return (
    <View style={[estilos.cuerpo, estilos.seccion]}>
      <Text style={[estilos.tituloSeccion, { color: colores.titulo }]} accessibilityRole="header">
        Opiniones
      </Text>

      {hayPromedio ? (
        <View
          style={estilos.promedio}
          accessible
          accessibilityLabel={`${promedio.toFixed(1).replace('.', ',')} de 5 estrellas, ${textoCantidad}`}
        >
          <Icono nombre="star" tamano={28} color={colores.ambar} />
          <Text style={[estilos.numeroPromedio, { color: colores.titulo }]}>{promedio.toFixed(1).replace('.', ',')}</Text>
          <Text style={[estilos.texto, { color: colores.gris }]}>· {textoCantidad}</Text>
        </View>
      ) : null}

      {opiniones.length ? (
        opiniones.map((o) => <Opinion key={o.id} opinion={o} comercio={comercio.nombre_fantasia} />)
      ) : (
        <View style={[estilos.sinOpiniones, { backgroundColor: colores.superficie }]}>
          <Icono nombre="star-outline" tamano={22} color={colores.gris} />
          <Text style={[estilos.detalle, { color: colores.gris }]}>Todavía no tiene opiniones</Text>
        </View>
      )}
    </View>
  );
}

export default function DetalleComercio({ navigation, route }) {
  const { colores } = useTema();
  const { top } = useSafeAreaInsets();
  const id = route?.params?.id;

  const [comercio, setComercio] = useState(null);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [verDatos, setVerDatos] = useState(false); // la flechita al lado del nombre

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

  if (cargando) return <Esqueleto tipo="filas" />;

  if (!comercio) {
    return (
      <View style={{ flex: 1, padding: espacio(2), paddingTop: espacio(10), backgroundColor: colores.fondo }}>
        <MensajeError mensaje={error} alReintentar={cargar} />
        <BotonVolver navigation={navigation} />
      </View>
    );
  }

  const tieneUbicacion = comercio.latitud !== null && comercio.longitud !== null;
  const lat = Number(comercio.latitud);
  const lng = Number(comercio.longitud);
  const foto = productos.find((p) => p.imagen)?.imagen; // la API no tiene foto del local: se usa la de una oferta

  const encabezado = (
    <View style={{ marginBottom: espacio(2) }}>
      {/* Portada a todo lo ancho */}
      <View style={[estilos.portada, { backgroundColor: colores.panel }]}>
        {foto ? (
          <Image source={{ uri: urlCompleta(foto) }} style={StyleSheet.absoluteFill} accessibilityLabel={comercio.nombre_fantasia} />
        ) : tieneUbicacion ? (
          // Si no hay foto, el mapa fijo (sin mover ni zoom, para que no se trabe con el scroll)
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            accessibilityLabel={`Mapa con la ubicación de ${comercio.nombre_fantasia}`}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} title={comercio.nombre_fantasia} pinColor={colores.verdeProfundo} />
          </MapView>
        ) : null}
      </View>

      <View style={estilos.cuerpo}>
        {/* Nombre con la flechita */}
        <Pressable
          onPress={() => setVerDatos((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: verDatos }}
          accessibilityLabel={`${comercio.nombre_fantasia}. ${verDatos ? 'Ocultar' : 'Ver'} dirección y horario`}
          style={estilos.filaNombre}
        >
          <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={1}>
            {comercio.nombre_fantasia}
          </Text>
          <Icono nombre={verDatos ? 'chevron-up' : 'chevron-down'} tamano={20} color={colores.texto} />
        </Pressable>

        {/* "★ 4,6 (23)" (nada si todavía no tiene opiniones) */}
        <CalificacionComercio
          promedio={comercio.calificacion_promedio}
          cantidad={comercio.calificaciones}
          estilo={{ marginTop: 4 }}
        />

        {verDatos ? (
          <View style={estilos.datos}>
            <Text style={[estilos.detalle, { color: colores.gris }]}>{comercio.rubro_texto}</Text>
            <View style={estilos.linea}>
              <Icono nombre="location-outline" tamano={16} color={colores.gris} />
              <Text style={[estilos.texto, { color: colores.texto, flex: 1 }]}>{comercio.direccion}</Text>
            </View>
            <View style={estilos.linea}>
              <Icono nombre="time-outline" tamano={16} color={colores.gris} />
              <Text style={[estilos.texto, { color: colores.texto, flex: 1 }]}>{comercio.horario_atencion}</Text>
            </View>
            {comercio.descripcion ? (
              <Text style={[estilos.detalle, { color: colores.gris }]}>{comercio.descripcion}</Text>
            ) : null}
            {/* Si no hay ubicación, la API arma el link con la dirección */}
            <Boton
              texto="Cómo llegar"
              icono="navigate"
              chico
              onPress={() => Linking.openURL(comercio.como_llegar)}
              estilo={{ alignSelf: 'flex-start' }}
            />
          </View>
        ) : null}

        <MensajeError mensaje={error} alReintentar={cargar} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <FlatList
        style={{ backgroundColor: colores.fondo }}
        contentContainerStyle={{ paddingBottom: espacio(10) }}
        data={productos}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={encabezado}
        ListFooterComponent={<Opiniones comercio={comercio} />}
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
          <View style={estilos.vacio}>
            <Icono nombre="basket-outline" tamano={40} color={colores.gris} />
            <Text style={[estilos.detalle, { color: colores.gris }]}>Sin ofertas por ahora</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={estilos.cuerpo}>
            <FilaProducto producto={item} onPress={() => navigation.navigate('DetalleProducto', { id: item.id })} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacio(2) }} />}
      />
      <BarraCarrito navigation={navigation} />
      <BotonVolver navigation={navigation} />
      <BotonFavorito id={comercio.id} estilo={[estilos.favorito, { top: top + espacio(1) }]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  favorito: {
    position: 'absolute',
    right: espacio(2),
  },
  portada: {
    height: 250,
    overflow: 'hidden', // en Android, el mapa no respeta el borde sin esto
  },
  cuerpo: {
    paddingHorizontal: espacio(2),
  },
  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: espacio(2),
  },
  nombre: {
    flexShrink: 1,
    fontFamily: fuentes.negrita,
    fontSize: 20,
  },
  datos: {
    gap: espacio(1),
    marginTop: espacio(1),
  },
  linea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  vacio: {
    alignItems: 'center',
    gap: espacio(1),
    marginTop: espacio(2),
  },
  seccion: {
    marginTop: espacio(4),
    gap: espacio(1.5),
  },
  tituloSeccion: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.mediano,
  },
  promedio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numeroPromedio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.titulo,
  },
  opinion: {
    borderRadius: radio,
    padding: espacio(1.5),
    gap: 6,
  },
  filaEntre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio(1),
  },
  autor: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  mini: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  comentario: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    lineHeight: 19,
  },
  respuesta: {
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: espacio(1.25),
    gap: 4,
    marginTop: 2,
  },
  sinOpiniones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    borderRadius: radio,
    padding: espacio(2),
  },
});
