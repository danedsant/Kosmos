const API_URL = '../api';

if (!KosmosAuth.requireAuth()) {
    throw new Error('No autenticado');
}

const user = KosmosAuth.getUser();

// Header
document.getElementById('user-name').textContent = KosmosAuth.getFullName();
const rolEl = document.getElementById('user-rol');
rolEl.textContent = user.rol;
rolEl.className = 'user-rol ' + user.rol.toLowerCase();

// ================= CACHES ================= //
let usuariosCache = [];
let eventosCache = [];

async function loadUsuariosCache() {
    const data = await apiGet('usuarios.php');
    if (data.status === 'success') usuariosCache = data.data;
}

function getUsuarioNombre(id) {
    const u = usuariosCache.find(u => u.id === id);
    return u ? u.nombre + ' ' + (u.apellido || '') : id || 'N/A';
}

function getEventoNombre(id) {
    const ev = eventosCache.find(e => e.id === id);
    return ev ? ev.nombre : id || 'N/A';
}

function getPonentesNombres(ponentesIds) {
    if (!ponentesIds || !Array.isArray(ponentesIds) || ponentesIds.length === 0) {
        return 'Por asignar';
    }
    const nombres = ponentesIds
        .map(id => getUsuarioNombre(id))
        .filter(n => n && n !== 'N/A');
    return nombres.length > 0 ? nombres.join(', ') : 'Por asignar';
}

async function loadEventosCache() {
    const data = await apiGet('eventos.php');
    if (data.status === 'success') eventosCache = data.data;
}

// ================= NAV DINAMICA ================= //
function buildNav() {
    const nav = document.getElementById('main-nav');
    let buttons = [];

    if (KosmosAuth.isAdmin()) {
        buttons.push({ id: 'nav-eventos', label: 'Eventos', view: 'eventos' });
        buttons.push({ id: 'nav-usuarios', label: 'Usuarios', view: 'usuarios' });
        buttons.push({ id: 'nav-inscripciones', label: 'Inscripciones', view: 'inscripciones' });
        buttons.push({ id: 'nav-certificados', label: 'Certificados', view: 'certificados' });
        buttons.push({ id: 'nav-reportes', label: 'Reportes', view: 'reportes' });
    } else if (KosmosAuth.isOrganizador()) {
        buttons.push({ id: 'nav-eventos', label: 'Eventos', view: 'eventos' });
        buttons.push({ id: 'nav-ponentes', label: 'Ponentes', view: 'ponentes' });
        buttons.push({ id: 'nav-inscripciones', label: 'Inscripciones', view: 'inscripciones' });
        buttons.push({ id: 'nav-certificados', label: 'Certificados', view: 'certificados' });
        buttons.push({ id: 'nav-reportes', label: 'Reportes', view: 'reportes' });
    } else if (KosmosAuth.isPonente()) {
        buttons.push({ id: 'nav-mis-eventos', label: 'Mis Eventos', view: 'ponente_eventos' });
        buttons.push({ id: 'nav-mis-certificados', label: 'Mis Certificados', view: 'ponente_certificados' });
        buttons.push({ id: 'nav-mi-perfil', label: 'Mi Perfil', view: 'editar_perfil' });
    } else if (KosmosAuth.isParticipante()) {
        buttons.push({ id: 'nav-eventos', label: 'Eventos', view: 'eventos' });
        buttons.push({ id: 'nav-mis-inscripciones', label: 'Mis Inscripciones', view: 'participante_inscripciones' });
        buttons.push({ id: 'nav-mis-certificados', label: 'Mis Certificados', view: 'participante_certificados' });
        buttons.push({ id: 'nav-mi-perfil', label: 'Mi Perfil', view: 'editar_perfil' });
    }

    nav.innerHTML = buttons.map((b, i) =>
        `<button id="${b.id}" class="${i === 0 ? 'active' : ''}" data-view="${b.view}">${b.label}</button>`
    ).join('');

    nav.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadView(e.target.dataset.view);
        });
    });

    if (buttons.length > 0) {
        loadView(buttons[0].view);
    }
}

const views = {};

// ===== VISTA EVENTOS =====
views.eventos = `
    <div class="section-header">
        <h1>Gestion de Eventos</h1>
        ${KosmosAuth.soloOrganizador() ? '<button class="btn" onclick="openEventModal()">+ Nuevo Evento</button>' : ''}
    </div>
    <div class="filters-bar">
        <select id="filter-event-estado" class="form-control" onchange="fetchEventos()">
            <option value="">Todos los estados</option>
            <option value="planificado">Planificado</option>
            <option value="activo">Activo</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
        </select>
    </div>
    <div id="event-grid" class="grid-container">Cargando eventos...</div>
`;

// ===== VISTA USUARIOS (Solo Admin) =====
views.usuarios = `
    <div class="section-header">
        <h1>Gestion de Usuarios</h1>
        ${KosmosAuth.canManageUsers() ? '<button class="btn" onclick="openUserModal()">+ Nuevo Usuario</button>' : ''}
    </div>
    <div class="filters-bar">
        <select id="filter-user-rol" class="form-control" onchange="fetchUsuarios()">
            <option value="">Todos los roles</option>
            <option value="Admin">Admin</option>
            <option value="Organizador">Organizador</option>
            <option value="Ponente">Ponente</option>
            <option value="Participante">Participante</option>
        </select>
    </div>
    <div id="user-grid" class="grid-container">Cargando usuarios...</div>
`;

// ===== VISTA PONENTES (Organizador/Admin) =====
views.ponentes = `
    <div class="section-header">
        <h1>Gestion de Ponentes</h1>
        ${KosmosAuth.canCreatePonente() ? '<button class="btn" onclick="openPonenteModal()">+ Nuevo Ponente</button>' : ''}
    </div>
    <div id="ponente-grid" class="grid-container">Cargando ponentes...</div>
`;

// ===== VISTA INSCRIPCIONES =====
views.inscripciones = `
    <div class="section-header">
        <h1>Inscripciones</h1>
    </div>
    <div class="filters-bar" style="display: flex; gap: 12px; flex-wrap: wrap;">
        <select id="filter-insc-tipo-evento" class="form-control" style="min-width: 220px;" onchange="onInscTipoFilterChange()">
            <option value="">Todos los tipos de evento</option>
        </select>
        <select id="filter-insc-evento" class="form-control" style="min-width: 240px;" onchange="fetchInscripciones()">
            <option value="">Todos los eventos</option>
        </select>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Evento</th>
                    <th>Tipo Evento</th>
                    <th>Participante</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Asistencia</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="inscripciones-tbody"></tbody>
        </table>
    </div>
`;

// ===== VISTA CERTIFICADOS =====
views.certificados = `
    <div class="section-header">
        <h1>Certificados</h1>
    </div>
    <div class="filters-bar" style="display: flex; gap: 12px; flex-wrap: wrap;">
        <select id="filter-cert-tipo-evento" class="form-control" style="min-width: 220px;" onchange="onCertTipoFilterChange()">
            <option value="">Todos los tipos de evento</option>
        </select>
        <select id="filter-cert-evento" class="form-control" style="min-width: 240px;" onchange="fetchCertificados()">
            <option value="">Todos los eventos</option>
        </select>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Codigo</th>
                    <th>Evento</th>
                    <th>Tipo Evento</th>
                    <th>Participante</th>
                    <th>Rol / Certificado</th>
                    <th>Horas</th>
                    <th>Fecha Emision</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="certificados-tbody"></tbody>
        </table>
    </div>
`;

// ===== VISTA REPORTES =====
views.reportes = `
    <div class="section-header">
        <h1>Reportes y Consultas</h1>
    </div>
    <div class="report-grid">
        <div class="report-card" onclick="ejecutarConsulta(1)">
            <h3>1. Eventos en un mes</h3>
            <p>Eventos existentes en un mes determinado</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(2)">
            <h3>2. Ponentes de un evento</h3>
            <p>Quienes son los ponentes de un evento determinado</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(3)">
            <h3>3. Participantes inscritos</h3>
            <p>Participantes inscritos en un evento determinado</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(4)">
            <h3>4. Eventos de un ponente</h3>
            <p>Que eventos ha dictado un ponente especifico</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(5)">
            <h3>5. Participantes por evento</h3>
            <p>Cantidad de participantes inscritos por cada evento</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(6)">
            <h3>6. Asistencia confirmada</h3>
            <p>Participantes que asistieron a un evento determinado</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(7)">
            <h3>7. Certificados generados</h3>
            <p>Certificados que se han generado en el sistema</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(8)">
            <h3>8. Eventos por tipo</h3>
            <p>Eventos de un tipo determinado</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(9)">
            <h3>9. Temas tratados</h3>
            <p>Temas que se han cubierto en los eventos</p>
        </div>
        <div class="report-card" onclick="ejecutarConsulta(10)">
            <h3>10. Evento mas popular</h3>
            <p>El evento con mayor cantidad de participantes</p>
        </div>
    </div>
    <div id="report-result" class="report-result" style="display:none"></div>
`;

// ===== VISTA PONENTE EVENTOS =====
views.ponente_eventos = `
    <div class="section-header">
        <h1>Mis Eventos Asignados</h1>
    </div>
    <div id="ponente-event-grid" class="grid-container">Cargando eventos...</div>
`;

// ===== VISTA PONENTE CERTIFICADOS =====
views.ponente_certificados = `
    <div class="section-header">
        <h1>Mis Certificados como Ponente</h1>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Codigo</th>
                    <th>Evento</th>
                    <th>Tipo Evento</th>
                    <th>Horas</th>
                    <th>Fecha Emision</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="ponente-certificados-tbody"></tbody>
        </table>
    </div>
`;

// ===== VISTA EDITAR PERFIL =====
views.editar_perfil = `
    <div class="section-header">
        <h1>Mi Perfil</h1>
    </div>
    <div class="card" style="max-width:500px">
        <h3 class="card-title">${KosmosAuth.getFullName()}</h3>
        <div class="card-detail"><strong>Rol:</strong> ${user.rol}</div>
        <div class="card-detail"><strong>Cédula:</strong> ${user.cedula || 'N/A'}</div>
        ${user.especialidad ? `<div class="card-detail"><strong>Especialidad:</strong> ${user.especialidad}</div>` : ''}
        ${user.institucion ? `<div class="card-detail"><strong>Institución:</strong> ${user.institucion}</div>` : ''}
        ${user.profesion ? `<div class="card-detail"><strong>Profesión:</strong> ${user.profesion}</div>` : ''}
    </div>
    <div style="max-width:500px;margin-top:1.5rem">
        <h3 style="margin-bottom:1rem;color:var(--text-secondary)">Editar Datos</h3>
        <form id="profile-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" id="p-nombre" class="form-control" value="${user.nombre || ''}" required>
                </div>
                <div class="form-group">
                    <label>Apellido</label>
                    <input type="text" id="p-apellido" class="form-control" value="${user.apellido || ''}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="p-email" class="form-control" value="${user.email || ''}" required>
            </div>
            <div class="form-group">
                <label>Nueva Contrasena (dejar vacio para no cambiar)</label>
                <input type="password" id="p-password" class="form-control" minlength="6" placeholder="Minimo 6 caracteres">
            </div>
            <div id="profile-msg" style="display:none;margin-bottom:1rem"></div>
            <button type="submit" class="btn">Guardar Cambios</button>
        </form>
    </div>
`;

// ===== VISTA PARTICIPANTE =====
views.participante_inscripciones = `
    <div class="section-header">
        <h1>Mis Inscripciones</h1>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Evento</th>
                    <th>Tipo Evento</th>
                    <th>Fecha Inscripcion</th>
                    <th>Estado</th>
                    <th>Asistencia</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="mi-inscripciones-tbody"></tbody>
        </table>
    </div>
`;

views.participante_certificados = `
    <div class="section-header">
        <h1>Mis Certificados</h1>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Codigo</th>
                    <th>Evento</th>
                    <th>Tipo Evento</th>
                    <th>Horas</th>
                    <th>Fecha Emision</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="mis-certificados-tbody"></tbody>
        </table>
    </div>
`;

function loadView(viewName) {
    document.getElementById('main-content').innerHTML = views[viewName] || '<p>Vista no encontrada.</p>';

    switch(viewName) {
        case 'eventos': fetchEventos(); break;
        case 'usuarios': fetchUsuarios(); break;
        case 'ponentes': fetchPONENTES(); break;
        case 'inscripciones': fetchInscripciones(); break;
        case 'certificados': fetchCertificados(); break;
        case 'ponente_eventos': fetchPonenteEventos(); break;
        case 'ponente_certificados': fetchPonenteCertificados(); break;
        case 'participante_inscripciones': fetchMiInscripciones(); break;
        case 'participante_certificados': fetchMisCertificados(); break;
        case 'editar_perfil': setupProfileForm(); break;
    }
}

// ================= UTILIDADES ================= //

window.openModal = function(id) { document.getElementById(id).classList.add('active'); }
window.closeModal = function(id) { document.getElementById(id).classList.remove('active'); }

window.mostrarAlerta = function(mensaje, tipo = 'info', titulo = '') {
    return new Promise(resolve => {
        const iconWrap = document.getElementById('dialog-icon');
        const titleEl = document.getElementById('dialog-title');
        const msgEl = document.getElementById('dialog-message');
        const actionsEl = document.getElementById('dialog-actions');

        const icons = {
            success: '✓',
            danger: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const defaultTitles = {
            success: 'Operación Exitosa',
            danger: 'Error',
            warning: 'Atención',
            info: 'Información'
        };

        if (iconWrap) {
            iconWrap.className = `dialog-icon-wrap ${tipo}`;
            iconWrap.textContent = icons[tipo] || 'ℹ';
        }
        if (titleEl) titleEl.textContent = titulo || defaultTitles[tipo] || 'Notificación';
        if (msgEl) msgEl.textContent = mensaje;

        if (actionsEl) {
            actionsEl.innerHTML = `
                <button type="button" class="btn btn-${tipo === 'danger' ? 'danger' : 'primary'}" id="dialog-btn-accept">
                    Entendido
                </button>
            `;
            const acceptBtn = document.getElementById('dialog-btn-accept');
            acceptBtn.onclick = () => {
                closeModal('dialog-modal');
                resolve();
            };
        }

        openModal('dialog-modal');
    });
};

window.mostrarConfirmacion = function(mensaje, titulo = '¿Confirmar Acción?', tipo = 'danger', confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise(resolve => {
        const iconWrap = document.getElementById('dialog-icon');
        const titleEl = document.getElementById('dialog-title');
        const msgEl = document.getElementById('dialog-message');
        const actionsEl = document.getElementById('dialog-actions');

        if (iconWrap) {
            iconWrap.className = `dialog-icon-wrap ${tipo}`;
            iconWrap.textContent = tipo === 'danger' ? '🗑️' : (tipo === 'warning' ? '⚠' : '?');
        }
        if (titleEl) titleEl.textContent = titulo;
        if (msgEl) msgEl.textContent = mensaje;

        if (actionsEl) {
            actionsEl.innerHTML = `
                <button type="button" class="btn btn-secondary-outline" id="dialog-btn-cancel">
                    ${cancelText}
                </button>
                <button type="button" class="btn btn-${tipo === 'danger' ? 'danger' : (tipo === 'warning' ? 'warning' : 'primary')}" id="dialog-btn-confirm">
                    ${confirmText}
                </button>
            `;
            const cancelBtn = document.getElementById('dialog-btn-cancel');
            const confirmBtn = document.getElementById('dialog-btn-confirm');

            cancelBtn.onclick = () => {
                closeModal('dialog-modal');
                resolve(false);
            };
            confirmBtn.onclick = () => {
                closeModal('dialog-modal');
                resolve(true);
            };
        }

        openModal('dialog-modal');
    });
};

// Sobrescritura segura de window.alert nativo
window.alert = function(msg) {
    return window.mostrarAlerta(msg, 'info', 'Aviso del Sistema');
};

async function apiGet(endpoint) {
    const res = await fetch(`${API_URL}/${endpoint}`);
    return await res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}

async function apiPut(endpoint, data) {
    const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}

async function apiDelete(endpoint, data) {
    const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}

// ================= UTILIDADES FECHAS ================= //

function parseMongoDate(dateField) {
    if (!dateField) return null;
    if (typeof dateField === 'string') {
        const d = new Date(dateField);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof dateField === 'number') {
        const d = new Date(dateField);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof dateField === 'object') {
        if (dateField.$date !== undefined) {
            const d = new Date(typeof dateField.$date === 'number' ? dateField.$date : String(dateField.$date));
            return isNaN(d.getTime()) ? null : d;
        }
        if (dateField.date !== undefined) {
            const d = new Date(dateField.date);
            return isNaN(d.getTime()) ? null : d;
        }
        if (dateField.$numberLong !== undefined) {
            const d = new Date(parseInt(dateField.$numberLong));
            return isNaN(d.getTime()) ? null : d;
        }
    }
    const d = new Date(dateField);
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(dateField) {
    const d = parseMongoDate(dateField);
    if (!d) return 'N/A';
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(dateField) {
    const d = parseMongoDate(dateField);
    if (!d) return 'N/A';
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ================= TIPOS DE EVENTO ================= //

let tiposCache = [];

async function fetchTipos() {
    const data = await apiGet('tipos_evento.php');
    if (data.status === 'success') {
        tiposCache = data.data;
        populateTipoSelects();
    }
}

function populateTipoSelects() {
    const selects = document.querySelectorAll('#e-tipo');
    selects.forEach(sel => {
        const current = sel.value;
        sel.innerHTML = '<option value="">Seleccionar tipo...</option>' +
            tiposCache.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
        if (current) sel.value = current;
    });
}

function getTipoNombre(tipoId) {
    const tipo = tiposCache.find(t => t.id === tipoId);
    return tipo ? tipo.nombre : 'N/A';
}

// ================= EVENTOS ================= //

async function fetchEventos() {
    const grid = document.getElementById('event-grid');
    if (!grid) return;
    grid.innerHTML = 'Cargando eventos...';

    await Promise.all([loadEventosCache(), loadUsuariosCache()]);

    let eventos = eventosCache;
    const filtro = document.getElementById('filter-event-estado');
    if (filtro && filtro.value) {
        eventos = eventos.filter(e => e.estado === filtro.value);
    }

    if (eventos.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No hay eventos registrados.</p></div>';
        return;
    }

    grid.innerHTML = eventos.map(ev => `
        <div class="card">
            <h3 class="card-title">${ev.nombre}</h3>
            <div class="card-subtitle">${getTipoNombre(ev.tipoId)}</div>
            <div style="margin-bottom:0.75rem">
                <span class="badge ${ev.estado}">${ev.estado}</span>
            </div>
            <div class="card-detail"><strong>Ponente:</strong> ${getPonentesNombres(ev.ponentes_ids)}</div>
            <div class="card-detail"><strong>Organizador:</strong> ${getUsuarioNombre(ev.organizadorId)}</div>
            <div class="card-detail"><strong>Fecha:</strong> ${ev.fechaInicio || 'N/A'} - ${ev.fechaFin || 'N/A'}</div>
            <div class="card-detail"><strong>Hora:</strong> ${ev.horaInicio || 'N/A'} - ${ev.horaFin || 'N/A'}</div>
            <div class="card-detail"><strong>Cupos:</strong> ${ev.cuposDisponibles || 0}</div>
            <div class="card-actions">
                ${KosmosAuth.canManageEventos() ? `
                    <button class="btn btn-sm" onclick="openEventModal('${ev.id}')">Editar</button>
                    <button class="btn btn-sm btn-warning" onclick="openAsignarPonentes('${ev.id}')">Ponentes</button>
                    <button class="btn btn-sm" onclick="exportarXML('${ev.id}')">XML</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarEvento('${ev.id}')">Eliminar</button>
                ` : (() => {
                    const noDisponible = ['cancelado', 'finalizado'].includes(ev.estado) || (ev.cuposDisponibles || 0) <= 0;
                    const motivo = ev.estado === 'cancelado' ? 'Cancelado' : ev.estado === 'finalizado' ? 'Finalizado' : (ev.cuposDisponibles || 0) <= 0 ? 'Sin cupos' : '';
                    return noDisponible
                        ? `<button class="btn btn-sm" disabled title="${motivo}">${motivo}</button>`
                        : `<button class="btn btn-sm" onclick="inscribirse('${ev.id}')">Inscribirme</button>`;
                })()}
            </div>
        </div>
    `).join('');
}

window.openEventModal = function(id) {
    document.getElementById('event-form').reset();
    document.getElementById('e-edit-id').value = '';
    document.getElementById('e-edit-estado-original').value = '';
    document.getElementById('event-modal-title').textContent = 'Nuevo Evento';
    document.getElementById('u-password-group').style.display = 'block';

    fetchTipos().then(() => {
        if (id) {
            document.getElementById('event-modal-title').textContent = 'Editar Evento';
            document.getElementById('e-edit-id').value = id;
            apiGet('eventos.php').then(data => {
                const ev = data.data.find(e => e.id === id);
                if (ev) {
                    document.getElementById('e-nombre').value = ev.nombre || '';
                    document.getElementById('e-tipo').value = ev.tipoId || '';
                    document.getElementById('e-estado').value = ev.estado || 'planificado';
                    document.getElementById('e-edit-estado-original').value = ev.estado || 'planificado';
                    document.getElementById('e-fechaInicio').value = ev.fechaInicio || '';
                    document.getElementById('e-fechaFin').value = ev.fechaFin || '';
                    document.getElementById('e-horaInicio').value = ev.horaInicio || '';
                    document.getElementById('e-horaFin').value = ev.horaFin || '';
                    document.getElementById('e-horasDuracion').value = ev.horasDuracion || 0;
                    document.getElementById('e-cupos').value = ev.cuposDisponibles || 0;
                    document.getElementById('e-descripcion').value = ev.descripcion || '';
                    document.getElementById('e-temas').value = (ev.temas || []).join(', ');
                    if (ev.lugar) {
                        document.getElementById('e-lugar-nombre').value = ev.lugar.nombre || '';
                        document.getElementById('e-lugar-direccion').value = ev.lugar.direccion || '';
                        document.getElementById('e-lugar-aula').value = ev.lugar.aula || '';
                    }
                }
            });
        }
        openModal('event-modal');
    });
};

document.getElementById('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('e-edit-id').value;

    const estadoActual = document.getElementById('e-estado').value;
    const estadoOriginal = document.getElementById('e-edit-estado-original').value;
    const payload = {
        nombre: document.getElementById('e-nombre').value,
        tipoId: document.getElementById('e-tipo').value,
        ...(estadoActual !== estadoOriginal ? { estado: estadoActual } : {}),
        fechaInicio: document.getElementById('e-fechaInicio').value,
        fechaFin: document.getElementById('e-fechaFin').value,
        horaInicio: document.getElementById('e-horaInicio').value,
        horaFin: document.getElementById('e-horaFin').value,
        horasDuracion: parseInt(document.getElementById('e-horasDuracion').value) || 0,
        cuposDisponibles: parseInt(document.getElementById('e-cupos').value) || 0,
        descripcion: document.getElementById('e-descripcion').value,
        temas: document.getElementById('e-temas').value.split(',').map(t => t.trim()).filter(t => t),
        lugar: {
            nombre: document.getElementById('e-lugar-nombre').value,
            direccion: document.getElementById('e-lugar-direccion').value,
            aula: document.getElementById('e-lugar-aula').value,
            capacidad: parseInt(document.getElementById('e-cupos').value) || 0
        }
    };

    if (editId) {
        payload.id = editId;
        const res = await apiPut('eventos.php', payload);
        if (res.status !== 'success') {
            await mostrarAlerta(res.message || 'No se pudo actualizar el evento.', 'danger', 'Error al Actualizar');
            return;
        }
    } else {
        payload.organizadorId = user.id;
        const res = await apiPost('eventos.php', payload);
        if (res.status !== 'success') {
            await mostrarAlerta(res.message || 'No se pudo crear el evento.', 'danger', 'Error al Crear');
            return;
        }
    }

    closeModal('event-modal');
    fetchEventos();
});

window.eliminarEvento = async function(id) {
    const conf = await mostrarConfirmacion('Esta acción eliminará el evento del sistema de forma permanente.', '¿Eliminar Evento?', 'danger', 'Sí, eliminar');
    if (!conf) return;
    await apiDelete('eventos.php', { id });
    fetchEventos();
};

window.exportarXML = function(eventoId) {
    window.open(`${API_URL}/exportar_xml.php?eventoId=${eventoId}`, '_blank');
};

// ================= ASIGNAR PONENTES ================= //

window.openAsignarPonentes = async function(eventoId) {
    document.getElementById('asignar-evento-id').value = eventoId;

    const data = await apiGet('usuarios.php?rol=Ponente');
    const list = document.getElementById('ponentes-checkbox-list');

    if (data.status !== 'success' || data.data.length === 0) {
        list.innerHTML = '<p style="padding:1rem;color:var(--text-secondary)">No hay ponentes registrados.</p>';
        openModal('ponentes-modal');
        return;
    }

    const evData = await apiGet('eventos.php');
    const evento = evData.data.find(e => e.id === eventoId);
    const asignados = evento ? (evento.ponentes_ids || []) : [];

    list.innerHTML = data.data.map(p => `
        <div class="checkbox-item">
            <input type="checkbox" id="pon-${p.id}" value="${p.id}" ${asignados.includes(p.id) ? 'checked' : ''}>
            <label for="pon-${p.id}">${p.nombre} ${p.apellido || ''}</label>
            <span class="checkbox-detail">${p.especialidad || ''} - ${p.institucion || ''}</span>
        </div>
    `).join('');

    openModal('ponentes-modal');
};

window.guardarAsignacionPonentes = async function() {
    const eventoId = document.getElementById('asignar-evento-id').value;
    const checkboxes = document.querySelectorAll('#ponentes-checkbox-list input[type="checkbox"]:checked');
    const ponentes_ids = Array.from(checkboxes).map(cb => cb.value);

    await apiPut('eventos.php', { id: eventoId, ponentes_ids });
    closeModal('ponentes-modal');
    fetchEventos();
};

// ================= USUARIOS (Solo Admin) ================= //

async function fetchUsuarios() {
    const grid = document.getElementById('user-grid');
    if (!grid) return;
    grid.innerHTML = 'Cargando usuarios...';

    await loadUsuariosCache();

    let usuarios = usuariosCache;
    const filtro = document.getElementById('filter-user-rol');
    if (filtro && filtro.value) {
        usuarios = usuarios.filter(u => u.rol === filtro.value);
    }

    if (usuarios.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No hay usuarios registrados.</p></div>';
        return;
    }

    grid.innerHTML = usuarios.map(u => `
        <div class="card">
            <h3 class="card-title">${u.nombre} ${u.apellido || ''}</h3>
            <div class="card-subtitle">${u.email}</div>
            <div style="margin-bottom:0.75rem">
                <span class="badge ${u.rol.toLowerCase()}">${u.rol}</span>
            </div>
            <div class="card-detail"><strong>Cédula:</strong> ${u.cedula || 'N/A'}</div>
            ${u.especialidad ? `<div class="card-detail"><strong>Especialidad:</strong> ${u.especialidad}</div>` : ''}
            ${u.institucion ? `<div class="card-detail"><strong>Institución:</strong> ${u.institucion}</div>` : ''}
            ${u.profesion ? `<div class="card-detail"><strong>Profesión:</strong> ${u.profesion}</div>` : ''}
            <div class="card-actions">
                ${KosmosAuth.canManageUsers() ? `
                    <button class="btn btn-sm" onclick="openUserModal('${u.id}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.id}')">Eliminar</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

window.toggleRolFields = function() {
    const rol = document.getElementById('u-rol').value;
    document.getElementById('rol-fields-ponente').style.display = rol === 'Ponente' ? 'block' : 'none';
    document.getElementById('rol-fields-participante').style.display = rol === 'Participante' ? 'block' : 'none';
};

window.openUserModal = function(id) {
    document.getElementById('user-form').reset();
    document.getElementById('u-edit-id').value = '';
    document.getElementById('user-modal-title').textContent = 'Nuevo Usuario';
    document.getElementById('u-password-group').style.display = 'block';
    toggleRolFields();

    const rolSelect = document.getElementById('u-rol');

    if (!KosmosAuth.isAdmin()) {
        rolSelect.innerHTML = '<option value="Ponente" selected>Ponente</option>';
        rolSelect.disabled = true;
    } else {
        rolSelect.innerHTML = `
            <option value="Participante">Participante</option>
            <option value="Ponente">Ponente</option>
            <option value="Organizador">Organizador</option>
            <option value="Admin">Admin</option>
        `;
        rolSelect.disabled = false;
    }

    if (id) {
        document.getElementById('user-modal-title').textContent = 'Editar Usuario';
        document.getElementById('u-edit-id').value = id;
        document.getElementById('u-password-group').style.display = 'none';
        rolSelect.disabled = false;
        apiGet('usuarios.php').then(data => {
            const u = data.data.find(u => u.id === id);
            if (u) {
                document.getElementById('u-nombre').value = u.nombre || '';
                document.getElementById('u-apellido').value = u.apellido || '';
                document.getElementById('u-cedula').value = u.cedula || '';
                document.getElementById('u-email').value = u.email || '';
                document.getElementById('u-rol').value = u.rol || 'Participante';
                toggleRolFields();
                if (u.especialidad) document.getElementById('u-especialidad').value = u.especialidad;
                if (u.institucion) {
                    document.getElementById('u-inst-ponente').value = u.institucion;
                    document.getElementById('u-inst-participante').value = u.institucion;
                }
                if (u.profesion) document.getElementById('u-profesion').value = u.profesion;
            }
        });
    }

    openModal('user-modal');
};

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('u-edit-id').value;
    const rol = document.getElementById('u-rol').value;

    const payload = {
        nombre: document.getElementById('u-nombre').value,
        apellido: document.getElementById('u-apellido').value,
        cedula: document.getElementById('u-cedula').value,
        email: document.getElementById('u-email').value,
        rol: rol
    };

    if (rol === 'Ponente') {
        payload.especialidad = document.getElementById('u-especialidad').value;
        payload.institucion = document.getElementById('u-inst-ponente').value;
    }

    if (rol === 'Participante') {
        payload.profesion = document.getElementById('u-profesion').value;
        payload.institucion = document.getElementById('u-inst-participante').value;
    }

    if (editId) {
        payload.id = editId;
        await apiPut('usuarios.php', payload);
    } else {
        payload.password = document.getElementById('u-password').value;
        await apiPost('usuarios.php', payload);
    }

    closeModal('user-modal');
    fetchUsuarios();
});

window.eliminarUsuario = async function(id) {
    const conf = await mostrarConfirmacion('El usuario será eliminado permanentemente del sistema.', '¿Eliminar Usuario?', 'danger', 'Sí, eliminar');
    if (!conf) return;
    await apiDelete('usuarios.php', { id });
    fetchUsuarios();
};

// ================= PONENTES (Organizador/Admin) ================= //

async function fetchPONENTES() {
    const grid = document.getElementById('ponente-grid');
    if (!grid) return;
    grid.innerHTML = 'Cargando ponentes...';

    const data = await apiGet('usuarios.php?rol=Ponente');
    if (data.status !== 'success') {
        grid.innerHTML = '<p style="color:var(--danger-color)">Error al cargar ponentes.</p>';
        return;
    }

    if (data.data.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No hay ponentes registrados.</p></div>';
        return;
    }

    grid.innerHTML = data.data.map(p => `
        <div class="card">
            <h3 class="card-title">${p.nombre} ${p.apellido || ''}</h3>
            <div class="card-subtitle">${p.email}</div>
            <div class="card-detail"><strong>Cédula:</strong> ${p.cedula || 'N/A'}</div>
            <div class="card-detail"><strong>Especialidad:</strong> ${p.especialidad || 'N/A'}</div>
            <div class="card-detail"><strong>Institución:</strong> ${p.institucion || 'N/A'}</div>
            <div class="card-actions">
                <button class="btn btn-sm" onclick="openPonenteModal('${p.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarPonente('${p.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

window.openPonenteModal = function(id) {
    document.getElementById('ponente-form').reset();
    document.getElementById('pon-edit-id').value = '';
    document.getElementById('ponente-modal-title').textContent = 'Nuevo Ponente';
    document.getElementById('pon-password-group').style.display = 'block';

    if (id) {
        document.getElementById('ponente-modal-title').textContent = 'Editar Ponente';
        document.getElementById('pon-edit-id').value = id;
        document.getElementById('pon-password-group').style.display = 'none';
        apiGet('usuarios.php?rol=Ponente').then(data => {
            const p = data.data.find(p => p.id === id);
            if (p) {
                document.getElementById('pon-nombre').value = p.nombre || '';
                document.getElementById('pon-apellido').value = p.apellido || '';
                document.getElementById('pon-cedula').value = p.cedula || '';
                document.getElementById('pon-email').value = p.email || '';
                document.getElementById('pon-especialidad').value = p.especialidad || '';
                document.getElementById('pon-institucion').value = p.institucion || '';
            }
        });
    }

    openModal('ponente-modal');
};

const ponenteForm = document.getElementById('ponente-form');
if (ponenteForm) ponenteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('pon-edit-id').value;

    const payload = {
        nombre: document.getElementById('pon-nombre').value,
        apellido: document.getElementById('pon-apellido').value,
        cedula: document.getElementById('pon-cedula').value,
        email: document.getElementById('pon-email').value,
        especialidad: document.getElementById('pon-especialidad').value,
        institucion: document.getElementById('pon-institucion').value
    };

    if (editId) {
        payload.id = editId;
        await apiPut('usuarios.php', payload);
    } else {
        payload.rol = 'Ponente';
        payload.password = document.getElementById('pon-password').value;
        await apiPost('usuarios.php', payload);
    }

    closeModal('ponente-modal');
    fetchPONENTES();
});

window.eliminarPonente = async function(id) {
    const conf = await mostrarConfirmacion('El ponente será eliminado del sistema permanentemente.', '¿Eliminar Ponente?', 'danger', 'Sí, eliminar');
    if (!conf) return;
    await apiDelete('usuarios.php', { id });
    fetchPONENTES();
};

// ================= INSCRIPCIONES ================= //

async function onInscTipoFilterChange() {
    await populateInscFiltros(true);
    await fetchInscripciones();
}
window.onInscTipoFilterChange = onInscTipoFilterChange;

async function populateInscFiltros(keepEventoIfPossible = false) {
    const tipoSel = document.getElementById('filter-insc-tipo-evento');
    const evSel = document.getElementById('filter-insc-evento');
    if (!tipoSel || !evSel) return;

    if (tiposCache.length === 0) await fetchTipos();
    if (eventosCache.length === 0) await loadEventosCache();

    // Poblar select de tipos si tiene solo la opción por defecto
    if (tipoSel.options.length <= 1) {
        const curTipo = tipoSel.value;
        tipoSel.innerHTML = '<option value="">Todos los tipos de evento</option>' +
            tiposCache.map(t => `<option value="${t.nombre}">${t.nombre}</option>`).join('');
        tipoSel.value = curTipo;
    }

    // Filtrar la lista de eventos según el tipo seleccionado
    const selectedTipo = tipoSel.value;
    const curEv = evSel.value;
    
    let evList = eventosCache;
    if (selectedTipo) {
        const tObj = tiposCache.find(t => t.nombre.toLowerCase() === selectedTipo.toLowerCase());
        if (tObj) {
            evList = eventosCache.filter(e => e.tipoId === tObj.id);
        }
    }

    evSel.innerHTML = '<option value="">Todos los eventos' + (selectedTipo ? ` (${selectedTipo})` : '') + '</option>' +
        evList.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

    if (keepEventoIfPossible && evList.some(e => e.id === curEv)) {
        evSel.value = curEv;
    } else {
        evSel.value = '';
    }
}

async function fetchInscripciones() {
    const tbody = document.getElementById('inscripciones-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

    await Promise.all([loadEventosCache(), loadUsuariosCache(), fetchTipos()]);
    await populateInscFiltros(true);

    const tipoEvento = document.getElementById('filter-insc-tipo-evento')?.value || '';
    const eventoId = document.getElementById('filter-insc-evento')?.value || '';

    const params = new URLSearchParams();
    if (tipoEvento) params.append('tipoEvento', tipoEvento);
    if (eventoId) params.append('eventoId', eventoId);

    const queryString = params.toString() ? '?' + params.toString() : '';
    const data = await apiGet(`inscripciones.php${queryString}`);

    if (data.status !== 'success') {
        tbody.innerHTML = '<tr><td colspan="7" style="color:var(--danger-color)">Error al cargar inscripciones.</td></tr>';
        return;
    }

    if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron inscripciones para los filtros aplicados.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(ins => {
        const ev = eventosCache.find(e => e.id === ins.eventoId);
        const tipoEventoNombre = ev ? getTipoNombre(ev.tipoId) : 'Evento';
        return `
        <tr>
            <td><strong>${getEventoNombre(ins.eventoId)}</strong></td>
            <td>
                <span class="badge" style="background: rgba(0, 210, 255, 0.12); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3); font-weight: 500;">
                    ${tipoEventoNombre}
                </span>
            </td>
            <td>${getUsuarioNombre(ins.participanteId)}</td>
            <td>${formatDate(ins.fechaInscripcion)}</td>
            <td><span class="badge ${ins.estado}">${ins.estado}</span></td>
            <td>${ins.asistio ? 'Si' : 'No'}</td>
            <td>
                ${ins.estado === 'pendiente' ? `<button class="btn btn-sm btn-success" onclick="marcarAsistencia('${ins.id}', '${ins.eventoId}')">Asistencia</button>` : ''}
                ${ins.estado !== 'certificado'
                    ? `<button class="btn btn-sm" onclick="abrirModalCertificado('${ins.eventoId}', '${ins.participanteId}')">Certificado</button>`
                    : `<button class="btn btn-sm" disabled title="Certificado ya generado">Certificado</button>`
                }
                ${ins.estado !== 'certificado' ? `<button class="btn btn-sm btn-danger" onclick="cancelarInscripcion('${ins.id}', '${ins.eventoId}')">Cancelar</button>` : ''}
            </td>
        </tr>
    `;}).join('');
}

window.marcarAsistencia = async function(id, eventoId) {
    await apiPut('inscripciones.php', { id, asistio: true });
    fetchInscripciones();
};

window.cancelarInscripcion = async function(id, eventoId) {
    const conf = await mostrarConfirmacion('¿Seguro que deseas cancelar esta inscripción?', 'Cancelar Inscripción', 'warning', 'Sí, cancelar');
    if (!conf) return;
    await apiDelete('inscripciones.php', { id, eventoId });
    fetchInscripciones();
};

// ================= CERTIFICADOS ================= //

async function onCertTipoFilterChange() {
    await populateCertFiltros(true);
    await fetchCertificados();
}
window.onCertTipoFilterChange = onCertTipoFilterChange;

async function populateCertFiltros(keepEventoIfPossible = false) {
    const tipoSel = document.getElementById('filter-cert-tipo-evento');
    const evSel = document.getElementById('filter-cert-evento');
    if (!tipoSel || !evSel) return;

    if (tiposCache.length === 0) await fetchTipos();
    if (eventosCache.length === 0) await loadEventosCache();

    // Poblar select de tipos si tiene solo la opción por defecto
    if (tipoSel.options.length <= 1) {
        const curTipo = tipoSel.value;
        tipoSel.innerHTML = '<option value="">Todos los tipos de evento</option>' +
            tiposCache.map(t => `<option value="${t.nombre}">${t.nombre}</option>`).join('');
        tipoSel.value = curTipo;
    }

    // Filtrar la lista de eventos según el tipo seleccionado
    const selectedTipo = tipoSel.value;
    const curEv = evSel.value;
    
    let evList = eventosCache;
    if (selectedTipo) {
        const tObj = tiposCache.find(t => t.nombre.toLowerCase() === selectedTipo.toLowerCase());
        if (tObj) {
            evList = eventosCache.filter(e => e.tipoId === tObj.id);
        }
    }

    evSel.innerHTML = '<option value="">Todos los eventos' + (selectedTipo ? ` (${selectedTipo})` : '') + '</option>' +
        evList.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

    if (keepEventoIfPossible && evList.some(e => e.id === curEv)) {
        evSel.value = curEv;
    } else {
        evSel.value = '';
    }
}

async function fetchCertificados() {
    const tbody = document.getElementById('certificados-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';

    await Promise.all([loadEventosCache(), loadUsuariosCache(), fetchTipos()]);
    await populateCertFiltros(true);

    const tipoEvento = document.getElementById('filter-cert-tipo-evento')?.value || '';
    const eventoId = document.getElementById('filter-cert-evento')?.value || '';

    const params = new URLSearchParams();
    if (tipoEvento) params.append('tipoEvento', tipoEvento);
    if (eventoId) params.append('eventoId', eventoId);

    const queryString = params.toString() ? '?' + params.toString() : '';
    const data = await apiGet(`certificados.php${queryString}`);

    if (data.status !== 'success') {
        tbody.innerHTML = '<tr><td colspan="8" style="color:var(--danger-color)">Error al cargar certificados.</td></tr>';
        return;
    }

    if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No se encontraron certificados para los filtros aplicados.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(cert => {
        const ev = eventosCache.find(e => e.id === cert.eventoId);
        const tipoEventoNombre = cert.datosEmbebidos?.evento?.tipo || (ev ? getTipoNombre(ev.tipoId) : 'Evento');
        
        let rolClass = 'badge';
        let rolLabel = 'Participación';
        if (cert.tipo === 'ponente') {
            rolClass = 'badge ponente';
            rolLabel = 'Ponente';
        } else if (cert.tipo === 'organizacion') {
            rolClass = 'badge organizador';
            rolLabel = 'Organización';
        } else {
            rolClass = 'badge participante';
            rolLabel = 'Participación';
        }

        return `
            <tr>
                <td><strong>${cert.codigoCertificado}</strong></td>
                <td>${getEventoNombre(cert.eventoId)}</td>
                <td>
                    <span class="badge" style="background: rgba(0, 210, 255, 0.12); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3); font-weight: 500;">
                        ${tipoEventoNombre}
                    </span>
                </td>
                <td>${getUsuarioNombre(cert.participanteId || cert.ponenteId)}</td>
                <td><span class="${rolClass}">${rolLabel}</span></td>
                <td>${cert.horasDuracion || 0}</td>
                <td>${formatDate(cert.fechaEmision)}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="abrirVisualizadorDiploma('${cert.id}')">Ver Diploma</button>
                    <button class="btn btn-sm" onclick="descargarXMLCertificado('${cert.id}')">XML</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.abrirModalCertificado = function(eventoId, participanteId) {
    document.getElementById('cert-eventoId').value = eventoId;
    document.getElementById('cert-participanteId').value = participanteId;

    const tipoSelect = document.getElementById('cert-tipo');
    if (KosmosAuth.isPonente() && user.id === participanteId) {
        tipoSelect.value = 'ponente';
    } else if (KosmosAuth.isAdmin() || KosmosAuth.isOrganizador()) {
        tipoSelect.value = 'organizacion';
    } else {
        tipoSelect.value = 'participacion';
    }

    const ev = eventosCache.find(e => e.id === eventoId);
    if (ev && ev.horasDuracion) {
        document.getElementById('cert-horas').value = ev.horasDuracion;
    }

    openModal('cert-modal');
};

document.getElementById('cert-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('cert-tipo').value;
    const personaId = document.getElementById('cert-participanteId').value;
    const payload = {
        eventoId: document.getElementById('cert-eventoId').value,
        tipo: tipo,
        horasDuracion: parseInt(document.getElementById('cert-horas').value) || 0
    };
    if (tipo === 'ponente') {
        payload.ponenteId = personaId;
    } else {
        payload.participanteId = personaId;
    }
    await apiPost('certificados.php', payload);
    closeModal('cert-modal');
    await mostrarAlerta('El certificado digital ha sido emitido con éxito.', 'success', 'Certificado Generado');
});

// ================= INSCRIPCION PARTICIPANTE ================= //

window.inscribirse = async function(eventoId) {
    const res = await apiPost('inscripciones.php', {
        eventoId: eventoId,
        participanteId: user.id
    });
    if (res.status === 'success') {
        await mostrarAlerta('Te has inscrito satisfactoriamente en el evento.', 'success', 'Inscripción Exitosa');
        fetchEventos();
    } else {
        await mostrarAlerta(res.message || 'Error al inscribirse.', 'danger', 'Error de Inscripción');
    }
};

async function fetchMiInscripciones() {
    const tbody = document.getElementById('mi-inscripciones-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    await loadEventosCache();
    if (tiposCache.length === 0) await fetchTipos();

    const data = await apiGet(`inscripciones.php?participanteId=${user.id}`);
    if (data.status !== 'success' || data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tienes inscripciones.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(ins => {
        const ev = eventosCache.find(e => e.id === ins.eventoId);
        const tipoEventoNombre = ev ? getTipoNombre(ev.tipoId) : 'Evento';
        return `
        <tr>
            <td><strong>${getEventoNombre(ins.eventoId)}</strong></td>
            <td>
                <span class="badge" style="background: rgba(0, 210, 255, 0.12); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3); font-weight: 500;">
                    ${tipoEventoNombre}
                </span>
            </td>
            <td>${formatDate(ins.fechaInscripcion)}</td>
            <td><span class="badge ${ins.estado}">${ins.estado}</span></td>
            <td>${ins.asistio ? 'Si' : 'No'}</td>
            <td>
                <button class="btn btn-sm" onclick="exportarXML('${ins.eventoId}')">Descargar XML</button>
                ${ins.estado !== 'certificado' ? `<button class="btn btn-sm btn-danger" onclick="cancelarMiInscripcion('${ins.id}', '${ins.eventoId}')">Cancelar</button>` : ''}
            </td>
        </tr>
    `;}).join('');
}

window.cancelarMiInscripcion = async function(id, eventoId) {
    const conf = await mostrarConfirmacion('¿Seguro que deseas cancelar tu inscripción a este evento?', 'Cancelar Inscripción', 'warning', 'Sí, cancelar');
    if (!conf) return;
    await apiDelete('inscripciones.php', { id, eventoId });
    fetchMiInscripciones();
};

async function fetchMisCertificados() {
    const tbody = document.getElementById('mis-certificados-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    await loadEventosCache();
    if (tiposCache.length === 0) await fetchTipos();

    const data = await apiGet(`certificados.php?participanteId=${user.id}`);
    if (data.status !== 'success' || data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tienes certificados.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(cert => {
        const ev = eventosCache.find(e => e.id === cert.eventoId);
        const tipoEventoNombre = cert.datosEmbebidos?.evento?.tipo || (ev ? getTipoNombre(ev.tipoId) : 'Evento');
        return `
        <tr>
            <td><strong>${cert.codigoCertificado}</strong></td>
            <td>${getEventoNombre(cert.eventoId)}</td>
            <td>
                <span class="badge" style="background: rgba(0, 210, 255, 0.12); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3); font-weight: 500;">
                    ${tipoEventoNombre}
                </span>
            </td>
            <td>${cert.horasDuracion || 0}</td>
            <td>${cert.fechaEmision ? formatDate(cert.fechaEmision) : 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="abrirVisualizadorDiploma('${cert.id}')">Ver Diploma</button>
                <button class="btn btn-sm" onclick="descargarXMLCertificado('${cert.id}')">Descargar XML</button>
            </td>
        </tr>
    `;}).join('');
}

// ================= PONENTE EVENTOS ================= //

async function fetchPonenteEventos() {
    const grid = document.getElementById('ponente-event-grid');
    if (!grid) return;

    await Promise.all([loadEventosCache(), loadUsuariosCache()]);

    const misEventos = eventosCache.filter(e => e.ponentes_ids && e.ponentes_ids.includes(user.id));

    if (misEventos.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No tienes eventos asignados.</p></div>';
        return;
    }

    grid.innerHTML = misEventos.map(ev => `
        <div class="card">
            <h3 class="card-title">${ev.nombre}</h3>
            <div class="card-subtitle">${getTipoNombre(ev.tipoId)}</div>
            <div style="margin-bottom:0.75rem"><span class="badge ${ev.estado}">${ev.estado}</span></div>
            <div class="card-detail"><strong>Ponente:</strong> ${getPonentesNombres(ev.ponentes_ids)}</div>
            <div class="card-detail"><strong>Organizador:</strong> ${getUsuarioNombre(ev.organizadorId)}</div>
            <div class="card-detail"><strong>Fecha:</strong> ${ev.fechaInicio || 'N/A'} - ${ev.fechaFin || 'N/A'}</div>
            <div class="card-detail"><strong>Hora:</strong> ${ev.horaInicio || 'N/A'} - ${ev.horaFin || 'N/A'}</div>
            <div class="card-detail"><strong>Cupos:</strong> ${ev.cuposDisponibles || 0}</div>
            <div class="card-actions">
                ${ev.estado === 'finalizado'
                    ? `<button class="btn btn-sm btn-success" onclick="abrirModalCertificado('${ev.id}', '${user.id}')">Generar Certificado</button>`
                    : `<button class="btn btn-sm" disabled title="Disponible cuando el evento finalice">Certificado</button>`
                }
            </div>
        </div>
    `).join('');
}

async function fetchPonenteCertificados() {
    const tbody = document.getElementById('ponente-certificados-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    await loadEventosCache();
    if (tiposCache.length === 0) await fetchTipos();

    const data = await apiGet(`certificados.php?ponenteId=${user.id}`);
    if (data.status !== 'success') {
        tbody.innerHTML = '<tr><td colspan="6" style="color:var(--danger-color)">Error al cargar.</td></tr>';
        return;
    }

    if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tienes certificados como ponente.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(cert => {
        const ev = eventosCache.find(e => e.id === cert.eventoId);
        const tipoEventoNombre = cert.datosEmbebidos?.evento?.tipo || (ev ? getTipoNombre(ev.tipoId) : 'Evento');
        return `
        <tr>
            <td><strong>${cert.codigoCertificado}</strong></td>
            <td>${getEventoNombre(cert.eventoId)}</td>
            <td>
                <span class="badge" style="background: rgba(0, 210, 255, 0.12); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3); font-weight: 500;">
                    ${tipoEventoNombre}
                </span>
            </td>
            <td>${cert.horasDuracion || 0}</td>
            <td>${cert.fechaEmision ? formatDate(cert.fechaEmision) : 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="abrirVisualizadorDiploma('${cert.id}')">Ver Diploma</button>
                <button class="btn btn-sm" onclick="descargarXMLCertificado('${cert.id}')">Descargar XML</button>
            </td>
        </tr>
    `;}).join('');
}

// ================= EDITAR PERFIL ================= //

function setupProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('profile-msg');
        msg.style.display = 'none';

        const payload = {
            id: user.id,
            nombre: document.getElementById('p-nombre').value,
            apellido: document.getElementById('p-apellido').value,
            email: document.getElementById('p-email').value
        };

        const password = document.getElementById('p-password').value;
        if (password) payload.password = password;

        const res = await apiPut('usuarios.php', payload);
        if (res.status === 'success') {
            const updatedUser = { ...user, ...payload };
            delete updatedUser.password;
            localStorage.setItem('kosmos_user', JSON.stringify(updatedUser));
            msg.textContent = 'Perfil actualizado.';
            msg.style.color = 'var(--success-color)';
            msg.style.display = 'block';
            document.getElementById('user-name').textContent = updatedUser.nombre + ' ' + (updatedUser.apellido || '');
        } else {
            msg.textContent = res.message || 'Error al actualizar.';
            msg.style.color = 'var(--danger-color)';
            msg.style.display = 'block';
        }
    });
}

// ================= REPORTES ================= //

async function ejecutarConsulta(num) {
    const resultDiv = document.getElementById('report-result');
    resultDiv.style.display = 'block';

    if (num === 1) {
        mostrarSelectorMes();
    } else if (num === 2 || num === 3 || num === 6) {
        mostrarSelectorEvento(num);
    } else if (num === 4) {
        mostrarSelectorPonente();
    } else if (num === 8) {
        mostrarSelectorTipo();
    } else {
        ejecutarConsultaDirecta(`q=${num}`, num);
    }
}

function mostrarSelectorMes() {
    const resultDiv = document.getElementById('report-result');
    const meses = [];
    const hoy = new Date();
    for (let i = 0; i < 12; i++) {
        const f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const y = f.getFullYear();
        const m = String(f.getMonth() + 1).padStart(2, '0');
        const val = `${y}-${m}`;
        meses.push({ value: val, label: f.toLocaleDateString('es', { year: 'numeric', month: 'long' }) });
    }

    resultDiv.innerHTML = `
        <h3 style="margin-bottom:1rem">Seleccione un mes</h3>
        <div style="display:flex;gap:1rem;align-items:end;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:200px">
                <label>Mes</label>
                <select id="sel-mes" class="form-control">
                    ${meses.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
                </select>
            </div>
            <button class="btn" onclick="ejecutarDesdeSelector()">Buscar</button>
            <button class="btn btn-secondary" onclick="cancelarSeleccion()">Cancelar</button>
        </div>`;
    window._consultaPendiente = 1;
}

async function mostrarSelectorEvento(num) {
    const resultDiv = document.getElementById('report-result');
    await loadEventosCache();

    resultDiv.innerHTML = `
        <h3 style="margin-bottom:1rem">Seleccione un evento</h3>
        <div style="display:flex;gap:1rem;align-items:end;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:300px">
                <label>Evento</label>
                <select id="sel-evento" class="form-control">
                    <option value="">-- Seleccione --</option>
                    ${eventosCache.map(e => `<option value="${e.id}">${e.nombre} (${e.estado})</option>`).join('')}
                </select>
            </div>
            <button class="btn" onclick="ejecutarDesdeSelector()">Buscar</button>
            <button class="btn btn-secondary" onclick="cancelarSeleccion()">Cancelar</button>
        </div>`;
    window._consultaPendiente = num;
}

async function mostrarSelectorPonente() {
    const resultDiv = document.getElementById('report-result');
    await loadUsuariosCache();
    const ponentes = usuariosCache.filter(u => u.rol === 'Ponente');

    resultDiv.innerHTML = `
        <h3 style="margin-bottom:1rem">Seleccione un ponente</h3>
        <div style="display:flex;gap:1rem;align-items:end;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:300px">
                <label>Ponente</label>
                <select id="sel-ponente" class="form-control">
                    <option value="">-- Seleccione --</option>
                    ${ponentes.map(p => `<option value="${p.id}">${p.nombre} ${p.apellido} - ${p.especialidad || 'N/A'}</option>`).join('')}
                </select>
            </div>
            <button class="btn" onclick="ejecutarDesdeSelector()">Buscar</button>
            <button class="btn btn-secondary" onclick="cancelarSeleccion()">Cancelar</button>
        </div>`;
    window._consultaPendiente = 4;
}

async function mostrarSelectorTipo() {
    const resultDiv = document.getElementById('report-result');
    await fetchTipos();

    resultDiv.innerHTML = `
        <h3 style="margin-bottom:1rem">Seleccione un tipo de evento</h3>
        <div style="display:flex;gap:1rem;align-items:end;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:250px">
                <label>Tipo</label>
                <select id="sel-tipo" class="form-control">
                    <option value="">-- Seleccione --</option>
                    ${tiposCache.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                </select>
            </div>
            <button class="btn" onclick="ejecutarDesdeSelector()">Buscar</button>
            <button class="btn btn-secondary" onclick="cancelarSeleccion()">Cancelar</button>
        </div>`;
    window._consultaPendiente = 8;
}

window.cancelarSeleccion = function() {
    document.getElementById('report-result').style.display = 'none';
    window._consultaPendiente = null;
}

window.ejecutarDesdeSelector = function() {
    const num = window._consultaPendiente;
    let param = `q=${num}`;

    if (num === 1) {
        const mes = document.getElementById('sel-mes').value;
        param += `&mes=${mes}`;
    } else if (num === 2 || num === 3 || num === 6) {
        const eventoId = document.getElementById('sel-evento').value;
        if (!eventoId) { mostrarAlerta('Por favor seleccione un evento de la lista.', 'warning', 'Selección Requerida'); return; }
        param += `&eventoId=${eventoId}`;
    } else if (num === 4) {
        const ponenteId = document.getElementById('sel-ponente').value;
        if (!ponenteId) { mostrarAlerta('Por favor seleccione un ponente de la lista.', 'warning', 'Selección Requerida'); return; }
        param += `&ponenteId=${ponenteId}`;
    } else if (num === 8) {
        const tipoId = document.getElementById('sel-tipo').value;
        if (!tipoId) { mostrarAlerta('Por favor seleccione un tipo de evento.', 'warning', 'Selección Requerida'); return; }
        param += `&tipoId=${tipoId}`;
    }

    ejecutarConsultaDirecta(param, num);
}

async function ejecutarConsultaDirecta(param, num) {
    const resultDiv = document.getElementById('report-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = 'Ejecutando consulta...';

    const data = await apiGet(`consultas.php?${param}`);
    if (data.status === 'success') {
        resultDiv.innerHTML = renderizarReporte(num, data.data);
    } else {
        resultDiv.innerHTML = `<span style="color:var(--danger-color)">${data.message}</span>`;
    }
}

function renderizarReporte(num, data) {
    if (!data || data.length === 0) {
        return '<p style="color:var(--text-secondary)">No hay resultados para esta consulta.</p>';
    }

    const titulos = {
        1: 'Eventos en el mes',
        2: 'Ponentes del evento',
        3: 'Participantes inscritos',
        4: 'Eventos del ponente',
        5: 'Participantes por evento',
        6: 'Participantes que asistieron',
        7: 'Certificados generados',
        8: 'Eventos por tipo',
        9: 'Temas tratados',
        10: 'Evento mas popular'
    };

    let html = `<h3 style="margin-bottom:1rem">${titulos[num] || 'Consulta #' + num}</h3>`;

    switch(num) {
        case 1:
            html += `<table class="data-table">
                <thead><tr><th>Nombre</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Lugar</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.nombre || 'N/A'}</td>
                    <td>${r.tipo?.nombre || r.tipoNombre || 'N/A'}</td>
                    <td>${r.fechaInicio || 'N/A'}</td>
                    <td>${r.fechaFin || 'N/A'}</td>
                    <td>${r.estado || 'N/A'}</td>
                    <td>${r.lugar?.nombre || 'N/A'}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 2:
            html += `<ul class="data-list">${data.map(r =>
                `<li><strong>${r.nombre} ${r.apellido}</strong> - ${r.especialidad || 'N/A'} (${r.institucion || 'N/A'}) - ${r.email}</li>`
            ).join('')}</ul>`;
            break;

        case 3:
            html += `<table class="data-table">
                <thead><tr><th>Nombre</th><th>Apellido</th><th>Email</th><th>Cedula</th><th>Profesion</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.nombre || 'N/A'}</td>
                    <td>${r.apellido || 'N/A'}</td>
                    <td>${r.email || 'N/A'}</td>
                    <td>${r.cedula || 'N/A'}</td>
                    <td>${r.profesion || 'N/A'}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 4:
            html += `<table class="data-table">
                <thead><tr><th>Nombre</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.nombre || 'N/A'}</td>
                    <td>${r.tipo?.nombre || r.tipoNombre || 'N/A'}</td>
                    <td>${r.fechaInicio || 'N/A'}</td>
                    <td>${r.fechaFin || 'N/A'}</td>
                    <td>${r.estado || 'N/A'}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 5:
            html += `<table class="data-table">
                <thead><tr><th>Evento</th><th>Total Participantes</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.eventoNombre || getEventoNombre(r.eventoId)}</td>
                    <td>${r.totalParticipantes}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 6:
            html += `<table class="data-table">
                <thead><tr><th>Nombre</th><th>Apellido</th><th>Email</th><th>Cedula</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.nombre || 'N/A'}</td>
                    <td>${r.apellido || 'N/A'}</td>
                    <td>${r.email || 'N/A'}</td>
                    <td>${r.cedula || 'N/A'}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 7:
            html += `<table class="data-table">
                <thead><tr><th>Codigo</th><th>Evento</th><th>Tipo</th><th>Fecha Emision</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.codigo || 'N/A'}</td>
                    <td>${r.eventoNombre || 'N/A'}</td>
                    <td>${r.tipo || 'N/A'}</td>
                    <td>${r.fechaEmision || 'N/A'}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 8:
            html += `<table class="data-table">
                <thead><tr><th>Nombre</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Lugar</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.nombre || 'N/A'}</td>
                    <td>${r.tipoNombre || 'N/A'}</td>
                    <td>${r.fechaInicio || 'N/A'}</td>
                    <td>${r.fechaFin || 'N/A'}</td>
                    <td>${r.estado || 'N/A'}</td>
                    <td>${r.lugar?.nombre || 'N/A'}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 9:
            html += `<table class="data-table">
                <thead><tr><th>Tema</th><th>Eventos</th><th>Total</th></tr></thead>
                <tbody>${data.map(r => `<tr>
                    <td>${r.tema || 'N/A'}</td>
                    <td>${(r.eventos || []).join(', ')}</td>
                    <td>${r.totalEventos}</td>
                </tr>`).join('')}</tbody>
            </table>`;
            break;

        case 10:
            html += `<div class="report-highlight">
                <h4 style="color:var(--accent-color);margin-bottom:0.5rem">Evento mas popular</h4>
                <p style="font-size:1.2rem;font-weight:bold">${data[0]?.nombreEvento || 'N/A'}</p>
                <p style="color:var(--text-secondary)">${data[0]?.totalParticipantes || 0} participantes inscritos</p>
            </div>`;
            break;

        default:
            html += `<pre style="white-space:pre-wrap;font-size:0.85rem">${JSON.stringify(data, null, 2)}</pre>`;
    }

    return html;
}

// ================= HELPERS ================= //

async function loadEventosFilter(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    await loadEventosCache();
    const current = sel.value;
    sel.innerHTML = '<option value="">Todos los eventos</option>' +
        eventosCache.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    sel.value = current;
}

// ================= SEMANA IV: VISOR Y GENERADOR DE DIPLOMA (jsPDF + BSON + XML) ================= //

let cachedLogoBase64 = null;
let currentDiplomaData = null;

async function getLogoBase64() {
    if (cachedLogoBase64) return cachedLogoBase64;
    try {
        const res = await apiGet('multimedia.php?tipo=logo');
        if (res.status === 'success' && res.data && res.data.datos) {
            cachedLogoBase64 = res.data.datos;
            return cachedLogoBase64;
        }
    } catch(e) {}
    
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            cachedLogoBase64 = canvas.toDataURL('image/png');
            resolve(cachedLogoBase64);
        };
        img.onerror = function() {
            resolve('');
        };
        img.src = '../img/logo.png';
    });
}

function generarQRDataURL(text) {
    return new Promise((resolve) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);
        try {
            new QRCode(tempDiv, {
                text: text,
                width: 256,
                height: 256,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            setTimeout(() => {
                const canvas = tempDiv.querySelector('canvas');
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    document.body.removeChild(tempDiv);
                    resolve(dataUrl);
                } else {
                    const img = tempDiv.querySelector('img');
                    const dataUrl = img ? img.src : '';
                    document.body.removeChild(tempDiv);
                    resolve(dataUrl);
                }
            }, 60);
        } catch(e) {
            if (tempDiv.parentNode) document.body.removeChild(tempDiv);
            resolve('');
        }
    });
}

window.descargarXMLCertificado = function(certId) {
    window.open(`${API_URL}/certificados.php?id=${certId}&formato=xml&download=1`, '_blank');
};

window.abrirVisualizadorDiploma = async function(certId) {
    const res = await apiGet(`certificados.php?id=${certId}`);
    if (res.status !== 'success' || !res.data) {
        await mostrarAlerta('No se pudo cargar la información del certificado.', 'danger', 'Error de Carga');
        return;
    }
    const cert = res.data;
    await mostrarDiplomaModal(cert);
};

async function mostrarDiplomaModal(cert) {
    const area = document.getElementById('diploma-render-area');
    if (!area) return;
    area.innerHTML = '<div style="padding: 2.5rem; color: #00d2ff; text-align: center;">Cargando activos multimedia y procesando XML del diploma...</div>';
    openModal('diploma-modal');

    // 1. Extraer datos del XML individual vinculado (Semana IV)
    let nombre = '', apellido = '', cedula = '', nombreEvento = '', tipo = 'Evento', codigo = '', emision = '', horas = 0, qrUrl = '';
    
    if (cert.contenidoXml) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(cert.contenidoXml, 'text/xml');
            nombre = xmlDoc.querySelector('participante nombre')?.textContent?.trim() || '';
            apellido = xmlDoc.querySelector('participante apellido')?.textContent?.trim() || '';
            cedula = xmlDoc.querySelector('participante cedula')?.textContent?.trim() || '';
            nombreEvento = xmlDoc.querySelector('evento > nombre')?.textContent?.trim() || '';
            tipo = xmlDoc.querySelector('tipo')?.textContent?.trim() || 'Evento';
            codigo = xmlDoc.querySelector('codigoCertificado')?.textContent?.trim() || cert.codigoCertificado;
            emision = xmlDoc.querySelector('fechaEmision')?.textContent?.trim() || '';
            horas = xmlDoc.querySelector('horasDuracion')?.textContent?.trim() || cert.horasDuracion || 0;
            qrUrl = xmlDoc.querySelector('qrUrl')?.textContent?.trim() || cert.qrUrl || '';
        } catch(e) {
            console.warn('Error procesando XML:', e);
        }
    }

    // Fallback a datos embebidos de BSON si no vinieron del XML
    if (!nombre && cert.datosEmbebidos?.participante) {
        const p = cert.datosEmbebidos.participante;
        nombre = p.nombre || '';
        apellido = p.apellido || '';
        cedula = p.cedula || '';
    }
    if (!nombreEvento && cert.datosEmbebidos?.evento) {
        const ev = cert.datosEmbebidos.evento;
        nombreEvento = ev.nombre || '';
        tipo = ev.tipo || tipo;
        horas = ev.horasDuracion || horas;
    }
    if (!codigo) codigo = cert.codigoCertificado;
    if (!emision) emision = cert.fechaEmision ? cert.fechaEmision.split('T')[0] : new Date().toISOString().split('T')[0];
    if (!qrUrl) {
        const protocol = window.location.protocol;
        const host = window.location.host;
        qrUrl = `${protocol}//${host}/public/index.html?verificar=${codigo}`;
    }

    // 2. Obtener Logo y QR en Base64
    const logoBase64 = await getLogoBase64();
    const qrBase64 = await generarQRDataURL(qrUrl);

    // Guardar en estado global para exportación jsPDF
    currentDiplomaData = {
        certId: cert.id || cert._id,
        nombre: nombre || 'Participante',
        apellido: apellido || 'Kosmos',
        cedula: cedula || 'V-00.000.000',
        nombreEvento: nombreEvento || 'Evento Académico',
        tipo: tipo || 'Evento',
        codigo,
        emision,
        horas,
        qrUrl,
        tipoCert: cert.tipo || 'participacion',
        logoBase64,
        qrBase64
    };

    let tituloCertificado = 'DE PARTICIPACIÓN';
    if (cert.tipo === 'ponente') tituloCertificado = 'DE PONENTE';
    if (cert.tipo === 'organizacion') tituloCertificado = 'DE ORGANIZACIÓN';

    // 3. Renderizar vista HTML idéntica a docs/idea plantilla certificado.md
    area.innerHTML = `
        <div class="diploma-card">
            ${logoBase64 ? `<img src="${logoBase64}" class="diploma-header-logo" alt="Kosmos Logo">` : ''}
            <div class="diploma-inst-title">KOSMOS EVENTOS ACADÉMICOS</div>
            <h1 class="diploma-main-title">CERTIFICADO</h1>
            <div class="diploma-sub-title">${tituloCertificado}</div>
            
            <div class="diploma-lead">Se otorga el presente reconocimiento a:</div>
            
            <div class="diploma-name-plate">
                <div class="diploma-person-name">${currentDiplomaData.nombre} ${currentDiplomaData.apellido}</div>
                <div class="diploma-person-ci">C.I: ${currentDiplomaData.cedula}</div>
            </div>

            <div class="diploma-text-body">
                Por haber asistido y aprobado satisfactoriamente el <strong>${currentDiplomaData.tipo}</strong> titulado:
                <div class="diploma-event-name">"${currentDiplomaData.nombreEvento}"</div>
                <div class="diploma-hours">completando una carga horaria de <strong>${currentDiplomaData.horas}</strong> horas académicas.</div>
            </div>

            <div class="diploma-footer-grid">
                <div class="diploma-footer-col">
                    <div class="diploma-footer-line"></div>
                    <div class="diploma-footer-label">EMISIÓN: ${currentDiplomaData.emision}</div>
                </div>
                <div class="diploma-footer-col">
                    <div class="diploma-qr-box">
                        <img src="${qrBase64}" alt="QR Verificación">
                    </div>
                    <div class="diploma-qr-caption">VALIDACIÓN DIGITAL</div>
                </div>
                <div class="diploma-footer-col">
                    <div class="diploma-footer-line"></div>
                    <div class="diploma-footer-label">CÓDIGO: ${currentDiplomaData.codigo}</div>
                </div>
            </div>
        </div>
    `;
}

window.descargarDiplomaXML = function() {
    if (currentDiplomaData?.certId) {
        descargarXMLCertificado(currentDiplomaData.certId);
    }
};

window.descargarDiplomaPDF = function() {
    if (!currentDiplomaData) return;
    const { nombre, apellido, cedula, nombreEvento, tipo, codigo, emision, horas, tipoCert, logoBase64, qrBase64 } = currentDiplomaData;

    if (!window.jspdf || !window.jspdf.jsPDF) {
        mostrarAlerta('La librería jsPDF se está inicializando, por favor intente nuevamente en unos segundos.', 'info', 'Preparando PDF');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const centroX = 297 / 2;

    // --- 1. FONDO OSCURO UI (#282828) ---
    doc.setFillColor(40, 40, 40); 
    doc.rect(0, 0, 297, 210, 'F');

    // --- 2. EFECTO NEÓN BLANCO/CIAN ---
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, 273, 186, 'S');

    doc.setDrawColor(0, 210, 255); 
    doc.setLineWidth(1.2);
    doc.rect(15, 15, 267, 180, 'S');

    doc.setFillColor(255, 255, 255);
    doc.rect(15, 15, 20, 2, 'F'); doc.rect(15, 15, 2, 20, 'F');
    doc.rect(262, 15, 20, 2, 'F'); doc.rect(280, 15, 2, 20, 'F');
    doc.rect(15, 193, 20, 2, 'F'); doc.rect(15, 175, 2, 20, 'F');
    doc.rect(262, 193, 20, 2, 'F'); doc.rect(280, 175, 2, 20, 'F');

    // --- 3. LOGO ---
    const targetWidth = 35;
    const targetHeight = 35;
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', centroX - (targetWidth / 2), 22, targetWidth, targetHeight);
        } catch(e) {
            console.warn('No se pudo añadir logo a PDF:', e);
        }
    }

    // --- 4. ENCABEZADOS ---
    let currentY = 22 + targetHeight + 10;
    
    // Función de espaciado para tracking y separación nítida de palabras en canvas PDF
    const espaciarTextoPDF = (texto, espLetras = 1, espPalabras = 6) => 
        texto.split(' ').map(palabra => palabra.split('').join(' '.repeat(espLetras))).join(' '.repeat(espPalabras));

    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(espaciarTextoPDF("KOSMOS EVENTOS ACADÉMICOS", 1, 6), centroX, currentY, { align: "center" });

    currentY += 12; 
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(38);
    doc.text("CERTIFICADO", centroX, currentY, { align: "center" });

    currentY += 7;
    doc.setTextColor(0, 210, 255);
    doc.setFontSize(15);
    let sub = "DE PARTICIPACIÓN";
    if (tipoCert === 'ponente') sub = "DE PONENTE";
    if (tipoCert === 'organizacion') sub = "DE ORGANIZACIÓN";
    doc.text(espaciarTextoPDF(sub, 1, 6), centroX, currentY, { align: "center" });

    // --- 5. CUERPO Y NOMBRE ---
    currentY += 14; 
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Se otorga el presente reconocimiento a:", centroX, currentY, { align: "center" });

    currentY += 5;
    doc.setFillColor(30, 30, 30); 
    doc.rect(centroX - 85, currentY, 170, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "italic");
    doc.setFontSize(44);
    doc.text(`${nombre} ${apellido}`, centroX, currentY + 16, { align: "center" });

    currentY += 30; 
    doc.setTextColor(0, 210, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`C.I: ${cedula}`, centroX, currentY, { align: "center" });

    // --- 6. TEXTO DESCRIPTIVO ---
    currentY += 12; 
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(`Por haber asistido y aprobado satisfactoriamente el ${tipo} titulado:`, centroX, currentY, { align: "center" });

    currentY += 8; 
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`"${nombreEvento}"`, centroX, currentY, { align: "center" });

    currentY += 7; 
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(`completando una carga horaria de ${horas} horas académicas.`, centroX, currentY, { align: "center" });

    // --- 7. PIE DE PÁGINA (Ajustado simétrico en 3 columnas) ---
    const bottomY = 183; 
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.8);
    
    // Columna Izquierda (Emisión)
    doc.line(35, bottomY, 85, bottomY);
    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`EMISIÓN: ${emision}`, 60, bottomY + 5, { align: "center" });

    // Columna Central (QR Code alineado)
    if (qrBase64) {
        try {
            doc.setFillColor(255, 255, 255);
            doc.rect(centroX - 11, bottomY - 19, 22, 22, 'F');
            doc.setDrawColor(0, 210, 255);
            doc.setLineWidth(0.4);
            doc.rect(centroX - 11, bottomY - 19, 22, 22, 'S');
            doc.addImage(qrBase64, 'PNG', centroX - 10, bottomY - 18, 20, 20);
            doc.setTextColor(0, 210, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.text("VALIDACIÓN DIGITAL", centroX, bottomY + 6, { align: "center" });
        } catch(eqr) {
            console.warn('Error incrustando QR:', eqr);
        }
    }

    // Columna Derecha (Código)
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.8);
    doc.line(212, bottomY, 262, bottomY);
    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`CÓDIGO: ${codigo}`, 237, bottomY + 5, { align: "center" });

    doc.save(`Certificado_Kosmos_${nombre}_${apellido}.pdf`);
};

// ================= VERIFICADOR PÚBLICO DE CERTIFICADOS ================= //

window.abrirModalVerificar = function(codigoInicial = '') {
    const input = document.getElementById('verificar-codigo-input');
    const resDiv = document.getElementById('verificar-resultado');
    if (input) input.value = codigoInicial;
    if (resDiv) resDiv.innerHTML = '';
    openModal('verificar-modal');
    if (codigoInicial) {
        consultarValidacionCertificado();
    }
};

window.consultarValidacionCertificado = async function() {
    const input = document.getElementById('verificar-codigo-input');
    const resDiv = document.getElementById('verificar-resultado');
    if (!input || !resDiv) return;
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) {
        resDiv.innerHTML = '<div class="val-card-error">Por favor ingrese un código de certificado.</div>';
        return;
    }

    resDiv.innerHTML = '<div style="color: #00d2ff; padding: 10px;">Consultando registros en MongoDB y validando XML...</div>';
    try {
        const res = await apiGet(`certificados.php?codigoCertificado=${encodeURIComponent(codigo)}`);
        if (res.status === 'success' && res.data) {
            const c = res.data;
            let personaNom = 'N/A';
            let eventoNom = 'N/A';
            if (c.datosEmbebidos?.participante) {
                personaNom = `${c.datosEmbebidos.participante.nombre} ${c.datosEmbebidos.participante.apellido} (${c.datosEmbebidos.participante.cedula})`;
            } else {
                personaNom = getUsuarioNombre(c.participanteId || c.ponenteId);
            }
            if (c.datosEmbebidos?.evento) {
                eventoNom = c.datosEmbebidos.evento.nombre;
            } else {
                eventoNom = getEventoNombre(c.eventoId);
            }

            resDiv.innerHTML = `
                <div class="val-card-success">
                    <div style="font-weight: 700; color: #22c55e; margin-bottom: 0.5rem;">
                        ✔ CERTIFICADO AUTÉNTICO Y VÁLIDO
                    </div>
                    <div style="font-size: 0.85rem; line-height: 1.6; color: #e2e8f0;">
                        <div><strong>Código:</strong> ${c.codigoCertificado}</div>
                        <div><strong>Titular:</strong> ${personaNom}</div>
                        <div><strong>Evento:</strong> ${eventoNom}</div>
                        <div><strong>Tipo:</strong> ${c.tipo.toUpperCase()}</div>
                        <div><strong>Horas Académicas:</strong> ${c.horasDuracion || 0} horas</div>
                        <div><strong>Fecha de Emisión:</strong> ${c.fechaEmision ? c.fechaEmision.split('T')[0] : 'N/A'}</div>
                        <div><strong>XML Vinculado:</strong> ${c.contenidoXml ? '✔ Integrado y verificado en BSON' : 'No disponible'}</div>
                    </div>
                    <div style="margin-top: 1rem; display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-success" onclick="closeModal('verificar-modal'); abrirVisualizadorDiploma('${c.id}')">Ver Diploma</button>
                        <button class="btn btn-sm btn-outline" onclick="descargarXMLCertificado('${c.id}')">Descargar XML</button>
                    </div>
                </div>
            `;
        } else {
            resDiv.innerHTML = `
                <div class="val-card-error">
                    <strong>✖ Certificado no encontrado</strong>
                    <div style="font-size: 0.85rem; margin-top: 4px;">
                        El código <code>${codigo}</code> no coincide con ningún certificado emitido en la base de datos de Kosmos.
                    </div>
                </div>
            `;
        }
    } catch(err) {
        resDiv.innerHTML = `<div class="val-card-error">Error al consultar el servicio de verificación: ${err.message}</div>`;
    }
};

// ================= INIT ================= //
async function initApp() {
    await Promise.all([loadUsuariosCache(), loadEventosCache(), fetchTipos()]);
    buildNav();

    // Auto-detección de verificación por URL (Semana IV)
    const urlParams = new URLSearchParams(window.location.search);
    const verifCode = urlParams.get('verificar');
    if (verifCode) {
        abrirModalVerificar(verifCode);
    }
}

initApp();
