// PASO 47 · Comercio: confirmar retiro.
// Arriba, la cabecera verde ("Retiros", "Escaneá el QR del cliente para confirmar" y los pendientes de hoy).
// Una tarjeta para escanear el QR que el cliente muestra en "Mis reservas" (paso 44), o tipear el código.
// Después, los retiros pendientes (ordenados por horario) y los confirmados en esta vuelta de la pantalla.
// Usa POST /api/retiros/confirmar/ y GET /api/reservas-del-comercio/ (paso 30).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { api, urlCompleta } from '../../api/cliente';
import BarraSuperior from '../../componentes/BarraSuperior';
import Boton from '../../componentes/Boton';
import CabeceraUsuario from '../../componentes/CabeceraUsuario';
import Campo from '../../componentes/Campo';
import Esqueleto from '../../componentes/Esqueleto';
import EstadoVacio from '../../componentes/EstadoVacio';
import Icono from '../../componentes/Icono';
import MensajeError from '../../componentes/MensajeError';
import TituloSeccion from '../../componentes/TituloSeccion';
import { mostrarAviso } from '../../contexto/Aviso';
import { useIdioma } from '../../contexto/Idioma';
import { useSesion } from '../../contexto/Sesion';
import { espacio, fuentes, tamanos, useTema } from '../../tema';
import { textoError, vibrar } from '../../utilidades';

const presionado = { transform: [{ scale: 0.97 }] };

// Ordena por horario de retiro y, a igual horario, por la fecha de la reserva
const porHorario = (a, b) =>
  String(a.horario || '').localeCompare(String(b.horario || '')) || String(a.creada_en).localeCompare(String(b.creada_en));

function FilaPendiente({ reserva }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <View style={estilos.fila}>
      <View style={[estilos.cuadro, { backgroundColor: colores.menta }]}>
        <Icono nombre="bag-handle-outline" tamano={22} color={colores.verdeHover} />
      </View>
      <View style={estilos.datos}>
        <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={2}>
          {reserva.producto}
        </Text>
        <Text style={[estilos.linea, { color: colores.grisVerde }]}>{t('retiros.unidades', { n: reserva.cantidad })}</Text>
        <Text style={[estilos.linea, { color: colores.grisVerde }]} numberOfLines={1}>
          {t('retiros.horarioRetiro', { horario: reserva.horario })}
        </Text>
      </View>
      <View style={[estilos.codigoPastilla, { backgroundColor: colores.menta }]}>
        <Text style={[estilos.codigo, { color: colores.verdeProfundo }]}>{reserva.codigo_retiro}</Text>
      </View>
    </View>
  );
}

export default function ConfirmarRetiro({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const { usuario } = useSesion();
  const [permiso, pedirPermiso] = useCameraPermissions();

  const [escaneando, setEscaneando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [pendientes, setPendientes] = useState([]);
  const [retiradas, setRetiradas] = useState([]); // las confirmadas mientras la pantalla está abierta
  const [cargando, setCargando] = useState(true);
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
      setCargando(false);
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
      setError(t('retiros.escribiCodigo'));
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const r = await api('/retiros/confirmar/', { metodo: 'POST', datos: { codigo: limpio } });
      setCodigo('');
      setRetiradas((lista) => [r.reserva, ...lista]);
      mostrarAviso({ texto: t('retiros.confirmadoAviso') });
      vibrar('exito');
      cargarPendientes();
    } catch (e) {
      setError(textoError(e) || t('retiros.noSePudo'));
    } finally {
      setEnviando(false);
    }
  }

  async function abrirCamara() {
    setError('');
    if (!permiso?.granted) {
      const respuesta = await pedirPermiso();
      if (!respuesta.granted) {
        setError(t('retiros.sinCamara'));
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

  if (cargando) return <Esqueleto tipo="reservas" />;

  const nombre = usuario?.comercio?.nombre || usuario?.nombre || t('misProductos.miComercio');
  const pendientesOrdenados = [...pendientes].sort(porHorario);

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
      <BarraSuperior navigation={navigation} desde="ConfirmarRetiro" estilo={estilos.barra} />

      <CabeceraUsuario
        foto={urlCompleta(usuario?.foto)}
        nombre={nombre}
        arriba={t('retiros.titulo')}
        titulo={t('retiros.subtitulo')}
        resumen={t('retiros.resumenPendientes', { n: pendientes.length })}
        alTocar={() => navigation.navigate('Perfil')}
      />

      {/* La tarjeta para escanear: el QR grande y, debajo, el código a mano */}
      <View style={[estilos.tarjeta, { backgroundColor: colores.menta }]}>
        {escaneando ? (
          <>
            <View style={estilos.camara}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={alEscanear}
              />
            </View>
            <Boton texto={t('retiros.cerrarCamara')} icono="close" variante="texto" onPress={() => setEscaneando(false)} />
          </>
        ) : (
          <Pressable
            onPress={abrirCamara}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityLabel={t('retiros.escanear')}
            style={({ pressed }) => [estilos.escanear, pressed && presionado]}
          >
            <Icono nombre="qr-code-outline" tamano={56} color={colores.verdeProfundo} />
            <Text style={[estilos.escanearTexto, { color: colores.verdeProfundo }]}>{t('retiros.escanear')}</Text>
          </Pressable>
        )}

        <Text style={[estilos.oEscribi, { color: colores.grisVerde }]}>{t('retiros.oEscribi')}</Text>
        <View style={estilos.filaCodigo}>
          <Campo
            placeholder={t('retiros.codigoEjemplo')}
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={() => confirmar(codigo)}
            estilo={{ flex: 1 }}
          />
          <Boton texto={t('retiros.confirmar')} chico onPress={() => confirmar(codigo)} cargando={enviando} />
        </View>
      </View>

      {error ? (
        <View accessibilityRole="alert" style={[estilos.error, { backgroundColor: colores.ambarClaro }]}>
          <Text style={[estilos.textoError, { color: colores.texto }]}>{error}</Text>
        </View>
      ) : null}

      <TituloSeccion texto={t('retiros.pendientesRetiro')} />
      <MensajeError mensaje={errorLista} alReintentar={cargarPendientes} />
      {pendientesOrdenados.map((reserva) => (
        <FilaPendiente key={reserva.id} reserva={reserva} />
      ))}
      {!errorLista && pendientes.length === 0 ? (
        <EstadoVacio icono="bag-check-outline" texto={t('retiros.vacioTitulo')}>
          <Text style={[estilos.oEscribi, { color: colores.gris }]}>{t('retiros.vacioTexto')}</Text>
        </EstadoVacio>
      ) : null}

      {retiradas.length ? (
        <>
          <TituloSeccion texto={t('retiros.retiradosHoy')} />
          {retiradas.map((r) => (
            <View key={r.id} style={estilos.filaRetirada}>
              <Icono nombre="checkmark-circle" tamano={18} color={colores.verde} />
              <Text style={[estilos.linea, { color: colores.grisVerde, flex: 1 }]} numberOfLines={1}>
                {r.cantidad} × {r.producto}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(4),
    gap: espacio(2),
  },
  barra: {
    paddingHorizontal: 0,
    marginBottom: -espacio(1),
  },
  // ---- Tarjeta para escanear ----
  tarjeta: {
    padding: 20,
    gap: espacio(1.5),
    borderRadius: 20,
  },
  escanear: {
    alignItems: 'center',
    gap: espacio(1),
    paddingVertical: espacio(1.5),
  },
  escanearTexto: {
    fontFamily: fuentes.semi,
    fontSize: 16,
  },
  camara: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
  },
  oEscribi: {
    fontFamily: fuentes.normal,
    fontSize: 12,
    textAlign: 'center',
  },
  filaCodigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  error: {
    borderRadius: 14,
    padding: espacio(1.5),
  },
  textoError: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  // ---- Pendientes ----
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingVertical: espacio(1),
  },
  cuadro: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nombre: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  linea: {
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  codigoPastilla: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  codigo: {
    fontFamily: fuentes.marca,
    fontSize: 13,
    letterSpacing: 2,
  },
  // ---- Retiradas hoy ----
  filaRetirada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
    paddingVertical: 4,
  },
});
