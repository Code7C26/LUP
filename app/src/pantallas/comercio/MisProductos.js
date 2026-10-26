// PASO 45 · Comercio: mis productos, como "Mi Perfil" del comercio en el mockup.
// Cada producto con "Marcar como vendido", "No disponible", "Editar producto" y "Eliminar",
// y arriba "Nuevo producto".
// Usa GET /api/mis-productos/, POST /api/mis-productos/<id>/estado/ y DELETE /api/mis-productos/<id>/ (paso 30).
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../../api/cliente';
import Boton from '../../componentes/Boton';
import Cargando from '../../componentes/Cargando';
import MensajeError from '../../componentes/MensajeError';
import { espacio, fuentes, radio, tamanos, useTema } from '../../tema';
import { emojiCategoria, formatoPrecio, textoError } from '../../utilidades';

// Mismos estados que products/models.py. PAUSADO ("No disponible") es del paso 19.
const ESTADOS = {
  DISPONIBLE: 'Disponible',
  AGOTADO: 'Vendido',
  PAUSADO: 'No disponible',
  DONADO: 'Donado',
};

function hoyIso() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function TarjetaMiProducto({ producto, ocupado, alCambiarEstado, alEditar, alEliminar }) {
  const { colores } = useTema();
  const vencido = producto.fecha_vencimiento < hoyIso();
  const disponible = producto.estado === 'DISPONIBLE';
  const textoEstado = disponible && vencido ? 'Vencido' : ESTADOS[producto.estado] || producto.estado;
  const [anio, mes, dia] = producto.fecha_vencimiento.split('-');

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <View style={estilos.fila}>
        {producto.imagen ? (
          <Image source={{ uri: urlCompleta(producto.imagen) }} style={estilos.foto} />
        ) : (
          <View style={[estilos.foto, estilos.sinFoto, { backgroundColor: colores.menta }]}>
            <Text style={estilos.emoji}>{emojiCategoria(producto.categoria)}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.titulo, { color: colores.titulo }]} numberOfLines={2}>
            {producto.titulo}
          </Text>
          <Text style={[estilos.detalle, { color: colores.gris }]}>
            {formatoPrecio(producto.precio_descuento)} · antes {formatoPrecio(producto.precio_original)}
          </Text>
          <Text style={[estilos.detalle, { color: colores.gris }]}>
            Stock: {producto.stock} · Retiro hasta el {dia}/{mes}/{anio}
          </Text>
          <Text
            style={[
              estilos.estado,
              disponible && !vencido
                ? { backgroundColor: colores.menta, color: colores.verdeHover }
                : { backgroundColor: colores.ambarClaro, color: colores.texto },
            ]}
          >
            {textoEstado}
          </Text>
        </View>
      </View>

      {disponible ? (
        <View style={estilos.botones}>
          <Boton
            texto="Marcar como vendido"
            onPress={() => alCambiarEstado('AGOTADO')}
            deshabilitado={ocupado}
            estilo={estilos.boton}
          />
          <Boton
            texto="No disponible"
            variante="secundario"
            onPress={() => alCambiarEstado('PAUSADO')}
            deshabilitado={ocupado}
            estilo={estilos.boton}
          />
        </View>
      ) : producto.estado !== 'DONADO' && producto.stock > 0 ? (
        <Boton texto="Volver a publicar" onPress={() => alCambiarEstado('DISPONIBLE')} deshabilitado={ocupado} />
      ) : null}

      <View style={estilos.botones}>
        {producto.estado !== 'DONADO' ? (
          <Boton
            texto="Editar producto"
            variante="secundario"
            onPress={alEditar}
            deshabilitado={ocupado}
            estilo={estilos.boton}
          />
        ) : null}
        <Boton
          texto="Eliminar"
          variante="secundario"
          onPress={alEliminar}
          deshabilitado={ocupado}
          estilo={estilos.boton}
        />
      </View>
    </View>
  );
}

export default function MisProductos({ navigation }) {
  const { colores } = useTema();
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
      Alert.alert('No se pudo cambiar el estado', textoError(e) || 'Probá de nuevo.');
    } finally {
      setOcupado(null);
    }
  }

  function eliminar(producto) {
    Alert.alert(
      '¿Eliminar la publicación?',
      `"${producto.titulo}" se borra del catálogo junto con sus reservas. Esto no se puede deshacer.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            setOcupado(producto.id);
            try {
              await api(`/mis-productos/${producto.id}/`, { metodo: 'DELETE' });
              setProductos((lista) => lista.filter((p) => p.id !== producto.id));
            } catch (e) {
              Alert.alert('No se pudo eliminar', textoError(e) || 'Probá de nuevo.');
            } finally {
              setOcupado(null);
            }
          },
        },
      ]
    );
  }

  if (cargando) return <Cargando texto="Cargando tus productos…" />;

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
        <View style={{ gap: espacio(1.5), marginBottom: espacio(1.5) }}>
          <Text style={[estilos.encabezado, { color: colores.titulo }]}>Mis productos</Text>
          <Boton texto="+ Nuevo producto" onPress={() => navigation.navigate('FormProducto')} />
          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <View style={estilos.vacio}>
            <Text style={estilos.emojiVacio}>📦</Text>
            <Text style={[estilos.textoVacio, { color: colores.gris }]}>
              Todavía no publicaste productos. Subí tu primer excedente del día.
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TarjetaMiProducto
          producto={item}
          ocupado={ocupado === item.id}
          alCambiarEstado={(estado) => cambiarEstado(item, estado)}
          alEditar={() => navigation.navigate('FormProducto', { id: item.id })}
          alEliminar={() => eliminar(item)}
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
  encabezado: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(1.5),
    gap: espacio(1),
  },
  fila: {
    flexDirection: 'row',
    gap: espacio(1.5),
  },
  foto: {
    width: 88,
    height: 88,
    borderRadius: 14,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  titulo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  estado: {
    alignSelf: 'flex-start',
    fontFamily: fuentes.media,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 2,
  },
  botones: {
    flexDirection: 'row',
    gap: espacio(1),
  },
  boton: {
    flex: 1,
    paddingHorizontal: espacio(1),
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
