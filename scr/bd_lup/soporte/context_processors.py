from django.conf import settings


def soporte(request):
    """Para el chat de ayuda de base.html: si responde la IA o las preguntas frecuentes."""
    return {'SOPORTE_CON_IA': bool(settings.ANTHROPIC_API_KEY)}
