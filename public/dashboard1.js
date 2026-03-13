/**
 * ============================================================
 * DASHBOARD1.JS - TABLEAU DE BORD ÉTUDIANT
 * ============================================================
 * Ce fichier contient toute la logique pour :
 * - Demande de stage (étape 1 : entreprise, étape 2 : calendrier)
 * - Soumission du thème de rapport
 * - Soumission du rapport final
 * - Messagerie avec l'administrateur
 * - Visualisation des soutenances
 * ============================================================
 */

// ============================================================
// 1. VARIABLES GLOBALES ET INITIALISATION
// ============================================================

/**
 * Étudiant actuellement connecté
 * Récupéré depuis localStorage après connexion
 */
let currentStudent = null;

/**
 * Demande de stage de l'étudiant
 */
let internshipRequest = null;

/**
 * Thème du rapport soumis
 */
let reportTheme = null;

/**
 * Rapport final soumis
 */
let finalReport = null;

/**
 * Messages reçus (boîte de réception)
 */
let messagesInbox = [];

/**
 * Messages envoyés
 */
let messagesSent = [];

/**
 * Soutenances programmées pour cet étudiant
 */
let mySoutenances = [];

/**
 * Initialisation au chargement de la page
 */
document.addEventListener('DOMContentLoaded', function () {
    // Vérifier si l'utilisateur est connecté
    checkAuth();

    // Charger les données de l'étudiant
    loadStudentData();

    // Initialiser les écouteurs d'événements
    initEventListeners();

    // Aucune section active au démarrage — on affiche l'accueil avec le logo
    // (la section #accueil est déjà active dans le HTML)

    // Charger les messages
    loadMessages();

    // Vérifier périodiquement les nouveaux messages de l'admin
    setInterval(checkAdminMessages, 3000);

    // Charger les soutenances
    loadSoutenances();
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

    currentStudent = JSON.parse(user);

    // Vérifier que c'est bien un étudiant
    if (currentStudent.role !== 'student') {
        alert('⚠️ Accès interdit. Vous n\'êtes pas étudiant.');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ Étudiant connecté:', currentStudent.name);
}

/**
 * Déconnexion de l'utilisateur
 */
function logout() {
    if (confirm('🚪 Voulez-vous vous déconnecter ?')) {
        alert('✅ Déconnexion réussie!\n\nÀ bientôt!');
        window.location.href = 'index.html';
    }
}

// ============================================================
// 3. CHARGEMENT DES DONNÉES DE L'ÉTUDIANT
// ============================================================

/**
 * Charge toutes les données de l'étudiant depuis localStorage
 */
function loadStudentData() {
    // Charger la demande de stage
    const savedRequest = localStorage.getItem(`internshipRequest_${currentStudent.username}`);
    if (savedRequest) {
        internshipRequest = JSON.parse(savedRequest);
        displayInternshipRequest();
    }

    // Charger le thème du rapport
    const savedTheme = localStorage.getItem(`reportTheme_${currentStudent.username}`);
    if (savedTheme) {
        reportTheme = JSON.parse(savedTheme);
        displayReportTheme();
    }

    // Charger le rapport final
    const savedReport = localStorage.getItem(`finalReport_${currentStudent.username}`);
    if (savedReport) {
        finalReport = JSON.parse(savedReport);
        displayFinalReport();
    }

    console.log('📊 Données de l\'étudiant chargées');
}

/**
 * Sauvegarde la demande de stage
 */
function saveInternshipRequest() {
    localStorage.setItem(`internshipRequest_${currentStudent.username}`, JSON.stringify(internshipRequest));

    // Sauvegarder aussi dans la liste globale pour l'admin
    const allRequests = JSON.parse(localStorage.getItem('internshipRequests') || '[]');
    const existingIndex = allRequests.findIndex(r => r.studentName === currentStudent.name);

    if (existingIndex !== -1) {
        allRequests[existingIndex] = internshipRequest;
    } else {
        allRequests.push(internshipRequest);
    }

    localStorage.setItem('internshipRequests', JSON.stringify(allRequests));
    console.log('💾 Demande de stage sauvegardée');
}

/**
 * Sauvegarde le thème du rapport
 */
function saveReportTheme() {
    localStorage.setItem(`reportTheme_${currentStudent.username}`, JSON.stringify(reportTheme));
    console.log('💾 Thème du rapport sauvegardé');
}

/**
 * Sauvegarde le rapport final
 */
function saveFinalReport() {
    localStorage.setItem(`finalReport_${currentStudent.username}`, JSON.stringify(finalReport));
    console.log('💾 Rapport final sauvegardé');
}

// ============================================================
// 4. INITIALISATION DES ÉCOUTEURS D'ÉVÉNEMENTS
// ============================================================

/**
 * Initialise tous les écouteurs d'événements des formulaires
 */
function initEventListeners() {
    // Formulaire étape 1 : entreprise
    const entrepriseForm = document.getElementById('entrepriseForm');
    if (entrepriseForm) {
        entrepriseForm.addEventListener('submit', handleEntrepriseSubmit);
    }

    // Formulaire étape 2 : calendrier
    const calendrierForm = document.getElementById('calendrierForm');
    if (calendrierForm) {
        calendrierForm.addEventListener('submit', handleCalendrierSubmit);
    }

    // Mise à jour en temps réel des dates
    const dateDebut = document.getElementById('dateDebut');
    const dateFin = document.getElementById('dateFin');
    if (dateDebut) dateDebut.addEventListener('change', updateDateDisplay);
    if (dateFin) dateFin.addEventListener('change', updateDateDisplay);

    // Formulaire thème
    const themeForm = document.getElementById('themeForm');
    if (themeForm) {
        themeForm.addEventListener('submit', handleThemeSubmit);
    }

    // Formulaire rapport final
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Formulaire de message
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', handleSendMessage);
    }

    // Mise à jour de l'affichage de l'entreprise sélectionnée
    const entrepriseSelect = document.getElementById('entreprise');
    if (entrepriseSelect) {
        entrepriseSelect.addEventListener('change', function () {
            document.getElementById('nomEntreprise').textContent = this.value || 'Aucune';
        });
    }
}

// ============================================================
// 5. NAVIGATION ENTRE LES SECTIONS
// ============================================================

/**
 * Affiche une section spécifique et cache les autres
 * @param {string} sectionId - ID de la section à afficher
 */
function showSection(sectionId) {
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
        case 'messaging':
            loadMessages();
            showMessagingTab('inbox');
            break;
        case 'soutenances':
            loadSoutenances();
            break;
    }
}

// ============================================================
// 6. DEMANDE DE STAGE - ÉTAPE 1 : ENTREPRISE
// ============================================================

/**
 * Gère la soumission de l'étape 1 (choix de l'entreprise)
 * @param {Event} e - Événement de soumission du formulaire
 */
function handleEntrepriseSubmit(e) {
    e.preventDefault();

    const entreprise = document.getElementById('entreprise').value;
    const motivation = document.getElementById('motivationEntreprise').value.trim();

    if (!entreprise) {
        alert('⚠️ Veuillez sélectionner une entreprise.');
        return;
    }

    // Sauvegarder temporairement les données
    if (!internshipRequest) {
        internshipRequest = {
            studentName: currentStudent.name,
            studentEmail: currentStudent.email || '',
            status: 'pending',
            submittedAt: new Date().toISOString()
        };
    }

    internshipRequest.enterprise = entreprise;
    internshipRequest.motivation = motivation;

    // Afficher l'entreprise choisie dans l'étape 2
    document.getElementById('entrepriseChoisie').textContent = entreprise;

    // Passer à l'étape 2
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';

    console.log('✅ Étape 1 complétée:', entreprise);
}

/**
 * Retourne à l'étape 1
 */
function retourStep1() {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
}

// ============================================================
// 7. DEMANDE DE STAGE - ÉTAPE 2 : CALENDRIER
// ============================================================

/**
 * Met à jour l'affichage des dates en temps réel
 */
function updateDateDisplay() {
    const dateDebut = document.getElementById('dateDebut').value;
    const dateFin = document.getElementById('dateFin').value;

    const affichageDebut = document.getElementById('affichageDebut');
    const affichageFin = document.getElementById('affichageFin');
    const dureeStage = document.getElementById('dureeStage');

    if (dateDebut) {
        affichageDebut.textContent = new Date(dateDebut).toLocaleDateString('fr-FR');
    } else {
        affichageDebut.textContent = '-';
    }

    if (dateFin) {
        affichageFin.textContent = new Date(dateFin).toLocaleDateString('fr-FR');
    } else {
        affichageFin.textContent = '-';
    }

    if (dateDebut && dateFin) {
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        const diff = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));

        if (diff > 0) {
            const semaines = Math.floor(diff / 7);
            const jours = diff % 7;
            dureeStage.textContent = `${semaines} semaine${semaines > 1 ? 's' : ''} ${jours > 0 ? `et ${jours} jour${jours > 1 ? 's' : ''}` : ''}`;
        } else {
            dureeStage.textContent = 'Dates invalides';
        }
    } else {
        dureeStage.textContent = '-';
    }
}

/**
 * Gère la soumission de l'étape 2 (période du stage)
 * @param {Event} e - Événement de soumission du formulaire
 */
function handleCalendrierSubmit(e) {
    e.preventDefault();

    const dateDebut = document.getElementById('dateDebut').value;
    const dateFin = document.getElementById('dateFin').value;
    const objectifs = document.getElementById('objectifsStage').value.trim();

    if (!dateDebut || !dateFin) {
        alert('⚠️ Veuillez sélectionner les dates de début et de fin.');
        return;
    }

    // Vérifier que la date de fin est après la date de début
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (fin <= debut) {
        alert('⚠️ La date de fin doit être postérieure à la date de début.');
        return;
    }

    // Compléter la demande
    internshipRequest.startDate = dateDebut;
    internshipRequest.endDate = dateFin;
    internshipRequest.objectives = objectifs;
    internshipRequest.status = 'pending';
    internshipRequest.submittedAt = new Date().toISOString();

    // Sauvegarder
    saveInternshipRequest();

    // Afficher la confirmation
    displayInternshipRequest();

    alert(`✅ Demande de stage soumise avec succès!\n\n` +
        `🏢 Entreprise : ${internshipRequest.enterprise}\n` +
        `📅 Du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}\n\n` +
        `Votre demande est en attente de validation par l'administrateur.`);

    console.log('✅ Demande de stage complète soumise');
}

/**
 * Affiche la demande de stage soumise
 */
function displayInternshipRequest() {
    if (!internshipRequest) return;

    // Mettre à jour le statut
    const statutElement = document.getElementById('statutDemande');
    const dateElement = document.getElementById('dateDemande');

    if (statutElement) {
        let statusClass = 'status-pending';
        let statusText = 'En attente';

        switch (internshipRequest.status) {
            case 'approved':
                statusClass = 'status-approved';
                statusText = 'Approuvée';
                break;
            case 'rejected':
                statusClass = 'status-rejected';
                statusText = 'Rejetée';
                break;
        }

        statutElement.className = `status-badge ${statusClass}`;
        statutElement.textContent = statusText;
    }

    if (dateElement && internshipRequest.submittedAt) {
        dateElement.textContent = `Soumise le : ${new Date(internshipRequest.submittedAt).toLocaleDateString('fr-FR')}`;
    }
}

// ============================================================
// 8. THÈME DU RAPPORT
// ============================================================

/**
 * Gère la soumission du thème
 * @param {Event} e - Événement de soumission
 */
function handleThemeSubmit(e) {
    e.preventDefault();

    const themeText = document.getElementById('themeText').value.trim();
    const description = document.getElementById('descriptionRapport').value.trim();

    if (!themeText || !description) {
        alert('⚠️ Veuillez remplir tous les champs.');
        return;
    }

    reportTheme = {
        theme: themeText,
        description: description,
        status: 'pending',
        submittedAt: new Date().toISOString()
    };

    saveReportTheme();
    displayReportTheme();

    alert(`✅ Thème soumis avec succès!\n\n📝 Thème : ${themeText}\n\nVotre thème est en attente de validation par l'administrateur.`);

    // Afficher l'étape 2 du rapport
    document.getElementById('themeStep1').style.display = 'none';
    document.getElementById('themeStep2').style.display = 'block';
}

/**
 * Affiche le thème soumis
 */
function displayReportTheme() {
    if (!reportTheme) return;

    const display = document.querySelector('.theme-display');
    if (display) {
        display.innerHTML = `
            <p><strong>Thème :</strong> ${reportTheme.theme}</p>
            <p><strong>Description :</strong> ${reportTheme.description}</p>
            <p><strong>Statut :</strong> <span class="status-badge status-${reportTheme.status}">${reportTheme.status === 'approved' ? 'Approuvé' : reportTheme.status === 'rejected' ? 'Rejeté' : 'En attente'}</span></p>
            <p class="text-small"><strong>Soumis le :</strong> ${new Date(reportTheme.submittedAt).toLocaleDateString('fr-FR')}</p>
        `;
    }
}

/**
 * Retourne à l'étape 1 du rapport
 */
function retourThemeStep1() {
    document.getElementById('themeStep2').style.display = 'none';
    document.getElementById('themeStep1').style.display = 'block';
}

// ============================================================
// 9. RAPPORT FINAL
// ============================================================

/**
 * Gère la soumission du rapport final
 * @param {Event} e - Événement de soumission
 */
function handleReportSubmit(e) {
    e.preventDefault();

    const fileInput = document.getElementById('reportFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('⚠️ Veuillez sélectionner un fichier PDF.');
        return;
    }

    // Vérifier que c'est un PDF
    if (file.type !== 'application/pdf') {
        alert('⚠️ Le fichier doit être au format PDF.');
        return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('⚠️ Le fichier ne doit pas dépasser 10 MB.');
        return;
    }

    finalReport = {
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(2) + ' KB',
        status: 'submitted',
        submittedAt: new Date().toISOString()
    };

    saveFinalReport();
    displayFinalReport();

    alert(`✅ Rapport final soumis avec succès!\n\n📄 Fichier : ${file.name}\n📦 Taille : ${finalReport.fileSize}\n\nVotre rapport a été envoyé à l'administrateur.`);

    console.log('✅ Rapport final soumis');
}

/**
 * Affiche le rapport final soumis
 */
function displayFinalReport() {
    if (!finalReport) return;

    const display = document.querySelector('.report-display');
    if (display) {
        display.innerHTML = `
            <p><strong>📄 Fichier :</strong> ${finalReport.fileName}</p>
            <p><strong>📦 Taille :</strong> ${finalReport.fileSize}</p>
            <p><strong>📅 Soumis le :</strong> ${new Date(finalReport.submittedAt).toLocaleDateString('fr-FR')}</p>
            <p><strong>Statut :</strong> <span class="status-badge status-submitted">Soumis</span></p>
        `;
    }
}

// ============================================================
// 10. MESSAGERIE
// ============================================================

/**
 * Charge les messages
 */
function loadMessages() {
    // Message de bienvenue par défaut
    messagesInbox = [
        {
            id: 1,
            from: 'Administrateur',
            subject: 'Bienvenue sur la plateforme',
            content: 'Bonjour,\n\nBienvenue sur la plateforme de gestion des stages. N\'hésitez pas à soumettre vos demandes via les formulaires appropriés.\n\nCordialement,\nL\'Administration',
            date: new Date(Date.now() - 86400000),
            read: false
        }
    ];

    // Charger les messages envoyés
    const savedSent = localStorage.getItem(`messagesSent_${currentStudent.username}`);
    messagesSent = savedSent ? JSON.parse(savedSent) : [];

    updateInboxMessages();
    updateSentMessages();
    updateMessageCounts();

    // Vérifier les messages de l'admin
    checkAdminMessages();
}

/**
 * Vérifie les nouveaux messages de l'admin
 */
function checkAdminMessages() {
    const adminMessages = localStorage.getItem('adminToStudentMessages');
    if (adminMessages) {
        const messages = JSON.parse(adminMessages);

        // Filtrer les messages pour cet étudiant
        const myMessages = messages.filter(msg => msg.to === currentStudent.name);

        // Ajouter les nouveaux messages
        myMessages.forEach(msg => {
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
    const inboxCount = document.getElementById('inboxCount');
    const sentCount = document.getElementById('sentCount');

    if (inboxCount) {
        const unreadCount = messagesInbox.filter(m => !m.read).length;
        inboxCount.textContent = unreadCount;
        inboxCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (sentCount) {
        sentCount.textContent = messagesSent.length;
        sentCount.style.display = messagesSent.length > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Affiche les onglets de messagerie
 * @param {string} tab - 'inbox', 'sent' ou 'compose'
 */
function showMessagingTab(tab) {
    // Masquer tous les contenus
    document.querySelectorAll('.message-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Désactiver tous les boutons
    document.querySelectorAll('.message-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activer l'onglet sélectionné
    if (tab === 'inbox') {
        document.getElementById('inbox').classList.add('active');
        document.getElementById('inboxTab').classList.add('active');
    } else if (tab === 'sent') {
        document.getElementById('sent').classList.add('active');
        document.getElementById('sentTab').classList.add('active');
    } else if (tab === 'compose') {
        document.getElementById('compose').classList.add('active');
        document.getElementById('composeTab').classList.add('active');
    }
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
 * Gère l'envoi d'un message
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
        from: currentStudent.name,
        to: to,
        subject: subject,
        content: content,
        date: new Date().toISOString(),
        read: false
    };

    messagesSent.unshift(newMessage);
    localStorage.setItem(`messagesSent_${currentStudent.username}`, JSON.stringify(messagesSent));

    // Envoyer aussi à l'administrateur via localStorage
    const studentToAdminMessages = JSON.parse(localStorage.getItem('studentToAdminMessages') || '[]');
    studentToAdminMessages.unshift(newMessage);
    localStorage.setItem('studentToAdminMessages', JSON.stringify(studentToAdminMessages));

    alert(`✅ Message envoyé avec succès !\n\n📧 Destinataire : ${to}\n📝 Objet : ${subject}\n\nVotre message a été transmis à l'administrateur.`);

    e.target.reset();
    updateSentMessages();
    showMessagingTab('sent');
}

/**
 * Actualise la boîte de réception
 */
function refreshInbox() {
    alert('🔄 Actualisation de la boîte de réception...\n\nRecherche de nouveaux messages...');
    checkAdminMessages();
    setTimeout(() => {
        alert('✅ Boîte de réception actualisée!');
    }, 500);
}

// ============================================================
// 11. SOUTENANCES
// ============================================================

/**
 * Charge les soutenances de l'étudiant
 */
function loadSoutenances() {
    const allSoutenances = JSON.parse(localStorage.getItem('soutenances') || '[]');

    // Filtrer les soutenances pour cet étudiant
    mySoutenances = allSoutenances.filter(s => s.studentName === currentStudent.name);

    displaySoutenances();
}

/**
 * Affiche les soutenances
 */
function displaySoutenances() {
    const container = document.getElementById('soutenancesList');
    if (!container) return;

    if (mySoutenances.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>🔭 Aucune soutenance programmée</p><small>Votre soutenance sera programmée par l\'administrateur</small></div>';
        return;
    }

    container.innerHTML = mySoutenances.map(sout => {
        const juryList = sout.jury.map(j => `<li><strong>${j.title}:</strong> ${j.name}</li>`).join('');

        return `
            <div class="soutenance-card">
                <h4>🎤 Soutenance programmée</h4>
                <div class="soutenance-info">
                    <div class="soutenance-info-item">
                        <strong>📅 Date</strong>
                        ${new Date(sout.date).toLocaleDateString('fr-FR')}
                    </div>
                    <div class="soutenance-info-item">
                        <strong>🕐 Heure</strong>
                        ${sout.time}
                    </div>
                    <div class="soutenance-info-item">
                        <strong>🏫 Salle</strong>
                        ${sout.salle}
                    </div>
                </div>
                <div class="jury-list">
                    <h5>👥 Membres du jury</h5>
                    <ul>${juryList}</ul>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================
// 12. FONCTIONS UTILITAIRES
// ============================================================

/**
 * Télécharge un document (simulation)
 * @param {string} docType - Type de document
 */
function downloadDocument(docType) {
    let fileName = '';
    let content = '';

    switch (docType) {
        case 'convocation':
            if (mySoutenances.length === 0) {
                alert('⚠️ Vous n\'avez pas encore de soutenance programmée.');
                return;
            }
            fileName = 'Convocation_Soutenance.pdf';
            alert(`📥 Téléchargement de la convocation...\n\n✅ Document "${fileName}" téléchargé avec succès!`);
            break;

        case 'attestation':
            if (!internshipRequest || internshipRequest.status !== 'approved') {
                alert('⚠️ Votre demande de stage doit être approuvée pour télécharger l\'attestation.');
                return;
            }
            fileName = 'Attestation_Stage.pdf';
            alert(`📥 Téléchargement de l'attestation...\n\n✅ Document "${fileName}" téléchargé avec succès!`);
            break;
    }
}

// ============================================================
// FIN DU FICHIER JAVASCRIPT
// ============================================================

console.log('✅ Dashboard étudiant initialisé');