from datetime import date

from django import forms

from scr.bd_lup.users.forms import EstiloBootstrapMixin

from .models import Producto, Reserva, SolicitudDonacion


class ProductoForm(EstiloBootstrapMixin, forms.ModelForm):
    class Meta:
        model = Producto
        fields = [
            'titulo',
            'categoria',
            'descripcion',
            'precio_original',
            'precio_descuento',
            'stock',
            'fecha_vencimiento',
            'es_donacion',
            'imagen',
        ]
        widgets = {
            'titulo': forms.TextInput(attrs={'placeholder': 'Ej: Docena de medialunas del día'}),
            'descripcion': forms.Textarea(
                attrs={'rows': 3, 'placeholder': 'Contá qué incluye la oferta y cómo conservarla...'}
            ),
            'precio_original': forms.NumberInput(attrs={'step': '0.01', 'min': '0', 'placeholder': '0.00'}),
            'precio_descuento': forms.NumberInput(attrs={'step': '0.01', 'min': '0', 'placeholder': '0.00'}),
            'stock': forms.NumberInput(attrs={'min': '1'}),
            'fecha_vencimiento': forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'),
            'imagen': forms.ClearableFileInput(attrs={'accept': 'image/*'}),
        }
        labels = {
            'titulo': 'Título de la oferta',
            'precio_original': 'Precio original ($)',
            'precio_descuento': 'Precio Lüp ($)',
            'stock': 'Unidades disponibles',
            'es_donacion': 'También disponible para donación a organizaciones',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['fecha_vencimiento'].widget.attrs['min'] = date.today().isoformat()

    def clean_fecha_vencimiento(self):
        fecha = self.cleaned_data['fecha_vencimiento']
        if fecha < date.today():
            raise forms.ValidationError('La fecha límite no puede estar en el pasado.')
        return fecha

    def clean_stock(self):
        stock = self.cleaned_data['stock']
        if stock < 1:
            raise forms.ValidationError('Publicá al menos una unidad.')
        return stock


class ReservaForm(EstiloBootstrapMixin, forms.ModelForm):
    class Meta:
        model = Reserva
        fields = ['cantidad']

    def __init__(self, *args, producto=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.producto = producto
        if producto is not None:
            self.fields['cantidad'].widget.attrs.update({'min': 1, 'max': producto.stock})

    def clean_cantidad(self):
        cantidad = self.cleaned_data['cantidad']
        if self.producto is not None and cantidad > self.producto.stock:
            raise forms.ValidationError(f'Solo quedan {self.producto.stock} unidades.')
        return cantidad


class SolicitudDonacionForm(EstiloBootstrapMixin, forms.ModelForm):
    class Meta:
        model = SolicitudDonacion
        fields = ['mensaje']
        widgets = {
            'mensaje': forms.Textarea(
                attrs={
                    'rows': 4,
                    'placeholder': 'Contale al comercio a cuántas personas ayudaría y cuándo podés retirarlo...',
                }
            )
        }
        labels = {'mensaje': 'Mensaje para el comercio'}
