// Barra de arriba de las pantallas principales del comercio y de la organización, IGUAL a la de Inicio:
// el menú ☰ a la izquierda (abre MenuLateral, que cambia según el tipo de cuenta) y al lado el botón
// verde "Ayuda" (abre el chat con Lü). Mismos tamaños y estilos que estilos.barra / botonAyuda de Inicio.js.
// Uso:
//   <BarraSuperior navigation={navigation} desde="MisProductos" />
//   <BarraSuperior navigation={navigation} desde="Donaciones" estilo={{ paddingHorizontal: 0 }} />
// "estilo": en las listas que ya tienen margen a los costados, se saca el de la barra (paddingHorizontal: 0).
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, useTema } from '../tema';
import Icono from './Icono';
import MenuLateral from './MenuLateral';

export default function BarraSuperior({ navigation, desde, estilo, children }) {
  const { colores } = useTema();
  const { t } = useIdioma();
  const [verMenu, setVerMenu] = useState(false);

  return (
    <>
      <View style={[estilos.barra, estilo]}>
        <Pressable
          onPress={() => setVerMenu(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('inicio.abrirMenu')}
          style={[estilos.botonBarra, { backgroundColor: colores.panel }]}
        >
          <Icono nombre="menu" tamano={22} color={colores.texto} />
        </Pressable>
        <Pressable
          onPress={() => navigation?.navigate?.('Ayuda', { desde })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('inicio.ayudaAccesible')}
          style={({ pressed }) => [
            estilos.botonAyuda,
            { backgroundColor: colores.verdeProfundo },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Icono nombre="chatbubble-ellipses" tamano={15} color={colores.sobreVerdeProfundo} />
          <Text style={[estilos.textoAyuda, { color: colores.sobreVerdeProfundo }]}>{t('inicio.ayuda')}</Text>
        </Pressable>
        {children ? (
          <>
            <View style={{ flex: 1 }} />
            {children}
          </>
        ) : null}
      </View>

      <MenuLateral visible={verMenu} alCerrar={() => setVerMenu(false)} navigation={navigation} />
    </>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    paddingHorizontal: espacio(2),
    paddingVertical: espacio(1),
  },
  botonBarra: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonAyuda: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  textoAyuda: {
    fontFamily: fuentes.boton,
    fontSize: 13,
  },
});
