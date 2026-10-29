from django import forms
from django.utils.timezone import localdate
from django.utils.translation import gettext_lazy as _

from scr.bd_lup.users.forms import EstiloBootstrapMixin

from .models import Calificacion, Producto, Reserva, SolicitudDonacion


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
            'titulo': forms.TextInput(attrs={'placeholder': _('Ej: Docena de medialunas del día')}),
            'descripcion': forms.Textarea(
                attrs={'rows': 3, 'placeholder': _('Contá qué incluye la oferta y cómo conservarla...')}
            ),
            'precio_original': forms.NumberInput(attrs={'step': '0.01', 'min': '0', 'placeholder': '0.00'}),
            'precio_descuento': forms.NumberInput(attrs={'step': '0.01', 'min': '0', 'placeholder': '0.00'}),
            'stock': forms.NumberInput(attrs={'min': '1'}),
            'fecha_vencimiento': forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'),
            'imagen': forms.ClearableFileInput(attrs={'accept': 'image/*'}),
        }
        labels = {
            'titulo': _('Título de la oferta'),
            'precio_original': _('Precio original ($)'),
            'precio_descuento': _('Precio Lüp ($)'),
            'stock': _('Unidades disponibles'),
            'es_donacion': _('También disponible para donación a organizaciones'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['fecha_vencimiento'].widget.attrs['min'] = localdate().isoformat()

    def clean_fecha_vencimiento(self):
        fecha = self.cleaned_data['fecha_vencimiento']
        if fecha < localdate():
            raise forms.ValidationError(_('La fecha límite no puede estar en el pasado.'))
        return fecha

    def clean_stock(self):
        stock = self.cleaned_data['stock']
        if stock < 1:
            raise forms.ValidationError(_('Publicá al menos una unidad.'))
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
            raise forms.ValidationError(_('Solo quedan %(n)s unidades.') % {'n': self.producto.stock})
        return cantidad


class SolicitudDonacionForm(EstiloBootstrapMixin, forms.ModelForm):
    class Meta:
        model = SolicitudDonacion
        fields = ['mensaje']
        widgets = {
            'mensaje': forms.Textarea(
                attrs={
                    'rows': 4,
                    'placeholder': _('Contale al comercio a cuántas personas ayudaría y cuándo podés retirarlo...'),
                }
            )
        }
        labels = {'mensaje': _('Mensaje para el comercio')}


class CalificacionForm(forms.ModelForm):
    puntaje = forms.TypedChoiceField(
        choices=[(n, n) for n in range(1, 6)], coerce=int, widget=forms.RadioSelect,
        error_messages={'required': _('Elegí de 1 a 5 estrellas.')},
    )

    class Meta:
        model = Calificacion
        fields = ('puntaje', 'comentario')
        widgets = {'comentario': forms.Textarea(attrs={'rows': 2, 'maxlength': 500})}
