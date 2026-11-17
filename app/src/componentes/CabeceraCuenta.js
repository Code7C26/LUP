// Cabecera de las pantallas principales del comercio y de la organización:
// el círculo con la inicial, el nombre (mismo estilo que los títulos de Inicio, "Cerca tuyo")
// y abajo, en chico, un resumen ("3 disponibles · 12 vendidos"). Tocarla abre el Perfil.
// Uso:
//   <CabeceraCuenta nombre="Panadería Sol" resumen="3 disponibles · 12 vendidos" alTocar={() => navigation.navigate('Perfil')} />
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, tamanos, useTema } from '../tema';

export default function CabeceraCuenta({ nombre, resumen, alTocar }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  return (
    <Pressable
      onPress={alTocar}
      disabled={!alTocar}
      accessibilityRole="button"
      accessibilityLabel={[nombre, resumen, t('menu.miPerfil')].filter(Boolean).join(', ')}
      style={({ pressed }) => [estilos.fila, pressed && { opacity: 0.7 }]}
    >
      <View style={[estilos.circulo, { backgroundColor: colores.verdeProfundo }]}>
        <Text style={[estilos.inicial, { color: colores.sobreVerdeProfundo }]}>{(nombre || '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={estilos.textos}>
        <Text style={[estilos.nombre, { color: colores.titulo }]} numberOfLines={2} accessibilityRole="header">
          {nombre}
        </Text>
        {resumen ? (
          <Text style={[estilos.resumen, { color: colores.gris }]} numberOfLines={2}>
            {resumen}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
  },
  circulo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: {
    fontFamily: fuentes.marca,
    fontSize: 22,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  // Igual que estilos.titulo de Inicio.js
  nombre: {
    fontFamily: fuentes.normal,
    fontSize: 18,
  },
  resumen: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
