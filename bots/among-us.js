const Discord = require('discord.js');
const queue = require('../controllers/among-us-queue');
const client = new Discord.Client();

async function connect() {
    client.on('ready', () => {
      queue.setup();
      console.log(`Logged in as ${client.user.tag}!`);
    });
    
    client.on('message', msg => {
      if (['createQueue', 'cq'].includes(msg.content)) {
        queue.createQueue(123, 123);
      }


      if (['queue', 'q'].includes(msg.content)) {
        queue.getQueue(123);
      }
      if (['queueplayer'].includes(msg.content)) {
        queue.enqueue(123, 123);
      }

      if (['kick', 'k'].includes(msg.content)) {
        queue.createQueue(123, 123);
      }

      if (['setCode'].includes(msg.content)) {
        queue.setCode(123, 'ABCD');
      }

    });
    
    client.login(process.env.TOKEN);
}

module.exports = {
  connect
};
