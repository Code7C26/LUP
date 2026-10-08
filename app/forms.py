from django import forms
from .models import Producto

class ProductoForm(forms.ModelForm):
    class Meta:
        model = Producto
        fields = ['titulo', 'descripcion', 'precio_original', 'precio_descuento', 'es_donacion', 'stock', 'imagen', 'fecha_vencimiento']
        widgets = {
            'titulo': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ej. Pack Verduras Frescas'}),
            'descripcion': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'precio_original': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'precio_descuento': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'es_donacion': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'stock': forms.NumberInput(attrs={'class': 'form-control', 'min': 1}),
            'imagen': forms.FileInput(attrs={'class': 'form-control'}),
            'fecha_vencimiento': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }


class ContactoOrganizacionForm(forms.Form):
    asunto = forms.CharField(max_length=150, widget=forms.TextInput(attrs={'class': 'form-control', 'readonly': True}))
    mensaje = forms.CharField(widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Escribe los detalles de tu organización y necesidad de recepción de esta donación...'}))