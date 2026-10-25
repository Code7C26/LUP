// Recuadro para mostrar un error (por ejemplo, si no hay conexión con la API).
// Uso:
//   <MensajeError mensaje="No pudimos conectar con Lüp." />
//   <MensajeError mensaje={error} alReintentar={cargarDatos} />
import { StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';
import Boton from './Boton';

export default function MensajeError({ mensaje, alReintentar }) {
  const { colores } = useTema();
  const texto = textoError(mensaje);
  if (!texto) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[estilos.caja, { backgroundColor: colores.ambarClaro, borderColor: colores.ambar }]}
    >
      <Text style={[estilos.texto, { color: colores.texto }]}>{texto}</Text>
      {alReintentar ? <Boton texto="Reintentar" variante="secundario" onPress={alReintentar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio(2),
    gap: espacio(1.5),
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
});
