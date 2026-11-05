from django.conf import settings


def google_maps(request):
    """Deja la clave de Google Maps disponible en las plantillas (puede estar vacía)."""
    return {'GOOGLE_MAPS_API_KEY': settings.GOOGLE_MAPS_API_KEY}


def opinion_pendiente(request):
    """Para los consumidores: la última reserva retirada que todavía no opinaron (últimos 30 días).

    base.html la usa para mostrar el aviso "¿Cómo te fue?" en cualquier página.
    """
    usuario = getattr(request, 'user', None)
    if not usuario or not usuario.is_authenticated or not usuario.es_consumidor:
        return {}
    # No mostrarlo en la página de opinar ni en el panel (ahí ya está el formulario)
    nombre = getattr(getattr(request, 'resolver_match', None), 'url_name', '')
    if nombre in ('calificar_reserva', 'panel'):
        return {}

    def buscar():
        from datetime import timedelta

        from django.utils import timezone

        from .models import Reserva
        return (
            Reserva.objects.filter(
                consumidor=usuario, estado=Reserva.RETIRADA, calificacion__isnull=True,
                retirada_en__gte=timezone.now() - timedelta(days=30),
            )
            .select_related('producto__comercio')
            .order_by('-retirada_en')
            .first()
        )

    return {'opinion_pendiente': buscar}
