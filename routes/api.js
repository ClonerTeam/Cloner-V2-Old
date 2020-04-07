var express = require('express');
var router = express.Router();

var client = require('../app').client;

router.get('/', function(req, res) {
    res.redirect('/');
});

router.get('/guilds/:id', function(req, res) {
    let key = req.cookies.get('accesstoken')
    if(key) {
        if(req.params.id === '') {
            res.redirect('/');
          } else {
            var data = { success: false };
            let newGuild = client.guilds.get(req.params.id);
    
            if(!newGuild) { data.error = 'Erreur : 404 Serveur non trouvée. Merci de réessayer avec un serveur valide.'; data.errorid = 1; return res.send(JSON.stringify(data)); }

            if(!newGuild.available) { data.error = 'Nouveau serveur non disponible. Merci de réessayer plus tard.'; data.errorid = 2; return res.send(JSON.stringify(data)); }

            let newGuildAdminRole = newGuild.roles.find(elem => elem.name.toLowerCase() === 'guildcopy');

            if(!newGuildAdminRole) { data.error = 'Veuillez créer le rôle guildcopy sur le serveur vide.';  data.errorid = 3; return res.send(JSON.stringify(data)); }

            if (!newGuildAdminRole.permissions.has('ADMINISTRATOR')) { data.error = 'Le rôle guildcopy n\'a pas la permission administrateur !'; data.errorid = 4; return res.send(JSON.stringify(data)); }

            let highestRole = newGuild.roles.reduce((prev, role) => role.comparePositionTo(prev) > 0 ? role : prev, newGuild.roles.first());
            if (newGuildAdminRole.id !== highestRole.id) { data.error = 'Le rôle guildcopy doit être le plus haut rôle du serveur vide !';  data.errorid = 5; return res.send(JSON.stringify(data)); }

            if(!newGuild.me.roles.has(newGuildAdminRole.id)) { data.error = `Veuillez attribuer le rôle guildcopy à ${client.user.username} ce trouvant dans le serveur vide.`; data.errorid = 5; return res.send(JSON.stringify(data)); }

            data.newGuildAdminRoleId = newGuildAdminRole.id; data.success = true;

            res.send(JSON.stringify(data));
        }
    } else {
        res.redirect('/');
    }
});

module.exports = router;