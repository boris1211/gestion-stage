// ===================================================
// routes/users.js - GESTION DES UTILISATEURS
// ===================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ===================================================
// POST /api/users/create
// ===================================================
// Appelée par admin-dashboard quand l'admin remplit
// le formulaire "Créer Utilisateur".
//
// Elle reçoit : { role, name, surname, email, password, filiere, niveau }
// Elle répond : { success, message, user } ou { success, message }
// ===================================================

router.post('/create', (req, res) => {

    // 1. Récupérer les données du formulaire
    const { role, name, surname, email, password, filiere, niveau } = req.body;

    // 2. Vérifier les champs obligatoires
    if (!role || !name || !surname || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Tous les champs obligatoires doivent être remplis (rôle, nom, prénom, email, mot de passe).'
        });
    }

    // 3. Vérifier que le rôle est valide
    if (!['admin', 'student'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Rôle invalide. Utilisez "admin" ou "student".'
        });
    }

    // 4. Vérifier si l'email est déjà utilisé
    db.get(`SELECT id FROM users WHERE email = ?`, [email.trim().toLowerCase()], (err, existing) => {

        if (err) {
            console.error('Erreur vérification email:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur.' });
        }

        // 5. Email déjà pris → on refuse
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `L'email "${email}" est déjà utilisé par un autre compte.`
            });
        }

        // 6. Insérer le nouvel utilisateur dans la base de données
        const query = `
            INSERT INTO users (role, name, surname, email, password, filiere, niveau)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            role,
            name.trim(),
            surname.trim(),
            email.trim().toLowerCase(),
            password,               // En clair pour l'instant (cohérent avec la BD actuelle)
            filiere ? filiere.trim() : null,
            niveau  ? niveau.trim()  : null
        ];

        db.run(query, params, function (err) {

            if (err) {
                console.error('Erreur insertion utilisateur:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création du compte.'
                });
            }

            // 7. Succès → renvoyer les infos du nouvel utilisateur
            // this.lastID = l'ID auto-généré par SQLite
            return res.status(201).json({
                success: true,
                message: `Compte de ${name} ${surname} créé avec succès !`,
                user: {
                    id:      this.lastID,
                    role:    role,
                    name:    name.trim(),
                    surname: surname.trim(),
                    email:   email.trim().toLowerCase(),
                    filiere: filiere || '',
                    niveau:  niveau  || ''
                }
            });
        });
    });
});

// ===================================================
// GET /api/users/students
// ===================================================
// Récupère la liste de tous les étudiants.
// Utilisée par le dashboard admin pour afficher le tableau.
// ===================================================

router.get('/students', (req, res) => {

    const query = `
        SELECT 
            u.id,
            u.name,
            u.surname,
            u.email,
            u.filiere,
            u.niveau,
            u.created_at,
            COALESCE(e.name, 'AUCUNE DEMANDE') as enterprise_name
        FROM users u
        LEFT JOIN stages s ON s.student_id = u.id AND s.status != 'termine'
        LEFT JOIN enterprises e ON e.id = s.enterprise_id
        WHERE u.role = 'student'
        ORDER BY u.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur récupération étudiants:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur.' });
        }

        return res.json({ success: true, students: rows });
    });
});

// ===================================================
// DELETE /api/users/:id
// ===================================================
// Supprime un utilisateur par son ID.
// Utilisée par le bouton "Supprimer" dans le tableau admin.
// ===================================================

router.delete('/:id', (req, res) => {

    const userId = req.params.id;

    db.run(`DELETE FROM users WHERE id = ?`, [userId], function (err) {
        if (err) {
            console.error('Erreur suppression utilisateur:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        }

        return res.json({ success: true, message: 'Utilisateur supprimé avec succès.' });
    });
});

module.exports = router;