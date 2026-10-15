from functools import wraps

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect


def rol_requerido(*roles, mensaje='No tenés permiso para acceder a esta sección.'):
    """Restringe una vista a usuarios autenticados con alguno de los roles indicados."""

    def decorador(vista):
        @wraps(vista)
        @login_required
        def envoltura(request, *args, **kwargs):
            if request.user.rol not in roles:
                messages.error(request, mensaje)
                return redirect('catalogo')
            return vista(request, *args, **kwargs)

        return envoltura

    return decorador
