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
import { StackActions } from '@react-navigation/native';

import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { useIdioma } from '../contexto/Idioma';
import { espacio, fuentes, radio, tamanos, useTema } from '../tema';
import { textoError } from '../utilidades';
import { TIPOS_DE_CUENTA } from './RegistroSeleccion';
import Icono from '../componentes/Icono';

// Pantallas de cuenta de la navegación (paso 37): se cierran juntas al terminar el registro
const PANTALLAS_DE_CUENTA = ['Login', 'Registro', 'RegistroFormulario'];

// ---- Campos de cada parte del formulario (etiqueta y placeholder son claves de idiomas/es.js) ----
const CAMPOS_CUENTA = [
  { nombre: 'username', etiqueta: 'registro.usuario', placeholder: 'registro.usuarioEjemplo', autoCapitalize: 'none' },
  { nombre: 'email', etiqueta: 'registro.email', placeholder: 'registro.emailEjemplo', autoCapitalize: 'none', keyboardType: 'email-address' },
  { nombre: 'password1', etiqueta: 'registro.contrasena', placeholder: 'registro.contrasenaReglas', secureTextEntry: true },
  { nombre: 'password2', etiqueta: 'registro.repetir', placeholder: 'registro.puntos', secureTextEntry: true },
];

const ETIQUETAS_PERSONA = {
  consumidor: ['registro.nombre', 'registro.apellido'],
  comercio: ['registro.nombreResponsable', 'registro.apellidoResponsable'],
  organizacion: ['registro.nombreReferente', 'registro.apellidoReferente'],
};

function camposPersonales(rol) {
  const [nombre, apellido] = ETIQUETAS_PERSONA[rol];
  return [
    { nombre: 'first_name', etiqueta: nombre },
    { nombre: 'last_name', etiqueta: apellido },
    { nombre: 'telefono', etiqueta: 'registro.telefono', placeholder: 'registro.telefonoEjemplo', keyboardType: 'phone-pad' },
    { nombre: 'ciudad', etiqueta: 'registro.ciudad', placeholder: 'registro.ciudadEjemplo' },
  ];
}

const CAMPOS_COMERCIO = [
  { nombre: 'nombre_fantasia', etiqueta: 'registro.nombreComercio' },
  { nombre: 'cuit', etiqueta: 'registro.cuitComercio', placeholder: 'registro.cuitComercioEjemplo', keyboardType: 'numbers-and-punctuation' },
  { nombre: 'direccion', etiqueta: 'registro.direccionLocal', placeholder: 'registro.direccionEjemplo' },
  { nombre: 'horario_atencion', etiqueta: 'registro.horario', placeholder: 'registro.horarioEjemplo' },
];

const CAMPOS_ORGANIZACION = [
  { nombre: 'nombre_organizacion', etiqueta: 'registro.nombreOrganizacion' },
  { nombre: 'cuit', etiqueta: 'registro.cuitOrganizacion', placeholder: 'registro.cuitOrganizacionEjemplo', keyboardType: 'numbers-and-punctuation' },
  { nombre: 'direccion', etiqueta: 'registro.direccion', placeholder: 'registro.direccionEjemplo' },
  { nombre: 'personas_asistidas', etiqueta: 'registro.personas', placeholder: 'registro.cero', keyboardType: 'number-pad' },
];

// Opciones: las mismas de stores/models.py (RUBROS) y users/models.py (TIPOS).
// Los textos salen de t('rubros.X') y t('tiposOrganizacion.X') (idiomas/es.js y en.js)
const RUBROS = ['panaderia', 'restaurante', 'verduleria', 'supermercado', 'cafeteria', 'carniceria', 'otro'];

const TIPOS_ORGANIZACION = ['comedor', 'fundacion', 'ong', 'religiosa', 'otra'];

// Botones para elegir una opción (en lugar de una lista desplegable).
// También la usa el formulario de producto del comercio (paso 46).
export function Opciones({ etiqueta, opciones, valor, alElegir, error }) {
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
                { borderColor: elegida ? colores.verdeProfundo : colores.borde },
                elegida && { backgroundColor: colores.verdeProfundo },
              ]}
            >
              <Text style={[estilos.textoOpcion, { color: elegida ? colores.sobreVerdeProfundo : colores.texto }]}>{texto}</Text>
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
  const { t } = useIdioma();
  const { registrar, invitado } = useSesion();
  const rol = route?.params?.rol || 'consumidor';
  const tipo = TIPOS_DE_CUENTA.find((c) => c.rol === rol);

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
    lista.map(({ nombre, etiqueta, placeholder, ...props }) => (
      <Campo
        key={nombre}
        etiqueta={t(etiqueta)}
        placeholder={placeholder ? t(placeholder) : undefined}
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
      // Listo: quedó logueada. Si se llegó desde la app como invitado (Perfil o "Ingresá para reservar"),
      // se cierran el registro y el login y se abre la bienvenida. Si no, la navegación cambia sola.
      if (invitado) {
        const rutas = navigation?.getState?.()?.routes || [];
        let deCuenta = 0;
        while (deCuenta < rutas.length && PANTALLAS_DE_CUENTA.includes(rutas[rutas.length - 1 - deCuenta].name)) {
          deCuenta += 1;
        }
        if (deCuenta > 0 && deCuenta < rutas.length) navigation.dispatch(StackActions.pop(deCuenta));
        navigation.navigate('VerBienvenida', { rol }); // y se le da la bienvenida a la cuenta nueva
      }
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
        setErrorGeneral(otros.length ? otros.join(' ') : t('comun.revisaCampos'));
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
        <Text style={[estilos.titulo, { color: colores.titulo }]}>{t('registro.cuentaDe', { tipo: t(tipo.titulo) })}</Text>

        <Text style={[estilos.seccion, { color: colores.verdeHover }]}>{t('registro.tuCuenta')}</Text>
        {dibujarCampos(CAMPOS_CUENTA)}

        <Text style={[estilos.seccion, { color: colores.verdeHover }]}>{t('registro.tusDatos')}</Text>
        {dibujarCampos(camposPersonales(rol))}

        {rol === 'comercio' ? (
          <>
            <Text style={[estilos.seccion, { color: colores.verdeHover }]}>{t('registro.tuComercio')}</Text>
            {dibujarCampos(CAMPOS_COMERCIO.slice(0, 1))}
            <Opciones
              etiqueta={t('registro.rubro')}
              opciones={RUBROS.map((r) => [r, t(`rubros.${r}`)])}
              valor={valores.rubro}
              alElegir={cambiar('rubro')}
              error={errores.rubro}
            />
            {dibujarCampos(CAMPOS_COMERCIO.slice(1))}
          </>
        ) : null}

        {rol === 'organizacion' ? (
          <>
            <Text style={[estilos.seccion, { color: colores.verdeHover }]}>{t('registro.tuOrganizacion')}</Text>
            {dibujarCampos(CAMPOS_ORGANIZACION.slice(0, 1))}
            <Opciones
              etiqueta={t('registro.tipoOrganizacion')}
              opciones={TIPOS_ORGANIZACION.map((o) => [o, t(`tiposOrganizacion.${o}`)])}
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
              { borderColor: errores.acepta_terminos ? colores.error : colores.verdeProfundo },
              valores.acepta_terminos && { backgroundColor: colores.verdeProfundo },
            ]}
          >
            {valores.acepta_terminos ? <Icono nombre="checkmark" tamano={16} color={colores.sobreVerdeProfundo} /> : null}
          </View>
          <Text style={[estilos.textoTerminos, { color: colores.texto }]}>
            {t('registro.terminos')}
          </Text>
        </Pressable>
        {errores.acepta_terminos ? (
          <Text style={[estilos.error, { color: colores.error }]}>{textoError(errores.acepta_terminos)}</Text>
        ) : null}

        <MensajeError mensaje={errorGeneral} />

        <Boton texto={t('registro.crearCuenta')} onPress={crearCuenta} cargando={enviando} />
        <Boton texto={t('comun.volver')} variante="texto" onPress={() => navigation?.goBack?.()} />
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
