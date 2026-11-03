// Lo que se muestra cuando una lista está vacía: un ícono, una frase corta y (opcional) un botón.
// Uso:  <Vacio icono="ticket-outline" texto="Todavía no reservaste nada" boton="Buscar ofertas" alTocar={...} />
import { StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, tamanos, useTema } from '../tema';
import Boton from './Boton';
import Icono from './Icono';

export default function Vacio({ icono, texto, boton, alTocar }) {
  const { colores } = useTema();
  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.circulo, { backgroundColor: colores.menta }]}>
        <Icono nombre={icono} tamano={30} color={colores.verdeHover} />
      </View>
      <Text style={[estilos.texto, { color: colores.gris }]}>{texto}</Text>
      {boton ? <Boton texto={boton} chico onPress={alTocar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    gap: espacio(1.5),
    marginTop: espacio(6),
    paddingHorizontal: espacio(3),
  },
  circulo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
  },
});
