const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GAMES,
  applyResponse,
  buildRecruitmentEmbed,
  buildHelpEmbed,
  buildAtempoFilters,
  buildTtsAudioFilters,
  buildVoicePermissionOverwrites,
  canEnableLimitedVoice,
  commands,
  editRecruitmentModal,
  initialResponses,
  mentionList,
  ownerCancelButton,
  ownerFullControls,
  planFreeChatVoiceLayout,
  revokeVoiceSessionRecords,
  recruitmentModal,
  recruitmentName,
  recruitmentPanel,
  responseButtons,
  ttsSettingsModal,
} = require('../src/index');

test('DiscordコマンドがJSONへ変換できる', () => {
  assert.deepEqual(commands.map((command) => command.name), [
    '募集',
    '募集終了',
    '使い方',
    '読み上げ',
    '読み上げ終了',
    '読み上げ設定',
    '読み上げ辞書登録',
    'お知らせ',
    'チャット送信',
  ]);
  const recruitment = commands.find((command) => command.name === '募集');
  assert.equal(recruitment.options?.length || 0, 0);
  assert.equal(recruitment.description, '参加者を募集します');
});

test('ばーせbotの使い方ページを生成できる', () => {
  const embed = buildHelpEmbed().toJSON();
  assert.equal(embed.title, '📖 ばーせbotの使い方');
  assert.match(embed.fields[0].value, /\/募集/);
  assert.match(embed.fields[2].value, /限定VC/);
  assert.match(embed.fields[0].value, /無制限/);
  assert.ok(embed.fields.some((field) => /読み上げ/.test(field.name)));
});

test('募集者は作成時点から参加者に含まれる', () => {
  assert.deepEqual(initialResponses('owner'), { owner: 'join' });
});

test('定員に達すると募集を自動で締め切る', () => {
  const record = { capacity: 2, responses: { '111': 'join' }, closed: false };
  const result = applyResponse(record, '222', 'join');
  assert.equal(result.full, true);
  assert.equal(record.closed, true);
  assert.equal(record.closedReason, 'full');
});

test('満員後の追加参加を拒否する', () => {
  const record = { capacity: 1, responses: { '111': 'join' }, closed: false };
  const result = applyResponse(record, '222', 'join');
  assert.equal(result.accepted, false);
  assert.equal(record.responses['222'], undefined);
});

test('人数無制限の募集は参加者が増えても締め切らない', () => {
  const record = { capacity: null, responses: { '111': 'join' }, closed: false };
  for (let index = 0; index < 30; index++) {
    const result = applyResponse(record, String(200 + index), 'join');
    assert.equal(result.accepted, true);
    assert.equal(result.full, false);
  }
  assert.equal(record.closed, false);
});

test('募集Embedと回答ボタンを生成できる', () => {
  const record = {
    ownerId: '123456789012345678',
    game: 'valorant',
    customGame: null,
    details: 'コンペ募集',
    when: '今日22時',
    partyCode: 'A1B2C3',
    capacity: 5,
    responses: {
      '223456789012345678': 'join',
      '323456789012345678': 'maybe',
    },
    closed: false,
    createdAt: '2026-06-23T00:00:00.000Z',
  };

  const embed = buildRecruitmentEmbed(record).toJSON();
  const buttons = responseButtons().toJSON();
  assert.match(embed.title, /VALORANT/);
  assert.equal(embed.fields[2].name, '参加 (1 / 5人)');
  assert.equal(embed.fields.at(-1).value, '`A1B2C3`');
  assert.equal(buttons.components.length, 3);
});

test('人数無制限を募集Embedへ表示する', () => {
  const embed = buildRecruitmentEmbed({
    ownerId: '123456789012345678',
    game: 'minecraft',
    customGame: null,
    details: '自由参加',
    when: '',
    partyCode: null,
    capacity: null,
    responses: { '123456789012345678': 'join' },
    closed: false,
    createdAt: '2026-06-23T00:00:00.000Z',
  }).toJSON();
  assert.equal(embed.fields[2].name, '参加 (1 / 無制限)');
});

test('飲み会が募集の選択肢に含まれる', () => {
  const panel = recruitmentPanel().toJSON();
  assert.ok(panel.components[0].options.some((option) => option.label === '飲み会' && option.value === 'drinking'));
});

test('新しいゲームと全員募集が募集の選択肢に含まれる', () => {
  const options = recruitmentPanel().toJSON().components[0].options;
  assert.ok(options.some((option) => option.value === 'overwatch'));
  assert.ok(options.some((option) => option.value === 'apex'));
  assert.ok(options.some((option) => option.value === 'madamis'));
  assert.ok(options.some((option) => option.value === 'splatoon' && option.label === 'スプラトゥーン'));
  assert.ok(options.some((option) => option.value === 'everyone' && option.label === '全員を呼び出し'));
  assert.equal(options.findIndex((option) => option.value === 'splatoon') + 1,
    options.findIndex((option) => option.value === 'minecraft'));
  assert.ok(options.findIndex((option) => option.value === 'madamis')
    < options.findIndex((option) => option.value === 'drinking'));
  assert.equal(options.findIndex((option) => option.value === 'madamis') + 1,
    options.findIndex((option) => option.value === 'other'));
  assert.deepEqual(options.slice(-2).map((option) => option.value), ['drinking', 'everyone']);
  assert.equal(GAMES.everyone.roleId, '1519333096309395516');
  assert.equal(GAMES.splatoon.roleId, '1519404400043626496');
});

test('募集フォームに内容・人数・日時を入力できる', () => {
  const modal = recruitmentModal('valorant').toJSON();
  const ids = modal.components.map((row) => row.components[0].custom_id);
  assert.deepEqual(ids, ['details', 'capacity', 'when', 'party-code']);
  assert.equal(modal.components[1].components[0].required, false);
  assert.equal(modal.components[3].components[0].required, false);
  assert.equal(modal.components[3].components[0].min_length, 6);
  assert.equal(modal.components[3].components[0].max_length, 6);
});

test('その他ゲームの募集フォームではゲーム名が必須', () => {
  const modal = recruitmentModal('other').toJSON();
  assert.equal(modal.components[0].components[0].custom_id, 'custom-game');
  assert.equal(modal.components[0].components[0].required, true);
});

test('全員募集でもゲーム名・イベント名が必須', () => {
  const modal = recruitmentModal('everyone').toJSON();
  assert.equal(modal.components[0].components[0].custom_id, 'custom-game');
  assert.equal(modal.components[0].components[0].required, true);
});

test('募集者専用のキャンセルボタンを生成できる', () => {
  const row = ownerCancelButton('123456789012345678').toJSON();
  assert.equal(row.components[0].custom_id, 'recruit-cancel:123456789012345678');
  assert.equal(row.components[0].label, '募集をキャンセル');
  assert.equal(row.components[1].custom_id, 'recruit-voice:123456789012345678');
  assert.equal(row.components[1].label, '限定VCで開催する');
  assert.equal(row.components[2].custom_id, 'recruit-edit:123456789012345678');
  assert.equal(row.components[2].label, '募集を編集');
  assert.equal(row.components[3].custom_id, 'recruit-full-dm:123456789012345678');
  assert.equal(row.components[3].label, '満員時DM: OFF');
});

test('募集者が満員時DMを有効表示にできる', () => {
  const row = ownerCancelButton('message', false, true).toJSON();
  assert.equal(row.components[3].label, '満員時DM: ON');
});

test('読み上げ設定画面で速度・高さ・音量・声タイプを入力できる', () => {
  const modal = ttsSettingsModal('user').toJSON();
  assert.equal(modal.custom_id, 'tts-settings-form');
  assert.equal(modal.components[0].components[0].value, '1.00');
  assert.equal(modal.components[1].components[0].value, '1.00');
  assert.equal(modal.components[2].components[0].value, '1.00');
  assert.equal(modal.components[3].components[0].value, 'standard');
});

test('極端な速度比は複数のatempoフィルターへ分割する', () => {
  assert.deepEqual(buildAtempoFilters(0.25), ['atempo=0.5', 'atempo=0.5000']);
  assert.deepEqual(buildAtempoFilters(4), ['atempo=2.0', 'atempo=2.0000']);
  assert.match(buildTtsAudioFilters({ speed: 1.5, pitch: 1.25, volume: 1.2 }), /volume=1.20/);
  assert.match(buildTtsAudioFilters({ speed: 1.5, pitch: 1.25, volume: 1.2 }), /asetrate=60000/);
  assert.match(buildTtsAudioFilters({ speed: 1.5, pitch: 1.25, volume: 1.2 }), /atempo=1.2000/);
  assert.match(buildTtsAudioFilters({ speed: 1, pitch: 1, volume: 1, voice: 'robot' }), /tremolo/);
  assert.match(buildTtsAudioFilters({ speed: 1, pitch: 1, volume: 1, voice: 'radio' }), /acrusher/);
});

test('募集編集フォームへ現在値を引き継ぐ', () => {
  const modal = editRecruitmentModal('message', {
    game: 'valorant',
    customGame: null,
    details: 'コンペ募集',
    capacity: 5,
    when: '22時',
    partyCode: 'A1B2C3',
  }).toJSON();
  assert.equal(modal.custom_id, 'recruit-edit-form:message');
  assert.equal(modal.components[0].components[0].value, 'コンペ募集');
  assert.equal(modal.components[1].components[0].value, '5');
  assert.equal(modal.components[2].components[0].value, '22時');
});

test('終了通知用のゲーム名を取得できる', () => {
  assert.equal(recruitmentName({ game: 'valorant', customGame: null }), 'VALORANT');
  assert.equal(recruitmentName({ game: 'other', customGame: 'テストゲーム' }), 'テストゲーム');
});

test('定員到達後も限定VCを開始できる', () => {
  assert.equal(canEnableLimitedVoice({ closed: true, closedReason: 'full' }), true);
  assert.equal(canEnableLimitedVoice({ closed: true, closedReason: 'cancelled' }), false);
});

test('定員到達後のパネルには限定VCだけを残す', () => {
  const row = ownerFullControls('message').toJSON();
  assert.equal(row.components.length, 1);
  assert.equal(row.components[0].custom_id, 'recruit-voice:message');
});

test('長いメンション一覧はEmbed上限以内に省略する', () => {
  const ids = Array.from({ length: 100 }, (_, index) => String(100000000000000000n + BigInt(index)));
  const value = mentionList(ids);
  assert.ok(value.length <= 1024);
  assert.match(value, /ほか/);
});

test('募集VCは参加者だけ接続を許可する', () => {
  const connect = 1n << 20n;
  const viewChannel = 1n << 10n;
  const overwrites = buildVoicePermissionOverwrites(
    [{ id: 'guild', type: 0, allow: connect.toString(), deny: '0' }],
    'guild',
    ['participant'],
  );
  const everyone = overwrites.find((overwrite) => overwrite.id === 'guild');
  const participant = overwrites.find((overwrite) => overwrite.id === 'participant');
  assert.equal((everyone.deny & connect) === connect, true);
  assert.equal((everyone.deny & viewChannel) === viewChannel, true);
  assert.equal((everyone.allow & connect) === 0n, true);
  assert.equal((participant.allow & connect) === connect, true);
  assert.equal((participant.allow & viewChannel) === viewChannel, true);
  assert.equal((participant.deny & connect) === 0n, true);
});

test('参加を取り消した人には募集VCを非表示にする', () => {
  const connect = 1n << 20n;
  const viewChannel = 1n << 10n;
  const overwrites = buildVoicePermissionOverwrites(
    [{ id: 'guild', type: 0, allow: '0', deny: '0' }],
    'guild',
    [],
    ['cancelled-user'],
  );
  const cancelledUser = overwrites.find((overwrite) => overwrite.id === 'cancelled-user');
  assert.equal((cancelledUser.deny & connect) === connect, true);
  assert.equal((cancelledUser.deny & viewChannel) === viewChannel, true);
});

test('フリーチャットVCは利用中チャンネルを前詰めし次の空きだけ表示する', () => {
  const ids = ['vc1', 'vc2', 'vc3', 'vc4'];
  const plan = planFreeChatVoiceLayout(ids.map((id, index) => ({
    id,
    active: index === 0 || index === 1 || index === 3,
  })));
  assert.deepEqual(plan.map((item) => [item.id, item.displayIndex, item.visible]), [
    ['vc1', 1, true],
    ['vc2', 2, true],
    ['vc3', 4, true],
    ['vc4', 3, true],
  ]);

  const closedMiddle = planFreeChatVoiceLayout(ids.map((id, index) => ({
    id,
    active: index === 0 || index === 3,
  })));
  assert.deepEqual(closedMiddle.map((item) => [item.id, item.displayIndex, item.visible]), [
    ['vc1', 1, true],
    ['vc2', 3, true],
    ['vc3', 4, false],
    ['vc4', 2, true],
  ]);

  const empty = planFreeChatVoiceLayout(ids.map((id) => ({ id, active: false })));
  assert.deepEqual(empty.map((item) => [item.id, item.displayIndex, item.visible]), [
    ['vc1', 1, true],
    ['vc2', 2, false],
    ['vc3', 3, false],
    ['vc4', 4, false],
  ]);
});

test('VCが無人になったら募集中でも限定VCセッションを終了する', () => {
  const records = [
    { guildId: 'guild', limitedVoiceEnabled: true, voiceAccessRevoked: false, voiceSessionId: 'session' },
    { guildId: 'other', limitedVoiceEnabled: true, voiceAccessRevoked: false, voiceSessionId: 'session' },
  ];
  assert.equal(revokeVoiceSessionRecords(records, 'guild', 'session'), 1);
  assert.equal(records[0].voiceAccessRevoked, true);
  assert.equal(records[1].voiceAccessRevoked, false);
});
