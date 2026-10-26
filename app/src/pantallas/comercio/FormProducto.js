// PASO 46 · Comercio: nuevo y editar producto, como "Nuevo Producto" del mockup.
// Pide los MISMOS campos que el formulario de la web (products/forms.py → ProductoForm)
// y la foto (sacarla con la cámara o elegirla de la galería).
// Nuevo:  POST  /api/mis-productos/        → navigation.navigate('FormProducto')
// Editar: PATCH /api/mis-productos/<id>/   → navigation.navigate('FormProducto', { id })
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { api, urlCompleta } from '../../api/cliente';
import Boton from '../../componentes/Boton';
import Campo from '../../componentes/Campo';
import Cargando from '../../componentes/Cargando';
import MensajeError from '../../componentes/MensajeError';
import { espacio, fuentes, radio, tamanos, useTema } from '../../tema';
import { textoError } from '../../utilidades';
import { Opciones } from '../Registro';

// Mismas categorías que products/models.py (CATEGORIAS)
const CATEGORIAS = [
  ['panificados', '🥐 Panificados'],
  ['comidas', '🍲 Comidas preparadas'],
  ['frutas_verduras', '🥕 Frutas y verduras'],
  ['lacteos', '🧀 Lácteos'],
  ['carnes', '🍗 Carnes'],
  ['almacen', '🥫 Almacén'],
  ['bolsa_sorpresa', '🛍️ Bolsa sorpresa'],
  ['otros', '🍽️ Otros'],
];

const CAMPOS = ['titulo', 'categoria', 'descripcion', 'precio_original', 'precio_descuento', 'stock', 'fecha_vencimiento', 'es_donacion', 'imagen'];

// ---- Fechas: en pantalla "26/10/2026", para Django "2026-10-26" ----
function fechaEnDias(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

function isoAFecha(iso) {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function fechaAIso(texto) {
  const partes = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!partes) return null;
  const [, dia, mes, anio] = partes;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  if (fecha.getMonth() !== Number(mes) - 1) return null; // ej: 31/02
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

// "1.500,50" o "1500.50" -> "1500.50"
function numeroParaDjango(texto) {
  const limpio = String(texto).trim().replace(/\s/g, '');
  return limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
}

export default function FormProducto({ navigation, route }) {
  const { colores } = useTema();
  const id = route?.params?.id; // si viene, se está editando

  const [valores, setValores] = useState({
    titulo: '',
    categoria: 'panificados',
    descripcion: '',
    precio_original: '',
    precio_descuento: '',
    stock: '1',
    fecha_vencimiento: fechaEnDias(0),
    es_donacion: false,
  });
  const [fotoActual, setFotoActual] = useState(null); // la que ya tenía el producto (al editar)
  const [fotoNueva, setFotoNueva] = useState(null); // la que se sacó o eligió ahora
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(Boolean(id));
  const [enviando, setEnviando] = useState(false);

  // Al editar, se cargan los datos actuales del producto
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p = await api(`/mis-productos/${id}/`);
        setValores({
          titulo: p.titulo,
          categoria: p.categoria,
          descripcion: p.descripcion,
          precio_original: String(Number(p.precio_original)),
          precio_descuento: String(Number(p.precio_descuento)),
          stock: String(p.stock),
          fecha_vencimiento: isoAFecha(p.fecha_vencimiento),
          es_donacion: p.es_donacion,
        });
        setFotoActual(urlCompleta(p.imagen));
      } catch (e) {
        setErrorGeneral(e);
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  const cambiar = (campo) => (valor) => setValores((v) => ({ ...v, [campo]: valor }));

  // Mismo cálculo que porcentaje_descuento en products/models.py
  const original = Number(numeroParaDjango(valores.precio_original));
  const conDescuento = Number(numeroParaDjango(valores.precio_descuento));
  const porcentaje =
    original > 0 && conDescuento >= 0 && conDescuento < original ? Math.round((1 - conDescuento / original) * 100) : null;

  async function sacarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Sin permiso', 'Dale permiso a Lüp para usar la cámara, o elegí una foto de la galería.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [4, 3] });
    if (!r.canceled) setFotoNueva(r.assets[0]);
  }

  async function elegirFoto() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!r.canceled) setFotoNueva(r.assets[0]);
  }

  async function publicar() {
    setErrores({});
    setErrorGeneral('');

    const fecha = fechaAIso(valores.fecha_vencimiento);
    if (!fecha) {
      setErrores({ fecha_vencimiento: 'Escribí la fecha como DD/MM/AAAA, por ejemplo 26/10/2026.' });
      return;
    }

    const datos = new FormData();
    datos.append('titulo', valores.titulo.trim());
    datos.append('categoria', valores.categoria);
    datos.append('descripcion', valores.descripcion.trim());
    datos.append('precio_original', numeroParaDjango(valores.precio_original));
    datos.append('precio_descuento', numeroParaDjango(valores.precio_descuento));
    datos.append('stock', valores.stock.trim());
    datos.append('fecha_vencimiento', fecha);
    datos.append('es_donacion', valores.es_donacion ? 'true' : 'false');
    if (fotoNueva) {
      datos.append('imagen', {
        uri: fotoNueva.uri,
        name: fotoNueva.fileName || 'producto.jpg',
        type: fotoNueva.mimeType || 'image/jpeg',
      });
    }

    setEnviando(true);
    try {
      await api(id ? `/mis-productos/${id}/` : '/mis-productos/', { metodo: id ? 'PATCH' : 'POST', datos });
      Alert.alert(
        id ? 'Publicación actualizada' : '¡Excedente publicado!',
        id ? 'Los cambios ya se ven en el catálogo.' : 'Ya aparece en el catálogo.'
      );
      navigation.goBack();
    } catch (e) {
      if (e?.sinConexion || e?.error || e?.detail) {
        setErrorGeneral(e);
      } else {
        // Errores de Django por campo: { "precio_descuento": ["El precio Lüp no puede ser mayor..."] }
        setErrores(e || {});
        const otros = Object.entries(e || {})
          .filter(([campo]) => !CAMPOS.includes(campo) && campo !== 'estado')
          .map(([, mensaje]) => textoError(mensaje));
        setErrorGeneral(otros.length ? otros.join(' ') : 'Revisá los campos marcados en rojo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <Cargando texto="Cargando el producto…" />;

  const foto = fotoNueva?.uri || fotoActual;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={[estilos.titulo, { color: colores.titulo }]}>{id ? 'Editar producto' : 'Nuevo producto'}</Text>

        {/* Foto */}
        <View style={{ gap: espacio(1) }}>
          {foto ? (
            <Image source={{ uri: foto }} style={estilos.foto} accessibilityLabel="Foto del producto" />
          ) : (
            <View style={[estilos.foto, estilos.sinFoto, { backgroundColor: colores.menta }]}>
              <Text style={estilos.emoji}>📷</Text>
              <Text style={[estilos.ayuda, { color: colores.gris }]}>Las ofertas con foto se reservan más</Text>
            </View>
          )}
          <View style={estilos.fila}>
            <Boton texto="Sacar foto" variante="secundario" onPress={sacarFoto} estilo={{ flex: 1 }} />
            <Boton texto="Elegir de la galería" variante="secundario" onPress={elegirFoto} estilo={estilos.botonChico} />
          </View>
          {errores.imagen ? (
            <Text style={[estilos.ayuda, { color: colores.error }]}>{textoError(errores.imagen)}</Text>
          ) : null}
        </View>

        <Campo
          etiqueta="Nombre del producto"
          placeholder="Ej: Docena de medialunas del día"
          value={valores.titulo}
          onChangeText={cambiar('titulo')}
          error={errores.titulo}
          maxLength={100}
        />

        <Opciones
          etiqueta="Categoría"
          opciones={CATEGORIAS}
          valor={valores.categoria}
          alElegir={cambiar('categoria')}
          error={errores.categoria}
        />

        <Campo
          etiqueta="Descripción"
          placeholder="Contá qué incluye la oferta y cómo conservarla…"
          value={valores.descripcion}
          onChangeText={cambiar('descripcion')}
          error={errores.descripcion}
          multiline
          textAlignVertical="top"
          estiloInput={{ minHeight: 96, paddingTop: espacio(1.5) }}
        />

        <View style={estilos.fila}>
          <Campo
            etiqueta="Precio original ($)"
            placeholder="3000"
            keyboardType="decimal-pad"
            value={valores.precio_original}
            onChangeText={cambiar('precio_original')}
            error={errores.precio_original}
            estilo={{ flex: 1 }}
          />
          <Campo
            etiqueta="Precio Lüp ($)"
            placeholder="1500"
            keyboardType="decimal-pad"
            value={valores.precio_descuento}
            onChangeText={cambiar('precio_descuento')}
            error={errores.precio_descuento}
            estilo={{ flex: 1 }}
          />
        </View>
        {porcentaje !== null ? (
          <Text style={[estilos.ayuda, { color: colores.verdeHover }]}>Descuento del {porcentaje}%</Text>
        ) : null}

        <Campo
          etiqueta="Cantidad disponible"
          keyboardType="number-pad"
          value={valores.stock}
          onChangeText={cambiar('stock')}
          error={errores.stock}
        />

        <View style={{ gap: espacio(1) }}>
          <Campo
            etiqueta="Fecha límite de retiro"
            placeholder="DD/MM/AAAA"
            keyboardType="numbers-and-punctuation"
            value={valores.fecha_vencimiento}
            onChangeText={cambiar('fecha_vencimiento')}
            error={errores.fecha_vencimiento}
            maxLength={10}
          />
          <View style={estilos.fila}>
            {[
              [0, 'Hoy'],
              [1, 'Mañana'],
              [2, 'Pasado mañana'],
            ].map(([dias, texto]) => {
              const elegida = valores.fecha_vencimiento === fechaEnDias(dias);
              return (
                <Pressable
                  key={dias}
                  onPress={() => cambiar('fecha_vencimiento')(fechaEnDias(dias))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: elegida }}
                  style={[
                    estilos.chip,
                    { borderColor: elegida ? colores.verde : colores.borde },
                    elegida && { backgroundColor: colores.verde },
                  ]}
                >
                  <Text style={[estilos.textoChip, { color: elegida ? colores.sobreVerde : colores.texto }]}>{texto}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Apto para donación */}
        <Pressable
          onPress={() => cambiar('es_donacion')(!valores.es_donacion)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: valores.es_donacion }}
          style={estilos.casillaFila}
        >
          <View
            style={[
              estilos.casilla,
              { borderColor: colores.verde },
              valores.es_donacion && { backgroundColor: colores.verde },
            ]}
          >
            {valores.es_donacion ? <Text style={[estilos.tilde, { color: colores.sobreVerde }]}>✓</Text> : null}
          </View>
          <Text style={[estilos.textoCasilla, { color: colores.texto }]}>
            También disponible para donación a organizaciones
          </Text>
        </Pressable>

        <MensajeError mensaje={errorGeneral} />

        <Boton texto={id ? 'Guardar cambios' : 'Publicar'} onPress={publicar} cargando={enviando} />
        <Boton texto="Cancelar" variante="secundario" onPress={() => navigation.goBack()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    gap: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  foto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radio,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio(1),
  },
  emoji: {
    fontSize: 48,
  },
  ayuda: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  fila: {
    flexDirection: 'row',
    gap: espacio(1),
  },
  botonChico: {
    flex: 1,
    paddingHorizontal: espacio(1),
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radio,
    paddingHorizontal: espacio(1.5),
    paddingVertical: espacio(0.75),
  },
  textoChip: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  casillaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  casilla: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilde: {
    fontFamily: fuentes.negrita,
    fontSize: 16,
  },
  textoCasilla: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
});
