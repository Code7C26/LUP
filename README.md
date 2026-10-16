<p align="center">

  <img src="jpg/dise%C3%B1o/lup%20logo.png" alt="Lüp Logo" width="300">

</p>

<p align="center">

  <strong>Una segunda oportunidad para cada alimento.</strong>

</p>

<p align="center">

![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-71A24D?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-073425?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-073425?style=for-the-badge&logo=django)
![IA](https://img.shields.io/badge/Inteligencia%20Artificial-ABBFA7?style=for-the-badge&labelColor=073425)
![Economía Circular](https://img.shields.io/badge/Economía%20Circular-71A24D?style=for-the-badge)

</p>

---

## <img src="jpg/doc_assets/icon_hoja.png" width="40"> ¿Qué es Lüp?

Lüp es una plataforma inteligente que conecta comercios, consumidores y organizaciones para reducir el desperdicio alimentario mediante la venta con descuento y la gestión responsable de excedentes.

Nuestro objetivo es transformar alimentos próximos a vencer en oportunidades, generando un impacto **ambiental**, **social** y **económico**.

---

## <img src="jpg/doc_assets/icon_grafico.png" width="40"> Objetivos

- Reducir el desperdicio alimentario.
- Promover la economía circular.
- Disminuir pérdidas económicas en comercios.
- Facilitar el acceso a alimentos a menor costo.
- Impulsar donaciones responsables.
- Incorporar Inteligencia Artificial para optimizar la gestión de excedentes.

---

## <img src="jpg/doc_assets/icon_tienda.png" width="40"> Funcionalidades

### Comercios

- Publicación de excedentes.
- Descuentos inteligentes.
- Gestión de stock.
- Estadísticas de impacto.

### Consumidores

- Productos cercanos con descuento.
- Reserva desde la aplicación.
- Historial de compras.

### Organizaciones

- Gestión de donaciones.
- Solicitud de alimentos.

### Inteligencia Artificial

- Reconocimiento de productos.
- Carga automática de información.
- Recomendación de descuentos.
- Indicadores ambientales.

---

## <img src="jpg/doc_assets/icon_grafico.png" width="40"> Impacto

| Ambiental | Social | Económico |
|-----------|--------|-----------|
| 🌿 Menos desperdicio | 🤝 Mayor acceso a alimentos | 💰 Menores pérdidas |
| ♻️ Economía circular | ❤️ Apoyo a organizaciones | 📦 Mejor aprovechamiento |
| 🌎 Reducción de residuos | 👥 Consumo responsable | 📈 Optimización del stock |

---

## <img src="jpg/doc_assets/icon_reloj.png" width="40"> Tecnologías

- Python 3 + Django 6.1
- Django REST Framework (API para la app móvil)
- HTML
- CSS
- JavaScript
- Bootstrap
- SQLite (desarrollo) · PostgreSQL previsto para producción
- Git & GitHub
- Inteligencia Artificial

---

## <img src="jpg/doc_assets/icon_tienda2.png" width="40"> Estructura

```text
LUP/
├── .gitignore
├── README.md
├── requirements.txt
├── manage.py
│
├── scr/                          <-- 🌐 CÓDIGO FUENTE DE LA PÁGINA WEB
│   ├── lup/                      <-- Configuración principal de Django (settings, urls)
│   ├── bd_lup/                   <-- Aplicaciones internas
│   │   ├── users/                <-- Usuario personalizado, organizaciones, login y registro
│   │   ├── stores/               <-- Perfil de comercio (Tienda)
│   │   └── products/             <-- Productos, reservas, donaciones, API y paneles
│   ├── templates/                <-- Plantillas HTML
│   └── static/                   <-- CSS, JS e imágenes de la web
│
├── app/                          <-- 📱 APP MÓVIL (por ahora solo README con la API disponible)
│
├── doc/                          <-- 📄 DOCUMENTACIÓN DEL PROYECTO
│   ├── comercio/                 <-- Break-even, costos, FODA, investigación de mercado
│   ├── legales/                  <-- Pasos legales y propiedad intelectual
│   └── manuales - de empresa/    <-- Backlog, documentación inicial, mockup, propuesta de valor
│
├── jpg/                          <-- 🖼️ IMÁGENES DE DOCUMENTACIÓN
│   ├── diseño/                   <-- Logo y sublogo de Lüp
│   ├── doc_assets/               <-- Íconos usados en este README
│   ├── comercio/                 <-- Gráfico FODA, modelo de negocio
│   └── manuales - de empresa/    <-- Balance del MVP
│
└── media/                        <-- Fotos subidas desde la web (se crea sola, no se sube a git)
```

---

## <img src="jpg/doc_assets/icon_grafico.png" width="40"> Estado Técnico Actual

Plataforma web funcional en Django con tres tipos de cuenta:

| Rol | Puede |
|-----|-------|
| **Consumidor** | Buscar y filtrar ofertas, reservar con código de retiro, cancelar reservas, ver historial y ahorro. |
| **Comercio** | Publicar / editar / eliminar excedentes con vista previa en vivo, confirmar retiros por código, aprobar donaciones, ver estadísticas. |
| **Organización** | Solicitar productos marcados como donables y seguir el estado de sus solicitudes. |

- **Apps:** `users` (usuario personalizado `Usuario` + perfil `Organizacion`), `stores` (perfil `Tienda` del comercio) y `products` (`Producto`, `Reserva`, `SolicitudDonacion`).
- **Login** con usuario o email y selector de tipo de cuenta; **registro** guiado en 2 pasos según el rol.
- **API REST** de solo lectura en `/api/productos/` para la futura app móvil.
- **Tests** automáticos de todos los flujos (`python manage.py test scr`).

---

## <img src="jpg/doc_assets/icon_reloj.png" width="40"> Cómo ejecutarlo

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py cargar_demo      # opcional: comercios, ofertas y usuarios de ejemplo
python manage.py createsuperuser  # opcional: acceso a /admin
python manage.py runserver
```

Abrí http://127.0.0.1:8000. Usuarios de demo (clave `LupDemo2026!`): `panaderia_sol` (comercio), `consumidor_demo` (consumidor) y `comedor_demo` (organización).

> Si tenías una base `db.sqlite3` de una versión anterior, borrala antes de `migrate`: los modelos se unificaron y las migraciones se regeneraron desde cero.
>
> Las fotos de productos ahora se guardan en `media/` (antes en `scr/jpg/`). Si tenés fotos viejas en tu compu, movelas de `scr/jpg/productos/` a `media/productos/`.

---


<p align="center">

**Más valor. Menos desperdicio.**

</p>

