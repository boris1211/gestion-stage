// ===================================================
// routes/auth.js - GESTION DE L'AUTHENTIFICATION
// ===================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ===================================================
// POST /api/auth/login
// ===================================================
// C'est cette route que index.Html appelle quand
// l'utilisateur clique sur "Se connecter".
//
// Elle reçoit : { email, password, role }
// Elle répond : { success, message, user } ou { success, message }
// ===================================================

router.post('/login', (req, res) => {

    // 1. Récupérer les données envoyées par le formulaire
    const { email, password, role } = req.body;

    // 2. Vérifier que tous les champs sont présents
    if (!email || !password || !role) {
        return res.status(400).json({
            success: false,
            message: 'Email, mot de passe et rôle sont requis.'
        });
    }

    // 3. Chercher l'utilisateur dans la base de données par email
    const query = `SELECT * FROM users WHERE email = ? LIMIT 1`;

    db.get(query, [email.trim().toLowerCase()], (err, user) => {

        // 4. Gérer une erreur de base de données
        if (err) {
            console.error('Erreur DB login:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur. Réessayez.'
            });
        }

        // 5. Aucun utilisateur trouvé avec cet email
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email incorrect ou compte inexistant.'
            });
        }

        // 6. Vérifier le mot de passe
        // NOTE : tes mots de passe sont actuellement en clair dans la BD.
        // Si tu ajoutes bcrypt plus tard, remplace cette ligne par :
        // const passwordOk = await bcrypt.compare(password, user.password);
        const passwordOk = (password === user.password);

        if (!passwordOk) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe incorrect.'
            });
        }

        // 7. Vérifier que le rôle correspond au bouton cliqué
        // (évite qu'un étudiant se connecte avec le bouton Admin)
        if (user.role !== role) {
            const label = role === 'admin' ? 'administrateur' : 'étudiant';
            return res.status(403).json({
                success: false,
                message: `Ce compte n'est pas un compte ${label}.`
            });
        }

        // 8. Connexion réussie → renvoyer les infos de l'utilisateur
        // On ne renvoie JAMAIS le mot de passe au frontend
        return res.json({
            success: true,
            message: `Bienvenue ${user.name} ${user.surname} !`,
            user: {
                id:      user.id,
                name:    user.name,
                surname: user.surname,
                email:   user.email,
                role:    user.role,
                filiere: user.filiere || '',
                niveau:  user.niveau  || ''
            }
        });
    });
});

module.exports = router;