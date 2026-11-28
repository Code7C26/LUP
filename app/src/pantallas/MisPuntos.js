// Puntos Lüp del consumidor (lo mismo que la página "Mis puntos" de la web, con las mismas reglas):
//   arriba una tarjeta verde con el saldo y "1 punto cada $2.000 en compras"
//   "Canjeá tus puntos": el merch, cada uno con su foto o ícono, los puntos y "Canjear" (pide confirmación).
//                        Si no alcanzan: botón apagado con "Te faltan 105 pts" y una barrita de progreso.
//   "Mis canjes": el código grande para mostrar al retirar, el estado y "Cancelar" si todavía está para retirar
//   "Historial de puntos": +3 Compra en Panadería El Sol / −225 Canje Bolsa
// Usa GET /api/puntos/, POST /api/puntos/canjear/<id>/ y POST /api/puntos/canjes/<id>/cancelar/
// (scr/bd_lup/puntos/api.py). Los puntos se suman solos cuando el comercio confirma el retiro.
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Cargando from '../componentes/Cargando';
import Encabezado from '../componentes/Encabezado';
import FotoMerch, { PROPORCION_MERCH } from '../componentes/FotoMerch';
import MensajeError from '../componentes/MensajeError';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { formatoFecha, formatoPrecio, PESOS_POR_PUNTO, textoError, vibrar } from '../utilidades';

// Color del puntito del estado de un canje
const colorCanje = (colores, estado) => ({ pendiente: colores.ambar, entregado: colores.verde }[estado] || colores.gris);

function Titulo({ children }) {
  const { colores } = useTema();
  return (
    <Text style={[estilos.titulo, { color: colores.verdeProfundo }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

function TarjetaMerch({ producto, saldo, canjeando, alCanjear }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const faltan = Math.max(0, producto.puntos - saldo);
  const progreso = producto.puntos ? Math.min(1, saldo / producto.puntos) : 1;

  // En fila: la foto 4:5 a la izquierda (como las fotos del merch, 800×1000: no se corta) y los datos a la derecha
  return (
    <View style={[estilos.tarjeta, estilos.fila]}>
      <FotoMerch producto={producto} tamanoIcono={36} proporcion={PROPORCION_MERCH} estilo={estilos.fotoMerch} />

      <View style={[estilos.datos, estilos.columnaMerch]}>
        <View style={{ gap: 2 }}>
          <Text style={[estilos.nombre, { color: colores.texto }]}>{producto.nombre}</Text>
          {producto.descripcion ? (
            <Text style={[estilos.detalle, { color: colores.gris }]}>{producto.descripcion}</Text>
          ) : null}
        </View>

        <Text style={[estilos.pts, { color: colores.verdeHover }]}>{t('puntos.pts', { n: producto.puntos })}</Text>

        {!producto.puedo_canjear ? (
          <View
            style={[estilos.barraProgreso, { backgroundColor: colores.campo }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: producto.puntos, now: Math.min(saldo, producto.puntos) }}
          >
            <View style={[estilos.rellenoProgreso, { backgroundColor: colores.verde, width: `${Math.round(progreso * 100)}%` }]} />
          </View>
        ) : null}

        <Boton
          texto={producto.puedo_canjear ? t('puntos.canjear') : t('puntos.teFaltan', { n: faltan })}
          variante={producto.puedo_canjear ? 'principal' : 'secundario'}
          chico
          deshabilitado={!producto.puedo_canjear}
          cargando={canjeando}
          onPress={alCanjear}
          estilo={estilos.boton}
        />
      </View>
    </View>
  );
}

function TarjetaCanje({ canje, cancelando, alCancelar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const pendiente = canje.estado === 'pendiente';

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.datos}>
        <Text style={[estilos.nombre, { color: colores.texto }]}>{canje.producto}</Text>
        {/* El estado: un puntito de color y la palabra, en la línea gris */}
        <View style={estilos.filaLinea}>
          <View style={[estilos.puntito, { backgroundColor: colorCanje(colores, canje.estado) }]} />
          <Text style={[estilos.detalle, { color: colores.grisVerde, flex: 1 }]}>
            {[t(`puntos.estados.${canje.estado}`), t('puntos.pts', { n: canje.puntos }), formatoFecha(canje.creado_en)].join(' · ')}
          </Text>
        </View>
      </View>

      {pendiente ? (
        <>
          <View style={[estilos.cajaCodigo, { backgroundColor: colores.fondo, borderColor: colores.borde }]}>
            <Text style={[estilos.detalle, { color: colores.gris }]}>{t('puntos.mostraCodigo')}</Text>
            <Text
              style={[estilos.codigo, { color: colores.titulo }]}
              selectable
              accessibilityLabel={t('puntos.codigoAccesible', { codigo: canje.codigo.split('').join(' ') })}
            >
              {canje.codigo}
            </Text>
          </View>
          <Boton
            texto={t('puntos.cancelar')}
            variante="texto"
            chico
            cargando={cancelando}
            onPress={alCancelar}
            estilo={estilos.botonCancelar}
          />
        </>
      ) : null}
    </View>
  );
}

function FilaMovimiento({ movimiento, ultimo }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const suma = movimiento.puntos > 0;
  const titulo = {
    compra: movimiento.comercio ? t('puntos.movCompra', { comercio: movimiento.comercio }) : t('puntos.movCompraSola'),
    canje: t('puntos.movCanje', { detalle: movimiento.detalle }),
    devolucion: t('puntos.movDevolucion', { detalle: movimiento.detalle }),
    ajuste: t('puntos.movAjuste'),
  }[movimiento.motivo] || movimiento.detalle;
  // En las compras se muestra qué fue ("2 × Medialunas"); en el resto ya está en el título
  const detalle = [movimiento.motivo === 'compra' ? movimiento.detalle : '', formatoFecha(movimiento.creado_en)]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View style={[estilos.movimiento, !ultimo && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colores.borde }]}>
      <View style={estilos.datos}>
        <Text style={[estilos.textoMovimiento, { color: colores.texto }]}>{titulo}</Text>
        <Text style={[estilos.detalle, { color: colores.gris }]}>{detalle}</Text>
      </View>
      <Text style={[estilos.puntosMovimiento, { color: suma ? colores.verdeHover : colores.gris }]}>
        {suma ? `+${movimiento.puntos}` : `−${Math.abs(movimiento.puntos)}`}
      </Text>
    </View>
  );
}

export default function MisPuntos({ navigation }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(null); // 'merch-<id>' o 'canje-<id>' mientras se manda

  const cargar = useCallback(async () => {
    setError('');
    try {
      setDatos(await api('/puntos/'));
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

  function canjear(producto) {
    Alert.alert(
      t('puntos.canjearPregunta', { nombre: producto.nombre }),
      t('puntos.canjearTexto', { n: producto.puntos }),
      [
        { text: t('puntos.no'), style: 'cancel' },
        {
          text: t('puntos.siCanjear'),
          onPress: async () => {
            setOcupado(`merch-${producto.id}`);
            try {
              const r = await api(`/puntos/canjear/${producto.id}/`, { metodo: 'POST' });
              vibrar('exito');
              Alert.alert(t('puntos.listo'), r.mensaje);
              await cargar();
            } catch (e) {
              Alert.alert(t('puntos.noSeCanjeo'), textoError(e) || t('puntos.probaDeNuevo'));
              cargar(); // el saldo pudo cambiar
            } finally {
              setOcupado(null);
            }
          },
        },
      ]
    );
  }

  function cancelar(canje) {
    Alert.alert(t('puntos.cancelarPregunta'), t('puntos.cancelarTexto', { n: canje.puntos }), [
      { text: t('puntos.no'), style: 'cancel' },
      {
        text: t('puntos.siCancelar'),
        style: 'destructive',
        onPress: async () => {
          setOcupado(`canje-${canje.id}`);
          try {
            const r = await api(`/puntos/canjes/${canje.id}/cancelar/`, { metodo: 'POST' });
            Alert.alert(t('puntos.canjeCancelado'), r.mensaje);
            await cargar();
          } catch (e) {
            Alert.alert(t('puntos.noSeCancelo'), textoError(e) || t('puntos.probaDeNuevo'));
            cargar();
          } finally {
            setOcupado(null);
          }
        },
      },
    ]);
  }

  if (cargando) return <Cargando texto={t('puntos.cargando')} />;

  const saldo = datos?.saldo ?? 0;
  const merch = datos?.merch || [];
  const canjes = datos?.canjes || [];
  const movimientos = datos?.movimientos || [];

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
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
    >
      <Encabezado titulo={t('puntos.titulo')} />
      <MensajeError mensaje={error} alReintentar={cargar} />

      {datos ? (
        <>
          {/* El saldo */}
          <View
            style={[estilos.saldo, { backgroundColor: colores.verdeProfundo }]}
            accessible
            accessibilityLabel={`${t('puntos.tuSaldo')}: ${t('puntos.saldoAccesible', { n: saldo })}. ${t('puntos.regla', {
              monto: formatoPrecio(datos.pesos_por_punto || PESOS_POR_PUNTO),
            })}`}
          >
            <Text style={[estilos.etiquetaSaldo, { color: colores.sobreVerdeProfundo }]}>{t('puntos.tuSaldo')}</Text>
            <Text style={[estilos.numeroSaldo, { color: colores.sobreVerdeProfundo }]} numberOfLines={1} adjustsFontSizeToFit>
              {saldo}{' '}
              <Text style={estilos.unidadSaldo}>{t('puntos.unidad', { n: saldo })}</Text>
            </Text>
            <Text style={[estilos.reglaSaldo, { color: colores.sobreVerdeProfundo }]}>
              {t('puntos.regla', { monto: formatoPrecio(datos.pesos_por_punto || PESOS_POR_PUNTO) })}
            </Text>
          </View>

          {/* El merch */}
          <View style={estilos.seccion}>
            <Titulo>{t('puntos.canjeaTusPuntos')}</Titulo>
            <Text style={[estilos.detalle, { color: colores.gris }]}>{t('puntos.despuesDeCanjear')}</Text>
            {merch.map((p) => (
              <TarjetaMerch
                key={p.id}
                producto={p}
                saldo={saldo}
                canjeando={ocupado === `merch-${p.id}`}
                alCanjear={() => canjear(p)}
              />
            ))}
          </View>

          {/* Mis canjes */}
          <View style={estilos.seccion}>
            <Titulo>{t('puntos.misCanjes')}</Titulo>
            {canjes.length ? (
              canjes.map((c) => (
                <TarjetaCanje key={c.id} canje={c} cancelando={ocupado === `canje-${c.id}`} alCancelar={() => cancelar(c)} />
              ))
            ) : (
              <Text style={[estilos.detalle, { color: colores.gris }]}>{t('puntos.sinCanjes')}</Text>
            )}
          </View>

          {/* Historial */}
          <View style={estilos.seccion}>
            <Titulo>{t('puntos.historial')}</Titulo>
            {movimientos.length ? (
              <View>
                {movimientos.map((m, i) => (
                  <FilaMovimiento key={`${m.creado_en}-${i}`} movimiento={m} ultimo={i === movimientos.length - 1} />
                ))}
              </View>
            ) : (
              <Text style={[estilos.detalle, { color: colores.gris }]}>{t('puntos.sinMovimientos')}</Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(2),
    paddingBottom: espacio(5),
    gap: espacio(2.5),
  },
  saldo: {
    borderRadius: radio + 4,
    padding: espacio(2.5),
    gap: espacio(0.5),
  },
  etiquetaSaldo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  numeroSaldo: {
    fontFamily: fuentes.marca,
    fontSize: 44,
  },
  unidadSaldo: {
    fontFamily: fuentes.botonMedio,
    fontSize: tamanos.mediano,
  },
  reglaSaldo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
    opacity: 0.9,
  },
  seccion: {
    gap: espacio(1.5),
  },
  // Igual que los títulos de sección de Inicio (TituloSeccion)
  titulo: {
    fontFamily: fuentes.semi,
    fontSize: 15,
    marginTop: espacio(1),
  },
  // Sin caja: el merch y los canjes, separados por el espacio de la sección
  tarjeta: {
    gap: espacio(1.5),
    paddingVertical: espacio(0.5),
  },
  filaLinea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  puntito: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio(1.5),
  },
  datos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  // 110 × 138: la misma proporción 4:5 que las fotos
  fotoMerch: {
    width: 110,
    aspectRatio: PROPORCION_MERCH,
    borderRadius: 14,
  },
  columnaMerch: {
    alignSelf: 'stretch',
    gap: espacio(1),
  },
  nombre: {
    fontFamily: fuentes.semi,
    fontSize: 14,
  },
  detalle: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  barraProgreso: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rellenoProgreso: {
    height: '100%',
    borderRadius: 3,
  },
  pts: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  // Ocupa el ancho de la columna (en celulares angostos el texto se achica un poco en vez de cortarse)
  boton: {
    minHeight: 36,
    height: 36,
    alignSelf: 'stretch',
    paddingHorizontal: espacio(1),
    marginTop: 'auto',
  },
  cajaCodigo: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: espacio(1.5),
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codigo: {
    fontFamily: fuentes.marca,
    fontSize: 30,
    letterSpacing: 4,
  },
  botonCancelar: {
    alignSelf: 'center',
    minHeight: 34,
  },
  movimiento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingVertical: espacio(1.25),
  },
  textoMovimiento: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
  },
  puntosMovimiento: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
    fontVariant: ['tabular-nums'],
  },
});
