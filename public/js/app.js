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
    <div class="filters-bar">
        <select id="filter-insc-evento" class="form-control" onchange="fetchInscripciones()">
            <option value="">Todos los eventos</option>
        </select>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Evento</th>
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
    <div class="filters-bar">
        <select id="filter-cert-evento" class="form-control" onchange="fetchCertificados()">
            <option value="">Todos los eventos</option>
        </select>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Codigo</th>
                    <th>Evento</th>
                    <th>Participante</th>
                    <th>Tipo</th>
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
                    <th>Tipo</th>
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
        <div class="card-detail">Rol: ${user.rol}</div>
        <div class="card-detail">Cedula: ${user.cedula || 'N/A'}</div>
        ${user.especialidad ? `<div class="card-detail">Especialidad: ${user.especialidad}</div>` : ''}
        ${user.institucion ? `<div class="card-detail">Institucion: ${user.institucion}</div>` : ''}
        ${user.profesion ? `<div class="card-detail">Profesion: ${user.profesion}</div>` : ''}
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
                    <th>Tipo</th>
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

    await loadEventosCache();

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
            <div class="card-detail">Fecha: ${ev.fechaInicio || 'N/A'} - ${ev.fechaFin || 'N/A'}</div>
            <div class="card-detail">Hora: ${ev.horaInicio || 'N/A'} - ${ev.horaFin || 'N/A'}</div>
            <div class="card-detail">Cupos: ${ev.cuposDisponibles || 0}</div>
            <div class="card-detail">Organizador: ${getUsuarioNombre(ev.organizadorId)}</div>
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
            alert(res.message || 'No se pudo actualizar el evento.');
            return;
        }
    } else {
        payload.organizadorId = user.id;
        const res = await apiPost('eventos.php', payload);
        if (res.status !== 'success') {
            alert(res.message || 'No se pudo crear el evento.');
            return;
        }
    }

    closeModal('event-modal');
    fetchEventos();
});

window.eliminarEvento = async function(id) {
    if (!confirm('Seguro que deseas eliminar este evento?')) return;
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
            <div class="card-detail">Cedula: ${u.cedula || 'N/A'}</div>
            ${u.especialidad ? `<div class="card-detail">Especialidad: ${u.especialidad}</div>` : ''}
            ${u.institucion ? `<div class="card-detail">Institucion: ${u.institucion}</div>` : ''}
            ${u.profesion ? `<div class="card-detail">Profesion: ${u.profesion}</div>` : ''}
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
    if (!confirm('Seguro que deseas eliminar este usuario?')) return;
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
            <div class="card-detail">Cedula: ${p.cedula || 'N/A'}</div>
            <div class="card-detail">Especialidad: ${p.especialidad || 'N/A'}</div>
            <div class="card-detail">Institucion: ${p.institucion || 'N/A'}</div>
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
    if (!confirm('Seguro que deseas eliminar este ponente?')) return;
    await apiDelete('usuarios.php', { id });
    fetchPONENTES();
};

// ================= INSCRIPCIONES ================= //

async function fetchInscripciones() {
    const tbody = document.getElementById('inscripciones-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    await loadEventosCache();
    await loadUsuariosCache();

    const filtroEvento = document.getElementById('filter-insc-evento');
    let url = 'inscripciones.php';
    if (filtroEvento && filtroEvento.value) {
        url += `?eventoId=${filtroEvento.value}`;
    }

    const data = await apiGet(url);
    if (data.status !== 'success') {
        tbody.innerHTML = '<tr><td colspan="6" style="color:var(--danger-color)">Error al cargar.</td></tr>';
        return;
    }

    if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay inscripciones.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(ins => `
        <tr>
            <td>${getEventoNombre(ins.eventoId)}</td>
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
    `).join('');

    await loadEventosFilter('filter-insc-evento');
}

window.marcarAsistencia = async function(id, eventoId) {
    await apiPut('inscripciones.php', { id, asistio: true });
    fetchInscripciones();
};

window.cancelarInscripcion = async function(id, eventoId) {
    if (!confirm('Cancelar esta inscripcion?')) return;
    await apiDelete('inscripciones.php', { id, eventoId });
    fetchInscripciones();
};

// ================= CERTIFICADOS ================= //

async function fetchCertificados() {
    const tbody = document.getElementById('certificados-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

    await loadEventosCache();
    await loadUsuariosCache();

    const data = await apiGet('certificados.php');
    if (data.status !== 'success') {
        tbody.innerHTML = '<tr><td colspan="7" style="color:var(--danger-color)">Error al cargar.</td></tr>';
        return;
    }

    if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay certificados emitidos.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(cert => `
        <tr>
            <td>${cert.codigoCertificado}</td>
            <td>${getEventoNombre(cert.eventoId)}</td>
            <td>${getUsuarioNombre(cert.participanteId)}</td>
            <td>${cert.tipo}</td>
            <td>${cert.horasDuracion || 0}</td>
            <td>${formatDate(cert.fechaEmision)}</td>
            <td>
                <button class="btn btn-sm" onclick="exportarXML('${cert.eventoId}')">XML</button>
            </td>
        </tr>
    `).join('');

    await loadEventosFilter('filter-cert-evento');
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
    alert('Certificado generado!');
});

// ================= INSCRIPCION PARTICIPANTE ================= //

window.inscribirse = async function(eventoId) {
    const res = await apiPost('inscripciones.php', {
        eventoId: eventoId,
        participanteId: user.id
    });
    if (res.status === 'success') {
        alert('Inscripcion exitosa!');
        fetchEventos();
    } else {
        alert(res.message || 'Error al inscribirse.');
    }
};

async function fetchMiInscripciones() {
    const tbody = document.getElementById('mi-inscripciones-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    await loadEventosCache();

    const data = await apiGet(`inscripciones.php?participanteId=${user.id}`);
    if (data.status !== 'success' || data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No tienes inscripciones.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(ins => `
        <tr>
            <td>${getEventoNombre(ins.eventoId)}</td>
            <td>${formatDate(ins.fechaInscripcion)}</td>
            <td><span class="badge ${ins.estado}">${ins.estado}</span></td>
            <td>${ins.asistio ? 'Si' : 'No'}</td>
            <td>
                <button class="btn btn-sm" onclick="exportarXML('${ins.eventoId}')">Descargar XML</button>
                ${ins.estado !== 'certificado' ? `<button class="btn btn-sm btn-danger" onclick="cancelarMiInscripcion('${ins.id}', '${ins.eventoId}')">Cancelar</button>` : ''}
            </td>
        </tr>
    `).join('');
}

window.cancelarMiInscripcion = async function(id, eventoId) {
    if (!confirm('Cancelar esta inscripcion?')) return;
    await apiDelete('inscripciones.php', { id, eventoId });
    fetchMiInscripciones();
};

async function fetchMisCertificados() {
    const tbody = document.getElementById('mis-certificados-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    await loadEventosCache();

    const data = await apiGet(`certificados.php?participanteId=${user.id}`);
    if (data.status !== 'success' || data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tienes certificados.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(cert => `
        <tr>
            <td>${cert.codigoCertificado}</td>
            <td>${getEventoNombre(cert.eventoId)}</td>
            <td>${cert.tipo}</td>
            <td>${cert.horasDuracion || 0}</td>
            <td>${cert.fechaEmision ? formatDate(cert.fechaEmision) : 'N/A'}</td>
            <td>
                <button class="btn btn-sm" onclick="exportarXML('${cert.eventoId}')">Descargar XML</button>
            </td>
        </tr>
    `).join('');
}

// ================= PONENTE EVENTOS ================= //

async function fetchPonenteEventos() {
    const grid = document.getElementById('ponente-event-grid');
    if (!grid) return;

    await loadEventosCache();

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
            <div class="card-detail">Fecha: ${ev.fechaInicio || 'N/A'} - ${ev.fechaFin || 'N/A'}</div>
            <div class="card-detail">Hora: ${ev.horaInicio || 'N/A'} - ${ev.horaFin || 'N/A'}</div>
            <div class="card-detail">Lugar: ${ev.lugar ? ev.lugar.nombre : 'N/A'}</div>
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

    const data = await apiGet(`certificados.php?ponenteId=${user.id}`);
    if (data.status !== 'success') {
        tbody.innerHTML = '<tr><td colspan="6" style="color:var(--danger-color)">Error al cargar.</td></tr>';
        return;
    }

    if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tienes certificados como ponente.</td></tr>';
        return;
    }

    tbody.innerHTML = data.data.map(cert => `
        <tr>
            <td>${cert.codigoCertificado}</td>
            <td>${getEventoNombre(cert.eventoId)}</td>
            <td>${cert.tipo}</td>
            <td>${cert.horasDuracion || 0}</td>
            <td>${cert.fechaEmision ? formatDate(cert.fechaEmision) : 'N/A'}</td>
            <td>
                <button class="btn btn-sm" onclick="exportarXML('${cert.eventoId}')">Descargar XML</button>
            </td>
        </tr>
    `).join('');
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
        const val = f.toISOString().slice(0, 7);
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
        if (!eventoId) { alert('Seleccione un evento'); return; }
        param += `&eventoId=${eventoId}`;
    } else if (num === 4) {
        const ponenteId = document.getElementById('sel-ponente').value;
        if (!ponenteId) { alert('Seleccione un ponente'); return; }
        param += `&ponenteId=${ponenteId}`;
    } else if (num === 8) {
        const tipoId = document.getElementById('sel-tipo').value;
        if (!tipoId) { alert('Seleccione un tipo'); return; }
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

// ================= INIT ================= //
async function initApp() {
    await Promise.all([loadUsuariosCache(), loadEventosCache(), fetchTipos()]);
    buildNav();
}

initApp();
