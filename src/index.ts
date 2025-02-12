import axios from 'axios';
import { Client, GatewayIntentBits, EmbedBuilder, TextChannel } from 'discord.js';
import 'dotenv/config';
import { loadData, saveData, Data } from './storage.js';

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

let twitchAccessToken: string | null = null;
const liveStatus = new Map<string, boolean>();
let notificationChannel: TextChannel | null = null;

const data: Data = loadData();
console.log(data);

async function getTwitchToken(): Promise<string | void> {
  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token`,
      `client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Twitch token:', error);
  }
}

async function twitchApiGet(url: string): Promise<any> {
  if (!twitchAccessToken) return;

  try {
    const response = await axios.get(url, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${twitchAccessToken}`
      }
    });
    return response;
  }
  catch (error: any) {
    if (error.response?.status === 401) {
      twitchAccessToken = (await getTwitchToken()) || twitchAccessToken;
    }
    console.error('Error calling Twitch API:', error.message);
  }
}

async function checkStreams(): Promise<void> {
  for (const streamer of data.trackedStreamers) {
    const response = await twitchApiGet(`https://api.twitch.tv/helix/streams?user_login=${streamer}`);

    const streamData = response.data.data[0];
    const isLive = streamData?.type === 'live';
    const wasLive = liveStatus.get(streamer) || false;

    if (isLive && !wasLive) {
      const streamerInfo = await getStreamerInfo(streamer);
      sendNotification(streamer, streamData, streamerInfo);
    }

    liveStatus.set(streamer, isLive);
  }
}

async function getStreamerInfo(streamer: string): Promise<any> {
  const response = await twitchApiGet(`https://api.twitch.tv/helix/users?login=${streamer}`);
  return response.data.data[0];
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
  if (data.notificationChannelId) {
    console.log(`Fetching notificationChannel: ${data.notificationChannelId}`);
    notificationChannel = await client.channels.fetch(data.notificationChannelId || '') as TextChannel | null;
  }
  twitchAccessToken = (await getTwitchToken()) || '';
  setInterval(checkStreams, CHECK_INTERVAL);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  // Set notification channel
  if (commandName === 'setchannel') {
    notificationChannel = options.getChannel('channel');
    console.log(`Set notification channel to ${notificationChannel} - ${interaction.user.tag}`);
    data.notificationChannelId = notificationChannel?.id || null;
    saveData(data);
    await interaction.reply(`Notification channel set to ${notificationChannel}`);
  }

  // Add streamer to track
  if (commandName === 'addstreamer') {
    const streamer = options.getString('username');
    if(streamer === null) {
      await interaction.reply('Please provide a username');
      return;
    }
    data.trackedStreamers.add(streamer.toLowerCase());
    console.log(`Added ${streamer} to tracked streamers - ${interaction.user.tag}`);
    console.log(data);
    saveData(data);
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
    data.trackedStreamers.delete(streamer.toLowerCase());
    saveData(data);
    await interaction.reply(`Removed ${streamer} from tracked streamers`);
  }
});

client.login(DISCORD_TOKEN);