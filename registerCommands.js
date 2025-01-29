require('dotenv').config();
const { REST, Routes } = require('discord.js');

const DISCORD_APP_ID = process.env.DISCORD_APP_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const commands = [
  {
    name: 'setchannel',
    description: 'Set the notification channel',
    options: [
      {
        name: 'channel',
        description: 'The channel to send notifications to',
        type: 7,
        required: true
      }
    ]
  },
  {
    name: 'addstreamer',
    description: 'Add a Twitch streamer to track',
    options: [
      {
        name: 'username',
        description: 'Twitch username to track',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'removestreamer',
    description: 'Remove a tracked Twitch streamer',
    options: [
      {
        name: 'username',
        description: 'Twitch username to stop tracking',
        type: 3,
        required: true
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Registering slash commands...');
    
    await rest.put(
      Routes.applicationCommands(DISCORD_APP_ID),
      { body: commands }
    );

    console.log('Successfully registered application commands!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

registerCommands();