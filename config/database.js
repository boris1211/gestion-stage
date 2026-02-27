const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Chemin de la base de données
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'iam_stages.db');

// Créer le dossier database/ s'il n'existe pas (important sur Render)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 Dossier database créé:', dbDir);
}

// Connexion à la base de données
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erreur connexion base de données:', err);
    } else {
        console.log('✅ Base de données connectée:', DB_PATH);
    }
});

// Activation des clés étrangères
db.run('PRAGMA foreign_keys = ON');

// Création des tables si elles n'existent pas
db.serialize(() => {
    // Table users
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL DEFAULT 'student',
            name TEXT NOT NULL,
            surname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            filiere TEXT DEFAULT '',
            niveau TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Erreur création table users:', err);
        else {
            console.log('✅ Table users prête');
            // Créer l'admin par défaut s'il n'existe pas
            db.run(`
                INSERT OR IGNORE INTO users (role, name, surname, email, password)
                VALUES ('admin', 'Admin', 'IAM', 'admin@iam.bf', 'admin123')
            `);
        }
    });

    // Table enterprises
    db.run(`
        CREATE TABLE IF NOT EXISTS enterprises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sector TEXT DEFAULT '',
            contact TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Erreur création table enterprises:', err);
        else console.log('✅ Table enterprises prête');
    });

    // Table internship_requests
    db.run(`
        CREATE TABLE IF NOT EXISTS internship_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            enterprise_id INTEGER,
            status TEXT DEFAULT 'pending',
            start_date TEXT,
            end_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
        )
    `, (err) => {
        if (err) console.error('Erreur création table internship_requests:', err);
        else console.log('✅ Table internship_requests prête');
    });
});

module.exports = db;