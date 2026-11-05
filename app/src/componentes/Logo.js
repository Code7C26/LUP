// Logo de Lüp. En modo oscuro usa la versión con letras claras (assets/logo-claro.png),
// así no queda un recuadro ni letras verde oscuro sobre fondo oscuro.
// Uso:  <Logo ancho={120} />
import { Image } from 'react-native';

import { useTema } from '../tema';

const PROPORCION = 490 / 600; // alto / ancho de logo.png
// En logo.png la hoja sobresale a la derecha, así que "lüp" queda corrido a la izquierda.
// Se corre la imagen un 4,5 % a la derecha para que las LETRAS queden centradas.
const CORRER = 0.045;

export default function Logo({ ancho = 120, estilo }) {
  const { esOscuro } = useTema();
  return (
    <Image
      source={esOscuro ? require('../../assets/logo-claro.png') : require('../../assets/logo.png')}
      style={[
        { width: ancho, height: ancho * PROPORCION, alignSelf: 'center', transform: [{ translateX: ancho * CORRER }] },
        estilo,
      ]}
      resizeMode="contain"
      accessibilityLabel="Lüp"
    />
  );
}
