"""Compila las traducciones (.po → .mo) sin necesitar GNU gettext instalado.

    python manage.py compilar_traducciones

Cuando cambies un texto en scr/locale/en/LC_MESSAGES/django.po, corré este comando
y reiniciá el servidor. (Es lo mismo que `compilemessages` de Django, pero funciona
en Windows sin instalar nada.)
"""
import ast
import struct
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand


def leer_po(ruta):
    """Devuelve {clave: valor} listo para el .mo. Ignora entradas 'fuzzy' y vacías."""
    entradas, actual, campo, fuzzy = {}, {}, None, False

    def cerrar():
        nonlocal actual, fuzzy
        if 'msgid' in actual and not fuzzy:
            clave = actual['msgid']
            if 'msgid_plural' in actual:
                clave += '\0' + actual['msgid_plural']
                valores = [actual.get(f'msgstr[{i}]', '') for i in range(2)]
                if all(valores):
                    entradas[clave] = '\0'.join(valores)
            elif actual.get('msgstr') or clave == '':
                entradas[clave] = actual.get('msgstr', '')
        actual, fuzzy = {}, False

    for linea in Path(ruta).read_text(encoding='utf-8').splitlines():
        linea = linea.strip()
        if not linea:
            cerrar()
            continue
        if linea.startswith('#,') and 'fuzzy' in linea:
            fuzzy = True
        if linea.startswith('#'):
            continue
        if linea.startswith('"'):
            actual[campo] += ast.literal_eval(linea)
            continue
        if linea.startswith('msgid ') and 'msgid' in actual and campo != 'msgid':
            cerrar()
        campo, _, valor = linea.partition(' ')
        actual[campo] = ast.literal_eval(valor)
    cerrar()
    return entradas


def escribir_mo(entradas, ruta):
    claves = sorted(entradas)
    ids = [k.encode('utf-8') for k in claves]
    strs = [entradas[k].encode('utf-8') for k in claves]
    n = len(claves)
    inicio_ids = 7 * 4
    inicio_strs = inicio_ids + n * 8
    datos = inicio_strs + n * 8
    tabla_ids, tabla_strs, cuerpo = [], [], b''
    for texto in ids:
        tabla_ids.append((len(texto), datos + len(cuerpo)))
        cuerpo += texto + b'\0'
    for texto in strs:
        tabla_strs.append((len(texto), datos + len(cuerpo)))
        cuerpo += texto + b'\0'
    salida = struct.pack('<7I', 0x950412DE, 0, n, inicio_ids, inicio_strs, 0, 0)
    for largo, pos in tabla_ids + tabla_strs:
        salida += struct.pack('<2I', largo, pos)
    Path(ruta).write_bytes(salida + cuerpo)


class Command(BaseCommand):
    help = 'Compila los archivos .po de scr/locale en .mo (sin GNU gettext).'

    def handle(self, *args, **options):
        total = 0
        for carpeta in settings.LOCALE_PATHS:
            for po in Path(carpeta).rglob('*.po'):
                entradas = leer_po(po)
                escribir_mo(entradas, po.with_suffix('.mo'))
                total += 1
                self.stdout.write(f'{po.relative_to(Path(carpeta).parent)}: {len(entradas) - 1} textos traducidos')
        self.stdout.write(self.style.SUCCESS(f'Listo ({total} archivo/s). Reiniciá el servidor para ver los cambios.'))
