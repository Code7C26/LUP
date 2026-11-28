// Cabecera de las pantallas principales de los 3 usuarios (Inicio, Mis productos, Donaciones):
// una tarjeta verde compacta con el avatar chico, dos líneas ("Hola," y el nombre o una frase) y una sola hoja.
// Abajo, opcional: un resumen en texto suave con una pastilla crema a la derecha, y/o lo que venga como children
// (en Inicio, el buscador).
// Uso:
//   <CabeceraUsuario foto={url} nombre="Panadería Sol" arriba="Hola," titulo="Panadería Sol"
//     resumen="3 disponibles · 4 vendidos" accion={{ texto: '+ Publicar', alTocar }} alTocar={abrirPerfil} />
// Usa "marca" (#073425 en los dos modos): verdeProfundo en oscuro es verde claro y el texto crema no se leería.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, useTema } from '../tema';
import { HojaEsquina } from './TarjetaVerde';

const presionado = { transform: [{ scale: 0.97 }] };

// Foto o inicial sobre verde claro, sin aro. Sin nombre (invitado), no hay avatar.
function Avatar({ foto, nombre }) {
  const { colores } = useTema();
  if (!foto && !nombre) return null;
  return (
    <View
      style={[estilos.avatar, { backgroundColor: colores.sobreMarcaSuave }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {foto ? (
        <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} />
      ) : (
        <Text style={[estilos.inicial, { color: colores.marca }]}>{nombre.charAt(0).toUpperCase()}</Text>
      )}
    </View>
  );
}

export default function CabeceraUsuario({
  foto,
  nombre,
  arriba,
  titulo,
  resumen,
  accion,
  alTocar,
  accessibilityLabel,
  accessibilityHint,
  children,
  estilo,
}) {
  const { colores } = useTema();

  const contenido = (
    <>
      <HojaEsquina tamano={64} />
      <View style={estilos.fila}>
        <Avatar foto={foto} nombre={nombre} />
        <View style={estilos.textos}>
          {arriba ? <Text style={[estilos.arriba, { color: colores.sobreMarcaSuave }]}>{arriba}</Text> : null}
          <Text style={[estilos.titulo, { color: colores.crema }]} numberOfLines={2}>
            {titulo}
          </Text>
        </View>
      </View>

      {resumen || accion ? (
        <View style={estilos.filaResumen}>
          <Text style={[estilos.resumen, { color: colores.sobreMarcaTenue }]} numberOfLines={2}>
            {resumen}
          </Text>
          {accion ? (
            <Pressable
              onPress={accion.alTocar}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={accion.etiqueta || accion.texto}
              style={({ pressed }) => [estilos.pastilla, { backgroundColor: colores.crema }, pressed && presionado]}
            >
              <Text style={[estilos.textoPastilla, { color: colores.marca }]}>{accion.texto}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
      style={({ pressed }) => [estilos.tarjeta, { backgroundColor: colores.marca }, estilo, pressed && presionado]}
    >
      {contenido}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    padding: 18,
    gap: espacio(1.5),
    borderRadius: 22,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: {
    fontFamily: fuentes.semi,
    fontSize: 18,
  },
  textos: {
    flex: 1,
    minWidth: 0,
  },
  arriba: {
    fontFamily: fuentes.normal,
    fontSize: 15,
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: 24,
    lineHeight: 30,
    paddingRight: espacio(2), // que no quede encima de la hoja
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  resumen: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: 12,
  },
  pastilla: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  textoPastilla: {
    fontFamily: fuentes.semi,
    fontSize: 12,
  },
});
