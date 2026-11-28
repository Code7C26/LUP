// Foto de un producto del merch de Puntos Lüp (Mis puntos y Perfil).
// 1) la foto del servidor, 2) si no viene o no carga, la foto local según el nombre (como FOTOS_MERCH en
// scr/bd_lup/puntos/models.py), 3) si tampoco hay, el ícono.
// Uso:  <FotoMerch key={producto.id} producto={producto} proporcion={PROPORCION_MERCH} estilo={...} />
// (con key, así al cambiar de producto se vuelve a probar la foto del servidor)
// Con "proporcion" (ancho / alto del recuadro): si la foto tiene la misma, se usa "cover" (no se corta nada);
// si es otra, "contain" sobre el fondo menta, para que tampoco se corte.
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { urlCompleta } from '../api/cliente';
import { useTema } from '../tema';
import Icono from './Icono';

// El merch trae un ícono de Bootstrap Icons (el de la web): acá se usa el parecido de Ionicons
const ICONOS_MERCH = {
  'bi-pencil': 'pencil-outline',
  'bi-magnet': 'magnet-outline',
  'bi-bag': 'bag-handle-outline',
  'bi-box-seam': 'cube-outline',
  'bi-cup-straw': 'water-outline',
  'bi-gift': 'gift-outline',
};

const FOTOS_LOCALES = [
  [['lápiz', 'lapiz'], require('../../assets/merch/lapiz-semillas.jpg')],
  [['imán', 'iman'], require('../../assets/merch/iman.jpg')],
  [['bolsa', 'tote'], require('../../assets/merch/bolsa.jpg')],
  [['tupper', 'táper', 'taper'], require('../../assets/merch/tupper.jpg')],
  [['botella'], require('../../assets/merch/botella.jpg')],
];

// Las fotos del merch son de 800 × 1000
export const PROPORCION_MERCH = 4 / 5;

function fotoLocal(nombre) {
  const texto = (nombre || '').toLowerCase();
  const encontrada = FOTOS_LOCALES.find(([palabras]) => palabras.some((p) => texto.includes(p)));
  return encontrada ? encontrada[1] : null;
}

export default function FotoMerch({ producto, tamanoIcono = 26, proporcion, estilo }) {
  const { colores } = useTema();
  const [fallo, setFallo] = useState(false);
  // Arranca en "contain" (nunca corta) y pasa a "cover" si la foto tiene la proporción del recuadro
  const [ajuste, setAjuste] = useState(proporcion ? 'contain' : 'cover');
  const fuente = producto.imagen && !fallo ? { uri: urlCompleta(producto.imagen) } : fotoLocal(producto.nombre);

  function alCargar(evento) {
    if (!proporcion) return;
    const { width, height } = evento.nativeEvent?.source || {};
    if (width && height) setAjuste(Math.abs(width / height - proporcion) < 0.02 ? 'cover' : 'contain');
  }

  return (
    <View
      style={[estilos.caja, { backgroundColor: colores.menta }, estilo]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {fuente ? (
        <Image
          source={fuente}
          style={StyleSheet.absoluteFill}
          resizeMode={ajuste}
          onLoad={alCargar}
          onError={() => setFallo(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Icono nombre={ICONOS_MERCH[producto.icono] || 'gift-outline'} tamano={tamanoIcono} color={colores.verdeHover} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
