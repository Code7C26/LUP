// PASO 39 · Elegir qué tipo de cuenta crear (como "registro_seleccion" de la web).
// Al tocar una tarjeta abre el formulario: navigation.navigate('RegistroFormulario', { rol })
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { espacio, fuentes, radio, tamanos, useTema } from '../tema';

// Mismos textos que la web (scr/bd_lup/users/views.py → INFO_ROLES)
export const TIPOS_DE_CUENTA = [
  {
    rol: 'consumidor',
    emoji: '🛍️',
    titulo: 'Consumidor',
    descripcion: 'Rescatá comida rica a precios reducidos en comercios cerca tuyo.',
  },
  {
    rol: 'comercio',
    emoji: '🏪',
    titulo: 'Comercio',
    descripcion: 'Vendé tus excedentes del día y recuperá ingresos en lugar de tirarlos.',
  },
  {
    rol: 'organizacion',
    emoji: '🤝',
    titulo: 'Organización',
    descripcion: 'Recibí donaciones de alimentos para comedores, merenderos y fundaciones.',
  },
];

export default function RegistroSeleccion({ navigation }) {
  const { colores } = useTema();

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido}>
      <Text style={[estilos.titulo, { color: colores.titulo }]}>Creá tu cuenta</Text>
      <Text style={[estilos.subtitulo, { color: colores.gris }]}>¿Cómo vas a usar Lüp?</Text>

      {TIPOS_DE_CUENTA.map((tipo) => (
        <Pressable
          key={tipo.rol}
          accessibilityRole="button"
          onPress={() => navigation?.navigate('RegistroFormulario', { rol: tipo.rol })}
          style={({ pressed }) => [
            estilos.tarjeta,
            { backgroundColor: colores.superficie, borderColor: colores.borde },
            pressed && { borderColor: colores.verde },
          ]}
        >
          <Text style={estilos.emoji}>{tipo.emoji}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[estilos.nombre, { color: colores.titulo }]}>{tipo.titulo}</Text>
            <Text style={[estilos.descripcion, { color: colores.gris }]}>{tipo.descripcion}</Text>
          </View>
          <Text style={[estilos.flecha, { color: colores.verdeHover }]}>›</Text>
        </Pressable>
      ))}

      <Text
        style={[estilos.volver, { color: colores.verdeHover }]}
        onPress={() => navigation?.goBack?.()}
      >
        Ya tengo cuenta, quiero ingresar
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(3),
    paddingTop: espacio(7),
    gap: espacio(2),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    textAlign: 'center',
    marginBottom: espacio(1),
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(2),
    borderWidth: 1.5,
    borderRadius: radio,
    padding: espacio(2),
  },
  emoji: {
    fontSize: 32,
  },
  nombre: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.mediano,
  },
  descripcion: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  flecha: {
    fontFamily: fuentes.negrita,
    fontSize: 28,
  },
  volver: {
    fontFamily: fuentes.media,
    fontSize: tamanos.normal,
    textAlign: 'center',
    marginTop: espacio(1),
  },
});
