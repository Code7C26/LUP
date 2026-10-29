from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST
from django.utils.translation import gettext as _, gettext_lazy as _l

from .forms import (
    FORMULARIOS_REGISTRO,
    LoginForm,
    OrganizacionForm,
    PerfilUsuarioForm,
    TiendaForm,
)
from .models import Usuario

INFO_ROLES = {
    Usuario.CONSUMIDOR: {
        'titulo': _l('Consumidor'),
        'icono': 'bi-bag-heart',
        'descripcion': _l('Rescatá comida rica a precios reducidos en comercios cerca tuyo.'),
        'beneficios': [_l('Hasta 70% de descuento'), _l('Reservá y retirá en el local'), _l('Historial de compras')],
    },
    Usuario.COMERCIO: {
        'titulo': _l('Comercio'),
        'icono': 'bi-shop',
        'descripcion': _l('Vendé tus excedentes del día y recuperá ingresos en lugar de tirarlos.'),
        'beneficios': [_l('Publicá en segundos'), _l('Gestioná reservas y retiros'), _l('Medí tu impacto')],
    },
    Usuario.ORGANIZACION: {
        'titulo': _l('Organización'),
        'icono': 'bi-people',
        'descripcion': _l('Recibí donaciones de alimentos para comedores, merenderos y fundaciones.'),
        'beneficios': [_l('Solicitá donaciones'), _l('Coordiná con comercios'), _l('Seguimiento de pedidos')],
    },
}


def _destino_seguro(request, por_defecto='panel'):
    destino = request.POST.get('next') or request.GET.get('next')
    if destino and url_has_allowed_host_and_scheme(destino, {request.get_host()}, request.is_secure()):
        return destino
    return por_defecto


def login_view(request):
    if request.user.is_authenticated:
        return redirect('panel')

    rol_inicial = request.GET.get('rol', Usuario.CONSUMIDOR)
    if rol_inicial not in INFO_ROLES:
        rol_inicial = Usuario.CONSUMIDOR

    form = LoginForm(request, data=request.POST or None, initial={'rol': rol_inicial})
    if request.method == 'POST':
        rol_inicial = request.POST.get('rol') or rol_inicial
        if form.is_valid():
            usuario = form.get_user()
            login(request, usuario)
            messages.success(request, _('¡Hola de nuevo, %(nombre)s!') % {'nombre': usuario.nombre_visible})
            return redirect(_destino_seguro(request))

    return render(
        request,
        'users/login.html',
        {'form': form, 'roles': INFO_ROLES, 'rol_activo': rol_inicial, 'next': request.GET.get('next', '')},
    )


@require_POST
def logout_view(request):
    logout(request)
    messages.info(request, _('Cerraste sesión. ¡Te esperamos pronto!'))
    return redirect('home')


def registro_seleccion_view(request):
    if request.user.is_authenticated:
        return redirect('panel')
    return render(request, 'users/registro_seleccion.html', {'roles': INFO_ROLES})


def registro_view(request, rol):
    if rol not in FORMULARIOS_REGISTRO:
        raise Http404(_('Tipo de cuenta inexistente'))
    if request.user.is_authenticated:
        return redirect('panel')

    FormClass = FORMULARIOS_REGISTRO[rol]
    form = FormClass(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        usuario = form.save()
        login(request, usuario, backend='scr.bd_lup.users.backends.UsuarioOEmailBackend')
        messages.success(request, _('¡Bienvenido/a a Lüp, %(nombre)s! Tu cuenta fue creada.') % {'nombre': usuario.nombre_visible})
        return redirect('panel')

    return render(
        request,
        'users/registro.html',
        {'form': form, 'rol': rol, 'info': INFO_ROLES[rol], 'roles': INFO_ROLES},
    )


@login_required
def perfil_view(request):
    usuario = request.user
    PerfilForm = None
    instancia = None
    if usuario.es_comercio and hasattr(usuario, 'tienda'):
        PerfilForm, instancia = TiendaForm, usuario.tienda
    elif usuario.es_organizacion and hasattr(usuario, 'organizacion'):
        PerfilForm, instancia = OrganizacionForm, usuario.organizacion

    datos = request.POST if request.method == 'POST' else None
    archivos = request.FILES if request.method == 'POST' else None
    form_usuario = PerfilUsuarioForm(datos, archivos, instance=usuario, prefix='u')
    form_perfil = PerfilForm(datos, instance=instancia, prefix='p') if PerfilForm else None

    if request.method == 'POST':
        validos = form_usuario.is_valid() and (form_perfil is None or form_perfil.is_valid())
        if validos:
            form_usuario.save()
            if form_perfil:
                form_perfil.save()
            messages.success(request, _('Tus datos se actualizaron correctamente.'))
            return redirect('perfil')

    return render(request, 'users/perfil.html', {'form_usuario': form_usuario, 'form_perfil': form_perfil})
