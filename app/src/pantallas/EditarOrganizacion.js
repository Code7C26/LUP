// Datos de mi organización / fundación (desde Perfil): lo mismo que la sección "Organización"
// de "Mis datos" en la web (OrganizacionForm): nombre, tipo, dirección, personería jurídica y
// personas asistidas por semana.
// Usa GET y PATCH /api/mi-organizacion/. Django valida igual que la web y devuelve los errores por campo.
// El CUIT se muestra pero no se cambia (tampoco en la web).
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/cliente';
import Boton from '../componentes/Boton';
import Campo from '../componentes/Campo';
import Cargando from '../componentes/Cargando';
import Icono from '../componentes/Icono';
import MensajeError from '../componentes/MensajeError';
import { useSesion } from '../contexto/Sesion';
import { espacio, fuentes, tamanos, useTema } from '../tema';
import { vibrar } from '../utilidades';
import { Opciones } from './Registro';

const CAMPOS = ['nombre', 'tipo', 'direccion', 'personeria_juridica', 'personas_asistidas'];

export default function EditarOrganizacion({ navigation }) {
  const { colores } = useTema();
  const { actualizarUsuario } = useSesion();

  const [valores, setValores] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [cuit, setCuit] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  function mostrar(datos) {
    setValores(Object.fromEntries(CAMPOS.map((c) => [c, String(datos[c] ?? '')])));
    setTipos(datos.tipos || []);
    setCuit(datos.cuit || '');
  }

  useEffect(() => {
    api('/mi-organizacion/').then(mostrar).catch(setErrorGeneral);
  }, []);

  const cambiar = (campo) => (valor) => setValores((v) => ({ ...v, [campo]: valor }));

  async function guardar() {
    setErrores({});
    setErrorGeneral('');
    const datos = Object.fromEntries(CAMPOS.map((c) => [c, valores[c].trim()]));
    setGuardando(true);
    try {
      mostrar(await api('/mi-organizacion/', { metodo: 'PATCH', datos }));
      api('/auth/yo/').then(actualizarUsuario).catch(() => {}); // el nombre de la organización se ve en toda la app
      vibrar('exito');
      navigation.goBack();
    } catch (e) {
      if (e?.sinConexion || e?.error || e?.detail) {
        setErrorGeneral(e);
      } else {
        setErrores(e || {});
        setErrorGeneral('Revisá los campos marcados en rojo.');
      }
    } finally {
      setGuardando(false);
    }
  }

  if (!valores) {
    return errorGeneral ? (
      <View style={[estilos.contenido, { flex: 1, backgroundColor: colores.fondo }]}>
        <MensajeError mensaje={errorGeneral} />
      </View>
    ) : (
      <Cargando texto="Cargando tu organización…" />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <Icono nombre="heart-outline" tamano={28} color={colores.titulo} />
          <Text style={[estilos.titulo, { color: colores.titulo }]} accessibilityRole="header">
            Datos de mi organización
          </Text>
        </View>

        <View style={estilos.campos}>
          <Campo
            etiqueta="Nombre de la organización"
            value={valores.nombre}
            onChangeText={cambiar('nombre')}
            error={errores.nombre}
            maxLength={150}
          />
          <Opciones
            etiqueta="Tipo de organización"
            opciones={tipos}
            valor={valores.tipo}
            alElegir={cambiar('tipo')}
            error={errores.tipo}
          />
          <Campo
            etiqueta="Dirección"
            placeholder="Calle, número y ciudad"
            value={valores.direccion}
            onChangeText={cambiar('direccion')}
            error={errores.direccion}
            maxLength={255}
          />
          <Campo
            etiqueta="N° personería jurídica (opcional)"
            value={valores.personeria_juridica}
            onChangeText={cambiar('personeria_juridica')}
            error={errores.personeria_juridica}
            maxLength={100}
          />
          <Campo
            etiqueta="Personas asistidas por semana"
            value={valores.personas_asistidas}
            onChangeText={cambiar('personas_asistidas')}
            error={errores.personas_asistidas}
            keyboardType="number-pad"
            maxLength={7}
            onSubmitEditing={guardar}
          />
        </View>

        {cuit ? <Text style={[estilos.ayuda, { color: colores.gris }]}>CUIT / matrícula {cuit} · no se puede cambiar.</Text> : null}

        <MensajeError mensaje={errorGeneral} />
        <Boton texto="Guardar cambios" onPress={guardar} cargando={guardando} estilo={estilos.boton} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio(3),
    paddingTop: espacio(1),
    paddingBottom: espacio(5),
    gap: espacio(2.5),
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio(1),
  },
  titulo: {
    fontFamily: fuentes.normal,
    fontSize: 26,
  },
  campos: {
    gap: espacio(2),
  },
  ayuda: {
    fontFamily: fuentes.normal,
    fontSize: tamanos.chico,
  },
  boton: {
    alignSelf: 'center',
    width: '82%',
    marginTop: espacio(1),
  },
});
