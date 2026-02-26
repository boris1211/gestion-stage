// ===================================================
// database.js - CONFIGURATION SQLITE
// ===================================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin de la base de données
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'iam_stages.db');
// Créer la connexion
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erreur connexion base de données:', err);
        process.exit(1);
    }
    console.log('✅ Connecté à la base de données SQLite');
});

// ===================================================
// CRÉATION DES TABLES
// ===================================================
db.serialize(() => {
    // Table utilisateurs
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
            name TEXT NOT NULL,
            surname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            filiere TEXT,
            niveau TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table entreprises
    db.run(`
        CREATE TABLE IF NOT EXISTS enterprises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            sector TEXT NOT NULL,
            contact TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table stages
    db.run(`
        CREATE TABLE IF NOT EXISTS stages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            enterprise_id INTEGER NOT NULL,
            start_date DATE,
            end_date DATE,
            theme TEXT,
            status TEXT DEFAULT 'en_cours' CHECK(status IN ('en_cours', 'termine', 'valide')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE
        )
    `);

    // Table rapports
    db.run(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            stage_id INTEGER NOT NULL,
            theme TEXT,
            file_path TEXT,
            submission_date DATE,
            status TEXT DEFAULT 'en_attente' CHECK(status IN ('en_attente', 'soumis', 'valide', 'rejete')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
        )
    `);

    // Table messages
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id INTEGER NOT NULL,
            to_user_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Table soutenances
    db.run(`
        CREATE TABLE IF NOT EXISTS soutenances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            date DATE NOT NULL,
            time TIME NOT NULL,
            salle TEXT NOT NULL,
            jury TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    console.log('✅ Tables créées ou vérifiées');
});

// ===================================================
// INSERTION DE DONNÉES DE TEST
// ===================================================
db.serialize(() => {
    // Vérifier si des utilisateurs existent déjà
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) {
            console.error('Erreur vérification utilisateurs:', err);
            return;
        }

        if (row.count === 0) {
            console.log('📝 Insertion des données de test...');

            // Administrateurs
            const insertAdmin = db.prepare(`
                INSERT INTO users (role, name, surname, email, password)
                VALUES (?, ?, ?, ?, ?)
            `);
            insertAdmin.run('admin', 'Admin', 'Principal', 'admin@iam.bf', 'admin123');
            insertAdmin.run('admin', 'Admin', 'Secondaire', 'admin1@iam.bf', 'admin2025');
            insertAdmin.finalize();

            // Étudiants
            const insertStudent = db.prepare(`
                INSERT INTO users (role, name, surname, email, password, filiere, niveau)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insertStudent.run('student', 'OUEDRAOGO', 'Jean', 'jean@iam.bf', 'etudiant123', 'Informatique', 'Licence 3');
            insertStudent.run('student', 'KABORE', 'Marie', 'marie@iam.bf', 'etudiant123', 'Gestion', 'Master 1');
            insertStudent.run('student', 'SAWADOGO', 'Paul', 'paul@iam.bf', 'etudiant123', 'Marketing', 'Licence 2');
            insertStudent.finalize();

            // Entreprises
            const insertEnterprise = db.prepare(`
                INSERT INTO enterprises (name, sector, contact)
                VALUES (?, ?, ?)
            `);
            const enterprises = [
                ['CORIS BANK INTERNATIONAL', 'Finance', '+226 25 30 60 60'],
                ['ORANGE BURKINA', 'Télécommunications', '+226 25 49 00 00'],
                ['WENDKUNI BANK', 'Finance', '+226 25 36 50 50'],
                ['BF1', 'Télévision', '+226 25 50 00 01'],
                ['SONABHY', 'Hydrocarbures', '+226 25 30 80 00'],
                ['LA POSTE', 'Réception expédition', '+226 25 30 90 00'],
                ['SODIGAZ', 'Gaz', '+226 25 36 70 70'],
                ['RAHIMO', 'Transport', '+226 25 40 40 40'],
                ['ONEA', 'Eau et assainissement', '+226 25 49 33 33'],
                ['SONABEL', 'Électricité', '+226 25 30 20 20'],
                ['MOOV BURKINA', 'Télécommunications', '+226 25 49 11 11'],
                ['TELECEL FASO', 'Télécommunications', '+226 25 50 22 22']
            ];

            enterprises.forEach(ent => {
                insertEnterprise.run(...ent);
            });
            insertEnterprise.finalize();

            console.log('✅ Données de test insérées');
        } else {
            console.log('ℹ️  Données existantes détectées, pas d\'insertion');
        }
    });
});

module.exports = db;