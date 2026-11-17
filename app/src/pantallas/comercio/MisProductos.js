// PASO 45 · Comercio: pantalla principal (basada en la página 11 del mockup, con el estilo de Inicio).
// Arriba la misma barra que Inicio: el menú ☰ (MenuLateral del comercio) y el botón verde "Ayuda" (chat con Lü).
// Después el círculo con la inicial y el nombre del comercio, con un resumen abajo ("3 disponibles · 12 vendidos").
// "Productos disponibles +" y cada producto en una tarjeta:
//   arriba: foto o ícono de la categoría, nombre, precio, cantidad, "hasta el dd/mm" y el estado como etiqueta de color
//           (Disponible verde, Vendido/Donado naranja, Vencido/No disponible gris)
//   "Descuento" y "Donaciones" son datos (etiquetas suaves), no botones
//   abajo, una fila de acciones del mismo alto: "Editar" (si está disponible) o "Publicar de nuevo" (copia con
//   la fecha de hoy) y botones redondos: Duplicar (solo junto a "Editar": "Publicar de nuevo" ya copia),
//   Marcar como vendido, No disponible, Volver a publicar y Eliminar. Si no entran en el ancho, bajan a otra línea.
// Un solo acceso por acción: publicar uno nuevo es el "+"; copiar uno viejo, el botón de su tarjeta.
// Usa GET /api/mis-productos/, POST /api/mis-productos/<id>/estado/ y DELETE /api/mis-productos/<id>/ (paso 30).
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../../api/cliente';
import BarraSuperior from '../../componentes/BarraSuperior';
import Boton from '../../componentes/Boton';
import CabeceraCuenta from '../../componentes/CabeceraCuenta';
import Esqueleto from '../../componentes/Esqueleto';
import { EtiquetaEstado, EtiquetaInfo } from '../../componentes/EtiquetaEstado';
import Icono from '../../componentes/Icono';
import IconoCategoria from '../../componentes/IconoCategoria';
import MensajeError from '../../componentes/MensajeError';
import Vacio from '../../componentes/Vacio';
import { useSesion } from '../../contexto/Sesion';
import { textoDeOpcion, useIdioma } from '../../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../../tema';
import { formatoDiaMes, formatoPrecio, textoError } from '../../utilidades';

// Los estados (products/models.py) se muestran con t('estadosProducto.X'): ver idiomas/es.js

const TAMANO_ACCION = 36; // alto de todos los botones de la fila de acciones

function hoyIso() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

// Color de la etiqueta de estado
function tonoEstado(estado, vencido) {
  if (estado === 'DISPONIBLE') return vencido ? 'gris' : 'verde';
  if (estado === 'AGOTADO' || estado === 'DONADO') return 'naranja';
  return 'gris'; // PAUSADO (no disponible)
}

// Botón redondo de la fila de acciones (solo ícono, con su texto para lectores de pantalla)
function BotonRedondo({ icono, color, etiqueta, onPress, deshabilitado }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !!deshabilitado }}
      style={({ pressed }) => [
        estilos.redondo,
        { backgroundColor: colores.fondo, borderColor: colores.borde },
        (pressed || deshabilitado) && { opacity: 0.5 },
      ]}
    >
      <Icono nombre={icono} tamano={18} color={color || colores.texto} />
    </Pressable>
  );
}

function FilaMiProducto({ producto, ocupado, alCambiarEstado, alEditar, alEliminar, alCopiar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const vencido = producto.fecha_vencimiento < hoyIso();
  const disponible = producto.estado === 'DISPONIBLE';
  const textoEstado = disponible && vencido ? t('estadosProducto.vencido') : textoDeOpcion(t, 'estadosProducto', producto.estado, producto.estado);
  const conDescuento = producto.porcentaje_descuento > 0;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.panel }, sombra(colores)]}>
      {/* Arriba: foto, nombre, precio, cantidad, fecha y estado */}
      <View style={estilos.arriba}>
        <View style={[estilos.foto, { backgroundColor: colores.superficie }]}>
          {producto.imagen ? (
            <Image source={{ uri: urlCompleta(producto.imagen) }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          ) : (
            <IconoCategoria categoria={producto.categoria} llenar tamano={28} />
          )}
        </View>

        <View style={estilos.datos}>
          <Text style={[estilos.titulo, { color: colores.texto }]} numberOfLines={3}>
            {producto.titulo}
          </Text>
          <Text style={[estilos.detalle, { color: colores.gris }]}>
            <Text style={[estilos.precio, { color: colores.texto }]}>{formatoPrecio(producto.precio_descuento)}</Text>
            {'  ·  '}
            {t('misProductos.cantidad', { n: producto.stock })}
            {'  ·  '}
            {t('misProductos.hasta', { fecha: formatoDiaMes(producto.fecha_vencimiento) })}
          </Text>
          {/* El estado (etiqueta de color) y los datos "Descuento" / "Donaciones" (etiquetas suaves, no botones) */}
          <View style={estilos.infos}>
            <EtiquetaEstado texto={textoEstado} tono={tonoEstado(producto.estado, vencido)} />
            {conDescuento ? (
              <EtiquetaInfo icono="pricetag-outline" texto={`${t('misProductos.descuento')} ${producto.porcentaje_descuento}%`} />
            ) : null}
            {producto.es_donacion ? <EtiquetaInfo icono="heart-outline" texto={t('misProductos.donaciones')} /> : null}
          </View>
        </View>
      </View>

      {/* Abajo: las acciones, todas del mismo alto. Si no entran, bajan a otra línea. */}
      <View style={[estilos.acciones, { borderTopColor: colores.borde }]}>
        {disponible && !vencido ? (
          <Boton
            texto={t('misProductos.editar')}
            etiqueta={t('misProductos.editarProducto')}
            icono="create-outline"
            chico
            onPress={alEditar}
            deshabilitado={ocupado}
            estilo={estilos.principal}
          />
        ) : (
          // Vendido, donado, vencido o pausado: el botón principal es volver a publicarlo (copia con la fecha de hoy)
          <Boton
            texto={t('misProductos.publicarDeNuevo')}
            icono="refresh"
            chico
            onPress={alCopiar}
            deshabilitado={ocupado}
            estilo={estilos.principal}
          />
        )}
        {/* Duplicar: copia el producto (foto, precios, descripción) con la fecha de hoy. Si el botón principal ya es
            "Publicar de nuevo" (que hace lo mismo), no se repite */}
        {disponible && !vencido ? (
          <BotonRedondo icono="copy-outline" etiqueta={t('misProductos.duplicar')} onPress={alCopiar} deshabilitado={ocupado} />
        ) : null}
        {disponible ? (
          <>
            <BotonRedondo
              icono="checkmark-done"
              color={colores.verdeHover}
              etiqueta={t('misProductos.marcarVendido')}
              onPress={() => alCambiarEstado('AGOTADO')}
              deshabilitado={ocupado}
            />
            <BotonRedondo
              icono="ban-outline"
              color={colores.gris}
              etiqueta={t('misProductos.marcarNoDisponible')}
              onPress={() => alCambiarEstado('PAUSADO')}
              deshabilitado={ocupado}
            />
          </>
        ) : producto.estado === 'PAUSADO' && producto.stock > 0 ? (
          <BotonRedondo
            icono="play"
            color={colores.verdeHover}
            etiqueta={t('misProductos.volverAPublicar')}
            onPress={() => alCambiarEstado('DISPONIBLE')}
            deshabilitado={ocupado}
          />
        ) : null}
        <BotonRedondo
          icono="trash-outline"
          color={colores.error}
          etiqueta={t('misProductos.eliminar')}
          onPress={alEliminar}
          deshabilitado={ocupado}
        />
      </View>
    </View>
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

  if (cargando) return <Esqueleto tipo="filas" />;

  const nombre = usuario?.comercio?.nombre || usuario?.nombre || t('misProductos.miComercio');
  // Resumen de la cabecera: lo que está a la venta ahora y las unidades vendidas en total
  const hoy = hoyIso();
  const enVenta = productos.filter((p) => p.estado === 'DISPONIBLE' && p.fecha_vencimiento >= hoy).length;
  const vendidos = productos.reduce((suma, p) => suma + (Number(p.vendidos) || 0), 0);
  const resumen = `${t('misProductos.resumenDisponibles', { n: enVenta })} · ${t('misProductos.resumenVendidos', { n: vendidos })}`;

  return (
    <FlatList
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      data={productos}
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

          <CabeceraCuenta nombre={nombre} resumen={resumen} alTocar={() => navigation.navigate('Perfil')} />

          {/* "Productos disponibles +" (mismo estilo que los títulos de Inicio) */}
          <View style={estilos.filaNuevo}>
            <Text style={[estilos.tituloSeccion, { color: colores.titulo }]} accessibilityRole="header">
              {t('misProductos.disponibles')}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('FormProducto')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('misProductos.nuevoProducto')}
              style={({ pressed }) => [estilos.botonNuevo, { backgroundColor: colores.verdeProfundo }, pressed && { opacity: 0.8 }]}
            >
              <Icono nombre="add" tamano={22} color={colores.sobreVerdeProfundo} />
            </Pressable>
          </View>

          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          // Sin botón: para publicar ya está el "+" de arriba
          <Vacio icono="cube-outline" texto={t('misProductos.vacio')} />
        ) : null
      }
      renderItem={({ item }) => (
        <FilaMiProducto
          producto={item}
          ocupado={ocupado === item.id}
          alCambiarEstado={(estado) => cambiarEstado(item, estado)}
          alEditar={() => navigation.navigate('FormProducto', { id: item.id })}
          alEliminar={() => eliminar(item)}
          alCopiar={() => navigation.navigate('FormProducto', { copiarDe: item.id })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(4),
  },
  cabecera: {
    gap: espacio(2),
    marginBottom: espacio(1.5),
  },
  barra: {
    paddingHorizontal: 0, // la lista ya tiene el margen a los costados
    marginBottom: -espacio(1),
  },
  filaNuevo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio(1.5),
    marginTop: espacio(0.5),
  },
  // Igual que estilos.titulo de Inicio.js
  tituloSeccion: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: 18,
  },
  botonNuevo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjeta: {
    borderRadius: radio,
    padding: espacio(1.5),
    gap: espacio(1.5),
  },
  arriba: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio(1.5),
  },
  foto: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: {
    flex: 1,
    minWidth: 0,
    gap: espacio(0.5),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.normal,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  precio: {
    fontFamily: fuentes.negrita,
  },
  infos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: espacio(1.5),
    rowGap: 4,
    marginTop: 2,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espacio(1),
    paddingTop: espacio(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  principal: {
    minHeight: TAMANO_ACCION,
    height: TAMANO_ACCION,
    maxWidth: '100%',
  },
  redondo: {
    width: TAMANO_ACCION,
    height: TAMANO_ACCION,
    borderRadius: TAMANO_ACCION / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
