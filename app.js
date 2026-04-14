document.addEventListener('DOMContentLoaded', () => {
    const Store = window.Store;
    // Inicializar base de datos local
    Store.init();

    // DOM Elements
    const views = document.querySelectorAll('.view');
    const navItems = document.querySelectorAll('.nav-item');
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('loginView');
    
    // Autenticacion
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const currentUserName = document.getElementById('current-user-name');

    // Forms y Contenedores
    const scanResult = document.getElementById('scan-result');
    const dinersTbody = document.getElementById('diners-tbody');
    const addDinerForm = document.getElementById('add-diner-form');
    
    // QR
    const qrContainer = document.getElementById('qr-modal-content');
    
    // Chart
    let reportsChart = null;

    // ----- ENRUTADOR BASICO -----
    function navigateTo(viewId) {
        // Ocultar todas las vistas
        views.forEach(v => v.classList.remove('active'));
        navItems.forEach(n => n.classList.remove('active'));
        
        // Mostrar vista solicitada
        document.getElementById(viewId).classList.add('active');
        
        // Marcar nav item activo
        const activeNav = document.querySelector(`[data-target="${viewId}"]`);
        if(activeNav) activeNav.classList.add('active');

        // Lógica especÍfica por vista
        if (viewId === 'dashboardAdmin') loadAdminDashboard();
        if (viewId === 'dashboardCook') loadCookDashboard();
        if (viewId === 'scanner') startScanner();
        if (viewId === 'diners') loadDiners();
        if (viewId === 'reports') loadReports();
        
        // Detener scanner si salimos de su vista
        if (viewId !== 'scanner' && isScannerRunning) {
            stopScanner();
        }
    }

    // Configurar Eventos del menú
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            navigateTo(target);
        });
    });

    // ----- CONTROL DE ACCESO -----
    function checkAuth() {
        const user = Store.getCurrentUser();
        if (!user) {
            appContainer.style.display = 'none';
            loginContainer.style.display = 'flex';
            navigateTo('loginView');
        } else {
            appContainer.style.display = 'flex';
            loginContainer.style.display = 'none';
            currentUserName.textContent = user.name;
            
            // Configurar menú según rol
            if (user.role === 'admin') {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
                navigateTo('dashboardAdmin');
            } else {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
                navigateTo('dashboardCook');
            }
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userValue = document.getElementById('username').value;
        const passValue = document.getElementById('password').value;
        const user = Store.login(userValue, passValue);
        if (user) {
            checkAuth();
        } else {
            alert('Credenciales incorrectas');
        }
    });

    logoutBtn.addEventListener('click', () => {
        Store.logout();
        checkAuth();
    });

    // ----- DASHBOARDS -----
    function loadAdminDashboard() {
        const diners = Store.getDiners();
        const attendance = Store.getAttendance();
        const today = new Date().toLocaleDateString('es-VE');
        const todayAttendance = attendance.filter(a => new Date(a.date).toLocaleDateString('es-VE') === today);

        document.getElementById('stat-total-diners').textContent = diners.length;
        document.getElementById('stat-today-attendance').textContent = todayAttendance.length;
    }

    function loadCookDashboard() {
        const attendance = Store.getAttendance();
        const today = new Date().toLocaleDateString('es-VE');
        const todayAttendance = attendance.filter(a => new Date(a.date).toLocaleDateString('es-VE') === today);

        document.getElementById('cook-stat-today').textContent = todayAttendance.length;
    }

    // ----- SCANNER (Cocinera / Admin) -----
    let html5QrcodeScanner = null;
    let isScannerRunning = false;

    function startScanner() {
        if(isScannerRunning) return;
        scanResult.innerHTML = '';
        
        if(!html5QrcodeScanner) {
            html5QrcodeScanner = new Html5Qrcode("reader");
        }

        html5QrcodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText, decodedResult) => {
                // Registrar Asistencia
                const res = Store.registerAttendance(decodedText);
                if (res.success) {
                    scanResult.innerHTML = `<div style="color:var(--secondary); font-weight:bold; margin-top:10px;">✅ ${res.message} - ¡Buen provecho!</div>`;
                    // Sonido opcional
                    setTimeout(()=> scanResult.innerHTML = '', 3000);
                } else {
                    scanResult.innerHTML = `<div style="color:var(--accent); font-weight:bold; margin-top:10px;">❌ ${res.message}</div>`;
                }
            },
            (errorMessage) => { }
        ).then(() => {
            isScannerRunning = true;
        }).catch((err) => {
            console.error("No se pudo iniciar el escáner", err);
        });
    }

    function stopScanner() {
        if(html5QrcodeScanner && isScannerRunning) {
            html5QrcodeScanner.stop().then(() => {
                isScannerRunning = false;
            });
        }
    }

    // ----- GESTION COMENSALES -----
    function loadDiners() {
        const diners = Store.getDiners();
        dinersTbody.innerHTML = '';
        diners.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${d.id}</td>
                <td>${d.name}</td>
                <td>${d.type}</td>
                <td>${d.info}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="generateQR('${d.id}', '${d.name}')">Ver QR</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDinerApp('${d.id}')">Eliminar</button>
                </td>
            `;
            dinersTbody.appendChild(tr);
        });
    }

    addDinerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const diner = {
            id: document.getElementById('d-id').value,
            name: document.getElementById('d-name').value,
            type: document.getElementById('d-type').value,
            info: document.getElementById('d-info').value
        };
        Store.addDiner(diner);
        addDinerForm.reset();
        loadDiners();
    });

    window.deleteDinerApp = function(id) {
        if(confirm('¿Seguro que deseas eliminar este comensal?')) {
            Store.deleteDiner(id);
            loadDiners();
        }
    }

    window.generateQR = function(id, name) {
        qrContainer.innerHTML = `<h3>${name}</h3><div id="qr-code-canvas"></div>`;
        new QRCode(document.getElementById("qr-code-canvas"), {
            text: id,
            width: 200,
            height: 200
        });
        document.getElementById('qr-modal').style.display = 'block';
    }

    window.closeModal = function() {
        document.getElementById('qr-modal').style.display = 'none';
        qrContainer.innerHTML = '';
    }

    // ----- REPORTES -----
    function loadReports() {
        const attendance = Store.getAttendance();
        const ctx = document.getElementById('reportsChart').getContext('2d');
        
        // Agrupar por tipo (Estudiante, Obrero, etc) global histórico
        const counts = { 'Cargo': 0, 'PNF': 0, 'Trayecto': 0, 'Personal Obrero': 0, 'Estudiante': 0 };
        attendance.forEach(a => {
            if(counts[a.dinerType] !== undefined) counts[a.dinerType]++;
            else counts[a.dinerType] = 1;
        });

        if(reportsChart) reportsChart.destroy();

        reportsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    label: 'Asistencias Historicas Totales',
                    data: Object.values(counts),
                    backgroundColor: 'rgba(26, 86, 219, 0.7)',
                    borderColor: '#1A56DB',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: { 
                    y: { beginAtZero: true, ticks: { color: '#94A3B8' } },
                    x: { ticks: { color: '#94A3B8' } }
                },
                plugins: {
                    legend: { labels: { color: '#F8FAFC' } }
                }
            }
        });
    }

    // Inicializar App
    checkAuth();
});
