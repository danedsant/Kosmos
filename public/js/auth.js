const KosmosAuth = {
    getUser() {
        const user = localStorage.getItem('kosmos_user');
        return user ? JSON.parse(user) : null;
    },

    isLoggedIn() {
        return this.getUser() !== null;
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    getRol() {
        const user = this.getUser();
        return user ? user.rol : null;
    },

    getFullName() {
        const user = this.getUser();
        if (!user) return '';
        return user.nombre + ' ' + (user.apellido || '');
    },

    isAdmin() {
        return this.getRol() === 'Admin';
    },

    isOrganizador() {
        const rol = this.getRol();
        return rol === 'Admin' || rol === 'Organizador';
    },

    soloOrganizador() {
        return this.getRol() === 'Organizador';
    },

    isPonente() {
        return this.getRol() === 'Ponente';
    },

    isParticipante() {
        return this.getRol() === 'Participante';
    },

    logout() {
        localStorage.removeItem('kosmos_user');
        fetch('../api/auth.php?accion=logout', { method: 'POST' }).catch(() => {});
        window.location.href = 'login.html';
    },

    canManageUsers() {
        return this.isAdmin();
    },

    canCreateOrganizador() {
        return this.isAdmin();
    },

    canCreateAdmin() {
        return this.isAdmin();
    },

    canManageEventos() {
        const rol = this.getRol();
        return rol === 'Admin' || rol === 'Organizador';
    },

    canCreatePonente() {
        const rol = this.getRol();
        return rol === 'Admin' || rol === 'Organizador';
    },

    canViewInscripciones() {
        const rol = this.getRol();
        return rol === 'Admin' || rol === 'Organizador';
    },

    canViewCertificados() {
        const rol = this.getRol();
        return rol === 'Admin' || rol === 'Organizador' || rol === 'Participante';
    },

    canViewReportes() {
        const rol = this.getRol();
        return rol === 'Admin' || rol === 'Organizador';
    },

    canEditProfile() {
        return this.isLoggedIn();
    }
};
