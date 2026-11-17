// PASO 48 · Organización: donaciones disponibles (pantalla principal, con el estilo de Inicio y del comercio).
// Arriba la misma barra que Inicio: el menú ☰ (MenuLateral de la organización) y el botón verde "Ayuda" (chat con Lü).
// Después el círculo con la inicial y el nombre de la organización, con un resumen abajo ("4 donaciones disponibles").
// Lista los productos que los comercios marcaron como aptos para donar (GET /api/donaciones/), cada uno en una
// tarjeta: foto o ícono de la categoría, nombre, comercio y distancia, cantidad, "hasta el dd/mm" y el estado como etiqueta de color
// (Disponible verde, Ya lo pediste naranja). Abajo, "Pedir" abre el cuadro para escribirle al comercio
// (POST /api/productos/<id>/solicitar-donacion/, paso 31). Tocar la tarjeta abre el detalle.
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../../api/cliente';
import BarraSuperior from '../../componentes/BarraSuperior';
import Boton from '../../componentes/Boton';
import CabeceraCuenta from '../../componentes/CabeceraCuenta';
import Cargando from '../../componentes/Cargando';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import IconoCategoria from '../../componentes/IconoCategoria';
import MensajeError from '../../componentes/MensajeError';
import ModalSolicitudDonacion from '../../componentes/ModalSolicitudDonacion';
import Vacio from '../../componentes/Vacio';
import { useSesion } from '../../contexto/Sesion';
import { useIdioma } from '../../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../../tema';
import { formatoDiaMes, textoKm } from '../../utilidades';

function TarjetaDonacion({ producto, alVer, alPedir }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const distancia = textoKm(producto.distancia_km);
  const pedido = !!producto.ya_solicitado;

  return (
    <Pressable
      onPress={alVer}
      accessibilityRole="button"
      accessibilityHint={t('donaciones.verDetalle')}
      style={({ pressed }) => [estilos.tarjeta, { backgroundColor: colores.panel }, sombra(colores), pressed && { opacity: 0.85 }]}
    >
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
          <Text style={[estilos.detalle, { color: colores.gris }]} numberOfLines={2}>
            {[producto.comercio, distancia].filter(Boolean).join('  ·  ')}
          </Text>
          <Text style={[estilos.detalle, { color: colores.gris }]}>
            {t('misProductos.cantidad', { n: producto.stock })}
            {'  ·  '}
            {t('misProductos.hasta', { fecha: formatoDiaMes(producto.fecha_vencimiento) })}
          </Text>
          <View style={estilos.infos}>
            <EtiquetaEstado
              texto={pedido ? t('donaciones.yaLoPediste') : t('estadosProducto.DISPONIBLE')}
              tono={pedido ? 'naranja' : 'verde'}
            />
          </View>
        </View>
      </View>

      {!pedido ? (
        <View style={[estilos.acciones, { borderTopColor: colores.borde }]}>
          <Boton texto={t('donaciones.pedir')} icono="heart" chico onPress={alPedir} estilo={estilos.principal} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Donaciones({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario } = useSesion();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [pidiendo, setPidiendo] = useState(null); // el producto que se está por pedir

  const cargar = useCallback(async () => {
    setError('');
    try {
      setProductos(await api('/donaciones/'));
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

  useEffect(() => navigation?.addListener?.('focus', cargar), [navigation, cargar]);

  function alEnviar(solicitud) {
    setProductos((lista) => lista.map((p) => (p.id === solicitud.producto_id ? { ...p, ya_solicitado: true } : p)));
    setPidiendo(null);
    Alert.alert(
      t('donaciones.enviadaTitulo'),
      t('donaciones.enviadaTexto', { comercio: solicitud.comercio })
    );
  }

  if (cargando) return <Cargando texto={t('donaciones.buscando')} />;

  const nombre = usuario?.organizacion?.nombre || usuario?.nombre || t('donaciones.miOrganizacion');
  const sinPedir = productos.filter((p) => !p.ya_solicitado).length;
  const resumen = t('donaciones.resumen', { n: sinPedir });

  return (
    <>
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
            <BarraSuperior navigation={navigation} desde="Donaciones" estilo={estilos.barra} />
            <CabeceraCuenta nombre={nombre} resumen={resumen} alTocar={() => navigation.navigate('Perfil')} />
            <Text style={[estilos.tituloSeccion, { color: colores.titulo }]} accessibilityRole="header">
              {t('donaciones.subtitulo')}
            </Text>
            <MensajeError mensaje={error} alReintentar={cargar} />
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <Vacio icono="heart-outline" texto={t('donaciones.vacio')} />
          ) : null
        }
        renderItem={({ item }) => (
          <TarjetaDonacion
            producto={item}
            alVer={() => navigation.navigate('DetalleProducto', { id: item.id })}
            alPedir={() => setPidiendo(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacio(1.5) }} />}
      />

      <ModalSolicitudDonacion producto={pidiendo} alCerrar={() => setPidiendo(null)} alEnviar={alEnviar} />
    </>
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
  // Igual que estilos.titulo de Inicio.js
  tituloSeccion: {
    fontFamily: fuentes.normal,
    fontSize: 18,
    marginTop: espacio(0.5),
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
  infos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espacio(1),
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
    minHeight: 36,
    height: 36,
    maxWidth: '100%',
  },
});
