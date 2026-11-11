// Mapa a pantalla completa: todos los comercios con su pin. Se puede mover y hacer zoom.
// Al tocar un pin aparece abajo la tarjeta del comercio con "Ver catálogo" y "Cómo llegar".
// Se abre tocando el mapa de Inicio:  navigation.navigate('Mapa')
// Usa GET /api/comercios/?lat=&lng= (paso 40).
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import BotonFavorito from '../componentes/BotonFavorito';
import BotonVolver from '../componentes/BotonVolver';
import CalificacionComercio from '../componentes/CalificacionComercio';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import { espacio, fuentes, sombra, tamanos, useTema } from '../tema';
import { emojiRubro, textoDistancia } from '../utilidades';

// Córdoba, por si no hay ubicación ni comercios con pin
const CENTRO_POR_DEFECTO = { latitude: -31.4201, longitude: -64.1888 };

export default function Mapa({ navigation }) {
  const { colores } = useTema();
  const { top, bottom } = useSafeAreaInsets();
  const mapa = useRef(null);

  const [comercios, setComercios] = useState([]);
  const [coords, setCoords] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        let ubicacion = '';
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const posicion =
            (await Location.getLastKnownPositionAsync()) ||
            (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
          if (posicion) {
            setCoords({ latitude: posicion.coords.latitude, longitude: posicion.coords.longitude });
            ubicacion = `?lat=${posicion.coords.latitude}&lng=${posicion.coords.longitude}`;
          }
        }
        const lista = await api(`/comercios/${ubicacion}`);
        setComercios(lista.filter((c) => c.latitud !== null && c.longitud !== null));
      } catch (e) {
        setError(e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (cargando) return <Cargando texto="Abriendo el mapa…" />;

  const primero = comercios[0];
  const centro =
    coords || (primero ? { latitude: Number(primero.latitud), longitude: Number(primero.longitud) } : CENTRO_POR_DEFECTO);
  const distancia = elegido ? textoDistancia(elegido.distancia_km) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...centro, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        showsUserLocation={!!coords}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setElegido(null)}
      >
        {comercios.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: Number(c.latitud), longitude: Number(c.longitud) }}
            pinColor={c.ofertas ? colores.verdeProfundo : '#9E9E9E'}
            onPress={(e) => {
              e.stopPropagation?.();
              setElegido(c);
            }}
          />
        ))}
      </MapView>

      <BotonVolver navigation={navigation} />

      {/* Volver a mi ubicación */}
      {coords ? (
        <Pressable
          onPress={() => mapa.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400)}
          accessibilityRole="button"
          accessibilityLabel="Ir a mi ubicación"
          style={[estilos.miUbicacion, { top: top + espacio(1), backgroundColor: colores.superficie }, sombra(colores)]}
        >
          <Icono nombre="locate" tamano={20} color={colores.texto} />
        </Pressable>
      ) : null}

      {error ? (
        <View style={[estilos.error, { top: top + espacio(7) }]}>
          <MensajeError mensaje={error} />
        </View>
      ) : null}

      {/* Tarjeta del comercio elegido */}
      {elegido ? (
        <View style={[estilos.tarjeta, { backgroundColor: colores.fondo, bottom: bottom + espacio(2) }, sombra(colores, 3)]}>
          <View style={estilos.fila}>
            <View style={[estilos.icono, { backgroundColor: colores.panel }]}>
              <Text style={{ fontSize: 26 }}>{emojiRubro(elegido.rubro)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={1}>
                {elegido.nombre_fantasia}
              </Text>
              <CalificacionComercio promedio={elegido.calificacion_promedio} cantidad={elegido.calificaciones} />
              <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={1}>
                {[distancia?.replace('a ', ''), elegido.rubro_texto, elegido.horario_atencion].filter(Boolean).join(' · ')}
              </Text>
              <Text style={[estilos.detalle, { color: elegido.ofertas ? colores.verde : colores.gris, fontFamily: fuentes.negrita }]}>
                {elegido.ofertas ? `${elegido.ofertas} ${elegido.ofertas === 1 ? 'oferta' : 'ofertas'}` : 'Sin ofertas por ahora'}
              </Text>
            </View>
            <BotonFavorito id={elegido.id} chico />
          </View>
          <View style={estilos.fila}>
            <Boton
              texto="Ver catálogo"
              chico
              onPress={() => navigation.navigate('DetalleComercio', { id: elegido.id })}
              estilo={{ flex: 1 }}
            />
            <Boton
              texto="Cómo llegar"
              icono="navigate"
              variante="secundario"
              chico
              onPress={() => Linking.openURL(elegido.como_llegar)}
              estilo={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <View style={[estilos.ayuda, { backgroundColor: colores.fondo, bottom: bottom + espacio(2) }, sombra(colores, 2)]}>
          <Icono nombre="hand-left-outline" tamano={16} color={colores.gris} />
          <Text style={[estilos.detalle, { color: colores.gris }]}>
            {comercios.length ? 'Tocá un pin para ver el comercio' : 'Todavía no hay comercios en el mapa'}
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  miUbicacion: {
    position: 'absolute',
    right: espacio(2),
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    position: 'absolute',
    left: espacio(2),
    right: espacio(2),
  },
  tarjeta: {
    position: 'absolute',
    left: espacio(2),
    right: espacio(2),
    borderRadius: 18,
    padding: espacio(1.5),
    gap: espacio(1.5),
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.25),
  },
  icono: {
    width: 52,
    height: 52,
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
  ayuda: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1),
    borderRadius: 999,
  },
});
