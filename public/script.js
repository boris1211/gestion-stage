/* =========================
   script.js - GESTION DE CONNEXION
   ========================= */

// Base de données des utilisateurs (simulation)
const users = {
    // Comptes Administrateurs
    admin: {
        password: 'admin123',
        role: 'admin',
        name: 'Administrateur Principal',
        redirect: 'admin-dashboard.html'
    },
    admin1: {
        password: 'admin2025',
        role: 'admin',
        name: 'Admin Secondaire',
        redirect: 'admin-dashboard.html'
    },

    // Comptes Étudiants
    jean: {
        password: 'etudiant123',
        role: 'student',
        name: 'Jean OUEDRAOGO',
        redirect: 'etudiant-dashboard.html'
    },
    marie: {
        password: 'etudiant123',
        role: 'student',
        name: 'Marie KABORE',
        redirect: 'etudiant-dashboard.html'
    },
    paul: {
        password: 'etudiant123',
        role: 'student',
        name: 'Paul SAWADOGO',
        redirect: 'etudiant-dashboard.html'
    },
    cheick: {
        password: 'etudiant123',
        role: 'student',
        name: 'cheick',
        redirect: 'etudiant-dashboard.html'
    }
};

// Variables globales
let selectedAccountType = null;
const studentBtn = document.getElementById('student-btn');
const adminBtn = document.getElementById('admin-btn');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Écouteurs d'événements pour les boutons de sélection
studentBtn.addEventListener('click', () => {
    selectAccountType('student');
});

adminBtn.addEventListener('click', () => {
    selectAccountType('admin');
});

// Fonction de sélection du type de compte
function selectAccountType(type) {
    selectedAccountType = type;

    // Mise à jour visuelle des boutons
    if (type === 'student') {
        studentBtn.classList.add('active');
        adminBtn.classList.remove('active');
        studentBtn.style.background = '#4CAF50';
        studentBtn.style.color = 'white';
        studentBtn.style.transform = 'scale(1.05)';
        adminBtn.style.background = '#f5f5f5';
        adminBtn.style.color = '#333';
        adminBtn.style.transform = 'scale(1)';
    } else {
        adminBtn.classList.add('active');
        studentBtn.classList.remove('active');
        adminBtn.style.background = '#2196F3';
        adminBtn.style.color = 'white';
        adminBtn.style.transform = 'scale(1.05)';
        studentBtn.style.background = '#f5f5f5';
        studentBtn.style.color = '#333';
        studentBtn.style.transform = 'scale(1)';
    }

    // Afficher le formulaire de connexion
    loginForm.style.display = 'block';
    loginForm.style.animation = 'fadeIn 0.3s ease-in';

    // Focus sur le champ username
    usernameInput.focus();
}

// Gestion de la soumission du formulaire
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Vérification que le type de compte est sélectionné
    if (!selectedAccountType) {
        showError('Veuillez d\'abord sélectionner un type de compte');
        return;
    }

    // Vérification des champs vides
    if (!username || !password) {
        showError('Veuillez remplir tous les champs');
        return;
    }

    // Vérification de l'utilisateur dans la base
    const user = users[username];

    if (!user) {
        showError('Nom d\'utilisateur incorrect');
        shakeForm();
        return;
    }

    // Vérification du mot de passe
    if (user.password !== password) {
        showError('Mot de passe incorrect');
        shakeForm();
        return;
    }

    // Vérification du rôle correspond au type sélectionné
    if (user.role !== selectedAccountType) {
        showError(`Ce compte n'est pas un compte ${selectedAccountType === 'admin' ? 'administrateur' : 'étudiant'}`);
        shakeForm();
        return;
    }

    // Connexion réussie
    showSuccess(`Bienvenue ${user.name} !`);

    // Sauvegarder les informations de session
    localStorage.setItem('currentUser', JSON.stringify({
        username: username,
        name: user.name,
        role: user.role
    }));

    // Redirection après 1 seconde
    setTimeout(() => {
        window.location.href = user.redirect;
    }, 1000);
});

// Fonction d'affichage des erreurs
function showError(message) {
    // Supprimer l'ancienne alerte si elle existe
    const oldAlert = document.querySelector('.alert');
    if (oldAlert) oldAlert.remove();

    // Créer une nouvelle alerte
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.style.cssText = `
        background: #f44336;
        color: white;
        padding: 15px;
        border-radius: 5px;
        margin: 15px 0;
        animation: slideDown 0.3s ease;
        text-align: center;
        font-weight: bold;
    `;
    alert.textContent = message;

    // Insérer avant le formulaire
    loginForm.parentElement.insertBefore(alert, loginForm);

    // Supprimer après 3 secondes
    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

// Fonction d'affichage des succès
function showSuccess(message) {
    // Supprimer l'ancienne alerte si elle existe
    const oldAlert = document.querySelector('.alert');
    if (oldAlert) oldAlert.remove();

    // Créer une nouvelle alerte
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.style.cssText = `
        background: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        margin: 15px 0;
        animation: slideDown 0.3s ease;
        text-align: center;
        font-weight: bold;
    `;
    alert.innerHTML = `✅ ${message}`;

    // Insérer avant le formulaire
    loginForm.parentElement.insertBefore(alert, loginForm);
}

// Animation de secousse du formulaire
function shakeForm() {
    loginForm.style.animation = 'shake 0.5s';
    setTimeout(() => {
        loginForm.style.animation = '';
    }, 500);
}

// Ajout des animations CSS dynamiquement
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
        20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
    
    .account-button {
        transition: all 0.3s ease;
    }
    
    .account-button:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
`;
document.head.appendChild(style);