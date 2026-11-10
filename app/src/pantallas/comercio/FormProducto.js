// PASO 46 · Comercio: nuevo y editar producto, IGUAL a "Nuevo Producto" del mockup (página 12).
// Pide los MISMOS campos que el formulario de la web (products/forms.py → ProductoForm)
// y la foto (sacarla con la cámara o elegirla de la galería).
// Nuevo:  POST  /api/mis-productos/        → navigation.navigate('FormProducto')
// Editar: PATCH /api/mis-productos/<id>/   → navigation.navigate('FormProducto', { id })
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { api, urlCompleta } from '../../api/cliente';
import Boton from '../../componentes/Boton';
import Campo from '../../componentes/Campo';
import Cargando from '../../componentes/Cargando';
import MensajeError from '../../componentes/MensajeError';
import PublicarDeNuevo from '../../componentes/PublicarDeNuevo';
import { espacio, fuentes, radio, tamanos, useTema } from '../../tema';
import { textoError } from '../../utilidades';
import { Opciones } from '../Registro';
import Icono from '../../componentes/Icono';

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
  const copiarDe = route?.params?.copiarDe; // si viene, es "Publicar de nuevo": se copia ese producto

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
  const [cargando, setCargando] = useState(Boolean(id || copiarDe));
  const [enviando, setEnviando] = useState(false);
  const [anteriores, setAnteriores] = useState([]); // para "¿Lo mismo de siempre?" (solo en uno nuevo)

  // Producto nuevo: se traen los anteriores para ofrecer cargar de nuevo el último o el más vendido
  useEffect(() => {
    if (id || copiarDe) return;
    api('/mis-productos/').then(setAnteriores).catch(() => {});
  }, [id, copiarDe]);

  // Al editar (o al "Publicar de nuevo"), se cargan los datos del producto
  useEffect(() => {
    const origen = id || copiarDe;
    if (!origen) return;
    setCargando(true);
    (async () => {
      try {
        const p = await api(`/mis-productos/${origen}/`);
        setValores({
          titulo: p.titulo,
          categoria: p.categoria,
          descripcion: p.descripcion,
          precio_original: String(Number(p.precio_original)),
          precio_descuento: String(Number(p.precio_descuento)),
          stock: copiarDe ? String(p.stock > 0 ? p.stock : 1) : String(p.stock),
          fecha_vencimiento: copiarDe ? fechaEnDias(0) : isoAFecha(p.fecha_vencimiento), // la copia vence hoy
          es_donacion: p.es_donacion,
        });
        if (copiarDe && p.imagen) {
          // La copia lleva la misma foto: se baja al celular para volver a subirla
          try {
            const archivo = await File.downloadFileAsync(urlCompleta(p.imagen), Paths.cache, { idempotent: true });
            setFotoNueva({ uri: archivo.uri });
          } catch {
            // si no se pudo bajar, se publica sin foto (o elige otra)
          }
        } else {
          setFotoActual(urlCompleta(p.imagen));
        }
      } catch (e) {
        setErrorGeneral(e);
      } finally {
        setCargando(false);
      }
    })();
  }, [id, copiarDe]);

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
      // El fetch de Expo no acepta { uri, name, type } (el formato viejo de React Native):
      // la foto tiene que ir como un File de expo-file-system, que ya trae nombre y tipo.
      datos.append('imagen', new File(fotoNueva.uri));
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
        {/* Título con ícono, como el mockup */}
        <View style={estilos.encabezado}>
          <Icono nombre="gift-outline" tamano={28} color={colores.titulo} />
          <Text style={[estilos.titulo, { color: colores.titulo }]}>
            {id ? 'Editar Producto' : copiarDe ? 'Publicar de nuevo' : 'Nuevo Producto'}
          </Text>
        </View>

        {!id && !copiarDe ? (
          <PublicarDeNuevo
            productos={anteriores}
            compacto
            alElegir={(p) => navigation.setParams({ copiarDe: p.id })} // carga sus datos con la fecha de hoy
          />
        ) : null}

        {/* Foto: el cuadro gris; al tocarlo se elige cámara o galería */}
        <Pressable
          onPress={() =>
            Alert.alert('Foto del producto', 'Las ofertas con foto se reservan más.', [
              { text: 'Sacar foto', onPress: sacarFoto },
              { text: 'Elegir de la galería', onPress: elegirFoto },
              { text: 'Cancelar', style: 'cancel' },
            ])
          }
          accessibilityRole="button"
          accessibilityLabel={foto ? 'Cambiar la foto' : 'Agregar una foto'}
          style={[estilos.foto, { backgroundColor: colores.panel }]}
        >
          {foto ? (
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} accessibilityLabel="Foto del producto" />
          ) : (
            <Icono nombre="image-outline" tamano={44} color={colores.titulo} />
          )}
        </Pressable>
        {errores.imagen ? <Text style={[estilos.ayuda, { color: colores.error }]}>{textoError(errores.imagen)}</Text> : null}

        <Campo
          placeholder="Nombre del Producto"
          value={valores.titulo}
          onChangeText={cambiar('titulo')}
          error={errores.titulo}
          maxLength={100}
        />

        <Campo
          placeholder="Añadir descripción"
          value={valores.descripcion}
          onChangeText={cambiar('descripcion')}
          error={errores.descripcion}
          multiline
          textAlignVertical="top"
          estiloInput={{ minHeight: 64 }}
        />

        <View style={estilos.fila}>
          <Campo
            placeholder="Insertar precio original"
            keyboardType="decimal-pad"
            value={valores.precio_original}
            onChangeText={cambiar('precio_original')}
            error={errores.precio_original}
            estilo={{ flex: 1 }}
          />
          <Campo
            placeholder="Insertar precio con %"
            keyboardType="decimal-pad"
            value={valores.precio_descuento}
            onChangeText={cambiar('precio_descuento')}
            error={errores.precio_descuento}
            estilo={{ flex: 1 }}
          />
        </View>
        {porcentaje !== null ? (
          <Text style={[estilos.ayuda, { color: colores.verdeHover, marginTop: -espacio(1.5) }]}>
            Descuento del {porcentaje}%
          </Text>
        ) : null}

        {/* Cantidad y fecha, cada una con su leyenda abajo (como el mockup) */}
        <View style={estilos.fila}>
          <View style={{ flex: 1, gap: 4 }}>
            <Campo
              placeholder="0"
              keyboardType="number-pad"
              value={valores.stock}
              onChangeText={cambiar('stock')}
              error={errores.stock}
              estilo={{ width: 96 }}
            />
            <Text style={[estilos.leyenda, { color: colores.titulo }]}>Insertar cantidad disponible</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Campo
              placeholder="00/00/0000"
              keyboardType="numbers-and-punctuation"
              value={valores.fecha_vencimiento}
              onChangeText={cambiar('fecha_vencimiento')}
              error={errores.fecha_vencimiento}
              maxLength={10}
            />
            <Text style={[estilos.leyenda, { color: colores.titulo }]}>Insertar fecha de vencimiento</Text>
          </View>
        </View>
        <View style={[estilos.fila, { marginTop: -espacio(1) }]}>
          {[
            [0, 'Hoy'],
            [1, 'Mañana'],
            [2, 'Pasado'],
          ].map(([dias, texto]) => {
            const elegida = valores.fecha_vencimiento === fechaEnDias(dias);
            return (
              <Pressable
                key={dias}
                onPress={() => cambiar('fecha_vencimiento')(fechaEnDias(dias))}
                accessibilityRole="button"
                accessibilityLabel={`Vence ${texto}`}
                accessibilityState={{ selected: elegida }}
                style={[
                  estilos.chip,
                  { borderColor: elegida ? colores.verdeProfundo : colores.borde },
                  elegida && { backgroundColor: colores.verdeProfundo },
                ]}
              >
                <Text style={[estilos.textoChip, { color: elegida ? colores.sobreVerdeProfundo : colores.texto }]}>{texto}</Text>
              </Pressable>
            );
          })}
        </View>

        <Opciones
          etiqueta="Categoría"
          opciones={CATEGORIAS}
          valor={valores.categoria}
          alElegir={cambiar('categoria')}
          error={errores.categoria}
        />

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
              { borderColor: colores.verdeProfundo },
              valores.es_donacion && { backgroundColor: colores.verdeProfundo },
            ]}
          >
            {valores.es_donacion ? <Icono nombre="checkmark" tamano={16} color={colores.sobreVerdeProfundo} /> : null}
          </View>
          <Text style={[estilos.textoCasilla, { color: colores.texto }]}>También para donar a organizaciones</Text>
        </Pressable>

        <MensajeError mensaje={errorGeneral} />

        <Boton
          texto={id ? 'Guardar' : 'Publicar'}
          onPress={publicar}
          cargando={enviando}
          estilo={{ alignSelf: 'center', paddingHorizontal: espacio(4), marginTop: espacio(2) }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2.5),
    paddingBottom: espacio(5),
    gap: espacio(2.5),
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  titulo: {
    fontFamily: fuentes.normal,
    fontSize: 26,
  },
  foto: {
    width: 116,
    height: 116,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leyenda: {
    fontFamily: fuentes.normal,
    fontSize: 11,
    marginLeft: 4,
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
    borderWidth: 1,
    borderRadius: 999,
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
