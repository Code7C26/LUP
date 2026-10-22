from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'scr.bd_lup.products'
    verbose_name = 'Productos'

    def ready(self):
        from . import signals  # noqa: F401  (registra los avisos por email)
