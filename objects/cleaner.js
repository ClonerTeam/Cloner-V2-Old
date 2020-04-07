class Cleaner {
    /**
     * Cleaning the new guild.
     * Channels: All categories/text/voice channels
     * Roles: All roles except the 'guildcopy' role
     * Emojis: All emojis (only if enabled in the settings)
     * Bans: All banned users (only if enabled in the settings)
     * @param {Client} client Discord Client
     * @param {string} newGuildId New guild id
     * @param {string} newGuildAdminRoleId New guild Administrator role id
     * @param {Object} guildData Serialized guild data
     * @returns {Object} guildData
     */
    static cleanNewGuild(client, newGuildId, newGuildAdminRoleId, guildData) {
        return new Promise(async (resolve, reject) => {
            try {
                let newGuild = client.guilds.get(newGuildId);

                await Promise.all(newGuild.channels.deleteAll());

                let filter = role => role.id !== newGuildAdminRoleId && role.id !== newGuild.defaultRole.id && !role.managed;
                let rolesToDelete = newGuild.roles.filter(filter);
                await Promise.all(rolesToDelete.deleteAll());

                return resolve(guildData);
            } catch (err) {
                return reject(err);
            }
        });
    }
}

module.exports = Cleaner;
