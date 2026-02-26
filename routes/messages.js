// ===================================================
// messages.js - GESTION DE LA MESSAGERIE
// ===================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ===================================================
// ROUTE: RÉCUPÉRER LES MESSAGES D'UN UTILISATEUR
// ===================================================
router.get('/:userId', (req, res) => {
    const userId = req.params.userId;
    const { box } = req.query;

    let query;
    if (box === 'sent') {
        query = `
            SELECT m.*, 
                   u.name as recipient_name, 
                   u.surname as recipient_surname
            FROM messages m
            INNER JOIN users u ON m.to_user_id = u.id
            WHERE m.from_user_id = ?
            ORDER BY m.created_at DESC
        `;
    } else {
        query = `
            SELECT m.*, 
                   u.name as sender_name, 
                   u.surname as sender_surname
            FROM messages m
            INNER JOIN users u ON m.from_user_id = u.id
            WHERE m.to_user_id = ?
            ORDER BY m.created_at DESC
        `;
    }

    db.all(query, [userId], (err, messages) => {
        if (err) {
            console.error('Erreur récupération messages:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            count: messages.length,
            messages: messages
        });
    });
});

// ===================================================
// ROUTE: DÉTAILS D'UN MESSAGE
// ===================================================
router.get('/detail/:messageId', (req, res) => {
    const messageId = req.params.messageId;

    const query = `
        SELECT m.*, 
               sender.name as sender_name, 
               sender.surname as sender_surname,
               recipient.name as recipient_name, 
               recipient.surname as recipient_surname
        FROM messages m
        INNER JOIN users sender ON m.from_user_id = sender.id
        INNER JOIN users recipient ON m.to_user_id = recipient.id
        WHERE m.id = ?
    `;

    db.get(query, [messageId], (err, message) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message non trouvé'
            });
        }

        db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [messageId]);

        res.json({
            success: true,
            message: message
        });
    });
});

// ===================================================
// ROUTE: ENVOYER UN MESSAGE
// ===================================================
router.post('/', (req, res) => {
    const { fromUserId, toUserId, subject, content } = req.body;

    if (!fromUserId || !toUserId || !subject || !content) {
        return res.status(400).json({
            success: false,
            message: 'Tous les champs sont requis'
        });
    }

    const query = `
        INSERT INTO messages (from_user_id, to_user_id, subject, content)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [fromUserId, toUserId, subject, content], function (err) {
        if (err) {
            console.error('Erreur envoi message:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur envoi du message'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Message envoyé',
            messageId: this.lastID
        });
    });
});

// ===================================================
// ROUTE: ENVOYER À TOUS LES ÉTUDIANTS
// ===================================================
router.post('/broadcast', (req, res) => {
    const { fromUserId, subject, content } = req.body;

    if (!fromUserId || !subject || !content) {
        return res.status(400).json({
            success: false,
            message: 'Champs requis manquants'
        });
    }

    db.all('SELECT id FROM users WHERE role = "student"', [], (err, students) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucun étudiant trouvé'
            });
        }

        const insertQuery = `
            INSERT INTO messages (from_user_id, to_user_id, subject, content)
            VALUES (?, ?, ?, ?)
        `;

        let completed = 0;
        let errors = 0;

        students.forEach(student => {
            db.run(insertQuery, [fromUserId, student.id, subject, content], (err) => {
                if (err) errors++;
                completed++;

                if (completed === students.length) {
                    res.status(201).json({
                        success: true,
                        message: `Message envoyé à ${students.length - errors} étudiants`,
                        sent: students.length - errors,
                        failed: errors
                    });
                }
            });
        });
    });
});

// ===================================================
// ROUTE: MARQUER COMME LU
// ===================================================
router.put('/:messageId/read', (req, res) => {
    const messageId = req.params.messageId;

    db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [messageId], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            message: 'Message marqué comme lu'
        });
    });
});

// ===================================================
// ROUTE: SUPPRIMER UN MESSAGE
// ===================================================
router.delete('/:messageId', (req, res) => {
    const messageId = req.params.messageId;

    db.run('DELETE FROM messages WHERE id = ?', [messageId], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur suppression'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Message supprimé'
        });
    });
});

// ===================================================
// ROUTE: NOMBRE DE MESSAGES NON LUS
// ===================================================
router.get('/:userId/unread-count', (req, res) => {
    const userId = req.params.userId;

    const query = 'SELECT COUNT(*) as count FROM messages WHERE to_user_id = ? AND is_read = 0';

    db.get(query, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }

        res.json({
            success: true,
            unreadCount: result.count
        });
    });
});

module.exports = router;