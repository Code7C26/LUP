from rest_framework.permissions import BasePermission

class EsConsumidor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.es_consumidor
# Igual: EsComercio (es_comercio) y EsOrganizacion (es_organizacion)