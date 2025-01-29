
# MikuMikuStream

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue.svg)](https://discord.js.org/)
[![Twitch API](https://img.shields.io/badge/Twitch-API-9146FF.svg)](https://dev.twitch.tv/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A Discord bot that delivers notifications when Twitch channels go live.

## Features

- **Notifications**: Alerts when tracked streamers start broadcasting
- **Inter-Platform Integration**: Connectivity with Discord and Twitch APIs
- **Slash Commands**: User-friendly commands for management

## Installation

### Prerequisites
- Node.js v18+
- Discord Developer Account
- Twitch Developer Account

```bash
# Clone repository
git clone https://github.com/ssantam1/MikuMikuStream.git
cd MikuMikuStream

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

## Configuration

1. **Discord Setup**
   - Create bot at [Discord Developer Portal](https://discord.com/developers/applications)
   - Get your Application ID and Token
   - Create an invite link: https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands 

2. **Twitch Setup**
   - Register application at [Twitch Developer Console](https://dev.twitch.tv/console)
   - Generate Client ID and Client Secret

**.env Configuration**
```ini
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

## Command Registration

```bash
# Register slash commands with Discord
node registerCommands.js
```

## Usage

```bash
# Start the bot
node index.js
```

### Available Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/setchannel #channel` | Sets notification channel | `/setchannel #stream-alerts` |
| `/addstreamer username` | Adds streamer to tracking list | `/addstreamer shroud` |
| `/removestreamer username` | Removes streamer from tracking | `/removestreamer summit1g` |