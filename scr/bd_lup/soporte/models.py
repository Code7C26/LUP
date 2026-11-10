from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Conversacion(models.Model):
    """Una charla con el asistente de soporte. El equipo las puede leer en /admin."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='conversaciones_soporte'
    )
    sesion = models.CharField(max_length=40, blank=True, db_index=True)  # para visitantes sin cuenta
    pagina = models.CharField(_('página desde la que escribió'), max_length=200, blank=True)
    derivada = models.BooleanField(_('pidió hablar con una persona'), default=False)
    email_contacto = models.EmailField(_('email para responderle'), blank=True)
    resuelta = models.BooleanField(_('resuelta por el equipo'), default=False)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-actualizada_en']
        verbose_name = _('conversación de soporte')
        verbose_name_plural = _('conversaciones de soporte')

    def __str__(self):
        quien = self.usuario.username if self.usuario else 'visitante'
        return f'#{self.pk} · {quien} · {self.creada_en:%d/%m %H:%M}'


class Mensaje(models.Model):
    USUARIO = 'usuario'
    ASISTENTE = 'asistente'
    ROLES = ((USUARIO, _('Usuario')), (ASISTENTE, _('Asistente')))

    conversacion = models.ForeignKey(Conversacion, on_delete=models.CASCADE, related_name='mensajes')
    rol = models.CharField(max_length=10, choices=ROLES)
    texto = models.TextField()
    con_ia = models.BooleanField(default=False)  # False = respuesta automática sin IA
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['creado_en', 'pk']

    def __str__(self):
        return f'{self.get_rol_display()}: {self.texto[:60]}'
