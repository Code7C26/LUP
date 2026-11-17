// Ícono de la categoría de un producto (app/assets/categorias/claro y /oscuro, un PNG por categoría),
// para cuando un producto no tiene foto. Usa la versión clara u oscura según el tema.
// Los PNG traen su fondo (verde muy claro / verde de la marca): el contenedor se pinta del mismo color,
// así el ícono puede ocupar cualquier cuadro (también los que no son cuadrados) sin que se note el borde.
// Uso:
//   <IconoCategoria categoria="lacteos" tamano={64} />        ← cuadrado de 64 con bordes redondeados
//   <IconoCategoria categoria={p.categoria} llenar />         ← ocupa TODO el lugar de la foto
//   <IconoCategoria rubro="verduleria" llenar />              ← comercios: el ícono de la categoría de su rubro
//   <IconoCategoria icono="close-circle-outline" llenar />    ← un ícono de Ionicons con los mismos colores
// Si la categoría no existe, se usa "otros".
import { Image, StyleSheet, View } from 'react-native';

import { radio, useTema } from '../tema';
import Icono from './Icono';

// Los require tienen que ser fijos (así los empaqueta Expo)
const ICONOS = {
  claro: {
    panificados: require('../../assets/categorias/claro/panificados.png'),
    comidas: require('../../assets/categorias/claro/comidas.png'),
    frutas_verduras: require('../../assets/categorias/claro/frutas_verduras.png'),
    lacteos: require('../../assets/categorias/claro/lacteos.png'),
    carnes: require('../../assets/categorias/claro/carnes.png'),
    almacen: require('../../assets/categorias/claro/almacen.png'),
    bolsa_sorpresa: require('../../assets/categorias/claro/bolsa_sorpresa.png'),
    otros: require('../../assets/categorias/claro/otros.png'),
  },
  oscuro: {
    panificados: require('../../assets/categorias/oscuro/panificados.png'),
    comidas: require('../../assets/categorias/oscuro/comidas.png'),
    frutas_verduras: require('../../assets/categorias/oscuro/frutas_verduras.png'),
    lacteos: require('../../assets/categorias/oscuro/lacteos.png'),
    carnes: require('../../assets/categorias/oscuro/carnes.png'),
    almacen: require('../../assets/categorias/oscuro/almacen.png'),
    bolsa_sorpresa: require('../../assets/categorias/oscuro/bolsa_sorpresa.png'),
    otros: require('../../assets/categorias/oscuro/otros.png'),
  },
};

// El color del fondo de los PNG (medido en sus bordes) y un color de línea que combina, para los íconos sueltos
const COLORES = {
  claro: { fondo: '#E3EEDA', linea: '#073425' },
  oscuro: { fondo: '#073425', linea: '#B6D1A1' },
};

// Comercios sin foto: el rubro (stores/models.py) usa el ícono de la categoría que más se le parece
const CATEGORIA_DE_RUBRO = {
  panaderia: 'panificados',
  restaurante: 'comidas',
  verduleria: 'frutas_verduras',
  supermercado: 'almacen',
  cafeteria: 'panificados',
  carniceria: 'carnes',
  otro: 'otros',
};

export default function IconoCategoria({ categoria, rubro, icono, tamano = 44, llenar = false, estilo }) {
  const { esOscuro } = useTema();
  const modo = esOscuro ? 'oscuro' : 'claro';
  const { fondo, linea } = COLORES[modo];
  const clave = rubro !== undefined ? CATEGORIA_DE_RUBRO[rubro] : categoria;
  const fuente = ICONOS[modo][clave] || ICONOS[modo].otros;
  // Bordes redondeados como las tarjetas (proporcionales en los íconos chiquitos)
  const borde = Math.min(radio, Math.round(tamano * 0.28));

  const contenido = icono ? (
    <Icono nombre={icono} tamano={llenar ? tamano : Math.round(tamano * 0.5)} color={linea} />
  ) : (
    <Image source={fuente} style={llenar ? estilos.llenar : { width: tamano, height: tamano }} resizeMode="contain" />
  );

  return (
    <View
      style={[
        estilos.centro,
        { backgroundColor: fondo },
        llenar ? StyleSheet.absoluteFill : { width: tamano, height: tamano, borderRadius: borde, overflow: 'hidden' },
        estilo,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {contenido}
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dentro de la foto: el PNG cuadrado lo más grande que entre, centrado (el resto es su mismo fondo)
  llenar: {
    width: '100%',
    height: '100%',
  },
});
