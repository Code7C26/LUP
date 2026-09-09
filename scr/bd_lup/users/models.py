from django.db import models
from django.contrib.auth.models import AbstractUser

# 1. Modelo de Usuario Personalizado
class Usuario(AbstractUser):
    ROLES = (
        ('consumidor', 'Consumidor'),
        ('comercio', 'Comercio'),
        ('organizacion', 'Organización'),
    )
    rol = models.CharField(max_length=20, choices=ROLES, default='consumidor', verbose_name="Rol de Usuario")
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono de Contacto")

    # Métodos auxiliares para verificación rápida de roles
    def is_consumidor(self):
        return self.rol == 'consumidor'

    def is_comercio(self):
        return self.rol == 'comercio'

    def is_organizacion(self):
        return self.rol == 'organizacion'

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"


# 2. Perfil para Comercio Asociado
class Comercio(models.Model):
    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='perfil_comercio'
    )
    nombre_comercio = models.CharField(max_length=150, verbose_name="Nombre Fantasía del Comercio")
    cuit_cuil = models.CharField(max_length=13, unique=True, verbose_name="CUIT / CUIL")
    direccion = models.CharField(max_length=255, verbose_name="Dirección Comercial (Ej: Alta Gracia)")
    rubro = models.CharField(
        max_length=100, 
        help_text="Ej: Panadería, Verdulería, Supermercado",
        verbose_name="Rubro"
    )
    horario_atencion = models.CharField(
        max_length=100, 
        help_text="Ej: Lunes a Sábados de 18:00 a 20:00 hs",
        verbose_name="Horario de Retiro de Ofertas"
    )
    latitud = models.FloatField(blank=True, null=True, verbose_name="Latitud")
    longitud = models.FloatField(blank=True, null=True, verbose_name="Longitud")
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre_comercio


# 3. Perfil para Organización Social / ONG / Caridad
class Organizacion(models.Model):
    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='perfil_organizacion'
    )
    nombre_organizacion = models.CharField(max_length=150, verbose_name="Nombre de la Organización")
    cuit_cuil = models.CharField(max_length=13, unique=True, verbose_name="CUIT / CUIL / Matrícula")
    direccion = models.CharField(max_length=255, verbose_name="Dirección")
    personeria_juridica = models.CharField(max_length=100, blank=True, null=True, verbose_name="N° Personería Jurídica")

    def __str__(self):
        return self.nombre_organizacion


# 4. Modelo de Productos Excedentes (Carga diaria del comercio)
class Producto(models.Model):
    ESTADOS = (
        ('disponible', 'Disponible'),
        ('reservado', 'Reservado'),
        ('donado', 'Donado'),
        ('agotado', 'Agotado'),
    )

    comercio = models.ForeignKey(
        Comercio, 
        on_delete=models.CASCADE, 
        related_name='productos',
        verbose_name="Comercio Propietario"
    )
    nombre = models.CharField(max_length=150, verbose_name="Nombre del Producto")
    descripcion = models.TextField(blank=True, verbose_name="Descripción / Contenido")
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True, verbose_name="Imagen del Producto")
    
    precio_original = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Original ($)")
    precio_descuento = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio con Descuento ($)")
    
    stock = models.PositiveIntegerField(default=1, verbose_name="Cantidad / Stock Disponible")
    fecha_vencimiento = models.DateField(verbose_name="Fecha de Vencimiento")
    
    es_para_donacion = models.BooleanField(
        default=False, 
        verbose_name="¿Apto / Marcado para Donación Gratuita?"
    )
    estado = models.CharField(max_length=20, choices=ESTADOS, default='disponible', verbose_name="Estado de Publicación")
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def porcentaje_descuento(self):
        if self.precio_original > 0 and self.precio_descuento < self.precio_original:
            descuento = ((self.precio_original - self.precio_descuento) / self.precio_original) * 100
            return int(round(descuento))
        return 0

    def __str__(self):
        return f"{self.nombre} - {self.comercio.nombre_comercio} (${self.precio_descuento})"


# 5. Modelo para Reservas y Compras de Consumidores
class Reserva(models.Model):
    ESTADOS_RESERVA = (
        ('pendiente', 'Pendiente de Retiro'),
        ('completado', 'Completado / Retirado'),
        ('cancelado', 'Cancelado'),
    )

    consumidor = models.ForeignKey(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='reservas',
        verbose_name="Consumidor"
    )
    producto = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE, 
        related_name='reservas',
        verbose_name="Producto Reservado"
    )
    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad Reservada")
    precio_total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Monto Total ($)")
    
    codigo_retiro = models.CharField(max_length=10, unique=True, verbose_name="Código de Verificación para Retiro")
    estado = models.CharField(max_length=20, choices=ESTADOS_RESERVA, default='pendiente')
    
    fecha_reserva = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reserva #{self.id} - {self.producto.nombre} por {self.consumidor.username}"
