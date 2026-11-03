// Recuadro para mostrar un error (por ejemplo, si no hay conexión con la API).
// Uso:
//   <MensajeError mensaje="No pudimos conectar con Lüp." />
//   <MensajeError mensaje={error} alReintentar={cargarDatos} />
import { StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';
import Boton from './Boton';
import Icono from './Icono';

export default function MensajeError({ mensaje, alReintentar }) {
  const { colores } = useTema();
  const texto = textoError(mensaje);
  if (!texto) return null;

  return (
    <View accessibilityRole="alert" style={[estilos.caja, { backgroundColor: colores.ambarClaro }]}>
      <Icono nombre="alert-circle" tamano={22} color={colores.ambar} />
      <Text style={[estilos.texto, { color: colores.texto }]}>{texto}</Text>
      {alReintentar ? <Boton icono="refresh" etiqueta="Reintentar" texto="Reintentar" variante="texto" chico onPress={alReintentar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radio,
    paddingVertical: espacio(1.25),
    paddingLeft: espacio(1.5),
    paddingRight: espacio(0.5),
    gap: espacio(1),
  },
  texto: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
