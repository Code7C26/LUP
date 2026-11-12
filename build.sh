#!/usr/bin/env bash
# Lo corre Render en cada actualización, antes de publicar (ver render.yaml).
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py compilar_traducciones
