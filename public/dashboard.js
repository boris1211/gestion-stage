/**
 * ============================================================
 * DASHBOARD.JS - TABLEAU DE BORD ADMINISTRATEUR
 * ============================================================
 * Ce fichier contient toute la logique pour :
 * - Création d'utilisateurs
 * - Gestion des entreprises
 * - Affichage des statistiques
 * - Génération de rapports
 * - Messagerie avec les étudiants
 * - Gestion des étudiants
 * - Programmation des soutenances
 * ============================================================
 */

// ============================================================
// 1. VARIABLES GLOBALES ET INITIALISATION
// ============================================================

/**
 * Utilisateur administrateur actuellement connecté
 * Récupéré depuis localStorage après connexion
 */
let currentAdmin = null;

/**
 * Liste de tous les utilisateurs (étudiants et admins)
 */
let users = [];

/**
 * Liste de toutes les entreprises
 */
let enterprises = [];

/**
 * Liste de toutes les demandes de stage des étudiants
 */
let internshipRequests = [];

/**
 * Messages reçus des étudiants
 */
let messagesInbox = [];

/**
 * Messages envoyés aux étudiants
 */
let messagesSent = [];

/**
 * Liste de toutes les soutenances programmées
 */
let soutenances = [];

/**
 * Variable pour suivre l'édition d'entreprise
 */
let editingEnterpriseIndex = -1;

/**
 * Initialisation au chargement de la page
 */
document.addEventListener('DOMContentLoaded', function () {
    // Vérifier si l'utilisateur est connecté
    checkAuth();

    // Charger les données (API + localStorage) puis mettre à jour l'UI
    // loadData() est async : elle appellera elle-même les fonctions d'affichage
    // une fois les données prêtes, évitant d'afficher des tableaux vides.
    loadData();

    // Initialiser les écouteurs d'événements
    initEventListeners();

    // Afficher la section par défaut
    // Aucune section active au démarrage — accueil affiché par défaut

    // Vérifier périodiquement les nouveaux messages des étudiants
    setInterval(checkStudentMessages, 3000);
});

// ============================================================
// 2. AUTHENTIFICATION ET GESTION DE SESSION
// ============================================================

/**
 * Vérifie si un utilisateur est connecté
 * Redirige vers la page de connexion si non connecté
 */
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        alert('⚠️ Vous devez être connecté pour accéder à cette page.');
        window.location.href = 'index.html';
        return;
    }

    currentAdmin = JSON.parse(user);

    // Vérifier que c'est bien un administrateur
    if (currentAdmin.role !== 'admin') {
        alert('⚠️ Accès interdit. Vous n\'êtes pas administrateur.');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ Administrateur connecté:', currentAdmin.name);
}

/**
 * Déconnexion de l'utilisateur
 */
function logout() {
    if (confirm('🚪 Voulez-vous vous déconnecter ?')) {
        // Supprimer les données de session
        localStorage.removeItem('currentUser');

        alert('✅ Déconnexion réussie!\n\nÀ bientôt!');
        window.location.href = 'index.html';
    }
}

// ============================================================
// 3. CHARGEMENT ET SAUVEGARDE DES DONNÉES
// ============================================================

/**
 * Charge toutes les données.
 * - Les UTILISATEURS viennent maintenant de l'API (SQLite via Express)
 *   afin que les comptes créés par l'admin soient immédiatement utilisables.
 * - Les autres données (entreprises, demandes, soutenances) restent dans
 *   localStorage car elles ne sont pas encore migrées vers l'API.
 */
async function loadData() {
    // ── Charger les utilisateurs depuis l'API ──────────────────────────
    // C'est ici le changement clé : on appelle /api/users/students
    // au lieu de lire localStorage, pour avoir les vrais comptes SQLite.
    try {
        const response = await fetch('/api/users/students');
        const result = await response.json();
        if (result.success) {
            // On convertit le format BDD → format utilisé par le dashboard
            users = result.students.map(s => ({
                id:        s.id,
                role:      'student',
                name:      s.name,
                surname:   s.surname,
                fullName:  `${s.name} ${s.surname}`,
                email:     s.email,
                filiere:   s.filiere  || '',
                niveau:    s.niveau   || '',
                createdAt: s.created_at
            }));
            console.log('✅ Utilisateurs chargés depuis API:', users.length);
        }
    } catch (err) {
        // Si l'API est inaccessible, on garde le localStorage comme fallback
        console.warn('⚠️ API inaccessible, chargement depuis localStorage:', err);
        const savedUsers = localStorage.getItem('users');
        users = savedUsers ? JSON.parse(savedUsers) : [];
    }

    // ── Charger les entreprises (localStorage) ─────────────────────────
    const savedEnterprises = localStorage.getItem('enterprises');
    enterprises = savedEnterprises ? JSON.parse(savedEnterprises) : getDefaultEnterprises();

    // ── Charger les demandes de stage (localStorage) ───────────────────
    const savedRequests = localStorage.getItem('internshipRequests');
    internshipRequests = savedRequests ? JSON.parse(savedRequests) : [];

    // ── Charger les soutenances (localStorage) ─────────────────────────
    const savedSoutenances = localStorage.getItem('soutenances');
    soutenances = savedSoutenances ? JSON.parse(savedSoutenances) : [];

    console.log('📊 Données chargées:', {
        users: users.length,
        enterprises: enterprises.length,
        requests: internshipRequests.length,
        soutenances: soutenances.length
    });

    // Mettre à jour les affichages APRÈS que les données soient prêtes
    updateEnterprisesList();
    updateStatistics();
    updateStudentsList();
    loadMessages();
    loadSoutenances();
}

/**
 * Sauvegarde les utilisateurs dans localStorage
 */
function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
    console.log('💾 Utilisateurs sauvegardés:', users.length);
}

/**
 * Sauvegarde les entreprises dans localStorage
 */
function saveEnterprises() {
    localStorage.setItem('enterprises', JSON.stringify(enterprises));
    console.log('💾 Entreprises sauvegardées:', enterprises.length);
}

/**
 * Sauvegarde les demandes de stage dans localStorage
 */
function saveRequests() {
    localStorage.setItem('internshipRequests', JSON.stringify(internshipRequests));
    console.log('💾 Demandes sauvegardées:', internshipRequests.length);
}

/**
 * Sauvegarde les soutenances dans localStorage
 */
function saveSoutenances() {
    localStorage.setItem('soutenances', JSON.stringify(soutenances));
    console.log('💾 Soutenances sauvegardées:', soutenances.length);
}

/**
 * Retourne la liste des entreprises par défaut
 */
function getDefaultEnterprises() {
    return [
        { name: 'CORIS BANK', sector: 'Finance', contact: '25 30 60 00', students: [] },
        { name: 'ORANGE', sector: 'Télécommunications', contact: '25 30 80 00', students: [] },
        { name: 'WENDKUNI', sector: 'Finance', contact: '25 30 70 00', students: [] },
        { name: 'BF1', sector: 'Médias', contact: '25 30 90 00', students: [] },
        { name: 'SONABHY', sector: 'Distribution', contact: '25 30 85 00', students: [] },
        { name: 'LA POSTE', sector: 'Services postaux', contact: '25 30 75 00', students: [] },
        { name: 'SODIGAZ', sector: 'Distribution', contact: '25 30 88 00', students: [] },
        { name: 'RAHIMO', sector: 'Électronique', contact: '25 30 95 00', students: [] },
        { name: 'ONEA', sector: 'Distribution d\'eau', contact: '25 30 92 00', students: [] },
        { name: 'SONABEL', sector: 'Électricité', contact: '25 30 93 00', students: [] },
        { name: 'MOOV', sector: 'Télécommunications', contact: '25 30 81 00', students: [] },
        { name: 'TELECEL', sector: 'Télécommunications', contact: '25 30 82 00', students: [] }
    ];
}

// ============================================================
// 4. INITIALISATION DES ÉCOUTEURS D'ÉVÉNEMENTS
// ============================================================

/**
 * Initialise tous les écouteurs d'événements des formulaires
 */
function initEventListeners() {
    // Formulaire de création d'utilisateur
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleCreateUser);
    }

    // Formulaire d'ajout d'étudiant
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }

    // Formulaire d'entreprise (modale)
    const enterpriseForm = document.getElementById('enterpriseForm');
    if (enterpriseForm) {
        enterpriseForm.addEventListener('submit', handleSaveEnterprise);
    }

    // Formulaire de soutenance
    const soutenanceForm = document.getElementById('soutenanceForm');
    if (soutenanceForm) {
        soutenanceForm.addEventListener('submit', handleCreateSoutenance);
    }

    // Formulaire de message
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', handleSendMessage);
    }

    // Onglets de messagerie
    const inboxTab = document.getElementById('inboxTab');
    const sentTab = document.getElementById('sentTab');
    if (inboxTab) inboxTab.addEventListener('click', () => showMessagingTab('inbox'));
    if (sentTab) sentTab.addEventListener('click', () => showMessagingTab('sent'));

    // Onglets de soutenances
    const programTab = document.getElementById('programTab');
    const listTab = document.getElementById('listTab');
    if (programTab) programTab.addEventListener('click', () => showSoutenanceTab('program'));
    if (listTab) listTab.addEventListener('click', () => showSoutenanceTab('list'));
}

// ============================================================
// 5. NAVIGATION ENTRE LES SECTIONS
// ============================================================

/**
 * Affiche une section spécifique et cache les autres
 * @param {string} sectionId - ID de la section à afficher
 */
function showSection(sectionId) {
    // Masquer la page d'accueil explicitement (display:flex !important nécessite style direct)
    const accueil = document.getElementById('accueil');
    if (accueil) {
        accueil.style.display = 'none';
    }

    // Masquer toutes les sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Désactiver tous les boutons du menu
    const menuButtons = document.querySelectorAll('.menu button');
    menuButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Afficher la section sélectionnée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Activer le bouton correspondant dans le menu
    const activeButton = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Actions spécifiques selon la section
    switch (sectionId) {
        case 'enterprises':
            updateEnterprisesList();
            break;
        case 'statistics':
            updateStatistics();
            break;
        case 'students':
            updateStudentsList();
            break;
        case 'messaging':
            loadMessages();
            break;
        case 'soutenances':
            loadSoutenances();
            populateStudentSelect();
            break;
        case 'report':
            // Afficher par défaut l'onglet des rapports soumis
            showReportTab('submitted');
            break;
    }
}

// ============================================================
// 6. CRÉATION D'UTILISATEURS
// ============================================================

/**
 * Gère la création d'un nouvel utilisateur.
 * AVANT : sauvegardait dans localStorage → les nouveaux comptes étaient
 *         invisibles pour la page de login.
 * MAINTENANT : envoie les données à /api/users/create → l'utilisateur
 *         est inséré dans SQLite → il peut immédiatement se connecter.
 * @param {Event} e - Événement de soumission du formulaire
 */
async function handleCreateUser(e) {
    e.preventDefault();

    // Récupérer les valeurs du formulaire
    const role     = document.getElementById('userRole').value;
    const name     = document.getElementById('name').value.trim();
    const surname  = document.getElementById('surname').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validation
    if (!name || !surname || !email || !password) {
        alert('⚠️ Veuillez remplir tous les champs.');
        return;
    }

    // Désactiver le bouton pour éviter le double-clic
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Création...'; }

    try {
        // Appel à l'API Express → insertion dans SQLite
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, name, surname, email, password, filiere: '', niveau: '' })
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ Utilisateur créé avec succès!\n\n👤 Nom : ${name} ${surname}\n📧 Email : ${email}\n🔑 Rôle : ${role === 'admin' ? 'Administrateur' : 'Étudiant'}\n\n🔐 Il peut maintenant se connecter avec cet email et ce mot de passe.`);

            // Réinitialiser le formulaire
            e.target.reset();

            // Recharger la liste des utilisateurs depuis l'API
            await loadData();

        } else {
            alert(`❌ Erreur : ${result.message}`);
        }

    } catch (err) {
        console.error('Erreur création utilisateur:', err);
        alert('❌ Erreur réseau. Vérifiez que le serveur Node.js est démarré.');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✅ Créer Utilisateur'; }
    }
}

// ============================================================
// 7. GESTION DES ENTREPRISES
// ============================================================

/**
 * Met à jour l'affichage de la liste des entreprises
 */
function updateEnterprisesList() {
    const tbody = document.getElementById('enterprisesList');
    if (!tbody) return;

    // Vider le tableau
    tbody.innerHTML = '';

    // Calculer les totaux
    let totalEnterprises = enterprises.length;
    let totalPlaced = enterprises.reduce((sum, ent) => sum + (ent.students ? ent.students.length : 0), 0);

    // Mettre à jour les cartes de statistiques
    const totalEntElement = document.getElementById('totalEnterprises');
    const totalPlacedElement = document.getElementById('totalPlaced');
    if (totalEntElement) totalEntElement.textContent = totalEnterprises;
    if (totalPlacedElement) totalPlacedElement.textContent = totalPlaced;

    // Afficher chaque entreprise
    enterprises.forEach((ent, index) => {
        const row = tbody.insertRow();

        // Nom de l'entreprise
        const cellName = row.insertCell(0);
        cellName.textContent = ent.name;
        cellName.style.fontWeight = '600';

        // Nombre d'étudiants
        const cellStudents = row.insertCell(1);
        cellStudents.textContent = ent.students ? ent.students.length : 0;
        cellStudents.style.textAlign = 'center';

        // Secteur
        const cellSector = row.insertCell(2);
        cellSector.textContent = ent.sector;

        // Actions
        const cellActions = row.insertCell(3);
        cellActions.innerHTML = `
            <button class="action-btn view-btn" onclick="viewEnterprise(${index})">👁️ Voir</button>
            <button class="action-btn edit-btn" onclick="editEnterprise(${index})">✏️ Modifier</button>
            <button class="action-btn delete-btn" onclick="deleteEnterprise(${index})">🗑️ Supprimer</button>
        `;
    });

    console.log('📋 Liste des entreprises mise à jour:', enterprises.length);
}

/**
 * Affiche le formulaire pour ajouter une nouvelle entreprise
 */
function showAddEnterpriseForm() {
    editingEnterpriseIndex = -1;

    // Réinitialiser le formulaire
    document.getElementById('entName').value = '';
    document.getElementById('entSector').value = '';
    document.getElementById('entContact').value = '';

    // Masquer la section d'assignation d'étudiant
    document.getElementById('studentAssignSection').style.display = 'none';

    // Changer le titre de la modale
    document.getElementById('modalTitle').textContent = 'Ajouter une entreprise';
    document.getElementById('saveEnterpriseBtn').textContent = '💾 Ajouter';

    // Afficher la modale
    document.getElementById('enterpriseModal').classList.add('show');
}

/**
 * Affiche les détails d'une entreprise
 * @param {number} index - Index de l'entreprise dans le tableau
 */
function viewEnterprise(index) {
    const ent = enterprises[index];

    let studentsText = 'Aucun étudiant assigné';
    if (ent.students && ent.students.length > 0) {
        studentsText = ent.students.join(', ');
    }

    alert(`🏢 Détails de l'entreprise\n\n` +
        `📌 Nom : ${ent.name}\n` +
        `🏭 Secteur : ${ent.sector}\n` +
        `📞 Contact : ${ent.contact}\n` +
        `👥 Étudiants (${ent.students ? ent.students.length : 0}) : ${studentsText}`);
}

/**
 * Ouvre le formulaire d'édition d'une entreprise
 * @param {number} index - Index de l'entreprise dans le tableau
 */
function editEnterprise(index) {
    editingEnterpriseIndex = index;
    const ent = enterprises[index];

    // Remplir le formulaire
    document.getElementById('entName').value = ent.name;
    document.getElementById('entSector').value = ent.sector;
    document.getElementById('entContact').value = ent.contact;

    // Afficher la section d'assignation d'étudiant
    document.getElementById('studentAssignSection').style.display = 'block';
    populateStudentSelectForEnterprise();

    // Changer le titre de la modale
    document.getElementById('modalTitle').textContent = 'Modifier l\'entreprise';
    document.getElementById('saveEnterpriseBtn').textContent = '💾 Enregistrer';

    // Afficher la modale
    document.getElementById('enterpriseModal').classList.add('show');
}

/**
 * Supprime une entreprise
 * @param {number} index - Index de l'entreprise dans le tableau
 */
function deleteEnterprise(index) {
    const ent = enterprises[index];

    if (confirm(`🗑️ Voulez-vous vraiment supprimer l'entreprise "${ent.name}" ?`)) {
        enterprises.splice(index, 1);
        saveEnterprises();
        updateEnterprisesList();
        alert('✅ Entreprise supprimée avec succès!');
    }
}

/**
 * Sauvegarde une entreprise (ajout ou modification)
 * @param {Event} e - Événement de soumission du formulaire
 */
function handleSaveEnterprise(e) {
    e.preventDefault();

    const name = document.getElementById('entName').value.trim();
    const sector = document.getElementById('entSector').value.trim();
    const contact = document.getElementById('entContact').value.trim();

    if (!name || !sector || !contact) {
        alert('⚠️ Veuillez remplir tous les champs.');
        return;
    }

    if (editingEnterpriseIndex === -1) {
        // Nouvelle entreprise
        const newEnterprise = {
            name: name,
            sector: sector,
            contact: contact,
            students: []
        };
        enterprises.push(newEnterprise);
        alert(`✅ Entreprise "${name}" ajoutée avec succès!`);
    } else {
        // Modification
        enterprises[editingEnterpriseIndex].name = name;
        enterprises[editingEnterpriseIndex].sector = sector;
        enterprises[editingEnterpriseIndex].contact = contact;

        // Gérer l'assignation d'étudiant
        const selectedStudent = document.getElementById('assignStudent').value;
        if (selectedStudent) {
            if (!enterprises[editingEnterpriseIndex].students) {
                enterprises[editingEnterpriseIndex].students = [];
            }
            if (!enterprises[editingEnterpriseIndex].students.includes(selectedStudent)) {
                enterprises[editingEnterpriseIndex].students.push(selectedStudent);
            }
        }

        alert(`✅ Entreprise "${name}" modifiée avec succès!`);
    }

    saveEnterprises();
    updateEnterprisesList();
    closeEnterpriseModal();
}

/**
 * Ferme la modale d'entreprise
 */
function closeEnterpriseModal() {
    document.getElementById('enterpriseModal').classList.remove('show');
    editingEnterpriseIndex = -1;
}

/**
 * Remplit le select d'étudiants pour l'assignation
 */
function populateStudentSelectForEnterprise() {
    const select = document.getElementById('assignStudent');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner un étudiant --</option>';

    // Filtrer uniquement les étudiants
    const students = users.filter(u => u.role === 'student');

    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.fullName;
        option.textContent = student.fullName;
        select.appendChild(option);
    });
}

/**
 * Recherche une entreprise dans la liste
 */
function searchEnterprise() {
    const searchTerm = document.getElementById('enterpriseSearch').value.toLowerCase();
    const tbody = document.getElementById('enterprisesList');
    const rows = tbody.getElementsByTagName('tr');

    for (let row of rows) {
        const name = row.cells[0].textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

// ============================================================
// 8. STATISTIQUES
// ============================================================

/**
 * Met à jour l'affichage des statistiques
 */
function updateStatistics() {
    const tbody = document.getElementById('statisticsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    enterprises.forEach(ent => {
        const row = tbody.insertRow();

        // Nom entreprise
        const cellName = row.insertCell(0);
        cellName.textContent = ent.name;
        cellName.style.fontWeight = '600';

        // Étudiants en stage (tous)
        const cellTotal = row.insertCell(1);
        const totalStudents = ent.students ? ent.students.length : 0;
        cellTotal.textContent = totalStudents;
        cellTotal.style.textAlign = 'center';

        // Stages terminés (simulation: 30% des stages)
        const cellCompleted = row.insertCell(2);
        const completed = Math.floor(totalStudents * 0.3);
        cellCompleted.textContent = completed;
        cellCompleted.style.textAlign = 'center';
        cellCompleted.style.color = '#2e7d32';

        // Stages en cours (le reste)
        const cellOngoing = row.insertCell(3);
        const ongoing = totalStudents - completed;
        cellOngoing.textContent = ongoing;
        cellOngoing.style.textAlign = 'center';
        cellOngoing.style.color = '#1976D2';
    });
}

/**
 * Recherche dans les statistiques
 */
function searchStatistics() {
    const searchTerm = document.getElementById('statsSearch').value.toLowerCase();
    const tbody = document.getElementById('statisticsTableBody');
    const rows = tbody.getElementsByTagName('tr');

    for (let row of rows) {
        const name = row.cells[0].textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

// ============================================================
// 9. GÉNÉRATION DE RAPPORTS
// ============================================================

/**
 * Génère et télécharge un rapport PDF
 */
function generateReport() {
    // Vérifier si jsPDF est disponible
    if (typeof jspdf === 'undefined') {
        alert('⚠️ Erreur : La bibliothèque PDF n\'est pas chargée.');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // Titre du rapport
    doc.setFontSize(20);
    doc.setTextColor(46, 125, 50);
    doc.text('Rapport de Gestion des Stages', 105, 20, { align: 'center' });

    // Date du rapport
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 105, 28, { align: 'center' });
    doc.text(`Par : ${currentAdmin.name}`, 105, 33, { align: 'center' });

    // Ligne de séparation
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    let yPos = 48;

    // Section 1: Statistiques générales
    doc.setFontSize(14);
    doc.setTextColor(46, 125, 50);
    doc.text('📊 Statistiques Générales', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total d'entreprises : ${enterprises.length}`, 25, yPos);
    yPos += 6;

    const totalStudents = enterprises.reduce((sum, ent) => sum + (ent.students ? ent.students.length : 0), 0);
    doc.text(`Total d'étudiants en stage : ${totalStudents}`, 25, yPos);
    yPos += 6;

    const totalUsers = users.filter(u => u.role === 'student').length;
    doc.text(`Total d'étudiants inscrits : ${totalUsers}`, 25, yPos);
    yPos += 6;

    const totalSoutenances = soutenances.length;
    doc.text(`Soutenances programmées : ${totalSoutenances}`, 25, yPos);
    yPos += 15;

    // Section 2: Entreprises
    if (enterprises.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(46, 125, 50);
        doc.text('🏢 Liste des Entreprises', 20, yPos);
        yPos += 8;

        // Préparer les données pour le tableau
        const tableData = enterprises.map(ent => [
            ent.name,
            ent.sector,
            ent.students ? ent.students.length.toString() : '0'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Entreprise', 'Secteur', 'Étudiants']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [46, 125, 50],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9
            }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Nouvelle page si nécessaire
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }

    // Section 3: Soutenances
    if (soutenances.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(46, 125, 50);
        doc.text('🎤 Soutenances Programmées', 20, yPos);
        yPos += 8;

        const soutenancesData = soutenances.map(s => [
            s.studentName,
            new Date(s.date).toLocaleDateString('fr-FR'),
            s.time,
            s.salle
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Étudiant', 'Date', 'Heure', 'Salle']],
            body: soutenancesData,
            theme: 'grid',
            headStyles: {
                fillColor: [46, 125, 50],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9
            }
        });
    }

    // Pied de page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} sur ${pageCount}`, 105, 287, { align: 'center' });
    }

    // Télécharger le PDF
    const fileName = `Rapport_Stages_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    alert('✅ Rapport PDF généré avec succès!');
}

// ============================================================
// 10. GESTION DES ÉTUDIANTS
// ============================================================

/**
 * Met à jour la liste des étudiants
 */
function updateStudentsList() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Filtrer uniquement les étudiants
    const students = users.filter(u => u.role === 'student');

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:40px;">Aucun étudiant inscrit</td></tr>';
        return;
    }

    students.forEach((student, index) => {
        const row = tbody.insertRow();

        // Nom complet
        const cellName = row.insertCell(0);
        cellName.textContent = student.fullName;
        cellName.style.fontWeight = '600';

        // Email
        const cellEmail = row.insertCell(1);
        cellEmail.textContent = student.email;

        // Entreprise (vérifier les demandes de stage)
        const cellEnterprise = row.insertCell(2);
        const request = internshipRequests.find(r => r.studentName === student.fullName);
        cellEnterprise.textContent = request ? request.enterprise : 'Non assigné';

        // Date de création
        const cellDate = row.insertCell(3);
        if (student.createdAt) {
            cellDate.textContent = new Date(student.createdAt).toLocaleDateString('fr-FR');
        } else {
            cellDate.textContent = '-';
        }

        // Statut
        const cellStatus = row.insertCell(4);
        if (request) {
            cellStatus.innerHTML = `<span class="status-badge status-${request.status === 'approved' ? 'approved' : request.status === 'rejected' ? 'rejected' : 'pending'}">${request.status === 'approved' ? 'Approuvé' : request.status === 'rejected' ? 'Rejeté' : 'En attente'}</span>`;
        } else {
            cellStatus.innerHTML = '<span class="status-badge">Aucune demande</span>';
        }

        // Actions
        const cellActions = row.insertCell(5);
        cellActions.innerHTML = `
            <button class="action-btn view-btn" onclick="viewStudent(${index})">👁️ Voir</button>
            <button class="action-btn delete-btn" onclick="deleteStudent('${student.email}')">🗑️ Supprimer</button>
        `;
    });
}

/**
 * Affiche les détails d'un étudiant
 * @param {number} index - Index de l'étudiant
 */
function viewStudent(index) {
    const students = users.filter(u => u.role === 'student');
    const student = students[index];

    const request = internshipRequests.find(r => r.studentName === student.fullName);

    let info = `👤 Détails de l'étudiant\n\n`;
    info += `📌 Nom : ${student.fullName}\n`;
    info += `📧 Email : ${student.email}\n`;
    info += `📅 Inscrit le : ${student.createdAt ? new Date(student.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}\n\n`;

    if (request) {
        info += `🏢 Entreprise : ${request.enterprise}\n`;
        info += `📅 Période : ${new Date(request.startDate).toLocaleDateString('fr-FR')} au ${new Date(request.endDate).toLocaleDateString('fr-FR')}\n`;
        info += `📊 Statut : ${request.status === 'approved' ? 'Approuvé ✅' : request.status === 'rejected' ? 'Rejeté ❌' : 'En attente ⏳'}`;
    } else {
        info += `ℹ️ Aucune demande de stage enregistrée`;
    }

    alert(info);
}

/**
 * Supprime un étudiant via l'API (suppression réelle en SQLite)
 * @param {string} email - Email de l'étudiant à supprimer
 */
async function deleteStudent(email) {
    const student = users.find(u => u.email === email);
    if (!student) return;

    if (!confirm(`🗑️ Voulez-vous vraiment supprimer l'étudiant "${student.fullName}" ?`)) return;

    try {
        const response = await fetch(`/api/users/${student.id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            await loadData();
            alert('✅ Étudiant supprimé avec succès!');
        } else {
            alert(`❌ ${result.message}`);
        }
    } catch (err) {
        console.error('Erreur suppression:', err);
        alert('❌ Erreur réseau.');
    }
}

/**
 * Recherche un étudiant
 */
function searchStudent() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const tbody = document.getElementById('studentsTableBody');
    const rows = tbody.getElementsByTagName('tr');

    for (let row of rows) {
        const name = row.cells[0].textContent.toLowerCase();
        const email = row.cells[1].textContent.toLowerCase();
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

// ============================================================
// 11. MESSAGERIE
// ============================================================

/**
 * Charge les messages de la messagerie
 */
function loadMessages() {
    // Charger les messages reçus (simulés pour la démo)
    messagesInbox = [];

    // Messages envoyés
    const savedSent = localStorage.getItem('adminToStudentMessages');
    messagesSent = savedSent ? JSON.parse(savedSent) : [];

    updateInboxMessages();
    updateSentMessages();
    updateMessageCounts();
}

/**
 * Vérifie les nouveaux messages des étudiants
 */
function checkStudentMessages() {
    const studentMessages = localStorage.getItem('studentToAdminMessages');
    if (studentMessages) {
        const messages = JSON.parse(studentMessages);

        // Ajouter les nouveaux messages
        messages.forEach(msg => {
            const exists = messagesInbox.find(m => m.id === msg.id);
            if (!exists) {
                messagesInbox.unshift(msg);
            }
        });

        updateInboxMessages();
        updateMessageCounts();
    }
}

/**
 * Met à jour l'affichage des messages reçus
 */
function updateInboxMessages() {
    const inboxList = document.getElementById('inboxList');
    if (!inboxList) return;

    if (messagesInbox.length === 0) {
        inboxList.innerHTML = '<div class="empty-state"><p>🔭 Aucun message reçu</p></div>';
        return;
    }

    inboxList.innerHTML = messagesInbox.map(msg => `
        <div class="message-item ${!msg.read ? 'unread' : ''}" onclick="openMessage(${msg.id}, 'inbox')">
            <strong>📧 ${msg.from}</strong> – ${msg.subject}
            <br><small>📅 ${new Date(msg.date).toLocaleDateString('fr-FR')} à ${new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>
            <p>${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}</p>
        </div>
    `).join('');
}

/**
 * Met à jour l'affichage des messages envoyés
 */
function updateSentMessages() {
    const sentList = document.getElementById('sentList');
    if (!sentList) return;

    if (messagesSent.length === 0) {
        sentList.innerHTML = '<div class="empty-state"><p>🔭 Aucun message envoyé</p></div>';
        return;
    }

    sentList.innerHTML = messagesSent.map(msg => `
        <div class="message-item" onclick="openMessage(${msg.id}, 'sent')">
            <strong>📧 À : ${msg.to}</strong> – ${msg.subject}
            <br><small>📅 ${new Date(msg.date).toLocaleDateString('fr-FR')} à ${new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>
            <p>${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}</p>
        </div>
    `).join('');
}

/**
 * Met à jour les compteurs de messages
 */
function updateMessageCounts() {
    const messageCount = document.getElementById('messageCount');
    if (messageCount) {
        const unreadCount = messagesInbox.filter(m => !m.read).length;
        messageCount.textContent = unreadCount;
        messageCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Affiche les onglets de messagerie
 * @param {string} tab - 'inbox' ou 'sent'
 */
function showMessagingTab(tab) {
    console.log('✉️ Changement onglet messagerie:', tab);
    
    // Masquer tous les contenus
    document.querySelectorAll('.messaging-tab').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    // Désactiver tous les boutons
    document.querySelectorAll('.messaging-submenu .submenu-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activer l'onglet sélectionné
    const targetTab = document.getElementById(tab);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
    }

    // Activer le bouton correspondant via onclick event
    const buttons = document.querySelectorAll('.messaging-submenu .submenu-btn');
    buttons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes("'" + tab + "'")) {
            btn.classList.add('active');
        }
    });
}

/**
 * Ouvre un message
 * @param {number} messageId - ID du message
 * @param {string} type - 'inbox' ou 'sent'
 */
function openMessage(messageId, type) {
    const messages = type === 'inbox' ? messagesInbox : messagesSent;
    const message = messages.find(m => m.id === messageId);

    if (!message) return;

    if (type === 'inbox' && !message.read) {
        message.read = true;
        updateInboxMessages();
        updateMessageCounts();
    }

    const from = type === 'inbox' ? message.from : `Vous → ${message.to}`;

    alert(`📧 Message complet\n\n👤 ${from}\n📝 ${message.subject}\n📅 ${new Date(message.date).toLocaleDateString('fr-FR')} à ${new Date(message.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n\n${message.content}`);
}

/**
 * Gère l'envoi d'un nouveau message
 * @param {Event} e - Événement de soumission
 */
function handleSendMessage(e) {
    e.preventDefault();

    const to = document.getElementById('messageTo').value;
    const subject = document.getElementById('messageSubject').value.trim();
    const content = document.getElementById('messageContent').value.trim();

    if (!to || !subject || !content) {
        alert('⚠️ Veuillez remplir tous les champs du message.');
        return;
    }

    const newMessage = {
        id: Date.now(),
        from: currentAdmin.name,
        to: to,
        subject: subject,
        content: content,
        date: new Date().toISOString(),
        read: false
    };

    messagesSent.unshift(newMessage);

    // Sauvegarder pour que l'étudiant puisse le voir
    const adminToStudent = JSON.parse(localStorage.getItem('adminToStudentMessages') || '[]');
    adminToStudent.unshift(newMessage);
    localStorage.setItem('adminToStudentMessages', JSON.stringify(adminToStudent));

    alert(`✅ Message envoyé avec succès !\n\n📧 Destinataire : ${to}\n📝 Objet : ${subject}`);

    e.target.reset();
    updateSentMessages();
    showMessagingTab('sent');
}

/**
 * Remplit le select des destinataires avec les étudiants
 */
function populateStudentSelect() {
    const select = document.getElementById('messageTo');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner un étudiant --</option>';

    const students = users.filter(u => u.role === 'student');
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.fullName;
        option.textContent = student.fullName;
        select.appendChild(option);
    });
}

// ============================================================
// 12. GESTION DES SOUTENANCES
// ============================================================

/**
 * Charge les soutenances
 */
function loadSoutenances() {
    updateSoutenancesList();
}

/**
 * Met à jour la liste des soutenances
 */
function updateSoutenancesList() {
    const tbody = document.getElementById('soutenancesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (soutenances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:40px;">Aucune soutenance programmée</td></tr>';
        return;
    }

    soutenances.forEach((sout, index) => {
        const row = tbody.insertRow();

        // Étudiant
        const cellStudent = row.insertCell(0);
        cellStudent.textContent = sout.studentName;
        cellStudent.style.fontWeight = '600';

        // Date
        const cellDate = row.insertCell(1);
        cellDate.textContent = new Date(sout.date).toLocaleDateString('fr-FR');

        // Heure
        const cellTime = row.insertCell(2);
        cellTime.textContent = sout.time;

        // Salle
        const cellSalle = row.insertCell(3);
        cellSalle.textContent = sout.salle;

        // Jury
        const cellJury = row.insertCell(4);
        const juryList = sout.jury.map(j => `${j.title}: ${j.name}`).join('<br>');
        cellJury.innerHTML = juryList;
        cellJury.style.fontSize = '13px';

        // Actions
        const cellActions = row.insertCell(5);
        cellActions.innerHTML = `
            <button class="action-btn view-btn" onclick="viewSoutenance(${index})">👁️ Voir</button>
            <button class="action-btn delete-btn" onclick="deleteSoutenance(${index})">🗑️ Supprimer</button>
        `;
    });
}

/**
 * Gère la création d'une nouvelle soutenance
 * @param {Event} e - Événement de soumission
 */
function handleCreateSoutenance(e) {
    e.preventDefault();

    const studentName = document.getElementById('soutenanceStudent').value;
    const date = document.getElementById('soutenanceDate').value;
    const time = document.getElementById('soutenanceTime').value;
    const salle = document.getElementById('soutenanceSalle').value;

    if (!studentName || !date || !time || !salle) {
        alert('⚠️ Veuillez remplir tous les champs obligatoires.');
        return;
    }

    // Récupérer les membres du jury
    const juryMembers = [];
    const juryMemberDivs = document.querySelectorAll('.jury-member');

    juryMemberDivs.forEach(div => {
        const title = div.querySelector('.jury-title').value;
        const name = div.querySelector('.jury-name').value.trim();

        if (title && name) {
            juryMembers.push({ title, name });
        }
    });

    if (juryMembers.length < 3) {
        alert('⚠️ Veuillez renseigner au moins 3 membres du jury.');
        return;
    }

    const newSoutenance = {
        id: Date.now(),
        studentName: studentName,
        date: date,
        time: time,
        salle: salle,
        jury: juryMembers,
        createdAt: new Date().toISOString()
    };

    soutenances.push(newSoutenance);
    saveSoutenances();
    updateSoutenancesList();

    alert(`✅ Soutenance programmée avec succès!\n\n👤 Étudiant : ${studentName}\n📅 Date : ${new Date(date).toLocaleDateString('fr-FR')}\n🕐 Heure : ${time}\n🏫 Salle : ${salle}`);

    e.target.reset();
    showSoutenanceTab('list');
}

/**
 * Affiche les détails d'une soutenance
 * @param {number} index - Index de la soutenance
 */
function viewSoutenance(index) {
    const sout = soutenances[index];

    let info = `🎤 Détails de la soutenance\n\n`;
    info += `👤 Étudiant : ${sout.studentName}\n`;
    info += `📅 Date : ${new Date(sout.date).toLocaleDateString('fr-FR')}\n`;
    info += `🕐 Heure : ${sout.time}\n`;
    info += `🏫 Salle : ${sout.salle}\n\n`;
    info += `👥 Membres du jury :\n`;
    sout.jury.forEach((j, i) => {
        info += `  ${i + 1}. ${j.title} - ${j.name}\n`;
    });

    alert(info);
}

/**
 * Supprime une soutenance
 * @param {number} index - Index de la soutenance
 */
function deleteSoutenance(index) {
    const sout = soutenances[index];

    if (confirm(`🗑️ Voulez-vous vraiment supprimer la soutenance de "${sout.studentName}" ?`)) {
        soutenances.splice(index, 1);
        saveSoutenances();
        updateSoutenancesList();
        alert('✅ Soutenance supprimée avec succès!');
    }
}

/**
 * Affiche les onglets de soutenances
 * @param {string} tabId - 'program' ou 'list'
 */
function showSoutenanceTab(tabId) {
    console.log('🎤 Changement onglet soutenance:', tabId);
    
    const tabs = document.querySelectorAll('.soutenance-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    const buttons = document.querySelectorAll('.soutenances-submenu .submenu-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }

    // Activer le bouton correspondant
    const allButtons = document.querySelectorAll('.soutenances-submenu .submenu-btn');
    allButtons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes("'" + tabId + "'")) {
            btn.classList.add('active');
        }
    });
}

/**
 * Ajoute un membre au jury dynamiquement
 */
function addJuryMember() {
    const container = document.getElementById('juryMembersContainer');
    const memberCount = container.querySelectorAll('.jury-member').length + 1;

    const newMember = document.createElement('div');
    newMember.className = 'jury-member';
    newMember.innerHTML = `
        <label>Titre du membre ${memberCount} :</label>
        <select class="jury-title" required>
            <option value="">-- Sélectionner --</option>
            <option value="Président(e) du jury">Président(e) du jury</option>
            <option value="Maître de stage">Maître de stage</option>
            <option value="Professeur(e) de suivi">Professeur(e) de suivi</option>
            <option value="Rapporteur">Rapporteur(e)</option>
        </select>
        <label>Nom complet :</label>
        <input type="text" class="jury-name" placeholder="Ex: Prof. KABORE" required>
    `;

    container.appendChild(newMember);
}

/**
 * Télécharge le calendrier des soutenances en PDF
 */
function downloadCalendarPDF() {
    if (soutenances.length === 0) {
        alert('⚠️ Aucune soutenance programmée pour générer un calendrier.');
        return;
    }

    if (typeof jspdf === 'undefined') {
        alert('⚠️ Erreur : La bibliothèque PDF n\'est pas chargée.');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // Titre
    doc.setFontSize(18);
    doc.setTextColor(46, 125, 50);
    doc.text('Calendrier des Soutenances', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 105, 28, { align: 'center' });

    // Préparer les données
    const tableData = soutenances.map(s => {
        const juryNames = s.jury.map(j => j.name).join(', ');
        return [
            s.studentName,
            new Date(s.date).toLocaleDateString('fr-FR'),
            s.time,
            s.salle,
            juryNames
        ];
    });

    doc.autoTable({
        startY: 35,
        head: [['Étudiant', 'Date', 'Heure', 'Salle', 'Jury']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [46, 125, 50],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 4
        }
    });

    const fileName = `Calendrier_Soutenances_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    alert('✅ Calendrier PDF téléchargé avec succès!');
}

// ============================================================
// 13. FERMETURE DE LA MODALE DE MESSAGE
// ============================================================

/**
 * Ferme la modale de message
 */
function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ============================================================
// 14. GESTION DE LA SECTION "AJOUTER UN ÉTUDIANT"
// ============================================================

/**
 * Affiche le formulaire pour ajouter un étudiant
 * Redirige vers la section Créer Utilisateur
 */
/**
 * Gère l'ajout d'un étudiant depuis le formulaire dédié (section Étudiants).
 * Même logique que handleCreateUser : on passe par l'API pour sauvegarder
 * dans SQLite, garantissant que l'étudiant peut se connecter immédiatement.
 */
async function handleAddStudent(event) {
    event.preventDefault();

    const name     = document.getElementById('studentName').value.trim();
    const surname  = document.getElementById('studentSurname').value.trim();
    const email    = document.getElementById('studentEmail').value.trim();
    const password = document.getElementById('studentPassword').value;
    const filiere  = document.getElementById('studentFiliere').value.trim();
    const niveau   = document.getElementById('studentNiveau').value;

    if (!name || !surname || !email || !password || !filiere || !niveau) {
        alert('⚠️ Veuillez remplir tous les champs obligatoires');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Ajout...'; }

    try {
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'student', name, surname, email, password, filiere, niveau })
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ Étudiant créé avec succès !\n\n👤 ${name} ${surname}\n📧 ${email}\n🎓 ${filiere} - ${niveau}\n\n🔐 Il peut maintenant se connecter.`);
            hideAddStudentForm();
            await loadData();
        } else {
            alert(`❌ ${result.message}`);
        }

    } catch (err) {
        console.error('Erreur ajout étudiant:', err);
        alert('❌ Erreur réseau. Vérifiez que le serveur Node.js est démarré.');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Ajouter'; }
    }
}

function showAddStudentForm() {
    const formContainer = document.getElementById('addStudentFormContainer');
    if (formContainer) {
        // Afficher le formulaire
        formContainer.style.display = 'block';
        
        // Faire défiler jusqu'au formulaire
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('✅ Formulaire d\'ajout d\'étudiant affiché');
    } else {
        console.error('❌ Formulaire addStudentFormContainer introuvable');
    }
}

function hideAddStudentForm() {
    const formContainer = document.getElementById('addStudentFormContainer');
    if (formContainer) {
        formContainer.style.display = 'none';
        
        // Réinitialiser le formulaire
        const form = document.getElementById('addStudentForm');
        if (form) {
            form.reset();
        }
        
        console.log('✅ Formulaire d\'ajout d\'étudiant masqué');
    }
}

// ============================================================
// 15. GESTION DE LA SECTION RAPPORT
// ============================================================

/**
 * Affiche les onglets de la section Rapport
 * @param {string} tabId - 'submitted' ou 'pending'
 */
function showReportTab(tabId) {
    console.log('📊 Affichage de l\'onglet rapport:', tabId);

    // Masquer tous les contenus d'onglets
    const contents = document.querySelectorAll('.report-tab');
    contents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    // Désactiver tous les boutons d'onglets
    const buttons = document.querySelectorAll('.report-submenu .submenu-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Activer l'onglet sélectionné (rendered ou pending)
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
    }

    // Activer le bouton correspondant
    const allButtons = document.querySelectorAll('.report-submenu .submenu-btn');
    allButtons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes("'" + tabId + "'")) {
            btn.classList.add('active');
        }
    });
}

/**
 * Charge les rapports soumis (rapports finaux)
 */
function loadSubmittedReports() {
    const container = document.getElementById('submittedReportsList');
    if (!container) return;

    // Récupérer tous les rapports finaux des étudiants
    const allReports = [];

    // Parcourir tous les étudiants
    const students = users.filter(u => u.role === 'student');
    students.forEach(student => {
        const reportKey = `finalReport_${student.username}`;
        const report = localStorage.getItem(reportKey);
        if (report) {
            const reportData = JSON.parse(report);
            if (reportData.status === 'submitted') {
                allReports.push({
                    studentName: student.fullName,
                    studentUsername: student.username,
                    ...reportData
                });
            }
        }
    });

    if (allReports.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📭 Aucun rapport soumis</p><small>Les rapports soumis par les étudiants apparaîtront ici</small></div>';
        return;
    }

    // Afficher dans un tableau
    let html = '<table><thead><tr><th>Étudiant</th><th>Entreprise</th><th>Fichier</th><th>Date de soumission</th><th>Actions</th></tr></thead><tbody>';

    allReports.forEach((report, index) => {
        const request = internshipRequests.find(r => r.studentName === report.studentName);
        const enterprise = request ? request.enterprise : 'Non assigné';

        html += `
            <tr>
                <td style="font-weight:600">${report.studentName}</td>
                <td>${enterprise}</td>
                <td>${report.fileName}</td>
                <td>${new Date(report.submittedAt).toLocaleDateString('fr-FR')}</td>
                <td>
                    <button class="action-btn view-btn" onclick="viewReport('${report.studentUsername}')">👁️ Voir</button>
                    <button class="action-btn edit-btn" onclick="downloadReport('${report.studentUsername}')">📥 Télécharger</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Charge les rapports en attente (thèmes en attente de validation)
 */
function loadPendingReports() {
    const container = document.getElementById('pendingReportsList');
    if (!container) return;

    // Récupérer tous les thèmes en attente
    const pendingThemes = [];

    const students = users.filter(u => u.role === 'student');
    students.forEach(student => {
        const themeKey = `reportTheme_${student.username}`;
        const theme = localStorage.getItem(themeKey);
        if (theme) {
            const themeData = JSON.parse(theme);
            if (themeData.status === 'pending') {
                pendingThemes.push({
                    studentName: student.fullName,
                    studentUsername: student.username,
                    ...themeData
                });
            }
        }
    });

    if (pendingThemes.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📭 Aucun thème en attente de validation</p><small>Les thèmes soumis par les étudiants apparaîtront ici</small></div>';
        return;
    }

    // Afficher dans un tableau
    let html = '<table><thead><tr><th>Étudiant</th><th>Thème</th><th>Date de soumission</th><th>Actions</th></tr></thead><tbody>';

    pendingThemes.forEach(theme => {
        html += `
            <tr>
                <td style="font-weight:600">${theme.studentName}</td>
                <td>${theme.theme.substring(0, 60)}${theme.theme.length > 60 ? '...' : ''}</td>
                <td>${new Date(theme.submittedAt).toLocaleDateString('fr-FR')}</td>
                <td>
                    <button class="action-btn view-btn" onclick="viewTheme('${theme.studentUsername}')">👁️ Voir détails</button>
                    <button class="action-btn edit-btn" onclick="approveTheme('${theme.studentUsername}')">✅ Approuver</button>
                    <button class="action-btn delete-btn" onclick="rejectTheme('${theme.studentUsername}')">❌ Rejeter</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Affiche les détails d'un rapport soumis
 * @param {string} studentUsername - Username de l'étudiant
 */
function viewReport(studentUsername) {
    const reportKey = `finalReport_${studentUsername}`;
    const report = localStorage.getItem(reportKey);

    if (!report) {
        alert('⚠️ Rapport introuvable.');
        return;
    }

    const reportData = JSON.parse(report);
    const student = users.find(u => u.username === studentUsername);

    alert(`📄 Détails du rapport\n\n` +
        `👤 Étudiant : ${student ? student.fullName : 'Inconnu'}\n` +
        `📁 Fichier : ${reportData.fileName}\n` +
        `📦 Taille : ${reportData.fileSize}\n` +
        `📅 Soumis le : ${new Date(reportData.submittedAt).toLocaleDateString('fr-FR')}\n\n` +
        `Le rapport a été soumis avec succès.`);
}

/**
 * Télécharge un rapport (simulation)
 * @param {string} studentUsername - Username de l'étudiant
 */
function downloadReport(studentUsername) {
    const reportKey = `finalReport_${studentUsername}`;
    const report = localStorage.getItem(reportKey);

    if (!report) {
        alert('⚠️ Rapport introuvable.');
        return;
    }

    const reportData = JSON.parse(report);
    alert(`📥 Téléchargement en cours...\n\n📄 Fichier : ${reportData.fileName}\n\n✅ Le rapport a été téléchargé avec succès!`);
}

/**
 * Affiche les détails d'un thème
 * @param {string} studentUsername - Username de l'étudiant
 */
function viewTheme(studentUsername) {
    const themeKey = `reportTheme_${studentUsername}`;
    const theme = localStorage.getItem(themeKey);

    if (!theme) {
        alert('⚠️ Thème introuvable.');
        return;
    }

    const themeData = JSON.parse(theme);
    const student = users.find(u => u.username === studentUsername);

    alert(`📝 Détails du thème\n\n` +
        `👤 Étudiant : ${student ? student.fullName : 'Inconnu'}\n\n` +
        `📌 Thème :\n${themeData.theme}\n\n` +
        `📋 Description :\n${themeData.description}\n\n` +
        `📅 Soumis le : ${new Date(themeData.submittedAt).toLocaleDateString('fr-FR')}`);
}

/**
 * Approuve un thème de rapport
 * @param {string} studentUsername - Username de l'étudiant
 */
function approveTheme(studentUsername) {
    const student = users.find(u => u.username === studentUsername);
    if (!confirm(`✅ Voulez-vous approuver le thème de ${student ? student.fullName : 'cet étudiant'} ?`)) {
        return;
    }

    const themeKey = `reportTheme_${studentUsername}`;
    const theme = localStorage.getItem(themeKey);

    if (!theme) {
        alert('⚠️ Thème introuvable.');
        return;
    }

    const themeData = JSON.parse(theme);
    themeData.status = 'approved';
    themeData.approvedAt = new Date().toISOString();
    themeData.approvedBy = currentAdmin.name;
    localStorage.setItem(themeKey, JSON.stringify(themeData));

    alert(`✅ Thème approuvé avec succès!\n\n👤 Étudiant : ${student ? student.fullName : 'Inconnu'}\n\nL'étudiant peut maintenant soumettre son rapport final.`);

    // Recharger l'affichage
    loadPendingReports();
}

/**
 * Rejette un thème de rapport
 * @param {string} studentUsername - Username de l'étudiant
 */
function rejectTheme(studentUsername) {
    const student = users.find(u => u.username === studentUsername);
    const reason = prompt(`❌ Rejet du thème de ${student ? student.fullName : 'cet étudiant'}\n\nVeuillez indiquer la raison du rejet :`);

    if (!reason) {
        alert('⚠️ Vous devez fournir une raison pour rejeter le thème.');
        return;
    }

    const themeKey = `reportTheme_${studentUsername}`;
    const theme = localStorage.getItem(themeKey);

    if (!theme) {
        alert('⚠️ Thème introuvable.');
        return;
    }

    const themeData = JSON.parse(theme);
    themeData.status = 'rejected';
    themeData.rejectedAt = new Date().toISOString();
    themeData.rejectedBy = currentAdmin.name;
    themeData.rejectionReason = reason;
    localStorage.setItem(themeKey, JSON.stringify(themeData));

    alert(`❌ Thème rejeté.\n\n👤 Étudiant : ${student ? student.fullName : 'Inconnu'}\n📝 Raison : ${reason}\n\nL'étudiant devra soumettre un nouveau thème.`);

    // Recharger l'affichage
    loadPendingReports();
}

// ============================================================
// FIN DU FICHIER JAVASCRIPT
// ============================================================

console.log('✅ Dashboard administrateur initialisé');