// Logo de Lüp. En modo oscuro usa la versión con letras claras (assets/logo-claro.png),
// así no queda un recuadro ni letras verde oscuro sobre fondo oscuro.
// Uso:  <Logo ancho={120} />
import { Image } from 'react-native';

import { useTema } from '../tema';

const PROPORCION = 490 / 600; // alto / ancho de logo.png

export default function Logo({ ancho = 120, estilo }) {
  const { esOscuro } = useTema();
  return (
    <Image
      source={esOscuro ? require('../../assets/logo-claro.png') : require('../../assets/logo.png')}
      style={[{ width: ancho, height: ancho * PROPORCION, alignSelf: 'center' }, estilo]}
      resizeMode="contain"
      accessibilityLabel="Lüp"
    />
  );
}
