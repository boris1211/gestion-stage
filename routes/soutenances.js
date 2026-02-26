// ===================================================
// soutenances.js - GESTION DES SOUTENANCES
// ===================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ===================================================
// ROUTE: LISTE TOUTES LES SOUTENANCES
// ===================================================
router.get('/', (req, res) => {
    const query = `
        SELECT s.*, 
               u.name, u.surname, u.filiere, u.niveau
        FROM soutenances s
        INNER JOIN users u ON s.student_id = u.id
        ORDER BY s.date, s.time
    `;

    db.all(query, [], (err, soutenances) => {
        if (err) {
            console.error('Erreur récupération soutenances:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: soutenances.length,
            soutenances: soutenances
        });
    });
});

// ===================================================
// ROUTE: DÉTAILS D'UNE SOUTENANCE
// ===================================================
router.get('/:id', (req, res) => {
    const soutenanceId = req.params.id;

    const query = `
        SELECT s.*, 
               u.name, u.surname, u.email, u.filiere, u.niveau
        FROM soutenances s
        INNER JOIN users u ON s.student_id = u.id
        WHERE s.id = ?
    `;

    db.get(query, [soutenanceId], (err, soutenance) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        if (!soutenance) {
            return res.status(404).json({
                success: false,
                message: 'Soutenance non trouvée'
            });
        }

        res.json({
            success: true,
            soutenance: soutenance
        });
    });
});

// ===================================================
// ROUTE: SOUTENANCE D'UN ÉTUDIANT
// ===================================================
router.get('/student/:studentId', (req, res) => {
    const studentId = req.params.studentId;

    const query = `
        SELECT s.*
        FROM soutenances s
        WHERE s.student_id = ?
        ORDER BY s.date DESC
    `;

    db.all(query, [studentId], (err, soutenances) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: soutenances.length,
            soutenances: soutenances
        });
    });
});

// ===================================================
// ROUTE: PROGRAMMER UNE SOUTENANCE
// ===================================================
router.post('/', (req, res) => {
    const { studentId, date, time, salle, jury } = req.body;

    if (!studentId || !date || !time || !salle) {
        return res.status(400).json({
            success: false,
            message: 'Tous les champs sont requis'
        });
    }

    db.get('SELECT id FROM users WHERE id = ? AND role = "student"', [studentId], (err, student) => {
        if (err || !student) {
            return res.status(404).json({
                success: false,
                message: 'Étudiant non trouvé'
            });
        }

        db.get('SELECT id FROM soutenances WHERE student_id = ?', [studentId], (err, existing) => {
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'Cet étudiant a déjà une soutenance programmée'
                });
            }

            const query = `
                INSERT INTO soutenances (student_id, date, time, salle, jury)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.run(query, [studentId, date, time, salle, jury], function (err) {
                if (err) {
                    console.error('Erreur création soutenance:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erreur création de la soutenance'
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Soutenance programmée',
                    soutenanceId: this.lastID
                });
            });
        });
    });
});

// ===================================================
// ROUTE: MODIFIER UNE SOUTENANCE
// ===================================================
router.put('/:id', (req, res) => {
    const soutenanceId = req.params.id;
    const { date, time, salle, jury } = req.body;

    const query = `
        UPDATE soutenances 
        SET date = ?, time = ?, salle = ?, jury = ?
        WHERE id = ?
    `;

    db.run(query, [date, time, salle, jury, soutenanceId], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur modification'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Soutenance non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Soutenance modifiée'
        });
    });
});

// ===================================================
// ROUTE: SUPPRIMER/ANNULER UNE SOUTENANCE
// ===================================================
router.delete('/:id', (req, res) => {
    const soutenanceId = req.params.id;

    db.run('DELETE FROM soutenances WHERE id = ?', [soutenanceId], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur suppression'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Soutenance non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Soutenance annulée'
        });
    });
});

// ===================================================
// ROUTE: SOUTENANCES DU JOUR
// ===================================================
router.get('/today/list', (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const query = `
        SELECT s.*, 
               u.name, u.surname
        FROM soutenances s
        INNER JOIN users u ON s.student_id = u.id
        WHERE s.date = ?
        ORDER BY s.time
    `;

    db.all(query, [today], (err, soutenances) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: soutenances.length,
            soutenances: soutenances
        });
    });
});

// ===================================================
// ROUTE: SOUTENANCES À VENIR
// ===================================================
router.get('/upcoming/list', (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const query = `
        SELECT s.*, 
               u.name, u.surname
        FROM soutenances s
        INNER JOIN users u ON s.student_id = u.id
        WHERE s.date >= ?
        ORDER BY s.date, s.time
        LIMIT 10
    `;

    db.all(query, [today], (err, soutenances) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: soutenances.length,
            soutenances: soutenances
        });
    });
});

module.exports = router;