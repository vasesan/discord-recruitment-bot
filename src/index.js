require('dotenv').config();

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
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
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
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
  UserSelectMenuBuilder,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null;
const PRIMARY_GUILD_ID = process.env.PRIMARY_GUILD_ID || GUILD_ID || '1519328681968009257';
const PERSONAL_MUSIC_GUILD_ID = process.env.PERSONAL_MUSIC_GUILD_ID || '841974239375523840';
const DATA_FILE = path.resolve(process.env.DATA_FILE || './data/state.json');
const HELP_CONTENT_FILE = path.resolve(process.env.HELP_CONTENT_FILE || './help.md');
const DEFAULT_BOT_VERSION = process.env.BOT_VERSION || '0.0';
const MUSIC_MP3_DIR = path.resolve(process.env.MUSIC_MP3_DIR || './data/mp3');
const ADMIN_WEB_PORT = Number(process.env.ADMIN_WEB_PORT || 3000);
const ADMIN_WEB_PASSWORD = process.env.ADMIN_WEB_PASSWORD || '';
const HENRIK_API_KEY = process.env.HENRIK_API_KEY || '';
const BOT_PROFILE_DESCRIPTION = [
  'ばーせのBOTです！',
  '色々な機能あります！',
  '詳しくは /使い方 をチェック！',
].join('\n');
const VALORANT_DEFAULT_REGION = process.env.VALORANT_DEFAULT_REGION || 'ap';
const VALORANT_REGIONS = ['ap', 'na', 'eu', 'kr', 'br', 'latam'];
const USE_YOUTUBE_COOKIES = /^(1|true|yes)$/i.test(process.env.YOUTUBE_COOKIES_ENABLED || '');
const ANNOUNCEMENT_CHANNEL_ID = process.env.ANNOUNCEMENT_CHANNEL_ID || '1256456334287568979';
const RECRUITMENT_VOICE_CHANNEL_ID = process.env.RECRUITMENT_VOICE_CHANNEL_ID || '1519335930052214998';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '1519336397469782119';
const ADMIN_COMMAND_CHANNEL_ID = process.env.ADMIN_COMMAND_CHANNEL_ID || '1519329330251960511';
const ADMIN_ANNOUNCEMENT_CHANNEL_ID = process.env.ADMIN_ANNOUNCEMENT_CHANNEL_ID || '1519330711511896185';
const MEMBER_ROLE_ID = '1519333096309395516';
const SUPPORT_CENTER_CHANNEL_ID = '1519330182677401640';
const SUPPORT_NOTIFY_USER_ID = '429632267732910090';
const SUPPORT_RESOLVED_TAG_ID = '1519391361013514471';
const SUPPORT_IN_PROGRESS_TAG_NAME = process.env.SUPPORT_IN_PROGRESS_TAG_NAME || '対応中';
const PRIVATE_ROOM_CREATE_VOICE_CHANNEL_ID = '1520766724121825280';
const LISTEN_ONLY_PAIRS = {
  '1519328684278939711': '1519331849451737190',
  '1519331453635268660': '1519331876018458624',
  '1519331500158615664': '1519331992129503232',
};
const FREE_CHAT_VOICE_CHANNEL_IDS = Object.keys(LISTEN_ONLY_PAIRS);
const FREE_CHAT_BASE_VOICE_CHANNEL_ID = FREE_CHAT_VOICE_CHANNEL_IDS[0];
const FREE_CHAT_BASE_NAME = 'フリーチャット📞';
const ALWAYS_VISIBLE_LISTEN_ONLY_CHANNEL_ID = LISTEN_ONLY_PAIRS[FREE_CHAT_BASE_VOICE_CHANNEL_ID];
const SHARED_LISTEN_ONLY_CHANNEL_ID = '1519364370923126905';
const MUSIC_COMMAND_CHANNEL_ID = '1519364370923126905';
const PERSONAL_MUSIC_COMMAND_CHANNEL_ID = '919060254694703105';
const MUSIC_COMMAND_CHANNELS_BY_GUILD = {
  [PRIMARY_GUILD_ID]: MUSIC_COMMAND_CHANNEL_ID,
  [PERSONAL_MUSIC_GUILD_ID]: PERSONAL_MUSIC_COMMAND_CHANNEL_ID,
};
const CONDITIONAL_VOICE_CHANNEL_IDS = ['1519331581410676846', '1519331551278797083'];
const TTS_MIN_VALUE = 0.5;
const TTS_MAX_VALUE = 2;
const TTS_VOLUME_MIN_VALUE = 0.2;
const TTS_VOLUME_MAX_VALUE = 3;
const TTS_VOICE_TYPES = {
  standard: '標準',
  google: 'Google',
  deep: '低音',
  cute: '高音',
  robot: 'ロボット',
  radio: 'ラジオ',
};
const OPENJTALK_COMMAND = process.env.OPENJTALK_COMMAND || 'open_jtalk';
const OPENJTALK_DIC_DIR = process.env.OPENJTALK_DIC_DIR || '/var/lib/mecab/dic/open-jtalk/naist-jdic';
const OPENJTALK_VOICE_FILE = process.env.OPENJTALK_VOICE_FILE || '/usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice';

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

const FORTUNE_CATEGORIES = [
  '待人',
  '失物',
  '通信',
  '健康',
  'VC運',
  '人間関係',
  '教祖様からのひとこと',
];

const FORTUNE_TYPES = {
  regular: 'おみくじ',
  love: '恋みくじ',
};

const DEFAULT_FORTUNE_ITEMS = [
  {
    type: 'regular',
    fortune: '大吉',
    sections: {
      待人: '思っていたより早く、良いタイミングで連絡が来そうです。',
      失物: '探していたものは近くにあります。普段見ない場所を確認してください。',
      通信: '返信運が高め。短くても早めに返すと話が進みます。',
      健康: '水分と睡眠を少し意識すると調子が整います。',
      VC運: '会話が弾みやすい日。軽く声をかけるだけで場が動きます。',
      人間関係: '普段話さない人との軽い会話に良いきっかけがあります。',
      教祖様からのひとこと: '今日は勢いに乗ってよし。ただし送信前に3秒だけ確認しなさい。',
    },
  },
  {
    type: 'regular',
    fortune: '吉',
    sections: {
      待人: '急かさず待つと、自然に良い流れになります。',
      失物: '最後に使った場所を順番に戻るのが近道です。',
      通信: '大事な連絡は一度見直してから送ると安全です。',
      健康: '無理なく動くと良い日。軽い休憩を挟んでください。',
      VC運: '聞き役に回ると良い空気を作れます。',
      人間関係: '一言添えるだけで誤解が減ります。今日は丁寧さが効きます。',
      教祖様からのひとこと: '迷ったら一回寝かせなさい。深夜の判断はだいたい強気すぎます。',
    },
  },
  {
    type: 'regular',
    fortune: '小吉',
    sections: {
      待人: '今日は少し遅れ気味。別の予定も用意しておくと安心です。',
      失物: '人に聞くより、まず自分の行動を逆順にたどるのが良さそうです。',
      通信: '返事は急ぎすぎない方が安全。短文より一言補足が吉です。',
      健康: '無理を重ねると後で響きそう。今日は早めに休むのが吉です。',
      VC運: '長時間より短時間の参加が合いそうです。',
      人間関係: '少し距離を置くことで、逆に良い関係を保てます。',
      教祖様からのひとこと: '焦るな。今日は守りの一日です。',
    },
  },
  { type: 'love', category: '', fortune: '大吉', content: '素直な一言がかなり効く日。遠回しより短くまっすぐが良さそうです。' },
  { type: 'love', category: '', fortune: '中吉', content: '相手のペースを尊重すると距離が縮まりやすいです。' },
  { type: 'love', category: '', fortune: '吉', content: '何気ない会話の中に次のきっかけがあります。' },
  { type: 'love', category: '', fortune: '小吉', content: '今日は焦らない方が良い日。返信の間隔も含めて落ち着いて。' },
  { type: 'love', category: '', fortune: '末吉', content: '期待しすぎず、軽い挨拶くらいがちょうど良さそうです。' },
];

const recruitmentCommand = new SlashCommandBuilder()
  .setName('募集')
  .setDescription('参加者を募集します')
  .setContexts(InteractionContextType.Guild);

const emergencyRecruitmentCommand = new SlashCommandBuilder()
  .setName('緊急募集')
  .setDescription('ゲーム・内容・人数を指定してすぐに募集します')
  .setContexts(InteractionContextType.Guild);

const recruitmentDebugCommand = new SlashCommandBuilder()
  .setName('募集debug')
  .setDescription('管理者用のデバッグ募集を作成します')
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const closeCommand = new SlashCommandBuilder()
  .setName('募集終了')
  .setDescription('自分が作成した募集を、成立した募集として終了します')
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option.setName('メッセージid').setDescription('省略時は自分の最新の募集中メッセージを対象にします').setRequired(false));

const cancelCommand = new SlashCommandBuilder()
  .setName('募集キャンセル')
  .setDescription('自分が作成した募集を、なかったこととしてキャンセルします')
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option.setName('メッセージid').setDescription('省略時は自分の最新の募集中メッセージを対象にします').setRequired(false));

const schedulePollCommand = new SlashCommandBuilder()
  .setName('日程調整募集')
  .setDescription('候補日から参加できる日程を投票してもらいます')
  .setContexts(InteractionContextType.Guild);

const helpCommand = new SlashCommandBuilder()
  .setName('使い方')
  .setDescription('ばーせbotの使い方を表示します')
  .setContexts(InteractionContextType.Guild);

const fortuneCommand = new SlashCommandBuilder()
  .setName('おみくじ')
  .setDescription('今日のおみくじを引きます')
  .setContexts(InteractionContextType.Guild);

const loveFortuneCommand = new SlashCommandBuilder()
  .setName('恋みくじ')
  .setDescription('今日の恋みくじを引きます')
  .setContexts(InteractionContextType.Guild);

const valorantCommand = new SlashCommandBuilder()
  .setName('valorant')
  .setDescription('VALORANT用の機能を使います')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('連携')
      .setDescription('DiscordアカウントとRiotアカウントを連携します')
      .addStringOption((option) =>
        option.setName('riotid').setDescription('Riot IDの名前部分。例: player').setRequired(true).setMaxLength(32))
      .addStringOption((option) =>
        option.setName('tag').setDescription('Riot IDのタグ部分。例: JP1').setRequired(true).setMaxLength(16)))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('確認')
      .setDescription('連携済みのRiotアカウントを確認します')
      .addUserOption((option) =>
        option.setName('ユーザー').setDescription('確認するユーザー。省略時は自分')))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('解除')
      .setDescription('自分のRiotアカウント連携を解除します'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('setting')
      .setDescription('VALORANTの個人設定を開きます'));

const musicPlayCommand = new SlashCommandBuilder()
  .setName('play')
  .setDescription('YouTube URL または検索文字で現在のVCに音楽を再生します')
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option.setName('入力').setDescription('YouTube URL または検索文字').setRequired(true).setMaxLength(300));

const musicPlayMp3Command = new SlashCommandBuilder()
  .setName('playmp3')
  .setDescription('サーバーに置いたMP3ファイルを現在のVCで再生します')
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option.setName('ファイル名').setDescription('data/mp3 に置いたMP3ファイル名').setRequired(true).setMaxLength(120));

const musicStopCommand = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('現在再生中の音楽を停止してVCから退出します')
  .setContexts(InteractionContextType.Guild);

const musicSkipCommand = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('現在再生している曲をスキップします')
  .setContexts(InteractionContextType.Guild);

const musicLoopCommand = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('現在再生している1曲のループを切り替えます')
  .setContexts(InteractionContextType.Guild);

const musicQueueLoopCommand = new SlashCommandBuilder()
  .setName('qloop')
  .setDescription('キュー全体のループを切り替えます')
  .setContexts(InteractionContextType.Guild);

const musicShuffleCommand = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('現在の音楽キューをシャッフルします')
  .setContexts(InteractionContextType.Guild);

const musicSettingCommand = new SlashCommandBuilder()
  .setName('setting')
  .setDescription('音楽再生に関する個人の設定画面を開きます')
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

const ttsDictionaryCommand = new SlashCommandBuilder()
  .setName('読み上げ辞書登録')
  .setDescription('読み上げ辞書へ単語と読み方を登録します')
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option.setName('単語').setDescription('置き換えたい単語').setRequired(true).setMaxLength(50))
  .addStringOption((option) =>
    option.setName('読み方').setDescription('読み上げる読み方').setRequired(true).setMaxLength(100));

const adminAnnouncementCommand = new SlashCommandBuilder()
  .setName('お知らせ')
  .setDescription('装飾付きのお知らせを作成します')
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const updateInfoCommand = new SlashCommandBuilder()
  .setName('更新情報')
  .setDescription('BOTの更新情報をお知らせチャンネルへ投稿します')
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const adminChannelMessageCommand = new SlashCommandBuilder()
  .setName('チャット送信')
  .setDescription('指定したチャンネルへBotから通常メッセージを送信します')
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option.setName('チャンネル').setDescription('送信先チャンネル').setRequired(true))
  .addStringOption((option) =>
    option.setName('本文').setDescription('送信する本文').setRequired(true).setMaxLength(2000));

const privateRoomCommand = new SlashCommandBuilder()
  .setName('部屋設定')
  .setDescription('自動作成VCの部屋主設定パネルを開きます')
  .setContexts(InteractionContextType.Guild);

const commands = [
  recruitmentCommand,
  emergencyRecruitmentCommand,
  recruitmentDebugCommand,
  closeCommand,
  cancelCommand,
  schedulePollCommand,
  helpCommand,
  fortuneCommand,
  loveFortuneCommand,
  valorantCommand,
  musicPlayCommand,
  musicPlayMp3Command,
  musicStopCommand,
  musicSkipCommand,
  musicLoopCommand,
  musicQueueLoopCommand,
  musicShuffleCommand,
  musicSettingCommand,
  updateInfoCommand,
  adminAnnouncementCommand,
  adminChannelMessageCommand,
  privateRoomCommand,
]
  .map((command) => command.toJSON());

const musicCommands = [
  musicPlayCommand,
  musicPlayMp3Command,
  musicStopCommand,
  musicSkipCommand,
  musicLoopCommand,
  musicQueueLoopCommand,
  musicShuffleCommand,
  musicSettingCommand,
]
  .map((command) => command.toJSON());

const profileCommands = [
  helpCommand,
  recruitmentCommand,
  emergencyRecruitmentCommand,
  fortuneCommand,
  loveFortuneCommand,
  valorantCommand,
  musicPlayCommand,
  musicStopCommand,
  musicSkipCommand,
  musicShuffleCommand,
  musicSettingCommand,
]
  .map((command) => command.toJSON());

function isPrimaryGuild(guildId) {
  return guildId === PRIMARY_GUILD_ID;
}

function musicCommandChannelId(guildId) {
  return MUSIC_COMMAND_CHANNELS_BY_GUILD[guildId] || null;
}

function isMusicCommandName(commandName) {
  return ['play', 'playmp3', 'stop', 'skip', 'loop', 'qloop', 'shuffle', 'setting'].includes(commandName);
}

class Store {
  constructor(filename) {
    this.filename = filename;
    this.data = {
      recruitments: {},
      schedulePolls: {},
      privateRooms: {},
      voiceAccess: null,
      hearingAccess: {},
      listenOnlyGlobal: {},
      ttsSettings: {},
      ttsDictionary: {},
      musicSettings: {},
      valorantAccounts: {},
      valorantSettings: {},
      valorantRankCache: {},
      fortuneItems: null,
      fortuneDraws: {},
      fortuneRecentDraws: {},
      auditLogs: [],
      supportTickets: {},
      botVersion: DEFAULT_BOT_VERSION,
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
          schedulePolls: parsed.schedulePolls || {},
          privateRooms: parsed.privateRooms || {},
          voiceAccess: parsed.voiceAccess || null,
          hearingAccess: parsed.hearingAccess || {},
          listenOnlyGlobal: parsed.listenOnlyGlobal || {},
          ttsSettings: parsed.ttsSettings || {},
          ttsDictionary: parsed.ttsDictionary || {},
          valorantAccounts: parsed.valorantAccounts || {},
          valorantSettings: parsed.valorantSettings || {},
          valorantRankCache: parsed.valorantRankCache || {},
          fortuneItems: parsed.fortuneItems || null,
          fortuneDraws: parsed.fortuneDraws || {},
          fortuneRecentDraws: parsed.fortuneRecentDraws || {},
          auditLogs: parsed.auditLogs || [],
          supportTickets: parsed.supportTickets || {},
          botVersion: parsed.botVersion || parsed.version || DEFAULT_BOT_VERSION,
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
      try {
        await fs.promises.mkdir(path.dirname(this.filename), { recursive: true });
        await fs.promises.writeFile(temporary, snapshot, 'utf8');
        await fs.promises.rename(temporary, this.filename);
      } catch (error) {
        console.error('保存データの安全書き込みに失敗しました。直接書き込みへ切り替えます:', error.message);
        try {
          await fs.promises.writeFile(this.filename, snapshot, 'utf8');
        } catch (fallbackError) {
          console.error('保存データの直接書き込みにも失敗しました。処理は継続します:', fallbackError.message);
        }
      }
    });
    return this.writeChain;
  }
}

const store = new Store(DATA_FILE);
store.load();
ensureFortuneItems();

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
const musicSessions = new Map();
const YOUTUBE_URL_PATTERN = /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?[^<>\s]*v=|shorts\/|live\/)|youtu\.be\/)[^<>\s]+/i;
const MUSIC_NORMALIZE_FILTER = 'loudnorm=I=-16:TP=-1.5:LRA=11';
const MUSIC_VOLUME_OPTIONS = [0.25, 0.5, 0.75, 1];
const MUSIC_MESSAGE_DETAIL = {
  simple: 'シンプル',
  detailed: '詳細',
};
const MUSIC_INITIAL_LOOP = {
  none: 'ループなし',
  one: '1曲ループ',
  queue: 'キュー全体ループ',
};
const MUSIC_DISCONNECT_DELAYS = {
  0: '即時',
  60: '1分',
  180: '3分',
  300: '5分',
};
const MUSIC_END_MESSAGE = '音楽の再生を終了しました。';
const MUSIC_EMPTY_VOICE_END_MESSAGE = 'VCから誰もいなくなったため、音楽の再生を終了しました。';
const MUSIC_KICKED_MESSAGE = 'VCからキックされたため、音楽の再生を終了しました。';
const MUSIC_ERROR_END_MESSAGE = 'エラーが発生しています。音楽の再生を終了しました。';
const YOUTUBE_COOKIES_FILE = prepareYoutubeCookiesFile();
console.log(`YouTube Cookie: enabled=${USE_YOUTUBE_COOKIES} file=${YOUTUBE_COOKIES_FILE ? 'yes' : 'no'} size=${
  YOUTUBE_COOKIES_FILE && fs.existsSync(YOUTUBE_COOKIES_FILE) ? fs.statSync(YOUTUBE_COOKIES_FILE).size : 0
}`);

const adminWebLogs = [];
for (const level of ['log', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    const message = args.map((arg) => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');
    adminWebLogs.push({ time: new Date().toISOString(), level, message });
    if (adminWebLogs.length > 500) adminWebLogs.splice(0, adminWebLogs.length - 500);
    original(...args);
  };
}

function auditActorFromInteraction(interaction) {
  return {
    userId: interaction.user?.id || null,
    username: interaction.member?.displayName || interaction.user?.tag || interaction.user?.username || 'unknown',
  };
}

function appendAuditLog({ action, actor = {}, guildId = null, target = '', details = '' }) {
  store.data.auditLogs ||= [];
  store.data.auditLogs.push({
    time: new Date().toISOString(),
    action,
    guildId,
    userId: actor.userId || null,
    username: actor.username || actor.name || 'unknown',
    target: String(target || '').slice(0, 200),
    details: String(details || '').slice(0, 800),
  });
  if (store.data.auditLogs.length > 1000) {
    store.data.auditLogs.splice(0, store.data.auditLogs.length - 1000);
  }
  return store.save().catch((error) => console.error('監査ログを保存できませんでした:', error.message));
}

function auditLogRows(limit = 200) {
  return (store.data.auditLogs || []).slice(-limit).reverse();
}

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

async function setEveryoneChannelVisibility(guild, channelId, visible, options = {}) {
  const {
    includeTextPermissions = false,
    forceHiddenWhenFalse = false,
    visibleReason = 'チャンネルを条件により全員へ公開',
    hiddenReason = 'チャンネルを条件により非公開',
    restoreReason = 'チャンネルの元の権限へ復元',
  } = options;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.permissionOverwrites) return false;
  const everyoneId = guild.roles.everyone.id;
  const key = `${guild.id}:${channelId}`;
  const saveOriginal = async () => {
    if (store.data.listenOnlyGlobal[key]) return;
    const overwrite = channel.permissionOverwrites.cache.get(everyoneId);
    store.data.listenOnlyGlobal[key] = {
      existed: Boolean(overwrite),
      viewChannel: permissionValue(overwrite, PermissionFlagsBits.ViewChannel),
      sendMessages: permissionValue(overwrite, PermissionFlagsBits.SendMessages),
      readMessageHistory: permissionValue(overwrite, PermissionFlagsBits.ReadMessageHistory),
    };
    await store.save();
  };

  if (visible) {
    await saveOriginal();
    const permissions = { ViewChannel: true };
    if (includeTextPermissions && channel.isTextBased()) {
      permissions.SendMessages = true;
      permissions.ReadMessageHistory = true;
    }
    await channel.permissionOverwrites.edit(everyoneId, permissions, { reason: visibleReason });
    return true;
  }

  const original = store.data.listenOnlyGlobal[key];
  if (!original) {
    if (!forceHiddenWhenFalse) return false;
    await saveOriginal();
  }
  if (forceHiddenWhenFalse) {
    const permissions = { ViewChannel: false };
    if (includeTextPermissions && channel.isTextBased()) {
      permissions.SendMessages = false;
      permissions.ReadMessageHistory = false;
    }
    await channel.permissionOverwrites.edit(everyoneId, permissions, { reason: hiddenReason });
    return true;
  }

  if (!original.existed) {
    await channel.permissionOverwrites.delete(everyoneId, restoreReason);
  } else {
    const permissions = {
      ViewChannel: original.viewChannel,
    };
    if (includeTextPermissions && channel.isTextBased()) {
      permissions.SendMessages = original.sendMessages;
      permissions.ReadMessageHistory = original.readMessageHistory;
    }
    await channel.permissionOverwrites.edit(everyoneId, permissions, { reason: restoreReason });
  }
  delete store.data.listenOnlyGlobal[key];
  await store.save();
  return true;
}

async function setListenOnlyChannelVisibility(guild, textChannelId, visible) {
  return setEveryoneChannelVisibility(guild, textChannelId, visible, {
    includeTextPermissions: true,
    visibleReason: 'フリーチャットVCが使用中のため聞き専を全員へ公開',
    restoreReason: '聞き専チャンネルの元の権限へ復元',
  });
}

function freeChatDisplayNumber(index) {
  const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  return circled[index - 1] || String(index);
}

function freeChatDisplayName(index) {
  return `${FREE_CHAT_BASE_NAME}-${freeChatDisplayNumber(index)}`;
}

function parseFreeChatDisplayIndex(name) {
  const suffix = name.slice(`${FREE_CHAT_BASE_NAME}-`.length);
  const circledIndex = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'].indexOf(suffix);
  if (circledIndex >= 0) return circledIndex + 1;
  const numeric = Number.parseInt(suffix, 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function isManagedFreeChatVoiceChannel(channel) {
  return channel?.type === ChannelType.GuildVoice
    && (
      channel.id === FREE_CHAT_BASE_VOICE_CHANNEL_ID
      || (typeof channel.name === 'string' && channel.name.startsWith(`${FREE_CHAT_BASE_NAME}-`))
    );
}

function planFreeChatVoiceLayout(channelStates) {
  if (!channelStates.length) return [];
  const activeAdditional = channelStates.slice(1).filter((state) => state.active);
  const nextEmptySlot = 2 + activeAdditional.length;
  let activeSlot = 2;
  let emptySlot = nextEmptySlot;
  return channelStates.map((state, index) => {
    if (index === 0) {
      return { ...state, displayIndex: 1, visible: true };
    }
    if (state.active) {
      const displayIndex = activeSlot;
      activeSlot++;
      return { ...state, displayIndex, visible: true };
    }
    const displayIndex = emptySlot;
    emptySlot++;
    return {
      ...state,
      displayIndex,
      visible: displayIndex === nextEmptySlot && channelStates.some((candidate) => candidate.active),
    };
  });
}

async function fetchManagedFreeChatVoiceChannels(guild) {
  const baseChannel = await guild.channels.fetch(FREE_CHAT_BASE_VOICE_CHANNEL_ID).catch(() => null);
  if (!baseChannel?.isVoiceBased()) return [];
  await guild.channels.fetch().catch(() => null);
  const channels = guild.channels.cache
    .filter((channel) => channel?.type === ChannelType.GuildVoice
      && channel.parentId === baseChannel.parentId
      && isManagedFreeChatVoiceChannel(channel))
    .map((channel) => ({
      channel,
      displayIndex: channel.id === FREE_CHAT_BASE_VOICE_CHANNEL_ID
        ? 1
        : parseFreeChatDisplayIndex(channel.name) || 999,
      active: channel.members.some((member) => !member.user.bot),
    }))
    .sort((a, b) => {
      if (a.channel.id === FREE_CHAT_BASE_VOICE_CHANNEL_ID) return -1;
      if (b.channel.id === FREE_CHAT_BASE_VOICE_CHANNEL_ID) return 1;
      return a.displayIndex - b.displayIndex || a.channel.rawPosition - b.channel.rawPosition;
    });

  if (!channels.some((item) => item.channel.id === FREE_CHAT_BASE_VOICE_CHANNEL_ID)) {
    channels.unshift({
      channel: baseChannel,
      displayIndex: 1,
      active: baseChannel.members.some((member) => !member.user.bot),
    });
  }
  return channels;
}

function cloneFreeChatVoiceOptions(baseChannel, name) {
  return {
    name,
    type: ChannelType.GuildVoice,
    parent: baseChannel.parentId,
    bitrate: baseChannel.bitrate,
    userLimit: baseChannel.userLimit,
    rtcRegion: baseChannel.rtcRegion,
    videoQualityMode: baseChannel.videoQualityMode,
    permissionOverwrites: baseChannel.permissionOverwrites.cache.map((overwrite) => ({
      id: overwrite.id,
      type: overwrite.type,
      allow: overwrite.allow.bitfield,
      deny: overwrite.deny.bitfield,
    })),
    reason: 'フリーチャットVCを利用状況に合わせて追加',
  };
}

async function syncFreeChatVoiceChannels(guild) {
  const channels = await fetchManagedFreeChatVoiceChannels(guild);
  if (!channels.length) return { anyActive: false, activeByDisplayIndex: {} };

  const baseItem = channels.find((item) => item.channel.id === FREE_CHAT_BASE_VOICE_CHANNEL_ID);
  if (!baseItem) return { anyActive: false, activeByDisplayIndex: {} };

  if (baseItem.channel.name !== freeChatDisplayName(1)) {
    await baseItem.channel.setName(freeChatDisplayName(1), 'フリーチャットVC①の名前を固定')
      .catch((error) => console.error(`フリーチャットVC ${baseItem.channel.id} の名前変更に失敗しました:`, error.message));
  }
  await setEveryoneChannelVisibility(guild, baseItem.channel.id, true, {
    restoreReason: 'フリーチャットVC①は常時表示',
  });

  const additionalChannels = channels.filter((item) => item.channel.id !== FREE_CHAT_BASE_VOICE_CHANNEL_ID);
  for (const item of additionalChannels.filter((candidate) => !candidate.active)) {
    await item.channel.delete('空になったフリーチャットVCを削除')
      .catch((error) => console.error(`空のフリーチャットVC ${item.channel.id} の削除に失敗しました:`, error.message));
  }

  const activeAdditional = additionalChannels.filter((item) => item.active);
  const activeByDisplayIndex = { 1: baseItem.active };
  let displayIndex = 2;
  for (const item of activeAdditional) {
    const expectedName = freeChatDisplayName(displayIndex);
    if (item.channel.name !== expectedName) {
      await item.channel.setName(expectedName, '利用中のフリーチャットVCを前詰め')
        .catch((error) => console.error(`フリーチャットVC ${item.channel.id} の名前変更に失敗しました:`, error.message));
    }
    await setEveryoneChannelVisibility(guild, item.channel.id, true, {
      restoreReason: '利用中のフリーチャットVCは表示',
    });
    activeByDisplayIndex[displayIndex] = true;
    displayIndex++;
  }

  const anyActive = baseItem.active || activeAdditional.length > 0;
  if (anyActive) {
    const nextName = freeChatDisplayName(displayIndex);
    const existing = (await fetchManagedFreeChatVoiceChannels(guild))
      .find((item) => item.displayIndex === displayIndex && !item.active);
    if (!existing) {
      const created = await guild.channels.create(cloneFreeChatVoiceOptions(baseItem.channel, nextName))
        .catch((error) => {
          console.error(`フリーチャットVC ${nextName} の作成に失敗しました:`, error.message);
          return null;
        });
      if (created) {
        await created.setPosition(baseItem.channel.rawPosition + displayIndex - 1)
          .catch(() => {});
      }
    }
  }

  return { anyActive, activeByDisplayIndex };
}

async function syncListenOnlyChannels(guild) {
  const freeChatState = await syncFreeChatVoiceChannels(guild);
  const listenOnlyChannelIds = Object.values(LISTEN_ONLY_PAIRS);
  for (const [index, textChannelId] of listenOnlyChannelIds.entries()) {
    await setListenOnlyChannelVisibility(
      guild,
      textChannelId,
      textChannelId === ALWAYS_VISIBLE_LISTEN_ONLY_CHANNEL_ID || Boolean(freeChatState.activeByDisplayIndex[index + 1]),
    );
  }
  await setListenOnlyChannelVisibility(guild, SHARED_LISTEN_ONLY_CHANNEL_ID, true, {
    visibleReason: '音楽BOT部屋は常時表示',
  });

  for (const channelId of CONDITIONAL_VOICE_CHANNEL_IDS) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    const channelActive = channel?.isVoiceBased() && channel.members.some((member) => !member.user.bot);
    await setEveryoneChannelVisibility(guild, channelId, Boolean(channelActive || freeChatState.anyActive), {
      forceHiddenWhenFalse: true,
      visibleReason: '対象VCまたはフリーチャットが使用中のため表示',
      hiddenReason: '対象VCとフリーチャットが未使用のため非表示',
    });
  }
}

const listenOnlySyncQueues = new Map();

function syncListenOnlyChannelsQueued(guild) {
  const previous = listenOnlySyncQueues.get(guild.id) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => syncListenOnlyChannels(guild))
    .finally(() => {
      if (listenOnlySyncQueues.get(guild.id) === next) {
        listenOnlySyncQueues.delete(guild.id);
      }
    });
  listenOnlySyncQueues.set(guild.id, next);
  return next;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyTtsDictionary(guildId, text) {
  const dictionary = store.data.ttsDictionary?.[guildId] || {};
  return Object.entries(dictionary)
    .filter(([word, reading]) => word && reading)
    .sort(([a], [b]) => b.length - a.length)
    .reduce((current, [word, reading]) =>
      current.replace(new RegExp(escapeRegExp(word), 'gi'), reading), text);
}

function normalizeTtsText(message) {
  const normalized = message.content
    .replace(/<@!?\d+>/g, 'メンション')
    .replace(/<@&\d+>/g, 'ロールメンション')
    .replace(/<#\d+>/g, 'チャンネル')
    .replace(/https?:\/\/\S+/g, 'URL')
    .replace(/<a?:\w+:\d+>/g, '絵文字')
    .replace(/\s+/g, ' ')
    .trim();
  return applyTtsDictionary(message.guild.id, normalized).slice(0, 180);
}

function getTtsSettings(userId) {
  const saved = store.data.ttsSettings[userId] || {};
  const previousSpeeds = [0.75, 1, 1.25];
  const previousPitches = [0.8, 1, 1.2];
  const storedSpeed = Number(saved.speed);
  const storedPitch = Number(saved.pitch);
  const storedVolume = Number(saved.volume);
  const speed = Number.isFinite(storedSpeed)
    ? storedSpeed
    : (previousSpeeds[saved.speedIndex] ?? 1);
  const pitch = Number.isFinite(storedPitch)
    ? storedPitch
    : (previousPitches[saved.pitchIndex] ?? 1);
  const voice = Object.hasOwn(TTS_VOICE_TYPES, saved.voice) ? saved.voice : 'standard';
  return {
    speed: Math.min(Math.max(speed, TTS_MIN_VALUE), TTS_MAX_VALUE),
    pitch: Math.min(Math.max(pitch, TTS_MIN_VALUE), TTS_MAX_VALUE),
    volume: Number.isFinite(storedVolume)
      ? Math.min(Math.max(storedVolume, TTS_VOLUME_MIN_VALUE), TTS_VOLUME_MAX_VALUE)
      : 1,
    voice,
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
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('volume')
          .setLabel('音量（0.20～3.00）')
          .setStyle(TextInputStyle.Short)
          .setValue(settings.volume.toFixed(2))
          .setPlaceholder('例: 1.20')
          .setMaxLength(4)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('voice')
          .setLabel('声タイプ standard/google/deep/cute/robot/radio')
          .setStyle(TextInputStyle.Short)
          .setValue(settings.voice)
          .setPlaceholder('例: google')
          .setMaxLength(20)
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
  const volume = Number(interaction.fields.getTextInputValue('volume').trim());
  const voice = interaction.fields.getTextInputValue('voice').trim().toLowerCase();
  if (!Number.isFinite(speed) || !Number.isFinite(pitch)
    || speed < TTS_MIN_VALUE || speed > TTS_MAX_VALUE
    || pitch < TTS_MIN_VALUE || pitch > TTS_MAX_VALUE
    || !Number.isFinite(volume) || volume < TTS_VOLUME_MIN_VALUE || volume > TTS_VOLUME_MAX_VALUE
    || !Object.hasOwn(TTS_VOICE_TYPES, voice)) {
    await interaction.reply({
      content: `速度・高さは0.50～2.00、音量は0.20～3.00、声タイプは ${Object.keys(TTS_VOICE_TYPES).join('/')} のいずれかで入力してください。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  store.data.ttsSettings[interaction.user.id] = { speed, pitch, volume, voice };
  await store.save();
  await interaction.reply({
    content: `読み上げ設定を更新しました。速度: ${speed.toFixed(2)}倍、高さ: ${pitch.toFixed(2)}倍、音量: ${volume.toFixed(2)}倍、声: ${TTS_VOICE_TYPES[voice]}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleTtsDictionary(interaction) {
  const word = interaction.options.getString('単語', true).trim();
  const reading = interaction.options.getString('読み方', true).trim();
  if (!word || !reading) {
    await interaction.reply({ content: '単語と読み方を入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  store.data.ttsDictionary ||= {};
  store.data.ttsDictionary[interaction.guildId] ||= {};
  store.data.ttsDictionary[interaction.guildId][word] = reading;
  await store.save();
  await interaction.reply({
    content: `読み上げ辞書に登録しました。\n${word} → ${reading}`,
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

function buildTtsAudioFilters(settings) {
  const speed = Math.min(Math.max(Number(settings.speed) || 1, TTS_MIN_VALUE), TTS_MAX_VALUE);
  const pitch = Math.min(Math.max(Number(settings.pitch) || 1, TTS_MIN_VALUE), TTS_MAX_VALUE);
  const volume = Math.min(Math.max(Number(settings.volume) || 1, TTS_VOLUME_MIN_VALUE), TTS_VOLUME_MAX_VALUE);
  const voice = Object.hasOwn(TTS_VOICE_TYPES, settings.voice) ? settings.voice : 'standard';
  const filters = [
    `volume=${volume.toFixed(2)}`,
  ];
  if (voice === 'deep') {
    filters.push('lowpass=f=3200');
  } else if (voice === 'cute') {
    filters.push('highpass=f=180');
  } else if (voice === 'robot') {
    filters.push('aecho=0.8:0.88:18:0.18', 'tremolo=f=28:d=0.35');
  } else if (voice === 'radio') {
    filters.push('highpass=f=300', 'lowpass=f=3000', 'acrusher=level_in=1:level_out=1:bits=10:mode=log');
  }
  filters.push(
    'aresample=48000',
    `asetrate=${Math.round(48000 * pitch)}`,
    'aresample=48000',
    ...buildAtempoFilters(speed / pitch),
  );
  return filters.join(',');
}

function openJtalkPitchShift(pitch) {
  return ((pitch - 1) * 6).toFixed(2);
}

async function createOpenJtalkInputStream(text, settings) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tts-'));
  const wavFile = path.join(tempDir, 'voice.wav');
  await new Promise((resolve, reject) => {
    const synthesizer = spawn(OPENJTALK_COMMAND, [
      '-x', OPENJTALK_DIC_DIR,
      '-m', OPENJTALK_VOICE_FILE,
      '-r', '1.00',
      '-fm', '0.00',
      '-ow', wavFile,
    ], { stdio: ['pipe', 'ignore', 'pipe'] });
    const stderr = [];
    synthesizer.stderr.on('data', (chunk) => {
      stderr.push(chunk.toString());
      console.error('open_jtalk:', chunk.toString().trim());
    });
    synthesizer.stdin.on('error', () => {});
    synthesizer.once('error', reject);
    synthesizer.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`open_jtalk exited with ${code}: ${stderr.join('').trim()}`));
    });
    synthesizer.stdin.end(text);
  });
  const input = fs.createReadStream(wavFile);
  input.once('close', () => {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });
  return { input, audioFilters: buildTtsAudioFilters(settings) };
}

async function createGoogleTtsInputStream(text, settings) {
  const url = googleTTS.getAudioUrl(text, { lang: 'ja', slow: false, host: 'https://translate.google.com' });
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`音声取得 HTTP ${response.status}`);
  return { input: Readable.fromWeb(response.body), audioFilters: buildTtsAudioFilters(settings) };
}

async function createTtsInputStream(text, settings) {
  if (process.env.TTS_ENGINE === 'google' || settings.voice === 'google') {
    return createGoogleTtsInputStream(text, settings);
  }
  return createOpenJtalkInputStream(text, settings).catch(async (error) => {
    console.error('Open JTalkを使用できないためGoogle TTSへ切り替えます:', error.message);
    return createGoogleTtsInputStream(text, settings);
  });
}

async function playNextTts(guildId) {
  const session = ttsSessions.get(guildId);
  if (!session || session.playing || !session.queue.length) return;
  session.playing = true;
  const item = session.queue.shift();
  try {
    const settings = getTtsSettings(item.userId);
    const { input, audioFilters } = await createTtsInputStream(item.text, settings);
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
    input.pipe(transcoder.stdin);
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
  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
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

function extractYoutubeUrl(text) {
  return text?.match(YOUTUBE_URL_PATTERN)?.[0] || null;
}

function isYoutubePlaylistUrl(url) {
  return /[?&]list=/.test(url) && !/list=WL|list=LL/i.test(url);
}

function prepareYoutubeCookiesFile() {
  if (!USE_YOUTUBE_COOKIES) return null;
  const explicitPath = process.env.YOUTUBE_COOKIES_FILE?.trim();
  if (explicitPath) return explicitPath;

  const cookieBase64 = process.env.YOUTUBE_COOKIES_BASE64 || Array.from({ length: 20 }, (_, index) => (
    process.env[`YOUTUBE_COOKIES_BASE64_${index + 1}`] || ''
  )).join('');
  const rawCookies = cookieBase64
    ? Buffer.from(cookieBase64, 'base64').toString('utf8')
    : process.env.YOUTUBE_COOKIES;
  if (!rawCookies) return null;

  const filePath = path.join(os.tmpdir(), 'youtube-cookies.txt');
  try {
    fs.writeFileSync(filePath, rawCookies.replace(/\\n/g, '\n'), { mode: 0o600 });
    const names = new Set(rawCookies
      .replace(/\\n/g, '\n')
      .split(/\r?\n/)
      .filter((line) => line && (!line.startsWith('#') || line.startsWith('#HttpOnly_')))
      .map((line) => line.replace(/^#HttpOnly_/, '').split('\t')[5])
      .filter(Boolean));
    console.log(`YouTube Cookie names: SID=${names.has('SID')} HSID=${names.has('HSID')} SSID=${names.has('SSID')} SAPISID=${names.has('SAPISID')} APISID=${names.has('APISID')} LOGIN_INFO=${names.has('LOGIN_INFO')}`);
    return filePath;
  } catch (error) {
    console.error('YouTube Cookieファイルを作成できませんでした:', error.message);
    return null;
  }
}

function youtubeCookiesArgs() {
  return YOUTUBE_COOKIES_FILE ? ['--cookies', YOUTUBE_COOKIES_FILE] : [];
}

function youtubePlayerClients() {
  return YOUTUBE_COOKIES_FILE
    ? ['android', 'web', 'web_safari', 'mweb']
    : ['android', 'web'];
}

function youtubeExtractorArgs(client) {
  return ['--extractor-args', `youtube:player_client=${client}`];
}

const YOUTUBE_AUDIO_FORMAT = 'ba/bestaudio/best';

function getYoutubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (parsed.pathname.startsWith('/shorts/') || parsed.pathname.startsWith('/live/')) {
      return parsed.pathname.split('/').filter(Boolean)[1] || null;
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

async function resolveYoutubeMetadata(url) {
  const fallback = { title: 'YouTube動画', thumbnail: null, channelName: '' };
  try {
    const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    if (!response.ok) throw new Error(`oEmbed ${response.status}`);
    const data = await response.json();
    return {
      title: data.title || fallback.title,
      thumbnail: data.thumbnail_url || null,
      channelName: data.author_name || '',
    };
  } catch {
    const videoId = getYoutubeVideoId(url);
    return {
      ...fallback,
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null,
    };
  }
}

function musicItemLabel(item) {
  if (item.type === 'mp3') return item.title || item.filename || 'MP3ファイル';
  return item.url;
}

async function resolveMusicItemMetadata(item) {
  if (item.type === 'mp3') {
    return {
      title: item.title || item.filename || 'MP3ファイル',
      thumbnail: null,
      line: `MP3ファイル: ${item.filename || path.basename(item.path || '')}`,
    };
  }
  const metadata = await resolveYoutubeMetadata(item.url);
  return {
    ...metadata,
    line: `${metadata.title || 'YouTube動画'}\n${item.url}`,
  };
}

async function buildMusicQueueEmbeds({ items, member, startPosition }) {
  const displayName = member.displayName || member.user.username;
  const embeds = await Promise.all(items.slice(0, 10).map(async (item, index) => {
    const metadata = await resolveMusicItemMetadata(item);
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`${displayName}のリクエスト`)
      .setDescription(`キュー${startPosition + index}件目\n${metadata.line}`);
    if (metadata.thumbnail) embed.setThumbnail(metadata.thumbnail);
    return embed;
  }));
  if (items.length > embeds.length) {
    embeds.push(new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`${displayName}のリクエスト`)
      .setDescription(`ほか${items.length - embeds.length}件をキューに追加しました。`));
  }
  return embeds;
}

async function buildMusicQueueEmbedsSafe({ items, member, startPosition }) {
  const displayName = (member.displayName || member.user.username || 'ユーザー').slice(0, 180);
  const shownItems = items.length > 10 ? items.slice(0, 9) : items.slice(0, 10);
  const embeds = await Promise.all(shownItems.map(async (item, index) => {
    const trackInfo = await musicItemTrackInfo(item);
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`${displayName}のリクエスト`)
      .setDescription(`キュー${startPosition + index}件目\n${musicTrackLine(1, trackInfo).replace(/^1\. /, '')}`);
    if (trackInfo.thumbnail) embed.setThumbnail(trackInfo.thumbnail);
    return embed;
  }));
  if (items.length > embeds.length && embeds.length < 10) {
    embeds.push(new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`${displayName}のリクエスト`)
      .setDescription(`ほか${items.length - embeds.length}件をキューに追加しました。`));
  }
  return embeds;
}

function truncateDiscordLine(text, maxLength = 110) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function escapeMarkdownLinkText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\]/g, '\\]')
    .replace(/\[/g, '\\[');
}

function escapeInlineCode(text) {
  return String(text || '').replace(/`/g, '｀');
}

function musicMarkdownUrl(url) {
  return String(url || '').replace(/\)/g, '%29').replace(/\(/g, '%28');
}

function channelBadge(channelName) {
  const value = truncateDiscordLine(channelName, 40);
  return value ? ` \`${escapeInlineCode(value)}\`` : '';
}

async function musicItemTrackInfo(item) {
  if (item.type === 'mp3') {
    return {
      title: item.title || item.filename || 'MP3ファイル',
      url: '',
      channelName: 'MP3',
      thumbnail: null,
    };
  }
  if (item.title && item.channelName) {
    return {
      title: item.title,
      url: item.url,
      channelName: item.channelName,
      thumbnail: item.thumbnail || null,
    };
  }
  try {
    const metadata = await resolveMusicItemMetadata(item);
    return {
      title: metadata.title || item.title || 'YouTube動画',
      url: item.url,
      channelName: metadata.channelName || item.channelName || '',
      thumbnail: metadata.thumbnail || item.thumbnail || null,
    };
  } catch {
    return {
      title: item.title || musicItemLabel(item),
      url: item.url || '',
      channelName: item.channelName || '',
      thumbnail: item.thumbnail || null,
    };
  }
}

function musicTrackLine(index, info) {
  const title = truncateDiscordLine(info.title || 'タイトル不明', 120);
  const titleText = info.url
    ? `[${escapeMarkdownLinkText(title)}](${musicMarkdownUrl(info.url)})`
    : escapeMarkdownLinkText(title);
  return `${index}. ${titleText}${channelBadge(info.channelName)}`;
}

async function buildMusicPlaylistSummaryEmbed({ playlistUrl, count, member, playlistTitle = '', items = [] }) {
  const displayName = (member.displayName || member.user.username || 'ユーザー').slice(0, 180);
  const shownItems = items.slice(0, 30);
  const trackInfos = await Promise.all(shownItems.map((item) => musicItemTrackInfo(item)));
  const titleLines = trackInfos.map((info, index) => musicTrackLine(index + 1, info));
  if (count > shownItems.length) {
    titleLines.push(`...ほか${count - shownItems.length}件`);
  }
  const descriptionParts = [
    playlistTitle ? `**${truncateDiscordLine(playlistTitle, 180)}**` : '**再生リスト**',
    `キューに${count}件追加しました。`,
    playlistUrl,
  ];
  if (titleLines.length) descriptionParts.push('', titleLines.join('\n'));
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle(`${displayName}のリクエスト`)
    .setDescription(descriptionParts.join('\n').slice(0, 4096));
}

async function buildMusicShuffleEmbed({ session, member }) {
  const displayName = (member.displayName || member.user.username || 'ユーザー').slice(0, 180);
  const currentInfo = session.current ? await musicItemTrackInfo(session.current) : null;
  const shownQueue = session.queue.slice(0, 30);
  const queueInfos = await Promise.all(shownQueue.map((item) => musicItemTrackInfo(item)));
  const queueLines = queueInfos.map((info, index) => musicTrackLine(index + 1, info));
  if (session.queue.length > shownQueue.length) {
    queueLines.push(`...ほか${session.queue.length - shownQueue.length}件`);
  }

  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle(`${displayName}のシャッフル`)
    .setDescription([
      '**現在再生中**',
      currentInfo ? musicTrackLine(1, currentInfo).replace(/^1\. /, '') : 'なし',
      '',
      '**曲順**',
      queueLines.join('\n') || '待機中の曲はありません。',
    ].join('\n').slice(0, 4096));
}

function runCommandCollect(command, args, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
    child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));
    child.once('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout: '', stderr: error.message });
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: stdout.join(''), stderr: stderr.join('') });
    });
  });
}

async function resolveYoutubeQueueItems(url) {
  if (!isYoutubePlaylistUrl(url)) return [{ type: 'youtube', url }];
  const jsonResult = await runCommandCollect('yt-dlp', [
    '--flat-playlist',
    '--ignore-errors',
    '--no-warnings',
    '--dump-single-json',
    ...youtubeCookiesArgs(),
    url,
  ], 45_000);
  if (jsonResult.code === 0 && jsonResult.stdout.trim()) {
    try {
      const data = JSON.parse(jsonResult.stdout);
      const entries = Array.isArray(data.entries) ? data.entries : [];
      const items = entries
        .map((entry) => {
          const rawUrl = entry.webpage_url || entry.url || '';
          const videoId = entry.id || rawUrl;
          const itemUrl = /^https?:\/\//.test(rawUrl)
            ? rawUrl
            : (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
          return {
            type: 'youtube',
            url: itemUrl,
            title: entry.title || '',
            channelName: entry.channel || entry.uploader || entry.creator || '',
          };
        })
        .filter((entry) => /^https?:\/\//.test(entry.url))
        .slice(0, 50);
      if (items.length) {
        return {
          items,
          playlist: {
            url,
            title: data.title || data.playlist_title || '',
            items,
          },
        };
      }
    } catch (error) {
      console.error('プレイリストJSONの解析に失敗:', error.message);
    }
  } else if (jsonResult.stderr.trim()) {
    console.error('プレイリストJSON取得に失敗:', jsonResult.stderr.trim());
  }

  const result = await runCommandCollect('yt-dlp', [
    '--flat-playlist',
    '--ignore-errors',
    '--no-warnings',
    '--print',
    'webpage_url',
    url,
  ], 45_000);
  if (result.code !== 0) {
    console.error('プレイリスト展開に失敗:', result.stderr.trim());
    return [{ type: 'youtube', url }];
  }
  const urls = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//.test(line))
    .slice(0, 50);
  const items = urls.length ? urls.map((itemUrl) => ({ type: 'youtube', url: itemUrl })) : [{ type: 'youtube', url }];
  return {
    items,
    playlist: {
      url,
      title: '',
      items,
    },
  };
}

async function resolveYoutubeSearchUrl(query) {
  const result = await runCommandCollect('yt-dlp', [
    '--default-search',
    'ytsearch1',
    '--no-playlist',
    '--no-warnings',
    '--print',
    'webpage_url',
    query,
  ], 45_000);
  const url = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^https?:\/\//.test(line));
  if (result.code !== 0 || !url) {
    console.error('YouTube検索に失敗:', result.stderr.trim());
    throw new Error('YouTube検索に失敗しました。別の検索語で試してください。');
  }
  return url;
}

function resolveMp3Item(filename) {
  const trimmed = filename.trim();
  if (!trimmed) throw new Error('MP3ファイル名を指定してください。');
  const safeName = path.basename(trimmed);
  if (safeName !== trimmed || safeName.includes('..')) {
    throw new Error('ファイル名だけを指定してください。');
  }
  const normalizedName = /\.mp3$/i.test(safeName) ? safeName : `${safeName}.mp3`;
  const filePath = path.resolve(MUSIC_MP3_DIR, normalizedName);
  const baseDir = `${path.resolve(MUSIC_MP3_DIR)}${path.sep}`;
  if (!filePath.startsWith(baseDir)) {
    throw new Error('MP3フォルダ外のファイルは再生できません。');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`MP3ファイルが見つかりません: ${normalizedName}`);
  }
  return {
    type: 'mp3',
    path: filePath,
    filename: normalizedName,
    title: normalizedName.replace(/\.mp3$/i, ''),
  };
}

function ytDlpErrorMessage(stderr) {
  if (/Sign in to confirm you.?re not a bot/i.test(stderr)) {
    return 'YouTube側でBot判定されています。Railwayに YouTube Cookie を設定すると再生できる可能性があります。';
  }
  if (/Private video/i.test(stderr)) return '非公開動画のため再生できません。';
  if (/Video unavailable/i.test(stderr)) return 'この動画は利用できないため再生できません。';
  if (/copyright/i.test(stderr)) return '著作権または地域制限により、この動画は再生できません。';
  return 'YouTubeから音声を取得できませんでした。別の動画で試してください。';
}

async function checkYoutubePlayable(url) {
  const result = await runCommandCollect('yt-dlp', [
    '--no-playlist',
    '--no-warnings',
    ...youtubeCookiesArgs(),
    ...youtubeExtractorArgs(),
    '--dump-single-json',
    '--skip-download',
    url,
  ], 30_000);
  if (result.code === 0) return { ok: true };
  const stderr = result.stderr.trim();
  if (stderr) console.error('YouTube再生事前チェックに失敗:', stderr);
  if (/Requested format is not available/i.test(stderr)) {
    return { ok: true };
  }
  return {
    ok: false,
    message: ytDlpErrorMessage(stderr),
  };
}

async function resolveYoutubeAudioInfo(url) {
  const result = await runCommandCollect('yt-dlp', [
    '--no-playlist',
    '--no-warnings',
    ...youtubeCookiesArgs(),
    ...youtubeExtractorArgs(),
    '-f',
    YOUTUBE_AUDIO_FORMAT,
    '--dump-single-json',
    url,
  ], 30_000);
  if (result.code !== 0) {
    const stderr = result.stderr.trim();
    if (stderr) console.error('yt-dlp音声URL解決に失敗しました:', stderr);
    throw new Error(ytDlpErrorMessage(stderr));
  }
  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch (error) {
    console.error('yt-dlpのJSONを解析できませんでした:', error.message);
    throw new Error('YouTubeから音声情報を取得できませんでした。別の動画で試してください。');
  }
  const download = data.requested_downloads?.[0] || data;
  const audioUrl = download.url || data.url;
  if (!audioUrl) {
    throw new Error('YouTubeから音声URLを取得できませんでした。別の動画で試してください。');
  }
  return {
    url: audioUrl,
    headers: download.http_headers || data.http_headers || {},
  };
}

async function checkYoutubePlayableWithFallback(url) {
  let lastStderr = '';
  for (const client of youtubePlayerClients()) {
    const result = await runCommandCollect('yt-dlp', [
      '--no-playlist',
      '--no-warnings',
      ...youtubeCookiesArgs(),
      ...youtubeExtractorArgs(client),
      '--dump-single-json',
      '--skip-download',
      url,
    ], 30_000);
    if (result.code === 0) {
      console.log(`YouTube事前チェック成功: player_client=${client}`);
      return { ok: true };
    }
    const stderr = result.stderr.trim();
    lastStderr = stderr || lastStderr;
    if (stderr) console.error(`YouTube事前チェック失敗: player_client=${client}`, stderr);
    if (/Requested format is not available/i.test(stderr)) {
      return { ok: true };
    }
  }
  return {
    ok: false,
    message: ytDlpErrorMessage(lastStderr),
  };
}

async function resolveYoutubeAudioInfoWithFallback(url) {
  let result = null;
  let selectedClient = null;
  let lastStderr = '';
  for (const client of youtubePlayerClients()) {
    const attempt = await runCommandCollect('yt-dlp', [
      '--no-playlist',
      '--no-warnings',
      ...youtubeCookiesArgs(),
      ...youtubeExtractorArgs(client),
      '-f',
      YOUTUBE_AUDIO_FORMAT,
      '--dump-single-json',
      url,
    ], 30_000);
    if (attempt.code === 0) {
      result = attempt;
      selectedClient = client;
      break;
    }
    const stderr = attempt.stderr.trim();
    lastStderr = stderr || lastStderr;
    if (stderr) console.error(`yt-dlp音声URL解決に失敗しました: player_client=${client}`, stderr);
  }
  if (!result) {
    throw new Error(ytDlpErrorMessage(lastStderr));
  }
  console.log(`yt-dlp音声URL解決成功: player_client=${selectedClient}`);
  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch (error) {
    console.error('yt-dlpのJSONを解析できませんでした:', error.message);
    throw new Error('YouTubeから音声情報を取得できませんでした。別の動画で試してください。');
  }
  const download = data.requested_downloads?.[0] || data;
  const audioUrl = download.url || data.url;
  if (!audioUrl) {
    throw new Error('YouTubeから音声URLを取得できませんでした。別の動画で試してください。');
  }
  return {
    url: audioUrl,
    headers: download.http_headers || data.http_headers || {},
  };
}

async function checkYoutubePlayableWithFallback(url) {
  return { ok: true };
}

async function resolveYoutubeAudioInfoWithFallback(url) {
  let result = null;
  let selectedClient = null;
  let selectedCookieMode = null;
  let lastStderr = '';
  const cookieModes = YOUTUBE_COOKIES_FILE
    ? [
        { name: 'cookies', args: youtubeCookiesArgs() },
        { name: 'no-cookies', args: [] },
      ]
    : [{ name: 'no-cookies', args: [] }];
  for (const cookieMode of cookieModes) {
    for (const client of youtubePlayerClients()) {
      const attempt = await runCommandCollect('yt-dlp', [
        '--no-playlist',
        '--no-warnings',
        ...cookieMode.args,
        ...youtubeExtractorArgs(client),
        '-f',
        YOUTUBE_AUDIO_FORMAT,
        '--dump-single-json',
        url,
      ], 30_000);
      if (attempt.code === 0) {
        result = attempt;
        selectedClient = client;
        selectedCookieMode = cookieMode.name;
        break;
      }
      const stderr = attempt.stderr.trim();
      lastStderr = stderr || lastStderr;
    }
    if (result) break;
  }
  if (!result) {
    if (lastStderr) console.error('yt-dlp音声URL解決に失敗しました:', lastStderr);
    throw new Error(ytDlpErrorMessage(lastStderr));
  }
  console.log(`yt-dlp音声URL解決成功: player_client=${selectedClient} auth=${selectedCookieMode}`);
  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch (error) {
    console.error('yt-dlpのJSONを解析できませんでした:', error.message);
    throw new Error('YouTubeから音声情報を取得できませんでした。別の動画で試してください。');
  }
  const download = data.requested_downloads?.[0] || data;
  const audioUrl = download.url || data.url;
  if (!audioUrl) {
    throw new Error('YouTubeから音声URLを取得できませんでした。別の動画で試してください。');
  }
  return {
    url: audioUrl,
    headers: download.http_headers || data.http_headers || {},
  };
}

function cleanupMusicProcesses(session) {
  if (session.endTimer) clearTimeout(session.endTimer);
  session.endTimer = null;
  if (session.ytdlp) session.ytdlp._musicCleanup = true;
  if (session.ffmpeg) session.ffmpeg._musicCleanup = true;
  session.ytdlp?.kill('SIGKILL');
  session.ffmpeg?.kill('SIGKILL');
  session.mp3Stream?.destroy();
  session.ytdlp = null;
  session.ffmpeg = null;
  session.mp3Stream = null;
}

function stopMusicSession(guildId, reason = null) {
  const session = musicSessions.get(guildId);
  if (!session) return false;
  session.stopped = true;
  musicSessions.delete(guildId);
  cleanupMusicProcesses(session);
  session.player?.stop(true);
  session.connection?.destroy();
  if (reason && session.textChannelId) {
    client.channels.fetch(session.textChannelId)
      .then((channel) => {
        if (channel?.isTextBased()) {
          return channel.send({ content: reason, allowedMentions: { parse: [] } });
        }
        return null;
      })
      .catch(() => {});
  }
  return true;
}

function musicUserSettings(userId) {
  const settings = store.data.musicSettings?.[userId] || {};
  const volume = MUSIC_VOLUME_OPTIONS.includes(Number(settings.volume)) ? Number(settings.volume) : 1;
  const messageDetail = Object.hasOwn(MUSIC_MESSAGE_DETAIL, settings.messageDetail) ? settings.messageDetail : 'detailed';
  const initialLoop = Object.hasOwn(MUSIC_INITIAL_LOOP, settings.initialLoop) ? settings.initialLoop : 'none';
  const disconnectDelay = Object.hasOwn(MUSIC_DISCONNECT_DELAYS, String(settings.disconnectDelay)) ? Number(settings.disconnectDelay) : 0;
  return {
    normalize: Boolean(settings.normalize),
    volume,
    messageDetail,
    initialLoop,
    disconnectDelay,
  };
}

function musicSettingEmbed(userId) {
  const settings = musicUserSettings(userId);
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎵 音楽再生の個人設定')
    .setDescription([
      'この設定は、あなたが新しく音楽再生を開始したVCに適用されます。',
      'すでに再生中のVCには途中から反映されません。',
      '他の人が開始した音楽再生には、あなたの設定は適用されません。',
      '',
      `音量均一化: **${settings.normalize ? 'ON' : 'OFF'}**`,
      '曲ごとの音量差をなるべく揃えます。',
      '',
      `デフォルト音量: **${Math.round(settings.volume * 100)}%**`,
      '再生音量を設定します。',
      '',
      `キュー追加メッセージ: **${MUSIC_MESSAGE_DETAIL[settings.messageDetail]}**`,
      '',
      `ループ初期設定: **${MUSIC_INITIAL_LOOP[settings.initialLoop]}**`,
      '再生開始時のループ設定を指定します。',
      '',
      `自動切断までの待機時間: **${MUSIC_DISCONNECT_DELAYS[settings.disconnectDelay]}**`,
      'キュー終了後、BotがVCから退出するまでの待機時間を指定します。',
    ].join('\n'));
}

function musicSettingComponents(userId) {
  const settings = musicUserSettings(userId);
  return [
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId('music-setting:normalize')
      .setPlaceholder('音量均一化')
      .addOptions(
      {
        label: '音量均一化をONにする',
        description: '曲ごとの音量差をなるべく揃えます',
        value: 'on',
        default: settings.normalize,
      },
      {
        label: '音量均一化をOFFにする',
        description: '元の音量のまま再生します',
        value: 'off',
        default: !settings.normalize,
      },
      )),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId('music-setting:volume')
      .setPlaceholder('デフォルト音量')
      .addOptions(...MUSIC_VOLUME_OPTIONS.map((volume) => ({
        label: `${Math.round(volume * 100)}%`,
        value: String(volume),
        default: settings.volume === volume,
      })))),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId('music-setting:messageDetail')
      .setPlaceholder('キュー追加メッセージ')
      .addOptions(...Object.entries(MUSIC_MESSAGE_DETAIL).map(([value, label]) => ({
        label,
        value,
        default: settings.messageDetail === value,
      })))),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId('music-setting:initialLoop')
      .setPlaceholder('ループ初期設定')
      .addOptions(...Object.entries(MUSIC_INITIAL_LOOP).map(([value, label]) => ({
        label,
        value,
        default: settings.initialLoop === value,
      })))),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId('music-setting:disconnectDelay')
      .setPlaceholder('自動切断までの待機時間')
      .addOptions(...Object.entries(MUSIC_DISCONNECT_DELAYS).map(([value, label]) => ({
        label,
        value,
        default: settings.disconnectDelay === Number(value),
      })))),
  ];
}

async function setMusicUserSetting(userId, patch) {
  store.data.musicSettings ||= {};
  store.data.musicSettings[userId] = {
    ...(store.data.musicSettings[userId] || {}),
    ...patch,
  };
  await store.save();
  return musicUserSettings(userId);
}

function ffmpegOpusOutputArgs({ normalize = false } = {}) {
  const args = [
    '-vn',
  ];
  if (normalize) args.push('-af', MUSIC_NORMALIZE_FILTER);
  args.push(
    '-c:a', 'libopus',
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '96k',
    '-f', 'ogg',
    'pipe:1',
  );
  return args;
}

function applyMusicResourceVolume(resource, volume = 1) {
  if (resource?.volume) {
    resource.volume.setVolume(Math.min(Math.max(Number(volume) || 1, 0), 2));
  }
  return resource;
}

async function createYoutubeAudioResource(url, options = {}) {
  const info = await resolveYoutubeAudioInfoWithFallback(url);
  const headerText = Object.entries(info.headers || {})
    .map(([name, value]) => `${name}: ${value}`)
    .join('\r\n');
  const ffmpegArgs = [
    '-hide_banner', '-loglevel', 'error',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
  ];
  if (headerText) ffmpegArgs.push('-headers', `${headerText}\r\n`);
  ffmpegArgs.push(
    '-i', info.url,
    ...ffmpegOpusOutputArgs(options),
  );
  const ytdlp = { once: () => {} };
  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  ffmpeg.stderr.on('data', (chunk) => console.error('ffmpeg:', chunk.toString().trim()));
  ytdlp.once('error', (error) => console.error('yt-dlpを起動できませんでした:', error.message));
  ffmpeg.once('error', (error) => console.error('ffmpegを起動できませんでした:', error.message));
  const resource = applyMusicResourceVolume(
    createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus, inlineVolume: true }),
    options.volume,
  );
  return { resource, ytdlp: null, ffmpeg };
}

function createMp3AudioResource(item, options = {}) {
  if (options.normalize) {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', item.path,
      ...ffmpegOpusOutputArgs(options),
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    ffmpeg.stderr.on('data', (chunk) => console.error('ffmpeg:', chunk.toString().trim()));
    ffmpeg.once('error', (error) => console.error('ffmpegを起動できませんでした:', error.message));
    const resource = applyMusicResourceVolume(
      createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus, inlineVolume: true }),
      options.volume,
    );
    return { resource, ytdlp: null, ffmpeg, stream: null };
  }
  const stream = fs.createReadStream(item.path);
  const resource = applyMusicResourceVolume(createAudioResource(stream, { inlineVolume: true }), options.volume);
  return { resource, ytdlp: null, ffmpeg: null, stream };
}

async function createMusicAudioResource(item, options = {}) {
  if (item.type === 'mp3') return createMp3AudioResource(item, options);
  return createYoutubeAudioResource(item.url, options);
}

function monitorMusicProcess(session, process, name) {
  if (!process) return;
  process.once('close', (code, signal) => {
    if (session.stopped || process._musicCleanup) return;
    if (code === 0 || code === null) return;
    console.error(`${name}が異常終了しました: code=${code} signal=${signal || 'none'}`);
    session.processError = true;
    session.player?.stop(true);
  });
}

async function playNextMusic(guildId) {
  const session = musicSessions.get(guildId);
  if (!session || session.stopped || session.playing) return;
  if (session.endTimer) {
    clearTimeout(session.endTimer);
    session.endTimer = null;
  }
  const next = session.queue.shift();
  if (!next) {
    if (session.disconnectDelay > 0) {
      session.endTimer = setTimeout(() => {
        if (musicSessions.get(guildId) === session && !session.stopped && !session.queue.length && !session.playing) {
          stopMusicSession(guildId, MUSIC_END_MESSAGE);
        }
      }, session.disconnectDelay * 1000);
      return;
    }
    stopMusicSession(guildId, MUSIC_END_MESSAGE);
    return;
  }
  cleanupMusicProcesses(session);
  session.current = next;
  session.playing = true;
  session.processError = false;
  try {
    const { resource, ytdlp, ffmpeg, stream } = await createMusicAudioResource(next, {
      normalize: session.normalizeAudio,
      volume: session.volume,
    });
    session.ytdlp = ytdlp;
    session.ffmpeg = ffmpeg;
    session.mp3Stream = stream || null;
    if (ytdlp) monitorMusicProcess(session, ytdlp, 'yt-dlp');
    if (ffmpeg) monitorMusicProcess(session, ffmpeg, 'ffmpeg');
    console.log('音楽再生を開始します:', musicItemLabel(next));
    session.player.play(resource);
  } catch (error) {
    console.error('音楽再生準備に失敗しました:', error.message);
    stopMusicSession(guildId, MUSIC_ERROR_END_MESSAGE);
  }
}

async function ensureMusicSession({ guild, member, textChannel, requestedBy }) {
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await textChannel.send({ content: `<@${requestedBy}> VCに入ってからYouTubeリンクを送ってください。`, allowedMentions: { users: [requestedBy] } });
    return null;
  }
  const existing = musicSessions.get(guild.id);
  if (existing) {
    if (existing.voiceChannelId !== voiceChannel.id) {
      await textChannel.send({ content: `すでに <#${existing.voiceChannelId}> で音楽を再生中です。`, allowedMentions: { parse: [] } });
      return null;
    }
    return existing;
  }
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false,
  });
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (error) {
    connection.destroy();
    throw error;
  }
  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
  const musicSettings = musicUserSettings(requestedBy);
  const session = {
    ownerId: requestedBy,
    normalizeAudio: musicSettings.normalize,
    volume: musicSettings.volume,
    messageDetail: musicSettings.messageDetail,
    disconnectDelay: musicSettings.disconnectDelay,
    textChannelId: textChannel.id,
    voiceChannelId: voiceChannel.id,
    connection,
    player,
    queue: [],
    current: null,
    loopOne: musicSettings.initialLoop === 'one',
    loopQueue: musicSettings.initialLoop === 'queue',
    playing: false,
    stopped: false,
    ytdlp: null,
    ffmpeg: null,
    endTimer: null,
    processError: false,
  };
  musicSessions.set(guild.id, session);
  player.on('stateChange', (oldState, newState) => {
    console.log(`音楽プレイヤー状態: ${oldState.status} -> ${newState.status}`);
  });
  player.on(AudioPlayerStatus.Idle, () => {
    if (session.stopped) return;
    if (session.processError) {
      stopMusicSession(guild.id, MUSIC_ERROR_END_MESSAGE);
      return;
    }
    cleanupMusicProcesses(session);
    if (session.current) {
      if (session.loopOne) {
        session.queue.unshift(session.current);
      } else if (session.loopQueue) {
        session.queue.push(session.current);
      }
    }
    session.current = null;
    session.playing = false;
    setImmediate(() => playNextMusic(guild.id));
  });
  player.on('error', (error) => {
    console.error('音楽プレイヤーエラー:', error.message);
    stopMusicSession(guild.id, MUSIC_ERROR_END_MESSAGE);
  });
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    if (session.stopped) return;
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        entersState(connection, VoiceConnectionStatus.Ready, 5_000),
      ]);
    } catch {
      if (!session.stopped && musicSessions.get(guild.id) === session) {
        stopMusicSession(guild.id, MUSIC_KICKED_MESSAGE);
      }
    }
  });
  connection.subscribe(player);
  return session;
}

async function enqueueMusic({ guild, member, textChannel, url, requestedBy }) {
  const queueInfo = await resolveYoutubeQueueItems(url);
  const items = Array.isArray(queueInfo) ? queueInfo : queueInfo.items;
  const playlist = Array.isArray(queueInfo) ? null : queueInfo.playlist;
  return enqueueMusicItems({
    guild,
    member,
    textChannel,
    items,
    requestedBy,
    playlistSummary: playlist,
  });
}

async function enqueueMusicItems({ guild, member, textChannel, items, requestedBy, playlistSummary = null }) {
  const firstYoutube = items.find((item) => item.type !== 'mp3');
  const playable = firstYoutube
    ? await checkYoutubePlayableWithFallback(firstYoutube.url)
    : { ok: true };
  if (!playable.ok) {
    console.error('YouTube事前チェックは失敗しましたが、実再生を試行します:', playable.message);
  }

  const session = await ensureMusicSession({ guild, member, textChannel, requestedBy });
  if (!session) return { accepted: false, count: 0 };
  const startPosition = (session.current || session.playing ? 1 : 0) + session.queue.length + 1;
  session.queue.push(...items);
  if (session.messageDetail === 'simple') {
    await textChannel.send({
      content: `キューに${items.length}件追加しました。`,
      allowedMentions: { parse: [] },
    });
  } else {
    const embeds = playlistSummary
      ? [await buildMusicPlaylistSummaryEmbed({
        playlistUrl: playlistSummary.url,
        count: items.length,
        member,
        playlistTitle: playlistSummary.title,
        items: playlistSummary.items || items,
      })]
      : await buildMusicQueueEmbedsSafe({ items, member, startPosition });
    await textChannel.send({
      embeds,
      allowedMentions: { parse: [] },
    });
  }
  await playNextMusic(guild.id);
  return { accepted: true, count: items.length };
}

async function canUseMusicCommand(interaction) {
  const channelId = musicCommandChannelId(interaction.guildId);
  if (channelId && interaction.channelId === channelId) return true;
  const guide = channelId
    ? `https://discord.com/channels/${interaction.guildId}/${channelId}`
    : `https://discord.com/channels/${PRIMARY_GUILD_ID}/${MUSIC_COMMAND_CHANNEL_ID}`;
  await interaction.reply({
    content: `このチャンネルで音楽bot使わないでください！${guide} でお願いします！`,
    flags: MessageFlags.Ephemeral,
  });
  return false;

  if (interaction.channelId === MUSIC_COMMAND_CHANNEL_ID) return true;
  await interaction.reply({
    content: `このチャンネルで音楽bot使わないでください！https://discord.com/channels/1519328681968009257/${MUSIC_COMMAND_CHANNEL_ID} でお願いします！`,
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

function normalizeRiotName(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

function normalizeRiotTag(value) {
  return String(value || '').trim().replace(/^[#＃]+/, '').toUpperCase();
}

async function fetchHenrikValorantAccount(name, tag) {
  const url = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const headers = { Accept: 'application/json' };
  if (HENRIK_API_KEY) headers.Authorization = HENRIK_API_KEY;
  const response = await fetch(url, { headers });
  const bodyText = await response.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = null;
  }
  if (!response.ok || !body?.data) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('VALORANT APIの認証に失敗しました。APIキーの設定を確認してください。');
    }
    if (response.status === 404) {
      throw new Error('Riot IDが見つかりませんでした。日本語名も使えますが、名前とタグを正確に入力してください。');
    }
    throw new Error('Riotアカウントを確認できませんでした。時間をおいてもう一度試してください。');
  }
  const data = body.data;
  return {
    name: data.name || name,
    tag: data.tag || tag,
    puuid: data.puuid || null,
    region: data.region || null,
    accountLevel: data.account_level ?? data.accountLevel ?? null,
    cardSmall: data.card?.small || null,
    cardWide: data.card?.wide || null,
    lastCheckedAt: new Date().toISOString(),
  };
}

async function fetchHenrikJson(pathname) {
  const headers = { Accept: 'application/json' };
  if (HENRIK_API_KEY) headers.Authorization = HENRIK_API_KEY;
  const response = await fetch(`https://api.henrikdev.xyz${pathname}`, { headers });
  const bodyText = await response.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = null;
  }
  if (!response.ok || !body?.data) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('VALORANT APIの認証に失敗しました。APIキーの設定を確認してください。');
    }
    if (response.status === 404) {
      throw new Error('対象のVALORANTデータが見つかりませんでした。');
    }
    if (response.status === 429) {
      throw new Error('VALORANT APIのレート制限に達しました。少し待ってから試してください。');
    }
    throw new Error('VALORANT APIからデータを取得できませんでした。');
  }
  return body.data;
}

function normalizeValorantRegion(value) {
  const region = String(value || VALORANT_DEFAULT_REGION || 'ap').trim().toLowerCase();
  return VALORANT_REGIONS.includes(region) ? region : 'ap';
}

async function fetchValorantMmr(name, tag, region = VALORANT_DEFAULT_REGION) {
  const safeRegion = normalizeValorantRegion(region);
  return fetchHenrikJson(`/valorant/v2/mmr/${safeRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
}

function pickFirstValue(source, paths, fallback = null) {
  for (const pathParts of paths) {
    let current = source;
    for (const part of pathParts) current = current?.[part];
    if (current !== undefined && current !== null && current !== '') return current;
  }
  return fallback;
}

function valorantRankName(mmr) {
  return pickFirstValue(mmr, [
    ['current_data', 'currenttierpatched'],
    ['current', 'tier', 'name'],
    ['current', 'tier_patched'],
    ['currenttierpatched'],
    ['tier', 'name'],
  ], 'Unrated');
}

function valorantHighestRankName(mmr) {
  return pickFirstValue(mmr, [
    ['highest_rank', 'patched_tier'],
    ['highest_rank', 'tier', 'name'],
    ['highest_rank', 'rank'],
    ['highestRank', 'patchedTier'],
  ], valorantRankName(mmr));
}

function valorantRankScore(mmr) {
  const elo = Number(pickFirstValue(mmr, [
    ['current_data', 'elo'],
    ['current', 'elo'],
    ['elo'],
  ], NaN));
  if (Number.isFinite(elo)) return elo;
  const tier = Number(pickFirstValue(mmr, [
    ['current_data', 'currenttier'],
    ['current', 'tier', 'id'],
    ['currenttier'],
  ], 0));
  const rr = Number(pickFirstValue(mmr, [
    ['current_data', 'ranking_in_tier'],
    ['current', 'rr'],
    ['ranking_in_tier'],
  ], 0));
  return tier * 100 + rr;
}

async function fetchValorantRecentMatches(account, region = VALORANT_DEFAULT_REGION) {
  const safeRegion = normalizeValorantRegion(region || account?.region);
  const paths = [];
  if (account?.puuid) {
    paths.push(`/valorant/v4/by-puuid/matches/${safeRegion}/pc/${encodeURIComponent(account.puuid)}?size=1`);
    paths.push(`/valorant/v3/by-puuid/matches/${safeRegion}/${encodeURIComponent(account.puuid)}?size=1`);
  }
  paths.push(`/valorant/v4/matches/${safeRegion}/pc/${encodeURIComponent(account.name)}/${encodeURIComponent(account.tag)}?size=1`);
  paths.push(`/valorant/v3/matches/${safeRegion}/${encodeURIComponent(account.name)}/${encodeURIComponent(account.tag)}?size=1`);

  let lastError = null;
  for (const path of paths) {
    try {
      const data = await fetchHenrikJson(path);
      const matches = Array.isArray(data) ? data : data?.matches || [];
      if (matches.length) return matches;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

function formatValorantMatchDate(value) {
  if (!value) return '不明';
  const date = typeof value === 'number'
    ? new Date(value < 10_000_000_000 ? value * 1000 : value)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

function valorantMatchMetadata(match) {
  const metadata = match?.metadata || {};
  return {
    id: metadata.match_id || metadata.matchid || metadata.matchId || '不明',
    map: metadata.map?.name || metadata.map || '不明',
    mode: metadata.queue?.name || metadata.mode || metadata.mode_id || '不明',
    startedAt: metadata.started_at || metadata.game_start || metadata.game_start_patched || null,
    rounds: metadata.rounds_played ?? metadata.rounds ?? null,
    region: metadata.region || null,
  };
}

function valorantMatchPlayers(match) {
  const players = match?.players;
  if (Array.isArray(players)) return players;
  if (Array.isArray(players?.all_players)) return players.all_players;
  return [];
}

function valorantPlayerDisplayName(player) {
  const name = player?.name || player?.game_name || player?.riot_id_name || 'Unknown';
  const tag = player?.tag || player?.tagline || player?.riot_id_tag || '';
  return tag ? `${name}#${tag}` : name;
}

function valorantPlayerTeam(player) {
  return player?.team_id || player?.team || '不明';
}

function valorantPlayerAgent(player) {
  return player?.agent?.name || player?.character || '不明';
}

function findValorantMatchPlayer(players, account) {
  const accountPuuid = String(account?.puuid || '').toLowerCase();
  if (accountPuuid) {
    const byPuuid = players.find((player) => String(player?.puuid || '').toLowerCase() === accountPuuid);
    if (byPuuid) return byPuuid;
  }
  const name = normalizeComparableName(account?.name);
  const tag = normalizeComparableName(account?.tag);
  return players.find((player) =>
    normalizeComparableName(player?.name || player?.game_name || player?.riot_id_name) === name
    && normalizeComparableName(player?.tag || player?.tagline || player?.riot_id_tag) === tag);
}

function valorantPartyGroups(players) {
  const groups = new Map();
  for (const player of players) {
    const partyId = player?.party_id || player?.partyId;
    if (!partyId) continue;
    if (!groups.has(partyId)) groups.set(partyId, []);
    groups.get(partyId).push(player);
  }
  return [...groups.entries()].map(([partyId, members]) => ({ partyId, members }));
}

function valorantPartyLabelMap(parties) {
  return new Map(parties.map((party, index) => [party.partyId, `Party ${index + 1}`]));
}

function normalizeComparableName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[＿_ー－-]/g, '');
}

function valorantAccountStore(guildId) {
  store.data.valorantAccounts ||= {};
  store.data.valorantAccounts[guildId] ||= {};
  return store.data.valorantAccounts[guildId];
}

function valorantAccountEmbed(user, account) {
  const embed = new EmbedBuilder()
    .setColor(0xff4655)
    .setTitle('VALORANTアカウント連携')
    .setDescription(`${user} は **${account.name}#${account.tag}** と連携しています。`)
    .addFields(
      { name: 'Region', value: account.region || '不明', inline: true },
      { name: 'Account Level', value: account.accountLevel == null ? '不明' : String(account.accountLevel), inline: true },
    )
    .setFooter({ text: 'HenrikDev 非公式VALORANT APIで確認しています' });
  if (account.cardSmall) embed.setThumbnail(account.cardSmall);
  return embed;
}

function valorantSettingsStore(guildId) {
  store.data.valorantSettings ||= {};
  store.data.valorantSettings[guildId] ||= {};
  return store.data.valorantSettings[guildId];
}

function valorantUserSettings(guildId, userId) {
  const settings = valorantSettingsStore(guildId);
  settings[userId] ||= {
    postMatchPartyDm: false,
    lastPartyMatchId: null,
    lastPartyCheckedAt: null,
  };
  return settings[userId];
}

function valorantSettingPanel(userId, guildId) {
  const settings = valorantUserSettings(guildId, userId);
  const embed = new EmbedBuilder()
    .setColor(0xff4655)
    .setTitle('🎯 VALORANT 個人設定')
    .setDescription([
      `試合後パーティDM通知: **${settings.postMatchPartyDm ? 'ON' : 'OFF'}**`,
      '',
      'ONにすると、試合後に直近試合データを確認し、味方・敵のパーティ情報をDMへ送信します。',
      'ONにした時点の直近試合は基準として保存し、次の試合から通知します。',
    ].join('\n'));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`valorant-setting:post-match-party-dm:${settings.postMatchPartyDm ? 'off' : 'on'}`)
      .setLabel(`試合後パーティDM通知を${settings.postMatchPartyDm ? 'OFF' : 'ON'}にする`)
      .setStyle(settings.postMatchPartyDm ? ButtonStyle.Danger : ButtonStyle.Success),
  );
  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
}

function valorantMatchId(match) {
  const metadata = match?.metadata || {};
  return metadata.match_id || metadata.matchid || metadata.matchId || match?.match_id || match?.matchId || '';
}

function valorantPartyDmText(account, match, region = VALORANT_DEFAULT_REGION) {
  const metadata = valorantMatchMetadata(match);
  const players = valorantMatchPlayers(match);
  const targetPlayer = findValorantMatchPlayer(players, account);
  const targetTeam = targetPlayer ? valorantPlayerTeam(targetPlayer) : null;
  const parties = valorantPartyGroups(players).filter((party) => party.members.length >= 2);
  const sortedParties = parties.sort((a, b) => {
    const aTeam = valorantPlayerTeam(a.members[0]);
    const bTeam = valorantPlayerTeam(b.members[0]);
    const aAlly = targetTeam && aTeam === targetTeam ? 0 : 1;
    const bAlly = targetTeam && bTeam === targetTeam ? 0 : 1;
    return aAlly - bAlly || aTeam.localeCompare(bTeam, 'ja') || b.members.length - a.members.length;
  });
  const lines = [
    `VALORANT試合後パーティ情報`,
    `${account.name}#${account.tag}`,
    `マップ: ${metadata.map}`,
    `モード: ${metadata.mode}`,
    `試合日時: ${formatValorantMatchDate(metadata.startedAt)}`,
    '',
  ];
  if (!sortedParties.length) {
    lines.push('この試合データでは、2人以上のパーティ情報を確認できませんでした。');
    return lines.join('\n');
  }
  sortedParties.forEach((party, index) => {
    const relation = targetTeam && valorantPlayerTeam(party.members[0]) === targetTeam ? '味方' : '敵';
    lines.push(`Team${index + 1}(${relation})`);
    for (const player of party.members) {
      lines.push(`${valorantPlayerDisplayName(player)} ${valorantPlayerAgent(player)}`);
    }
    lines.push('');
  });
  lines.push(`region=${normalizeValorantRegion(region || metadata.region)}`);
  return lines.join('\n').slice(0, 1900);
}

async function updateValorantPostMatchSetting(interaction, enabled) {
  const settings = valorantUserSettings(interaction.guildId, interaction.user.id);
  settings.postMatchPartyDm = enabled;
  settings.lastPartyCheckedAt = new Date().toISOString();
  if (enabled) {
    const account = valorantAccountStore(interaction.guildId)[interaction.user.id];
    if (account) {
      try {
        const matches = await fetchValorantRecentMatches(account, account.region);
        settings.lastPartyMatchId = matches[0] ? valorantMatchId(matches[0]) : null;
      } catch (error) {
        settings.lastPartyMatchId ||= null;
      }
    }
  }
  await store.save();
  await interaction.update(valorantSettingPanel(interaction.user.id, interaction.guildId));
}

let valorantPostMatchPollRunning = false;

async function pollValorantPostMatchPartyNotifications() {
  if (valorantPostMatchPollRunning) return;
  valorantPostMatchPollRunning = true;
  try {
    for (const guildId of Object.keys(store.data.valorantSettings || {})) {
      const accounts = valorantAccountStore(guildId);
      const settingsByUser = valorantSettingsStore(guildId);
      for (const [userId, settings] of Object.entries(settingsByUser)) {
        if (!settings?.postMatchPartyDm) continue;
        const account = accounts[userId];
        if (!account) continue;
        try {
          const matches = await fetchValorantRecentMatches(account, account.region);
          const match = matches[0];
          const matchId = match ? valorantMatchId(match) : '';
          settings.lastPartyCheckedAt = new Date().toISOString();
          if (!matchId || settings.lastPartyMatchId === matchId) continue;
          settings.lastPartyMatchId = matchId;
          await store.save();
          const user = await client.users.fetch(userId).catch(() => null);
          if (!user) continue;
          await user.send({ content: valorantPartyDmText(account, match, account.region), allowedMentions: { parse: [] } });
          await appendAuditLog({
            action: 'VALORANT試合後パーティDM送信',
            actor: { username: 'ばーせbot' },
            guildId,
            target: userId,
            details: matchId,
          });
        } catch (error) {
          settings.lastPartyCheckedAt = new Date().toISOString();
          settings.lastPartyError = error.message || '取得失敗';
          await store.save();
        }
      }
    }
  } finally {
    valorantPostMatchPollRunning = false;
  }
}

async function handleValorantCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === '連携') {
    const name = normalizeRiotName(interaction.options.getString('riotid', true));
    const tag = normalizeRiotTag(interaction.options.getString('tag', true));
    if (!name || !tag) {
      await interaction.reply({ content: 'Riot IDとタグを入力してください。例: `/valorant 連携 riotid:player tag:JP1`', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let account;
    try {
      account = await fetchHenrikValorantAccount(name, tag);
    } catch (error) {
      await interaction.editReply(`${error.message}\nRiot IDは「名前」と「タグ」を分けて入力してください。例: \`player#JP1\` → riotid=\`player\`, tag=\`JP1\``);
      return;
    }
    const accounts = valorantAccountStore(interaction.guildId);
    accounts[interaction.user.id] = {
      ...account,
      discordUserId: interaction.user.id,
      linkedAt: new Date().toISOString(),
    };
    await store.save();
    await interaction.editReply({
      content: `連携しました: ${account.name}#${account.tag}`,
      embeds: [valorantAccountEmbed(interaction.user, account)],
    });
    await appendAuditLog({
      action: 'VALORANT連携',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: interaction.user.id,
      details: `${account.name}#${account.tag}`,
    });
    return;
  }

  const selfValorantAccount = valorantAccountStore(interaction.guildId)[interaction.user.id];
  if (!selfValorantAccount) {
    await interaction.reply({
      content: 'このVALORANT機能を使うには、先に `/valorant 連携` でRiotアカウントを連携してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (subcommand === '確認') {
    const target = interaction.options.getUser('ユーザー') || interaction.user;
    const account = valorantAccountStore(interaction.guildId)[target.id];
    if (!account) {
      await interaction.reply({
        content: `${target.id === interaction.user.id ? 'あなた' : target.username} はまだVALORANTアカウントを連携していません。`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.reply({ embeds: [valorantAccountEmbed(target, account)], flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === 'setting') {
    await interaction.reply(valorantSettingPanel(interaction.user.id, interaction.guildId));
    return;
  }

  if (subcommand === '解除') {
    const accounts = valorantAccountStore(interaction.guildId);
    if (!accounts[interaction.user.id]) {
      await interaction.reply({ content: '連携済みのVALORANTアカウントはありません。', flags: MessageFlags.Ephemeral });
      return;
    }
    delete accounts[interaction.user.id];
    delete valorantSettingsStore(interaction.guildId)[interaction.user.id];
    await store.save();
    await interaction.reply({ content: 'VALORANTアカウント連携を解除しました。', flags: MessageFlags.Ephemeral });
    await appendAuditLog({
      action: 'VALORANT解除',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: interaction.user.id,
      details: '',
    });
  }
}

async function handleMusicPlay(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const input = interaction.options.getString('入力', true).trim();
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.voice.channel) {
    await interaction.reply({ content: '先に再生したいVCへ入ってください。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let url = extractYoutubeUrl(input);
  if (!url) {
    try {
      url = await resolveYoutubeSearchUrl(input);
    } catch (error) {
      await interaction.editReply(error.message || 'YouTube検索に失敗しました。');
      return;
    }
  }
  const result = await enqueueMusic({
    guild: interaction.guild,
    member,
    textChannel: interaction.channel,
    url,
    requestedBy: interaction.user.id,
  });
  await interaction.editReply(result.accepted
    ? 'キューに追加しました。'
    : result.reason || '音楽をキューに追加できませんでした。');
  if (result.accepted) {
    await appendAuditLog({
      action: '音楽再生',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: interaction.channelId,
      details: url,
    });
  }
}

async function handleMusicPlayMp3(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const filename = interaction.options.getString('ファイル名', true);
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.voice.channel) {
    await interaction.reply({ content: '先に再生したいVCへ入ってください。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let item;
  try {
    item = resolveMp3Item(filename);
  } catch (error) {
    await interaction.editReply(error.message || 'MP3ファイルを読み込めませんでした。');
    return;
  }
  const result = await enqueueMusicItems({
    guild: interaction.guild,
    member,
    textChannel: interaction.channel,
    items: [item],
    requestedBy: interaction.user.id,
  });
  await interaction.editReply(result.accepted
    ? 'MP3をキューに追加しました。'
    : result.reason || 'MP3をキューに追加できませんでした。');
  if (result.accepted) {
    await appendAuditLog({
      action: '音楽再生',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: interaction.channelId,
      details: `MP3: ${filename}`,
    });
  }
}

async function handleMusicStop(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const session = musicSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在再生中の音楽はありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  const canStop = session.ownerId === interaction.user.id
    || interaction.member.permissions.has(PermissionFlagsBits.MoveMembers);
  if (!canStop) {
    await interaction.reply({ content: '再生を開始した本人、または「メンバーを移動」権限を持つ人だけが停止できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  stopMusicSession(interaction.guildId);
  await interaction.reply('音楽を停止してVCから退出しました。');
}

async function handleMusicSkip(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const session = musicSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在再生中の音楽はありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  cleanupMusicProcesses(session);
  session.loopOne = false;
  session.current = null;
  session.player.stop(true);
  await interaction.reply('現在の曲をスキップしました。');
}

async function handleMusicStopSafe(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const session = musicSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在再生中の音楽はありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  const canStop = session.ownerId === interaction.user.id
    || interaction.member.permissions.has(PermissionFlagsBits.MoveMembers);
  if (!canStop) {
    await interaction.reply({ content: '再生を開始した本人、または「メンバーを移動」権限を持つ人だけが停止できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  stopMusicSession(interaction.guildId);
  await interaction.reply('音楽の再生を停止しました。');
  await appendAuditLog({
    action: '音楽停止',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: session.voiceChannelId,
    details: 'stop command',
  });
}

async function handleMusicSkipSafe(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const session = musicSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在再生中の音楽はありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  const nextItem = session.queue[0] || null;
  const nextEmbeds = nextItem
    ? await buildMusicQueueEmbedsSafe({ items: [nextItem], member: interaction.member, startPosition: 1 })
    : [];
  cleanupMusicProcesses(session);
  session.loopOne = false;
  session.current = null;
  session.player.stop(true);
  await interaction.reply({
    content: nextItem ? '現在の曲をスキップしました。次に再生する曲です。' : '現在の曲をスキップしました。',
    embeds: nextEmbeds,
    allowedMentions: { parse: [] },
  });
}

async function handleMusicLoop(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const session = musicSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在再生中の音楽はありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  session.loopOne = !session.loopOne;
  if (session.loopOne) session.loopQueue = false;
  await interaction.reply(`1曲ループを${session.loopOne ? 'ON' : 'OFF'}にしました。`);
}

async function handleMusicQueueLoop(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const session = musicSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在再生中の音楽はありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  session.loopQueue = !session.loopQueue;
  if (session.loopQueue) session.loopOne = false;
  await interaction.reply(`キュー全体ループを${session.loopQueue ? 'ON' : 'OFF'}にしました。`);
}

async function handleMusicShuffle(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  const session = musicSessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: '現在再生中の音楽はありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (session.queue.length < 2) {
    await interaction.reply({ content: 'シャッフルできる待機中の曲が2件以上ありません。', flags: MessageFlags.Ephemeral });
    return;
  }
  for (let index = session.queue.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [session.queue[index], session.queue[randomIndex]] = [session.queue[randomIndex], session.queue[index]];
  }
  const embed = await buildMusicShuffleEmbed({ session, member: interaction.member });
  await interaction.reply({
    content: `待機中のキュー${session.queue.length}件をシャッフルしました。`,
    embeds: [embed],
    allowedMentions: { parse: [] },
  });
}

async function handleMusicSetting(interaction) {
  if (!await canUseMusicCommand(interaction)) return;
  await interaction.reply({
    embeds: [musicSettingEmbed(interaction.user.id)],
    components: musicSettingComponents(interaction.user.id),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
}

async function handleMusicSettingSelect(interaction) {
  const [, key] = interaction.customId.split(':');
  const value = String(interaction.values?.[0] || '');
  const patch = {};
  if (key === 'normalize' && ['on', 'off'].includes(value)) {
    patch.normalize = value === 'on';
  } else if (key === 'volume' && MUSIC_VOLUME_OPTIONS.includes(Number(value))) {
    patch.volume = Number(value);
  } else if (key === 'messageDetail' && Object.hasOwn(MUSIC_MESSAGE_DETAIL, value)) {
    patch.messageDetail = value;
  } else if (key === 'initialLoop' && Object.hasOwn(MUSIC_INITIAL_LOOP, value)) {
    patch.initialLoop = value;
  } else if (key === 'disconnectDelay' && Object.hasOwn(MUSIC_DISCONNECT_DELAYS, value)) {
    patch.disconnectDelay = Number(value);
  } else {
    await interaction.reply({ content: '不明な音楽設定です。', flags: MessageFlags.Ephemeral });
    return;
  }
  const updated = await setMusicUserSetting(interaction.user.id, patch);
  await interaction.update({
    embeds: [musicSettingEmbed(interaction.user.id)],
    components: musicSettingComponents(interaction.user.id),
    allowedMentions: { parse: [] },
  });
  await appendAuditLog({
    action: '音楽設定変更',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: interaction.user.id,
    details: JSON.stringify(updated),
  });
}

async function getRecruitmentVoiceChannel(guild) {
  const channel = await guild.channels.fetch(RECRUITMENT_VOICE_CHANNEL_ID);
  if (!channel?.isVoiceBased() || !channel.permissionOverwrites) {
    throw new Error(`VC ${RECRUITMENT_VOICE_CHANNEL_ID} が見つからないか、ボイスチャンネルではありません。`);
  }
  return channel;
}

function privateRoomName(member) {
  return `${member.displayName || member.user.username}の部屋`;
}

function isPrivateRoomAllowedUser(roomRecord, userId) {
  return roomRecord.ownerId === userId || (roomRecord.invitedUserIds || []).includes(userId);
}

function privateRoomSettingsEmbed(roomRecord, channel) {
  const invited = roomRecord.invitedUserIds?.length
    ? roomRecord.invitedUserIds.map((id) => `<@${id}>`).join('\n')
    : 'なし';
  return new EmbedBuilder()
    .setColor(roomRecord.locked ? 0xf1c40f : 0x57f287)
    .setTitle('🔧 部屋設定')
    .setDescription(`<#${channel.id}> の設定をここからまとめて変更できます。`)
    .addFields(
      { name: '部屋主', value: `<@${roomRecord.ownerId}>`, inline: true },
      { name: '鍵', value: roomRecord.locked ? 'ON（許可された人だけ入室可）' : 'OFF（通常どおり入室可）', inline: true },
      { name: '人数上限', value: channel.userLimit ? `${channel.userLimit}人` : '無制限', inline: true },
      { name: '招待済みメンバー', value: invited.slice(0, 1024), inline: false },
    )
    .setFooter({ text: '部屋が空になると自動削除されます。' });
}

function privateRoomSettingsComponents(roomRecord) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`private-room:name:${roomRecord.channelId}`)
        .setLabel('部屋名変更')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`private-room:limit:${roomRecord.channelId}`)
        .setLabel('人数上限')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`private-room:lock:${roomRecord.channelId}`)
        .setLabel(roomRecord.locked ? '鍵を開ける' : '鍵をかける')
        .setStyle(roomRecord.locked ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`private-room:invite:${roomRecord.channelId}`)
        .setPlaceholder('招待するメンバーを選択')
        .setMinValues(1)
        .setMaxValues(1),
    ),
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`private-room:transfer:${roomRecord.channelId}`)
        .setPlaceholder('部屋主を譲渡するメンバーを選択')
        .setMinValues(1)
        .setMaxValues(1),
    ),
  ];
}

function privateRoomNameModal(channelId, currentName) {
  return new ModalBuilder()
    .setCustomId(`private-room:name-form:${channelId}`)
    .setTitle('部屋名変更')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name')
          .setLabel('新しい部屋名')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(80)
          .setValue(currentName.slice(0, 80))
          .setRequired(true),
      ),
    );
}

function privateRoomLimitModal(channelId, currentLimit) {
  return new ModalBuilder()
    .setCustomId(`private-room:limit-form:${channelId}`)
    .setTitle('人数上限')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('limit')
          .setLabel('人数上限（0で無制限）')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(2)
          .setValue(String(currentLimit || 0))
          .setPlaceholder('0〜99')
          .setRequired(true),
      ),
    );
}

async function fetchOwnedPrivateRoom(interaction, channelId = null) {
  const roomRecord = channelId
    ? store.data.privateRooms?.[channelId]
    : findPrivateRoomByOwner(interaction.guildId, interaction.user.id);
  if (!roomRecord || roomRecord.guildId !== interaction.guildId) return { roomRecord: null, channel: null };
  if (roomRecord.ownerId !== interaction.user.id) return { roomRecord, channel: null, notOwner: true };
  const channel = await interaction.guild.channels.fetch(roomRecord.channelId).catch(() => null);
  if (!channel?.isVoiceBased()) {
    delete store.data.privateRooms[roomRecord.channelId];
    await store.save();
    return { roomRecord: null, channel: null, missing: true };
  }
  return { roomRecord, channel };
}

async function applyPrivateRoomLock(channel, roomRecord) {
  const everyoneId = channel.guild.roles.everyone.id;
  roomRecord.invitedUserIds ||= [];
  if (roomRecord.locked) {
    await channel.permissionOverwrites.edit(everyoneId, {
      ViewChannel: true,
      Connect: false,
    }, { reason: '個室VCに鍵を設定' });
  } else {
    await channel.permissionOverwrites.edit(everyoneId, {
      ViewChannel: true,
      Connect: true,
    }, { reason: '個室VCの鍵を解除' });
  }
  await channel.permissionOverwrites.edit(roomRecord.ownerId, {
    ViewChannel: true,
    Connect: true,
  }, { reason: '個室VCの部屋主接続権限を設定' });
  for (const userId of roomRecord.invitedUserIds) {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: true,
      Connect: true,
    }, { reason: '個室VCの招待メンバー接続権限を設定' }).catch(() => {});
  }
}

async function disconnectUnauthorizedPrivateRoomMembers(channel, roomRecord) {
  if (!roomRecord.locked || !channel?.isVoiceBased()) return;
  await Promise.all(channel.members
    .filter((member) => !member.user.bot && !isPrivateRoomAllowedUser(roomRecord, member.id))
    .map((member) => member.voice.disconnect('鍵付き個室VCの未許可メンバーを切断').catch(() => {})));
}

async function createPrivateVoiceRoom(member) {
  const guild = member.guild;
  const source = await guild.channels.fetch(PRIVATE_ROOM_CREATE_VOICE_CHANNEL_ID).catch(() => null);
  if (!source?.isVoiceBased()) throw new Error('VC作成用チャンネルが見つかりません。');
  const existing = findPrivateRoomByOwner(guild.id, member.id);
  if (existing) {
    const existingChannel = await guild.channels.fetch(existing.channelId).catch(() => null);
    if (existingChannel?.isVoiceBased()) {
      await member.voice.setChannel(existingChannel, '既存の個室VCへ自動移動').catch(() => {});
      return existingChannel;
    }
    delete store.data.privateRooms[existing.channelId];
  }
  const room = await guild.channels.create({
    name: privateRoomName(member).slice(0, 100),
    type: ChannelType.GuildVoice,
    parent: source.parentId,
    bitrate: source.bitrate,
    userLimit: 0,
    rtcRegion: source.rtcRegion,
    videoQualityMode: source.videoQualityMode,
    permissionOverwrites: source.permissionOverwrites.cache.map((overwrite) => ({
      id: overwrite.id,
      type: overwrite.type,
      allow: overwrite.allow.bitfield,
      deny: overwrite.deny.bitfield,
    })),
    reason: 'VC作成用チャンネルから個室VCを作成',
  });
  store.data.privateRooms[room.id] = {
    guildId: guild.id,
    channelId: room.id,
    ownerId: member.id,
    invitedUserIds: [],
    locked: false,
    createdAt: new Date().toISOString(),
  };
  await room.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    Connect: true,
  }, { reason: '個室VCの部屋主接続権限を設定' }).catch(() => {});
  await store.save();
  await member.voice.setChannel(room, '個室VCへ自動移動').catch(() => {});
  await appendAuditLog({
    action: '個室VC作成',
    actor: { userId: member.id, username: member.displayName || member.user.username },
    guildId: guild.id,
    target: room.id,
    details: room.name,
  });
  return room;
}

function findPrivateRoomByOwner(guildId, ownerId) {
  return Object.values(store.data.privateRooms || {})
    .find((room) => room.guildId === guildId && room.ownerId === ownerId);
}

async function deletePrivateRoomIfEmpty(guild, channelId) {
  const room = store.data.privateRooms?.[channelId];
  if (!room) return false;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  const hasHumanMembers = channel?.isVoiceBased() && channel.members.some((member) => !member.user.bot);
  if (hasHumanMembers) return false;
  if (channel?.isVoiceBased()) {
    await channel.delete('個室VCが空になったため削除').catch((error) =>
      console.error(`個室VC ${channelId} を削除できませんでした:`, error.message));
  }
  delete store.data.privateRooms[channelId];
  await store.save();
  await appendAuditLog({
    action: '個室VC削除',
    actor: { username: 'system' },
    guildId: guild.id,
    target: channelId,
    details: room.ownerId ? `owner=${room.ownerId}` : '',
  });
  return true;
}

async function handlePrivateRoomCommand(interaction) {
  const { roomRecord, channel, notOwner } = await fetchOwnedPrivateRoom(interaction);
  if (notOwner) {
    await interaction.reply({ content: '部屋主本人だけが部屋設定を変更できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!roomRecord) {
    await interaction.reply({ content: 'あなたが部屋主の自動作成VCが見つかりません。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({
    embeds: [privateRoomSettingsEmbed(roomRecord, channel)],
    components: privateRoomSettingsComponents(roomRecord),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
}

async function updatePrivateRoomPanel(interaction, roomRecord, channel, content = null) {
  await interaction.editReply({
    content,
    embeds: [privateRoomSettingsEmbed(roomRecord, channel)],
    components: privateRoomSettingsComponents(roomRecord),
    allowedMentions: { parse: [] },
  }).catch(() => {});
}

async function handlePrivateRoomButton(interaction) {
  const [, action, channelId] = interaction.customId.split(':');
  const { roomRecord, channel, notOwner } = await fetchOwnedPrivateRoom(interaction, channelId);
  if (notOwner) {
    await interaction.reply({ content: '部屋主本人だけが部屋設定を変更できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!roomRecord) {
    await interaction.reply({ content: '対象のVCが見つかりませんでした。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (action === 'name') {
    await interaction.showModal(privateRoomNameModal(channelId, channel.name));
    return;
  }
  if (action === 'limit') {
    await interaction.showModal(privateRoomLimitModal(channelId, channel.userLimit));
    return;
  }
  if (action === 'lock') {
    await interaction.deferUpdate();
    roomRecord.locked = !roomRecord.locked;
    await applyPrivateRoomLock(channel, roomRecord);
    await disconnectUnauthorizedPrivateRoomMembers(channel, roomRecord);
    await store.save();
    await updatePrivateRoomPanel(
      interaction,
      roomRecord,
      channel,
      roomRecord.locked ? '鍵をかけました。表示はされますが、部屋主と招待済みメンバーだけ入室できます。' : '鍵を開けました。通常どおり入室できます。',
    );
  }
}

async function handlePrivateRoomModal(interaction) {
  const [, action, channelId] = interaction.customId.split(':');
  const { roomRecord, channel, notOwner } = await fetchOwnedPrivateRoom(interaction, channelId);
  if (notOwner || !roomRecord) {
    await interaction.reply({ content: notOwner ? '部屋主本人だけが部屋設定を変更できます。' : '対象のVCが見つかりませんでした。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferUpdate();
  if (action === 'name-form') {
    const name = interaction.fields.getTextInputValue('name').trim();
    await channel.setName(name, '部屋主による個室VC名変更');
    await updatePrivateRoomPanel(interaction, roomRecord, channel, `部屋名を「${name}」に変更しました。`);
    return;
  }
  if (action === 'limit-form') {
    const limit = Number(interaction.fields.getTextInputValue('limit').trim());
    if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
      await interaction.followUp({ content: '人数上限は0〜99の半角数字で入力してください。0は無制限です。', flags: MessageFlags.Ephemeral });
      return;
    }
    await channel.setUserLimit(limit, '部屋主による個室VC人数上限変更');
    await updatePrivateRoomPanel(interaction, roomRecord, channel, limit === 0 ? '人数上限を無制限にしました。' : `人数上限を${limit}人にしました。`);
  }
}

async function handlePrivateRoomUserSelect(interaction) {
  const [, action, channelId] = interaction.customId.split(':');
  const { roomRecord, channel, notOwner } = await fetchOwnedPrivateRoom(interaction, channelId);
  if (notOwner || !roomRecord) {
    await interaction.reply({ content: notOwner ? '部屋主本人だけが部屋設定を変更できます。' : '対象のVCが見つかりませんでした。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferUpdate();
  const userId = interaction.values[0];
  roomRecord.invitedUserIds ||= [];
  if (action === 'invite') {
    if (!roomRecord.invitedUserIds.includes(userId) && roomRecord.ownerId !== userId) {
      roomRecord.invitedUserIds.push(userId);
    }
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: true,
      Connect: true,
    }, { reason: '部屋主による個室VC招待' });
    await store.save();
    await updatePrivateRoomPanel(interaction, roomRecord, channel, `<@${userId}> を招待しました。`);
    return;
  }
  if (action === 'transfer') {
    const previousOwnerId = roomRecord.ownerId;
    if (!roomRecord.invitedUserIds.includes(previousOwnerId) && previousOwnerId !== userId) {
      roomRecord.invitedUserIds.push(previousOwnerId);
    }
    roomRecord.invitedUserIds = roomRecord.invitedUserIds.filter((id) => id !== userId);
    roomRecord.ownerId = userId;
    await applyPrivateRoomLock(channel, roomRecord);
    await store.save();
    await updatePrivateRoomPanel(interaction, roomRecord, channel, `<@${userId}> に部屋主を譲渡しました。`);
  }
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
  if (musicSessions.has(guildId)) return false;
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
  const globalRoute = `/applications/${CLIENT_ID}/commands`;
  const guildCommandSets = new Map([
    [PRIMARY_GUILD_ID, commands],
    [PERSONAL_MUSIC_GUILD_ID, musicCommands],
  ]);
  for (const guildId of [...guildCommandSets.keys()]) {
    if (!client.guilds.cache.has(guildId)) {
      guildCommandSets.delete(guildId);
      console.warn(`コマンド登録をスキップしました。Botが未参加のサーバーです: ${guildId}`);
    }
  }

  // 同名コマンドをグローバル登録したままサーバー登録すると、Discordの入力候補に
  // 同じコマンドが二重表示される。コマンドはサーバー単位で登録し、グローバル側は空にする。
  await rest.put(globalRoute, { body: [] });

  await Promise.all([...guildCommandSets.entries()].map(([guildId, body]) =>
    rest.put(`/applications/${CLIENT_ID}/guilds/${guildId}/commands`, { body })));
  console.log(`旧グローバルコマンドを削除し、サーバーコマンドを登録しました: main=${PRIMARY_GUILD_ID}, music=${PERSONAL_MUSIC_GUILD_ID}`);
  return;

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

function recruitmentPanel(debug = false) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(debug ? 'recruit-debug-game' : 'recruit-game')
    .setPlaceholder('募集するゲーム・イベントを選択')
    .addOptions(...Object.entries(GAMES).map(([value, game]) => ({
      label: game.label,
      value,
      emoji: game.emoji,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function emergencyRecruitmentPanel() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('recruit-emergency-game')
    .setPlaceholder('緊急募集するゲーム・イベントを選択')
    .addOptions(...Object.entries(GAMES).map(([value, game]) => ({
      label: game.label,
      value,
      emoji: game.emoji,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function recruitmentTimeModePanel(gameKey, debug = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`recruit-time-mode:${gameKey}:timestamp:${debug ? 'debug' : 'normal'}`)
      .setLabel('日時を指定する')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`recruit-time-mode:${gameKey}:free:${debug ? 'debug' : 'normal'}`)
      .setLabel('自由入力にする')
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📖 /使い方')
    .setDescription('いろんな機能あります！(ここの更新サボってるから多分これ以外の機能もあります。最新情報はばーせに聞いてみて)')
    .addFields(
      {
        name: '募集を作る',
        value: '`/募集` を実行し、ゲームを選択して募集内容・人数・日時などを入力します。人数を空欄にすると無制限になります。募集者は最初から参加者に入ります！',
      },
      {
        name: '回答',
        value: '募集メッセージ下の「参加」「未定」「不参加」を押します。同じボタンをもう一度押すと回答を取り消せます。',
      },
      {
        name: '募集の機能',
        value: '募集者だけに見えるパネルにいろいろな機能がついてます！募集限定VCとか、募集が集まったときにDMでお知らせとか。送った募集の編集・募集終了もできちゃいます！',
      },
      {
        name: '音楽再生',
        value: 'VCに入った状態で `/play` を使うと音楽をキューに追加できます。コマンドで操作する場合は `/play` `/skip` `/stop` `/loop` `/qloop` `/shuffle` `/setting` を使います。',
      },
      {
        name: '困ったときは',
        value: 'https://discord.com/channels/1519328681968009257/1519330182677401640 まで内容を投稿してください。できるだけ詳しく書いてもらえると助かります！',
      }
    )
}

function readHelpContent() {
  const fallback = [
    '募集・VC・音楽再生など、ばーせbotの基本的な使い方をまとめています。',
    '',
    'この内容は `help.md` を編集すると更新できます。',
  ].join('\n');
  try {
    if (fs.existsSync(HELP_CONTENT_FILE)) {
      const content = fs.readFileSync(HELP_CONTENT_FILE, 'utf8').trim();
      if (content) return content.slice(0, 4000);
    }
  } catch (error) {
    console.error('使い方ファイルを読み込めませんでした:', error.message);
  }
  return fallback;
}

function buildEditableHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📖 /使い方')
    .setDescription(readHelpContent());
}

function recruitmentModal(gameKey, timeMode = 'free', debug = false) {
  const game = GAMES[gameKey];
  const modal = new ModalBuilder()
    .setCustomId(`recruit-form:${gameKey}:${timeMode}:${debug ? 'debug' : 'normal'}`)
    .setTitle(`${game.label} の${debug ? 'デバッグ募集' : '募集'}`);

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
        .setLabel(timeMode === 'timestamp' ? '開始日時（YYYY-MM-DD HH:mm）' : '日時（自由入力・任意）')
        .setPlaceholder(timeMode === 'timestamp' ? '例: 2026-06-28 22:00' : '例: 今すぐ、今日22時、別ゲームが終わったら')
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

function emergencyRecruitmentModal(gameKey) {
  const game = GAMES[gameKey];
  const modal = new ModalBuilder()
    .setCustomId(`recruit-emergency-form:${gameKey}`)
    .setTitle(`${game.label} の緊急募集`);

  if (gameKey === 'other' || gameKey === 'everyone') {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('custom-game')
        .setLabel('ゲーム名・イベント名')
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
        .setPlaceholder('例: あと2人、コンペ、すぐ来れる人')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(300)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('capacity')
        .setLabel('足りない人数')
        .setPlaceholder('例: 2')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(2)
        .setRequired(true),
    ),
  );
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

function responseButtons(disabled = false, options = {}) {
  const buttons = Object.entries(STATUS).map(([key, status]) =>
    new ButtonBuilder()
      .setCustomId(`recruit:${key}`)
      .setLabel(status.label)
      .setEmoji(status.emoji)
      .setStyle(status.style)
      .setDisabled(disabled));
  if (options.waitlist) {
    buttons.push(new ButtonBuilder()
      .setCustomId('recruit-waitlist')
      .setLabel('キャンセル待ち')
      .setEmoji('⏳')
      .setStyle(ButtonStyle.Primary));
  }
  return new ActionRowBuilder().addComponents(...buttons);
}

function ownerCancelButton(messageId, limitedVoiceEnabled = false, notifyOwnerOnFull = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`recruit-complete:${messageId}`)
      .setLabel('募集終了')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`recruit-cancel:${messageId}`)
      .setLabel('募集キャンセル')
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

function ownerFullControls(messageId, limitedVoiceEnabled = false, includeReopen = true) {
  const buttons = [
    new ButtonBuilder()
      .setCustomId(`recruit-voice:${messageId}`)
      .setLabel(limitedVoiceEnabled ? '限定VCを使用中' : '限定VCで開催する')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(limitedVoiceEnabled),
  ];
  if (includeReopen) {
    buttons.push(new ButtonBuilder()
      .setCustomId(`recruit-reopen:${messageId}`)
      .setLabel('再募集する')
      .setStyle(ButtonStyle.Success));
  }
  return new ActionRowBuilder().addComponents(...buttons);
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

async function updateOwnerPanelForCompleted(recruitmentId, record) {
  const panel = ownerPanels.get(recruitmentId);
  if (!panel) return false;
  try {
    await panel.webhook.editMessage(panel.messageId, {
      content: '募集を終了しました。必要なら限定VCを開始できます。',
      components: [ownerFullControls(recruitmentId, record.limitedVoiceEnabled, false)],
    });
    return true;
  } catch (error) {
    console.error('募集者パネルを終了表示へ更新できませんでした:', error.message);
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
  return !record.closed || record.closedReason === 'full' || record.closedReason === 'completed';
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

function mentionListWithNotes(ids, notes = {}) {
  if (!ids.length) return 'なし';
  const lines = [];
  let length = 0;
  for (const id of ids) {
    const note = String(notes[id] || '').trim();
    const line = note ? `<@${id}> — ${note}` : `<@${id}>`;
    if (length + line.length + 1 > 950) break;
    lines.push(line);
    length += line.length + 1;
  }
  if (lines.length < ids.length) lines.push(`ほか ${ids.length - lines.length}人`);
  return lines.join('\n');
}

function parseRecruitmentStartTime(value) {
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const timestamp = Date.UTC(year, month - 1, day, hour - 9, minute);
  const date = new Date(timestamp);
  const jst = new Date(timestamp + 9 * 60 * 60 * 1000);
  if (
    jst.getUTCFullYear() !== year
    || jst.getUTCMonth() !== month - 1
    || jst.getUTCDate() !== day
    || jst.getUTCHours() !== hour
    || jst.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return date;
}

function formatRecruitmentWhen(record) {
  if (record.whenMode === 'timestamp' && record.startAt) {
    const unix = Math.floor(new Date(record.startAt).getTime() / 1000);
    return `<t:${unix}:F>\n<t:${unix}:R>`;
  }
  return record.when || '未定';
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
  const waitlistIds = record.waitlist || [];
  const remaining = record.capacity === null || record.capacity === undefined
    ? null
    : Math.max(record.capacity - participantIds.length, 0);
  const capacity = record.capacity === null || record.capacity === undefined
    ? ' / 無制限'
    : ` / ${record.capacity}人`;
  const footer = record.closed
    ? ({
      full: '定員に達したため募集を締め切りました',
      completed: '人数が集まったため募集を終了しました',
      cancelled: '募集はキャンセルされました',
    }[record.closedReason] || '募集は終了しました')
    : '下のボタンから回答を変更できます';

  const embed = new EmbedBuilder()
    .setColor(record.closed ? 0x747f8d : game.color)
    .setTitle(`${record.debug ? '🧪 ' : ''}${record.urgent ? '🚨 ' : ''}${game.emoji} ${title} ${record.debug ? 'デバッグ募集' : record.urgent ? '緊急募集' : '募集'}${record.closed ? '（終了）' : ''}`)
    .setDescription(record.debug
      ? `**これはデバッグ用の募集です。**\n\n${record.details}`
      : record.urgent
        ? `**@${remaining ?? record.capacity}**\n\n${record.details}`
        : record.details)
    .addFields(
      { name: '日時', value: formatRecruitmentWhen(record), inline: true },
      { name: '募集者', value: `<@${record.ownerId}>`, inline: true },
      { name: `参加 (${participantIds.length}${capacity})`, value: mentionList(participantIds), inline: false },
      { name: `未定 (${maybeIds.length})`, value: mentionListWithNotes(maybeIds, record.responseNotes), inline: true },
      { name: `不参加 (${declineIds.length})`, value: mentionListWithNotes(declineIds, record.responseNotes), inline: true },
    )
    .setFooter({ text: footer })
    .setTimestamp(new Date(record.createdAt));
  if (record.game === 'valorant' && record.partyCode) {
    embed.addFields({ name: 'パーティーコード', value: `\`${record.partyCode}\``, inline: true });
  }
  if (waitlistIds.length) {
    embed.addFields({ name: `キャンセル待ち (${waitlistIds.length})`, value: mentionList(waitlistIds), inline: false });
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

function findLatestOwnedOpenRecruitment(guildId, ownerId) {
  return Object.entries(store.data.recruitments || {})
    .filter(([, record]) =>
      record.guildId === guildId
      && record.ownerId === ownerId
      && !record.closed)
    .sort(([, a], [, b]) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map(([recruitmentId, record]) => ({ recruitmentId, record }))[0] || null;
}

function applyResponse(record, userId, response) {
  if (record.closed) return { accepted: false, reason: 'closed', full: false };
  const current = record.responses[userId];
  if (current === response) {
    delete record.responses[userId];
    if (record.responseNotes) delete record.responseNotes[userId];
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
  if (response === 'join' && record.responseNotes) delete record.responseNotes[userId];
  const participantCount = Object.values(record.responses).filter((value) => value === 'join').length;
  const full = record.capacity !== null && record.capacity !== undefined
    && participantCount >= record.capacity;
  if (full) {
    record.closed = true;
    record.closedReason = 'full';
  }
  return { accepted: true, reason: null, full };
}

function recruitmentSupplementModal(response, messageId) {
  const status = STATUS[response];
  return new ModalBuilder()
    .setCustomId(`recruit-supplement:${response}:${messageId}`)
    .setTitle(`${status?.label || '回答'}の補足`)
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('supplement')
        .setLabel('補足（任意）')
        .setPlaceholder('例: 10:00〜なら可能、途中参加ならOK など')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(300)
        .setRequired(false),
    ));
}

async function notifyRecruitmentOwnerOnResponse(record, user, response, supplement) {
  if (!['maybe', 'decline'].includes(response)) return;
  try {
    const owner = await client.users.fetch(record.ownerId);
    const statusLabel = STATUS[response]?.label || response;
    const supplementText = supplement ? `\n補足: ${supplement}` : '\n補足: なし';
    await owner.send(`${user.displayName || user.username} さんが「${recruitmentName(record)}」に「${statusLabel}」で回答しました。${supplementText}`);
  } catch (error) {
    console.error('募集者へ回答補足DMを送信できませんでした:', error.message);
  }
}

function participantIds(record) {
  return Object.entries(record.responses || {})
    .filter(([, response]) => response === 'join')
    .map(([id]) => id);
}

function hasRecruitmentVacancy(record) {
  return record.capacity === null
    || record.capacity === undefined
    || participantIds(record).length < record.capacity;
}

async function notifyUserJoinedFromWaitlist(guild, record, userId) {
  const content = `キャンセル待ちから「${recruitmentName(record)}」の参加者に繰り上がりました。`;
  const channelId = record.messageRefs?.[0]?.channelId;
  if (channelId) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased()) {
      await channel.send({ content: `<@${userId}> ${content}`, allowedMentions: { users: [userId] } }).catch(() => {});
    }
  }
  const user = await client.users.fetch(userId).catch(() => null);
  if (user) await user.send(content).catch(() => {});
}

async function promoteWaitlistIfPossible(guild, record) {
  record.waitlist ||= [];
  let promoted = false;
  while (record.waitlist.length && hasRecruitmentVacancy(record)) {
    const userId = record.waitlist.shift();
    record.responses[userId] = 'join';
    promoted = true;
    await notifyUserJoinedFromWaitlist(guild, record, userId);
  }
  if (promoted && record.capacity !== null && record.capacity !== undefined && participantIds(record).length >= record.capacity) {
    record.closed = true;
    record.closedReason = 'full';
  }
  return promoted;
}

async function closeRecruitmentPanel(guild, recruitmentId, record, reason) {
  record.closed = true;
  record.closedReason = reason;
  record.voiceAccessRevoked = true;
  await store.save();
  await syncVoiceAccess(guild).catch((error) => console.error('募集VCの参加権限を更新できませんでした:', error.message));
  await editRecruitmentMessages(record);
  await resetVoiceAccessIfEmpty(guild).catch(() => {});
  leaveBotVoiceIfNoRecruitments(guild.id);
  if (reason === 'full') await updateOwnerPanelForFull(recruitmentId, record);
  else if (reason === 'completed') await updateOwnerPanelForCompleted(recruitmentId, record);
  else await deleteOwnerPanel(recruitmentId);
}

async function notifyRecruitmentStartTimes() {
  const now = Date.now();
  let changed = false;
  for (const record of Object.values(store.data.recruitments || {})) {
    if (!record.startAt || record.startNotificationSent) continue;
    if (new Date(record.startAt).getTime() > now) continue;
    const ids = participantIds(record);
    if (!ids.length) {
      record.startNotificationSent = true;
      changed = true;
      continue;
    }
    const content = `「${recruitmentName(record)}」の開始時刻です。`;
    const channelId = record.messageRefs?.[0]?.channelId;
    if (channelId) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send({
          content: `${ids.map((id) => `<@${id}>`).join(' ')}\n${content}`,
          allowedMentions: { users: ids },
        }).catch((error) => console.error('開始通知を募集チャンネルへ送信できませんでした:', error.message));
      }
    }
    await Promise.allSettled(ids.map(async (id) => {
      const user = await client.users.fetch(id);
      await user.send(content);
    }));
    record.startNotificationSent = true;
    changed = true;
  }
  if (changed) await store.save();
}

async function editRecruitmentMessages(record) {
  const references = record.messageRefs || [];
  const payload = {
    embeds: [buildRecruitmentEmbed(record)],
    components: [responseButtons(record.closed && record.closedReason !== 'full', {
      waitlist: record.closed && record.closedReason === 'full',
    })],
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

async function handleRecruitment(interaction, debug = false) {
  if (debug && !canUseRecruitmentDebug(interaction)) {
    await interaction.reply({ content: 'このコマンドは管理者のみ使用できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({
    content: debug
      ? 'デバッグ募集を作成します。ゲーム・イベントを選択してください。メンションは送信されません。'
      : '募集するゲーム・イベントを選択してください。選択後に入力画面が開きます。',
    components: [recruitmentPanel(debug)],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEmergencyRecruitment(interaction) {
  await interaction.reply({
    content: '緊急募集するゲーム・イベントを選択してください。選択後に入力画面が開きます。',
    components: [emergencyRecruitmentPanel()],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleHelp(interaction) {
  await interaction.reply({
    embeds: [buildEditableHelpEmbed()],
    flags: MessageFlags.Ephemeral,
  });
}

function schedulePollModal() {
  return new ModalBuilder()
    .setCustomId('schedule-poll-form')
    .setTitle('日程調整募集')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('募集名')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('details')
          .setLabel('内容')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(300)
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('candidates')
          .setLabel('候補日時（1行に1候補・最大10件）')
          .setPlaceholder('例:\n6/28 21:00\n6/29 22:00\n7/1 20:30')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(800)
          .setRequired(true),
      ),
    );
}

function schedulePollEmbed(record) {
  const counts = record.candidates.map((candidate, index) => {
    const voters = Object.entries(record.votes || {})
      .filter(([, values]) => values.includes(String(index)))
      .map(([id]) => id);
    return `**${index + 1}. ${candidate}** — ${voters.length}人\n${mentionList(voters)}`;
  });
  return new EmbedBuilder()
    .setColor(record.closed ? 0x747f8d : 0x57f287)
    .setTitle(`日程調整: ${record.title}${record.closed ? '（確定）' : ''}`)
    .setDescription(record.details || '参加できる候補を複数選択してください。')
    .addFields(
      { name: '候補', value: counts.join('\n\n').slice(0, 4096) || 'なし', inline: false },
      { name: '募集主', value: `<@${record.ownerId}>`, inline: true },
    )
    .setFooter({ text: record.closed ? `確定日程: ${record.finalCandidate || '未設定'}` : '複数選択できます。募集主が最後に確定します。' })
    .setTimestamp(new Date(record.createdAt));
}

function schedulePollComponents(pollId, record) {
  if (record.closed) return [];
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`schedule-vote:${pollId}`)
    .setPlaceholder('参加できる日程を選択')
    .setMinValues(0)
    .setMaxValues(Math.min(record.candidates.length, 10))
    .addOptions(record.candidates.slice(0, 10).map((candidate, index) => ({
      label: `${index + 1}. ${candidate}`.slice(0, 100),
      value: String(index),
    })));
  const finalize = new ButtonBuilder()
    .setCustomId(`schedule-finalize:${pollId}`)
    .setLabel('最多の日程で確定')
    .setStyle(ButtonStyle.Success);
  return [
    new ActionRowBuilder().addComponents(menu),
    new ActionRowBuilder().addComponents(finalize),
  ];
}

async function editSchedulePollMessage(pollId, record) {
  const channel = await client.channels.fetch(record.channelId);
  if (!channel?.isTextBased()) return false;
  const message = await channel.messages.fetch(record.messageId);
  await message.edit({
    embeds: [schedulePollEmbed(record)],
    components: schedulePollComponents(pollId, record),
    allowedMentions: { parse: [] },
  });
  return true;
}

async function handleSchedulePoll(interaction) {
  await interaction.showModal(schedulePollModal());
}

async function handleSchedulePollForm(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const candidates = interaction.fields.getTextInputValue('candidates')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (candidates.length < 2) {
    await interaction.editReply('候補日時は2件以上入力してください。');
    return;
  }
  const record = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: null,
    ownerId: interaction.user.id,
    title: interaction.fields.getTextInputValue('title').trim(),
    details: interaction.fields.getTextInputValue('details').trim(),
    candidates,
    votes: {},
    closed: false,
    finalCandidate: null,
    createdAt: new Date().toISOString(),
  };
  const message = await interaction.channel.send({
    embeds: [schedulePollEmbed(record)],
    components: schedulePollComponents('pending', record),
    allowedMentions: { parse: [] },
  });
  record.messageId = message.id;
  store.data.schedulePolls[message.id] = record;
  await store.save();
  await message.edit({ components: schedulePollComponents(message.id, record) });
  await interaction.editReply('日程調整募集を作成しました。');
}

async function handleScheduleVote(interaction) {
  const pollId = interaction.customId.split(':')[1];
  const record = store.data.schedulePolls?.[pollId];
  if (!record || record.guildId !== interaction.guildId || record.closed) {
    await interaction.reply({ content: 'この日程調整募集は見つからないか、終了しています。', flags: MessageFlags.Ephemeral });
    return;
  }
  record.votes[interaction.user.id] = interaction.values;
  await store.save();
  await editSchedulePollMessage(pollId, record);
  await interaction.reply({ content: '回答を更新しました。', flags: MessageFlags.Ephemeral });
}

async function handleScheduleFinalize(interaction) {
  const pollId = interaction.customId.split(':')[1];
  const record = store.data.schedulePolls?.[pollId];
  if (!record || record.guildId !== interaction.guildId) {
    await interaction.reply({ content: 'この日程調整募集が見つかりません。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (record.ownerId !== interaction.user.id) {
    await interaction.reply({ content: '募集主だけが日程を確定できます。', flags: MessageFlags.Ephemeral });
    return;
  }
  const counts = record.candidates.map((_, index) =>
    Object.values(record.votes || {}).filter((values) => values.includes(String(index))).length);
  const bestIndex = counts.reduce((best, count, index) => count > counts[best] ? index : best, 0);
  record.closed = true;
  record.finalCandidate = record.candidates[bestIndex];
  await store.save();
  await editSchedulePollMessage(pollId, record);
  await interaction.reply({ content: `日程を「${record.finalCandidate}」で確定しました。`, flags: MessageFlags.Ephemeral });
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

function canUseAdminCommand(interaction) {
  const roles = interaction.member?.roles;
  const hasAdminRole = roles?.cache?.has?.(ADMIN_ROLE_ID)
    || (Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID));
  return interaction.channelId === ADMIN_COMMAND_CHANNEL_ID
    && hasAdminRole;
}

function canUseRecruitmentDebug(interaction) {
  const roles = interaction.member?.roles;
  const hasAdminRole = roles?.cache?.has?.(ADMIN_ROLE_ID)
    || (Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID));
  return hasAdminRole || interaction.memberPermissions?.has?.(PermissionFlagsBits.Administrator);
}

function canUseAdminAnnouncement(interaction) {
  return canUseAdminCommand(interaction);
}

function setBotVersionPresence(version = store.data.botVersion || DEFAULT_BOT_VERSION) {
  if (!client.user || !version) return;
  client.user.setActivity(`Ver ${version}`, { type: ActivityType.Playing });
}

async function syncBotProfileDescription() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.patch('/applications/@me', {
    body: { description: BOT_PROFILE_DESCRIPTION },
  });
}

function quoteBlock(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');
}

function formatAnnouncementContent(title, body, footer = '', imageUrl = '') {
  return [
    `**${String(title || '').trim()}**`,
    quoteBlock(String(body || '').trim()),
    footer ? `\n${footer}` : '',
    imageUrl ? `\n${imageUrl}` : '',
  ].join('').slice(0, 2000);
}

function updateInfoModal() {
  return new ModalBuilder()
    .setCustomId('update-info-form')
    .setTitle('BOT更新情報を作成')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('version')
          .setLabel('バージョン（例: 1.2）')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('例: 1.2')
          .setValue(String(store.data.botVersion || DEFAULT_BOT_VERSION).replace(/^v/i, ''))
          .setRequired(true)
          .setMaxLength(12),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('items')
          .setLabel('更新内容（・見出し で複数項目）')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('・音楽機能の充足\n本文をここに書く\n\n・募集機能の修正\n本文をここに書く')
          .setRequired(true)
          .setMaxLength(1800),
      ),
    );
}

function parseUpdateInfoSections(rawItems) {
  const normalizedLines = String(rawItems || '').replace(/\r\n/g, '\n').split('\n');
  const parsedSections = [];
  let parsedCurrent = null;
  for (const line of normalizedLines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^[・･]\s*(.+)$/);
    if (match) {
      if (parsedCurrent) parsedSections.push(parsedCurrent);
      parsedCurrent = { heading: match[1].trim(), body: [] };
    } else if (parsedCurrent) {
      parsedCurrent.body.push(line.trimEnd());
    } else if (trimmed) {
      parsedCurrent = { heading: trimmed, body: [] };
    }
  }
  if (parsedCurrent) parsedSections.push(parsedCurrent);
  return parsedSections
    .map((section) => ({
      heading: section.heading || '更新内容',
      body: section.body.join('\n').trim(),
    }))
    .filter((section) => section.heading || section.body);

  const lines = rawItems.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^・\s*(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line.trimEnd());
    } else if (trimmed) {
      current = { heading: trimmed, body: [] };
    }
  }
  if (current) sections.push(current);
  return sections
    .map((section) => ({
      heading: section.heading || '更新内容',
      body: section.body.join('\n').trim(),
    }))
    .filter((section) => section.heading || section.body);
}

function formatUpdateInfoContent(version, rawItems) {
  const formattedSections = parseUpdateInfoSections(rawItems);
  const formattedBody = formattedSections.map((section) => (
    section.body
      ? `## ・${section.heading}\n**${section.body}**`
      : `## ・${section.heading}`
  )).join('\n\n');
  return [
    `## 🤖BOT更新情報 Ver ${version}`,
    '',
    formattedBody || '## ・更新内容\n**詳細はありません。**',
  ].join('\n').slice(0, 2000);

  const sections = parseUpdateInfoSections(rawItems);
  const body = sections.map((section) => {
    return section.body
      ? `## ・${section.heading}\n${section.body}`
      : `## ・${section.heading}`;
  }).join('\n\n');
  return [
    '# 🤖BOT更新情報',
    `### Ver${version}`,
    '',
    body || '## ・更新内容\n詳細はありません。',
  ].join('\n').slice(0, 2000);
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

async function handleUpdateInfo(interaction) {
  if (!canUseAdminAnnouncement(interaction)) {
    await interaction.reply({
      content: `このコマンドは管理者ロールを持つ人が <#${ADMIN_COMMAND_CHANNEL_ID}> でのみ使用できます。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await interaction.showModal(updateInfoModal());
}

async function handleUpdateInfoForm(interaction) {
  if (!canUseAdminAnnouncement(interaction)) {
    await interaction.reply({
      content: `このコマンドは管理者ロールを持つ人が <#${ADMIN_COMMAND_CHANNEL_ID}> でのみ使用できます。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const version = interaction.fields.getTextInputValue('version').trim().replace(/^v/i, '');
  const rawItems = interaction.fields.getTextInputValue('items').trim();
  if (!/^\d+\.\d+$/.test(version)) {
    await interaction.reply({ content: 'バージョンは `1.2` や `0.1` のように、数字1つ＋小数1つの形式で入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!parseUpdateInfoSections(rawItems).length) {
    await interaction.reply({ content: '更新内容を `・見出し` 形式で1件以上入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  const channel = await interaction.guild.channels.fetch(ADMIN_ANNOUNCEMENT_CHANNEL_ID);
  if (!channel?.isTextBased()) throw new Error('お知らせチャンネルが見つかりません。');
  const content = formatUpdateInfoContent(version, rawItems);
  await channel.send({ content, allowedMentions: { parse: [] } });
  store.data.botVersion = version;
  await store.save();
  setBotVersionPresence(version);
  await appendAuditLog({
    action: '更新情報送信',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: ADMIN_ANNOUNCEMENT_CHANNEL_ID,
    details: `Ver ${version}`,
  });
  await interaction.reply({ content: `更新情報 Ver ${version} を <#${ADMIN_ANNOUNCEMENT_CHANNEL_ID}> に送信しました。`, flags: MessageFlags.Ephemeral });
}

async function handleAdminChannelMessage(interaction) {
  if (!canUseAdminCommand(interaction)) {
    await interaction.reply({
      content: `このコマンドは管理者ロールを持つ人が <#${ADMIN_COMMAND_CHANNEL_ID}> でのみ使用できます。`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const targetChannel = interaction.options.getChannel('チャンネル', true);
  const content = interaction.options.getString('本文', true).trim();
  if (!content) {
    await interaction.reply({ content: '本文を入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  const channel = await interaction.guild.channels.fetch(targetChannel.id).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: '送信先はテキストを送信できるチャンネルを指定してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  await channel.send({
    content,
    allowedMentions: { parse: ['users', 'roles', 'everyone'] },
  });
  await appendAuditLog({
    action: '指定チャンネル送信',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: channel.id,
    details: content.slice(0, 120),
  });
  await interaction.reply({
    content: `<#${channel.id}> に送信しました。`,
    flags: MessageFlags.Ephemeral,
  });
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
  const title = interaction.fields.getTextInputValue('title').trim();
  const body = interaction.fields.getTextInputValue('body').trim();
  const footer = interaction.fields.getTextInputValue('footer').trim();
  const content = formatAnnouncementContent(title, body, footer, imageUrl);
  const channel = await interaction.guild.channels.fetch(ADMIN_ANNOUNCEMENT_CHANNEL_ID);
  if (!channel?.isTextBased()) throw new Error('お知らせチャンネルが見つかりません。');
  await channel.send({ content, allowedMentions: { parse: ['users', 'roles', 'everyone'] } });
  await appendAuditLog({
    action: 'お知らせ送信',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: ADMIN_ANNOUNCEMENT_CHANNEL_ID,
    details: title,
  });
  await interaction.reply({ content: `お知らせを <#${ADMIN_ANNOUNCEMENT_CHANNEL_ID}> に送信しました。`, flags: MessageFlags.Ephemeral });
}

let adminWebServer = null;

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function adminWebAuthorized(request) {
  if (!ADMIN_WEB_PASSWORD) return false;
  const header = request.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  return decoded.slice(separator + 1) === ADMIN_WEB_PASSWORD;
}

function sendAdminWeb(response, status, body, headers = {}) {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(body);
}

function redirectAdminWeb(response, message = '') {
  response.writeHead(303, {
    location: message ? `/?message=${encodeURIComponent(message)}` : '/',
    'cache-control': 'no-store',
  });
  response.end();
}

function redirectAdminWebPath(response, pathname, message = '') {
  response.writeHead(303, {
    location: message ? `${pathname}?message=${encodeURIComponent(message)}` : pathname,
    'cache-control': 'no-store',
  });
  response.end();
}

function isAdminWebAjax(request) {
  return request.headers['x-requested-with'] === 'fetch';
}

function sendAdminJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function redirectAdminWebPathOrJson(request, response, pathname, message = '') {
  if (isAdminWebAjax(request)) {
    sendAdminJson(response, 200, { ok: true, message });
    return;
  }
  redirectAdminWebPath(response, pathname, message);
}

function readRequestBody(request, limit = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('送信データが大きすぎます。'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function readUrlEncodedForm(request) {
  const body = await readRequestBody(request, 2 * 1024 * 1024);
  return Object.fromEntries(new URLSearchParams(body.toString('utf8')).entries());
}

async function readJsonBody(request, limit = 2 * 1024 * 1024) {
  const body = await readRequestBody(request, limit);
  if (!body.length) return {};
  return JSON.parse(body.toString('utf8'));
}

function parseMultipart(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1]
    || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];
  if (!boundary) throw new Error('アップロード形式を解析できません。');
  const delimiter = Buffer.from(`--${boundary}`);
  const result = {};
  let cursor = buffer.indexOf(delimiter);
  while (cursor >= 0) {
    const next = buffer.indexOf(delimiter, cursor + delimiter.length);
    if (next < 0) break;
    let part = buffer.subarray(cursor + delimiter.length, next);
    if (part.subarray(0, 2).toString() === '\r\n') part = part.subarray(2);
    if (part.subarray(part.length - 2).toString() === '\r\n') part = part.subarray(0, part.length - 2);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd > 0) {
      const headerText = part.subarray(0, headerEnd).toString('utf8');
      const content = part.subarray(headerEnd + 4);
      const name = headerText.match(/name="([^"]+)"/)?.[1];
      const filename = headerText.match(/filename="([^"]*)"/)?.[1];
      if (name) result[name] = filename !== undefined
        ? { filename, content }
        : content.toString('utf8');
    }
    cursor = next;
  }
  return result;
}

function ensureFortuneItems() {
  store.data.fortuneDraws ||= {};
  store.data.fortuneRecentDraws ||= {};
  if (!Array.isArray(store.data.fortuneItems) || !store.data.fortuneItems.length) {
    store.data.fortuneItems = DEFAULT_FORTUNE_ITEMS.map((item, index) => ({
      id: `default-${index + 1}`,
      ...item,
    }));
    return;
  }
  store.data.fortuneItems = migrateFortuneItems(store.data.fortuneItems);
}

function migrateFortuneItems(items) {
  const oldRegularItems = items.filter((item) =>
    item?.type !== 'love' && item.category && item.content && !item.sections);
  const modernItems = items.filter((item) =>
    !(item?.type !== 'love' && item.category && item.content && !item.sections));
  if (!oldRegularItems.length) return items.map((item) => normalizeFortuneItem(item));

  const fallbackRegulars = DEFAULT_FORTUNE_ITEMS.filter((item) => item.type === 'regular');
  const grouped = new Map();
  for (const item of oldRegularItems) {
    const fortune = String(item.fortune || '未設定');
    if (!grouped.has(fortune)) {
      const fallback = fallbackRegulars.find((entry) => entry.fortune === fortune) || fallbackRegulars[0] || {};
      grouped.set(fortune, normalizeFortuneItem({
        id: item.id || crypto.randomUUID(),
        type: 'regular',
        fortune,
        sections: fallback.sections || {},
      }));
    }
    const next = grouped.get(fortune);
    if (FORTUNE_CATEGORIES.includes(item.category)) {
      next.sections[item.category] = String(item.content || '');
    }
  }
  return [
    ...modernItems.map((item) => normalizeFortuneItem(item)),
    ...grouped.values(),
  ];
}

function normalizeFortuneItem(item) {
  const type = item?.type === 'love' ? 'love' : 'regular';
  if (type === 'love') {
    return {
      id: item.id || crypto.randomUUID(),
      type,
      category: '',
      fortune: String(item.fortune || ''),
      content: String(item.content || ''),
      enabled: item.enabled,
    };
  }
  const sections = {};
  for (const category of FORTUNE_CATEGORIES) {
    sections[category] = String(item.sections?.[category] || '');
  }
  if (item.category && FORTUNE_CATEGORIES.includes(item.category) && item.content) {
    sections[item.category] ||= String(item.content);
  }
  return {
    id: item.id || crypto.randomUUID(),
    type,
    category: '',
    fortune: String(item.fortune || ''),
    sections,
    enabled: item.enabled,
  };
}

function jstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(date);
}

function randomPick(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function fortuneItemsByType(type) {
  ensureFortuneItems();
  return (store.data.fortuneItems || [])
    .filter((item) => item && item.type === type && item.enabled !== false);
}

function fortuneRecentKey(guildId, userId, type) {
  return `${guildId}:${userId}:${type}`;
}

function recentFortuneIds(guildId, userId, type) {
  store.data.fortuneRecentDraws ||= {};
  return (store.data.fortuneRecentDraws[fortuneRecentKey(guildId, userId, type)] || [])
    .map((entry) => typeof entry === 'string' ? entry : entry?.itemId)
    .filter(Boolean)
    .slice(0, 3);
}

function rememberRecentFortune(guildId, userId, type, item) {
  if (!item?.id) return;
  store.data.fortuneRecentDraws ||= {};
  const key = fortuneRecentKey(guildId, userId, type);
  const previous = store.data.fortuneRecentDraws[key] || [];
  store.data.fortuneRecentDraws[key] = [
    { itemId: item.id, drawnAt: new Date().toISOString() },
    ...previous.filter((entry) => (typeof entry === 'string' ? entry : entry?.itemId) !== item.id),
  ].slice(0, 3);
}

function buildFortuneEmbed(type, user, results) {
  const isLove = type === 'love';
  const embed = new EmbedBuilder()
    .setColor(isLove ? 0xff7ab6 : 0xf2c94c)
    .setTitle(isLove ? '💘 今日の恋みくじ' : '⛩️ 今日のおみくじ')
    .setDescription(`${user} さんの今日の結果です。`)
    .setTimestamp(new Date());

  if (isLove) {
    const item = results[0];
    embed.addFields({
      name: item?.fortune ? `運勢: ${item.fortune}` : '運勢',
      value: item?.content || 'まだ恋みくじが設定されていません。',
    });
    return embed;
  }

  const item = results[0];
  embed.addFields({
    name: '運勢',
    value: item?.fortune ? `**${item.fortune}**` : '未設定',
    inline: false,
  });
  for (const category of FORTUNE_CATEGORIES) {
    embed.addFields({
      name: category,
      value: item?.sections?.[category] || '未設定',
      inline: false,
    });
  }
  return embed;
}

function drawFortune(type, guildId = null, userId = null) {
  if (type === 'love') {
    const items = fortuneItemsByType('love');
    const recentIds = guildId && userId ? new Set(recentFortuneIds(guildId, userId, type)) : new Set();
    const candidates = items.filter((item) => !recentIds.has(item.id));
    return [randomPick(candidates.length ? candidates : items)].filter(Boolean);
  }
  const items = fortuneItemsByType('regular');
  const recentIds = guildId && userId ? new Set(recentFortuneIds(guildId, userId, type)) : new Set();
  const candidates = items.filter((item) => !recentIds.has(item.id));
  return [randomPick(candidates.length ? candidates : items)].filter(Boolean);
}

async function handleFortune(interaction, type) {
  ensureFortuneItems();
  const today = jstDateKey();
  const drawKey = `${interaction.guildId}:${interaction.user.id}:${type}:${today}`;
  store.data.fortuneDraws ||= {};
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    || interaction.member?.roles?.cache?.has(ADMIN_ROLE_ID);
  if (!isAdmin && store.data.fortuneDraws[drawKey]) {
    await interaction.reply({
      content: 'このおみくじを引けるのは一日一回までです！\nまた明日引きに来てね！',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const results = drawFortune(type, interaction.guildId, interaction.user.id);
  for (const item of results) rememberRecentFortune(interaction.guildId, interaction.user.id, type, item);
  if (!isAdmin) {
    store.data.fortuneDraws[drawKey] = {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      type,
      date: today,
      resultIds: results.map((item) => item.id),
      createdAt: new Date().toISOString(),
    };
  }
  await store.save();

  await interaction.reply({
    embeds: [buildFortuneEmbed(type, interaction.user.toString(), results)],
    allowedMentions: { users: [interaction.user.id], roles: [] },
  });
}

function formatJst(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function botStatusSummary() {
  const openRecruitments = Object.values(store.data.recruitments || {})
    .filter((record) => !record.closed).length;
  const privateRoomCount = Object.values(store.data.privateRooms || {}).length;
  const playingMusic = [...musicSessions.values()].some((session) => session.current || session.queue?.length);
  return [
    ['Bot稼働', client.isReady() ? '稼働中' : '停止中'],
    ['Discord接続', client.ws?.status === 0 ? '接続中' : `状態 ${client.ws?.status ?? '-'}`],
    ['登録コマンド数', String(commands.length + musicCommands.length)],
    ['現在のBot Ver', `Ver ${store.data.botVersion || DEFAULT_BOT_VERSION}`],
    ['音楽再生中', playingMusic ? '再生中' : '停止中'],
    ['開いている募集数', `${openRecruitments}件`],
    ['作成中の個室VC数', `${privateRoomCount}件`],
  ];
}

function auditLogsTable(limit = 120) {
  const rows = auditLogRows(limit);
  if (!rows.length) return '<p><small>まだ記録はありません。</small></p>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>日時</th><th>実行者</th><th>操作</th><th>対象</th><th>詳細</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${htmlEscape(formatJst(row.time))}</td>
      <td>${htmlEscape(row.username || '-')}${row.userId ? `<br><small>${htmlEscape(row.userId)}</small>` : ''}</td>
      <td>${htmlEscape(row.action)}</td>
      <td>${htmlEscape(row.target || '-')}</td>
      <td>${htmlEscape(row.details || '-')}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function upsertSupportTicket(thread, { author = null, title = '', content = '', url = '', status = 'open' } = {}) {
  if (!thread?.id) return null;
  store.data.supportTickets ||= {};
  const existing = store.data.supportTickets[thread.id] || {};
  const next = {
    threadId: thread.id,
    guildId: thread.guildId || thread.guild?.id || existing.guildId || PRIMARY_GUILD_ID,
    title: title || thread.name || existing.title || 'サポート投稿',
    content: String(content || existing.content || '').slice(0, 1000),
    url: url || thread.url || existing.url || '',
    authorId: author?.id || thread.ownerId || existing.authorId || null,
    authorName: author?.displayName || author?.username || existing.authorName || '不明',
    status: existing.status === 'resolved' ? existing.status : status,
    assigneeId: existing.assigneeId || null,
    assigneeName: existing.assigneeName || null,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.data.supportTickets[thread.id] = next;
  return next;
}

function supportTicketRows(statuses) {
  const statusSet = new Set(statuses);
  return Object.values(store.data.supportTickets || {})
    .filter((ticket) => statusSet.has(ticket.status))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function supportTicketsTable(rows) {
  if (!rows.length) return '<p><small>対象の投稿はありません。</small></p>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>更新日時</th><th>状態</th><th>タイトル</th><th>投稿者</th><th>担当者</th><th>リンク</th></tr></thead>
    <tbody>${rows.map((ticket) => `<tr>
      <td>${htmlEscape(formatJst(ticket.updatedAt || ticket.createdAt))}</td>
      <td>${htmlEscape(ticket.status)}</td>
      <td>${htmlEscape(ticket.title || '-')}</td>
      <td>${ticket.authorId ? `&lt;@${htmlEscape(ticket.authorId)}&gt;` : htmlEscape(ticket.authorName || '-')}</td>
      <td>${ticket.assigneeId ? `&lt;@${htmlEscape(ticket.assigneeId)}&gt;` : '-'}</td>
      <td>${ticket.url ? `<a href="${htmlEscape(ticket.url)}" target="_blank" rel="noreferrer">開く</a>` : '-'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function adminWebPage(message = '') {
  const help = readHelpContent();
  const logs = adminWebLogs.slice(-120).reverse();
  const botVersion = store.data.botVersion || DEFAULT_BOT_VERSION;
  const statusItems = botStatusSummary();
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ばーせbot 管理</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f7fb;color:#202225;margin:0}
    header{background:#5865f2;color:white;padding:18px 22px}
    main{max-width:1100px;margin:0 auto;padding:20px;display:grid;gap:18px}
    section{background:white;border:1px solid #ddd;border-radius:12px;padding:18px;box-shadow:0 2px 8px #0000000d}
    h1{margin:0;font-size:24px} h2{margin:0 0 12px;font-size:18px}
    label{display:block;font-weight:700;margin:10px 0 5px}
    input,textarea,select{width:100%;box-sizing:border-box;border:1px solid #c8ccd6;border-radius:8px;padding:10px;font:inherit}
    input[type="checkbox"]{width:auto}
    .check-label{display:flex;gap:8px;align-items:center;font-weight:700;margin:12px 0}
    textarea{min-height:120px}
    button{background:#5865f2;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
    .button-link{display:inline-block;background:#5865f2;color:white;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:700}
    .message{background:#e8f5e9;border:1px solid #9ccc9c;border-radius:8px;padding:10px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
    .status-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
    .status-card{background:#f4f6ff;border:1px solid #dfe3ff;border-radius:10px;padding:12px}
    .status-card small{display:block;color:#666}.status-card strong{font-size:18px}
    .table-wrap{overflow:auto}
    table{width:100%;border-collapse:collapse;background:white}
    th,td{border-bottom:1px solid #e3e5ec;padding:8px;text-align:left;vertical-align:top}
    th{background:#f0f2f7;font-size:13px}
    pre{white-space:pre-wrap;background:#111;color:#ddd;border-radius:8px;padding:12px;max-height:420px;overflow:auto}
    small{color:#666}
  </style>
</head>
<body>
  <header><h1>ばーせbot 管理</h1><div>現在のBot Ver ${htmlEscape(botVersion)}</div></header>
  <main>
    ${message ? `<div class="message">${htmlEscape(message)}</div>` : ''}
    <section>
      <h2>Bot状態ダッシュボード</h2>
      <div class="status-grid">
        ${statusItems.map(([label, value]) => `<div class="status-card"><small>${htmlEscape(label)}</small><strong>${htmlEscape(value)}</strong></div>`).join('')}
      </div>
    </section>
    <section>
      <h2>サポートセンター管理</h2>
      <a class="button-link" href="/support">サポート管理を開く</a>
    </section>
    <section>
      <h2>権限ログ</h2>
      <p><small>誰が、いつ、何を実行したかを直近120件まで表示します。</small></p>
      ${auditLogsTable(120)}
    </section>
    <div class="grid">
      <section>
        <h2>VALORANTメンバー一覧</h2>
        <p>VALORANTロールが付いているメンバーのRiot連携状況と最高ランクを確認できます。</p>
        <a class="button-link" href="/valorant-members">一覧を開く</a>
      </section>
      <section>
        <h2>おみくじ管理</h2>
        <p><small>/おみくじ と /恋みくじ の結果候補、運勢、本文を編集します。</small></p>
        <a class="button-link" href="/fortune">おみくじ設定を開く</a>
      </section>
      <section>
        <h2>使い方を編集</h2>
        <form method="post" action="/help">
          <label>表示内容</label>
          <textarea name="content" style="min-height:260px">${htmlEscape(help)}</textarea>
          <button>保存</button>
        </form>
      </section>
      <section>
        <h2>更新情報を投稿</h2>
        <form method="post" action="/update-info">
          <label>Ver（例: 1.2）</label>
          <input name="version" value="${htmlEscape(botVersion)}" required pattern="\\d+\\.\\d+">
          <label>更新内容</label>
          <textarea name="items" required placeholder="・音楽機能の充足&#10;本文&#10;&#10;・募集機能の修正&#10;本文"></textarea>
          <small>「・見出し」の行を増やすと、項目を何個でも増やせます。</small><br><br>
          <label class="check-label"><input type="checkbox" name="mentionEveryone" value="1"> @everyoneを付ける</label>
          <button>お知らせチャンネルへ投稿</button>
        </form>
      </section>
      <section>
        <h2>お知らせ送信</h2>
        <form method="post" action="/announcement">
          <label>タイトル</label>
          <input name="title" required>
          <label>本文</label>
          <textarea name="content" required></textarea>
          <label class="check-label"><input type="checkbox" name="mentionEveryone" value="1"> @everyoneを付ける</label>
          <button>お知らせチャンネルへ送信</button>
        </form>
      </section>
      <section>
        <h2>指定チャンネルへメッセージ送信</h2>
        <form method="post" action="/send-message">
          <label>チャンネルID</label>
          <input name="channelId" required>
          <label>本文</label>
          <textarea name="content" required></textarea>
          <button>送信</button>
        </form>
      </section>
      <section>
        <h2>MP3アップロード</h2>
        <form method="post" action="/upload-mp3" enctype="multipart/form-data">
          <label>MP3ファイル</label>
          <input type="file" name="mp3" accept="audio/mpeg,.mp3" required>
          <button>アップロード</button>
        </form>
        <small>アップロード先: ${htmlEscape(MUSIC_MP3_DIR)}。Discordでは /playmp3 ファイル名 で再生します。</small>
      </section>
      <section>
        <h2>Botログ</h2>
        <pre>${htmlEscape(logs.map((entry) => `[${entry.time}] ${entry.level.toUpperCase()} ${entry.message}`).join('\n'))}</pre>
      </section>
    </div>
  </main>
</body>
</html>`;
}

function adminSupportPage(message = '') {
  const openRows = supportTicketRows(['open', 'in_progress']);
  const resolvedRows = supportTicketRows(['resolved']);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>サポートセンター管理</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f7fb;color:#202225;margin:0}
    header{background:#57f287;color:#123;padding:18px 22px}
    main{max-width:1200px;margin:0 auto;padding:20px;display:grid;gap:18px}
    section{background:white;border:1px solid #ddd;border-radius:12px;padding:18px;box-shadow:0 2px 8px #0000000d}
    h1{margin:0;font-size:24px} h2{margin:0 0 12px;font-size:18px}
    .button-link{display:inline-block;background:#5865f2;color:white;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:700}
    .message{background:#e8f5e9;border:1px solid #9ccc9c;border-radius:8px;padding:10px}
    .table-wrap{overflow:auto}
    table{width:100%;border-collapse:collapse;background:white}
    th,td{border-bottom:1px solid #e3e5ec;padding:10px;text-align:left;vertical-align:top}
    th{background:#f0f2f7;font-size:13px}
    small{color:#666}
  </style>
</head>
<body>
  <header><h1>サポートセンター管理</h1><div>未対応・対応中・解決済みを一覧化</div></header>
  <main>
    ${message ? `<div class="message">${htmlEscape(message)}</div>` : ''}
    <section><a class="button-link" href="/">管理トップへ戻る</a></section>
    <section>
      <h2>未対応 / 対応中</h2>
      ${supportTicketsTable(openRows)}
    </section>
    <section>
      <h2>解決済み</h2>
      ${supportTicketsTable(resolvedRows)}
    </section>
  </main>
</body>
</html>`;
}

async function getValorantHighestRankCached(guildId, userId, account, refresh = false) {
  store.data.valorantRankCache ||= {};
  const cacheKey = `${guildId}:${userId}`;
  const cached = store.data.valorantRankCache[cacheKey];
  const accountKey = `${account.name}#${account.tag}`;
  const cacheAge = cached?.checkedAt ? Date.now() - Date.parse(cached.checkedAt) : Infinity;
  if (!refresh && cached?.accountKey === accountKey && cacheAge < 6 * 60 * 60 * 1000) {
    return cached;
  }
  try {
    const region = normalizeValorantRegion(account.region || VALORANT_DEFAULT_REGION);
    const mmr = await fetchValorantMmr(account.name, account.tag, region);
    const next = {
      accountKey,
      highestRank: valorantHighestRankName(mmr),
      currentRank: valorantRankName(mmr),
      score: valorantRankScore(mmr),
      checkedAt: new Date().toISOString(),
      error: null,
    };
    store.data.valorantRankCache[cacheKey] = next;
    await store.save();
    return next;
  } catch (error) {
    const next = {
      accountKey,
      highestRank: cached?.highestRank || '取得失敗',
      currentRank: cached?.currentRank || '取得失敗',
      score: cached?.score || 0,
      checkedAt: new Date().toISOString(),
      error: error.message || '取得失敗',
    };
    store.data.valorantRankCache[cacheKey] = next;
    await store.save();
    return next;
  }
}

async function buildValorantMembersRows(refresh = false) {
  const guild = client.guilds.cache.get(PRIMARY_GUILD_ID) || await client.guilds.fetch(PRIMARY_GUILD_ID).catch(() => null);
  if (!guild) throw new Error('メインサーバーを取得できませんでした。');
  await guild.members.fetch();
  const accounts = valorantAccountStore(guild.id);
  const members = [...guild.members.cache.values()]
    .filter((member) => !member.user.bot)
    .filter((member) => member.roles.cache.has(GAMES.valorant.roleId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'));
  const rows = [];
  for (const member of members) {
    const account = accounts[member.id];
    let rank = null;
    if (account) rank = await getValorantHighestRankCached(guild.id, member.id, account, refresh);
    rows.push({ member, account, rank });
  }
  return rows;
}

async function adminValorantMembersPage(message = '', refresh = false) {
  const rows = await buildValorantMembersRows(refresh);
  const linkedCount = rows.filter((row) => row.account).length;
  const generatedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VALORANTメンバー一覧</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f7fb;color:#202225;margin:0}
    header{background:#ff4655;color:white;padding:18px 22px}
    main{max-width:1200px;margin:0 auto;padding:20px;display:grid;gap:18px}
    section{background:white;border:1px solid #ddd;border-radius:12px;padding:18px;box-shadow:0 2px 8px #0000000d}
    h1{margin:0;font-size:24px} h2{margin:0 0 12px;font-size:18px}
    table{width:100%;border-collapse:collapse;background:white}
    th,td{border-bottom:1px solid #e3e5ec;padding:10px;text-align:left;vertical-align:top}
    th{background:#f0f2f7;font-size:13px}
    .badge{display:inline-block;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:700}
    .ok{background:#e8f5e9;color:#1b5e20}.ng{background:#ffebee;color:#b71c1c}.muted{color:#666}
    .actions{display:flex;gap:10px;flex-wrap:wrap}
    .button-link{display:inline-block;background:#5865f2;color:white;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:700}
    .message{background:#e8f5e9;border:1px solid #9ccc9c;border-radius:8px;padding:10px}
    .table-wrap{overflow:auto}
  </style>
</head>
<body>
  <header><h1>VALORANTメンバー一覧</h1><div>VALORANTロール保持者のみ表示</div></header>
  <main>
    ${message ? `<div class="message">${htmlEscape(message)}</div>` : ''}
    <section>
      <div class="actions">
        <a class="button-link" href="/">管理トップへ戻る</a>
        <a class="button-link" href="/valorant-members?refresh=1">最高ランクを再取得</a>
      </div>
      <p class="muted">表示人数: ${rows.length} / 連携済み: ${linkedCount} / 生成: ${htmlEscape(generatedAt)}</p>
      <div class="table-wrap"><table>
        <thead>
          <tr>
            <th>サーバー表示名</th>
            <th>Discord ID</th>
            <th>連携状況</th>
            <th>Riot ID</th>
            <th>現在ランク</th>
            <th>過去最高ランク</th>
            <th>内部レート</th>
            <th>最終取得</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ member, account, rank }) => `
          <tr>
            <td>${htmlEscape(member.displayName)}</td>
            <td><code>${htmlEscape(member.id)}</code></td>
            <td>${account ? '<span class="badge ok">連携済み</span>' : '<span class="badge ng">未連携</span>'}</td>
            <td>${account ? htmlEscape(`${account.name}#${account.tag}`) : '<span class="muted">-</span>'}</td>
            <td>${rank ? htmlEscape(rank.currentRank || '-') : '<span class="muted">-</span>'}</td>
            <td>${rank ? htmlEscape(rank.highestRank || '-') : '<span class="muted">-</span>'}${rank?.error ? `<br><small class="ng">${htmlEscape(rank.error)}</small>` : ''}</td>
            <td>${rank ? htmlEscape(String(rank.score ?? '-')) : '<span class="muted">-</span>'}</td>
            <td>${rank?.checkedAt ? htmlEscape(new Date(rank.checkedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })) : '<span class="muted">-</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </section>
  </main>
</body>
</html>`;
}

function fortuneCategoryOptions(selected = '') {
  return FORTUNE_CATEGORIES.map((category) =>
    `<option value="${htmlEscape(category)}"${category === selected ? ' selected' : ''}>${htmlEscape(category)}</option>`)
    .join('');
}

function fortuneTypeOptions(selected = 'regular') {
  return [
    ['regular', 'おみくじ'],
    ['love', '恋みくじ'],
  ].map(([value, label]) =>
    `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`)
    .join('');
}

function fortuneSectionsFromForm(form) {
  return Object.fromEntries(FORTUNE_CATEGORIES.map((category) => [
    category,
    String(form[`section:${category}`] || '').trim(),
  ]));
}

function fortuneItemEditor(item) {
  const normalized = normalizeFortuneItem(item);
  const sectionInputs = normalized.type === 'love'
    ? `<label>本文</label><textarea name="content" required>${htmlEscape(normalized.content || '')}</textarea>`
    : FORTUNE_CATEGORIES.map((category) => `
      <label>${htmlEscape(category)}</label>
      <textarea name="section:${htmlEscape(category)}" required>${htmlEscape(normalized.sections?.[category] || '')}</textarea>
    `).join('');
  return `<section>
    <form method="post" action="/fortune/update">
      <input type="hidden" name="id" value="${htmlEscape(normalized.id)}">
      <div class="grid">
        <div>
          <label>種類</label>
          <input type="hidden" name="type" value="${htmlEscape(normalized.type)}">
          <input value="${htmlEscape(FORTUNE_TYPES[normalized.type] || normalized.type)}" readonly>
        </div>
        <div>
          <label>運勢</label>
          <input name="fortune" value="${htmlEscape(normalized.fortune || '')}" required maxlength="80">
        </div>
      </div>
      ${sectionInputs}
      <button>更新</button>
    </form>
    <form method="post" action="/fortune/delete" style="margin-top:10px">
      <input type="hidden" name="id" value="${htmlEscape(normalized.id)}">
      <button style="background:#ed4245">削除</button>
    </form>
  </section>`;
}

function fortuneAdminPage(message = '') {
  ensureFortuneItems();
  const items = [...(store.data.fortuneItems || [])].sort((a, b) => {
    return String(a.fortune || '').localeCompare(String(b.fortune || ''), 'ja');
  });
  const regularItems = items.filter((item) => item.type !== 'love');
  const loveItems = items.filter((item) => item.type === 'love');
  const newRegularSectionInputs = FORTUNE_CATEGORIES.map((category) => `
          <label>${htmlEscape(category)}</label>
          <textarea name="section:${htmlEscape(category)}" required></textarea>`).join('');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>おみくじ管理</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f7fb;color:#202225;margin:0}
    header{background:#f2c94c;color:#222;padding:18px 22px}
    main{max-width:1100px;margin:0 auto;padding:20px;display:grid;gap:18px}
    section{background:white;border:1px solid #ddd;border-radius:12px;padding:18px;box-shadow:0 2px 8px #0000000d}
    h1{margin:0;font-size:24px} h2{margin:0 0 12px;font-size:18px}
    label{display:block;font-weight:700;margin:10px 0 5px}
    input,textarea,select{width:100%;box-sizing:border-box;border:1px solid #c8ccd6;border-radius:8px;padding:10px;font:inherit}
    textarea{min-height:100px}
    button{background:#5865f2;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
    button:disabled{opacity:.65;cursor:wait}
    .button-link{display:inline-block;background:#5865f2;color:white;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:700}
    .message{background:#e8f5e9;border:1px solid #9ccc9c;border-radius:8px;padding:10px}
    .message.error{background:#ffebee;border-color:#ef9a9a;color:#b71c1c}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
    small{color:#666}
  </style>
</head>
<body>
  <header><h1>おみくじ管理</h1><div>/おみくじ と /恋みくじ の候補を編集</div></header>
  <main>
    <div id="fortune-save-status" class="message" style="display:none"></div>
    ${message ? `<div class="message">${htmlEscape(message)}</div>` : ''}
    <section><a class="button-link" href="/">管理トップへ戻る</a></section>
    <section>
      <h2>登録数</h2>
      <div class="grid">
        <div><strong>通常おみくじ</strong><br>${regularItems.length}件</div>
        <div><strong>恋みくじ</strong><br>${loveItems.length}件</div>
      </div>
    </section>
    <section>
      <h2>新規追加</h2>
      <form method="post" action="/fortune/add">
        <input type="hidden" name="type" value="regular">
        <div class="grid">
          <div>
            <label>運勢</label>
            <input name="fortune" required maxlength="80">
          </div>
        </div>
        <p><small>通常のおみくじでは以下の全項目を一括で使います。恋みくじを追加する場合は「本文」欄として一番上だけ入力されます。</small></p>
        ${newRegularSectionInputs}
        <button>追加</button>
      </form>
      <hr>
      <h2>恋みくじを追加</h2>
      <form method="post" action="/fortune/add">
        <input type="hidden" name="type" value="love">
        <div class="grid">
          <div>
            <label>運勢</label>
            <input name="fortune" required maxlength="80">
          </div>
        </div>
        <label>本文</label>
        <textarea name="content" required></textarea>
        <button>追加</button>
      </form>
    </section>
    <h2>登録済み</h2>
    <h3>通常おみくじ</h3>
    <div id="fortune-items-regular" class="fortune-items" data-type="regular">
      ${regularItems.map(fortuneItemEditor).join('') || '<section class="fortune-empty">まだ登録がありません。</section>'}
    </div>
    <h3>恋みくじ</h3>
    <div id="fortune-items-love" class="fortune-items" data-type="love">
      ${loveItems.map(fortuneItemEditor).join('') || '<section class="fortune-empty">まだ登録がありません。</section>'}
    </div>
  </main>
  <script>
    const statusBox = document.getElementById('fortune-save-status');
    function fortuneItemsContainer(type) {
      return document.getElementById(type === 'love' ? 'fortune-items-love' : 'fortune-items-regular');
    }
    function showStatus(message, error = false) {
      statusBox.textContent = message;
      statusBox.className = error ? 'message error' : 'message';
      statusBox.style.display = 'block';
      clearTimeout(showStatus.timer);
      showStatus.timer = setTimeout(() => {
        statusBox.style.display = 'none';
      }, error ? 8000 : 2500);
    }
    function bindFortuneForm(form) {
      if (form.dataset.bound === '1') return;
      form.dataset.bound = '1';
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const action = form.getAttribute('action');
        if (action.endsWith('/fortune/delete') && !confirm('削除しますか？')) return;
        const submitter = event.submitter;
        if (submitter) submitter.disabled = true;
        try {
          const response = await fetch(action, {
            method: 'POST',
            headers: { 'x-requested-with': 'fetch' },
            body: new URLSearchParams(new FormData(form)),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload.ok) throw new Error(payload.message || '保存に失敗しました。');
          showStatus(payload.message || '保存しました。');
          if (action.endsWith('/fortune/add') && payload.itemHtml) {
            const target = fortuneItemsContainer(payload.type);
            target.querySelector('.fortune-empty')?.remove();
            target.insertAdjacentHTML('beforeend', payload.itemHtml);
            target.querySelectorAll('form[action^="/fortune/"]').forEach(bindFortuneForm);
            form.reset();
          }
          if (action.endsWith('/fortune/delete')) {
            form.closest('section')?.remove();
          }
        } catch (error) {
          showStatus(error.message || '保存に失敗しました。', true);
        } finally {
          if (submitter) submitter.disabled = false;
        }
      });
    }
    document.querySelectorAll('form[action^="/fortune/"]').forEach(bindFortuneForm);
  </script>
</body>
</html>`;
}

async function startAdminWeb() {
  if (adminWebServer || !ADMIN_WEB_PASSWORD) {
    if (!ADMIN_WEB_PASSWORD) console.warn('ADMIN_WEB_PASSWORD が未設定のため、管理Webサイトは起動しません。');
    return;
  }
  fs.mkdirSync(MUSIC_MP3_DIR, { recursive: true });
  adminWebServer = http.createServer(async (request, response) => {
    try {
      if (!adminWebAuthorized(request)) {
        response.writeHead(401, {
          'www-authenticate': 'Basic realm="vase-bot-admin"',
          'content-type': 'text/plain; charset=utf-8',
        });
        response.end('Authentication required');
        return;
      }
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/') {
        sendAdminWeb(response, 200, adminWebPage(url.searchParams.get('message') || ''));
        return;
      }
      if (request.method === 'GET' && url.pathname === '/support') {
        sendAdminWeb(response, 200, adminSupportPage(url.searchParams.get('message') || ''));
        return;
      }
      if (request.method === 'GET' && url.pathname === '/valorant-members') {
        const refresh = url.searchParams.get('refresh') === '1';
        sendAdminWeb(response, 200, await adminValorantMembersPage(refresh ? '最高ランクを再取得しました。' : '', refresh));
        return;
      }
      if (request.method === 'GET' && url.pathname === '/fortune') {
        sendAdminWeb(response, 200, fortuneAdminPage(url.searchParams.get('message') || ''));
        return;
      }
      if (request.method === 'POST' && url.pathname === '/fortune/add') {
        const form = await readUrlEncodedForm(request);
        const type = form.type === 'love' ? 'love' : 'regular';
        const item = {
          id: crypto.randomUUID(),
          type,
          category: '',
          fortune: String(form.fortune || '').trim(),
        };
        if (type === 'love') {
          item.content = String(form.content || '').trim();
        } else {
          item.sections = fortuneSectionsFromForm(form);
        }
        if (!item.fortune) throw new Error('運勢を入力してください。');
        if (type === 'love' && !item.content) throw new Error('本文を入力してください。');
        if (type === 'regular' && FORTUNE_CATEGORIES.some((category) => !item.sections[category])) {
          throw new Error('おみくじの全項目を入力してください。');
        }
        ensureFortuneItems();
        store.data.fortuneItems.push(item);
        await store.save();
        if (isAdminWebAjax(request)) {
          sendAdminJson(response, 200, {
            ok: true,
            message: 'おみくじ候補を追加しました。',
            type: item.type,
            itemHtml: fortuneItemEditor(item),
          });
          return;
        }
        redirectAdminWebPathOrJson(request, response, '/fortune', 'おみくじ候補を追加しました。');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/fortune/update') {
        const form = await readUrlEncodedForm(request);
        ensureFortuneItems();
        const item = store.data.fortuneItems.find((entry) => entry.id === form.id);
        if (!item) throw new Error('更新対象が見つかりません。');
        const type = form.type === 'love' ? 'love' : 'regular';
        item.type = type;
        item.category = '';
        item.fortune = String(form.fortune || '').trim();
        if (type === 'love') {
          item.content = String(form.content || '').trim();
          delete item.sections;
        } else {
          item.sections = fortuneSectionsFromForm(form);
          delete item.content;
        }
        if (!item.fortune) throw new Error('運勢を入力してください。');
        if (type === 'love' && !item.content) throw new Error('本文を入力してください。');
        if (type === 'regular' && FORTUNE_CATEGORIES.some((category) => !item.sections[category])) {
          throw new Error('おみくじの全項目を入力してください。');
        }
        await store.save();
        redirectAdminWebPathOrJson(request, response, '/fortune', 'おみくじ候補を更新しました。');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/fortune/delete') {
        const form = await readUrlEncodedForm(request);
        ensureFortuneItems();
        const before = store.data.fortuneItems.length;
        store.data.fortuneItems = store.data.fortuneItems.filter((entry) => entry.id !== form.id);
        if (store.data.fortuneItems.length === before) throw new Error('削除対象が見つかりません。');
        await store.save();
        redirectAdminWebPathOrJson(request, response, '/fortune', 'おみくじ候補を削除しました。');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/help') {
        const form = await readUrlEncodedForm(request);
        fs.writeFileSync(HELP_CONTENT_FILE, String(form.content || '').trim() + '\n', 'utf8');
        redirectAdminWeb(response, '使い方を保存しました。');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/update-info') {
        const form = await readUrlEncodedForm(request);
        const version = String(form.version || '').trim().replace(/^v/i, '');
        const items = String(form.items || '').trim();
        if (!/^\d+\.\d+$/.test(version)) throw new Error('Verは 1.2 の形式で入力してください。');
        if (!parseUpdateInfoSections(items).length) throw new Error('更新内容を入力してください。');
        const channel = await client.channels.fetch(ADMIN_ANNOUNCEMENT_CHANNEL_ID);
        if (!channel?.isTextBased()) throw new Error('お知らせチャンネルが見つかりません。');
        const mentionEveryone = form.mentionEveryone === '1';
        await channel.send({
          content: `${mentionEveryone ? '@everyone\n' : ''}${formatUpdateInfoContent(version, items)}`.slice(0, 2000),
          allowedMentions: mentionEveryone ? { parse: ['everyone'] } : { parse: [] },
        });
        store.data.botVersion = version;
        await store.save();
        setBotVersionPresence(version);
        await appendAuditLog({
          action: '更新情報送信',
          actor: { username: '管理Web' },
          guildId: PRIMARY_GUILD_ID,
          target: ADMIN_ANNOUNCEMENT_CHANNEL_ID,
          details: `Ver ${version}${mentionEveryone ? ' / @everyone' : ''}`,
        });
        redirectAdminWeb(response, `更新情報 Ver ${version} を送信しました。`);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/announcement') {
        const form = await readUrlEncodedForm(request);
        const title = String(form.title || '').trim();
        const content = String(form.content || '').trim();
        if (!title) throw new Error('タイトルを入力してください。');
        if (!content) throw new Error('本文を入力してください。');
        const channel = await client.channels.fetch(ADMIN_ANNOUNCEMENT_CHANNEL_ID);
        if (!channel?.isTextBased()) throw new Error('お知らせチャンネルが見つかりません。');
        const mentionEveryone = form.mentionEveryone === '1';
        await channel.send({
          content: `${mentionEveryone ? '@everyone\n' : ''}${formatAnnouncementContent(title, content)}`.slice(0, 2000),
          allowedMentions: mentionEveryone ? { parse: ['users', 'roles', 'everyone'] } : { parse: ['users', 'roles'] },
        });
        await appendAuditLog({
          action: 'お知らせ送信',
          actor: { username: '管理Web' },
          guildId: PRIMARY_GUILD_ID,
          target: ADMIN_ANNOUNCEMENT_CHANNEL_ID,
          details: `${title}${mentionEveryone ? ' / @everyone' : ''}`,
        });
        redirectAdminWeb(response, 'お知らせを送信しました。');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/send-message') {
        const form = await readUrlEncodedForm(request);
        const channelId = String(form.channelId || '').trim();
        const content = String(form.content || '').trim();
        if (!/^\d{15,25}$/.test(channelId)) throw new Error('チャンネルIDが不正です。');
        if (!content) throw new Error('本文を入力してください。');
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased()) throw new Error('送信先チャンネルが見つかりません。');
        await channel.send({ content, allowedMentions: { parse: ['users', 'roles', 'everyone'] } });
        await appendAuditLog({
          action: '指定チャンネル送信',
          actor: { username: '管理Web' },
          guildId: channel.guildId || null,
          target: channelId,
          details: content.slice(0, 120),
        });
        redirectAdminWeb(response, 'メッセージを送信しました。');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/upload-mp3') {
        const body = await readRequestBody(request);
        const form = parseMultipart(body, request.headers['content-type'] || '');
        const file = form.mp3;
        if (!file?.content?.length) throw new Error('MP3ファイルを選択してください。');
        const filename = path.basename(file.filename || 'upload.mp3').replace(/[^\w.\-ぁ-んァ-ン一-龥ー]/g, '_');
        if (!/\.mp3$/i.test(filename)) throw new Error('mp3ファイルだけアップロードできます。');
        const destination = path.join(MUSIC_MP3_DIR, filename);
        fs.mkdirSync(MUSIC_MP3_DIR, { recursive: true });
        fs.writeFileSync(destination, file.content);
        redirectAdminWeb(response, `MP3をアップロードしました: ${filename}`);
        return;
      }
      sendAdminWeb(response, 404, adminWebPage('ページが見つかりません。'));
    } catch (error) {
      console.error('管理Webエラー:', error.message);
      if (isAdminWebAjax(request)) {
        sendAdminJson(response, 500, { ok: false, message: error.message || 'エラーが発生しました。' });
        return;
      }
      sendAdminWeb(response, 500, adminWebPage(error.message || 'エラーが発生しました。'));
    }
  });
  adminWebServer.listen(ADMIN_WEB_PORT, '0.0.0.0', () => {
    console.log(`管理Webサイトを起動しました: port=${ADMIN_WEB_PORT}`);
  });
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
    if (record.whenMode === 'timestamp') {
      const startDate = record.when ? parseRecruitmentStartTime(record.when) : null;
      if (record.when && !startDate) {
        await interaction.reply({
          content: '開始日時は `YYYY-MM-DD HH:mm` の形式で入力してください。例: `2026-06-28 22:00`',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      record.startAt = startDate ? startDate.toISOString() : null;
      record.startNotificationSent = false;
    }
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
      await editRecruitmentMessages(record);
      await updateOwnerPanelForFull(recruitmentId, record);
      await interaction.reply({ content: '募集を更新し、定員に達したため締め切りました。', flags: MessageFlags.Ephemeral });
      return;
    }

    await store.save();
    await editRecruitmentMessages(record);
    await interaction.reply({ content: '募集内容を更新しました。', flags: MessageFlags.Ephemeral });
  });
}

async function handleGameSelection(interaction, debug = false) {
  const gameKey = interaction.values[0];
  if (!GAMES[gameKey]) return;
  await interaction.update({
    content: '日時の入力方法を選択してください。',
    components: [recruitmentTimeModePanel(gameKey, debug)],
  });
}

async function handleEmergencyGameSelection(interaction) {
  const gameKey = interaction.values[0];
  if (!GAMES[gameKey]) return;
  await interaction.showModal(emergencyRecruitmentModal(gameKey));
}

async function handleRecruitmentTimeMode(interaction) {
  const [, gameKey, timeMode, mode = 'normal'] = interaction.customId.split(':');
  const debug = mode === 'debug';
  if (!GAMES[gameKey] || !['timestamp', 'free'].includes(timeMode)) {
    await interaction.reply({ content: '日時方式を確認できませんでした。もう一度 `/募集` から作成してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(recruitmentModal(gameKey, timeMode, debug));
}

async function handleRecruitmentForm(interaction) {
  const [, gameKey, timeMode = 'free', mode = 'normal'] = interaction.customId.split(':');
  const debug = mode === 'debug';
  const capacityText = interaction.fields.getTextInputValue('capacity').trim();
  const capacity = capacityText ? Number(capacityText) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 25)) {
    await interaction.reply({ content: '募集人数は1～25の半角数字、または無制限にする場合は空欄にしてください。', flags: MessageFlags.Ephemeral });
      return;
  }

  const when = interaction.fields.getTextInputValue('when').trim();
  const startDate = timeMode === 'timestamp' && when ? parseRecruitmentStartTime(when) : null;
  if (timeMode === 'timestamp' && when && !startDate) {
    await interaction.reply({
      content: '開始日時は `YYYY-MM-DD HH:mm` の形式で入力してください。例: `2026-06-28 22:00`',
      flags: MessageFlags.Ephemeral,
    });
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
  if (!debug) {
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
  }

  const record = {
    ownerId: interaction.user.id,
    game: gameKey,
    customGame: (gameKey === 'other' || gameKey === 'everyone')
      ? interaction.fields.getTextInputValue('custom-game').trim()
      : null,
    details: interaction.fields.getTextInputValue('details').trim(),
    when,
    whenMode: timeMode,
    startAt: startDate ? startDate.toISOString() : null,
    startNotificationSent: false,
    partyCode,
    capacity,
    responses: initialResponses(interaction.user.id),
    responseNotes: {},
    waitlist: [],
    messageRefs: [],
    closed: capacity === 1,
    closedReason: capacity === 1 ? 'full' : null,
    limitedVoiceEnabled: false,
    voiceAccessRevoked: false,
    notifyOwnerOnFull: false,
    fullNotificationSent: false,
    debug,
    createdAt: new Date().toISOString(),
  };

  let announcementMessage;
  try {
    let announcementChannel = await interaction.guild.channels.fetch(ANNOUNCEMENT_CHANNEL_ID).catch(() => null);
    if (!announcementChannel?.isTextBased()) announcementChannel = interaction.channel;
    if (!announcementChannel?.isTextBased()) throw new Error('指定先がテキストチャンネルではありません。');
    announcementMessage = await announcementChannel.send({
      content: debug ? undefined : `<@&${role.id}>`,
      embeds: [buildRecruitmentEmbed(record)],
      components: [responseButtons(record.closed && record.closedReason !== 'full', {
        waitlist: record.closed && record.closedReason === 'full',
      })],
      allowedMentions: debug ? { parse: [] } : { roles: [role.id], users: [] },
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
  await appendAuditLog({
    action: '募集作成',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: announcementMessage.id,
    details: `${recruitmentName(record)} / ${capacity === null ? '無制限' : `${capacity}人`}`,
  });
  if (record.closedReason === 'full') {
    await notifyRecruitmentOwnerOnFull(record);
    await editRecruitmentMessages(record);
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

async function handleEmergencyRecruitmentForm(interaction) {
  const [, gameKey] = interaction.customId.split(':');
  if (!GAMES[gameKey]) {
    await interaction.reply({ content: 'ゲーム・イベントを確認できませんでした。もう一度 `/緊急募集` から作成してください。', flags: MessageFlags.Ephemeral });
    return;
  }

  const capacityText = interaction.fields.getTextInputValue('capacity').trim();
  const capacity = Number(capacityText);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 25) {
    await interaction.reply({ content: '足りない人数は1～25の半角数字で入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let role;
  try {
    role = await getNotificationRole(interaction.guild, gameKey);
  } catch (error) {
    console.error('緊急募集の通知ロール準備に失敗:', error);
    await interaction.editReply(`通知ロールを確認できません。ロールIDとBotの権限を確認してください。\n${error.message}`);
    return;
  }

  const record = {
    ownerId: interaction.user.id,
    game: gameKey,
    customGame: (gameKey === 'other' || gameKey === 'everyone')
      ? interaction.fields.getTextInputValue('custom-game').trim()
      : null,
    details: interaction.fields.getTextInputValue('details').trim(),
    when: '今すぐ',
    whenMode: 'free',
    startAt: null,
    startNotificationSent: false,
    partyCode: null,
    capacity,
    responses: {},
    responseNotes: {},
    waitlist: [],
    messageRefs: [],
    closed: false,
    closedReason: null,
    limitedVoiceEnabled: false,
    voiceAccessRevoked: false,
    notifyOwnerOnFull: false,
    fullNotificationSent: false,
    debug: false,
    urgent: true,
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
      components: [responseButtons(false)],
      allowedMentions: { roles: [role.id], users: [] },
    });
  } catch (error) {
    console.error('緊急募集チャンネルへの投稿に失敗:', error.message);
    await interaction.editReply(`募集チャンネル <#${ANNOUNCEMENT_CHANNEL_ID}> へ投稿できませんでした。Botの権限を確認してください。`);
    return;
  }

  record.guildId = interaction.guildId;
  record.messageRefs.push({ messageId: announcementMessage.id, channelId: announcementMessage.channelId });
  store.data.recruitments[announcementMessage.id] = record;
  await store.save();
  await appendAuditLog({
    action: '募集作成',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: announcementMessage.id,
    details: `緊急募集: ${recruitmentName(record)} / あと${capacity}人`,
  });

  await interaction.editReply('緊急募集を投稿しました。');
  const ownerPanel = await interaction.followUp({
    content: '募集のキャンセル・編集、または参加者限定VCの利用を選べます。限定VCを使わない場合は何も押さなくて構いません。',
    components: [ownerCancelButton(announcementMessage.id, false, record.notifyOwnerOnFull)],
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
          ? ownerFullControls(recruitmentId, true, record.closedReason === 'full')
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
          ? ownerFullControls(recruitmentId, true, record.closedReason === 'full')
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

    try {
      await closeRecruitmentPanel(interaction.guild, recruitmentId, record, 'cancelled');
    } catch (error) {
      console.error('募集終了処理に失敗:', error.message);
      await interaction.followUp({
        content: '募集を終了できませんでした。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await appendAuditLog({
      action: '募集キャンセル',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: recruitmentId,
      details: recruitmentName(record),
    });
    await interaction.deleteReply().catch(() => {});
  });
}

async function handleCompleteRecruitment(interaction) {
  const recruitmentId = interaction.customId.split(':')[1];
  await interaction.deferUpdate();
  await withMessageLock(recruitmentId, async () => {
    const record = store.data.recruitments[recruitmentId];
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.ownerId !== interaction.user.id) {
      await interaction.followUp({ content: '募集者本人だけが募集終了できます。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.closed) {
      await interaction.followUp({ content: 'この募集はすでに終了しています。', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await closeRecruitmentPanel(interaction.guild, recruitmentId, record, 'completed');
    } catch (error) {
      console.error('募集終了処理に失敗:', error.message);
      await interaction.followUp({
        content: '募集を終了できませんでした。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await appendAuditLog({
      action: '募集終了',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: recruitmentId,
      details: recruitmentName(record),
    });
    await interaction.editReply({
      content: '募集を終了しました。必要なら限定VCを開始できます。',
      components: [ownerFullControls(recruitmentId, record.limitedVoiceEnabled, false)],
    }).catch(() => {});
  });
}

async function handleResponseButton(interaction) {
  const response = interaction.customId.split(':')[1];
  const located = findRecruitment(interaction.message.id);
  const previousResponse = located?.record?.responses?.[interaction.user.id];
  if (['maybe', 'decline'].includes(response) && previousResponse !== response) {
    await interaction.showModal(recruitmentSupplementModal(response, interaction.message.id));
    return;
  }
  await interaction.deferUpdate();
  await processRecruitmentResponse(interaction, interaction.message.id, response, '');
}

async function handleRecruitmentSupplementForm(interaction) {
  const [, response, messageId] = interaction.customId.split(':');
  const supplement = interaction.fields.getTextInputValue('supplement').trim();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await processRecruitmentResponse(interaction, messageId, response, supplement);
}

async function replyRecruitmentResponse(interaction, content) {
  if (interaction.isModalSubmit?.()) {
    await interaction.editReply(content);
  } else {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  }
}

async function processRecruitmentResponse(interaction, messageId, response, supplement = '') {
  const located = findRecruitment(messageId);
  if (!located) {
    if (interaction.deferred || interaction.replied) await replyRecruitmentResponse(interaction, 'この募集の保存データが見つかりません。');
    else await interaction.reply({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
    return;
  }
  await withMessageLock(located.recruitmentId, async () => {
    const latest = findRecruitment(messageId);
    if (!latest) {
      await replyRecruitmentResponse(interaction, 'この募集の保存データが見つかりません。');
      return;
    }
    const { record } = latest;
    if (record.closed && record.closedReason !== 'full') {
      await replyRecruitmentResponse(interaction, 'この募集は終了しています。');
      return;
    }
    if (interaction.user.id === record.ownerId) {
      await replyRecruitmentResponse(interaction, record.urgent
        ? '緊急募集では募集者は募集枠に含めません。'
        : '募集者は最初から参加確定として登録されています。');
      return;
    }

    const previousResponse = record.responses[interaction.user.id];
    if (record.closed && record.closedReason === 'full') {
      if (response === 'join' && previousResponse === 'join') {
        delete record.responses[interaction.user.id];
        await promoteWaitlistIfPossible(interaction.guild, record);
        if (hasRecruitmentVacancy(record)) {
          record.closed = false;
          record.closedReason = null;
          record.fullNotificationSent = false;
        }
        const shouldHideVoiceChannel = updateHiddenVoiceUser(record, interaction.user.id, previousResponse);
        await store.save();
        await syncVoiceAccess(interaction.guild).catch((error) => console.error('募集VCの参加権限を更新できませんでした:', error.message));
        if (shouldHideVoiceChannel) await disconnectHiddenVoiceUser(interaction.guild, interaction.user.id).catch(() => {});
        await editRecruitmentMessages(record);
        await replyRecruitmentResponse(interaction, '参加を取り消しました。空きが出た場合はキャンセル待ちから自動で繰り上げます。');
        return;
      }
      await replyRecruitmentResponse(interaction, '定員に達しています。参加したい場合は「キャンセル待ち」を押してください。');
      return;
    }
    const result = applyResponse(record, interaction.user.id, response);
    if (!result.accepted) {
      await replyRecruitmentResponse(interaction, result.reason === 'full' ? '定員に達しているため参加できません。' : 'この募集は終了しています。');
      return;
    }
    if (['maybe', 'decline'].includes(response) && record.responses[interaction.user.id] === response) {
      record.responseNotes ||= {};
      if (supplement) record.responseNotes[interaction.user.id] = supplement;
      else delete record.responseNotes[interaction.user.id];
      await notifyRecruitmentOwnerOnResponse(record, interaction.user, response, supplement);
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
      await replyRecruitmentResponse(interaction, '回答は保存しましたが、募集VCの参加権限を更新できませんでした。');
    }
    if (result.full) {
      await notifyRecruitmentOwnerOnFull(record);
      leaveBotVoiceIfNoRecruitments(interaction.guildId);
      await updateOwnerPanelForFull(located.recruitmentId, record);
      await editRecruitmentMessages(record);
      await replyRecruitmentResponse(interaction, '定員に達したため、自動で募集を締め切りました。');
    } else {
      await editRecruitmentMessages(record);
      if (['maybe', 'decline'].includes(response)) {
        await replyRecruitmentResponse(interaction, supplement ? '回答と補足を送信しました。' : '回答を送信しました。');
      }
    }
  });
}

async function handleWaitlistButton(interaction) {
  await interaction.deferUpdate();
  const located = findRecruitment(interaction.message.id);
  if (!located) {
    await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
    return;
  }
  await withMessageLock(located.recruitmentId, async () => {
    const record = store.data.recruitments[located.recruitmentId];
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(record.closed && record.closedReason === 'full')) {
      await interaction.followUp({ content: 'この募集は現在キャンセル待ちを受け付けていません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.responses?.[interaction.user.id] === 'join') {
      await interaction.followUp({ content: 'すでに参加者に入っています。', flags: MessageFlags.Ephemeral });
      return;
    }
    record.waitlist ||= [];
    if (record.waitlist.includes(interaction.user.id)) {
      record.waitlist = record.waitlist.filter((id) => id !== interaction.user.id);
      await store.save();
      await editRecruitmentMessages(record);
      await interaction.followUp({ content: 'キャンセル待ちを取り消しました。', flags: MessageFlags.Ephemeral });
      return;
    }
    record.waitlist.push(interaction.user.id);
    await store.save();
    await editRecruitmentMessages(record);
    await interaction.followUp({ content: 'キャンセル待ちに登録しました。空きが出たら先着順で自動参加します。', flags: MessageFlags.Ephemeral });
  });
}

async function handleReopenRecruitment(interaction) {
  const recruitmentId = interaction.customId.split(':')[1];
  await interaction.deferUpdate();
  await withMessageLock(recruitmentId, async () => {
    const record = store.data.recruitments[recruitmentId];
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.followUp({ content: 'この募集の保存データが見つかりません。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (record.ownerId !== interaction.user.id) {
      await interaction.followUp({ content: '募集者本人だけが再募集できます。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(record.closed && record.closedReason === 'full')) {
      await interaction.followUp({ content: '満員で締め切られた募集だけ再募集できます。', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!hasRecruitmentVacancy(record)) {
      await interaction.followUp({ content: 'まだ定員に空きがありません。参加者が抜けた後に再募集してください。', flags: MessageFlags.Ephemeral });
      return;
    }
    await promoteWaitlistIfPossible(interaction.guild, record);
    if (hasRecruitmentVacancy(record)) {
      record.closed = false;
      record.closedReason = null;
      record.fullNotificationSent = false;
    }
    await store.save();
    await editRecruitmentMessages(record);
    await interaction.editReply({
      content: record.closed ? 'キャンセル待ちから繰り上げ、再び定員に達しました。' : '再募集を開始しました。',
      components: [record.closed
        ? ownerFullControls(recruitmentId, record.limitedVoiceEnabled)
        : ownerCancelButton(recruitmentId, record.limitedVoiceEnabled, record.notifyOwnerOnFull)],
    });
  });
}

async function handleClose(interaction) {
  const messageId = interaction.options.getString('メッセージid', false);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const located = messageId
    ? findRecruitment(messageId)
    : findLatestOwnedOpenRecruitment(interaction.guildId, interaction.user.id);
  if (!located) {
    await interaction.editReply(messageId
      ? '指定された募集が見つかりません。'
      : 'あなたの進行中の募集が見つかりません。複数ある場合や古い募集を指定する場合はメッセージIDを入力してください。');
    return;
  }
  await withMessageLock(located.recruitmentId, async () => {
    const latest = messageId ? findRecruitment(messageId) : located;
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
    try {
      await closeRecruitmentPanel(interaction.guild, located.recruitmentId, record, 'completed');
    } catch (error) {
      console.error('募集終了処理に失敗:', error.message);
      await interaction.editReply('募集を終了できませんでした。');
      return;
    }
    await appendAuditLog({
      action: '募集終了',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: located.recruitmentId,
      details: recruitmentName(record),
    });
    await interaction.editReply('募集を終了しました。募集メッセージは終了状態に更新しました。');
  });
}

async function handleCancelCommand(interaction) {
  const messageId = interaction.options.getString('メッセージid', false);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const located = messageId
    ? findRecruitment(messageId)
    : findLatestOwnedOpenRecruitment(interaction.guildId, interaction.user.id);
  if (!located) {
    await interaction.editReply(messageId
      ? '指定された募集が見つかりません。'
      : 'あなたの進行中の募集が見つかりません。複数ある場合や古い募集を指定する場合はメッセージIDを入力してください。');
    return;
  }
  await withMessageLock(located.recruitmentId, async () => {
    const latest = messageId ? findRecruitment(messageId) : located;
    const record = latest?.record;
    if (!record || record.guildId !== interaction.guildId) {
      await interaction.editReply('指定された募集が見つかりません。');
      return;
    }
    const canManage = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
    if (record.ownerId !== interaction.user.id && !canManage) {
      await interaction.editReply('募集者本人、または「メッセージの管理」権限を持つ人だけがキャンセルできます。');
      return;
    }
    if (record.closed) {
      await interaction.editReply('この募集はすでに終了しています。');
      return;
    }
    try {
      await closeRecruitmentPanel(interaction.guild, located.recruitmentId, record, 'cancelled');
    } catch (error) {
      console.error('募集キャンセル処理に失敗:', error.message);
      await interaction.editReply('募集をキャンセルできませんでした。');
      return;
    }
    await appendAuditLog({
      action: '募集キャンセル',
      actor: auditActorFromInteraction(interaction),
      guildId: interaction.guildId,
      target: located.recruitmentId,
      details: recruitmentName(record),
    });
    await interaction.editReply('募集をキャンセルしました。募集メッセージはキャンセル状態に更新しました。');
  });
}

async function sendSupportNotification(guild, { author, title, content, url, attachments = [], threadId = null }) {
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
  const buttons = [];
  if (url) {
    buttons.push(new ButtonBuilder().setLabel('投稿を開いて返信する').setStyle(ButtonStyle.Link).setURL(url));
  }
  if (threadId) {
    const thread = await guild.channels.fetch(threadId).catch(() => null);
    if (thread) {
      upsertSupportTicket(thread, { author, title, content, url, status: 'open' });
      await store.save();
    }
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`support-start:${threadId}`)
        .setLabel('担当者として対応開始')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`support-resolve:${threadId}`)
        .setLabel('投稿を解決済みにする')
        .setStyle(ButtonStyle.Success),
    );
  }
  const components = buttons.length
    ? [new ActionRowBuilder().addComponents(...buttons)]
    : [];
  const sent = await adminChannel.send({
    content: `<@${SUPPORT_NOTIFY_USER_ID}> サポートセンターに新しい投稿があります。内容を確認して返信をお願いします。`,
    embeds: [embed],
    components,
    allowedMentions: { users: [SUPPORT_NOTIFY_USER_ID], roles: [] },
  });
  if (threadId && store.data.supportTickets?.[threadId]) {
    store.data.supportTickets[threadId].adminChannelId = sent.channelId;
    store.data.supportTickets[threadId].adminMessageId = sent.id;
    await store.save();
  }
}

function canManageSupport(interaction) {
  const roles = interaction.member?.roles;
  const hasAdminRole = roles?.cache?.has?.(ADMIN_ROLE_ID)
    || (Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID));
  const canManage = interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageThreads)
    || interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageChannels);
  return interaction.channelId === ADMIN_COMMAND_CHANNEL_ID && (hasAdminRole || canManage);
}

async function ensureSupportTag(guild, tagName) {
  const parent = await guild.channels.fetch(SUPPORT_CENTER_CHANNEL_ID).catch(() => null);
  const tags = parent?.availableTags || [];
  const existing = tags.find((tag) => tag.name === tagName);
  if (existing?.id) return existing.id;
  if (!parent?.setAvailableTags) return null;
  const nextTags = [...tags, { name: tagName, moderated: false }];
  await parent.setAvailableTags(nextTags, `サポートタグ「${tagName}」を作成`).catch((error) => {
    console.error(`サポートタグ「${tagName}」を作成できませんでした:`, error.message);
  });
  const refreshed = await guild.channels.fetch(SUPPORT_CENTER_CHANNEL_ID).catch(() => null);
  return refreshed?.availableTags?.find((tag) => tag.name === tagName)?.id || null;
}

async function findSupportTagId(guild, tagName) {
  const parent = await guild.channels.fetch(SUPPORT_CENTER_CHANNEL_ID).catch(() => null);
  return parent?.availableTags?.find((tag) => tag.name === tagName)?.id || null;
}

async function handleSupportStart(interaction) {
  if (!canManageSupport(interaction)) {
    await interaction.reply({ content: 'この操作は管理者限定チャットの管理者だけが実行できます。', flags: MessageFlags.Ephemeral });
    return;
  }

  const threadId = interaction.customId.split(':')[1];
  const thread = await interaction.guild.channels.fetch(threadId).catch(() => null);
  if (!thread?.isThread()) {
    await interaction.reply({ content: '対象のサポート投稿が見つかりませんでした。', flags: MessageFlags.Ephemeral });
    return;
  }

  const tagId = await ensureSupportTag(interaction.guild, SUPPORT_IN_PROGRESS_TAG_NAME);
  if (tagId) {
    const appliedTags = new Set(thread.appliedTags || []);
    appliedTags.add(tagId);
    await thread.setAppliedTags([...appliedTags], 'サポート投稿を対応中に変更').catch((error) =>
      console.error('対応中タグを付与できませんでした:', error.message));
  }
  const ticket = upsertSupportTicket(thread, { status: 'in_progress' });
  if (ticket) {
    ticket.status = 'in_progress';
    ticket.assigneeId = interaction.user.id;
    ticket.assigneeName = interaction.member?.displayName || interaction.user.username;
    ticket.updatedAt = new Date().toISOString();
  }
  await store.save();

  if (ticket?.authorId) {
    const author = await client.users.fetch(ticket.authorId).catch(() => null);
    const assigneeName = ticket.assigneeName || interaction.member?.displayName || interaction.user.username;
    await author?.send(`${ticket.url || thread.url} について、${assigneeName}が対応を開始いたしました。\n返信までしばらくお待ちください。`).catch((error) =>
      console.error('サポート投稿者へ対応開始DMを送信できませんでした:', error.message));
  }
  await appendAuditLog({
    action: 'サポート対応開始',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: threadId,
    details: thread.name,
  });
  await interaction.reply({ content: '担当者として対応開始にしました。投稿者へ通知しました。', flags: MessageFlags.Ephemeral });
}

async function handleSupportResolve(interaction) {
  if (!canManageSupport(interaction)) {
    await interaction.reply({ content: 'この操作は管理者限定チャットの管理者だけが実行できます。', flags: MessageFlags.Ephemeral });
    return;
  }

  const threadId = interaction.customId.split(':')[1];
  const thread = await interaction.guild.channels.fetch(threadId).catch(() => null);
  if (!thread?.isThread()) {
    await interaction.reply({ content: '対象のサポート投稿が見つかりませんでした。', flags: MessageFlags.Ephemeral });
    return;
  }

  const appliedTags = new Set(thread.appliedTags || []);
  const inProgressTagId = await findSupportTagId(interaction.guild, SUPPORT_IN_PROGRESS_TAG_NAME);
  if (inProgressTagId) appliedTags.delete(inProgressTagId);
  appliedTags.add(SUPPORT_RESOLVED_TAG_ID);
  await thread.setAppliedTags([...appliedTags], 'サポート投稿を解決済みに変更');
  await thread.setLocked(true, 'サポート投稿を解決済みに変更');
  await thread.setArchived(true, 'サポート投稿を解決済みに変更');
  const ticket = upsertSupportTicket(thread, { status: 'resolved' });
  if (ticket) {
    ticket.status = 'resolved';
    ticket.updatedAt = new Date().toISOString();
  }
  await store.save();
  await appendAuditLog({
    action: 'サポート解決',
    actor: auditActorFromInteraction(interaction),
    guildId: interaction.guildId,
    target: threadId,
    details: thread.name,
  });
  await interaction.reply({ content: 'サポート投稿を解決済みにし、ロック・クローズしました。', flags: MessageFlags.Ephemeral });
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
  setBotVersionPresence();
  syncBotProfileDescription().catch((error) =>
    console.error('BOTプロフィール説明の同期に失敗しました:', error.message));
  startAdminWeb().catch((error) => console.error('管理Webサイトの起動に失敗しました:', error.message));
  try {
    await registerCommands();
  } catch (error) {
    console.error('コマンド登録に失敗しました:', error);
  }
  for (const guild of client.guilds.cache.values()) {
    if (!isPrimaryGuild(guild.id)) continue;
    syncMemberRoles(guild).catch((error) =>
      console.error('メンバーロールの初期同期に失敗しました:', error.message));
    cleanupLegacyListenOnlyAccess(guild)
      .then(() => syncListenOnlyChannelsQueued(guild))
      .catch((error) => console.error('聞き専チャンネルの初期同期に失敗しました:', error.message));
    if (!hasOpenLimitedVoiceRecruitments(guild.id)) {
      resetVoiceAccessIfEmpty(guild).catch((error) =>
        console.error('未使用の募集VC権限を復元できませんでした:', error.message));
    }
  }
  notifyRecruitmentStartTimes().catch((error) => console.error('開始時刻通知に失敗しました:', error.message));
  setInterval(() => {
    notifyRecruitmentStartTimes().catch((error) => console.error('開始時刻通知に失敗しました:', error.message));
  }, 60_000);
  pollValorantPostMatchPartyNotifications().catch((error) => console.error('VALORANT試合後通知に失敗しました:', error.message));
  setInterval(() => {
    pollValorantPostMatchPartyNotifications().catch((error) => console.error('VALORANT試合後通知に失敗しました:', error.message));
  }, 10_000);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (isMusicCommandName(interaction.commandName)) {
        if (interaction.commandName === 'play') await handleMusicPlay(interaction);
        else if (interaction.commandName === 'playmp3') await handleMusicPlayMp3(interaction);
        else if (interaction.commandName === 'stop') await handleMusicStopSafe(interaction);
        else if (interaction.commandName === 'skip') await handleMusicSkipSafe(interaction);
        else if (interaction.commandName === 'loop') await handleMusicLoop(interaction);
        else if (interaction.commandName === 'qloop') await handleMusicQueueLoop(interaction);
        else if (interaction.commandName === 'shuffle') await handleMusicShuffle(interaction);
        else if (interaction.commandName === 'setting') await handleMusicSetting(interaction);
        return;
      }
      if (!isPrimaryGuild(interaction.guildId)) {
        await interaction.reply({
          content: 'このサーバーでは音楽再生機能のみ使用できます。',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (interaction.commandName === '募集') await handleRecruitment(interaction);
      else if (interaction.commandName === '緊急募集') await handleEmergencyRecruitment(interaction);
      else if (interaction.commandName === '募集debug') await handleRecruitment(interaction, true);
      else if (interaction.commandName === '募集終了') await handleClose(interaction);
      else if (interaction.commandName === '募集キャンセル') await handleCancelCommand(interaction);
      else if (interaction.commandName === '日程調整募集') await handleSchedulePoll(interaction);
      else if (interaction.commandName === '使い方') await handleHelp(interaction);
      else if (interaction.commandName === 'おみくじ') await handleFortune(interaction, 'regular');
      else if (interaction.commandName === '恋みくじ') await handleFortune(interaction, 'love');
      else if (interaction.commandName === 'valorant') await handleValorantCommand(interaction);
      else if (interaction.commandName === 'play') await handleMusicPlay(interaction);
      else if (interaction.commandName === 'playmp3') await handleMusicPlayMp3(interaction);
      else if (interaction.commandName === 'stop') await handleMusicStopSafe(interaction);
      else if (interaction.commandName === 'skip') await handleMusicSkipSafe(interaction);
      else if (interaction.commandName === 'loop') await handleMusicLoop(interaction);
      else if (interaction.commandName === 'qloop') await handleMusicQueueLoop(interaction);
      else if (interaction.commandName === 'shuffle') await handleMusicShuffle(interaction);
      else if (interaction.commandName === 'setting') await handleMusicSetting(interaction);
      else if (interaction.commandName === 'お知らせ') await handleAdminAnnouncement(interaction);
      else if (interaction.commandName === 'チャット送信') await handleAdminChannelMessage(interaction);
      else if (interaction.commandName === '部屋設定') await handlePrivateRoomCommand(interaction);
      if (interaction.commandName === '更新情報') await handleUpdateInfo(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'recruit-game') {
      await handleGameSelection(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'recruit-emergency-game') {
      await handleEmergencyGameSelection(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'recruit-debug-game') {
      await handleGameSelection(interaction, true);
    } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('music-setting:')) {
      await handleMusicSettingSelect(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('schedule-vote:')) {
      await handleScheduleVote(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'tts-settings-form') {
      await handleTtsSettingsForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'admin-announcement-form') {
      await handleAdminAnnouncementForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'update-info-form') {
      await handleUpdateInfoForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'schedule-poll-form') {
      await handleSchedulePollForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('private-room:')) {
      await handlePrivateRoomModal(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('recruit-edit-form:')) {
      await handleEditRecruitmentForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('recruit-supplement:')) {
      await handleRecruitmentSupplementForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('recruit-emergency-form:')) {
      await handleEmergencyRecruitmentForm(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('recruit-form:')) {
      await handleRecruitmentForm(interaction);
    } else if (interaction.isUserSelectMenu() && interaction.customId.startsWith('private-room:')) {
      await handlePrivateRoomUserSelect(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-time-mode:')) {
      await handleRecruitmentTimeMode(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('private-room:')) {
      await handlePrivateRoomButton(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('valorant-setting:post-match-party-dm:')) {
      await updateValorantPostMatchSetting(interaction, interaction.customId.endsWith(':on'));
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-edit:')) {
      await handleEditRecruitmentButton(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-voice:')) {
      await handleEnableLimitedVoice(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-complete:')) {
      await handleCompleteRecruitment(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-reopen:')) {
      await handleReopenRecruitment(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-full-dm:')) {
      await handleFullDmToggle(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('recruit-cancel:')) {
      await handleCancelRecruitment(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('support-resolve:')) {
      await handleSupportResolve(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('support-start:')) {
      await handleSupportStart(interaction);
    } else if (interaction.isButton() && interaction.customId === 'recruit-waitlist') {
      await handleWaitlistButton(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('schedule-finalize:')) {
      await handleScheduleFinalize(interaction);
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
  if (!isPrimaryGuild(member.guild.id)) return;
  await ensureMemberRole(member)
    .catch((error) => console.error('メンバーロールを自動付与できませんでした:', error.message));
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (!isPrimaryGuild(newMember.guild.id)) return;
  if (oldMember.pending && !newMember.pending) {
    await ensureMemberRole(newMember)
      .catch((error) => console.error('認証完了後にメンバーロールを付与できませんでした:', error.message));
  }
});

client.on('threadCreate', async (thread) => {
  if (!isPrimaryGuild(thread.guild?.id)) return;
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
      threadId: thread.id,
    });
  } catch (error) {
    console.error('サポート投稿を管理者へ通知できませんでした:', error.message);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.id === client.user?.id) return;
  try {
    if (oldState.channelId !== newState.channelId) {
      const primaryGuildEvent = isPrimaryGuild(oldState.guild.id);
      if (primaryGuildEvent && newState.channelId === PRIVATE_ROOM_CREATE_VOICE_CHANNEL_ID && newState.member) {
        await createPrivateVoiceRoom(newState.member);
      }
      if (primaryGuildEvent && oldState.channelId && store.data.privateRooms?.[oldState.channelId]) {
        await deletePrivateRoomIfEmpty(oldState.guild, oldState.channelId);
      }

      const visibilityChannelIds = [
        ...CONDITIONAL_VOICE_CHANNEL_IDS,
      ];
      if (
        primaryGuildEvent
        && (
        isManagedFreeChatVoiceChannel(oldState.channel)
        || isManagedFreeChatVoiceChannel(newState.channel)
        || visibilityChannelIds.includes(oldState.channelId)
        || visibilityChannelIds.includes(newState.channelId)
        )
      ) {
        await syncListenOnlyChannelsQueued(oldState.guild);
      }

      const ttsSession = ttsSessions.get(oldState.guild.id);
      if (primaryGuildEvent && ttsSession && oldState.channelId === ttsSession.voiceChannelId) {
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

      const musicSession = musicSessions.get(oldState.guild.id);
      if (musicSession && oldState.channelId === musicSession.voiceChannelId) {
        const channel = await oldState.guild.channels.fetch(musicSession.voiceChannelId).catch(() => null);
        const hasHumanMembers = channel?.isVoiceBased()
          && channel.members.some((member) => !member.user.bot);
        if (!hasHumanMembers) {
          stopMusicSession(oldState.guild.id, MUSIC_EMPTY_VOICE_END_MESSAGE);
        }
      }

      if (primaryGuildEvent && oldState.channelId === RECRUITMENT_VOICE_CHANNEL_ID) {
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
  if (!isPrimaryGuild(message.guild.id)) return;
  if (message.channelId === SUPPORT_CENTER_CHANNEL_ID) {
    await sendSupportNotification(message.guild, {
      author: message.author,
      title: 'サポートセンターへの新規投稿',
      content: message.content,
      url: message.url,
      attachments: message.attachments.map((attachment) => attachment.url),
    }).catch((error) => console.error('サポート投稿を管理者へ通知できませんでした:', error.message));
  }
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
  FORTUNE_CATEGORIES,
  STATUS,
  applyResponse,
  buildRecruitmentEmbed,
  buildHelpEmbed,
  buildFortuneEmbed,
  buildVoicePermissionOverwrites,
  canEnableLimitedVoice,
  commands,
  editRecruitmentModal,
  emergencyRecruitmentModal,
  emergencyRecruitmentPanel,
  initialResponses,
  mentionList,
  ownerCancelButton,
  ownerFullControls,
  planFreeChatVoiceLayout,
  privateRoomSettingsComponents,
  revokeVoiceSessionRecords,
  recruitmentModal,
  recruitmentName,
  recruitmentPanel,
  responseButtons,
  buildAtempoFilters,
  buildTtsAudioFilters,
  valorantPartyDmText,
  ttsSettingsModal,
};
