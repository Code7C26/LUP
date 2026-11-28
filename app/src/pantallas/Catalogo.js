// PASO 41 · Buscar: el catálogo con búsqueda y filtros, como el catálogo de la web.
// Usa GET /api/productos/?q=&categoria=&comercio=&donacion=&orden=&lat=&lng=
// Si se llega desde "Ver catálogo" (Inicio), viene filtrado por ese comercio; desde una categoría de Inicio, por esa categoría.
// Arriba, el buscador grande (busca mientras escribís, con 400 ms de espera) y el botón "Filtros" (orden y
// "Solo donables" en una hoja desde abajo). Antes de buscar: búsquedas recientes, ideas para buscar, las categorías
// en cuadraditos y las ofertas recientes. Buscando: las categorías en pastillas, "N resultados para …" y las tarjetas.
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { api } from '../api/cliente';
import { useBusquedas } from '../contexto/Busquedas';
import BarraCarrito from '../componentes/BarraCarrito';
import Boton from '../componentes/Boton';
import Chip from '../componentes/Chip';
import Esqueleto from '../componentes/Esqueleto';
import FilaProducto from '../componentes/FilaProducto';
import GrillaCategorias from '../componentes/GrillaCategorias';
import HojaAbajo from '../componentes/HojaAbajo';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import TituloSeccion from '../componentes/TituloSeccion';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import { CATEGORIAS, tonoCategoria } from '../utilidades';

// "Ideas para buscar". Quedan en castellano en los dos idiomas: son palabras que se buscan en los títulos de las ofertas.
const SUGERENCIAS = ['Medialunas', 'Pan', 'Verduras', 'Facturas', 'Viandas', 'Bolsa sorpresa'];

const ORDENES = [
  ['recientes', 'catalogo.nuevos', 'sparkles-outline'],
  ['cercania', 'catalogo.cerca', 'navigate-outline'],
  ['precio', 'catalogo.baratos', 'pricetag-outline'],
  ['vencimiento', 'catalogo.vencenAntes', 'time-outline'],
];

const ESPERA_BUSQUEDA = 400; // ms después de la última letra

const presionado = { transform: [{ scale: 0.97 }] };

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

// Pastillas sugeridas, con fondo menta
function Ideas({ alElegir, centradas }) {
  return (
    <View style={[estilos.pastillas, centradas && { justifyContent: 'center' }]}>
      {SUGERENCIAS.map((s) => (
        <Chip key={s} texto={s} icono="search-outline" tono="menta" onPress={() => alElegir(s)} />
      ))}
    </View>
  );
}

// Botón cuadrado redondeado al lado del buscador; con un numerito si hay filtros activos
function BotonFiltros({ cantidad, alTocar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={cantidad ? t('catalogo.filtrosActivos', { n: cantidad }) : t('catalogo.filtros')}
      style={({ pressed }) => [estilos.botonFiltros, { backgroundColor: colores.campo }, pressed && presionado]}
    >
      <Icono nombre="options-outline" tamano={22} color={colores.texto} />
      {cantidad ? (
        <View style={[estilos.puntito, { backgroundColor: colores.verdeProfundo, borderColor: colores.fondo }]}>
          <Text style={[estilos.textoPuntito, { color: colores.sobreVerdeProfundo }]}>{cantidad}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Hoja de filtros: el orden (lista con check) y "Solo donables". Se aplica recién al tocar "Aplicar".
// Se monta al abrirla, así arranca con los filtros que están puestos.
function HojaFiltros({ orden, soloDonacion, conUbicacion, alCerrar, alAplicar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const [ordenElegido, setOrdenElegido] = useState(orden);
  const [donables, setDonables] = useState(soloDonacion);

  return (
    <HojaAbajo visible alCerrar={alCerrar} titulo={t('catalogo.filtros')}>
      <View style={{ gap: espacio(0.5) }}>
        <Text style={[estilos.tituloOrden, { color: colores.grisVerde }]}>{t('catalogo.ordenarPor')}</Text>
        <View accessibilityRole="radiogroup">
          {ORDENES.filter(([clave]) => clave !== 'cercania' || conUbicacion).map(([clave, nombre, icono]) => {
            const elegido = ordenElegido === clave;
            return (
              <Pressable
                key={clave}
                onPress={() => setOrdenElegido(clave)}
                accessibilityRole="radio"
                accessibilityState={{ selected: elegido }}
                style={({ pressed }) => [
                  estilos.opcionOrden,
                  { borderColor: colores.borde },
                  pressed && { backgroundColor: colores.campo },
                ]}
              >
                <Icono nombre={icono} tamano={18} color={elegido ? colores.verdeHover : colores.gris} />
                <Text
                  style={[
                    estilos.textoOrden,
                    { color: colores.texto, fontFamily: elegido ? fuentes.semi : fuentes.normal },
                  ]}
                >
                  {t(nombre)}
                </Text>
                {elegido ? <Icono nombre="checkmark" tamano={20} color={colores.verdeHover} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={estilos.filaDonables}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.textoOrden, { color: colores.texto, fontFamily: fuentes.media }]}>
            {t('catalogo.soloDonables')}
          </Text>
          <Text style={[estilos.ayuda, { color: colores.gris }]}>{t('catalogo.soloDonablesAyuda')}</Text>
        </View>
        <Switch
          value={donables}
          onValueChange={setDonables}
          accessibilityLabel={t('catalogo.soloDonables')}
          trackColor={{ false: colores.borde, true: colores.verde }}
          thumbColor={Platform.OS === 'android' ? (donables ? colores.verdeProfundo : colores.fondo) : undefined}
          ios_backgroundColor={colores.borde}
        />
      </View>

      <Boton texto={t('catalogo.aplicar')} onPress={() => alAplicar(ordenElegido, donables)} />
    </HojaAbajo>
  );
}

// Sin resultados: la lupa en un círculo menta, "No encontramos …" y las ideas.
// Antes de buscar (sin filtros) las ideas ya están arriba, así que acá no se repiten.
function SinResultados({ busqueda, explorando, alElegirIdea }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const titulo = busqueda
    ? t('catalogo.noEncontramos', { q: busqueda })
    : explorando
      ? t('inicio.noHayOfertas')
      : t('catalogo.sinResultados');
  return (
    <View style={estilos.vacio}>
      <View style={[estilos.circuloVacio, { backgroundColor: colores.menta }]}>
        <Icono nombre="search" tamano={40} color={colores.verdeHover} />
      </View>
      <Text style={[estilos.tituloVacio, { color: colores.titulo }]}>{titulo}</Text>
      {!explorando ? (
        <>
          <Text style={[estilos.textoVacio, { color: colores.gris }]}>{t('catalogo.probaOtra')}</Text>
          <Ideas alElegir={alElegirIdea} centradas />
        </>
      ) : null}
    </View>
  );
}

export default function Catalogo({ navigation, route }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { recientes, guardarBusqueda, borrarBusquedas } = useBusquedas();

  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState(''); // el texto, pero con una pequeña espera
  const [categoria, setCategoria] = useState('');
  const [orden, setOrden] = useState('recientes');
  const [soloDonacion, setSoloDonacion] = useState(false);
  const [comercio, setComercio] = useState(null); // { id, nombre } si viene de "Ver catálogo"
  const [verFiltros, setVerFiltros] = useState(false);

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);
  // Estrellas de cada comercio (la API de productos no las trae): { idComercio: { promedio, cantidad } }
  const [calificaciones, setCalificaciones] = useState({});

  // Si se llegó desde "Ver catálogo" de un comercio
  useEffect(() => {
    if (route?.params?.comercio) {
      setComercio({ id: route.params.comercio, nombre: route.params.nombre });
    }
  }, [route?.params?.comercio, route?.params?.nombre]);

  // Si se llegó desde una búsqueda reciente de Inicio: navigate('Catalogo', { q, t: Date.now() })
  useEffect(() => {
    const q = route?.params?.q;
    if (!q) return;
    setTexto(q);
    setBusqueda(q); // busca al toque, sin esperar
  }, [route?.params?.q, route?.params?.t]);

  // Si se llegó tocando una categoría de Inicio: navigate('Catalogo', { categoria, t: Date.now() })
  useEffect(() => {
    const c = route?.params?.categoria;
    if (c) setCategoria(c);
  }, [route?.params?.categoria, route?.params?.t]);

  // La ubicación, una sola vez
  useEffect(() => {
    ubicacionSiHayPermiso().then(setCoords);
  }, []);

  // Busca mientras escribís, pero recién cuando dejás de escribir por un ratito (no en cada letra)
  useEffect(() => {
    const espera = setTimeout(() => setBusqueda(texto.trim()), ESPERA_BUSQUEDA);
    return () => clearTimeout(espera);
  }, [texto]);

  // Una sola vez al abrir: las estrellas de los comercios, para mostrarlas en cada producto.
  // Si falla, el catálogo se ve igual, sin estrellas.
  useEffect(() => {
    let activo = true;
    api('/comercios/')
      .then((lista) => {
        if (!activo) return;
        setCalificaciones(
          Object.fromEntries(lista.map((c) => [c.id, { promedio: c.calificacion_promedio, cantidad: c.calificaciones || 0 }]))
        );
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

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

  // Tocar una búsqueda reciente o una idea: busca al toque, sin esperar
  function buscarYa(palabra) {
    setTexto(palabra);
    setBusqueda(palabra);
  }

  if (cargando) return <Esqueleto tipo="catalogo" />;

  const filtrosActivos = (orden !== 'recientes' ? 1 : 0) + (soloDonacion ? 1 : 0);
  // Antes de buscar: sin texto ni filtros
  const explorando = !texto.trim() && !busqueda && !categoria && !comercio && !filtrosActivos;

  const encabezado = (
    <View style={estilos.cabecera}>
      <View style={estilos.filaBuscador}>
        <View style={[estilos.buscador, { backgroundColor: colores.campo }]}>
          <Icono nombre="search" tamano={20} color={colores.gris} />
          <TextInput
            style={[estilos.inputBuscador, { color: colores.texto }]}
            placeholder={t('catalogo.buscarPlaceholder')}
            placeholderTextColor={colores.gris}
            accessibilityLabel={t('catalogo.buscarPlaceholder')}
            value={texto}
            onChangeText={setTexto}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              setBusqueda(texto.trim()); // al apretar "Buscar" en el teclado, busca al toque
              guardarBusqueda(texto);
            }}
          />
          {texto ? (
            <Pressable
              onPress={() => buscarYa('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('catalogo.borrarTexto')}
              style={({ pressed }) => pressed && presionado}
            >
              <Icono nombre="close-circle" tamano={20} color={colores.gris} />
            </Pressable>
          ) : null}
        </View>
        <BotonFiltros cantidad={filtrosActivos} alTocar={() => setVerFiltros(true)} />
      </View>

      <MensajeError mensaje={error} alReintentar={cargar} />

      {explorando ? (
        <>
          {recientes.length ? (
            <View>
              <TituloSeccion
                texto={t('catalogo.recientes')}
                accion={t('catalogo.borrar')}
                alTocarAccion={borrarBusquedas}
              />
              <View style={estilos.pastillas}>
                {recientes.map((r) => (
                  <Chip key={r} texto={r} icono="time-outline" onPress={() => buscarYa(r)} />
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <TituloSeccion texto={t('catalogo.ideas')} />
            <Ideas alElegir={buscarYa} />
          </View>

          <View>
            <TituloSeccion texto={t('catalogo.categorias')} />
            <GrillaCategorias categorias={CATEGORIAS} alElegir={setCategoria} />
          </View>

          {productos.length ? <TituloSeccion texto={t('catalogo.ofertasRecientes')} /> : null}
        </>
      ) : (
        <>
          {/* Categorías: la elegida en verde oscuro */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.filaChips}
            style={estilos.scrollChips}
          >
            {[['', 'catalogo.todas'], ...CATEGORIAS].map(([clave, nombre]) => (
              <Chip
                key={clave || 'todas'}
                texto={t(nombre)}
                categoria={clave || undefined}
                icono={clave ? undefined : 'apps-outline'}
                tono={clave ? tonoCategoria(clave) : null}
                activo={categoria === clave}
                onPress={() => setCategoria(clave)}
              />
            ))}
          </ScrollView>

          {comercio ? (
            <Pressable
              onPress={() => setComercio(null)}
              accessibilityRole="button"
              accessibilityLabel={t('catalogo.quitarFiltro', { nombre: comercio.nombre })}
              style={({ pressed }) => [estilos.pastillaComercio, { backgroundColor: colores.menta }, pressed && presionado]}
            >
              <Icono nombre="storefront" tamano={15} color={colores.verdeHover} />
              <Text style={[estilos.textoComercio, { color: colores.titulo }]} numberOfLines={1}>
                {comercio.nombre}
              </Text>
              <Icono nombre="close-circle" tamano={18} color={colores.verdeHover} />
            </Pressable>
          ) : null}

          {!error && productos.length ? (
            <Text style={[estilos.resultados, { color: colores.gris }]}>
              {busqueda
                ? t('catalogo.resultadosPara', { n: productos.length, q: busqueda })
                : t('catalogo.resultados', { n: productos.length })}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <FlatList
        style={{ backgroundColor: colores.fondo }}
        contentContainerStyle={estilos.contenido}
        data={productos}
        keyExtractor={(p) => String(p.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
          !error ? <SinResultados busqueda={busqueda} explorando={explorando} alElegirIdea={buscarYa} /> : null
        }
        renderItem={({ item }) => (
          <FilaProducto
            variante="tarjeta"
            producto={item}
            mostrarComercio
            conBarraCarrito
            calificacion={calificaciones[item.comercio_id]}
            onPress={() => navigation?.navigate?.('DetalleProducto', { id: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
      />
      <BarraCarrito navigation={navigation} />

      {verFiltros ? (
        <HojaFiltros
          orden={orden}
          soloDonacion={soloDonacion}
          conUbicacion={Boolean(coords)}
          alCerrar={() => setVerFiltros(false)}
          alAplicar={(nuevoOrden, donables) => {
            setOrden(nuevoOrden);
            setSoloDonacion(donables);
            setVerFiltros(false);
          }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(10), // lugar para la barra "Ver carrito"
    flexGrow: 1,
  },
  cabecera: {
    gap: espacio(1.5),
    marginBottom: espacio(2),
  },
  // ---- Buscador ----
  filaBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  buscador: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    paddingHorizontal: espacio(1.75),
    borderRadius: 16,
  },
  inputBuscador: {
    flex: 1,
    height: '100%',
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    paddingVertical: 0,
  },
  botonFiltros: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntito: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPuntito: {
    fontFamily: fuentes.negrita,
    fontSize: 10,
  },
  // ---- Antes de buscar ----
  pastillas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio(1),
  },
  // ---- Buscando ----
  scrollChips: {
    marginHorizontal: -espacio(2), // las pastillas llegan hasta el borde de la pantalla
  },
  filaChips: {
    gap: espacio(1),
    paddingHorizontal: espacio(2),
  },
  pastillaComercio: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 6,
    paddingLeft: espacio(1.5),
    paddingRight: espacio(1),
    paddingVertical: 6,
    borderRadius: 999,
  },
  textoComercio: {
    flexShrink: 1,
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  resultados: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  // ---- Filtros ----
  tituloOrden: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  opcionOrden: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    minHeight: 48,
    paddingHorizontal: espacio(0.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  textoOrden: {
    flex: 1,
    fontSize: tamanos.normal,
  },
  filaDonables: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  ayuda: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    lineHeight: 16,
  },
  // ---- Sin resultados ----
  vacio: {
    flex: 1,
    alignItems: 'center',
    gap: espacio(1),
    paddingTop: espacio(3),
    paddingHorizontal: espacio(1),
  },
  circuloVacio: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio(1),
  },
  tituloVacio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    textAlign: 'center',
  },
  textoVacio: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textAlign: 'center',
    marginBottom: espacio(1),
  },
});
