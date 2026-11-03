// Bienvenida, IGUAL AL MOCKUP (páginas 4, 6 y 10 del PDF):
// el logo arriba y una tarjeta verde claro con el rol en el centro de arriba,
// "Omitir" a la derecha y los puntitos abajo. Se pasa deslizando.
// Sale la primera vez que se entra con cada rol. Desde Perfil se puede volver a ver ("VerBienvenida").
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Boton from '../componentes/Boton';
import Icono from '../componentes/Icono';
import Logo from '../componentes/Logo';
import { useBienvenida } from '../contexto/Bienvenida';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, tamanos, useTema } from '../tema';

const ROLES = {
  consumidor: { titulo: 'Consumidor', icono: 'cart-outline' },
  organizacion: { titulo: 'Fundación', icono: 'heart-outline' },
  comercio: { titulo: 'Comercio', icono: 'storefront-outline' },
};

// Una idea por pantalla: ícono, título corto y una frase
const PANTALLAS = {
  consumidor: [
    { icono: 'location-outline', titulo: 'Ofertas cerca tuyo', texto: 'Comida rica de los comercios de tu barrio, con descuento.' },
    { icono: 'bag-check-outline', titulo: 'Reservá en un toque', texto: 'Pagás cuando retirás, mostrando tu código.' },
    { icono: 'leaf-outline', titulo: 'Rescatá comida', texto: 'Cada reserva es comida que no termina en la basura.' },
  ],
  organizacion: [
    { icono: 'heart-outline', titulo: 'Donaciones cerca', texto: 'Los comercios publican alimentos para donar.' },
    { icono: 'paper-plane-outline', titulo: 'Pedí lo que necesitás', texto: 'Contale al comercio para quién es.' },
    { icono: 'checkmark-done-outline', titulo: 'Seguí tus pedidos', texto: 'Mirá cuáles aceptaron y pasá a retirarlos.' },
  ],
  comercio: [
    { icono: 'camera-outline', titulo: 'Publicá en un minuto', texto: 'Foto, precio con descuento y listo.' },
    { icono: 'cash-outline', titulo: 'Vendé lo que sobra', texto: 'Recuperá ingresos en lugar de tirar comida.' },
    { icono: 'qr-code-outline', titulo: 'Confirmá el retiro', texto: 'Escaneá el código del cliente al entregar.' },
  ],
};

export default function Bienvenida({ navigation, route }) {
  const { colores } = useTema();
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const { marcarVista } = useBienvenida();
  const { usuario } = useSesion();
  const lista = useRef(null);

  const rol = route?.params?.rol || usuario?.rol || 'consumidor';
  const datosRol = ROLES[rol] || ROLES.consumidor;
  const pantallas = PANTALLAS[rol] || PANTALLAS.consumidor;
  const [pagina, setPagina] = useState(0);
  const ultima = pagina === pantallas.length - 1;
  const ancho = width - espacio(4); // la tarjeta tiene 16 de margen a cada lado

  function terminar() {
    if (route?.name === 'VerBienvenida') return navigation.goBack(); // se abrió desde Perfil
    marcarVista(rol); // la navegación pasa sola a las pestañas
  }

  return (
    <View style={[estilos.pantalla, { backgroundColor: colores.fondo, paddingTop: top + espacio(3), paddingBottom: bottom + espacio(3) }]}>
      <Logo ancho={96} />

      <View style={[estilos.tarjeta, { backgroundColor: colores.verdeClaro }]}>
        {/* Arriba: el rol en el centro y "Omitir" a la derecha */}
        <View style={estilos.arriba}>
          <View style={[estilos.rol, { backgroundColor: colores.verdeProfundo }]}>
            <Icono nombre={datosRol.icono} tamano={15} color={colores.sobreVerdeProfundo} />
            <Text style={[estilos.textoRol, { color: colores.sobreVerdeProfundo }]}>{datosRol.titulo}</Text>
          </View>
          <Pressable onPress={terminar} hitSlop={10} accessibilityRole="button" style={estilos.omitir}>
            <Text style={estilos.textoOmitir}>Omitir</Text>
          </Pressable>
        </View>

        {/* Las 3 pantallas, se pasan deslizando */}
        <FlatList
          ref={lista}
          data={pantallas}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.titulo}
          getItemLayout={(_, index) => ({ length: ancho, offset: ancho * index, index })}
          onMomentumScrollEnd={(e) => setPagina(Math.round(e.nativeEvent.contentOffset.x / ancho))}
          renderItem={({ item }) => (
            <View style={[estilos.pagina, { width: ancho }]}>
              <View style={[estilos.circulo, { backgroundColor: colores.fondo }]}>
                <Icono nombre={item.icono} tamano={52} color={colores.verdeProfundo} />
              </View>
              <Text style={[estilos.titulo, { color: colores.verdeProfundo }]}>{item.titulo}</Text>
              <Text style={[estilos.texto, { color: colores.texto }]}>{item.texto}</Text>
            </View>
          )}
        />

        {ultima ? (
          <Boton texto="Empezar" chico onPress={terminar} estilo={estilos.empezar} />
        ) : null}

        {/* Puntitos (el de la pantalla actual, con borde) */}
        <View style={estilos.puntos} accessibilityLabel={`Pantalla ${pagina + 1} de ${pantallas.length}`}>
          {pantallas.map((p, i) => (
            <View
              key={p.titulo}
              style={[estilos.punto, { backgroundColor: '#FFFFFF' }, i === pagina && { borderWidth: 1.5, borderColor: colores.verdeProfundo }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    paddingHorizontal: espacio(2),
    gap: espacio(2.5),
  },
  tarjeta: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },
  arriba: {
    alignItems: 'center',
    paddingTop: espacio(2),
  },
  rol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: espacio(1.5),
    height: 30,
    borderRadius: 8,
  },
  textoRol: {
    fontFamily: fuentes.negrita,
    fontSize: 13,
  },
  omitir: {
    position: 'absolute',
    top: espacio(1),
    right: espacio(1),
    backgroundColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: espacio(1.25),
    paddingVertical: 3,
    borderRadius: 999,
  },
  textoOmitir: {
    color: '#FAFAFA',
    fontFamily: fuentes.negrita,
    fontSize: 12,
  },
  pagina: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio(4),
    gap: espacio(1.5),
  },
  circulo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio(1),
  },
  titulo: {
    fontFamily: fuentes.marca,
    fontSize: 22,
    textAlign: 'center',
  },
  texto: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
    lineHeight: 21,
    textAlign: 'center',
  },
  empezar: {
    alignSelf: 'center',
    paddingHorizontal: espacio(4),
    marginBottom: espacio(1.5),
  },
  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    paddingBottom: espacio(2.5),
  },
  punto: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
