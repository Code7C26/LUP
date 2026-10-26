// PASO 47 · Comercio: confirmar retiro.
// Escanea el QR que el cliente muestra en "Mis reservas" (paso 44), o deja tipear el código.
// Abajo, los retiros que todavía están pendientes.
// Usa POST /api/retiros/confirmar/ y GET /api/reservas-del-comercio/ (paso 30).
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { api } from '../../api/cliente';
import Boton from '../../componentes/Boton';
import Campo from '../../componentes/Campo';
import MensajeError from '../../componentes/MensajeError';
import { espacio, fuentes, radio, tamanos, useTema } from '../../tema';
import { formatoPrecio, textoError } from '../../utilidades';

export default function ConfirmarRetiro({ navigation }) {
  const { colores } = useTema();
  const [permiso, pedirPermiso] = useCameraPermissions();

  const [escaneando, setEscaneando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok: true/false, texto }
  const [pendientes, setPendientes] = useState([]);
  const [errorLista, setErrorLista] = useState('');
  const [actualizando, setActualizando] = useState(false);
  // La cámara lee el mismo QR muchas veces por segundo: esto evita mandarlo dos veces
  const leyendo = useRef(false);

  const cargarPendientes = useCallback(async () => {
    setErrorLista('');
    try {
      setPendientes(await api('/reservas-del-comercio/'));
    } catch (e) {
      setErrorLista(e);
    } finally {
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  useEffect(() => navigation?.addListener?.('focus', cargarPendientes), [navigation, cargarPendientes]);

  async function confirmar(texto) {
    const limpio = texto.trim().toUpperCase();
    if (!limpio) {
      setResultado({ ok: false, texto: 'Escribí el código que te muestra el cliente.' });
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const r = await api('/retiros/confirmar/', { metodo: 'POST', datos: { codigo: limpio } });
      setResultado({ ok: true, texto: r.mensaje });
      setCodigo('');
      cargarPendientes();
    } catch (e) {
      setResultado({ ok: false, texto: textoError(e) || 'No se pudo confirmar el retiro.' });
    } finally {
      setEnviando(false);
    }
  }

  async function abrirCamara() {
    setResultado(null);
    if (!permiso?.granted) {
      const respuesta = await pedirPermiso();
      if (!respuesta.granted) {
        setResultado({ ok: false, texto: 'Sin permiso para la cámara. Podés escribir el código a mano.' });
        return;
      }
    }
    leyendo.current = false;
    setEscaneando(true);
  }

  function alEscanear({ data }) {
    if (leyendo.current) return;
    leyendo.current = true;
    setEscaneando(false);
    confirmar(data);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={actualizando}
          tintColor={colores.verde}
          onRefresh={() => {
            setActualizando(true);
            cargarPendientes();
          }}
        />
      }
    >
      <Text style={[estilos.titulo, { color: colores.titulo }]}>Confirmar retiro</Text>
      <Text style={[estilos.texto, { color: colores.gris }]}>
        Escaneá el QR que te muestra el cliente en su celular, o escribí el código.
      </Text>

      {escaneando ? (
        <View style={{ gap: espacio(1) }}>
          <View style={estilos.camara}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={alEscanear}
            />
          </View>
          <Boton texto="Cerrar cámara" variante="secundario" onPress={() => setEscaneando(false)} />
        </View>
      ) : (
        <Boton texto="📷 Escanear QR" onPress={abrirCamara} cargando={enviando} />
      )}

      <View style={estilos.fila}>
        <Campo
          placeholder="Código, ej: A1B2C3"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={() => confirmar(codigo)}
          estilo={{ flex: 1 }}
        />
        <Boton texto="Confirmar" variante="secundario" onPress={() => confirmar(codigo)} deshabilitado={enviando} />
      </View>

      {resultado ? (
        <View
          accessibilityRole="alert"
          style={[
            estilos.resultado,
            resultado.ok
              ? { backgroundColor: colores.menta, borderColor: colores.verde }
              : { backgroundColor: colores.ambarClaro, borderColor: colores.ambar },
          ]}
        >
          <Text style={[estilos.textoResultado, { color: colores.texto }]}>
            {resultado.ok ? '✅ ' : '⚠️ '}
            {resultado.texto}
          </Text>
        </View>
      ) : null}

      <Text style={[estilos.subtitulo, { color: colores.titulo }]}>Retiros pendientes</Text>
      <MensajeError mensaje={errorLista} alReintentar={cargarPendientes} />
      {!errorLista && pendientes.length === 0 ? (
        <Text style={[estilos.texto, { color: colores.gris }]}>No hay reservas esperando ser retiradas.</Text>
      ) : null}
      {pendientes.map((reserva) => (
        <View
          key={reserva.id}
          style={[estilos.reserva, { backgroundColor: colores.superficie, borderColor: colores.borde }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[estilos.producto, { color: colores.titulo }]} numberOfLines={1}>
              {reserva.cantidad} × {reserva.producto}
            </Text>
            <Text style={[estilos.detalle, { color: colores.gris }]}>{formatoPrecio(reserva.precio_total)}</Text>
          </View>
          <Text style={[estilos.codigo, { color: colores.verdeHover }]}>{reserva.codigo_retiro}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    gap: espacio(1.5),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
  },
  subtitulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    marginTop: espacio(1.5),
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  camara: {
    height: 300,
    borderRadius: radio,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  resultado: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(2),
  },
  textoResultado: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  reserva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    borderWidth: 1,
    borderRadius: radio,
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1.5),
  },
  producto: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  codigo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    letterSpacing: 2,
  },
});
