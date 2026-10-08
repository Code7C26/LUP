from django.db import models
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
    ROLES = (
        ('consumidor', 'Consumidor'),
        ('comercio', 'Comercio'),
        ('organizacion', 'Organización'),
    )
    rol = models.CharField(max_length=20, choices=ROLES, default='consumidor')
    telefono = models.CharField(max_length=20, blank=True, null=True)
    nombre_entidad = models.CharField(max_length=150, blank=True, null=True)

    # Evita el choque de permisos entre apps distintas
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='%(app_label)s_%(class)s_groups',
        blank=True,
        help_text='Grupos a los que pertenece este usuario.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='%(app_label)s_%(class)s_user_permissions',
        blank=True,
        help_text='Permisos específicos para este usuario.',
        verbose_name='user permissions',
    )

class Producto(models.Model):
    comercio = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='productos')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio_original = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_descuento = models.DecimalField(max_digits=10, decimal_places=2)
    es_donacion = models.BooleanField(default=False)
    stock = models.IntegerField(default=1)
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.titulo

