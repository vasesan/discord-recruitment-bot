const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyResponse,
  buildRecruitmentEmbed,
  buildVoicePermissionOverwrites,
  canEnableLimitedVoice,
  commands,
  mentionList,
  ownerCancelButton,
  recruitmentModal,
  recruitmentPanel,
  responseButtons,
} = require('../src/index');

test('DiscordコマンドがJSONへ変換できる', () => {
  assert.deepEqual(commands.map((command) => command.name), ['募集', '募集終了']);
  const recruitment = commands.find((command) => command.name === '募集');
  assert.equal(recruitment.options?.length || 0, 0);
  assert.equal(recruitment.description, '参加者を募集します');
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

test('飲み会が募集の選択肢に含まれる', () => {
  const panel = recruitmentPanel().toJSON();
  assert.ok(panel.components[0].options.some((option) => option.label === '飲み会' && option.value === 'drinking'));
});

test('募集フォームに内容・人数・日時を入力できる', () => {
  const modal = recruitmentModal('valorant').toJSON();
  const ids = modal.components.map((row) => row.components[0].custom_id);
  assert.deepEqual(ids, ['details', 'capacity', 'when', 'party-code']);
  assert.equal(modal.components[1].components[0].required, true);
  assert.equal(modal.components[3].components[0].required, false);
  assert.equal(modal.components[3].components[0].min_length, 6);
  assert.equal(modal.components[3].components[0].max_length, 6);
});

test('その他ゲームの募集フォームではゲーム名が必須', () => {
  const modal = recruitmentModal('other').toJSON();
  assert.equal(modal.components[0].components[0].custom_id, 'custom-game');
  assert.equal(modal.components[0].components[0].required, true);
});

test('募集者専用のキャンセルボタンを生成できる', () => {
  const row = ownerCancelButton('123456789012345678').toJSON();
  assert.equal(row.components[0].custom_id, 'recruit-cancel:123456789012345678');
  assert.equal(row.components[0].label, '募集をキャンセル');
  assert.equal(row.components[1].custom_id, 'recruit-voice:123456789012345678');
  assert.equal(row.components[1].label, '限定VCで開催する');
});

test('定員到達後も限定VCを開始できる', () => {
  assert.equal(canEnableLimitedVoice({ closed: true, closedReason: 'full' }), true);
  assert.equal(canEnableLimitedVoice({ closed: true, closedReason: 'cancelled' }), false);
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
