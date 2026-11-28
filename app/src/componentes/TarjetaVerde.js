// Tarjeta verde de la marca con una hoja decorativa en la esquina (Perfil, Editar mis datos).
// Uso:
//   <TarjetaVerde titulo="Ana Pérez" estiloTitulo={...}>…</TarjetaVerde>
//   <TarjetaVerde titulo="Editar mis datos" abajo="Mantené tu perfil al día" />
// Usa "marca" (#073425 en los dos modos): verdeProfundo en oscuro es verde claro y el texto crema no se leería.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fuentes, useTema } from '../tema';
import Icono from './Icono';

// Una sola hoja quieta, cortada en la esquina de abajo a la derecha (también la usa CabeceraUsuario)
export function HojaEsquina({ tamano = 52 }) {
  return (
    <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icono nombre="leaf" tamano={tamano} color="#4E7A30" estilo={estilos.hoja} />
    </View>
  );
}

export default function TarjetaVerde({
  arriba,
  titulo,
  abajo,
  children,
  alTocar,
  accessibilityLabel,
  accessibilityHint,
  estilo,
  estiloTitulo,
}) {
  const { colores } = useTema();

  const contenido = (
    <>
      <HojaEsquina />
      {arriba ? <Text style={[estilos.chico, { color: colores.sobreMarcaSuave }]}>{arriba}</Text> : null}
      <Text style={[estilos.titulo, { color: colores.crema }, estiloTitulo]} accessibilityRole={alTocar ? undefined : 'header'}>
        {titulo}
      </Text>
      {abajo ? <Text style={[estilos.chico, estilos.abajo, { color: colores.sobreMarcaSuave }]}>{abajo}</Text> : null}
      {children}
    </>
  );

  if (!alTocar) {
    return <View style={[estilos.tarjeta, { backgroundColor: colores.marca }, estilo]}>{contenido}</View>;
  }
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: colores.marca },
        estilo,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {contenido}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    padding: 16,
    borderRadius: 22,
    overflow: 'hidden',
  },
  hoja: {
    position: 'absolute',
    right: -10,
    bottom: -12,
    opacity: 0.45,
    transform: [{ rotate: '-18deg' }],
  },
  chico: {
    fontFamily: fuentes.media,
    fontSize: 13,
  },
  abajo: {
    marginTop: 2,
  },
  titulo: {
    fontFamily: fuentes.marca,
    fontSize: 22,
    lineHeight: 29,
    marginTop: 2,
    paddingRight: 24,
  },
});
