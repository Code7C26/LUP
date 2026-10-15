from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """Usuario único de Lüp. El rol define qué puede hacer dentro de la plataforma."""

    CONSUMIDOR = 'consumidor'
    COMERCIO = 'comercio'
    ORGANIZACION = 'organizacion'
    ROLES = (
        (CONSUMIDOR, 'Consumidor'),
        (COMERCIO, 'Comercio'),
        (ORGANIZACION, 'Organización'),
    )

    email = models.EmailField('email', unique=True)
    rol = models.CharField(max_length=20, choices=ROLES, default=CONSUMIDOR)
    telefono = models.CharField('teléfono', max_length=20, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'

    @property
    def es_consumidor(self):
        return self.rol == self.CONSUMIDOR

    @property
    def es_comercio(self):
        return self.rol == self.COMERCIO

    @property
    def es_organizacion(self):
        return self.rol == self.ORGANIZACION

    @property
    def nombre_visible(self):
        if self.es_comercio and hasattr(self, 'tienda'):
            return self.tienda.nombre_fantasia
        if self.es_organizacion and hasattr(self, 'organizacion'):
            return self.organizacion.nombre
        return self.get_full_name() or self.username

    def __str__(self):
        return f'{self.username} ({self.get_rol_display()})'


class Organizacion(models.Model):
    """Perfil de una organización social (ONG, comedor, merendero, fundación)."""

    TIPOS = (
        ('comedor', 'Comedor / Merendero'),
        ('fundacion', 'Fundación'),
        ('ong', 'ONG / Asociación civil'),
        ('religiosa', 'Institución religiosa'),
        ('otra', 'Otra'),
    )

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='organizacion')
    nombre = models.CharField('nombre de la organización', max_length=150)
    tipo = models.CharField(max_length=20, choices=TIPOS, default='comedor')
    cuit = models.CharField('CUIT / matrícula', max_length=13, unique=True)
    direccion = models.CharField('dirección', max_length=255)
    personeria_juridica = models.CharField('N° personería jurídica', max_length=100, blank=True)
    personas_asistidas = models.PositiveIntegerField('personas asistidas por semana', default=0)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'organización'
        verbose_name_plural = 'organizaciones'

    def __str__(self):
        return self.nombre
