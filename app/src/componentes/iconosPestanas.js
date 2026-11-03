// Íconos y textos cortos de las pestañas de abajo (PROPUESTA DE ESTÉTICA).
// Sirve para el App.js de prueba y también para la navegación del paso 37:
//   import { ICONOS_PESTANAS } from '../componentes/iconosPestanas';
//   tabBarIcon: ({ focused, color, size }) => (
//     <Ionicons name={ICONOS_PESTANAS[route.name][focused ? 1 : 0]} size={size} color={color} />
//   ),
//   tabBarLabel: TEXTOS_PESTANAS[route.name],
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

export const TEXTOS_PESTANAS = {
  Inicio: 'Inicio',
  Catalogo: 'Buscar',
  MisReservas: 'Reservas',
  Perfil: 'Perfil',
  MisProductos: 'Productos',
  ConfirmarRetiro: 'Retiros',
  Solicitudes: 'Donaciones',
  Donaciones: 'Donaciones',
  MisSolicitudes: 'Pedidos',
};
