from django.conf import settings
from django.db import models


class Tienda(models.Model):
    """Perfil de un comercio adherido (panadería, restaurante, verdulería...)."""

    RUBROS = (
        ('panaderia', 'Panadería / Confitería'),
        ('restaurante', 'Restaurante / Rotisería'),
        ('verduleria', 'Verdulería'),
        ('supermercado', 'Supermercado / Almacén'),
        ('cafeteria', 'Cafetería'),
        ('carniceria', 'Carnicería'),
        ('otro', 'Otro'),
    )

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tienda',
        limit_choices_to={'rol': 'comercio'},
    )
    nombre_fantasia = models.CharField('nombre del comercio', max_length=100)
    rubro = models.CharField(max_length=20, choices=RUBROS, default='otro')
    descripcion = models.TextField('descripción', blank=True)
    direccion = models.CharField('dirección', max_length=200)
    cuit = models.CharField('CUIT / CUIL', max_length=13, unique=True)
    horario_atencion = models.CharField(
        'horario de retiro', max_length=100, help_text='Ej: Lunes a sábados de 18 a 20 hs'
    )
    latitud = models.FloatField(blank=True, null=True)
    longitud = models.FloatField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'comercio'
        verbose_name_plural = 'comercios'
        ordering = ['nombre_fantasia']

    def __str__(self):
        return self.nombre_fantasia
