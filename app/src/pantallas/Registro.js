// PASO 39 · Formulario de registro. Pide los MISMOS campos que la web para cada rol
// (scr/bd_lup/users/forms.py) y los manda a POST /api/auth/registro/<rol>/.
// Si Django responde con errores, cada uno aparece debajo de su campo.
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';
import { TIPOS_DE_CUENTA } from './RegistroSeleccion';

// ---- Campos de cada parte del formulario ----
const CAMPOS_CUENTA = [
  { nombre: 'username', etiqueta: 'Nombre de usuario', placeholder: 'ej: juan_perez', autoCapitalize: 'none' },
  { nombre: 'email', etiqueta: 'Email', placeholder: 'tu@email.com', autoCapitalize: 'none', keyboardType: 'email-address' },
  { nombre: 'password1', etiqueta: 'Contraseña', placeholder: 'Mínimo 8 caracteres, no solo números', secureTextEntry: true },
  { nombre: 'password2', etiqueta: 'Repetí la contraseña', placeholder: '••••••••', secureTextEntry: true },
];

const ETIQUETAS_PERSONA = {
  consumidor: ['Nombre', 'Apellido'],
  comercio: ['Nombre del responsable', 'Apellido del responsable'],
  organizacion: ['Nombre del referente', 'Apellido del referente'],
};

function camposPersonales(rol) {
  const [nombre, apellido] = ETIQUETAS_PERSONA[rol];
  return [
    { nombre: 'first_name', etiqueta: nombre },
    { nombre: 'last_name', etiqueta: apellido },
    { nombre: 'telefono', etiqueta: 'Teléfono', placeholder: '351 555 1234', keyboardType: 'phone-pad' },
    { nombre: 'ciudad', etiqueta: 'Ciudad', placeholder: 'Ej: Alta Gracia' },
  ];
}

const CAMPOS_COMERCIO = [
  { nombre: 'nombre_fantasia', etiqueta: 'Nombre del comercio' },
  { nombre: 'cuit', etiqueta: 'CUIT / CUIL', placeholder: '20-12345678-9', keyboardType: 'numbers-and-punctuation' },
  { nombre: 'direccion', etiqueta: 'Dirección del local', placeholder: 'Calle, número y ciudad' },
  { nombre: 'horario_atencion', etiqueta: 'Horario de retiro', placeholder: 'Ej: Lun a Sáb de 18 a 20 hs' },
];

const CAMPOS_ORGANIZACION = [
  { nombre: 'nombre_organizacion', etiqueta: 'Nombre de la organización' },
  { nombre: 'cuit', etiqueta: 'CUIT / matrícula', placeholder: '30-12345678-9', keyboardType: 'numbers-and-punctuation' },
  { nombre: 'direccion', etiqueta: 'Dirección', placeholder: 'Calle, número y ciudad' },
  { nombre: 'personas_asistidas', etiqueta: 'Personas asistidas por semana', placeholder: '0', keyboardType: 'number-pad' },
];

// Opciones: las mismas de stores/models.py (RUBROS) y users/models.py (TIPOS)
const RUBROS = [
  ['panaderia', 'Panadería / Confitería'],
  ['restaurante', 'Restaurante / Rotisería'],
  ['verduleria', 'Verdulería'],
  ['supermercado', 'Supermercado / Almacén'],
  ['cafeteria', 'Cafetería'],
  ['carniceria', 'Carnicería'],
  ['otro', 'Otro'],
];

const TIPOS_ORGANIZACION = [
  ['comedor', 'Comedor / Merendero'],
  ['fundacion', 'Fundación'],
  ['ong', 'ONG / Asociación civil'],
  ['religiosa', 'Institución religiosa'],
  ['otra', 'Otra'],
];

// Botones para elegir una opción (en lugar de una lista desplegable)
function Opciones({ etiqueta, opciones, valor, alElegir, error }) {
  const { colores } = useTema();
  return (
    <View style={{ gap: espacio(0.75) }}>
      <Text style={[estilos.etiqueta, { color: colores.texto }]}>{etiqueta}</Text>
      <View style={estilos.opciones}>
        {opciones.map(([clave, texto]) => {
          const elegida = clave === valor;
          return (
            <Pressable
              key={clave}
              onPress={() => alElegir(clave)}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegida }}
              style={[
                estilos.opcion,
                { borderColor: elegida ? colores.verde : colores.borde },
                elegida && { backgroundColor: colores.verde },
              ]}
            >
              <Text style={[estilos.textoOpcion, { color: elegida ? colores.sobreVerde : colores.texto }]}>{texto}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={[estilos.error, { color: colores.error }]}>{textoError(error)}</Text> : null}
    </View>
  );
}

export default function Registro({ navigation, route }) {
  const { colores } = useTema();
  const { registrar } = useSesion();
  const rol = route?.params?.rol || 'consumidor';
  const tipo = TIPOS_DE_CUENTA.find((t) => t.rol === rol);

  const [valores, setValores] = useState({
    rubro: 'panaderia',
    tipo: 'comedor',
    personas_asistidas: '0',
    acepta_terminos: false,
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (texto) => setValores((v) => ({ ...v, [campo]: texto }));

  // Dibuja una lista de campos de texto
  const dibujarCampos = (lista) =>
    lista.map(({ nombre, ...props }) => (
      <Campo
        key={nombre}
        value={valores[nombre] || ''}
        onChangeText={cambiar(nombre)}
        error={errores[nombre]}
        autoCorrect={false}
        {...props}
      />
    ));

  async function crearCuenta() {
    setErrores({});
    setErrorGeneral('');
    setEnviando(true);
    try {
      await registrar(rol, valores);
      // Listo: quedó logueada. Con la navegación (paso 37) la app pasa sola al inicio.
    } catch (e) {
      if (e?.sinConexion || e?.error) {
        setErrorGeneral(e);
      } else {
        // Errores de Django por campo: { "email": ["Ya existe una cuenta con este email."], ... }
        setErrores(e || {});
        const conocidos = new Set([
          ...CAMPOS_CUENTA, ...camposPersonales(rol), ...CAMPOS_COMERCIO, ...CAMPOS_ORGANIZACION,
        ].map((c) => c.nombre).concat(['rubro', 'tipo', 'acepta_terminos']));
        const otros = Object.entries(e || {})
          .filter(([campo]) => !conocidos.has(campo) && campo !== 'estado')
          .map(([, mensaje]) => textoError(mensaje));
        setErrorGeneral(otros.length ? otros.join(' ') : 'Revisá los campos marcados en rojo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={[estilos.titulo, { color: colores.titulo }]}>
          {tipo.emoji} Cuenta de {tipo.titulo}
        </Text>
        <Text style={[estilos.subtitulo, { color: colores.gris }]}>{tipo.descripcion}</Text>

        <Text style={[estilos.seccion, { color: colores.verdeHover }]}>Tu cuenta</Text>
        {dibujarCampos(CAMPOS_CUENTA)}

        <Text style={[estilos.seccion, { color: colores.verdeHover }]}>Tus datos</Text>
        {dibujarCampos(camposPersonales(rol))}

        {rol === 'comercio' ? (
          <>
            <Text style={[estilos.seccion, { color: colores.verdeHover }]}>Tu comercio</Text>
            {dibujarCampos(CAMPOS_COMERCIO.slice(0, 1))}
            <Opciones
              etiqueta="Rubro"
              opciones={RUBROS}
              valor={valores.rubro}
              alElegir={cambiar('rubro')}
              error={errores.rubro}
            />
            {dibujarCampos(CAMPOS_COMERCIO.slice(1))}
          </>
        ) : null}

        {rol === 'organizacion' ? (
          <>
            <Text style={[estilos.seccion, { color: colores.verdeHover }]}>Tu organización</Text>
            {dibujarCampos(CAMPOS_ORGANIZACION.slice(0, 1))}
            <Opciones
              etiqueta="Tipo de organización"
              opciones={TIPOS_ORGANIZACION}
              valor={valores.tipo}
              alElegir={cambiar('tipo')}
              error={errores.tipo}
            />
            {dibujarCampos(CAMPOS_ORGANIZACION.slice(1))}
          </>
        ) : null}

        {/* Términos y condiciones */}
        <Pressable
          onPress={() => setValores((v) => ({ ...v, acepta_terminos: !v.acepta_terminos }))}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: valores.acepta_terminos }}
          style={estilos.terminos}
        >
          <View
            style={[
              estilos.casilla,
              { borderColor: errores.acepta_terminos ? colores.error : colores.verde },
              valores.acepta_terminos && { backgroundColor: colores.verde },
            ]}
          >
            {valores.acepta_terminos ? <Text style={[estilos.tilde, { color: colores.sobreVerde }]}>✓</Text> : null}
          </View>
          <Text style={[estilos.textoTerminos, { color: colores.texto }]}>
            Acepto los términos y condiciones de Lüp
          </Text>
        </Pressable>
        {errores.acepta_terminos ? (
          <Text style={[estilos.error, { color: colores.error }]}>{textoError(errores.acepta_terminos)}</Text>
        ) : null}

        <MensajeError mensaje={errorGeneral} />

        <Boton texto="Crear mi cuenta" onPress={crearCuenta} cargando={enviando} />
        <Boton texto="Volver" variante="secundario" onPress={() => navigation?.goBack?.()} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    fontSize: tamanos.chico,
    textAlign: 'center',
  },
  seccion: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
    textTransform: 'uppercase',
    marginTop: espacio(1),
  },
  etiqueta: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  opciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio(1),
  },
  opcion: {
    borderWidth: 1.5,
    borderRadius: radio,
    paddingHorizontal: espacio(1.5),
    paddingVertical: espacio(0.75),
  },
  textoOpcion: {
    fontFamily: fuentes.media,
    fontSize: tamanos.chico,
  },
  terminos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1.5),
    marginTop: espacio(1),
  },
  casilla: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilde: {
    fontFamily: fuentes.negrita,
    fontSize: 16,
  },
  textoTerminos: {
    flex: 1,
    fontFamily: fuentes.normal,
    fontSize: tamanos.normal,
  },
  error: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
});
