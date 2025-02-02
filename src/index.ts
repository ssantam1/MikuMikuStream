import * as fs from 'fs';
import path from 'path';
import 'dotenv/config';
import axios from 'axios';
import { Client, GatewayIntentBits, EmbedBuilder, TextChannel } from 'discord.js';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const CHECK_INTERVAL = 60000; // 60 seconds
const DATA_FILE = path.join(__dirname, '..', 'data.json');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ] 
});

let twitchAccessToken = '';
const trackedStreamers = new Set<string>();
const liveStatus = new Map<string, boolean>();
let notificationChannelId: string | null = null;
let notificationChannel: TextChannel | null = null;

interface Data {
  trackedStreamers: string[];
  notificationChannel: string;
}

// Load saved data
if (fs.existsSync(DATA_FILE)) {
  const data: Data = JSON.parse(fs.readFileSync(DATA_FILE).toString());

  if (data.trackedStreamers) {
    data.trackedStreamers.forEach(streamer => trackedStreamers.add(streamer));
  }

  if (data.notificationChannel) {
    notificationChannelId = data.notificationChannel;
  }

  console.log('Loaded saved data');
}

function saveData() {
  const data = {
    trackedStreamers: Array.from(trackedStreamers),
    notificationChannel: notificationChannel?.id
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

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
    } catch (error: any) {
      if (error.response?.status === 401) {
        await getTwitchToken();
      }
      console.error(`Error checking ${streamer}:`, error.message);
    }
  }
}

async function getStreamerInfo(streamer: string) {
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
  } catch (error: any) {
    if (error.response?.status === 401) {
      await getTwitchToken();
    }
    console.error(`Error getting streamer info for ${streamer}:`, error.message);
  }
}

function sendNotification(streamer: string, streamData: any, streamerInfo: any) {
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

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  if (notificationChannelId) {
    console.log(`Fetching notificationChannel: ${notificationChannelId}`);
    notificationChannel = await client.channels.fetch(notificationChannelId || '') as TextChannel | null;
  }
  getTwitchToken();
  setInterval(checkStreams, CHECK_INTERVAL);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  // Set notification channel
  if (commandName === 'setchannel') {
    notificationChannel = options.getChannel('channel');
    console.log(`Set notification channel to ${notificationChannel} - ${interaction.user.tag}`);
    saveData();
    await interaction.reply(`Notification channel set to ${notificationChannel}`);
  }

  // Add streamer to track
  if (commandName === 'addstreamer') {
    const streamer = options.getString('username');
    if(streamer === null) {
      await interaction.reply('Please provide a username');
      return;
    }
    trackedStreamers.add(streamer.toLowerCase());
    console.log(`Added ${streamer} to tracked streamers - ${interaction.user.tag}`);
    saveData();
    await interaction.reply(`Added ${streamer} to tracked streamers`);
  }

  // Remove tracked streamer
  if (commandName === 'removestreamer') {
    const streamer = options.getString('username');
    if(streamer === null) {
      await interaction.reply('Please provide a username');
      return;
    }
    console.log(`Removed ${streamer} from tracked streamers - ${interaction.user.tag}`);
    trackedStreamers.delete(streamer.toLowerCase());
    saveData();
    await interaction.reply(`Removed ${streamer} from tracked streamers`);
  }
});

client.login(DISCORD_TOKEN);