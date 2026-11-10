// PASO 45 · Comercio: "Mi Perfil" IGUAL AL MOCKUP (página 11 del PDF):
// arriba el círculo del comercio y "Mi Perfil", el ícono de soporte con su cartelito,
// "Productos disponibles +" y cada producto con la foto a la izquierda y una tarjeta gris con:
//   arriba a la derecha: 🚫 "Marcar como producto no disponible" y ✔ "Marcar como vendido/reservado"
//   (agregado) 📄 "Duplicar" en todos y, en lo vendido, donado o vencido, el botón verde "Publicar de nuevo":
//              copian el producto (foto, precios y descripción) con la fecha de hoy
//   abajo: las etiquetas "Descuento" y "Donaciones" (verdes si aplican), "Editar producto" y "Eliminar"
// (agregado) Arriba de la lista, "Publicar de nuevo": atajos a lo último publicado y a lo más vendido.
// Usa GET /api/mis-productos/, POST /api/mis-productos/<id>/estado/ y DELETE /api/mis-productos/<id>/ (paso 30).
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../../api/cliente';
import Esqueleto from '../../componentes/Esqueleto';
import Icono from '../../componentes/Icono';
import MensajeError from '../../componentes/MensajeError';
import PublicarDeNuevo from '../../componentes/PublicarDeNuevo';
import Vacio from '../../componentes/Vacio';
import { useSesion } from '../../contexto/Sesion';
import { espacio, fuentes, sombra, useTema } from '../../tema';
import { emojiCategoria, formatoPrecio, textoError } from '../../utilidades';

const WHATSAPP_SOPORTE = 'https://wa.me/5493547620629';

// Mismos estados que products/models.py
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

// Etiqueta "Descuento" / "Donaciones": verde oscuro si aplica, solo texto si no (como el mockup)
function Etiqueta({ texto, activa }) {
  const { colores } = useTema();
  return (
    <Text
      style={[
        estilos.etiqueta,
        activa ? { backgroundColor: colores.verdeProfundo, color: colores.sobreVerdeProfundo } : { color: colores.gris },
      ]}
    >
      {texto}
    </Text>
  );
}

// Botón redondo chiquito de arriba a la derecha de la tarjeta
function BotonRedondo({ icono, color, fondo, etiqueta, onPress, deshabilitado }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [estilos.redondo, { backgroundColor: fondo }, (pressed || deshabilitado) && { opacity: 0.5 }]}
    >
      <Icono nombre={icono} tamano={fondo === 'transparent' ? 24 : 15} color={color} />
    </Pressable>
  );
}

// Botón chiquito tipo píldora ("Editar producto", "Eliminar")
function Pildora({ texto, fondo, onPress, deshabilitado }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.pildora, { backgroundColor: fondo }, (pressed || deshabilitado) && { opacity: 0.6 }]}
    >
      <Text style={estilos.textoPildora}>{texto}</Text>
    </Pressable>
  );
}

function FilaMiProducto({ producto, ocupado, alCambiarEstado, alEditar, alEliminar, alCopiar }) {
  const { colores } = useTema();
  const vencido = producto.fecha_vencimiento < hoyIso();
  const disponible = producto.estado === 'DISPONIBLE';
  const textoEstado = disponible && vencido ? 'Vencido' : ESTADOS[producto.estado] || producto.estado;
  const [, mes, dia] = producto.fecha_vencimiento.split('-');

  return (
    <View style={estilos.fila}>
      <View style={[estilos.foto, { backgroundColor: colores.panel }]}>
        {producto.imagen ? (
          <Image source={{ uri: urlCompleta(producto.imagen) }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={estilos.emoji}>{emojiCategoria(producto.categoria)}</Text>
        )}
      </View>

      <View style={[estilos.tarjeta, { backgroundColor: colores.panel }, sombra(colores)]}>
        <View style={estilos.arriba}>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[estilos.titulo, { color: colores.texto }]} numberOfLines={1}>
              {producto.titulo}
            </Text>
            <Text style={[estilos.chico, { color: colores.gris }]} numberOfLines={1}>
              {formatoPrecio(producto.precio_descuento)} · {producto.stock} u. · hasta el {dia}/{mes}
            </Text>
            {!disponible || vencido ? (
              <Text style={[estilos.chico, { color: colores.ambar, fontFamily: fuentes.negrita }]}>{textoEstado}</Text>
            ) : null}
          </View>
          {disponible ? (
            <>
              <BotonRedondo
                icono="ban-outline"
                color={colores.error}
                fondo="transparent"
                etiqueta="Marcar como producto no disponible"
                onPress={() => alCambiarEstado('PAUSADO')}
                deshabilitado={ocupado}
              />
              <BotonRedondo
                icono="checkmark"
                color={colores.sobreVerdeProfundo}
                fondo={colores.verdeProfundo}
                etiqueta="Marcar como vendido/reservado"
                onPress={() => alCambiarEstado('AGOTADO')}
                deshabilitado={ocupado}
              />
            </>
          ) : producto.estado === 'PAUSADO' && producto.stock > 0 ? (
            <BotonRedondo
              icono="play"
              color={colores.sobreVerdeProfundo}
              fondo={colores.verdeProfundo}
              etiqueta="Volver a publicar"
              onPress={() => alCambiarEstado('DISPONIBLE')}
              deshabilitado={ocupado}
            />
          ) : null}
          {/* Duplicar: copia el producto (foto, precios, descripción) con la fecha de hoy */}
          <BotonRedondo
            icono="copy-outline"
            color={colores.texto}
            fondo="transparent"
            etiqueta="Duplicar producto"
            onPress={alCopiar}
            deshabilitado={ocupado}
          />
        </View>

        <View style={estilos.abajo}>
          <View style={estilos.etiquetas}>
            <Etiqueta texto="Descuento" activa={producto.porcentaje_descuento > 0} />
            <Etiqueta texto="Donaciones" activa={producto.es_donacion} />
          </View>
          <View style={estilos.etiquetas}>
            {!disponible || vencido ? (
              // Vendido, donado o vencido: el botón principal es volver a publicarlo (copia con la fecha de hoy)
              <Pildora texto="Publicar de nuevo" fondo="#4E8A2E" onPress={alCopiar} deshabilitado={ocupado} />
            ) : (
              <Pildora texto="Editar producto" fondo="#073425" onPress={alEditar} deshabilitado={ocupado} />
            )}
            <Pildora texto="Eliminar" fondo="#E02424" onPress={alEliminar} deshabilitado={ocupado} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MisProductos({ navigation }) {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(null); // id del producto que se está cambiando
  const [verSoporte, setVerSoporte] = useState(false);

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

  if (cargando) return <Esqueleto tipo="filas" />;

  const nombre = usuario?.nombre || 'Mi comercio';

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
        <View style={{ gap: espacio(2), marginBottom: espacio(2) }}>
          {/* Soporte arriba a la derecha, con su cartelito */}
          <View style={estilos.barra}>
            <Pressable
              onPress={() => setVerSoporte((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Soporte al Comercio"
              style={[estilos.botonBarra, { backgroundColor: colores.panel }]}
            >
              <Icono nombre="headset-outline" tamano={20} color={colores.texto} />
            </Pressable>
          </View>
          {verSoporte ? (
            <Pressable
              onPress={() => Linking.openURL(WHATSAPP_SOPORTE).catch(() => {})}
              style={[estilos.soporte, { backgroundColor: colores.panel }]}
            >
              <Text style={[estilos.tituloSoporte, { color: colores.titulo }]}>Soporte al Comercio</Text>
              <Text style={[estilos.chico, { color: colores.titulo }]}>
                Por cualquier duda, consulta o inquietud, comuníquese al{' '}
                <Text style={{ textDecorationLine: 'underline' }}>+54 9 3547620629</Text>
              </Text>
            </Pressable>
          ) : null}

          {/* Círculo del comercio y "Mi Perfil" */}
          <Pressable onPress={() => navigation.navigate('Perfil')} accessibilityRole="link" style={estilos.perfil}>
            <View style={[estilos.circulo, { backgroundColor: colores.verdeProfundo }]}>
              <Text style={[estilos.inicial, { color: colores.sobreVerdeProfundo }]}>{nombre.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[estilos.miPerfil, { color: colores.titulo }]}>Mi Perfil</Text>
          </Pressable>

          {/* Atajos: volver a cargar lo último o lo más vendido */}
          <PublicarDeNuevo
            productos={productos}
            alElegir={(p) => navigation.navigate('FormProducto', { copiarDe: p.id })}
          />

          {/* "Productos disponibles +" */}
          <Pressable
            onPress={() => navigation.navigate('FormProducto')}
            accessibilityRole="button"
            accessibilityLabel="Nuevo producto"
            style={estilos.filaNuevo}
          >
            <Text style={[estilos.productos, { color: colores.titulo }]}>Productos disponibles</Text>
            <Icono nombre="add" tamano={24} color={colores.titulo} />
          </Pressable>

          <MensajeError mensaje={error} alReintentar={cargar} />
        </View>
      }
      ListEmptyComponent={
        !error ? (
          <Vacio
            icono="cube-outline"
            texto="Todavía no publicaste nada"
            boton="Publicar el primero"
            alTocar={() => navigation.navigate('FormProducto')}
          />
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
      ItemSeparatorComponent={() => <View style={{ height: espacio(2) }} />}
    />
  );
}

const estilos = StyleSheet.create({
  contenido: {
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(4),
  },
  barra: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: espacio(1),
  },
  botonBarra: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soporte: {
    alignSelf: 'flex-end',
    maxWidth: 240,
    borderRadius: 10,
    padding: espacio(1.25),
    gap: 2,
    marginTop: -espacio(1),
  },
  tituloSoporte: {
    fontFamily: fuentes.normal,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  circulo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: {
    fontFamily: fuentes.marca,
    fontSize: 26,
  },
  miPerfil: {
    fontFamily: fuentes.normal,
    fontSize: 26,
    textDecorationLine: 'underline',
  },
  filaNuevo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productos: {
    fontFamily: fuentes.normal,
    fontSize: 16,
  },
  fila: {
    flexDirection: 'row',
    gap: espacio(1.5),
  },
  foto: {
    width: 92,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  tarjeta: {
    flex: 1,
    borderRadius: 12,
    padding: espacio(1),
    paddingLeft: espacio(1.25),
    justifyContent: 'space-between',
    gap: espacio(1),
  },
  arriba: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: 13,
  },
  chico: {
    fontFamily: fuentes.normal,
    fontSize: 11,
  },
  redondo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abajo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  etiquetas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etiqueta: {
    fontFamily: fuentes.normal,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  pildora: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textoPildora: {
    color: '#FFFFFF',
    fontFamily: fuentes.botonMedio,
    fontSize: 9.5,
  },
});
