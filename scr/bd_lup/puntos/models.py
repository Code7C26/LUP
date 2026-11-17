"""Puntos Lüp: se ganan comprando (1 punto cada $2.000) y se canjean por merchandising.

El saldo de cada persona es la suma de sus movimientos: + al retirar una compra, − al canjear,
+ si un canje se cancela. Así siempre se puede ver de dónde salió cada punto.
"""
import secrets

from django.conf import settings
from django.db import models
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _

PESOS_POR_PUNTO = 2000   # cada $2.000 gastados suman 1 punto (solo bloques completos)


def puntos_por_monto(monto):
    """$1.900 → 0 · $2.000 → 1 · $3.900 → 1 · $4.000 → 2 · $6.500 → 3."""
    return int(monto // PESOS_POR_PUNTO) if monto and monto > 0 else 0


def saldo_de(usuario):
    if not usuario or not usuario.is_authenticated:
        return 0
    return MovimientoPuntos.objects.filter(usuario=usuario).aggregate(total=Sum('puntos'))['total'] or 0


class ProductoMerch(models.Model):
    nombre = models.CharField(_('nombre'), max_length=80)
    descripcion = models.CharField(_('descripción'), max_length=200, blank=True)
    precio = models.DecimalField(_('precio en pesos'), max_digits=10, decimal_places=2)
    puntos = models.PositiveIntegerField(_('puntos para canjearlo'))
    icono = models.CharField(
        _('ícono'), max_length=40, default='bi-gift',
        help_text=_('Nombre de un ícono de Bootstrap Icons (se usa si no hay foto).'),
    )
    imagen = models.ImageField(_('foto'), upload_to='merch/', blank=True)
    activo = models.BooleanField(_('disponible para canjear'), default=True)
    orden = models.PositiveSmallIntegerField(_('orden'), default=0)

    class Meta:
        ordering = ['orden', 'puntos']
        verbose_name = _('producto de merchandising')
        verbose_name_plural = _('productos de merchandising')

    def __str__(self):
        return f'{self.nombre} ({self.puntos} pts)'


def _codigo_canje():
    return 'M' + ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(5))


class Canje(models.Model):
    PENDIENTE = 'pendiente'
    ENTREGADO = 'entregado'
    CANCELADO = 'cancelado'
    ESTADOS = (
        (PENDIENTE, _('Para retirar')),
        (ENTREGADO, _('Entregado')),
        (CANCELADO, _('Cancelado')),
    )

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='canjes')
    producto = models.ForeignKey(ProductoMerch, on_delete=models.PROTECT, related_name='canjes')
    puntos = models.PositiveIntegerField(_('puntos usados'))
    codigo = models.CharField(_('código'), max_length=8, unique=True, default=_codigo_canje)
    estado = models.CharField(_('estado'), max_length=20, choices=ESTADOS, default=PENDIENTE)
    creado_en = models.DateTimeField(_('pedido el'), auto_now_add=True)
    entregado_en = models.DateTimeField(_('entregado el'), null=True, blank=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = _('canje de puntos')
        verbose_name_plural = _('canjes de puntos')

    def __str__(self):
        return f'{self.codigo} · {self.producto.nombre}'


class MovimientoPuntos(models.Model):
    COMPRA = 'compra'
    CANJE = 'canje'
    DEVOLUCION = 'devolucion'
    AJUSTE = 'ajuste'
    MOTIVOS = (
        (COMPRA, _('Compra retirada')),
        (CANJE, _('Canje de merchandising')),
        (DEVOLUCION, _('Canje cancelado')),
        (AJUSTE, _('Ajuste del equipo')),
    )

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='movimientos_puntos')
    puntos = models.IntegerField(_('puntos'))   # positivo suma, negativo resta
    motivo = models.CharField(_('motivo'), max_length=20, choices=MOTIVOS)
    detalle = models.CharField(_('detalle'), max_length=160, blank=True)
    # Una compra suma una sola vez, aunque el retiro se confirme dos veces (web y app)
    reserva = models.OneToOneField(
        'products.Reserva', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimiento_puntos'
    )
    canje = models.ForeignKey(Canje, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos')
    creado_en = models.DateTimeField(_('fecha'), auto_now_add=True)

    class Meta:
        ordering = ['-creado_en', '-pk']
        verbose_name = _('movimiento de puntos')
        verbose_name_plural = _('movimientos de puntos')

    def __str__(self):
        return f'{self.usuario} {self.puntos:+d} ({self.get_motivo_display()})'
