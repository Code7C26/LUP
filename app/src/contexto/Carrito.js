// Carrito, como el del mockup ("Agregar al carrito" y "Realizar compra").
// Se guarda en el celular (no en Django): al "Realizar compra" se reserva cada producto
// con la API que ya existe (POST /api/productos/<id>/reservar/).
// Uso en cualquier pantalla (no necesita "Provider"):
//   const { items, cantidadTotal, total, agregar, cambiarCantidad, quitar, vaciar, cantidadDe } = useCarrito();
//   agregar(producto, 2)   ← "producto" es uno de los que devuelve /api/productos/
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'lup_carrito';
// Solo lo justo para mostrar el número y el total. El resto se busca al abrir el carrito.
// Cada item: { id, cantidad, precio, stock, comercio_id }
let items = [];
const oyentes = new Set();

function guardar(nuevos) {
  items = nuevos;
  oyentes.forEach((oyente) => oyente());
  SecureStore.setItemAsync(CLAVE, JSON.stringify(items)).catch(() => {});
}

// Al abrir la app se recupera lo que había quedado
SecureStore.getItemAsync(CLAVE)
  .then((guardado) => {
    const lista = JSON.parse(guardado || '[]');
    if (Array.isArray(lista)) {
      items = lista;
      oyentes.forEach((oyente) => oyente());
    }
  })
  .catch(() => {});

function agregar(producto, cantidad = 1) {
  const stock = producto.stock || 1;
  const existente = items.find((i) => i.id === producto.id);
  if (existente) {
    guardar(items.map((i) => (i.id === producto.id ? { ...i, cantidad: Math.min(i.cantidad + cantidad, stock), stock } : i)));
  } else {
    guardar([
      ...items,
      {
        id: producto.id,
        cantidad: Math.min(cantidad, stock),
        precio: Number(producto.precio_descuento),
        stock,
        comercio_id: producto.comercio_id,
      },
    ]);
  }
}

function cambiarCantidad(id, cantidad) {
  if (cantidad < 1) return quitar(id);
  guardar(items.map((i) => (i.id === id ? { ...i, cantidad: Math.min(cantidad, i.stock || cantidad) } : i)));
}

function quitar(id) {
  guardar(items.filter((i) => i.id !== id));
}

function vaciar() {
  guardar([]);
}

// Para actualizar precio y stock con lo último de Django (al abrir el carrito)
function actualizar(id, datos) {
  guardar(items.map((i) => (i.id === id ? { ...i, ...datos } : i)));
}

function suscribirse(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useCarrito() {
  const lista = useSyncExternalStore(suscribirse, () => items);
  return {
    items: lista,
    cantidadTotal: lista.reduce((suma, i) => suma + i.cantidad, 0),
    total: lista.reduce((suma, i) => suma + i.cantidad * i.precio, 0),
    cantidadDe: (id) => lista.find((i) => i.id === id)?.cantidad || 0,
    agregar,
    cambiarCantidad,
    quitar,
    vaciar,
    actualizar,
  };
}
