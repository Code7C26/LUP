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
import Encabezado from '../../componentes/Encabezado';
import Vacio from '../../componentes/Vacio';

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
            <Encabezado titulo="Donaciones" subtitulo="Disponibles cerca" />
            <MensajeError mensaje={error} alReintentar={cargar} />
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <Vacio icono="heart-outline" texto="No hay donaciones ahora. Los comercios publican durante el día." />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ gap: espacio(1) }}>
            <TarjetaProducto
              producto={item}
              onPress={() => navigation.navigate('DetalleProducto', { id: item.id })}
            />
            {item.ya_solicitado ? (
              <Boton texto="Ya lo pediste" icono="checkmark" variante="texto" chico deshabilitado />
            ) : (
              <Boton texto="Pedir" icono="heart" chico onPress={() => setPidiendo(item)} />
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
