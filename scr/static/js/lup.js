/* ==========================================================
   Lüp · Interacciones del sitio
   ========================================================== */
(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    /* ---------- Modo oscuro / claro ---------- */
    // El tema inicial lo aplica un script en el <head> de base.html.
    const raiz = document.documentElement;
    const botonesTema = $$('[data-cambiar-tema]');
    const etiquetarBotones = () => {
        const oscuro = raiz.getAttribute('data-bs-theme') === 'dark';
        botonesTema.forEach((b) => {
            b.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
            b.setAttribute('aria-pressed', oscuro ? 'true' : 'false');
        });
    };
    botonesTema.forEach((b) => b.addEventListener('click', () => {
        const nuevo = raiz.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        raiz.setAttribute('data-bs-theme', nuevo);
        try { localStorage.setItem('lup-tema', nuevo); } catch (e) { /* modo privado: no se recuerda */ }
        etiquetarBotones();
    }));
    // Si la persona no eligió nada, seguir los cambios del sistema operativo
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            let guardado = null;
            try { guardado = localStorage.getItem('lup-tema'); } catch (err) { /* sin storage */ }
            if (!guardado) { raiz.setAttribute('data-bs-theme', e.matches ? 'dark' : 'light'); etiquetarBotones(); }
        });
    }
    etiquetarBotones();

    /* ---------- Navbar con sombra al hacer scroll ---------- */
    const navbar = $('.navbar-lup');
    if (navbar) {
        const actualizar = () => navbar.classList.toggle('scrolled', window.scrollY > 8);
        window.addEventListener('scroll', actualizar, { passive: true });
        actualizar();
    }

    /* ---------- Mensajes como toasts ---------- */
    if (window.bootstrap) {
        $$('.toast').forEach((el) => new bootstrap.Toast(el, { delay: 6000 }).show());
    }

    /* ---------- Animación de aparición ---------- */
    const revelables = $$('.revelar');
    if ('IntersectionObserver' in window && revelables.length) {
        const obs = new IntersectionObserver((entradas) => {
            entradas.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.12 });
        revelables.forEach((el) => obs.observe(el));
    } else {
        revelables.forEach((el) => el.classList.add('visible'));
    }

    /* ---------- Contadores animados ---------- */
    const contadores = $$('[data-contador]');
    if (contadores.length && 'IntersectionObserver' in window) {
        const animar = (el) => {
            const final = parseInt(el.dataset.contador, 10) || 0;
            const dur = 1200;
            const inicio = performance.now();
            const paso = (t) => {
                const p = Math.min((t - inicio) / dur, 1);
                el.textContent = Math.round(final * (1 - Math.pow(1 - p, 3))).toLocaleString('es-AR');
                if (p < 1) requestAnimationFrame(paso);
            };
            requestAnimationFrame(paso);
        };
        const obs = new IntersectionObserver((entradas) => {
            entradas.forEach((e) => {
                if (e.isIntersecting) { animar(e.target); obs.unobserve(e.target); }
            });
        });
        contadores.forEach((el) => obs.observe(el));
    }

    /* ---------- Mostrar / ocultar contraseña ---------- */
    $$('input[type="password"]').forEach((input) => {
        if (input.closest('.campo-password')) return;
        const wrap = document.createElement('div');
        wrap.className = 'campo-password';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toggle-password';
        btn.setAttribute('aria-label', 'Mostrar contraseña');
        btn.innerHTML = '<i class="bi bi-eye"></i>';
        btn.addEventListener('click', () => {
            const visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            btn.innerHTML = visible ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
            btn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
        });
        wrap.appendChild(btn);
    });

    /* ---------- Medidor de fuerza de contraseña ---------- */
    const pass1 = $('#id_password1');
    if (pass1) {
        const barra = document.createElement('div');
        barra.className = 'fuerza';
        barra.innerHTML = '<span></span>';
        const texto = document.createElement('div');
        texto.className = 'form-text';
        pass1.closest('.campo-password').after(barra, texto);
        const span = barra.firstChild;
        const niveles = [
            ['0%', '#d64545', ''],
            ['25%', '#d64545', 'Muy débil'],
            ['50%', '#E39B2D', 'Débil'],
            ['75%', '#9bbf3b', 'Buena'],
            ['100%', '#4f8a35', '¡Excelente!'],
        ];
        pass1.addEventListener('input', () => {
            const v = pass1.value;
            let puntos = 0;
            if (v.length >= 8) puntos++;
            if (/[A-Z]/.test(v) && /[a-z]/.test(v)) puntos++;
            if (/\d/.test(v)) puntos++;
            if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) puntos++;
            if (!v) puntos = 0;
            const [ancho, color, etiqueta] = niveles[puntos];
            span.style.width = ancho;
            span.style.background = color;
            texto.textContent = etiqueta;
        });
    }

    /* ---------- Selector de rol en el login ---------- */
    const selector = $('.selector-rol');
    if (selector) {
        const inputRol = $('#id_rol');
        const botonEnviar = $('#btn-ingresar');
        const linkRegistro = $('#link-registro');
        selector.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button[data-rol]');
            if (!btn) return;
            $$('button', selector).forEach((b) => {
                b.classList.toggle('activo', b === btn);
                b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
            });
            const rol = btn.dataset.rol;
            if (inputRol) inputRol.value = rol;
            $$('[data-rol-info]').forEach((el) => { el.hidden = el.dataset.rolInfo !== rol; });
            if (botonEnviar) botonEnviar.textContent = 'Ingresar como ' + btn.dataset.titulo.toLowerCase();
            if (linkRegistro) linkRegistro.href = linkRegistro.dataset.base.replace('__rol__', rol);
        });
    }

    /* ---------- Validación en el cliente (Bootstrap) ---------- */
    $$('form.needs-validation').forEach((form) => {
        form.addEventListener('submit', (ev) => {
            if (!form.checkValidity()) {
                ev.preventDefault();
                ev.stopPropagation();
                const primero = form.querySelector(':invalid');
                if (primero) primero.focus();
            } else {
                const btn = form.querySelector('[type="submit"]');
                if (btn) {
                    btn.disabled = true;
                    btn.dataset.textoOriginal = btn.innerHTML;
                    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
                }
            }
            form.classList.add('was-validated');
        });
    });

    /* ---------- Formateo automático de CUIT ---------- */
    const cuit = $('#id_cuit');
    if (cuit) {
        cuit.addEventListener('input', () => {
            const d = cuit.value.replace(/\D/g, '').slice(0, 11);
            let out = d;
            if (d.length > 2) out = d.slice(0, 2) + '-' + d.slice(2);
            if (d.length > 10) out = d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10);
            cuit.value = out;
        });
    }

    /* ---------- Catálogo: filtros en vivo ---------- */
    const formFiltros = $('#form-filtros');
    const grilla = $('#grilla-productos');
    if (formFiltros && grilla) {
        let temporizador;
        let controlador;
        const contador = $('#contador-resultados');

        const actualizar = () => {
            const params = new URLSearchParams(new FormData(formFiltros));
            for (const [k, v] of Array.from(params.entries())) { if (!v) params.delete(k); }
            const url = formFiltros.action + (params.toString() ? '?' + params : '');
            history.replaceState(null, '', url);
            if (controlador) controlador.abort();
            controlador = new AbortController();
            grilla.classList.add('cargando');
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, signal: controlador.signal })
                .then((r) => r.text())
                .then((html) => {
                    grilla.innerHTML = html;
                    const total = grilla.querySelector('[data-total]');
                    if (contador && total) contador.textContent = total.dataset.total;
                })
                .catch((err) => { if (err.name !== 'AbortError') formFiltros.submit(); })
                .finally(() => grilla.classList.remove('cargando'));
        };

        formFiltros.addEventListener('input', (ev) => {
            clearTimeout(temporizador);
            temporizador = setTimeout(actualizar, ev.target.type === 'search' ? 300 : 0);
        });
        formFiltros.addEventListener('submit', (ev) => { ev.preventDefault(); actualizar(); });

        // Chips de categoría
        $$('.chip[data-categoria]').forEach((chip) => {
            chip.addEventListener('click', () => {
                $$('.chip[data-categoria]').forEach((c) => c.classList.toggle('activo', c === chip));
                $('#id_categoria_filtro').value = chip.dataset.categoria;
                actualizar();
            });
        });
    }

    /* ---------- Selector de cantidad + total ---------- */
    $$('.cantidad').forEach((caja) => {
        const input = $('input', caja);
        const total = $('#total-reserva');
        const precio = parseFloat((total && total.dataset.precio) || '0');
        const max = parseInt(input.max || '99', 10);
        const refrescar = () => {
            let v = parseInt(input.value, 10) || 1;
            v = Math.max(1, Math.min(max, v));
            input.value = v;
            if (total) total.textContent = '$' + (precio * v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        caja.addEventListener('click', (ev) => {
            const b = ev.target.closest('button[data-delta]');
            if (!b) return;
            input.value = (parseInt(input.value, 10) || 1) + parseInt(b.dataset.delta, 10);
            refrescar();
        });
        input.addEventListener('input', refrescar);
        refrescar();
    });

    /* ---------- Publicar excedente: vista previa en vivo ---------- */
    const formProducto = $('#form-producto');
    if (formProducto) {
        const campo = (n) => $('#id_' + n);
        const pv = (n) => $('[data-preview="' + n + '"]');
        const formato = (n) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

        const refrescar = () => {
            const titulo = campo('titulo').value.trim();
            pv('titulo').textContent = titulo || 'Título de tu oferta';
            const desc = campo('descripcion').value.trim();
            pv('descripcion').textContent = desc ? desc.slice(0, 90) + (desc.length > 90 ? '…' : '') : 'Así verán los consumidores tu publicación.';
            const orig = parseFloat(campo('precio_original').value);
            const desc2 = parseFloat(campo('precio_descuento').value);
            pv('precio').textContent = formato(desc2);
            pv('antes').textContent = orig ? formato(orig) : '';
            const badge = pv('descuento');
            const aviso = $('#aviso-precio');
            if (orig > 0 && desc2 >= 0 && desc2 < orig) {
                badge.hidden = false;
                badge.textContent = '-' + Math.round((1 - desc2 / orig) * 100) + '%';
            } else {
                badge.hidden = true;
            }
            if (aviso) aviso.hidden = !(orig > 0 && desc2 > orig);
            pv('donacion').hidden = !campo('es_donacion').checked;
            pv('stock').textContent = (campo('stock').value || 1) + ' disp.';
            const cat = campo('categoria');
            pv('categoria').textContent = cat.options[cat.selectedIndex].text;
        };
        formProducto.addEventListener('input', refrescar);
        formProducto.addEventListener('change', refrescar);
        refrescar();

        const img = campo('imagen');
        if (img) {
            img.addEventListener('change', () => {
                const archivo = img.files && img.files[0];
                if (!archivo) return;
                const lector = new FileReader();
                lector.onload = (e) => {
                    const foto = pv('foto');
                    foto.innerHTML = '';
                    const el = document.createElement('img');
                    el.src = e.target.result;
                    el.alt = 'Vista previa';
                    foto.appendChild(el);
                };
                lector.readAsDataURL(archivo);
            });
        }

        // Atajos de descuento
        $$('[data-descuento]').forEach((b) => {
            b.addEventListener('click', () => {
                const orig = parseFloat(campo('precio_original').value);
                if (!orig) { campo('precio_original').focus(); return; }
                campo('precio_descuento').value = (orig * (1 - b.dataset.descuento / 100)).toFixed(2);
                refrescar();
            });
        });
    }

    /* ---------- Foto de perfil: vista previa antes de guardar ---------- */
    const inputFoto = $('#id_u-foto');
    const previewAvatar = $('#preview-avatar');
    if (inputFoto && previewAvatar) {
        const quitar = $('#id_u-quitar_foto');
        const ayuda = $('#ayuda-foto');
        const textoAyuda = ayuda ? ayuda.textContent : '';
        inputFoto.addEventListener('change', () => {
            const archivo = inputFoto.files && inputFoto.files[0];
            if (!archivo) return;
            if (archivo.size > 5 * 1024 * 1024) {
                inputFoto.value = '';
                if (ayuda) { ayuda.textContent = 'Esa imagen pesa más de 5 MB. Probá con una más liviana.'; ayuda.classList.add('text-danger'); }
                return;
            }
            if (ayuda) { ayuda.textContent = textoAyuda; ayuda.classList.remove('text-danger'); }
            const lector = new FileReader();
            lector.onload = (e) => {
                previewAvatar.innerHTML = '';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Vista previa de tu foto';
                previewAvatar.appendChild(img);
                previewAvatar.classList.add('con-foto');
                previewAvatar.style.opacity = '';
            };
            lector.readAsDataURL(archivo);
            if (quitar) quitar.checked = false;
        });
        if (quitar) {
            quitar.addEventListener('change', () => {
                previewAvatar.style.opacity = quitar.checked ? '.35' : '';
                if (quitar.checked) inputFoto.value = '';
            });
        }
    }

    /* ==========================================================
       Ubicación del dispositivo (Geolocation API del navegador)
       ========================================================== */
    const CLAVE_UBICACION = 'lup-ubicacion';
    const UBICACION_VALIDA_MS = 30 * 60 * 1000; // se reutiliza durante 30 minutos

    const ubicacionGuardada = () => {
        try {
            const u = JSON.parse(localStorage.getItem(CLAVE_UBICACION) || 'null');
            if (u && Date.now() - u.t < UBICACION_VALIDA_MS) return u;
        } catch (e) { /* sin storage */ }
        return null;
    };

    const mensajeErrorUbicacion = (err) => {
        if (!window.isSecureContext) return 'El navegador solo comparte la ubicación en sitios seguros (https o localhost).';
        if (!err) return 'Tu navegador no permite obtener la ubicación.';
        if (err.code === 1) return 'No diste permiso para usar tu ubicación. Podés activarlo desde el candado de la barra de direcciones.';
        if (err.code === 3) return 'Tardó demasiado en encontrar tu ubicación. Probá de nuevo.';
        return 'No pudimos obtener tu ubicación. Probá de nuevo en unos segundos.';
    };

    // Pide la ubicación al dispositivo. Devuelve una promesa con {lat, lng, precision}.
    const pedirUbicacion = (opciones = {}) => new Promise((resolver, rechazar) => {
        if (!opciones.forzar) {
            const guardada = ubicacionGuardada();
            if (guardada) { resolver(guardada); return; }
        }
        if (!('geolocation' in navigator) || !window.isSecureContext) { rechazar(null); return; }
        navigator.geolocation.getCurrentPosition((pos) => {
            const u = {
                lat: +pos.coords.latitude.toFixed(6),
                lng: +pos.coords.longitude.toFixed(6),
                precision: Math.round(pos.coords.accuracy),
                t: Date.now(),
            };
            try { localStorage.setItem(CLAVE_UBICACION, JSON.stringify(u)); } catch (e) { /* sin storage */ }
            resolver(u);
        }, rechazar, { enableHighAccuracy: !!opciones.precisa, timeout: 12000, maximumAge: 60000 });
    });

    const radianes = (g) => g * Math.PI / 180;
    const distanciaKm = (a, b) => {
        const dLat = radianes(b.lat - a.lat);
        const dLng = radianes(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(radianes(a.lat)) * Math.cos(radianes(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * 6371 * Math.asin(Math.sqrt(h));
    };
    const formatoDistancia = (km) => (km < 1
        ? Math.max(Math.round(km * 100) * 10, 10) + ' m'
        : (km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)) + ' km');

    /* ---------- Catálogo: "Cerca mío" ---------- */
    const botonCerca = $('[data-cerca-mio]');
    if (botonCerca && formFiltros) {
        const inputLat = $('#id_lat');
        const inputLng = $('#id_lng');
        const selectOrden = $('#id_orden');
        const aviso = $('[data-aviso-ubicacion]');
        const textoBoton = $('span', botonCerca);

        const avisar = (texto) => { if (aviso) { aviso.textContent = texto || ''; aviso.hidden = !texto; } };
        const aplicar = (u) => {
            inputLat.value = u.lat;
            inputLng.value = u.lng;
            selectOrden.value = 'cercania';
            botonCerca.classList.add('activo');
            botonCerca.setAttribute('aria-pressed', 'true');
            textoBoton.textContent = 'Cerca tuyo';
            avisar('');
            formFiltros.dispatchEvent(new Event('submit', { cancelable: true }));
        };
        const activar = (forzar) => {
            textoBoton.textContent = 'Buscando…';
            botonCerca.disabled = true;
            pedirUbicacion({ forzar })
                .then(aplicar)
                .catch((err) => {
                    textoBoton.textContent = 'Cerca mío';
                    avisar(mensajeErrorUbicacion(err));
                    if (selectOrden.value === 'cercania' && !inputLat.value) selectOrden.value = 'recientes';
                })
                .finally(() => { botonCerca.disabled = false; });
        };

        botonCerca.addEventListener('click', () => activar(true));
        // Elegir "Más cerca" en el orden también pide la ubicación
        selectOrden.addEventListener('change', () => {
            if (selectOrden.value === 'cercania' && !inputLat.value) activar(false);
        });
        // Si la URL ya pide ordenar por cercanía (por ej. desde un link), completar la ubicación sola
        if (selectOrden.value === 'cercania' && !inputLat.value) activar(false);
    }

    /* ---------- Detalle / comercio: "A 1,2 km de vos" ---------- */
    const etiquetasDistancia = $$('[data-distancia-a]');
    if (etiquetasDistancia.length) {
        const guardada = ubicacionGuardada();
        if (guardada) {
            etiquetasDistancia.forEach((el) => {
                const [lat, lng] = el.dataset.distanciaA.split(',').map(Number);
                el.innerHTML = '<i class="bi bi-geo-alt-fill text-lup"></i> A ' + formatoDistancia(distanciaKm(guardada, { lat, lng })) + ' de vos';
            });
        }
    }

    /* ---------- Mis datos (comercio): ubicación del local ---------- */
    const bloqueLocal = $('[data-ubicacion-local]');
    if (bloqueLocal) {
        const boton = $('[data-usar-ubicacion]', bloqueLocal);
        const estado = $('[data-estado-ubicacion]', bloqueLocal);
        const mapa = $('[data-mapa]', bloqueLocal);
        const inputLat = $('#id_p-latitud');
        const inputLng = $('#id_p-longitud');
        const clave = bloqueLocal.dataset.mapsKey;

        boton.addEventListener('click', () => {
            const original = boton.innerHTML;
            boton.disabled = true;
            boton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Buscando…';
            pedirUbicacion({ forzar: true, precisa: true })
                .then((u) => {
                    inputLat.value = u.lat;
                    inputLng.value = u.lng;
                    estado.innerHTML = '<i class="bi bi-geo-alt-fill text-lup"></i> Ubicación marcada'
                        + (u.precision ? ' (±' + u.precision + ' m)' : '')
                        + '. <strong>Guardá los cambios</strong> para confirmarla.';
                    const q = encodeURIComponent(u.lat + ',' + u.lng);
                    const src = clave
                        ? 'https://www.google.com/maps/embed/v1/place?key=' + encodeURIComponent(clave) + '&q=' + q + '&zoom=17&language=es'
                        : 'https://maps.google.com/maps?q=' + q + '&z=17&hl=es&output=embed';
                    mapa.innerHTML = '<iframe src="' + src + '" title="Ubicación marcada en Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
                    mapa.hidden = false;
                })
                .catch((err) => {
                    estado.innerHTML = '<span class="text-danger">' + mensajeErrorUbicacion(err) + '</span>';
                })
                .finally(() => { boton.disabled = false; boton.innerHTML = original; });
        });
    }

    /* ---------- Confirmaciones ---------- */
    document.addEventListener('submit', (ev) => {
        const msg = ev.target.dataset && ev.target.dataset.confirmar;
        if (msg && !window.confirm(msg)) ev.preventDefault();
    });

    /* ---------- Copiar código de retiro ---------- */
    $$('[data-copiar]').forEach((b) => {
        b.addEventListener('click', () => {
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(b.dataset.copiar).then(() => {
                const original = b.innerHTML;
                b.innerHTML = '<i class="bi bi-check2"></i>';
                setTimeout(() => { b.innerHTML = original; }, 1500);
            });
        });
    });
})();
