from django.db import models
from stores.models import Comercio
class Producto(models.Model):
    comercio = models.ForeignKey(Comercio, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=100)
    descripcion = models.TextField()
    precio_original = models.DecimalField(max_digits=10, decimal_places=2)
    precio_descuento = models.DecimalField(max_digits=10, decimal_places=2)
    es_donacion = models.BooleanField(default=False)
    stock = models.PositiveIntegerField(default=1)
    fecha_vencimiento = models.DateField()
    def __str__(self):
        return self.titulo 
