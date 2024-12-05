const { Listener } = require("@sapphire/framework");
const db = require("../../tools/database");
const fs = require('fs');

class GuildDelete extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildDelete",
    });
  }
  async run(guild) {
    if (require("../../config.json").process.botmode == "custom") {
      const bots = JSON.parse(
        fs.readFileSync(require("../../custombot").list, "utf8"),
      );

      const foundToken = bots.find((b) => b.token == client.token);
      if (!foundToken.guild.contains(guild.id)) db.initGuildDatabase(guild.id);
      else {
        guild.me.leave();
      }
    }
    else db.initGuildDatabase(guild.id);
    console.log(`Left guild ${guild.name} (${guild.id})`);
  }
}
module.exports = {
  GuildDelete,
};
