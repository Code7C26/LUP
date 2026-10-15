import secrets
from datetime import date

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from scr.bd_lup.stores.models import Tienda


class ProductoQuerySet(models.QuerySet):
    def visibles(self):
        """Productos que se muestran en el catálogo: disponibles, con stock y sin vencer."""
        return self.filter(
            estado=Producto.DISPONIBLE, stock__gt=0, fecha_vencimiento__gte=date.today()
        )


class Producto(models.Model):
    """Excedente de comida publicado por un comercio."""

    DISPONIBLE = 'DISPONIBLE'
    AGOTADO = 'AGOTADO'
    DONADO = 'DONADO'
    ESTADO_CHOICES = (
        (DISPONIBLE, 'Disponible'),
        (AGOTADO, 'Agotado'),
        (DONADO, 'Donado'),
    )

    CATEGORIAS = (
        ('panificados', 'Panificados'),
        ('comidas', 'Comidas preparadas'),
        ('frutas_verduras', 'Frutas y verduras'),
        ('lacteos', 'Lácteos'),
        ('carnes', 'Carnes'),
        ('almacen', 'Almacén'),
        ('bolsa_sorpresa', 'Bolsa sorpresa'),
        ('otros', 'Otros'),
    )

    comercio = models.ForeignKey(Tienda, on_delete=models.CASCADE, related_name='productos')
    titulo = models.CharField('título', max_length=100)
    descripcion = models.TextField('descripción')
    categoria = models.CharField('categoría', max_length=20, choices=CATEGORIAS, default='otros')
    imagen = models.ImageField('foto del producto', upload_to='productos/', null=True, blank=True)
    precio_original = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    precio_descuento = models.DecimalField(
        'precio Lüp', max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    es_donacion = models.BooleanField('apto para donación', default=False)
    stock = models.PositiveIntegerField(default=1)
    fecha_vencimiento = models.DateField('fecha límite de retiro')
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default=DISPONIBLE)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    objects = ProductoQuerySet.as_manager()

    class Meta:
        ordering = ['-creado_en']

    def clean(self):
        if (
            self.precio_original is not None
            and self.precio_descuento is not None
            and self.precio_descuento > self.precio_original
        ):
            raise ValidationError(
                {'precio_descuento': 'El precio Lüp no puede ser mayor al precio original.'}
            )

    @property
    def porcentaje_descuento(self):
        if self.precio_original and self.precio_descuento < self.precio_original:
            return round((1 - self.precio_descuento / self.precio_original) * 100)
        return 0

    @property
    def vence_hoy(self):
        return self.fecha_vencimiento == date.today()

    @property
    def esta_disponible(self):
        return (
            self.estado == self.DISPONIBLE
            and self.stock > 0
            and self.fecha_vencimiento >= date.today()
        )

    def descontar_stock(self, cantidad):
        self.stock -= cantidad
        if self.stock <= 0:
            self.stock = 0
            self.estado = self.AGOTADO
        self.save(update_fields=['stock', 'estado', 'actualizado_en'])

    def __str__(self):
        return self.titulo


def generar_codigo_retiro():
    return secrets.token_hex(3).upper()


class Reserva(models.Model):
    """Reserva de un consumidor. Se paga y retira en el local mostrando el código."""

    PENDIENTE = 'pendiente'
    RETIRADA = 'retirada'
    CANCELADA = 'cancelada'
    ESTADOS = (
        (PENDIENTE, 'Pendiente de retiro'),
        (RETIRADA, 'Retirada'),
        (CANCELADA, 'Cancelada'),
    )

    consumidor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservas'
    )
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='reservas')
    cantidad = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    precio_total = models.DecimalField(max_digits=10, decimal_places=2)
    codigo_retiro = models.CharField(max_length=10, unique=True, default=generar_codigo_retiro)
    estado = models.CharField(max_length=20, choices=ESTADOS, default=PENDIENTE)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creada_en']

    def __str__(self):
        return f'Reserva {self.codigo_retiro} - {self.producto}'


class SolicitudDonacion(models.Model):
    """Pedido de una organización social por un producto marcado como donación."""

    PENDIENTE = 'pendiente'
    APROBADA = 'aprobada'
    RECHAZADA = 'rechazada'
    ESTADOS = (
        (PENDIENTE, 'Pendiente'),
        (APROBADA, 'Aprobada'),
        (RECHAZADA, 'Rechazada'),
    )

    organizacion = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='solicitudes_donacion'
    )
    producto = models.ForeignKey(
        Producto, on_delete=models.CASCADE, related_name='solicitudes_donacion'
    )
    mensaje = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default=PENDIENTE)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creada_en']
        verbose_name = 'solicitud de donación'
        verbose_name_plural = 'solicitudes de donación'

    def __str__(self):
        return f'{self.organizacion} → {self.producto}'
