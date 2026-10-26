// PASO 41 · Catálogo con búsqueda y filtros, como el catálogo de la web.
// Usa GET /api/productos/?q=&categoria=&comercio=&donacion=&orden=&lat=&lng=
// Si se llega desde "Ver catálogo" (Inicio), viene filtrado por ese comercio.
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { api } from '../api/cliente';
import Campo from '../componentes/Campo';
import Cargando from '../componentes/Cargando';
import MensajeError from '../componentes/MensajeError';
import TarjetaProducto from '../componentes/TarjetaProducto';
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
  ['recientes', 'Más nuevos'],
  ['cercania', 'Más cerca'],
  ['precio', 'Más baratos'],
  ['vencimiento', 'Vencen antes'],
];

// Botoncito redondeado para los filtros
function Chip({ texto, activo, onPress }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={[
        estilos.chip,
        { borderColor: activo ? colores.verde : colores.borde, backgroundColor: activo ? colores.verde : colores.superficie },
      ]}
    >
      <Text style={[estilos.textoChip, { color: activo ? colores.sobreVerde : colores.texto }]}>{texto}</Text>
    </Pressable>
  );
}

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
      setProductos(await api(`/productos/?${consulta}`));
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
        placeholder="Buscar medialunas, verduras, un comercio…"
        value={texto}
        onChangeText={setTexto}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {comercio ? (
        <Pressable
          onPress={() => setComercio(null)}
          accessibilityRole="button"
          accessibilityLabel={`Quitar filtro de ${comercio.nombre}`}
          style={[estilos.filtroComercio, { backgroundColor: colores.menta }]}
        >
          <Text style={[estilos.textoChip, { color: colores.titulo, flex: 1 }]} numberOfLines={1}>
            🏪 Solo {comercio.nombre}
          </Text>
          <Text style={[estilos.textoChip, { color: colores.verdeHover }]}>Ver todos ✕</Text>
        </Pressable>
      ) : null}

      {/* Categorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaChips}>
        {CATEGORIAS.map(([clave, nombre]) => (
          <Chip
            key={clave || 'todas'}
            texto={clave ? `${emojiCategoria(clave)} ${nombre}` : nombre}
            activo={categoria === clave}
            onPress={() => setCategoria(clave)}
          />
        ))}
      </ScrollView>

      {/* Orden y donación */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaChips}>
        {ORDENES.filter(([clave]) => clave !== 'cercania' || coords).map(([clave, nombre]) => (
          <Chip key={clave} texto={nombre} activo={orden === clave} onPress={() => setOrden(clave)} />
        ))}
        <Chip texto="💚 Para donación" activo={soloDonacion} onPress={() => setSoloDonacion((v) => !v)} />
      </ScrollView>

      <MensajeError mensaje={error} alReintentar={cargar} />

      {!error ? (
        <Text style={[estilos.cantidad, { color: colores.gris }]}>
          {productos.length === 1 ? '1 oferta' : `${productos.length} ofertas`}
        </Text>
      ) : null}
    </View>
  );

  if (cargando) return <Cargando texto="Buscando ofertas…" />;

  return (
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
            <Text style={estilos.emojiVacio}>🔎</Text>
            <Text style={[estilos.textoVacio, { color: colores.gris }]}>
              No encontramos ofertas con esos filtros.
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TarjetaProducto
          producto={item}
          onPress={() => navigation?.navigate?.('DetalleProducto', { id: item.id })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
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
