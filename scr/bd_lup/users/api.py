from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .forms import FORMULARIOS_REGISTRO, PerfilApiForm, RecuperarClaveForm
from .models import DispositivoPush

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

CAMPOS_EDITABLES = ('first_name', 'last_name', 'telefono', 'ciudad')


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def yo(request):
    """GET: el perfil. PATCH (JSON o multipart): editar nombre, apellido, teléfono, ciudad y foto.

    Usa el formulario de "Mis datos" de la web (PerfilApiForm), así que valida lo mismo.
    Solo cambia lo que se manda; "foto" es un archivo y "quitar_foto": true la saca.
    """
    if request.method == 'GET':
        return Response(datos_perfil(request.user))

    usuario = request.user
    enviados = request.data if hasattr(request.data, 'get') else {}
    datos = {campo: getattr(usuario, campo) for campo in CAMPOS_EDITABLES}
    for campo in (*CAMPOS_EDITABLES, 'quitar_foto'):
        if campo in enviados:
            datos[campo] = enviados.get(campo)
    form = PerfilApiForm(datos, request.FILES, instance=usuario)
    if not form.is_valid():
        return Response(form.errors, status=400)
    form.save()
    return Response(datos_perfil(usuario))


@api_view(['POST'])
@permission_classes([AllowAny])
def recuperar(request):
    """"¿Olvidaste tu contraseña?" de la app: manda por email el link de la web para elegir una nueva.

    Responde lo mismo exista o no la cuenta (así no se puede averiguar quién está registrado).
    """
    enviados = request.data if hasattr(request.data, 'get') else {}
    form = RecuperarClaveForm({'email': enviados.get('email', '')})
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
