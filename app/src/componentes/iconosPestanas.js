// Íconos de las pestañas de abajo (los textos están en idiomas/es.js y en.js, sección pestanas) (PROPUESTA DE ESTÉTICA).
// Sirve para el App.js de prueba y también para la navegación del paso 37:
//   import { ICONOS_PESTANAS } from '../componentes/iconosPestanas';
//   tabBarIcon: ({ focused, color, size }) => (
//     <Ionicons name={ICONOS_PESTANAS[route.name][focused ? 1 : 0]} size={size} color={color} />
//   ),
//   title: t(`pestanas.${route.name}`),   (los textos están en idiomas/es.js y en.js)
// Cada ícono tiene dos versiones: [sin elegir, elegida].
export const ICONOS_PESTANAS = {
  Inicio: ['home-outline', 'home'],
  Catalogo: ['search-outline', 'search'],
  MisReservas: ['ticket-outline', 'ticket'],
  Perfil: ['person-outline', 'person'],
  MisProductos: ['cube-outline', 'cube'],
  ConfirmarRetiro: ['qr-code-outline', 'qr-code'],
  Solicitudes: ['heart-outline', 'heart'],
  Donaciones: ['heart-outline', 'heart'],
  MisSolicitudes: ['clipboard-outline', 'clipboard'],
};
