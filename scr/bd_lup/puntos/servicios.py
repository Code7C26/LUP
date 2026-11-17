"""Lo que cambia puntos: acreditar una compra, canjear y cancelar un canje."""
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.translation import gettext as _

from .models import Canje, MovimientoPuntos, ProductoMerch, puntos_por_monto, saldo_de


class CanjeError(Exception):
    pass


def acreditar_compra(reserva):
    """Al retirar una reserva: suma 1 punto cada $2.000 del total. Devuelve los puntos sumados."""
    puntos = puntos_por_monto(reserva.precio_total)
    if puntos <= 0 or not reserva.consumidor.es_consumidor:
        return 0
    try:
        with transaction.atomic():
            MovimientoPuntos.objects.create(
                usuario=reserva.consumidor, puntos=puntos, motivo=MovimientoPuntos.COMPRA, reserva=reserva,
                detalle=f'{reserva.cantidad} × {reserva.producto.titulo}'[:160],
            )
    except IntegrityError:   # ya se había acreditado esta reserva
        return 0
    return puntos


def canjear(usuario, producto_id):
    """Descuenta los puntos y crea el canje (para retirar). Levanta CanjeError si no se puede."""
    if not usuario.is_authenticated or not usuario.es_consumidor:
        raise CanjeError(_('Los canjes son para cuentas de consumidor.'))
    with transaction.atomic():
        # Bloquea a la persona mientras se calcula el saldo: dos clics seguidos no gastan dos veces
        get_user_model().objects.select_for_update().filter(pk=usuario.pk).first()
        producto = ProductoMerch.objects.filter(pk=producto_id, activo=True).first()
        if producto is None:
            raise CanjeError(_('Ese producto ya no está disponible para canjear.'))
        saldo = saldo_de(usuario)
        if saldo < producto.puntos:
            raise CanjeError(
                _('Te faltan %(faltan)s puntos para canjear %(producto)s.')
                % {'faltan': producto.puntos - saldo, 'producto': producto.nombre}
            )
        canje = Canje.objects.create(usuario=usuario, producto=producto, puntos=producto.puntos)
        MovimientoPuntos.objects.create(
            usuario=usuario, puntos=-producto.puntos, motivo=MovimientoPuntos.CANJE, canje=canje,
            detalle=producto.nombre,
        )
    return canje


def cancelar_canje(canje):
    """Devuelve los puntos de un canje que todavía no se entregó."""
    with transaction.atomic():
        canje = Canje.objects.select_for_update().get(pk=canje.pk)
        if canje.estado != Canje.PENDIENTE:
            raise CanjeError(_('Ese canje ya no se puede cancelar.'))
        canje.estado = Canje.CANCELADO
        canje.save(update_fields=['estado'])
        MovimientoPuntos.objects.create(
            usuario=canje.usuario, puntos=canje.puntos, motivo=MovimientoPuntos.DEVOLUCION, canje=canje,
            detalle=canje.producto.nombre,
        )
    return canje


def entregar_canje(canje):
    if canje.estado == Canje.PENDIENTE:
        canje.estado = Canje.ENTREGADO
        canje.entregado_en = timezone.now()
        canje.save(update_fields=['estado', 'entregado_en'])
    return canje
