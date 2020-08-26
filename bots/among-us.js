const Discord = require('discord.js');
const queue = require('../controllers/among-us-queue');
const client = new Discord.Client();

async function connect() {
    client.on('ready', () => {
      queue.setup().then(() => {
        client.guilds.cache.keyArray().forEach(serverId => {
          queue.createQueue(serverId);

        })
        console.log(`Logged in as ${client.user.tag}!`);
      });
    });
    
    client.on('message', msg => {
      if(!msg.content.startsWith(process.env.IDENTIFIER)) return;

      // Remove identified
      let command = msg.content.substring((process.env.IDENTIFIER).length).split(' ');
    
      if (['createQueue', 'cq'].includes(command[0])) {
        queue.createQueue(msg.guild.id, msg.author.id);
      }


      if (['queue', 'q'].includes(command[0])) {
        queue.getQueue(msg.guild.id);
      }

      if (['queueplayer', 'qp'].includes(command[0])) {
        if(!command[1].match(/<@!(\d{18})>/)) return;

        queue.enqueue(msg.guild.id, command[1].substring(3,21));
      }

      if (['kick', 'k'].includes(command[0])) {
        if(!command[1].match(/<@!(\d{18})>/)) return;

        queue.dequeue(msg.guild.id, command[1].substring(3,21));
      }

      if (['setCode'].includes(command[0])) {
        queue.setCode(msg.guild.id, command[1]);
      }

    });
    
    client.login(process.env.TOKEN);
}

module.exports = {
  connect
};
