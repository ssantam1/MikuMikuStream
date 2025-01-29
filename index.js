require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const CHECK_INTERVAL = 60000; // 60 seconds

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ] 
});

let twitchAccessToken = '';
const trackedStreamers = new Set();
const liveStatus = new Map();
let notificationChannel = null;

async function getTwitchToken() {
  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token`,
      `client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );
    twitchAccessToken = response.data.access_token;
  } catch (error) {
    console.error('Error getting Twitch token:', error);
  }
}

async function checkStreams() {
  if (!twitchAccessToken) return;

  for (const streamer of trackedStreamers) {
    try {
      const response = await axios.get(
        `https://api.twitch.tv/helix/streams?user_login=${streamer}`,
        {
          headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${twitchAccessToken}`
          }
        }
      );

      const streamData = response.data.data[0];
      const isLive = streamData?.type === 'live';
      const wasLive = liveStatus.get(streamer) || false;

      if (isLive && !wasLive) {
        const streamerInfo = await getStreamerInfo(streamer);
        sendNotification(streamer, streamData, streamerInfo);
      }

      liveStatus.set(streamer, isLive);
    } catch (error) {
      if (error.response?.status === 401) {
        await getTwitchToken();
      }
      console.error(`Error checking ${streamer}:`, error.message);
    }
  }
}

async function getStreamerInfo(streamer) {
  if (!twitchAccessToken) return;

  try {
    const response = await axios.get(
      `https://api.twitch.tv/helix/users?login=${streamer}`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${twitchAccessToken}`
        }
      }
    );

    return response.data.data[0];
  } catch (error) {
    if (error.response?.status === 401) {
      await getTwitchToken();
    }
    console.error(`Error getting streamer info for ${streamer}:`, error.message);
  }
}

function sendNotification(streamer, streamData, streamerInfo) {
  if (!notificationChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`${streamData.user_name} is now live on Twitch!`)
    .setURL(`https://twitch.tv/${streamer}`)
    .setColor('#9146FF')
    .setThumbnail(streamerInfo.profile_image_url)
    .addFields(
      { name: 'Title', value: streamData.title },
      { name: 'Game', value: streamData.game_name }
    )
    .setImage(streamData.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'))
    .setTimestamp();

  notificationChannel.send({ embeds: [embed] });
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  getTwitchToken();
  setInterval(checkStreams, CHECK_INTERVAL);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'setchannel') {
    notificationChannel = options.getChannel('channel');
    await interaction.reply(`Notification channel set to ${notificationChannel}`);
  }

  if (commandName === 'addstreamer') {
    const streamer = options.getString('username').toLowerCase();
    trackedStreamers.add(streamer);
    await interaction.reply(`Added ${streamer} to tracked streamers`);
  }

  if (commandName === 'removestreamer') {
    const streamer = options.getString('username').toLowerCase();
    trackedStreamers.delete(streamer);
    await interaction.reply(`Removed ${streamer} from tracked streamers`);
  }
});

client.login(DISCORD_TOKEN);