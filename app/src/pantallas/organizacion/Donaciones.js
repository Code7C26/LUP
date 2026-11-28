// PASO 48 · Organización: donaciones disponibles (pantalla principal, con el estilo de Inicio y del comercio).
// Arriba la misma barra que Inicio: el menú ☰ (MenuLateral de la organización) y el botón verde "Ayuda" (chat con Lü).
// Después la cabecera verde: "Hola," + el nombre de la organización, el resumen ("2 para pedir · 1 ya pedido")
// y la pastilla "Mis pedidos" (abre la pestaña de pedidos). Tocar la cabecera abre el Perfil.
// Lista los productos que los comercios marcaron como aptos para donar (GET /api/donaciones/): la foto, el nombre,
// "cantidad · comercio · km" y, a la derecha, "Pedir" (abre el cuadro para escribirle al comercio:
// POST /api/productos/<id>/solicitar-donacion/, paso 31) o "Ya lo pediste". Tocar el producto abre el detalle.
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api, urlCompleta } from '../../api/cliente';
import BarraSuperior from '../../componentes/BarraSuperior';
import CabeceraUsuario from '../../componentes/CabeceraUsuario';
import Cargando from '../../componentes/Cargando';
import EstadoVacio from '../../componentes/EstadoVacio';
import IconoCategoria from '../../componentes/IconoCategoria';
import MensajeError from '../../componentes/MensajeError';
import ModalSolicitudDonacion from '../../componentes/ModalSolicitudDonacion';
import TituloSeccion from '../../componentes/TituloSeccion';
import { useSesion } from '../../contexto/Sesion';
import { useIdioma } from '../../contexto/Idioma';
import { espacio, fuentes, useTema } from '../../tema';
import { textoKm } from '../../utilidades';

const presionado = { transform: [{ scale: 0.97 }] };

function TarjetaDonacion({ producto, alVer, alPedir }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const pedido = !!producto.ya_solicitado;
  const linea = [t('misProductos.cantidad', { n: producto.stock }), producto.comercio, textoKm(producto.distancia_km)]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={estilos.fila}>
      <Pressable
        onPress={alVer}
        accessibilityRole="button"
        accessibilityLabel={`${producto.titulo}. ${linea}`}
        accessibilityHint={t('donaciones.verDetalle')}
        style={({ pressed }) => [estilos.tocable, pressed && presionado]}
      >
        <View style={[estilos.foto, { backgroundColor: colores.panel }]}>
          {producto.imagen ? (
            <Image source={{ uri: urlCompleta(producto.imagen) }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          ) : (
            <IconoCategoria categoria={producto.categoria} llenar tamano={30} />
          )}
        </View>
        <View style={estilos.datos}>
          <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={2}>
            {producto.titulo}
          </Text>
          <Text style={[estilos.linea, { color: colores.grisVerde }]} numberOfLines={2}>
            {linea}
          </Text>
        </View>
      </Pressable>

      {pedido ? (
        <Text style={[estilos.pedido, { color: colores.grisVerde }]}>{t('donaciones.yaLoPediste')}</Text>
      ) : (
        <Pressable
          onPress={alPedir}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${t('donaciones.pedir')}: ${producto.titulo}`}
          style={({ pressed }) => [estilos.botonPedir, pressed && presionado]}
        >
          <Text style={[estilos.textoPedir, { color: colores.verdeTexto }]}>{t('donaciones.pedir')}</Text>
        </Pressable>
      )}
    </View>
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
  const yaPedidos = productos.filter((p) => p.ya_solicitado).length;
  const resumen = [
    t('donaciones.resumen', { n: productos.length - yaPedidos }),
    yaPedidos ? t('donaciones.resumenPedidos', { n: yaPedidos }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
          <View>
            {/* Igual que Inicio: ☰ y "Ayuda" */}
            <BarraSuperior navigation={navigation} desde="Donaciones" estilo={estilos.barra} />
            <CabeceraUsuario
              foto={urlCompleta(usuario?.foto)}
              nombre={nombre}
              arriba={t('donaciones.hola')}
              titulo={nombre}
              resumen={resumen}
              accion={{ texto: t('donaciones.misPedidos'), alTocar: () => navigation.navigate('MisSolicitudes') }}
              alTocar={() => navigation.navigate('Perfil')}
              accessibilityLabel={`${nombre}. ${resumen}. ${t('menu.miPerfil')}`}
              estilo={estilos.cabecera}
            />
            <MensajeError mensaje={error} alReintentar={cargar} />
            {productos.length ? <TituloSeccion texto={t('donaciones.subtitulo')} /> : null}
          </View>
        }
        ListEmptyComponent={!error ? <EstadoVacio texto={t('donaciones.vacio')} /> : null}
        renderItem={({ item }) => (
          <TarjetaDonacion
            producto={item}
            alVer={() => navigation.navigate('DetalleProducto', { id: item.id })}
            alPedir={() => setPidiendo(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacio(2.5) }} />}
      />

      <ModalSolicitudDonacion producto={pidiendo} alCerrar={() => setPidiendo(null)} alEnviar={alEnviar} />
    </>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    paddingHorizontal: espacio(2),
    paddingBottom: espacio(4),
    flexGrow: 1,
  },
  barra: {
    paddingHorizontal: 0, // la lista ya tiene el margen a los costados
  },
  cabecera: {
    marginTop: espacio(1),
  },
  // ---- Donación (sin caja: la foto, el nombre y una línea gris) ----
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
  linea: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    lineHeight: 17,
  },
  botonPedir: {
    paddingHorizontal: espacio(1),
    paddingVertical: espacio(1),
  },
  textoPedir: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  pedido: {
    maxWidth: 80,
    fontFamily: fuentes.normal,
    fontSize: 12,
    textAlign: 'right',
  },
});
