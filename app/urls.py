from django.urls import path
from .views import ProductoListAPIView

urlpatterns = [
    path('productos/', ProductoListAPIView.as_view(), name='productos-api'),
]