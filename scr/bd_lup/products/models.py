from django.db import models
from scr.bd_lup.stores.models import Tienda

class Producto(models.Model):
    # Opciones de estado para la lógica del catálogo
    ESTADO_CHOICES = (
        ('DISPONIBLE', 'Disponible'),
        ('VENDIDO', 'Vendido'),
        ('DONADO', 'Donado'),
    )

    comercio = models.ForeignKey(Tienda, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=100)
    descripcion = models.TextField()
    precio_original = models.DecimalField(max_digits=10, decimal_places=2)
    precio_descuento = models.DecimalField(max_digits=10, decimal_places=2)
    es_donacion = models.BooleanField(default=False)
    stock = models.PositiveIntegerField(default=1)
    fecha_vencimiento = models.DateField()

    # Campos adicionales de estado y control
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='DISPONIBLE')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titulo
