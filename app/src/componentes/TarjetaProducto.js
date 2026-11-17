// Tarjeta de un producto. Dos formas:
//   <TarjetaProducto producto={p} onPress={...} />                    ← fila (foto a la izquierda)
//   <TarjetaProducto producto={p} onPress={...} variante="vertical" /> ← foto arriba (carrusel y grilla)
// "producto" es un objeto como los que devuelve /api/productos/.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { urlCompleta } from '../api/cliente';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, sombra, tamanos, useTema } from '../tema';
import { formatoPrecio, textoKm } from '../utilidades';
import CalificacionComercio from './CalificacionComercio';
import Icono from './Icono';
import IconoCategoria from './IconoCategoria';

// La foto (o el ícono de la categoría si no tiene) con el % de descuento encima
function Foto({ producto, estilo }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={[estilo, { backgroundColor: colores.menta, overflow: 'hidden' }]}>
      {producto.imagen ? (
        <Image source={{ uri: urlCompleta(producto.imagen) }} style={StyleSheet.absoluteFill} />
      ) : (
        <IconoCategoria categoria={producto.categoria} llenar tamano={32} />
      )}
      {producto.porcentaje_descuento > 0 ? (
        <Text style={[estilos.descuento, { backgroundColor: colores.suaves.durazno.fondo, color: colores.texto }]}>
          -{producto.porcentaje_descuento}%
        </Text>
      ) : null}
      {producto.es_donacion ? (
        <View style={[estilos.corazon, { backgroundColor: colores.superficie }]} accessibilityLabel={t('tarjeta.tambienDonacion')}>
          <Icono nombre="heart" tamano={13} color={colores.verde} />
        </View>
      ) : null}
    </View>
  );
}

// "calificacion" (opcional): { promedio, cantidad } del comercio (de /api/comercios/) → estrellas o "Nuevo"
export default function TarjetaProducto({ producto, onPress, variante = 'fila', estilo, calificacion }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const distancia = textoKm(producto.distancia_km);
  const vertical = variante === 'vertical';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('tarjeta.accesible', {
        titulo: producto.titulo,
        comercio: producto.comercio,
        precio: formatoPrecio(producto.precio_descuento),
      })}
      style={({ pressed }) => [
        vertical ? estilos.vertical : estilos.fila,
        { backgroundColor: colores.superficie },
        sombra(colores),
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        estilo,
      ]}
    >
      <Foto producto={producto} estilo={vertical ? estilos.fotoVertical : estilos.fotoFila} />

      <View style={vertical ? estilos.infoVertical : estilos.infoFila}>
        <Text numberOfLines={vertical ? 1 : 2} style={[estilos.titulo, { color: colores.titulo }]}>
          {producto.titulo}
        </Text>
        <View style={estilos.filaChica}>
          <Icono nombre="storefront-outline" tamano={13} color={colores.gris} />
          <Text numberOfLines={1} style={[estilos.comercio, { color: colores.gris }]}>
            {producto.comercio}
          </Text>
        </View>
        {calificacion ? (
          <CalificacionComercio promedio={calificacion.promedio} cantidad={calificacion.cantidad} tamano={11} />
        ) : null}

        <View style={estilos.precios}>
          <Text style={[estilos.precio, { color: colores.titulo }]}>{formatoPrecio(producto.precio_descuento)}</Text>
          <Text style={[estilos.tachado, { color: colores.gris }]}>{formatoPrecio(producto.precio_original)}</Text>
          {distancia && !vertical ? (
            <View style={[estilos.km, { backgroundColor: colores.menta }]}>
              <Icono nombre="location" tamano={11} color={colores.verdeHover} />
              <Text style={[estilos.textoKm, { color: colores.verdeHover }]}>{distancia}</Text>
            </View>
          ) : null}
        </View>
        {distancia && vertical ? (
          <View style={estilos.filaChica}>
            <Icono nombre="location" tamano={12} color={colores.verdeHover} />
            <Text style={[estilos.textoKm, { color: colores.verdeHover }]}>{distancia}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    borderRadius: radio,
    padding: espacio(1.25),
    gap: espacio(1.5),
    alignItems: 'center',
  },
  vertical: {
    borderRadius: radio,
    overflow: 'hidden',
  },
  fotoFila: {
    width: 92,
    height: 92,
    borderRadius: 16,
  },
  fotoVertical: {
    width: '100%',
    height: 120,
  },
  descuento: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mini,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  corazon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoFila: {
    flex: 1,
    gap: 2,
  },
  infoVertical: {
    padding: espacio(1.25),
    gap: 2,
  },
  titulo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  filaChica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comercio: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  precios: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: espacio(0.75),
    marginTop: 2,
  },
  precio: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  tachado: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    textDecorationLine: 'line-through',
  },
  km: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  textoKm: {
    fontFamily: fuentes.media,
    fontSize: tamanos.mini,
  },
});
