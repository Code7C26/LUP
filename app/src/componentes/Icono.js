// Íconos de Lüp (Ionicons, vienen con Expo).
// Lista completa de nombres: https://icons.expo.fyi  (filtrar por "Ionicons")
// Uso:
//   <Icono nombre="location-outline" />
//   <Icono nombre="heart" tamano={18} color={colores.verde} />
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '../tema';

export default function Icono({ nombre, tamano = 22, color, estilo }) {
  const { colores } = useTema();
  return <Ionicons name={nombre} size={tamano} color={color || colores.titulo} style={estilo} />;
}
