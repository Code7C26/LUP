// "Publicar de nuevo" para los comercios: atajos para volver a cargar en un toque
// lo ÚLTIMO que publicaron y lo que MÁS SE VENDE (con la foto, los precios y la fecha de hoy).
// Usa la lista de GET /api/mis-productos/ (cada producto trae "vendidos": unidades reservadas sin cancelar).
// Uso:
//   <PublicarDeNuevo productos={productos} alElegir={(p) => navigation.navigate('FormProducto', { copiarDe: p.id })} />
//   <PublicarDeNuevo productos={productos} alElegir={...} compacto />   ← chips, para el formulario "Nuevo Producto"
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { urlCompleta } from '../api/cliente';
import { espacio, fuentes, sombra, useTema } from '../tema';
import { emojiCategoria, formatoPrecio } from '../utilidades';
import Icono from './Icono';

// Devuelve [{ producto, ultimo, vendidos }] (uno o dos): el último publicado y el más vendido.
// Las copias de un mismo producto ("Medialunas" de cada día) se suman como uno solo, por el nombre,
// y se ofrece copiar la más nueva.
export function atajosParaPublicar(productos) {
  if (!productos?.length) return [];
  const porNombre = new Map();
  productos.forEach((p) => {
    // La lista viene de la más nueva a la más vieja: la primera de cada nombre es la más nueva
    const clave = p.titulo.trim().toLowerCase();
    const grupo = porNombre.get(clave) || { producto: p, vendidos: 0 };
    grupo.vendidos += p.vendidos || 0;
    porNombre.set(clave, grupo);
  });
  const ultimo = productos[0];
  const deUltimo = porNombre.get(ultimo.titulo.trim().toLowerCase());
  const masVendido = [...porNombre.values()].reduce((mejor, g) => (g.vendidos > (mejor?.vendidos || 0) ? g : mejor), null);

  if (!masVendido || masVendido === deUltimo) {
    return [{ producto: ultimo, ultimo: true, vendidos: deUltimo.vendidos, masVendido: Boolean(masVendido) }];
  }
  return [
    { producto: ultimo, ultimo: true, vendidos: deUltimo.vendidos },
    { producto: masVendido.producto, masVendido: true, vendidos: masVendido.vendidos },
  ];
}

function textoEtiqueta(atajo) {
  if (atajo.ultimo && atajo.masVendido) return '🔥 Lo último y lo más vendido';
  if (atajo.masVendido) return '🔥 Tu más vendido';
  return '🕒 Lo último';
}

export default function PublicarDeNuevo({ productos, alElegir, compacto = false }) {
  const { colores } = useTema();
  const atajos = atajosParaPublicar(productos);
  if (!atajos.length) return null;

  // En el formulario: una fila de chips "Cargar de nuevo"
  if (compacto) {
    return (
      <View style={{ gap: espacio(0.75) }}>
        <Text style={[estilos.chico, { color: colores.gris }]}>¿Lo mismo de siempre? Cargalo de nuevo:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio(1) }}>
          {atajos.map((a) => (
            <Pressable
              key={a.producto.id}
              onPress={() => alElegir(a.producto)}
              accessibilityRole="button"
              accessibilityLabel={`Cargar de nuevo ${a.producto.titulo}`}
              style={({ pressed }) => [
                estilos.chip,
                { backgroundColor: colores.menta, borderColor: colores.borde },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Icono nombre={a.masVendido ? 'flame' : 'time-outline'} tamano={15} color={colores.verdeHover} />
              <Text style={[estilos.textoChip, { color: colores.texto }]} numberOfLines={1}>
                {a.producto.titulo}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // En "Mi Perfil" del comercio: tarjetas con foto
  return (
    <View style={{ gap: espacio(1) }}>
      <View>
        <Text style={[estilos.tituloSeccion, { color: colores.titulo }]}>Publicar de nuevo</Text>
        <Text style={[estilos.chico, { color: colores.gris }]}>
          Cargalo en un toque: con la foto, los precios y la fecha de hoy.
        </Text>
      </View>
      <View style={estilos.tarjetas}>
        {atajos.map((a) => (
          <Pressable
            key={a.producto.id}
            onPress={() => alElegir(a.producto)}
            accessibilityRole="button"
            accessibilityLabel={`Publicar de nuevo ${a.producto.titulo}`}
            style={({ pressed }) => [
              estilos.tarjeta,
              { backgroundColor: colores.menta, borderColor: colores.borde },
              sombra(colores),
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[estilos.etiqueta, { color: colores.verdeHover }]} numberOfLines={1}>
              {textoEtiqueta(a)}
            </Text>
            <View style={estilos.filaProducto}>
              <View style={[estilos.foto, { backgroundColor: colores.panel }]}>
                {a.producto.imagen ? (
                  <Image source={{ uri: urlCompleta(a.producto.imagen) }} style={StyleSheet.absoluteFill} />
                ) : (
                  <Text style={estilos.emoji}>{emojiCategoria(a.producto.categoria)}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[estilos.titulo, { color: colores.texto }]} numberOfLines={2}>
                  {a.producto.titulo}
                </Text>
                <Text style={[estilos.chico, { color: colores.gris }]} numberOfLines={1}>
                  {formatoPrecio(a.producto.precio_descuento)}
                  {a.vendidos ? ` · ${a.vendidos} vendido${a.vendidos === 1 ? '' : 's'}` : ''}
                </Text>
              </View>
            </View>
            <View style={[estilos.boton, { backgroundColor: colores.verdeProfundo }]}>
              <Icono nombre="repeat" tamano={14} color={colores.sobreVerdeProfundo} />
              <Text style={[estilos.textoBoton, { color: colores.sobreVerdeProfundo }]}>Publicar de nuevo</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tituloSeccion: {
    fontFamily: fuentes.negrita,
    fontSize: 16,
  },
  chico: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  tarjetas: {
    flexDirection: 'row',
    gap: espacio(1.25),
  },
  tarjeta: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: espacio(1.25),
    gap: espacio(1),
  },
  etiqueta: {
    fontFamily: fuentes.negrita,
    fontSize: 11,
  },
  filaProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  foto: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: 13,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 6,
  },
  textoBoton: {
    fontFamily: fuentes.botonMedio,
    fontSize: 11,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: espacio(1.5),
    height: 34,
    maxWidth: 220,
  },
  textoChip: {
    fontFamily: fuentes.media,
    fontSize: 13,
  },
});
