from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .forms import FORMULARIOS_REGISTRO

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
    return Response(datos_sesion(form.save()), status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def yo(request):
    return Response(datos_perfil(request.user))