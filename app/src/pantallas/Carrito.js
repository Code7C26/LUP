// Carrito, como el del mockup: los productos agregados (agrupados por comercio),
// la cantidad de cada uno, el total y "Realizar compra".
// "Realizar compra" reserva cada producto con POST /api/productos/<id>/reservar/ (paso 29)
// y después lleva a "Mis reservas", donde están los códigos de retiro.
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, urlCompleta } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import Vacio from '../componentes/Vacio';
import { useCarrito } from '../contexto/Carrito';
import { useSesion } from '../contexto/Sesion';
import { programarRecordatorio } from '../servicios/recordatorios';
import { espacio, fuentes, sombra, tamanos, useTema } from '../tema';
import { emojiCategoria, formatoPrecio, textoError, vibrar } from '../utilidades';

// Botón redondo − / +
function BotonMasMenos({ icono, onPress, deshabilitado, etiqueta }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [
        estilos.masMenos,
        { backgroundColor: colores.fondo, borderColor: colores.borde },
        (pressed || deshabilitado) && { opacity: 0.4 },
      ]}
    >
      <Icono nombre={icono} tamano={16} color={colores.texto} />
    </Pressable>
  );
}

export default function Carrito({ navigation }) {
  const { colores } = useTema();
  const { bottom } = useSafeAreaInsets();
  const { usuario } = useSesion();
  const { items, total, cantidadTotal, cambiarCantidad, quitar, actualizar } = useCarrito();

  const [detalles, setDetalles] = useState({}); // id → producto de la API (o null si ya no está)
  const [cargando, setCargando] = useState(true);
  const [comprando, setComprando] = useState(false);

  // Al abrir: se busca cada producto para tener la foto, el nombre y el precio y stock de ahora
  useEffect(() => {
    let activo = true;
    (async () => {
      const resultados = await Promise.all(
        items.map((i) =>
          api(`/productos/${i.id}/`)
            .then((p) => [i.id, p])
            .catch(() => [i.id, null]) // se agotó o venció
        )
      );
      if (!activo) return;
      const mapa = Object.fromEntries(resultados);
      setDetalles(mapa);
      resultados.forEach(([id, p]) => {
        if (p) actualizar(id, { precio: Number(p.precio_descuento), stock: p.stock, comercio_id: p.comercio_id });
      });
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
    // Solo al abrir la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function realizarCompra() {
    if (!usuario) return navigation.navigate('Login');
    if (usuario.rol !== 'consumidor') {
      return Alert.alert('Solo para consumidores', 'Las compras se hacen con una cuenta de consumidor.');
    }
    const disponibles = items.filter((i) => detalles[i.id]);
    setComprando(true);
    const hechas = [];
    const fallidas = [];
    // Una reserva por producto (así cada comercio recibe la suya, con su código)
    for (const item of disponibles) {
      try {
        const reserva = await api(`/productos/${item.id}/reservar/`, { metodo: 'POST', datos: { cantidad: item.cantidad } });
        const p = detalles[item.id];
        // Aviso en el celular 30 minutos antes del horario de retiro de ese comercio
        await programarRecordatorio({
          reservaId: reserva.id,
          producto: p.titulo,
          comercio: reserva.comercio,
          codigo: reserva.codigo_retiro,
          horario: p.horario,
          fecha: p.fecha_vencimiento,
        });
        hechas.push(item);
        quitar(item.id);
      } catch (e) {
        fallidas.push(`${detalles[item.id]?.titulo || 'Producto'}: ${textoError(e) || 'no se pudo reservar'}`);
      }
    }
    setComprando(false);

    if (hechas.length) vibrar('exito');
    if (hechas.length && !fallidas.length) {
      Alert.alert('¡Compra realizada!', 'Mostrá tus códigos en cada comercio para retirar. Te avisamos antes de cada horario de retiro.', [
        { text: 'Ver mis reservas', onPress: () => navigation.navigate('Pestanas', { screen: 'MisReservas' }) },
      ]);
    } else if (hechas.length) {
      Alert.alert(
        'Se reservó una parte',
        `Estos quedaron en el carrito:\n\n${fallidas.join('\n')}`,
        [{ text: 'Ver mis reservas', onPress: () => navigation.navigate('Pestanas', { screen: 'MisReservas' }) }, { text: 'Ok' }]
      );
    } else {
      Alert.alert('No se pudo reservar', fallidas.join('\n') || 'Probá de nuevo.');
    }
  }

  if (cargando && items.length) return <Cargando texto="Abriendo tu carrito…" />;

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <Vacio
          icono="cart-outline"
          texto="Tu carrito está vacío"
          boton="Ver ofertas"
          alTocar={() => navigation.navigate('Pestanas', { screen: 'Catalogo' })}
        />
      </View>
    );
  }

  // Agrupados por comercio
  const grupos = {};
  items.forEach((item) => {
    const nombre = detalles[item.id]?.comercio || 'No disponible';
    (grupos[nombre] = grupos[nombre] || []).push(item);
  });
  const hayNoDisponibles = items.some((i) => !detalles[i.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={[estilos.titulo, { color: colores.titulo }]}>Mi carrito</Text>

        {Object.entries(grupos).map(([comercio, lista]) => (
          <View key={comercio} style={{ gap: espacio(1.25) }}>
            <View style={estilos.filaComercio}>
              <Icono nombre="storefront-outline" tamano={16} color={colores.gris} />
              <Text style={[estilos.comercio, { color: colores.gris }]}>{comercio}</Text>
            </View>

            {lista.map((item) => {
              const p = detalles[item.id];
              return (
                <View key={item.id} style={[estilos.item, { backgroundColor: colores.panel }, sombra(colores)]}>
                  <View style={[estilos.foto, { backgroundColor: colores.fondo }]}>
                    {p?.imagen ? (
                      <Image source={{ uri: urlCompleta(p.imagen) }} style={StyleSheet.absoluteFill} />
                    ) : (
                      <Text style={{ fontSize: 26 }}>{p ? emojiCategoria(p.categoria) : '🚫'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={1}>
                      {p?.titulo || 'Ya no está disponible'}
                    </Text>
                    {p ? (
                      <View style={estilos.filaCantidad}>
                        <BotonMasMenos
                          icono="remove"
                          etiqueta="Restar uno"
                          onPress={() => cambiarCantidad(item.id, item.cantidad - 1)}
                        />
                        <Text style={[estilos.cantidad, { color: colores.texto }]}>{item.cantidad}</Text>
                        <BotonMasMenos
                          icono="add"
                          etiqueta="Sumar uno"
                          deshabilitado={item.cantidad >= item.stock}
                          onPress={() => cambiarCantidad(item.id, item.cantidad + 1)}
                        />
                        <Text style={[estilos.precio, { color: colores.texto }]}>{formatoPrecio(item.precio * item.cantidad)}</Text>
                      </View>
                    ) : (
                      <Text style={[estilos.chico, { color: colores.gris }]}>Se agotó o venció</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => quitar(item.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar del carrito"
                    style={estilos.quitar}
                  >
                    <Icono nombre="trash-outline" tamano={19} color={colores.error} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        {hayNoDisponibles ? (
          <Text style={[estilos.chico, { color: colores.gris }]}>Los que ya no están disponibles no se van a reservar.</Text>
        ) : null}
      </ScrollView>

      {/* Total y "Realizar compra", fijos abajo */}
      <View style={[estilos.barra, { backgroundColor: colores.fondo, borderColor: colores.borde, paddingBottom: bottom + espacio(1.5) }]}>
        <View style={estilos.filaTotal}>
          <Text style={[estilos.chico, { color: colores.gris }]}>
            {cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'} · pagás al retirar
          </Text>
          <Text style={[estilos.total, { color: colores.texto }]}>{formatoPrecio(total)}</Text>
        </View>
        <Boton
          texto={usuario ? 'Realizar compra' : 'Ingresá para comprar'}
          onPress={realizarCompra}
          cargando={comprando}
          deshabilitado={!items.some((i) => detalles[i.id])}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(4),
    gap: espacio(2.5),
  },
  titulo: {
    fontFamily: fuentes.normal,
    fontSize: 26,
  },
  filaComercio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comercio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.chico,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    borderRadius: 12,
    padding: espacio(1),
  },
  foto: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: 14,
  },
  filaCantidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  masMenos: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidad: {
    fontFamily: fuentes.negrita,
    fontSize: 15,
    minWidth: 18,
    textAlign: 'center',
  },
  precio: {
    marginLeft: 'auto',
    fontFamily: fuentes.negrita,
    fontSize: 15,
  },
  quitar: {
    padding: espacio(0.5),
  },
  chico: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  barra: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: espacio(2),
    paddingTop: espacio(1.5),
    gap: espacio(1.25),
  },
  filaTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: {
    fontFamily: fuentes.negrita,
    fontSize: 20,
  },
});
