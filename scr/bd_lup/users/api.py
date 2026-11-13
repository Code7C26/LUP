from django.contrib.auth import authenticate, update_session_auth_hash
from rest_framework.authentication import SessionAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from scr.bd_lup.products.permisos import EsComercio, EsOrganizacion
from scr.bd_lup.stores.models import Tienda

from .forms import (
    FORMULARIOS_REGISTRO,
    CambiarClaveForm,
    OrganizacionForm,
    PerfilApiForm,
    RecuperarClaveForm,
    TiendaForm,
)
from .models import DispositivoPush, Organizacion

def datos_sesion(usuario):
    token, _ = Token.objects.get_or_create(user=usuario)
    return {
        'token': token.key,
        'id': usuario.id,
        'rol': usuario.rol,
        'nombre': usuario.nombre_visible,
        'foto': usuario.foto.url if usuario.foto else None,
    }

def datos_perfil(usuario):
    """Lo de la sesión, más los datos que muestra el Perfil de la app (paso 49)."""
    datos = {
        **datos_sesion(usuario),
        'username': usuario.username,
        'first_name': usuario.first_name,
        'last_name': usuario.last_name,
        'email': usuario.email,
        'telefono': usuario.telefono,
        'ciudad': usuario.ciudad,
        'avisos_email': usuario.avisos_email,
    }
    tienda = getattr(usuario, 'tienda', None)
    if usuario.es_comercio and tienda is not None:
        datos['comercio'] = {
            'nombre': tienda.nombre_fantasia,
            'rubro': tienda.get_rubro_display(),
            'cuit': tienda.cuit,
            'direccion': tienda.direccion,
            'horario': tienda.horario_atencion,
        }
    organizacion = getattr(usuario, 'organizacion', None)
    if usuario.es_organizacion and organizacion is not None:
        datos['organizacion'] = {
            'nombre': organizacion.nombre,
            'tipo': organizacion.get_tipo_display(),
            'cuit': organizacion.cuit,
            'direccion': organizacion.direccion,
            'personas_asistidas': organizacion.personas_asistidas,
        }
    return datos

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    usuario = authenticate(request, username=request.data.get('username'), password=request.data.get('password'))
    if usuario is None:
        return Response({'error': 'Usuario/email o contraseña incorrectos.'}, status=400)
    return Response(datos_sesion(usuario))

@api_view(['POST'])
@permission_classes([AllowAny])
def registro(request, rol):
    Formulario = FORMULARIOS_REGISTRO.get(rol)
    if Formulario is None:
        return Response({'error': 'Tipo de cuenta inexistente.'}, status=404)
    form = Formulario(request.data)
    if not form.is_valid():
        return Response(form.errors, status=400)
    usuario = form.save()
    from scr.bd_lup.products import notificaciones
    notificaciones.bienvenida(usuario)
    return Response(datos_sesion(usuario), status=201)

# ==========================================
# "Mis datos" desde la app: los mismos formularios de la web (users/forms.py)
# ==========================================

def _enviados(request):
    return request.data if hasattr(request.data, 'get') else {}


def _datos_parciales(form_class, instancia, enviados, extra=()):
    """PATCH: lo que no se manda queda como está (se completa con lo que ya tiene guardado)."""
    datos = {campo: getattr(instancia, campo) for campo in form_class._meta.fields if campo != 'foto'}
    for campo in (*datos, *extra):
        if campo in enviados:
            datos[campo] = enviados.get(campo)
    return datos


def _errores(form):
    """Los errores de Django por campo; los generales van en "non_field_errors" (como DRF)."""
    errores = dict(form.errors)
    if '__all__' in errores:
        errores['non_field_errors'] = errores.pop('__all__')
    return errores


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def yo(request):
    """GET: el perfil. PATCH (JSON o multipart): editar foto, nombre, apellido, email, teléfono, ciudad
    y avisos por email.

    Usa el formulario de "Mis datos" de la web (PerfilApiForm), así que valida lo mismo.
    Solo cambia lo que se manda; "foto" es un archivo y "quitar_foto": true la saca.
    Para cambiar el email hay que mandar también "clave_actual".
    """
    if request.method == 'GET':
        return Response(datos_perfil(request.user))

    usuario = request.user
    datos = _datos_parciales(PerfilApiForm, usuario, _enviados(request), extra=('quitar_foto', 'clave_actual'))
    form = PerfilApiForm(datos, request.FILES, instance=usuario)
    if not form.is_valid():
        return Response(_errores(form), status=400)
    form.save()
    return Response(datos_perfil(usuario))


def datos_comercio(tienda):
    return {
        'nombre_fantasia': tienda.nombre_fantasia,
        'rubro': tienda.rubro,
        'rubros': [[valor, str(texto)] for valor, texto in Tienda.RUBROS],
        'descripcion': tienda.descripcion,
        'direccion': tienda.direccion,
        'horario_atencion': tienda.horario_atencion,
        'latitud': tienda.latitud,
        'longitud': tienda.longitud,
        'cuit': tienda.cuit,  # se muestra, pero no se cambia (tampoco en la web)
    }


def datos_organizacion(organizacion):
    return {
        'nombre': organizacion.nombre,
        'tipo': organizacion.tipo,
        'tipos': [[valor, str(texto)] for valor, texto in Organizacion.TIPOS],
        'direccion': organizacion.direccion,
        'personeria_juridica': organizacion.personeria_juridica,
        'personas_asistidas': organizacion.personas_asistidas,
        'cuit': organizacion.cuit,
    }


def _editar_perfil_de_rol(request, instancia, Formulario, serializar):
    if request.method == 'GET':
        return Response(serializar(instancia))
    form = Formulario(_datos_parciales(Formulario, instancia, _enviados(request)), instance=instancia)
    if not form.is_valid():
        return Response(_errores(form), status=400)
    return Response(serializar(form.save()))


@api_view(['GET', 'PATCH'])
@permission_classes([EsComercio])
def mi_comercio(request):
    """Los datos del comercio de quien está logueado, con TiendaForm (igual que "Mis datos" de la web).

    Si cambia la dirección y no manda latitud/longitud, la ubicación se busca sola con Google Maps.
    """
    tienda = getattr(request.user, 'tienda', None)
    if tienda is None:
        return Response({'error': 'Todavía no completaste los datos de tu comercio.'}, status=404)
    return _editar_perfil_de_rol(request, tienda, TiendaForm, datos_comercio)


@api_view(['GET', 'PATCH'])
@permission_classes([EsOrganizacion])
def mi_organizacion(request):
    """Los datos de la organización de quien está logueado, con OrganizacionForm (igual que la web)."""
    organizacion = getattr(request.user, 'organizacion', None)
    if organizacion is None:
        return Response({'error': 'Todavía no completaste los datos de tu organización.'}, status=404)
    return _editar_perfil_de_rol(request, organizacion, OrganizacionForm, datos_organizacion)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cambiar_clave(request):
    """Cambiar la contraseña con la sesión abierta: {clave_actual, clave_nueva[, clave_nueva2]}.

    Valida con las reglas de contraseña de Django. La sesión sigue abierta: el token de la app no cambia
    y, si entró por la web, se actualiza su sesión para que no lo saque.
    """
    enviados = _enviados(request)
    nueva = enviados.get('clave_nueva') or ''
    form = CambiarClaveForm(request.user, {
        'old_password': enviados.get('clave_actual') or '',
        'new_password1': nueva,
        'new_password2': enviados.get('clave_nueva2', nueva) or '',
    })
    if not form.is_valid():
        errores = {}
        for campo, lista in form.errors.as_data().items():
            for error in lista:
                if campo == 'old_password':
                    destino = 'clave_actual'
                elif error.code == 'password_mismatch':
                    destino = 'clave_nueva2'
                else:
                    destino = 'clave_nueva'  # las reglas de Django (largo, muy común, solo números...)
                errores.setdefault(destino, []).extend(error.messages)
        return Response(errores, status=400)
    usuario = form.save()
    if isinstance(request.successful_authenticator, SessionAuthentication):
        update_session_auth_hash(request, usuario)
    return Response({'ok': True, 'mensaje': 'Listo, cambiaste tu contraseña.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def recuperar(request):
    """"¿Olvidaste tu contraseña?" de la app: manda por email el link de la web para elegir una nueva.

    Responde lo mismo exista o no la cuenta (así no se puede averiguar quién está registrado).
    """
    form = RecuperarClaveForm({'email': _enviados(request).get('email', '')})
    if not form.is_valid():
        return Response({'error': 'Escribí un email válido.'}, status=400)
    form.save()
    return Response({
        'ok': True,
        'mensaje': 'Si ese email tiene una cuenta en Lüp, en unos minutos te llega un link para elegir '
                   'una contraseña nueva. Fijate también en Spam o Promociones.',
    })


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def dispositivo_push(request):
    """El celular avisa adónde mandarle las notificaciones push.

    POST   {"token": "ExponentPushToken[...]"} → al iniciar sesión (o al abrir la app con sesión)
    DELETE {"token": "ExponentPushToken[...]"} → al cerrar sesión, para que no le lleguen avisos de esa cuenta
    """
    token = str(request.data.get('token', '')).strip()
    if not token.startswith(('ExponentPushToken[', 'ExpoPushToken[')) or len(token) > 200:
        return Response({'error': 'Token de notificaciones inválido.'}, status=400)
    if request.method == 'DELETE':
        DispositivoPush.objects.filter(usuario=request.user, token=token).delete()
        return Response(status=204)
    # Si el celular estaba con otra cuenta, pasa a esta
    _, creado = DispositivoPush.objects.update_or_create(token=token, defaults={'usuario': request.user})
    return Response({'ok': True}, status=201 if creado else 200)
