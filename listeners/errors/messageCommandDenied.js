const { Listener } = require("@sapphire/framework");

class MessageCommandDenied extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageCommandDenied",
    });
  }
  run(error, { message }) {
    if (Reflect.get(Object(error.context), 'silent') || message.channel.isDMBased()) return;
    return message.reply({ content: `${this.container.emojis.error} ${error}` });
  }
}
module.exports = {
  MessageCommandDenied,
};
