import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count, OuterRef, Subquery
from django.utils.timezone import localdate
from django.utils.translation import gettext_lazy as _

from scr.bd_lup.stores.models import Tienda


class ProductoQuerySet(models.QuerySet):
    def visibles(self):
        """Productos que se muestran en el catálogo: disponibles, con stock y sin vencer."""
        return self.filter(
            estado=Producto.DISPONIBLE, stock__gt=0, fecha_vencimiento__gte=localdate()
        )

    def con_calificacion(self):
        """Agrega el promedio de estrellas del comercio (calif_promedio, calif_cantidad) a cada producto."""
        por_tienda = Calificacion.objects.filter(tienda=OuterRef('comercio')).values('tienda')
        return self.annotate(
            calif_promedio=Subquery(por_tienda.annotate(v=Avg('puntaje')).values('v')[:1]),
            calif_cantidad=Subquery(por_tienda.annotate(v=Count('pk')).values('v')[:1]),
        )


class Producto(models.Model):
    """Excedente de comida publicado por un comercio."""

    DISPONIBLE = 'DISPONIBLE'
    AGOTADO = 'AGOTADO'    # vendido: el comercio lo marcó así o se quedó sin stock
    PAUSADO = 'PAUSADO'    # no disponible por ahora: no se muestra, pero se puede reactivar
    DONADO = 'DONADO'
    ESTADO_CHOICES = (
        (DISPONIBLE, _('Disponible')),
        (AGOTADO, _('Vendido')),
        (PAUSADO, _('No disponible')),
        (DONADO, _('Donado')),
    )
    # Estados que el comercio puede elegir a mano (web y app)
    ESTADOS_MANUALES = (DISPONIBLE, AGOTADO, PAUSADO)

    CATEGORIAS = (
        ('panificados', _('Panificados')),
        ('comidas', _('Comidas preparadas')),
        ('frutas_verduras', _('Frutas y verduras')),
        ('lacteos', _('Lácteos')),
        ('carnes', _('Carnes')),
        ('almacen', _('Almacén')),
        ('bolsa_sorpresa', _('Bolsa sorpresa')),
        ('otros', _('Otros')),
    )

    comercio = models.ForeignKey(Tienda, on_delete=models.CASCADE, related_name='productos')
    titulo = models.CharField(_('título'), max_length=100)
    descripcion = models.TextField(_('descripción'))
    categoria = models.CharField(_('categoría'), max_length=20, choices=CATEGORIAS, default='otros')
    imagen = models.ImageField(_('foto del producto'), upload_to='productos/', null=True, blank=True)
    precio_original = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    precio_descuento = models.DecimalField(
        _('precio Lüp'), max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    es_donacion = models.BooleanField(_('apto para donación'), default=False)
    stock = models.PositiveIntegerField(default=1)
    fecha_vencimiento = models.DateField(_('fecha límite de retiro'))
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
                {'precio_descuento': _('El precio Lüp no puede ser mayor al precio original.')}
            )

    @property
    def porcentaje_descuento(self):
        if self.precio_original and self.precio_descuento < self.precio_original:
            return round((1 - self.precio_descuento / self.precio_original) * 100)
        return 0

    @property
    def vence_hoy(self):
        return self.fecha_vencimiento == localdate()

    @property
    def esta_disponible(self):
        return (
            self.estado == self.DISPONIBLE
            and self.stock > 0
            and self.fecha_vencimiento >= localdate()
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
        (PENDIENTE, _('Pendiente de retiro')),
        (RETIRADA, _('Retirada')),
        (CANCELADA, _('Cancelada')),
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
        (PENDIENTE, _('Pendiente')),
        (APROBADA, _('Aprobada')),
        (RECHAZADA, _('Rechazada')),
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
        verbose_name = _('solicitud de donación')
        verbose_name_plural = _('solicitudes de donación')

    def __str__(self):
        return f'{self.organizacion} → {self.producto}'


class Calificacion(models.Model):
    """Opinión de un consumidor sobre un comercio, después de retirar su reserva (1 a 5 estrellas)."""

    reserva = models.OneToOneField(Reserva, on_delete=models.CASCADE, related_name='calificacion')
    tienda = models.ForeignKey(Tienda, on_delete=models.CASCADE, related_name='calificaciones')
    consumidor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='calificaciones'
    )
    puntaje = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comentario = models.TextField(blank=True, max_length=500)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creada_en']
        verbose_name = _('calificación')
        verbose_name_plural = _('calificaciones')

    def __str__(self):
        return f'{self.tienda} · {self.puntaje}★ de {self.consumidor}'


def resumen_calificaciones(tienda):
    """{'promedio': 4.5, 'cantidad': 12} del comercio (promedio None si todavía no tiene)."""
    datos = tienda.calificaciones.aggregate(promedio=Avg('puntaje'), cantidad=Count('pk'))
    return datos
