from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Tienda(models.Model):
    """Perfil de un comercio adherido (panadería, restaurante, verdulería...)."""

    RUBROS = (
        ('panaderia', _('Panadería / Confitería')),
        ('restaurante', _('Restaurante / Rotisería')),
        ('verduleria', _('Verdulería')),
        ('supermercado', _('Supermercado / Almacén')),
        ('cafeteria', _('Cafetería')),
        ('carniceria', _('Carnicería')),
        ('otro', _('Otro')),
    )

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tienda',
        limit_choices_to={'rol': 'comercio'},
    )
    nombre_fantasia = models.CharField(_('nombre del comercio'), max_length=100)
    rubro = models.CharField(max_length=20, choices=RUBROS, default='otro')
    descripcion = models.TextField(_('descripción'), blank=True)
    direccion = models.CharField(_('dirección'), max_length=200)
    cuit = models.CharField(_('CUIT / CUIL'), max_length=13, unique=True)
    horario_atencion = models.CharField(
        _('horario de retiro'), max_length=100, help_text=_('Ej: Lunes a sábados de 18 a 20 hs')
    )
    latitud = models.FloatField(blank=True, null=True)
    longitud = models.FloatField(blank=True, null=True)
    notificaciones_email = models.BooleanField(
        _('recibir avisos por email'), default=True,
        help_text=_('Te avisamos cuando alguien reserva, cancela o pide una donación.'),
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('comercio')
        verbose_name_plural = _('comercios')
        ordering = ['nombre_fantasia']

    def __str__(self):
        return self.nombre_fantasia

    @property
    def tiene_ubicacion(self):
        return self.latitud is not None and self.longitud is not None
