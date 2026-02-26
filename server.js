// ===================================================
// server.js - SERVEUR PRINCIPAL NODE.JS
// ===================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');

// Import des routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const enterprisesRoutes = require('./routes/enterprises');
const messagesRoutes = require('./routes/messages');
const reportsRoutes = require('./routes/reports');
const soutenancesRoutes = require('./routes/soutenances');

// Initialisation de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// ===================================================
// MIDDLEWARES
// ===================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (HTML, CSS, JS frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===================================================
// ROUTES API
// ===================================================
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/enterprises', enterprisesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/soutenances', soutenancesRoutes);

// ===================================================
// ROUTE RACINE
// ===================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================================================
// ROUTE DE TEST
// ===================================================
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API de Gestion de Stages fonctionne correctement! ✅',
        timestamp: new Date().toISOString()
    });
});

// ===================================================
// GESTION DES ERREURS 404
// ===================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// ===================================================
// GESTION DES ERREURS SERVEUR
// ===================================================
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur interne'
    });
});

// ===================================================
// DÉMARRAGE DU SERVEUR
// ===================================================
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 SERVEUR DE GESTION DE STAGES DÉMARRÉ');
    console.log('========================================');
    console.log(`📡 Serveur actif sur: http://localhost:${PORT}`);
    console.log(`📊 API accessible sur: http://localhost:${PORT}/api`);
    console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log('========================================');
    console.log('✅ Base de données SQLite initialisée');
    console.log('✅ Routes configurées');
    console.log('✅ Prêt à accepter des connexions');
    console.log('========================================');
    console.log('\n💡 Pour arrêter le serveur: Ctrl + C\n');
});

// ===================================================
// GESTION DE L'ARRÊT PROPRE
// ===================================================
process.on('SIGINT', () => {
    console.log('\n\n🛑 Arrêt du serveur en cours...');
    db.close((err) => {
        if (err) {
            console.error('Erreur fermeture BD:', err);
        } else {
            console.log('✅ Base de données fermée');
        }
        console.log('👋 Serveur arrêté\n');
        process.exit(0);
    });
});