// Pantalla de prueba del paso 35: muestra los componentes base de Lüp.
// En el paso 37 este archivo se cambia para mostrar la navegación de la app.
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { espacio, fuentes, tamanos, useTema } from './src/tema';
import Boton from './src/componentes/Boton';
import Campo from './src/componentes/Campo';
import MensajeError from './src/componentes/MensajeError';
import TarjetaProducto from './src/componentes/TarjetaProducto';

// Producto de ejemplo, con la misma forma que devuelve /api/productos/
const PRODUCTO_EJEMPLO = {
  id: 1,
  titulo: 'Docena de medialunas',
  comercio: 'Panadería El Sol',
  categoria: 'panificados',
  imagen: null,
  precio_original: '4200.00',
  precio_descuento: '1700.00',
  porcentaje_descuento: 60,
  es_donacion: true,
  distancia_km: 1.2,
};

export default function App() {
  const [fuentesListas] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
  const { colores, esOscuro } = useTema();
  const [usuario, setUsuario] = useState('');

  if (!fuentesListas) return null;

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[estilos.titulo, { color: colores.titulo }]}>Componentes de Lüp</Text>

      <Text style={[estilos.subtitulo, { color: colores.gris }]}>Botones</Text>
      <Boton texto="Ingresar" onPress={() => {}} />
      <Boton texto="Registrarme" variante="secundario" onPress={() => {}} />
      <Boton texto="Cargando" cargando />

      <Text style={[estilos.subtitulo, { color: colores.gris }]}>Campos</Text>
      <Campo
        etiqueta="Usuario o email"
        placeholder="tu_usuario o tu@email.com"
        autoCapitalize="none"
        value={usuario}
        onChangeText={setUsuario}
      />
      <Campo etiqueta="Contraseña" placeholder="••••••••" secureTextEntry error="Usuario/email o contraseña incorrectos." />

      <Text style={[estilos.subtitulo, { color: colores.gris }]}>Tarjeta de producto</Text>
      <TarjetaProducto producto={PRODUCTO_EJEMPLO} onPress={() => {}} />

      <Text style={[estilos.subtitulo, { color: colores.gris }]}>Mensaje de error</Text>
      <MensajeError mensaje="No pudimos conectar con Lüp." alReintentar={() => {}} />

      <StatusBar style={esOscuro ? 'light' : 'dark'} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(3),
    paddingTop: espacio(8),
    gap: espacio(1.5),
  },
  titulo: {
    fontFamily: fuentes.negrita,
    fontSize: tamanos.grande,
    marginBottom: espacio(1),
  },
  subtitulo: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    textTransform: 'uppercase',
    marginTop: espacio(2),
  },
});
