// PASO 48 · Organización: donaciones disponibles.
// Lista los productos que los comercios marcaron como aptos para donar (GET /api/donaciones/).
// Cada uno tiene "Solicitar", que abre el cuadro para escribirle al comercio
// (POST /api/productos/<id>/solicitar-donacion/, paso 31).
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/cliente';
import Boton from '../../componentes/Boton';
import Cargando from '../../componentes/Cargando';
import MensajeError from '../../componentes/MensajeError';
import ModalSolicitudDonacion from '../../componentes/ModalSolicitudDonacion';
import TarjetaProducto from '../../componentes/TarjetaProducto';
import { espacio, fuentes, tamanos, useTema } from '../../tema';

export default function Donaciones({ navigation }) {
  const { colores } = useTema();
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
      'Solicitud enviada',
      `${solicitud.comercio} recibió tu pedido. Vas a ver su respuesta en "Mis solicitudes".`
    );
  }

  if (cargando) return <Cargando texto="Buscando donaciones…" />;

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
          <View style={{ gap: espacio(1), marginBottom: espacio(1.5) }}>
            <Text style={[estilos.titulo, { color: colores.titulo }]}>Donaciones disponibles</Text>
            <Text style={[estilos.texto, { color: colores.gris }]}>
              Productos que los comercios ofrecen para donar. Pedí lo que te sirva y contales para quién es.
            </Text>
            <MensajeError mensaje={error} alReintentar={cargar} />
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <View style={estilos.vacio}>
              <Text style={estilos.emojiVacio}>💚</Text>
              <Text style={[estilos.texto, { color: colores.gris, textAlign: 'center' }]}>
                Ahora no hay productos para donar. Volvé a mirar más tarde: los comercios publican durante el día.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ gap: espacio(1) }}>
            <TarjetaProducto
              producto={item}
              onPress={() => navigation.navigate('DetalleProducto', { id: item.id })}
            />
            {item.ya_solicitado ? (
              <Boton texto="✓ Ya lo pediste" variante="secundario" deshabilitado />
            ) : (
              <Boton texto="Solicitar" onPress={() => setPidiendo(item)} />
            )}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacio(2.5) }} />}
      />

      <ModalSolicitudDonacion producto={pidiendo} alCerrar={() => setPidiendo(null)} alEnviar={alEnviar} />
    </>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  vacio: {
    alignItems: 'center',
    gap: espacio(1),
    marginTop: espacio(4),
  },
  emojiVacio: {
    fontSize: 40,
  },
});
