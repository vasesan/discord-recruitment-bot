const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyResponse,
  buildRecruitmentEmbed,
  commands,
  mentionList,
  responseButtons,
} = require('../src/index');

test('DiscordコマンドがJSONへ変換できる', () => {
  assert.deepEqual(commands.map((command) => command.name), ['募集', '募集終了']);
  const recruitment = commands.find((command) => command.name === '募集');
  const capacity = recruitment.options.find((option) => option.name === '定員');
  assert.equal(capacity.required, true);
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
  assert.equal(buttons.components.length, 3);
});

test('飲み会が募集の選択肢に含まれる', () => {
  const recruitment = commands.find((command) => command.name === '募集');
  const typeOption = recruitment.options.find((option) => option.name === '種類');
  assert.ok(typeOption.choices.some((choice) => choice.name === '飲み会' && choice.value === 'drinking'));
});

test('長いメンション一覧はEmbed上限以内に省略する', () => {
  const ids = Array.from({ length: 100 }, (_, index) => String(100000000000000000n + BigInt(index)));
  const value = mentionList(ids);
  assert.ok(value.length <= 1024);
  assert.match(value, /ほか/);
});
