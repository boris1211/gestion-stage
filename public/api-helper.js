// ===================================================
// api-helper.js - COMMUNICATION AVEC LE BACKEND
// ===================================================

const API_BASE_URL = 'http://localhost:3000/api';

// ===================================================
// FONCTION PRINCIPALE DE REQUÊTE
// ===================================================
async function makeRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();

        return result;
    } catch (error) {
        console.error('Erreur API:', error);
        return {
            success: false,
            message: 'Erreur de connexion au serveur'
        };
    }
}

// ===================================================
// AUTHENTIFICATION
// ===================================================
async function login(email, password) {
    return await makeRequest('/auth/login', 'POST', { email, password });
}

async function register(role, name, surname, email, password, filiere = null, niveau = null) {
    return await makeRequest('/auth/register', 'POST', {
        role, name, surname, email, password, filiere, niveau
    });
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function saveCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ===================================================
// UTILISATEURS
// ===================================================
async function getAllUsers(role = null) {
    const endpoint = role ? `/users?role=${role}` : '/users';
    return await makeRequest(endpoint);
}

async function getUserById(userId) {
    return await makeRequest(`/users/${userId}`);
}

async function createUser(userData) {
    return await makeRequest('/users', 'POST', userData);
}

async function updateUser(userId, userData) {
    return await makeRequest(`/users/${userId}`, 'PUT', userData);
}

async function deleteUser(userId) {
    return await makeRequest(`/users/${userId}`, 'DELETE');
}

// ===================================================
// ENTREPRISES
// ===================================================
async function getAllEnterprises() {
    return await makeRequest('/enterprises');
}

async function getEnterpriseById(enterpriseId) {
    return await makeRequest(`/enterprises/${enterpriseId}`);
}

async function getEnterpriseStudents(enterpriseId) {
    return await makeRequest(`/enterprises/${enterpriseId}/students`);
}

async function assignStudentToEnterprise(enterpriseId, studentId, startDate, endDate, theme) {
    return await makeRequest(`/enterprises/${enterpriseId}/assign-student`, 'POST', {
        studentId, startDate, endDate, theme
    });
}

// ===================================================
// MESSAGES
// ===================================================
async function getMessages(userId, box = 'inbox') {
    return await makeRequest(`/messages/${userId}?box=${box}`);
}

async function sendMessage(fromUserId, toUserId, subject, content) {
    return await makeRequest('/messages', 'POST', {
        fromUserId, toUserId, subject, content
    });
}

async function broadcastMessage(fromUserId, subject, content) {
    return await makeRequest('/messages/broadcast', 'POST', {
        fromUserId, subject, content
    });
}

// ===================================================
// RAPPORTS
// ===================================================
async function getAllReports() {
    return await makeRequest('/reports');
}

async function uploadReport(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/reports/upload`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error('Erreur upload:', error);
        return { success: false, message: 'Erreur upload' };
    }
}

function downloadReport(reportId) {
    window.open(`${API_BASE_URL}/reports/${reportId}/download`, '_blank');
}

// ===================================================
// SOUTENANCES
// ===================================================
async function getAllSoutenances() {
    return await makeRequest('/soutenances');
}

async function createSoutenance(studentId, date, time, salle, jury) {
    return await makeRequest('/soutenances', 'POST', {
        studentId, date, time, salle, jury
    });
}

async function deleteSoutenance(soutenanceId) {
    return await makeRequest(`/soutenances/${soutenanceId}`, 'DELETE');
}

// ===================================================
// HELPERS D'AFFICHAGE
// ===================================================
function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

console.log('✅ API Helper chargé !');