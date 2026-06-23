require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
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

const GAMES = {
  valorant: { label: 'VALORANT', emoji: '🎯', roleId: process.env.ROLE_VALORANT || '1256457963971936286', color: 0xff4655 },
  r6s: { label: 'レインボーシックス シージ', emoji: '🛡️', roleId: process.env.ROLE_R6S || '1475169609375285465', color: 0xf2c94c },
  mahjong: { label: '雀魂', emoji: '🀄', roleId: process.env.ROLE_MAHJONG || '1518929621725478982', color: 0x2f80ed },
  minecraft: { label: 'マインクラフト', emoji: '⛏️', roleId: process.env.ROLE_MINECRAFT || '1503770016498319390', color: 0x6fcf97 },
  other: { label: 'その他ゲーム', emoji: '🎮', roleId: process.env.ROLE_OTHER || '1518929755552874677', color: 0x9b51e0 },
  drinking: { label: '飲み会', emoji: '🍻', roleId: process.env.ROLE_DRINKING || '1516889561030983690', color: 0xf2994a },
};

const STATUS = {
  join: { label: '参加', emoji: '✅', style: ButtonStyle.Success },
  maybe: { label: '未定', emoji: '🤔', style: ButtonStyle.Secondary },
  decline: { label: '不参加', emoji: '❌', style: ButtonStyle.Danger },
};

const recruitmentCommand = new SlashCommandBuilder()
  .setName('募集')
  .setDescription('非公開の入力パネルから参加者を募集します')
  .setContexts(InteractionContextType.Guild);

const closeCommand = new SlashCommandBuilder()
  .setName('募集終了')
  .setDescription('自分が作成した募集を締め切ります')
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option.setName('メッセージid').setDescription('募集メッセージのID（メッセージを右クリックしてコピー）').setRequired(true));

const commands = [recruitmentCommand, closeCommand].map((command) => command.toJSON());

class Store {
  constructor(filename) {
    this.filename = filename;
    this.data = { recruitments: {} };
    this.writeChain = Promise.resolve();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    if (!fs.existsSync(this.filename)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filename, 'utf8'));
      if (parsed && parsed.recruitments) {
        this.data = { recruitments: parsed.recruitments };
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
  intents: [GatewayIntentBits.Guilds],
});

const messageLocks = new Map();

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

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const guildIds = GUILD_ID ? [GUILD_ID] : [...client.guilds.cache.keys()];

  if (guildIds.length) {
    await Promise.all(guildIds.map((guildId) =>
      rest.put(`/applications/${CLIENT_ID}/guilds/${guildId}/commands`, { body: commands })));
    console.log(`${guildIds.length}個のサーバーへコマンドを登録しました。`);
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

function recruitmentModal(gameKey) {
  const game = GAMES[gameKey];
  const modal = new ModalBuilder()
    .setCustomId(`recruit-form:${gameKey}`)
    .setTitle(`${game.label} の募集`);

  if (gameKey === 'other') {
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
        .setLabel('募集人数（1～25人）')
        .setPlaceholder('例: 5')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(2)
        .setRequired(true),
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
  const capacity = ` / ${record.capacity}人`;
  const footer = record.closed
    ? (record.closedReason === 'full' ? '定員に達したため自動で締め切りました' : '募集は終了しました')
    : '下のボタンから回答を変更できます';

  return new EmbedBuilder()
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
    if (participantCount >= record.capacity) return { accepted: false, reason: 'full', full: true };
  }

  record.responses[userId] = response;
  const participantCount = Object.values(record.responses).filter((value) => value === 'join').length;
  const full = participantCount >= record.capacity;
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

async function handleRecruitment(interaction) {
  await interaction.reply({
    content: '募集するゲーム・イベントを選択してください。選択後に入力画面が開きます。',
    components: [recruitmentPanel()],
    flags: MessageFlags.Ephemeral,
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
  const capacity = Number(capacityText);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 25) {
    await interaction.reply({ content: '募集人数は1～25の半角数字で入力してください。', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let role;
  try {
    role = await getNotificationRole(interaction.guild, gameKey);
  } catch (error) {
    console.error('通知ロールの準備に失敗:', error);
    await interaction.editReply(`通知ロールを確認できません。ロールIDとBotの権限を確認してください。\n${error.message}`);
    return;
  }

  const record = {
    ownerId: interaction.user.id,
    game: gameKey,
    customGame: gameKey === 'other' ? interaction.fields.getTextInputValue('custom-game').trim() : null,
    details: interaction.fields.getTextInputValue('details').trim(),
    when: interaction.fields.getTextInputValue('when').trim(),
    capacity,
    responses: {},
    messageRefs: [],
    closed: false,
    createdAt: new Date().toISOString(),
  };

  let announcementMessage;
  try {
    const announcementChannel = await interaction.guild.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
    if (!announcementChannel?.isTextBased()) throw new Error('指定先がテキストチャンネルではありません。');
    announcementMessage = await announcementChannel.send({
      content: `<@&${role.id}> 募集してるよ！`,
      embeds: [buildRecruitmentEmbed(record)],
      components: [responseButtons()],
      allowedMentions: { roles: [role.id], users: [] },
    });
  } catch (error) {
    console.error('募集チャンネルへの投稿に失敗:', error.message);
    await interaction.editReply(`募集チャンネル <#${ANNOUNCEMENT_CHANNEL_ID}> へ投稿できませんでした。Botの権限を確認してください。`);
    return;
  }

  record.guildId = interaction.guildId;
  record.messageRefs.push({ messageId: announcementMessage.id, channelId: announcementMessage.channelId });
  store.data.recruitments[announcementMessage.id] = record;
  await store.save();
  await interaction.editReply(`募集を <#${ANNOUNCEMENT_CHANNEL_ID}> に投稿しました。\nhttps://discord.com/channels/${interaction.guildId}/${announcementMessage.channelId}/${announcementMessage.id}`);
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

    const result = applyResponse(record, interaction.user.id, response);
    if (!result.accepted) {
      await interaction.followUp({
        content: result.reason === 'full' ? '定員に達しているため参加できません。' : 'この募集は終了しています。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await store.save();
    await editRecruitmentMessages(record);
    if (result.full) {
      await interaction.followUp({ content: '定員に達したため、自動で募集を締め切りました。', flags: MessageFlags.Ephemeral });
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
    await store.save();
    const updated = await editRecruitmentMessages(record);
    await interaction.editReply(updated ? '募集を終了しました。' : '保存上は終了しましたが、募集メッセージを更新できませんでした。');
  });
}

client.once('clientReady', async () => {
  console.log(`${client.user.tag} としてログインしました。`);
  try {
    await registerCommands();
  } catch (error) {
    console.error('コマンド登録に失敗しました:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === '募集') await handleRecruitment(interaction);
      else if (interaction.commandName === '募集終了') await handleClose(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'recruit-game') {
      await handleGameSelection(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('recruit-form:')) {
      await handleRecruitmentForm(interaction);
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
  commands,
  mentionList,
  recruitmentModal,
  recruitmentPanel,
  responseButtons,
};
