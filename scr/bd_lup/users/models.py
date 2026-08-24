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

