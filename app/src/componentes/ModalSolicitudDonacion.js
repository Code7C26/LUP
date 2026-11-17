// Cuadro para que una organización pida un producto en donación (paso 48).
// Manda POST /api/productos/<id>/solicitar-donacion/ con el mensaje para el comercio.
// Uso:
//   <ModalSolicitudDonacion
//     producto={productoElegido}          // null = cerrado
//     alCerrar={() => setProductoElegido(null)}
//     alEnviar={(solicitud) => ...}       // se llama cuando Django la guardó
//   />
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/cliente';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';
import Boton from './Boton';
import Campo from './Campo';
import MensajeError from './MensajeError';

export default function ModalSolicitudDonacion({ producto, alCerrar, alEnviar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Cada vez que se abre para otro producto, empieza vacío
  useEffect(() => {
    setMensaje('');
    setError('');
  }, [producto?.id]);

  async function enviar() {
    if (!mensaje.trim()) {
      setError(t('donacionModal.escribiMensaje'));
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const solicitud = await api(`/productos/${producto.id}/solicitar-donacion/`, {
        metodo: 'POST',
        datos: { mensaje: mensaje.trim() },
      });
      alEnviar(solicitud);
    } catch (e) {
      // Django responde { "error": "..." } o { "mensaje": ["..."] }
      setError(textoError(e?.mensaje) || e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={Boolean(producto)} transparent animationType="fade" onRequestClose={alCerrar}>
      <KeyboardAvoidingView style={estilos.fondo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Tocar afuera del cuadro lo cierra */}
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityLabel={t('comun.cerrar')} />
        <View style={[estilos.cuadro, { backgroundColor: colores.superficie }]}>
          <Text style={[estilos.titulo, { color: colores.titulo }]}>{t('donacionModal.titulo')}</Text>
          {producto ? (
            <Text style={[estilos.detalle, { color: colores.gris }]}>
              {producto.titulo} · {producto.comercio}
            </Text>
          ) : null}

          <Campo
            etiqueta={t('donacionModal.mensaje')}
            placeholder={t('donacionModal.placeholder')}
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            textAlignVertical="top"
            autoFocus
            estiloInput={{ minHeight: 110, paddingTop: espacio(1.5) }}
          />

          <MensajeError mensaje={error} />

          <Boton texto={t('donacionModal.enviar')} onPress={enviar} cargando={enviando} />
          <Boton texto={t('comun.cancelar')} variante="texto" onPress={alCerrar} deshabilitado={enviando} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'center',
    padding: espacio(2),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cuadro: {
    borderRadius: radio,
    padding: espacio(2.5),
    gap: espacio(1.5),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
