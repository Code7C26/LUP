// PASO 41 · Catálogo con búsqueda y filtros, como el catálogo de la web.
// Usa GET /api/productos/?q=&categoria=&comercio=&donacion=&orden=&lat=&lng=
// Si se llega desde "Ver catálogo" (Inicio), viene filtrado por ese comercio.
// Con el estilo del mockup: buscador, filtros y los productos en filas (foto + tarjeta gris con "Reservar").
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { api } from '../api/cliente';
import { useBusquedas } from '../contexto/Busquedas';
import BarraCarrito from '../componentes/BarraCarrito';
import Campo from '../componentes/Campo';
import Esqueleto from '../componentes/Esqueleto';
import Cargando from '../componentes/Cargando';
import Chip from '../componentes/Chip';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import FilaProducto from '../componentes/FilaProducto';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { emojiCategoria } from '../utilidades';

// Mismas categorías que la web (products/models.py → CATEGORIAS)
const CATEGORIAS = [
  ['', 'Todas'],
  ['panificados', 'Panificados'],
  ['comidas', 'Comidas'],
  ['frutas_verduras', 'Frutas y verduras'],
  ['lacteos', 'Lácteos'],
  ['carnes', 'Carnes'],
  ['almacen', 'Almacén'],
  ['bolsa_sorpresa', 'Bolsa sorpresa'],
  ['otros', 'Otros'],
];

const ORDENES = [
  ['recientes', 'Nuevos', 'sparkles-outline'],
  ['cercania', 'Cerca', 'navigate-outline'],
  ['precio', 'Baratos', 'pricetag-outline'],
  ['vencimiento', 'Vencen antes', 'time-outline'],
];

// Busca la ubicación SIN volver a pedir permiso (ya se pidió en "Cerca tuyo")
async function ubicacionSiHayPermiso() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const posicion =
      (await Location.getLastKnownPositionAsync()) ||
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return posicion?.coords || null;
  } catch {
    return null;
  }
}

export default function Catalogo({ navigation, route }) {
  const { colores } = useTema();
  const { recientes, guardarBusqueda, borrarBusquedas } = useBusquedas();

  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState(''); // el texto, pero con una pequeña espera
  const [categoria, setCategoria] = useState('');
  const [orden, setOrden] = useState('recientes');
  const [soloDonacion, setSoloDonacion] = useState(false);
  const [comercio, setComercio] = useState(null); // { id, nombre } si viene de "Ver catálogo"

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);

  // Si se llegó desde "Ver catálogo" de un comercio
  useEffect(() => {
    if (route?.params?.comercio) {
      setComercio({ id: route.params.comercio, nombre: route.params.nombre });
    }
  }, [route?.params?.comercio, route?.params?.nombre]);

  // La ubicación, una sola vez
  useEffect(() => {
    ubicacionSiHayPermiso().then(setCoords);
  }, []);

  // Espera medio segundo después de que se deja de escribir para buscar
  useEffect(() => {
    const espera = setTimeout(() => setBusqueda(texto.trim()), 500);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargar = useCallback(async () => {
    setError('');
    // Arma algo como: orden=recientes&q=medialunas&categoria=panificados&lat=..&lng=..
    const parametros = { orden };
    if (busqueda) parametros.q = busqueda;
    if (categoria) parametros.categoria = categoria;
    if (soloDonacion) parametros.donacion = '1';
    if (comercio) parametros.comercio = comercio.id;
    if (coords) {
      parametros.lat = coords.latitude;
      parametros.lng = coords.longitude;
    }
    const consulta = Object.entries(parametros)
      .map(([clave, valor]) => `${clave}=${encodeURIComponent(valor)}`)
      .join('&');
    try {
      const lista = await api(`/productos/?${consulta}`);
      setProductos(lista);
      if (busqueda && lista.length) guardarBusqueda(busqueda); // se recuerda solo si encontró algo
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [busqueda, categoria, orden, soloDonacion, comercio, coords]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const encabezado = (
    <View style={{ gap: espacio(1.5), marginBottom: espacio(1.5) }}>
      <Campo
        icono="search"
        placeholder="Buscar medialunas, verduras…"
        value={texto}
        onChangeText={setTexto}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {/* Búsquedas recientes (cuando el buscador está vacío) */}
      {!texto && recientes.length ? (
        <View style={estilos.recientes}>
          <View style={estilos.filaRecientes}>
            <Text style={[estilos.textoRecientes, { color: colores.gris }]}>Búsquedas recientes</Text>
            <Text
              onPress={borrarBusquedas}
              accessibilityRole="button"
              style={[estilos.textoRecientes, { color: colores.verdeHover, fontFamily: fuentes.negrita }]}
            >
              Borrar
            </Text>
          </View>
          <View style={estilos.chipsRecientes}>
            {recientes.map((r) => (
              <Chip key={r} texto={r} icono="time-outline" onPress={() => setTexto(r)} />
            ))}
          </View>
        </View>
      ) : null}

      {comercio ? (
        <Pressable
          onPress={() => setComercio(null)}
          accessibilityRole="button"
          accessibilityLabel={`Quitar filtro de ${comercio.nombre}`}
          style={[estilos.filtroComercio, { backgroundColor: colores.menta }]}
        >
          <Icono nombre="storefront" tamano={16} color={colores.verdeHover} />
          <Text style={[estilos.textoChip, { color: colores.titulo, flex: 1 }]} numberOfLines={1}>
            {comercio.nombre}
          </Text>
          <Icono nombre="close-circle" tamano={20} color={colores.verdeHover} />
        </Pressable>
      ) : null}

      {/* Categorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaChips}>
        {CATEGORIAS.map(([clave, nombre]) => (
          <Chip
            key={clave || 'todas'}
            texto={nombre}
            emoji={clave ? emojiCategoria(clave) : null}
            activo={categoria === clave}
            onPress={() => setCategoria(clave)}
          />
        ))}
      </ScrollView>

      {/* Orden y donación */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaChips}>
        {ORDENES.filter(([clave]) => clave !== 'cercania' || coords).map(([clave, nombre, icono]) => (
          <Chip key={clave} texto={nombre} icono={icono} activo={orden === clave} onPress={() => setOrden(clave)} />
        ))}
        <Chip texto="Donación" icono="heart-outline" activo={soloDonacion} onPress={() => setSoloDonacion((v) => !v)} />
      </ScrollView>

      <MensajeError mensaje={error} alReintentar={cargar} />

      {!error ? (
        <Text style={[estilos.cantidad, { color: colores.gris }]}>
          {productos.length === 1 ? '1 oferta' : `${productos.length} ofertas`}
        </Text>
      ) : null}
    </View>
  );

  if (cargando) return <Esqueleto tipo="filas" />;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <FlatList
        style={{ backgroundColor: colores.fondo }}
        contentContainerStyle={estilos.contenido}
        data={productos}
        keyExtractor={(p) => String(p.id)}
        keyboardShouldPersistTaps="handled"
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
          !error ? (
            <View style={estilos.vacio}>
              <Icono nombre="search-outline" tamano={44} color={colores.gris} />
              <Text style={[estilos.textoVacio, { color: colores.gris }]}>
                Nada por acá. Probá con otros filtros.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <FilaProducto
            producto={item}
            mostrarComercio
            onPress={() => navigation?.navigate?.('DetalleProducto', { id: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
      />
      <BarraCarrito navigation={navigation} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(10), // lugar para la barra "Ver carrito"
  },
  recientes: {
    gap: espacio(1),
  },
  filaRecientes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textoRecientes: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  chipsRecientes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio(0.75),
  },
  filaChips: {
    gap: espacio(1),
    paddingRight: espacio(2),
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radio,
    paddingHorizontal: espacio(1.5),
    paddingVertical: espacio(0.75),
  },
  textoChip: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  filtroComercio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    borderRadius: radio,
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1.25),
  },
  cantidad: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  vacio: {
    alignItems: 'center',
    gap: espacio(1),
    marginTop: espacio(4),
  },
  emojiVacio: {
    fontSize: 40,
  },
  textoVacio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
  },
});
