// ===================================================
// reports.js - GESTION DES RAPPORTS DE STAGE
// ===================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/reports');
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `report_${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Format de fichier non autorisé'));
    }
});

// ===================================================
// ROUTE: LISTE TOUS LES RAPPORTS
// ===================================================
// GET /api/reports
router.get('/', (req, res) => {
    const query = `
        SELECT r.*, 
               u.name, u.surname,
               e.name as enterprise_name
        FROM reports r
        INNER JOIN users u ON r.student_id = u.id
        INNER JOIN stages s ON r.stage_id = s.id
        INNER JOIN enterprises e ON s.enterprise_id = e.id
        ORDER BY r.submission_date DESC
    `;

    db.all(query, [], (err, reports) => {
        if (err) {
            console.error('Erreur récupération rapports:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: reports.length,
            reports: reports
        });
    });
});

// ===================================================
// ROUTE: DÉTAILS D'UN RAPPORT
// ===================================================
// GET /api/reports/:id
router.get('/:id', (req, res) => {
    const reportId = req.params.id;

    const query = `
        SELECT r.*, 
               u.name, u.surname, u.email,
               e.name as enterprise_name,
               s.start_date, s.end_date
        FROM reports r
        INNER JOIN users u ON r.student_id = u.id
        INNER JOIN stages s ON r.stage_id = s.id
        INNER JOIN enterprises e ON s.enterprise_id = e.id
        WHERE r.id = ?
    `;

    db.get(query, [reportId], (err, report) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Rapport non trouvé'
            });
        }

        res.json({
            success: true,
            report: report
        });
    });
});

// ===================================================
// ROUTE: RAPPORTS D'UN ÉTUDIANT
// ===================================================
// GET /api/reports/student/:studentId
router.get('/student/:studentId', (req, res) => {
    const studentId = req.params.studentId;

    const query = `
        SELECT r.*, 
               e.name as enterprise_name
        FROM reports r
        INNER JOIN stages s ON r.stage_id = s.id
        INNER JOIN enterprises e ON s.enterprise_id = e.id
        WHERE r.student_id = ?
        ORDER BY r.created_at DESC
    `;

    db.all(query, [studentId], (err, reports) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: reports.length,
            reports: reports
        });
    });
});

// ===================================================
// ROUTE: SOUMETTRE UN RAPPORT (AVEC FICHIER)
// ===================================================
// POST /api/reports/upload
router.post('/upload', upload.single('reportFile'), (req, res) => {
    const { studentId, stageId, theme } = req.body;

    if (!studentId || !stageId) {
        return res.status(400).json({
            success: false,
            message: 'Informations manquantes'
        });
    }

    const filePath = req.file ? req.file.filename : null;
    const submissionDate = new Date().toISOString().split('T')[0];

    const query = `
        INSERT INTO reports (student_id, stage_id, theme, file_path, submission_date, status)
        VALUES (?, ?, ?, ?, ?, 'soumis')
    `;

    db.run(query, [studentId, stageId, theme, filePath, submissionDate], function (err) {
        if (err) {
            console.error('Erreur soumission rapport:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la soumission'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Rapport soumis avec succès',
            reportId: this.lastID
        });
    });
});

// ===================================================
// ROUTE: CRÉER UN RAPPORT (SANS FICHIER)
// ===================================================
// POST /api/reports
router.post('/', (req, res) => {
    const { studentId, stageId, theme } = req.body;

    if (!studentId || !stageId) {
        return res.status(400).json({
            success: false,
            message: 'Informations manquantes'
        });
    }

    const query = `
        INSERT INTO reports (student_id, stage_id, theme, status)
        VALUES (?, ?, ?, 'en_attente')
    `;

    db.run(query, [studentId, stageId, theme], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur création rapport'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Rapport créé',
            reportId: this.lastID
        });
    });
});

// ===================================================
// ROUTE: MODIFIER UN RAPPORT
// ===================================================
// PUT /api/reports/:id
router.put('/:id', (req, res) => {
    const reportId = req.params.id;
    const { theme, status } = req.body;

    const query = `
        UPDATE reports 
        SET theme = ?, status = ?
        WHERE id = ?
    `;

    db.run(query, [theme, status, reportId], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur modification'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rapport non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Rapport modifié'
        });
    });
});

// ===================================================
// ROUTE: TÉLÉCHARGER UN RAPPORT
// ===================================================
// GET /api/reports/:id/download
router.get('/:id/download', (req, res) => {
    const reportId = req.params.id;

    db.get('SELECT file_path FROM reports WHERE id = ?', [reportId], (err, report) => {
        if (err || !report) {
            return res.status(404).json({
                success: false,
                message: 'Rapport non trouvé'
            });
        }

        if (!report.file_path) {
            return res.status(404).json({
                success: false,
                message: 'Aucun fichier associé'
            });
        }

        const filePath = path.join(__dirname, '../uploads/reports', report.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Fichier introuvable'
            });
        }

        res.download(filePath);
    });
});

// ===================================================
// ROUTE: SUPPRIMER UN RAPPORT
// ===================================================
// DELETE /api/reports/:id
router.delete('/:id', (req, res) => {
    const reportId = req.params.id;

    // Récupérer le chemin du fichier avant de supprimer
    db.get('SELECT file_path FROM reports WHERE id = ?', [reportId], (err, report) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        // Supprimer le rapport de la BD
        db.run('DELETE FROM reports WHERE id = ?', [reportId], function (err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Erreur suppression'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rapport non trouvé'
                });
            }

            // Supprimer le fichier s'il existe
            if (report && report.file_path) {
                const filePath = path.join(__dirname, '../uploads/reports', report.file_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            res.json({
                success: true,
                message: 'Rapport supprimé'
            });
        });
    });
});

// ===================================================
// ROUTE: STATISTIQUES DES RAPPORTS
// ===================================================
// GET /api/reports/stats/overview
router.get('/stats/overview', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'soumis' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'en_attente' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'valide' THEN 1 ELSE 0 END) as validated
        FROM reports
    `;

    db.get(query, [], (err, stats) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            stats: stats
        });
    });
});

module.exports = router;