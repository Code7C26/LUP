def puntos(request):
    """Saldo de puntos para la barra de arriba (solo consumidores)."""
    usuario = getattr(request, 'user', None)
    if not usuario or not usuario.is_authenticated or not usuario.es_consumidor:
        return {}
    from .models import saldo_de
    return {'SALDO_PUNTOS': saldo_de(usuario)}
