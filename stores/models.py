from django.db import models
from users.models import Usuario
class Comercio(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, limit_choices_to={'rol': 'comercio'})
    nombre_fantasia = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200)
    cuit = models.CharField(max_length=13)
    horario_atencion = models.CharField(max_length=100)
    
    def __str__(self):
        return self.nombre_fantasia 