// store.js - Manejo de datos con LocalStorage
window.Store = {
    init() {
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([
                { id: 1, username: 'admin', password: '123', role: 'admin', name: 'Administrador Principal' },
                { id: 2, username: 'cocina', password: '123', role: 'cook', name: 'Personal de Cocina' }
            ]));
        }
        if (!localStorage.getItem('diners')) {
            // Un par de ejemplos por defecto
            localStorage.setItem('diners', JSON.stringify([
                { id: '12345678', name: 'Juan Perez', type: 'Estudiante', info: 'PNF Informática - Trayecto II' },
                { id: '87654321', name: 'Maria Gomez', type: 'Personal Obrero', info: 'Mantenimiento' }
            ]));
        }
        if (!localStorage.getItem('attendance')) {
            localStorage.setItem('attendance', JSON.stringify([]));
        }
    },

    login(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        }
        return null;
    },

    logout() {
        localStorage.removeItem('currentUser');
    },

    getCurrentUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },

    // --- MANEJO DE COMENSALES ---
    getDiners() {
        return JSON.parse(localStorage.getItem('diners') || '[]');
    },

    addDiner(diner) {
        const diners = this.getDiners();
        diners.push(diner);
        localStorage.setItem('diners', JSON.stringify(diners));
    },

    deleteDiner(id) {
        let diners = this.getDiners();
        diners = diners.filter(d => d.id !== id);
        localStorage.setItem('diners', JSON.stringify(diners));
    },

    // --- MANEJO DE ASISTENCIA ---
    getAttendance() {
        return JSON.parse(localStorage.getItem('attendance') || '[]');
    },

    registerAttendance(dinerId) {
        const diners = this.getDiners();
        const diner = diners.find(d => d.id === dinerId);
        
        if (!diner) return { success: false, message: 'Comensal no encontrado' };

        const attendanceList = this.getAttendance();
        const today = new Date().toLocaleDateString('es-VE');
        
        // Verificar si ya comió hoy
        const alreadyAte = attendanceList.find(a => a.dinerId === dinerId && new Date(a.date).toLocaleDateString('es-VE') === today);
        
        if (alreadyAte) {
            return { success: false, message: `El comensal ${diner.name} ya registró su comida hoy.` };
        }

        attendanceList.push({
            id: Date.now().toString(),
            dinerId: diner.id,
            dinerName: diner.name,
            dinerType: diner.type,
            date: new Date().toISOString()
        });

        localStorage.setItem('attendance', JSON.stringify(attendanceList));
        return { success: true, message: `Asistencia registrada para ${diner.name}`, diner };
    }
};
