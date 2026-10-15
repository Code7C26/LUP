<p align="center">

  <img src="jpg/diseño/lup logo.png" alt="Lüp Logo" width="300">

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

- Python
- Django
- HTML
- CSS
- JavaScript
- Bootstrap
- SQLite / PostgreSQL
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
│   ├── bd_lup/                   <-- Aplicaciones internas 
│   └── lup/                      <-- Configuración principal de Django 
│
├── app/                          <-- 📱 CÓDIGO FUENTE DE LA APP MÓVIL (React Native / Expo / Flutter)
│   ├── src/
│   ├── assets/
│   └── App.js
│
├── doc/                          <-- 📄 DOCUMENTACIÓN Y RECURSOS DEL PROYECTO
│   ├── diseno/                   <-- Wireframes, Figma, paleta de colores, maquetas
│   ├── comercio/                 <-- Requerimientos de comercios, minutas de reuniones, PDFs
│   ├── legal/                    <-- Términos y condiciones, contratos, alianzas
│   └── manuales/                 <-- Manuales de usuario, guías de instalación
│
└── jpg/                          <-- 🖼️ IMÁGENES Y RECURSOS GRÁFICOS
    ├── doc_assets/               <-- Capturas o fotos usadas en la documentación (ej. del README)
    ├── productos/                <-- Fotos de prueba de productos/ofertas
    ├── comercios/                <-- Logos/fotos de prueba de los comercios
    └── marcas/                   <-- Logos oficiales de LÜP (isotipo, imagotipo, favicon)
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

---


<p align="center">

**Más valor. Menos desperdicio.**

</p>

