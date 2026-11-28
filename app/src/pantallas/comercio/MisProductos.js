// PASO 45 · Comercio: pantalla principal, con el estilo de Inicio.
// Arriba la misma barra que Inicio: el menú ☰ (MenuLateral del comercio) y el botón verde "Ayuda" (chat con Lü).
// Después la cabecera verde: "Hola," + el nombre del comercio, el resumen ("3 disponibles · 4 vendidos · 1 donado")
// y la pastilla "+ Publicar" (tocar la cabecera abre el Perfil).
// Dos pestañas: "Disponibles (N)" e "Historial" (vendidos, donados, vencidos y no disponibles).
// Cada producto: la foto (con el "-40%"), el nombre y una línea gris con un puntito del color del estado.
// Tocar el producto hace la acción principal: "Editar" si está a la venta; si no, "Publicar de nuevo" (copia con la
// fecha de hoy). "⋯" abre una hoja con todas las acciones: esa misma, Duplicar (solo junto a "Editar": "Publicar de
// nuevo" ya copia), Marcar como vendido, No disponible, Volver a publicar y Eliminar (con confirmación).
// Usa GET /api/mis-productos/, POST /api/mis-productos/<id>/estado/ y DELETE /api/mis-productos/<id>/ (paso 30).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api, urlCompleta } from '../../api/cliente';
import BarraSuperior from '../../componentes/BarraSuperior';
import Boton from '../../componentes/Boton';
import CabeceraUsuario from '../../componentes/CabeceraUsuario';
import Esqueleto from '../../componentes/Esqueleto';
import EstadoVacio from '../../componentes/EstadoVacio';
import HojaAbajo from '../../componentes/HojaAbajo';
import Icono from '../../componentes/Icono';
import IconoCategoria from '../../componentes/IconoCategoria';
import MensajeError from '../../componentes/MensajeError';
import PastillaDescuento from '../../componentes/PastillaDescuento';
import Pestanas from '../../componentes/Pestanas';
import TituloSeccion from '../../componentes/TituloSeccion';
import { useSesion } from '../../contexto/Sesion';
import { textoDeOpcion, useIdioma } from '../../contexto/Idioma';
import { espacio, fuentes, tamanos, useTema } from '../../tema';
import { formatoDiaMes, formatoPrecio, hoyLocal, textoError } from '../../utilidades';

// Los estados (products/models.py) se muestran con t('estadosProducto.X'): ver idiomas/es.js

const presionado = { transform: [{ scale: 0.97 }] };

// Color del puntito de estado: Disponible verde, Vendido/Donado ámbar, Vencido/No disponible gris
function colorEstado(colores, estado, vencido) {
  if (estado === 'DISPONIBLE') return vencido ? colores.gris : colores.verde;
  if (estado === 'AGOTADO' || estado === 'DONADO') return colores.ambar;
  return colores.gris; // PAUSADO (no disponible)
}

const estaVencido = (producto, hoy) => producto.fecha_vencimiento < hoy;
const aLaVenta = (producto, hoy) => producto.estado === 'DISPONIBLE' && !estaVencido(producto, hoy);

function TarjetaProducto({ producto, hoy, ocupado, alTocar, alMasAcciones }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const vencido = estaVencido(producto, hoy);
  const textoEstado =
    producto.estado === 'DISPONIBLE' && vencido
      ? t('estadosProducto.vencido')
      : textoDeOpcion(t, 'estadosProducto', producto.estado, producto.estado);
  const linea = [
    textoEstado,
    formatoPrecio(producto.precio_descuento),
    t('misProductos.cantidad', { n: producto.stock }),
    t('misProductos.hasta', { fecha: formatoDiaMes(producto.fecha_vencimiento) }),
  ].join(' · ');
  const principal = aLaVenta(producto, hoy) ? t('misProductos.editarProducto') : t('misProductos.publicarDeNuevo');

  return (
    <View style={estilos.fila}>
      <Pressable
        onPress={alTocar}
        disabled={ocupado}
        accessibilityRole="button"
        accessibilityLabel={`${producto.titulo}. ${linea}`}
        accessibilityHint={principal}
        style={({ pressed }) => [estilos.tocable, pressed && presionado]}
      >
        <View>
          <View style={[estilos.foto, { backgroundColor: colores.panel }]}>
            {producto.imagen ? (
              <Image source={{ uri: urlCompleta(producto.imagen) }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
            ) : (
              <IconoCategoria categoria={producto.categoria} llenar tamano={30} />
            )}
          </View>
          <PastillaDescuento porcentaje={producto.porcentaje_descuento > 0 ? producto.porcentaje_descuento : null} />
        </View>
        <View style={estilos.datos}>
          <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={2}>
            {producto.titulo}
          </Text>
          <View style={estilos.filaLinea}>
            <View style={[estilos.puntito, { backgroundColor: colorEstado(colores, producto.estado, vencido) }]} />
            <Text style={[estilos.linea, { color: colores.grisVerde }]} numberOfLines={2}>
              {linea}
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={alMasAcciones}
        disabled={ocupado}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('misProductos.masAcciones', { titulo: producto.titulo })}
        accessibilityState={{ disabled: ocupado, busy: ocupado }}
        style={({ pressed }) => [estilos.masAcciones, pressed && presionado]}
      >
        {ocupado ? (
          <ActivityIndicator size="small" color={colores.gris} />
        ) : (
          <Icono nombre="ellipsis-horizontal" tamano={20} color={colores.grisVerde} />
        )}
      </Pressable>
    </View>
  );
}

// Hoja con las acciones de un producto, como lista (Eliminar en rojo)
function HojaAcciones({ producto, acciones, alCerrar }) {
  const { colores } = useTema();
  return (
    <HojaAbajo visible alCerrar={alCerrar} titulo={producto.titulo}>
      <View>
        {acciones.map(({ clave, texto, peligro, alTocar }, i) => (
          <Pressable
            key={clave}
            onPress={() => {
              alCerrar();
              alTocar();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              estilos.opcion,
              i < acciones.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colores.borde },
              pressed && { backgroundColor: colores.campo },
            ]}
          >
            <Text style={[estilos.textoOpcion, { color: peligro ? colores.error : colores.texto }]}>{texto}</Text>
          </Pressable>
        ))}
      </View>
    </HojaAbajo>
  );
}

export default function MisProductos({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario } = useSesion();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(null); // id del producto que se está cambiando
  const [pestana, setPestana] = useState('disponibles');
  const [accionesDe, setAccionesDe] = useState(null); // el producto con la hoja de acciones abierta

  const cargar = useCallback(async () => {
    setError('');
    try {
      setProductos(await api('/mis-productos/'));
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

  // Al volver de "Nuevo producto" o "Editar", se actualiza la lista
  useEffect(() => navigation?.addListener?.('focus', cargar), [navigation, cargar]);

  async function cambiarEstado(producto, estado) {
    setOcupado(producto.id);
    try {
      const actualizado = await api(`/mis-productos/${producto.id}/estado/`, { metodo: 'POST', datos: { estado } });
      setProductos((lista) => lista.map((p) => (p.id === producto.id ? actualizado : p)));
    } catch (e) {
      Alert.alert(t('misProductos.noSeCambio'), textoError(e) || t('misProductos.probaDeNuevo'));
    } finally {
      setOcupado(null);
    }
  }

  function eliminar(producto) {
    Alert.alert(
      t('misProductos.eliminarPregunta'),
      t('misProductos.eliminarTexto', { titulo: producto.titulo }),
      [
        { text: t('misProductos.no'), style: 'cancel' },
        {
          text: t('misProductos.siEliminar'),
          style: 'destructive',
          onPress: async () => {
            setOcupado(producto.id);
            try {
              await api(`/mis-productos/${producto.id}/`, { metodo: 'DELETE' });
              setProductos((lista) => lista.filter((p) => p.id !== producto.id));
            } catch (e) {
              Alert.alert(t('misProductos.noSeElimino'), textoError(e) || t('misProductos.probaDeNuevo'));
            } finally {
              setOcupado(null);
            }
          },
        },
      ]
    );
  }

  const publicar = () => navigation.navigate('FormProducto');
  const editar = (producto) => navigation.navigate('FormProducto', { id: producto.id });
  const copiar = (producto) => navigation.navigate('FormProducto', { copiarDe: producto.id });
  // La acción principal: "Editar" si está a la venta; si no, "Publicar de nuevo" (copia con la fecha de hoy)
  const accionPrincipal = (producto) => (aLaVenta(producto, hoyLocal()) ? editar(producto) : copiar(producto));

  // Las acciones de la hoja "⋯", con las mismas condiciones de siempre
  function accionesPara(producto) {
    const enVenta = aLaVenta(producto, hoyLocal());
    const disponible = producto.estado === 'DISPONIBLE';
    return [
      enVenta
        ? { clave: 'editar', texto: t('misProductos.editarProducto'), alTocar: () => editar(producto) }
        : { clave: 'copiar', texto: t('misProductos.publicarDeNuevo'), alTocar: () => copiar(producto) },
      // Duplicar solo junto a "Editar": si la principal ya es "Publicar de nuevo" (que copia), no se repite
      enVenta && { clave: 'duplicar', texto: t('misProductos.duplicar'), alTocar: () => copiar(producto) },
      disponible && { clave: 'vendido', texto: t('misProductos.marcarVendido'), alTocar: () => cambiarEstado(producto, 'AGOTADO') },
      disponible && {
        clave: 'pausar',
        texto: t('misProductos.marcarNoDisponible'),
        alTocar: () => cambiarEstado(producto, 'PAUSADO'),
      },
      producto.estado === 'PAUSADO' &&
        producto.stock > 0 && {
          clave: 'publicar',
          texto: t('misProductos.volverAPublicar'),
          alTocar: () => cambiarEstado(producto, 'DISPONIBLE'),
        },
      { clave: 'eliminar', texto: t('misProductos.eliminar'), peligro: true, alTocar: () => eliminar(producto) },
    ].filter(Boolean);
  }

  if (cargando) return <Esqueleto tipo="comercio" />;

  const nombre = usuario?.comercio?.nombre || usuario?.nombre || t('misProductos.miComercio');
  const hoy = hoyLocal();
  const disponibles = productos.filter((p) => aLaVenta(p, hoy));
  const historial = productos.filter((p) => !aLaVenta(p, hoy));
  // Resumen en texto: lo que está a la venta ahora, las unidades vendidas en total y los productos donados
  const resumen = [
    t('misProductos.resumenDisponibles', { n: disponibles.length }),
    t('misProductos.resumenVendidos', { n: productos.reduce((suma, p) => suma + (Number(p.vendidos) || 0), 0) }),
    t('misProductos.resumenDonados', { n: productos.filter((p) => p.estado === 'DONADO').length }),
  ].join(' · ');
  const enDisponibles = pestana === 'disponibles';
  // "Tu impacto este mes": lo recuperado (precio Lüp × unidades vendidas) y las comidas salvadas (vendidas + donadas)
  const vendidas = productos.reduce((suma, p) => suma + (Number(p.vendidos) || 0), 0);
  const recuperado = productos.reduce((suma, p) => suma + (Number(p.precio_descuento) || 0) * (Number(p.vendidos) || 0), 0);
  const donadas = productos.filter((p) => p.estado === 'DONADO').reduce((suma, p) => suma + (Number(p.stock) || 0), 0);
  const comidas = vendidas + donadas;
  // Para republicar en un toque: lo que se vendió o venció, primero lo que más se vendió
  const paraRepublicar = productos
    .filter((p) => p.estado === 'AGOTADO' || estaVencido(p, hoy))
    .sort((a, b) => (Number(b.vendidos) || 0) - (Number(a.vendidos) || 0))
    .slice(0, 10);

  return (
    <>
      <FlatList
        key={pestana}
        style={{ backgroundColor: colores.fondo }}
        contentContainerStyle={estilos.contenido}
        data={enDisponibles ? disponibles : historial}
        keyExtractor={(p) => String(p.id)}
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
          <View style={estilos.cabecera}>
            {/* Igual que Inicio: ☰ y "Ayuda" */}
            <BarraSuperior navigation={navigation} desde="MisProductos" estilo={estilos.barra} />

            <CabeceraUsuario
              foto={urlCompleta(usuario?.foto)}
              nombre={nombre}
              arriba={t('misProductos.holaNombre', { nombre })}
              titulo={t('misProductos.queExcedentes')}
              resumen={resumen}
              accion={{ texto: t('misProductos.publicar'), etiqueta: t('misProductos.publicarAccesible'), alTocar: publicar }}
              alTocar={() => navigation.navigate('Perfil')}
              accessibilityLabel={`${nombre}. ${resumen}. ${t('menu.miPerfil')}`}
            />

            <View style={[estilos.impacto, { backgroundColor: colores.menta }]}>
              <Text style={[estilos.impactoTitulo, { color: colores.verdeProfundo }]}>{t('misProductos.impactoTitulo')}</Text>
              <View style={estilos.impactoFila}>
                <View style={estilos.impactoDato}>
                  <Text style={[estilos.impactoNumero, { color: colores.verdeProfundo }]}>{formatoPrecio(recuperado)}</Text>
                  <Text style={[estilos.impactoTexto, { color: colores.grisVerde }]}>{t('misProductos.recuperados')}</Text>
                </View>
                <View style={estilos.impactoDato}>
                  <Text style={[estilos.impactoNumero, { color: colores.verdeProfundo }]}>{comidas}</Text>
                  <Text style={[estilos.impactoTexto, { color: colores.grisVerde }]}>
                    {t('misProductos.comidasSalvadas', { n: comidas })}
                  </Text>
                </View>
              </View>
            </View>

            {paraRepublicar.length ? (
              <View style={estilos.republicarBloque}>
                <TituloSeccion texto={t('misProductos.recuperarTitulo')} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaRepublicar}>
                  {paraRepublicar.map((p) => (
                    <View key={p.id} style={[estilos.republicar, { backgroundColor: colores.panel }]}>
                      <View style={[estilos.fotoRepublicar, { backgroundColor: colores.superficie }]}>
                        {p.imagen ? (
                          <Image source={{ uri: urlCompleta(p.imagen) }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
                        ) : (
                          <IconoCategoria categoria={p.categoria} llenar tamano={24} />
                        )}
                      </View>
                      <Text style={[estilos.republicarNombre, { color: colores.texto }]} numberOfLines={2}>
                        {p.titulo}
                      </Text>
                      <Pressable
                        onPress={() => copiar(p)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('misProductos.publicarDeNuevo')}: ${p.titulo}`}
                        style={({ pressed }) => pressed && presionado}
                      >
                        <Text style={[estilos.republicarTexto, { color: colores.verdeTexto }]}>{t('misProductos.publicarDeNuevo')}</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <MensajeError mensaje={error} alReintentar={cargar} />

            <Pestanas
              opciones={[
                ['disponibles', t('misProductos.tabDisponibles', { n: disponibles.length })],
                ['historial', t('misProductos.historial')],
              ]}
              activa={pestana}
              alCambiar={setPestana}
            />
          </View>
        }
        ListEmptyComponent={
          error ? null : enDisponibles ? (
            <EstadoVacio texto={t('misProductos.vacioTitulo')}>
              <Text style={[estilos.tip, { color: colores.gris }]}>{t('misProductos.tipVacio')}</Text>
              <Boton texto={t('misProductos.publicarBoton')} onPress={publicar} estilo={estilos.botonVacio} />
            </EstadoVacio>
          ) : (
            <EstadoVacio texto={t('misProductos.vacioHistorialTitulo')} />
          )
        }
        renderItem={({ item }) => (
          <TarjetaProducto
            producto={item}
            hoy={hoy}
            ocupado={ocupado === item.id}
            alTocar={() => accionPrincipal(item)}
            alMasAcciones={() => setAccionesDe(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacio(2.5) }} />}
      />

      {accionesDe ? (
        <HojaAcciones producto={accionesDe} acciones={accionesPara(accionesDe)} alCerrar={() => setAccionesDe(null)} />
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(4),
    flexGrow: 1,
  },
  cabecera: {
    gap: espacio(2),
    marginBottom: espacio(2.5),
  },
  impacto: {
    padding: espacio(2.25),
    gap: espacio(1.25),
    borderRadius: 20,
  },
  impactoTitulo: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  impactoFila: {
    flexDirection: 'row',
    gap: espacio(2),
  },
  impactoDato: {
    flex: 1,
    gap: 2,
  },
  impactoNumero: {
    fontFamily: fuentes.marca,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  impactoTexto: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  republicarBloque: {
    gap: espacio(0.5),
  },
  filaRepublicar: {
    gap: espacio(1.5),
    paddingRight: espacio(2),
  },
  republicar: {
    width: 150,
    padding: 10,
    gap: 8,
    borderRadius: 16,
  },
  fotoRepublicar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  republicarNombre: {
    fontFamily: fuentes.semi,
    fontSize: 13,
  },
  republicarTexto: {
    fontFamily: fuentes.semi,
    fontSize: 12,
  },
  tip: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    textAlign: 'center',
  },
  botonVacio: {
    marginTop: espacio(1),
  },
  barra: {
    paddingHorizontal: 0, // la lista ya tiene el margen a los costados
    marginBottom: -espacio(1),
  },
  // ---- Producto (sin caja: la foto, el nombre y una línea gris) ----
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  tocable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  foto: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nombre: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  filaLinea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  puntito: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 5,
  },
  linea: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: 12,
    lineHeight: 17,
  },
  masAcciones: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- Hoja de acciones ----
  opcion: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: espacio(0.5),
    borderRadius: 8,
  },
  textoOpcion: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
});
