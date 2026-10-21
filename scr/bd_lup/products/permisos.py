from rest_framework.permissions import BasePermission


class EsConsumidor(BasePermission):
    """Solo deja pasar a usuarios logueados con rol consumidor."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.es_consumidor


class EsComercio(BasePermission):
    """Solo deja pasar a usuarios logueados con rol comercio."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.es_comercio


class EsOrganizacion(BasePermission):
    """Solo deja pasar a usuarios logueados con rol organización."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.es_organizacion