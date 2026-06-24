require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Readable } = require('node:stream');
const googleTTS = require('google-tts-api');
const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  InteractionContextType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  REST,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null;
const DATA_FILE = path.resolve(process.env.DATA_FILE || './data/state.json');
const ANNOUNCEMENT_CHANNEL_ID = process.env.ANNOUNCEMENT_CHANNEL_ID || '1256456334287568979';
const RECRUITMENT_VOICE_CHANNEL_ID = process.env.RECRUITMENT_VOICE_CHANNEL_ID || '1519335930052214998';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '1519336397469782119';
const ADMIN_COMMAND_CHANNEL_ID = process.env.ADMIN_COMMAND_CHANNEL_ID || '1519329330251960511';
const ADMIN_ANNOUNCEMENT_CHANNEL_ID = process.env.ADMIN_ANNOUNCEMENT_CHANNEL_ID || '1519330711511896185';
const MEMBER_ROLE_ID = '1519333096309395516';
const SUPPORT_CENTER_CHANNEL_ID = '1519330182677401640';
const SUPPORT_NOTIFY_USER_ID = '429632267732910090';
const LISTEN_ONLY_PAIRS = {
  '1519328684278939711': '1519331849451737190',
  '1519331453635268660': '1519331876018458624',
  '1519331500158615664': '1519331992129503232',
};
const SHARED_LISTEN_ONLY_CHANNEL_ID = '1519364370923126905';
const TTS_MIN_VALUE = 0.5;
const TTS_MAX_VALUE = 2;

const GAMES = {
  valorant: { label: 'VALORANT', emoji: '🎯', roleId: '1519336143563259904', color: 0xff4655 },
  r6s: { label: 'レインボーシックス シージ', emoji: '🛡️', roleId: '1519375499296641256', color: 0xf2c94c },
  mahjong: { label: '雀魂', emoji: '🀄', roleId: '1519336170021064798', color: 0x2f80ed },
  splatoon: { label: 'スプラトゥーン', emoji: '🦑', roleId: '1519404400043626496', color: 0xf02d7d },
  minecraft: { label: 'マインクラフト', emoji: '⛏️', roleId: '1519336218914066542', color: 0x6fcf97 },
  overwatch: { label: 'Overwatch 2', emoji: '🟠', roleId: '1519336004698378320', color: 0xf99e1a },
  apex: { label: 'APEX', emoji: '🔺', roleId: '1519336221963456572', color: 0xda292a },
  madamis: { label: 'マダミス/TRPG', emoji: '🎲', roleId: '1519336342197244024', color: 0x7b61ff },
  other: { label: 'その他ゲーム', emoji: '🎮', roleId: '1519336298702176358', color: 0x9b51e0 },
  drinking: { label: '飲み会', emoji: '🍻', roleId: '1519370157116362822', color: 0xf2994a },
  everyone: { label: '全員を呼び出し', emoji: '📢', roleId: MEMBER_ROLE_ID, color: 0x5865f2 },
};

const STATUS = {
  join: { label: '参加', emoji: '✅', style: ButtonStyle.Success },
  maybe: { label: '未定', emoji: '🤔', style: ButtonStyle.Secondary },
  decline: { label: '不参加', emoji: '❌', style: ButtonStyle.Danger },
};

const recruitmentCommand = new SlashCommandBuilder()
  .setName('募集')
  .setDescription('参加者を募集します')
  .setContexts(InteractionContextType.Guild);

const closeCommand = new SlashCommandBuilder()
  .setName('募集終了')
  .setDescription('自分が作成した募集を締め切ります')
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option.setName('メッセージid').setDescription('募集メッセージのID（メッセージを右クリックしてコピー）').setRequired(true));

const helpCommand = new SlashCommandBuilder()
  .setName('使い方')
  .setDescription('ばーせbotの使い方を表示します')
  .setContexts(InteractionContextType.Guild);

const ttsCommand = new SlashCommandBuilder()
  .setName('読み上げ')
  .setDescription('現在のVCで、このチャットの読み上げを開始します')
  .setContexts(InteractionContextType.Guild);

const ttsStopCommand = new SlashCommandBuilder()
  .setName('読み上げ終了')
  .setDescription('現在の読み上げを終了します')
  .setContexts(InteractionContextType.Guild);

const ttsSettingsCommand = new SlashCommandBuilder()
  .setName('読み上げ設定')
  .setDescription('読み上げの速さと声の高さを設定します')
  .setContexts(InteractionContextType.Guild);

const adminAnnouncementCommand = new SlashCommandBuilder()
  .setName('お知らせ')
  .setDescription('装飾付きのお知らせを作成します')
  .setContexts(InteractionContextType.Guild);

const commands = [
  recruitmentCommand,
  closeCommand,
  helpCommand,
  ttsCommand,
  ttsStopCommand,
  ttsSettingsCommand,
  adminAnnouncementCommand,
]
  .map((command) => command.toJSON());

class Store {
  constructor(filename) {
    this.filename = filename;
    this.data = {
      recruitments: {},
      voiceAccess: null,
      hearingAccess: {},
      listenOnlyGlobal: {},
      ttsSettings: {},
    };
    this.writeChain = Promise.resolve();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    if (!fs.existsSync(this.filename)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filename, 'utf8'));
      if (parsed && parsed.recruitments) {
        this.data = {
          recruitments: parsed.recruitments,
          voiceAccess: parsed.voiceAccess || null,
          hearingAccess: parsed.hearingAccess || {},
          listenOnlyGlobal: parsed.listenOnlyGlobal || {},
          ttsSettings: parsed.ttsSettings || {},
        };
      }
    } catch (error) {
      console.error('保存データを読み込めませんでした:', error.message);
      process.exit(1);
    }
  }

  save() {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.writeChain = this.writeChain.then(async () => {
      const temporary = `${this.filename}.tmp`;
      await fs.promises.writeFile(temporary, snapshot, 'utf8');
      await fs.promises.rename(temporary, this.filename);
    });
    return this.writeChain;
  }
}

const store = new Store(DATA_FILE);
store.load();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const messageLocks = new Map();
const ownerPanels = new Map();
const ttsSessions = new Map();

async function withMessageLock(messageId, operation) {
  const previous = messageLocks.get(messageId) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  messageLocks.set(messageId, current);
  try {
    return await current;
  } finally {
    if (messageLocks.get(messageId) === current) messageLocks.delete(messageId);
  }
}

function permissionValue(overwrite, permission) {
  if (!overwrite) return null;
  if (overwrite.allow.has(permission)) return true;
  if (overwrite.deny.has(permission)) return false;
  return null;
}

async function cleanupLegacyListenOnlyAccess(guild) {
  for (const [key, original] of Object.entries(store.data.hearingAccess || {})) {
    const [textChannelId, userId] = key.split(':');
    const channel = await guild.channels.fetch(textChannelId).catch(() => null);
    if (!channel?.permissionOverwrites) continue;
    if (!original.existed) {
      await channel.permissionOverwrites.delete(userId, '旧聞き専個人権限を削除').catch(() => {});
    } else {
      await channel.permissionOverwrites.edit(userId, {
        ViewChannel: original.viewChannel,
        SendMessages: original.sendMessages,
        ReadMessageHistory: original.readMessageHistory,
      }, { reason: '旧聞き専個人権限を復元' });
    }
    delete store.data.hearingAccess[key];
  }
  await store.save();
}

async function setListenOnlyChannelVisibility(guild, textChannelId, visible) {
  const channel = await guild.channels.fetch(textChannelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.permissionOverwrites) return false;
  const everyoneId = guild.roles.everyone.id;
  const key = `${guild.id}:${textChannelId}`;
  if (visible) {
    if (!store.data.listenOnlyGlobal[key]) {
      const overwrite = channel.permissionOverwrites.cache.get(everyoneId);
      store.data.listenOnlyGlobal[key] = {
        existed: Boolean(overwrite),
        viewChannel: permissionValue(overwrite, PermissionFlagsBits.ViewChannel),
        sendMessages: permissionValue(overwrite, PermissionFlagsBits.SendMessages),
        readMessageHistory: permissionValue(overwrite, PermissionFlagsBits.ReadMessageHistory),
      };
      await store.save();
    }
    await channel.permissionOverwrites.edit(everyoneId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    }, { reason: 'フリーチャットVCが使用中のため全員へ公開' });
    return true;
  }

  const original = store.data.listenOnlyGlobal[key];
  if (!original) return false;
  if (!original.existed) {
    await channel.permissionOverwrites.delete(everyoneId, 'フリーチャットVCが無人のため非公開へ復元');
  } else {
    await channel.permissionOverwrites.edit(everyoneId, {
      ViewChannel: original.viewChannel,
      SendMessages: original.sendMessages,
      ReadMessageHistory: original.readMessageHistory,
    }, { reason: '聞き専チャンネルの元の権限へ復元' });
  }
  delete store.data.listenOnlyGlobal[key];
  await store.save();
  return true;
}

async function syncListenOnlyChannels(guild) {
  let anyFreeChatActive = false;
  for (const [voiceChannelId, textChannelId] of Object.entries(LISTEN_ONLY_PAIRS)) {
    const voiceChannel = await guild.channels.fetch(voiceChannelId).catch(() => null);
    if (!voiceChannel?.isVoiceBased()) continue;
    const active = voiceChannel.members.some((member) => !member.user.bot);
    if (active) anyFreeChatActive = true;
    await setListenOnlyChannelVisibility(guild, textChannelId, active);
  }
  await setListenOnlyChannelVisibility(guild, SHARED_LISTEN_ONLY_CHANNEL_ID, anyFreeChatActive);
}

function normalizeTtsText(message) {
  return message.content
    .replace(/<@!?\d+>/g, 'メンション')
    .replace(/<@&\d+>/g, 'ロールメンション')
    .replace(/<#\d+>/g, 'チャンネル')
    .replace(/https?:\/\/\S+/g, 'URL')
    .replace(/<a?:\w+:\d+>/g, '絵文字')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function getTtsSettings(userId) {
  const saved = store.data.ttsSettings[userId] || {};
  const previousSpeeds = [0.75, 1, 1.25];
  const previousPitches = [0.8, 1, 1.2];
  const storedSpeed = Number(saved.speed);
  const storedPitch = Number(saved.pitch);
  const speed = Number.isFinite(storedSpeed)
    ? storedSpeed
    : (previousSpeeds[saved.speedIndex] ?? 1);
  const pitch = Number.isFinite(storedPitch)
    ? storedPitch
    : (previousPitches[saved.pitchIndex] ?? 1);
  return {
    speed: Math.min(Math.max(speed, TTS_MIN_VALUE), TTS_MAX_VALUE),
    pitch: Math.min(Math.max(pitch, TTS_MIN_VALUE), TTS_MAX_VALUE),
  };
}

function ttsSettingsModal(userId) {
  const settings = getTtsSettings(userId);
  return new ModalBuilder()
    .setCustomId('tts-settings-form')
    .setTitle('読み上げ設定')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('speed')
          .setLabel('読み上げ速度（0.50～2.00）')
          .setStyle(TextInputStyle.Short)
          .setValue(settings.speed.toFixed(2))
          .setPlaceholder('例: 1.15')
          .setMaxLength(4)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('pitch')
          .setLabel('声の高さ（0.50～2.00）')
          .setStyle(TextInputStyle.Short)
          .setValue(settings.pitch.toFixed(2))
          .setPlaceholder('例: 0.95')
          .setMaxLength(4)
          .setRequired(true),
      ),
    );
}

async function handleTtsSettings(interaction) {
  await interaction.showModal(ttsSettingsModal(interaction.user.id));
}

async function handleTtsSettingsForm(interaction) {
  const speed = Number(interaction.fields.getTextInputValue('speed').trim());
  const pitch = Number(interaction.fields.getTextInputValue('pitch').trim());
  if (!Number.isFinite(speed) || !Number.isFinite(pitch)
    || speed < TTS_MIN_VALUE || speed > TTS_MAX_VALUE
    || pitch < TTS_MIN_VALUE || pitch > TTS_MAX_VALUE) {
    await interaction.reply({
      content: '速度と高さは0.50～2.00の実数値で入力してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  store.data.ttsSettings[interaction.user.id] = { speed, pitch };
  await store.save();
  await interaction.reply({
    content: `読み上げ設定を更新しました。速度: ${speed.toFixed(2)}倍、高さ: ${pitch.toFixed(2)}倍`,
    flags: MessageFlags.Ephemeral,
  });
}

function stopTtsSession(guildId) {
  const session = ttsSessions.get(guildId);
  if (!session) return false;
  ttsSessions.delete(guildId);
  session.queue.length = 0;
  session.player.stop(true);
  session.transcoder?.kill();
  session.connection.destroy();
  return true;
}

function buildAtempoFilters(value) {
  const filters = [];
  let remaining = value;
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  while (remaining > 2) {
    filters.push('atempo=2.0');
    remaining /= 2;
  }
  if (Math.abs(remaining - 1) > 0.0001 || !filters.length) {
    filters.push(`atempo=${remaining.toFixed(4)}`);
  }
  return filters;
}

async function playNextTts(guildId) {
  const session = ttsSessions.get(guildId);
  if (!session || session.playing || !session.queue.length) return;
  session.playing = true;
  const item = session.queue.shift();
  try {
    const settings = getTtsSettings(item.userId);
    const { speed, pitch } = settings;
    const url = googleTTS.getAudioUrl(item.text, { lang: 'ja', slow: false, host: 'https://translate.google.com' });
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`音声取得 HTTP ${response.status}`);
    const tempoFilters = buildAtempoFilters(speed / pitch);
    const audioFilters = [
      'aresample=48000',
      `asetrate=${Math.round(48000 * pitch)}`,
      'aresample=48000',
      ...tempoFilters,
    ].join(',');
    const transcoder = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-filter:a', audioFilters,
      '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    session.transcoder = transcoder;
    transcoder.on('error', (error) => console.error('ffmpegを起動できませんでした:', error.message));
    transcoder.stderr.on('data', (chunk) => console.error('ffmpeg:', chunk.toString().trim()));
    transcoder.stdin.on('error', () => {});
    Readable.fromWeb(response.body).pipe(transcoder.stdin);
    const resource = createAudioResource(transcoder.stdout, { inputType: StreamType.Raw });
    session.player.play(resource);
  } catch (error) {
    session.playing = false;
    console.error('読み上げ音声を生成できませんでした:', error.message);
    setImmediate(() => playNextTts(guildId));
  }
}

async function handleTts(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({ content: '先に読み上げ先のVCへ参加してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  const existing = ttsSessions.get(interaction.guildId);
  if (existing) {
    await interaction.reply({
      content: `すでに <#${existing.textChannelId}> の読み上げ中です。終了する場合は \`/読み上げ終了\` を使用してください。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false,
  });
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (error) {
    connection.destroy();
    throw error;
  }
  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  const session = {
    ownerId: interaction.user.id,
    textChannelId: interaction.channelId,
    voiceChannelId: voiceChannel.id,
    connection,
    player,
    queue: [],
    playing: false,
    transcoder: null,
  };
  player.on(AudioPlayerStatus.Idle, () => {
    session.playing = false;
    session.transcoder = null;
    playNextTts(interaction.guildId);
  });
  player.on('error', (error) => {
    session.playing = false;
    console.error('読み上げプレイヤーエラー:', error.message);
    playNextTts(interaction.guildId);
  });
  connection.subscribe(player);
  ttsSessions.set(interaction.guildId, session);
  await interaction.reply({
    content: `<#${voiceChannel.id}> でこのチャットの読み上げを開始しました。終了する場合は \`/読み上げ終了\` を使用してください。`,
  });
}

async function handleTtsStop(interaction) {
  const session = ttsSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在、読み上げは行われていません。', flags: MessageFlags.Ephemeral });
    return;
  }
  const canStop = session.ownerId === interaction.user.id
    || interaction.member.permissions.has(PermissionFlagsBits.MoveMembers);
  if (!canStop) {
    await interaction.reply({ content: '読み上げを開始した本人か管理者だけが終了できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  stopTtsSession(interaction.guildId);
  await interaction.reply({ content: '読み上げを終了しました。' });
}

async function getRecruitmentVoiceChannel(guild) {
  const channel = await guild.channels.fetch(RECRUITMENT_VOICE_CHANNEL_ID);
  if (!channel?.isVoiceBased() || !channel.permissionOverwrites) {
    throw new Error(`VC ${RECRUITMENT_VOICE_CHANNEL_ID} が見つからないか、ボイスチャンネルではありません。`);
  }
  return channel;
}

function serializePermissionOverwrites(channel) {
  return channel.permissionOverwrites.cache.map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString(),
  }));
}

async function ensureVoiceSession(guild, record) {
  let voiceAccess = store.data.voiceAccess;
  if (!voiceAccess || voiceAccess.guildId !== guild.id) {
    const channel = await getRecruitmentVoiceChannel(guild);
    voiceAccess = {
      guildId: guild.id,
      channelId: channel.id,
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      originalOverwrites: serializePermissionOverwrites(channel),
      hiddenUserIds: [],
    };
    store.data.voiceAccess = voiceAccess;
  }
  record.voiceSessionId = voiceAccess.sessionId;
  await store.save();
  await syncVoiceAccess(guild);
}

function buildVoicePermissionOverwrites(originalOverwrites, everyoneId, allowedUserIds, hiddenUserIds = []) {
  const allowedUsers = new Set(allowedUserIds);
  const hiddenUsers = new Set(hiddenUserIds);
  const connect = PermissionFlagsBits.Connect;
  const viewChannel = PermissionFlagsBits.ViewChannel;
  const voiceAccessPermissions = connect | viewChannel;
  const overwrites = originalOverwrites.map((overwrite) => {
    let allow = BigInt(overwrite.allow) & ~voiceAccessPermissions;
    let deny = BigInt(overwrite.deny);
    if (overwrite.type === 1 && hiddenUsers.has(overwrite.id)) {
      deny |= voiceAccessPermissions;
    } else if (overwrite.type === 0 || !allowedUsers.has(overwrite.id)) {
      deny |= voiceAccessPermissions;
    } else {
      allow |= voiceAccessPermissions;
      deny &= ~voiceAccessPermissions;
    }
    return { id: overwrite.id, type: overwrite.type, allow, deny };
  });
  const existingIds = new Set(overwrites.map((overwrite) => overwrite.id));
  if (!existingIds.has(everyoneId)) {
    overwrites.push({ id: everyoneId, type: 0, allow: 0n, deny: voiceAccessPermissions });
  }
  for (const userId of allowedUsers) {
    if (existingIds.has(userId)) continue;
    overwrites.push({ id: userId, type: 1, allow: voiceAccessPermissions, deny: 0n });
  }
  for (const userId of hiddenUsers) {
    if (existingIds.has(userId) || allowedUsers.has(userId)) continue;
    overwrites.push({ id: userId, type: 1, allow: 0n, deny: voiceAccessPermissions });
  }
  return overwrites;
}

async function syncVoiceAccess(guild) {
  const voiceAccess = store.data.voiceAccess;
  if (!voiceAccess || voiceAccess.guildId !== guild.id) return;
  voiceAccess.hiddenUserIds ||= [];
  const channel = await getRecruitmentVoiceChannel(guild);
  const allowedUserIds = new Set();
  for (const record of Object.values(store.data.recruitments)) {
    if (record.voiceSessionId !== voiceAccess.sessionId || record.voiceAccessRevoked) continue;
    for (const [userId, response] of Object.entries(record.responses || {})) {
      if (response === 'join') allowedUserIds.add(userId);
    }
  }
  if (client.user) allowedUserIds.add(client.user.id);

  const overwrites = buildVoicePermissionOverwrites(
    voiceAccess.originalOverwrites,
    guild.roles.everyone.id,
    allowedUserIds,
    voiceAccess.hiddenUserIds,
  );
  await channel.permissionOverwrites.set(overwrites, '募集参加者だけが接続できるように更新');
}

function updateHiddenVoiceUser(record, userId, previousResponse) {
  const voiceAccess = store.data.voiceAccess;
  if (!voiceAccess || record.voiceSessionId !== voiceAccess.sessionId) return false;
  const hiddenUsers = new Set(voiceAccess.hiddenUserIds || []);
  const joinedElsewhere = Object.values(store.data.recruitments).some((candidate) =>
    candidate.voiceSessionId === voiceAccess.sessionId
      && !candidate.voiceAccessRevoked
      && candidate.responses?.[userId] === 'join');
  if (joinedElsewhere) hiddenUsers.delete(userId);
  else if (previousResponse === 'join') hiddenUsers.add(userId);
  voiceAccess.hiddenUserIds = [...hiddenUsers];
  return hiddenUsers.has(userId);
}

async function disconnectHiddenVoiceUser(guild, userId) {
  const channel = await getRecruitmentVoiceChannel(guild);
  const member = channel.members.get(userId);
  if (member) await member.voice.disconnect('募集への参加を取り消したため');
}

async function resetVoiceAccess(guild) {
  const voiceAccess = store.data.voiceAccess;
  if (!voiceAccess || voiceAccess.guildId !== guild.id) return false;
  const channel = await getRecruitmentVoiceChannel(guild);
  const overwrites = voiceAccess.originalOverwrites.map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: BigInt(overwrite.allow),
    deny: BigInt(overwrite.deny),
  }));
  await channel.permissionOverwrites.set(overwrites, '募集VCの権限を元の状態へ復元');
  store.data.voiceAccess = null;
  await store.save();
  return true;
}

async function resetVoiceAccessIfEmpty(guild) {
  const voiceAccess = store.data.voiceAccess;
  if (!voiceAccess) return false;
  const hasOpenRecruitment = Object.values(store.data.recruitments).some((record) =>
    record.voiceSessionId === voiceAccess.sessionId && !record.closed && !record.voiceAccessRevoked);
  if (hasOpenRecruitment) return false;
  const channel = await getRecruitmentVoiceChannel(guild);
  const hasHumanMembers = channel.members.some((member) => member.id !== client.user?.id);
  if (hasHumanMembers) return false;
  return resetVoiceAccess(guild);
}

function hasOpenLimitedVoiceRecruitments(guildId) {
  return Object.values(store.data.recruitments).some((record) =>
    record.guildId === guildId
      && record.limitedVoiceEnabled
      && !record.voiceAccessRevoked
      && (!record.closed || record.closedReason === 'full'));
}

function leaveBotVoiceIfNoRecruitments(guildId) {
  if (ttsSessions.has(guildId)) return false;
  if (hasOpenLimitedVoiceRecruitments(guildId)) return false;
  return leaveBotVoice(guildId);
}

function leaveBotVoice(guildId) {
  const connection = getVoiceConnection(guildId);
  if (!connection) return false;
  connection.destroy();
  return true;
}

function revokeVoiceSessionRecords(records, guildId, sessionId = null) {
  let revoked = 0;
  for (const record of records) {
    if (record.guildId !== guildId || !record.limitedVoiceEnabled) continue;
    if (sessionId && record.voiceSessionId !== sessionId) continue;
    record.voiceAccessRevoked = true;
    revoked++;
  }
  return revoked;
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const guildIds = GUILD_ID ? [GUILD_ID] : [...client.guilds.cache.keys()];

  if (guildIds.length) {
    // 以前登録した入力項目付きのグローバルコマンドが残ると、Discordに
    // 同名コマンドが二重表示されるため、サーバー版を登録する前に削除する。
    const globalRoute = `/applications/${CLIENT_ID}/commands`;
    await rest.put(globalRoute, { body: [] });
    const remainingGlobalCommands = await rest.get(globalRoute);
    if (remainingGlobalCommands.length) {
      throw new Error(`旧グローバルコマンドが${remainingGlobalCommands.length}件残っています。`);
    }
    await Promise.all(guildIds.map((guildId) =>
      rest.put(`/applications/${CLIENT_ID}/guilds/${guildId}/commands`, { body: commands })));
    console.log(`旧グローバルコマンドを削除し、${guildIds.length}個のサーバーへコマンドを登録しました。`);
    return;
  }

  await rest.put(`/applications/${CLIENT_ID}/commands`, { body: commands });
  console.log('グローバルコマンドを登録しました。');
}

async function getNotificationRole(guild, gameKey) {
  await guild.roles.fetch();
  const game = GAMES[gameKey];
  const role = guild.roles.cache.get(game.roleId);
  if (!role) throw new Error(`${game.label} のロール (${game.roleId}) がこのサーバーにありません。`);
  return role;
}

function recruitmentPanel() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('recruit-game')
    .setPlaceholder('募集するゲーム・イベントを選択')
    .addOptions(...Object.entries(GAMES).map(([value, game]) => ({
      label: game.label,
      value,
      emoji: game.emoji,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function buildHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📖 ばーせbotの使い方')
    .setDescription('ゲーム・飲み会の募集作成、参加回答、限定VC、読み上げなどをまとめて利用できます。')
    .addFields(
      {
        name: '1. 募集を作る',
        value: '`/募集` を実行し、ゲームを選択して募集内容・人数・日時などを入力します。人数を空欄にすると無制限になります。募集者は最初から参加者に入ります！',
      },
      {
        name: '2. 回答',
        value: '募集メッセージ下の「参加」「未定」「不参加」を押します。同じボタンをもう一度押すと回答を取り消せます。',
      },
      {
        name: '3. 募集の機能',
        value: '募集者だけに見えるパネルにいろいろな機能がついてます！募集限定VCとか、募集が集まったときにDMでお知らせとか。送った募集の編集・募集終了もできちゃいます！',
      },
      {
        name: '4. チャット読み上げ',
        value: 'VCに入った状態で `/読み上げ` を実行すると、そのチャットの本文をVCで読み上げます。`/読み上げ設定` で速さ・高さを調整でき、`/読み上げ終了` で終了できます。',
      },
      {
        name: '5. フリーチャットと聞き専',
        value: 'フリーチャットVCで通話が始まると、対応する聞き専チャットがサーバーのみんなに表示されます。VCが無人になると元に戻ります。',
      },
      {
        name: '6. 困ったときは',
        value: 'サポートセンターへ内容を投稿してください。返信先が分かるように、できるだけ詳しく書いてもらえると助かります！',
      },
    )
    .setFooter({ text: 'このページは実行した本人だけに表示されます。' });
}

function recruitmentModal(gameKey) {
  const game = GAMES[gameKey];
  const modal = new ModalBuilder()
    .setCustomId(`recruit-form:${gameKey}`)
    .setTitle(`${game.label} の募集`);

  if (gameKey === 'other' || gameKey === 'everyone') {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('custom-game')
        .setLabel('ゲーム名')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true),
    ));
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('details')
        .setLabel('募集内容')
        .setPlaceholder('例: コンペ、ランク不問、初心者歓迎')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(300)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('capacity')
        .setLabel('募集人数（空欄で無制限）')
        .setPlaceholder('例: 5（入力しなければ無制限）')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(2)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('when')
        .setLabel('日時（任意）')
        .setPlaceholder('例: 今日22時、6/25 20:00')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(false),
    ),
  );
  if (gameKey === 'valorant') {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('party-code')
        .setLabel('パーティーコード（任意・半角6文字）')
        .setPlaceholder('例: A1B2C3')
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(6)
        .setRequired(false),
    ));
  }
  return modal;
}

function editRecruitmentModal(recruitmentId, record) {
  const modal = new ModalBuilder()
    .setCustomId(`recruit-edit-form:${recruitmentId}`)
    .setTitle(`${recruitmentName(record).slice(0, 32)} の募集を編集`);

  if (record.game === 'other' || record.game === 'everyone') {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('custom-game')
        .setLabel('ゲーム名')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setValue(record.customGame)
        .setRequired(true),
    ));
  }

  const details = new TextInputBuilder()
    .setCustomId('details')
    .setLabel('募集内容')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(300)
    .setValue(record.details)
    .setRequired(true);
  const capacity = new TextInputBuilder()
    .setCustomId('capacity')
    .setLabel('募集人数（空欄で無制限）')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setPlaceholder('例: 5（入力しなければ無制限）')
    .setRequired(false);
  if (record.capacity !== null && record.capacity !== undefined) {
    capacity.setValue(String(record.capacity));
  }
  const when = new TextInputBuilder()
    .setCustomId('when')
    .setLabel('日時（任意）')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(false);
  if (record.when) when.setValue(record.when);
  modal.addComponents(
    new ActionRowBuilder().addComponents(details),
    new ActionRowBuilder().addComponents(capacity),
    new ActionRowBuilder().addComponents(when),
  );

  if (record.game === 'valorant') {
    const partyCode = new TextInputBuilder()
      .setCustomId('party-code')
      .setLabel('パーティーコード（任意・半角6文字）')
      .setStyle(TextInputStyle.Short)
      .setMinLength(6)
      .setMaxLength(6)
      .setRequired(false);
    if (record.partyCode) partyCode.setValue(record.partyCode);
    modal.addComponents(new ActionRowBuilder().addComponents(partyCode));
  }
  return modal;
}

function responseButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    ...Object.entries(STATUS).map(([key, status]) =>
      new ButtonBuilder()
        .setCustomId(`recruit:${key}`)
        .setLabel(status.label)
        .setEmoji(status.emoji)
        .setStyle(status.style)
        .setDisabled(disabled)),
  );
}

function ownerCancelButton(messageId, limitedVoiceEnabled = false, notifyOwnerOnFull = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`recruit-cancel:${messageId}`)
      .setLabel('募集をキャンセル')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`recruit-voice:${messageId}`)
      .setLabel(limitedVoiceEnabled ? '限定VCを使用中' : '限定VCで開催する')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(limitedVoiceEnabled),
    new ButtonBuilder()
      .setCustomId(`recruit-edit:${messageId}`)
      .setLabel('募集を編集')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`recruit-full-dm:${messageId}`)
      .setLabel(`満員時DM: ${notifyOwnerOnFull ? 'ON' : 'OFF'}`)
      .setStyle(notifyOwnerOnFull ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
}

function ownerFullControls(messageId, limitedVoiceEnabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`recruit-voice:${messageId}`)
      .setLabel(limitedVoiceEnabled ? '限定VCを使用中' : '限定VCで開催する')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(limitedVoiceEnabled),
  );
}

async function updateOwnerPanelForFull(recruitmentId, record) {
  const panel = ownerPanels.get(recruitmentId);
  if (!panel) return false;
  try {
    await panel.webhook.editMessage(panel.messageId, {
      content: '定員に達しました。必要なら限定VCを開始できます。',
      components: [ownerFullControls(recruitmentId, record.limitedVoiceEnabled)],
    });
    return true;
  } catch (error) {
    console.error('募集者パネルを満員表示へ更新できませんでした:', error.message);
    ownerPanels.delete(recruitmentId);
    return false;
  }
}

async function notifyRecruitmentOwnerOnFull(record) {
  if (!record.notifyOwnerOnFull || record.fullNotificationSent) return false;
  record.fullNotificationSent = true;
  await store.save();
  try {
    const owner = await client.users.fetch(record.ownerId);
    await owner.send(`「${recruitmentName(record)}」の募集が定員${record.capacity}人に達しました。`);
    return true;
  } catch (error) {
    console.error('募集者へ満員DMを送信できませんでした:', error.message);
    return false;
  }
}

async function deleteOwnerPanel(recruitmentId) {
  const panel = ownerPanels.get(recruitmentId);
  ownerPanels.delete(recruitmentId);
  if (!panel) return false;
  try {
    await panel.webhook.deleteMessage(panel.messageId);
    return true;
  } catch (error) {
    console.error('募集者パネルを削除できませんでした:', error.message);
    return false;
  }
}

function canEnableLimitedVoice(record) {
  return !record.closed || record.closedReason === 'full';
}

function recruitmentName(record) {
  return record.customGame || GAMES[record.game].label;
}

function initialResponses(ownerId) {
  return { [ownerId]: 'join' };
}

function mentionList(ids) {
  if (!ids.length) return 'なし';
  const lines = [];
  let length = 0;
  for (const id of ids) {
    const mention = `<@${id}>`;
    if (length + mention.length + 1 > 950) break;
    lines.push(mention);
    length += mention.length + 1;
  }
  if (lines.length < ids.length) lines.push(`ほか ${ids.length - lines.length}人`);
  return lines.join('\n');
}

function buildRecruitmentEmbed(record) {
  const game = GAMES[record.game];
  const title = record.customGame || game.label;
  const participantIds = Object.entries(record.responses)
    .filter(([, response]) => response === 'join')
    .map(([id]) => id);
  const maybeIds = Object.entries(record.responses)
    .filter(([, response]) => response === 'maybe')
    .map(([id]) => id);
  const declineIds = Object.entries(record.responses)
    .filter(([, response]) => response === 'decline')
    .map(([id]) => id);
  const capacity = record.capacity === null || record.capacity === undefined
    ? ' / 無制限'
    : ` / ${record.capacity}人`;
  const footer = record.closed
    ? (record.closedReason === 'full' ? '定員に達したため自動で締め切りました' : '募集は終了しました')
    : '下のボタンから回答を変更できます';

  const embed = new EmbedBuilder()
    .setColor(record.closed ? 0x747f8d : game.color)
    .setTitle(`${game.emoji} ${title} 募集${record.closed ? '（終了）' : ''}`)
    .setDescription(record.details)
    .addFields(
      { name: '日時', value: record.when || '未定', inline: true },
      { name: '募集者', value: `<@${record.ownerId}>`, inline: true },
      { name: `参加 (${participantIds.length}${capacity})`, value: mentionList(participantIds), inline: false },
      { name: `未定 (${maybeIds.length})`, value: mentionList(maybeIds), inline: true },
      { name: `不参加 (${declineIds.length})`, value: mentionList(declineIds), inline: true },
    )
    .setFooter({ text: footer })
    .setTimestamp(new Date(record.createdAt));
  if (record.game === 'valorant' && record.partyCode) {
    embed.addFields({ name: 'パーティーコード', value: `\`${record.partyCode}\``, inline: true });
  }
  return embed;
}

function findRecruitment(messageId) {
  for (const [recruitmentId, record] of Object.entries(store.data.recruitments)) {
    if (!record.messageRefs && record.channelId) {
      record.messageRefs = [{ messageId: recruitmentId, channelId: record.channelId }];
    }
    const references = record.messageRefs || [];
    if (references.some((reference) => reference.messageId === messageId)) return { recruitmentId, record };
  }
  return null;
}

function applyResponse(record, userId, response) {
  if (record.closed) return { accepted: false, reason: 'closed', full: false };
  const current = record.responses[userId];
  if (current === response) {
    delete record.responses[userId];
    return { accepted: true, reason: null, full: false };
  }

  if (response === 'join') {
    const participantCount = Object.entries(record.responses)
      .filter(([id, value]) => id !== userId && value === 'join').length;
    if (record.capacity !== null && record.capacity !== undefined
      && participantCount >= record.capacity) {
      return { accepted: false, reason: 'full', full: true };
    }
  }

  record.responses[userId] = response;
  const participantCount = Object.values(record.responses).filter((value) => value === 'join').length;
  const full = record.capacity !== null && record.capacity !== undefined
    && participantCount >= record.capacity;
  if (full) {
    record.closed = true;
    record.closedReason = 'full';
  }
  return { accepted: true, reason: null, full };
}

async function editRecruitmentMessages(record) {
  const references = record.messageRefs || [];
  const payload = {
    embeds: [buildRecruitmentEmbed(record)],
    components: [responseButtons(record.closed)],
    allowedMentions: { parse: [] },
  };
  const results = await Promise.allSettled(references.map(async (reference) => {
    const channel = await client.channels.fetch(reference.channelId);
    if (!channel?.isTextBased()) throw new Error(`チャンネル ${reference.channelId} は投稿先ではありません。`);
    const message = await channel.messages.fetch(reference.messageId);
    await message.edit(payload);
  }));
  for (const result of results) {
    if (result.status === 'rejected') console.error('募集メッセージの同期に失敗:', result.reason?.message || result.reason);
  }
  return results.some((result) => result.status === 'fulfilled');
}

async function deleteRecruitmentMessages(record) {
  const references = record.messageRefs || [];
  const results = await Promise.allSettled(references.map(async (reference) => {
    const channel = await client.channels.fetch(reference.channelId);
    if (!channel?.isTextBased()) throw new Error(`チャンネル ${reference.channelId} は投稿先ではありません。`);
    const message = await channel.messages.fetch(reference.messageId);
    await message.delete();
  }));
  for (const result of results) {
    if (result.status === 'rejected') console.error('募集メッセージの削除に失敗:', result.reason?.message || result.reason);
  }
  return results.some((result) => result.status === 'fulfilled');
}

async function sendClosingMessage(guild, content, channelId = ANNOUNCEMENT_CHANNEL_ID) {
  const announcementChannel = await guild.channels.fetch(channelId);
  if (!announcementChannel?.isTextBased()) throw new Error('指定先がテキストチャンネルではありません。');
  return announcementChannel.send({ content, allowedMentions: { parse: [] } });
}

async function handleRecruitment(interaction) {
  await interaction.reply({
    content: '募集するゲーム・イベントを選択してください。選択後に入力画面が開きます。',
    components: [recruitmentPanel()],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleHelp(interaction) {
  await interaction.reply({
    embeds: [buildHelpEmbed()],
    flags: MessageFlags.Ephemeral,
  });
}

function announcementModal() {
  return new ModalBuilder()
    .setCustomId('admin-announcement-form')
    .setTitle('お知らせを作成')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('タイトル')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('body')
          .setLabel('本文')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('color')
          .setLabel('色（任意・例: #5865F2）')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(7)
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('footer')
          .setLabel('フッター（任意）')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(2048)
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('image')
          .setLabel('画像URL（任意）')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(1000)
          .setRequired(false),
      ),
    );
}

function canUseAdminAnnouncement(interaction) {
  const roles = interaction.member?.roles;
  const hasAdminRole = roles?.cache?.has?.(ADMIN_ROLE_ID)
    || (Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID));
  return interaction.channelId === ADMIN_COMMAND_CHANNEL_ID
    && hasAdminRole;
}

async function handleAdminAnnouncement(interaction) {
  if (!canUseAdminAnnouncement(interaction)) {
    await interaction.reply({
      content: `このコマンドは管理者ロールを持つ人が <#${ADMIN_COMMAND_CHANNEL_ID}> でのみ使用できます。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await interaction.showModal(announcementModal());
}

async function handleAdminAnnouncementForm(interaction) {
  if (!canUseAdminAnnouncement(interaction)) {
    await interaction.reply({ content: 'お知らせを送信する権限がありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  const colorText = interaction.fields.getTextInputValue('color').trim();
  if (colorText && !/^#?[0-9a-fA-F]{6}$/.test(colorText)) {
    await interaction.reply({ content: '色は #5865F2 のような6桁の16進数で入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  const imageUrl = interaction.fields.getTextInputValue('image').trim();
  if (imageUrl) {
    try {
      const url = new URL(imageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
    } catch {
      await interaction.reply({ content: '画像URLは http または https のURLを入力してください。', flags: MessageFlags.Ephemeral });
      return;
    }
  }
  const embed = new EmbedBuilder()
    .setColor(colorText ? Number.parseInt(colorText.replace('#', ''), 16) : 0x5865f2)
    .setTitle(interaction.fields.getTextInputValue('title').trim())
    .setDescription(interaction.fields.getTextInputValue('body').trim())
    .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();
  const footer = interaction.fields.getTextInputValue('footer').trim();
  if (footer) embed.setFooter({ text: footer });
  if (imageUrl) embed.setImage(imageUrl);
  const channel = await interaction.guild.channels.fetch(ADMIN_ANNOUNCEMENT_CHANNEL_ID);
  if (!channel?.isTextBased()) throw new Error('お知らせチャンネルが見つかりません。');
  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  await interaction.reply({ content: `お知らせを <#${ADMIN_ANNOUNCEMENT_CHANNEL_ID}> に送信しました。`, flags: MessageFlags.Ephemeral });
}

async function handleEditRecruitmentButton(interaction) {
  const recruitmentId = interaction.customId.split(':')[1];
  const record = store.data.recruitments[recruitmentId];
  if (!record || record.guildId !== interaction.guildId) {
    await interaction.reply({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (record.ownerId !== interaction.user.id) {
    await interaction.reply({ content: '募集者本人だけが編集できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (record.closed) {
    await interaction.reply({ content: '終了した募集は編集できません。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(editRecruitmentModal(recruitmentId, record));
}

async function handleEditRecruitmentForm(interaction) {
  const recruitmentId = interaction.customId.split(':')[1];
  await withMessageLock(recruitmentId, async () => {
    const record = store.data.recruitments[recruitmentId];
    if (!record || record.guildId !== interaction.guildId || record.ownerId !== interaction.user.id) {
      await interaction.reply({ content: '編集できる募集が見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.closed) {
      await interaction.reply({ content: '終了した募集は編集できません。', flags: MessageFlags.Ephemeral });
      return;
    }

    const capacityText = interaction.fields.getTextInputValue('capacity').trim();
    const capacity = capacityText ? Number(capacityText) : null;
    const participantCount = Object.values(record.responses).filter((value) => value === 'join').length;
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 25)) {
      await interaction.reply({ content: '募集人数は1～25の半角数字、または無制限にする場合は空欄にしてください。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (capacity !== null && capacity < participantCount) {
      await interaction.reply({
        content: `現在${participantCount}人が参加中のため、募集人数を${participantCount}人未満にはできません。`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const partyCode = record.game === 'valorant'
      ? interaction.fields.getTextInputValue('party-code').trim().toUpperCase()
      : null;
    if (partyCode && !/^[A-Z0-9]{6}$/.test(partyCode)) {
      await interaction.reply({ content: 'パーティーコードは半角英数字6文字で入力してください。', flags: MessageFlags.Ephemeral });
      return;
    }

    record.details = interaction.fields.getTextInputValue('details').trim();
    record.when = interaction.fields.getTextInputValue('when').trim();
    record.capacity = capacity;
    record.partyCode = partyCode;
    if (record.game === 'other' || record.game === 'everyone') {
      record.customGame = interaction.fields.getTextInputValue('custom-game').trim();
    }

    if (capacity !== null && participantCount >= capacity) {
      record.closed = true;
      record.closedReason = 'full';
      await store.save();
      await notifyRecruitmentOwnerOnFull(record);
      await deleteRecruitmentMessages(record);
      await sendClosingMessage(
        interaction.guild,
        `定員に達したため、${recruitmentName(record)}の募集を締め切りました`,
        record.messageRefs?.[0]?.channelId,
      );
      await updateOwnerPanelForFull(recruitmentId, record);
      await interaction.reply({ content: '募集を更新し、定員に達したため締め切りました。', flags: MessageFlags.Ephemeral });
      return;
    }

    await store.save();
    await editRecruitmentMessages(record);
    await interaction.reply({ content: '募集内容を更新しました。', flags: MessageFlags.Ephemeral });
  });
}

async function handleGameSelection(interaction) {
  const gameKey = interaction.values[0];
  if (!GAMES[gameKey]) return;
  await interaction.showModal(recruitmentModal(gameKey));
}

async function handleRecruitmentForm(interaction) {
  const gameKey = interaction.customId.split(':')[1];
  const capacityText = interaction.fields.getTextInputValue('capacity').trim();
  const capacity = capacityText ? Number(capacityText) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 25)) {
    await interaction.reply({ content: '募集人数は1～25の半角数字、または無制限にする場合は空欄にしてください。', flags: MessageFlags.Ephemeral });
    return;
  }
  const partyCode = gameKey === 'valorant'
    ? interaction.fields.getTextInputValue('party-code').trim().toUpperCase()
    : null;
  if (partyCode && !/^[A-Z0-9]{6}$/.test(partyCode)) {
    await interaction.reply({ content: 'パーティーコードは半角英数字6文字で入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }

  // モーダル送信を、元の本人限定パネルに対する更新として受け付ける。
  // 募集投稿が成功したら deleteReply() でそのパネル自体を削除する。
  await interaction.deferUpdate();
  let role;
  try {
    role = await getNotificationRole(interaction.guild, gameKey);
  } catch (error) {
    console.error('通知ロールの準備に失敗:', error);
    await interaction.followUp({
      content: `通知ロールを確認できません。ロールIDとBotの権限を確認してください。\n${error.message}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const record = {
    ownerId: interaction.user.id,
    game: gameKey,
    customGame: (gameKey === 'other' || gameKey === 'everyone')
      ? interaction.fields.getTextInputValue('custom-game').trim()
      : null,
    details: interaction.fields.getTextInputValue('details').trim(),
    when: interaction.fields.getTextInputValue('when').trim(),
    partyCode,
    capacity,
    responses: initialResponses(interaction.user.id),
    messageRefs: [],
    closed: capacity === 1,
    closedReason: capacity === 1 ? 'full' : null,
    limitedVoiceEnabled: false,
    voiceAccessRevoked: false,
    notifyOwnerOnFull: false,
    fullNotificationSent: false,
    createdAt: new Date().toISOString(),
  };

  let announcementMessage;
  try {
    let announcementChannel = await interaction.guild.channels.fetch(ANNOUNCEMENT_CHANNEL_ID).catch(() => null);
    if (!announcementChannel?.isTextBased()) announcementChannel = interaction.channel;
    if (!announcementChannel?.isTextBased()) throw new Error('指定先がテキストチャンネルではありません。');
    announcementMessage = await announcementChannel.send({
      content: `<@&${role.id}>`,
      embeds: [buildRecruitmentEmbed(record)],
      components: [responseButtons(record.closed)],
      allowedMentions: { roles: [role.id], users: [] },
    });
  } catch (error) {
    console.error('募集チャンネルへの投稿に失敗:', error.message);
    await interaction.followUp({
      content: `募集チャンネル <#${ANNOUNCEMENT_CHANNEL_ID}> へ投稿できませんでした。Botの権限を確認してください。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  record.guildId = interaction.guildId;
  record.messageRefs.push({ messageId: announcementMessage.id, channelId: announcementMessage.channelId });
  store.data.recruitments[announcementMessage.id] = record;
  await store.save();
  if (record.closedReason === 'full') {
    await notifyRecruitmentOwnerOnFull(record);
    await deleteRecruitmentMessages(record);
    await sendClosingMessage(
      interaction.guild,
      `定員に達したため、${recruitmentName(record)}の募集を締め切りました`,
      record.messageRefs?.[0]?.channelId,
    );
  }
  await interaction.deleteReply().catch(async (error) => {
    console.error('本人限定の募集パネルを削除できませんでした:', error.message);
    await interaction.editReply({ content: '募集を投稿しました。', components: [] }).catch(() => {});
  });
  const ownerPanel = await interaction.followUp({
    content: record.closedReason === 'full'
      ? '定員に達しました。必要なら限定VCを開始できます。'
      : '募集のキャンセル・編集、または参加者限定VCの利用を選べます。限定VCを使わない場合は何も押さなくて構いません。',
    components: [record.closedReason === 'full'
      ? ownerFullControls(announcementMessage.id)
      : ownerCancelButton(announcementMessage.id, false, record.notifyOwnerOnFull)],
    flags: MessageFlags.Ephemeral,
  });
  ownerPanels.set(announcementMessage.id, {
    messageId: ownerPanel.id,
    webhook: interaction.webhook,
  });
}

async function handleEnableLimitedVoice(interaction) {
  const recruitmentId = interaction.customId.split(':')[1];
  await interaction.deferUpdate();
  await withMessageLock(recruitmentId, async () => {
    const record = store.data.recruitments[recruitmentId];
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.ownerId !== interaction.user.id) {
      await interaction.followUp({ content: '募集者本人だけが限定VCを開始できます。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!canEnableLimitedVoice(record)) {
      await interaction.followUp({ content: 'この募集はすでに終了しています。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.limitedVoiceEnabled) {
      await interaction.editReply({
        content: `限定VC <#${RECRUITMENT_VOICE_CHANNEL_ID}> を使用中です。`,
        components: [record.closed
          ? ownerFullControls(recruitmentId, true)
          : ownerCancelButton(recruitmentId, true, record.notifyOwnerOnFull)],
      });
      return;
    }

    record.limitedVoiceEnabled = true;
    record.voiceAccessRevoked = false;
    try {
      await ensureVoiceSession(interaction.guild, record);
      await store.save();
      await interaction.editReply({
        content: `限定VC <#${RECRUITMENT_VOICE_CHANNEL_ID}> を開始しました。参加を押した人だけに表示されます。`,
        components: [record.closed
          ? ownerFullControls(recruitmentId, true)
          : ownerCancelButton(recruitmentId, true, record.notifyOwnerOnFull)],
      });
    } catch (error) {
      console.error('限定VCを開始できませんでした:', error.message);
      record.limitedVoiceEnabled = false;
      record.voiceAccessRevoked = true;
      await store.save();
      await syncVoiceAccess(interaction.guild).catch(() => {});
      await resetVoiceAccessIfEmpty(interaction.guild).catch(() => {});
      leaveBotVoiceIfNoRecruitments(interaction.guildId);
      await interaction.followUp({
        content: `限定VCを開始できませんでした。Botの「チャンネルの管理」「接続」権限を確認してください。`,
        flags: MessageFlags.Ephemeral,
      });
    }
  });
}

async function handleFullDmToggle(interaction) {
  const recruitmentId = interaction.customId.split(':')[1];
  await withMessageLock(recruitmentId, async () => {
    const record = store.data.recruitments[recruitmentId];
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.reply({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.ownerId !== interaction.user.id) {
      await interaction.reply({ content: '募集者本人だけが満員通知を変更できます。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.closed) {
      await interaction.reply({ content: '終了した募集の満員通知は変更できません。', flags: MessageFlags.Ephemeral });
      return;
    }
    record.notifyOwnerOnFull = !record.notifyOwnerOnFull;
    await store.save();
    await interaction.update({
      content: `満員時の募集者DMを${record.notifyOwnerOnFull ? '有効' : '無効'}にしました。`,
      components: [ownerCancelButton(recruitmentId, record.limitedVoiceEnabled, record.notifyOwnerOnFull)],
    });
  });
}

async function handleCancelRecruitment(interaction) {
  const recruitmentId = interaction.customId.split(':')[1];
  await interaction.deferUpdate();
  await withMessageLock(recruitmentId, async () => {
    const record = store.data.recruitments[recruitmentId];
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.ownerId !== interaction.user.id) {
      await interaction.followUp({ content: '募集者本人だけがキャンセルできます。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.closed) {
      await interaction.followUp({ content: 'この募集はすでに終了しています。', flags: MessageFlags.Ephemeral });
      return;
    }

    record.closed = true;
    record.closedReason = 'cancelled';
    record.voiceAccessRevoked = true;
    await store.save();

    try {
      await syncVoiceAccess(interaction.guild);
      await deleteRecruitmentMessages(record);
      await sendClosingMessage(
        interaction.guild,
        `先ほどの${recruitmentName(record)}の募集は終了しました！`,
        record.messageRefs?.[0]?.channelId,
      );
      await resetVoiceAccessIfEmpty(interaction.guild);
      leaveBotVoiceIfNoRecruitments(interaction.guildId);
    } catch (error) {
      console.error('募集終了メッセージの投稿に失敗:', error.message);
      await interaction.followUp({
        content: '募集は終了しましたが、募集チャンネルへ終了メッセージを投稿できませんでした。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deleteReply().catch(() => {});
    ownerPanels.delete(recruitmentId);
  });
}

async function handleResponseButton(interaction) {
  const response = interaction.customId.split(':')[1];
  await interaction.deferUpdate();
  const located = findRecruitment(interaction.message.id);
  if (!located) {
    await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
    return;
  }
  await withMessageLock(located.recruitmentId, async () => {
    const latest = findRecruitment(interaction.message.id);
    if (!latest) {
      await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    const { record } = latest;
    if (record.closed) {
      await interaction.followUp({ content: 'この募集は終了しています。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.user.id === record.ownerId) {
      await interaction.followUp({ content: '募集者は最初から参加確定として登録されています。', flags: MessageFlags.Ephemeral });
      return;
    }

    const previousResponse = record.responses[interaction.user.id];
    const result = applyResponse(record, interaction.user.id, response);
    if (!result.accepted) {
      await interaction.followUp({
        content: result.reason === 'full' ? '定員に達しているため参加できません。' : 'この募集は終了しています。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const shouldHideVoiceChannel = updateHiddenVoiceUser(
      record,
      interaction.user.id,
      previousResponse,
    );
    await store.save();
    try {
      await syncVoiceAccess(interaction.guild);
      if (shouldHideVoiceChannel) {
        await disconnectHiddenVoiceUser(interaction.guild, interaction.user.id);
      }
    } catch (error) {
      console.error('募集VCの参加権限を更新できませんでした:', error.message);
      await interaction.followUp({
        content: '回答は保存しましたが、募集VCの参加権限を更新できませんでした。',
        flags: MessageFlags.Ephemeral,
      });
    }
    if (result.full) {
      await notifyRecruitmentOwnerOnFull(record);
      await deleteRecruitmentMessages(record);
      await sendClosingMessage(
        interaction.guild,
        `定員に達したため、${recruitmentName(record)}の募集を締め切りました`,
        record.messageRefs?.[0]?.channelId,
      );
      leaveBotVoiceIfNoRecruitments(interaction.guildId);
      await updateOwnerPanelForFull(located.recruitmentId, record);
      await interaction.followUp({ content: '定員に達したため、自動で募集を締め切りました。', flags: MessageFlags.Ephemeral });
    } else {
      await editRecruitmentMessages(record);
    }
  });
}

async function handleClose(interaction) {
  const messageId = interaction.options.getString('メッセージid', true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const located = findRecruitment(messageId);
  if (!located) {
    await interaction.editReply('指定された募集が見つかりません。');
    return;
  }
  await withMessageLock(located.recruitmentId, async () => {
    const latest = findRecruitment(messageId);
    const record = latest?.record;
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.editReply('指定された募集が見つかりません。');
      return;
    }
    const canManage = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
    if (record.ownerId !== interaction.user.id && !canManage) {
      await interaction.editReply('募集者本人、または「メッセージの管理」権限を持つ人だけが終了できます。');
      return;
    }
    record.closed = true;
    record.closedReason = 'manual';
    record.voiceAccessRevoked = true;
    await store.save();
    const deleted = await deleteRecruitmentMessages(record);
    try {
      await syncVoiceAccess(interaction.guild);
      await sendClosingMessage(
        interaction.guild,
        `先ほどの${recruitmentName(record)}の募集は終了しました！`,
        record.messageRefs?.[0]?.channelId,
      );
      await resetVoiceAccessIfEmpty(interaction.guild);
      leaveBotVoiceIfNoRecruitments(interaction.guildId);
    } catch (error) {
      console.error('募集終了メッセージの投稿に失敗:', error.message);
    }
    await deleteOwnerPanel(located.recruitmentId);
    await interaction.editReply(deleted ? '募集を終了しました。' : '保存上は終了しましたが、募集メッセージを削除できませんでした。');
  });
}

async function sendSupportNotification(guild, { author, title, content, url, attachments = [] }) {
  const adminChannel = await guild.channels.fetch(ADMIN_COMMAND_CHANNEL_ID);
  if (!adminChannel?.isTextBased()) throw new Error('管理者限定チャットが見つかりません。');
  const attachmentText = attachments.length
    ? `\n\n**添付ファイル**\n${attachments.map((attachmentUrl) => attachmentUrl).join('\n')}`
    : '';
  const description = `${content?.trim() || '（本文なし）'}${attachmentText}`.slice(0, 4096);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle((title || 'サポートセンターへの新規投稿').slice(0, 256))
    .setDescription(description)
    .setTimestamp();
  if (author) {
    embed.setAuthor({ name: author.displayName || author.username, iconURL: author.displayAvatarURL() });
    embed.addFields({ name: '投稿者', value: `<@${author.id}>`, inline: true });
  }
  const components = url
    ? [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('投稿を開いて返信する').setStyle(ButtonStyle.Link).setURL(url),
    )]
    : [];
  await adminChannel.send({
    content: `<@${SUPPORT_NOTIFY_USER_ID}> サポートセンターに新しい投稿があります。内容を確認して返信をお願いします。`,
    embeds: [embed],
    components,
    allowedMentions: { users: [SUPPORT_NOTIFY_USER_ID], roles: [] },
  });
}

async function fetchThreadStarterMessage(thread) {
  let starter = await thread.fetchStarterMessage().catch(() => null);
  if (starter) return starter;
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  starter = await thread.fetchStarterMessage().catch(() => null);
  return starter;
}

async function ensureMemberRole(member) {
  if (member.user.bot || member.pending || member.roles.cache.has(MEMBER_ROLE_ID)) return false;
  const memberRole = member.guild.roles.cache.get(MEMBER_ROLE_ID)
    || await member.guild.roles.fetch(MEMBER_ROLE_ID).catch(() => null);
  if (!memberRole) return false;
  const botMember = member.guild.members.me || await member.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('Botに「ロールの管理」権限がありません。');
  }
  if (memberRole.position >= botMember.roles.highest.position) {
    throw new Error('Botのロールをメンバーロールより上へ移動してください。');
  }
  await member.roles.add(memberRole, 'サーバーメンバーへメンバーロールを自動付与');
  return true;
}

async function syncMemberRoles(guild) {
  const memberRole = guild.roles.cache.get(MEMBER_ROLE_ID)
    || await guild.roles.fetch(MEMBER_ROLE_ID).catch(() => null);
  if (!memberRole) return 0;
  const members = await guild.members.fetch();
  let added = 0;
  for (const member of members.values()) {
    try {
      if (await ensureMemberRole(member)) added++;
    } catch (error) {
      console.error(`メンバーロールを ${member.user.tag} へ付与できませんでした:`, error.message);
    }
  }
  if (added) console.log(`${added}人へメンバーロールを補完しました。`);
  return added;
}

client.once('clientReady', async () => {
  console.log(`${client.user.tag} としてログインしました。`);
  try {
    await registerCommands();
  } catch (error) {
    console.error('コマンド登録に失敗しました:', error);
  }
  for (const guild of client.guilds.cache.values()) {
    syncMemberRoles(guild).catch((error) =>
      console.error('メンバーロールの初期同期に失敗しました:', error.message));
    cleanupLegacyListenOnlyAccess(guild)
      .then(() => syncListenOnlyChannels(guild))
      .catch((error) => console.error('聞き専チャンネルの初期同期に失敗しました:', error.message));
    if (!hasOpenLimitedVoiceRecruitments(guild.id)) {
      resetVoiceAccessIfEmpty(guild).catch((error) =>
        console.error('未使用の募集VC権限を復元できませんでした:', error.message));
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === '募集') await handleRecruitment(interaction);
      else if (interaction.commandName === '募集終了') await handleClose(interaction);
      else if (interaction.commandName === '使い方') await handleHelp(interaction);
      else if (interaction.commandName === '読み上げ') await handleTts(interaction);
      else if (interaction.commandName === '読み上げ終了') await handleTtsStop(interaction);
      else if (interaction.commandName === '読み上げ設定') await handleTtsSettings(interaction);
      else if (interaction.commandName === 'お知らせ') await handleAdminAnnouncement(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'recruit-game') {
      await handleGameSelection(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'tts-settings-form') {
      await handleTtsSettingsForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'admin-announcement-form') {
      await handleAdminAnnouncementForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('recruit-edit-form:')) {
      await handleEditRecruitmentForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('recruit-form:')) {
      await handleRecruitmentForm(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-edit:')) {
      await handleEditRecruitmentButton(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-voice:')) {
      await handleEnableLimitedVoice(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-full-dm:')) {
      await handleFullDmToggle(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-cancel:')) {
      await handleCancelRecruitment(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit:')) {
      await handleResponseButton(interaction);
    }
  } catch (error) {
    console.error('操作の処理中にエラーが発生しました:', error);
    const payload = { content: '処理中にエラーが発生しました。時間をおいて再度お試しください。', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

client.on('guildMemberAdd', async (member) => {
  await ensureMemberRole(member)
    .catch((error) => console.error('メンバーロールを自動付与できませんでした:', error.message));
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (oldMember.pending && !newMember.pending) {
    await ensureMemberRole(newMember)
      .catch((error) => console.error('認証完了後にメンバーロールを付与できませんでした:', error.message));
  }
});

client.on('threadCreate', async (thread) => {
  if (thread.parentId !== SUPPORT_CENTER_CHANNEL_ID || !thread.guild) return;
  try {
    const starter = await fetchThreadStarterMessage(thread);
    const author = starter?.author
      || await thread.guild.members.fetch(thread.ownerId).then((member) => member.user).catch(() => null);
    if (author?.bot) return;
    await sendSupportNotification(thread.guild, {
      author,
      title: thread.name,
      content: starter?.content,
      url: thread.url,
      attachments: starter ? starter.attachments.map((attachment) => attachment.url) : [],
    });
  } catch (error) {
    console.error('サポート投稿を管理者へ通知できませんでした:', error.message);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.id === client.user?.id) return;
  try {
    if (oldState.channelId !== newState.channelId) {
      if (LISTEN_ONLY_PAIRS[oldState.channelId] || LISTEN_ONLY_PAIRS[newState.channelId]) {
        await syncListenOnlyChannels(oldState.guild);
      }

      const ttsSession = ttsSessions.get(oldState.guild.id);
      if (ttsSession && oldState.channelId === ttsSession.voiceChannelId) {
        const channel = await oldState.guild.channels.fetch(ttsSession.voiceChannelId).catch(() => null);
        const hasHumanMembers = channel?.isVoiceBased()
          && channel.members.some((member) => !member.user.bot);
        if (!hasHumanMembers) {
          const textChannelId = ttsSession.textChannelId;
          stopTtsSession(oldState.guild.id);
          const textChannel = await oldState.guild.channels.fetch(textChannelId).catch(() => null);
          if (textChannel?.isTextBased()) {
            await textChannel.send({
              content: 'VCから誰もいなくなったため、読み上げを終了しました。',
              allowedMentions: { parse: [] },
            });
          }
        }
      }

      if (oldState.channelId === RECRUITMENT_VOICE_CHANNEL_ID) {
        const channel = await getRecruitmentVoiceChannel(oldState.guild);
        const hasHumanMembers = channel.members.some((member) => member.id !== client.user?.id);
        if (!hasHumanMembers) {
          const sessionId = store.data.voiceAccess?.sessionId;
          await resetVoiceAccess(oldState.guild);
          revokeVoiceSessionRecords(
            Object.values(store.data.recruitments),
            oldState.guild.id,
            sessionId,
          );
          await store.save();
          if (!ttsSessions.has(oldState.guild.id)) leaveBotVoice(oldState.guild.id);
        }
      }
    }
  } catch (error) {
    console.error('VC連動処理に失敗しました:', error.message);
  }
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.channelId === SUPPORT_CENTER_CHANNEL_ID) {
    await sendSupportNotification(message.guild, {
      author: message.author,
      title: 'サポートセンターへの新規投稿',
      content: message.content,
      url: message.url,
      attachments: message.attachments.map((attachment) => attachment.url),
    }).catch((error) => console.error('サポート投稿を管理者へ通知できませんでした:', error.message));
  }
  const session = ttsSessions.get(message.guild.id);
  if (!session || session.textChannelId !== message.channelId) return;
  const text = normalizeTtsText(message);
  if (!text) return;
  session.queue.push({ text, userId: message.author.id });
  if (session.queue.length > 20) session.queue.splice(0, session.queue.length - 20);
  await playNextTts(message.guild.id);
});

client.on('error', (error) => console.error('Discordクライアントエラー:', error));

process.on('SIGTERM', () => client.destroy());
process.on('SIGINT', () => client.destroy());

async function start() {
  if (!TOKEN || !CLIENT_ID) {
    throw new Error('DISCORD_TOKEN と CLIENT_ID を環境変数に設定してください。');
  }
  await client.login(TOKEN);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Botを起動できませんでした:', error.message);
    process.exit(1);
  });
}

module.exports = {
  GAMES,
  STATUS,
  applyResponse,
  buildRecruitmentEmbed,
  buildHelpEmbed,
  buildVoicePermissionOverwrites,
  canEnableLimitedVoice,
  commands,
  editRecruitmentModal,
  initialResponses,
  mentionList,
  ownerCancelButton,
  ownerFullControls,
  revokeVoiceSessionRecords,
  recruitmentModal,
  recruitmentName,
  recruitmentPanel,
  responseButtons,
  buildAtempoFilters,
  ttsSettingsModal,
};
