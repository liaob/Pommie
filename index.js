const Discord = require("discord.js");
const config = require("./config.json");
const ytdl = require('ytdl-core');
const {
	AudioPlayerStatus,
	StreamType,
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
    getVoiceConnection,
} = require('@discordjs/voice');

const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"]});

let inProgress = false;
let onBreak = false;
let timer;
let currentGuild = '';
let timerConfig = {
    study: 0,
    break: 0,
    breakMusic: '',
};

const breakButtons = new Discord.MessageActionRow().addComponents(
    new Discord.MessageButton().setCustomId('break').setLabel('Break').setStyle('PRIMARY'),
    new Discord.MessageButton().setCustomId('cancel').setLabel('Cancel').setStyle('SECONDARY'),
);

const studyButtons = new Discord.MessageActionRow().addComponents(
    new Discord.MessageButton().setCustomId('study').setLabel('Study').setStyle('PRIMARY'),
    new Discord.MessageButton().setCustomId('cancel').setLabel('Cancel').setStyle('SECONDARY'),
);

client.on("messageCreate", async function(message) {
    if (message.author.bot) return;
    if(inProgress === true && !message.content.startsWith('!')){
        message.reply("Session in Progress. NO SPEAKING.");
    }
    if (!message.content.startsWith('!')) return;

    const commandBody = message.content.slice('!'.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();
    
    if (command === "help") {
        message.reply('Current commands: \n'+
        '!start: Starts the pomodoro session\n'+
        '!stop: Stops the ponodoro session\n'+
        '!setstudytime {time in minutes}: Set the study time\n'+
        '!setbreaktime {time in minutes}: Set the break time\n'+
        '!setbreakmusic {youtube link}: Set the break music');
    }

    if (command === "setstudytime") {
        let time = parseInt(args[0]);
        if (time !== NaN) {
            timerConfig.study = time;
            message.reply('Study time changed');
        }
        else {
            message.reply('Error setting study time')
        }
    }

    if (command === "setbreaktime") {
        let time = parseInt(args[0]);
        if (time !== NaN) {
            timerConfig.break = time;
            message.reply('Break time changed');
        }
        else {
            message.reply('Error setting break time')
        }
    }

    if (command === "setbreakmusic") {
        message.reply('Music set')
        timerConfig.breakMusic = args[0];
    }

    if (command === "start") {
        await startSession(message, 'study');
      }
    if (command === "stop"){
        await stopSession(message);
    }
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
    if(interaction.customId === 'break'){
        await startSession(interaction, 'break');
    }
    else if(interaction.customId === 'study'){
        await startSession(interaction, 'study');
    }
    if (interaction.customId === 'cancel') {
        await stopSession(interaction);
    }
});

client.login(config.BOT_TOKEN);

const startSession = async (message, key) => {
    if(inProgress === true){
        message.reply(`Session currently in progress! Calm down fool.`);
    }
    else if(key === 'study'){
        inProgress = true;
        onBreak = false;
        getVoiceConnection(currentGuild)?.disconnect();
        message.reply(`Current time: <t:${Math.floor(Date.now()/1000)}>\nStarting timer for study session for ${timerConfig.study} minutes.`);

        runTimer('study', message, breakButtons);
    }
    else if(key === 'break') {
        inProgress = false;
        onBreak = true;

        message.reply(`Starting timer for break session for ${timerConfig.break} minutes.`);

        if(timerConfig.breakMusic === ''){
            runTimer('break', message, studyButtons);
        }
        else {
            const voice = message.member.voice.channel;
            if(voice){
                currentChannel = voice.guildId;
                const connection = joinVoiceChannel({
                    channelId: voice.id,
                    guildId: voice.guildId,
                    adapterCreator: voice.guild.voiceAdapterCreator,
                });
                const stream = ytdl(timerConfig.breakMusic, {filter:'audioonly'});
                const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
                const player = createAudioPlayer();
                
                player.play(resource);
                connection.subscribe(player);
                
                player.on(AudioPlayerStatus.Idle, () => connection.destroy());
                runTimer('break', message, studyButtons);
            }
            else {
                message.channel.send('Join a voice channel first if you want music to play!');
            }
        }
    }
};

const stopSession = async (message) => {
    clearInterval(timer);
    inProgress = false;
    message.reply("Pomodoro Session Cancelled");
};

const runTimer = async (key, message, buttons) => {
    let mins, seconds;
    if(key === 'study'){
        mins = timerConfig.study;
        seconds = 5;
    }
    else if(key === 'break'){
        mins = timerConfig.break;
        seconds = 5;
    }

    let timerMessage = await message.channel.send(`Time Remaining: ${formatTime(mins)}:${formatTime(seconds)}`);
    timer = setInterval(() => {
        if(seconds == 0){
            seconds = 59;
            mins--;
        }
        else{
            seconds--;
        }
        timerMessage.edit(`Time Remaining: ${formatTime(mins)}:${formatTime(seconds)}`);
        if(mins === 0 && seconds === 0){
            clearInterval(timer);
            message.channel.send("Time's Up!")
            inProgress = false;
            onBreak = false;
            message.channel.send({content:"Continue?", components:[buttons]});
        }
    },1000);
}

const formatTime = (time) => {
    if(time > 9) {
        return time.toString();
    }
    switch(time) {
        case 1:
            return '01';
        case 2:
            return '02';
        case 3:
            return '03';
        case 4:
            return '04';
        case 5:
            return '05';
        case 6:
            return '06';
        case 7:
            return '07';
        case 8:
            return '08';
        case 9:
            return '09';
        default:
            return '00';
    }
}