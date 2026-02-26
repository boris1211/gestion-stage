// ===================================================
// enterprises.js - GESTION DES ENTREPRISES
// ===================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ===================================================
// ROUTE: LISTE TOUTES LES ENTREPRISES
// ===================================================
router.get('/', (req, res) => {
    const query = `
        SELECT e.*, 
               COUNT(s.id) as students_count
        FROM enterprises e
        LEFT JOIN stages s ON e.id = s.enterprise_id
        GROUP BY e.id
        ORDER BY e.name
    `;

    db.all(query, [], (err, enterprises) => {
        if (err) {
            console.error('Erreur récupération entreprises:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: enterprises.length,
            enterprises: enterprises
        });
    });
});

// ===================================================
// ROUTE: DÉTAILS D'UNE ENTREPRISE
// ===================================================
router.get('/:id', (req, res) => {
    const enterpriseId = req.params.id;

    const query = `
        SELECT e.*,
               COUNT(s.id) as students_count
        FROM enterprises e
        LEFT JOIN stages s ON e.id = s.enterprise_id
        WHERE e.id = ?
        GROUP BY e.id
    `;

    db.get(query, [enterpriseId], (err, enterprise) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        if (!enterprise) {
            return res.status(404).json({
                success: false,
                message: 'Entreprise non trouvée'
            });
        }

        res.json({
            success: true,
            enterprise: enterprise
        });
    });
});

// ===================================================
// ROUTE: ÉTUDIANTS D'UNE ENTREPRISE
// ===================================================
router.get('/:id/students', (req, res) => {
    const enterpriseId = req.params.id;

    const query = `
        SELECT u.id, u.name, u.surname, u.filiere, u.niveau,
               s.start_date, s.end_date, s.theme
        FROM users u
        INNER JOIN stages s ON u.id = s.student_id
        WHERE s.enterprise_id = ?
        ORDER BY u.name
    `;

    db.all(query, [enterpriseId], (err, students) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: students.length,
            students: students
        });
    });
});

// ===================================================
// ROUTE: CRÉER UNE ENTREPRISE
// ===================================================
router.post('/', (req, res) => {
    const { name, sector } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'Le nom de l\'entreprise est requis'
        });
    }

    const query = 'INSERT INTO enterprises (name, sector) VALUES (?, ?)';

    db.run(query, [name, sector || 'Non spécifié'], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({
                    success: false,
                    message: 'Cette entreprise existe déjà'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Erreur création entreprise'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Entreprise créée',
            enterpriseId: this.lastID
        });
    });
});

// ===================================================
// ROUTE: MODIFIER UNE ENTREPRISE
// ===================================================
router.put('/:id', (req, res) => {
    const enterpriseId = req.params.id;
    const { name, sector } = req.body;

    const query = 'UPDATE enterprises SET name = ?, sector = ? WHERE id = ?';

    db.run(query, [name, sector, enterpriseId], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur modification'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Entreprise non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Entreprise modifiée'
        });
    });
});

// ===================================================
// ROUTE: SUPPRIMER UNE ENTREPRISE
// ===================================================
router.delete('/:id', (req, res) => {
    const enterpriseId = req.params.id;

    db.run('DELETE FROM enterprises WHERE id = ?', [enterpriseId], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur suppression'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Entreprise non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Entreprise supprimée'
        });
    });
});

// ===================================================
// ROUTE: ASSIGNER UN ÉTUDIANT À UNE ENTREPRISE
// ===================================================
router.post('/:id/assign-student', (req, res) => {
    const enterpriseId = req.params.id;
    const { studentId, startDate, endDate, theme } = req.body;

    if (!studentId) {
        return res.status(400).json({
            success: false,
            message: 'ID étudiant requis'
        });
    }

    const query = `
        INSERT INTO stages (student_id, enterprise_id, start_date, end_date, theme)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [studentId, enterpriseId, startDate, endDate, theme], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur assignation'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Étudiant assigné à l\'entreprise',
            stageId: this.lastID
        });
    });
});

module.exports = router;