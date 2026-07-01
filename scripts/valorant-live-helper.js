#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');

// Riot ClientのローカルAPIは自己署名証明書を使うため、管理者PC上の補助アプリ内だけで無効化する。
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DEFAULT_CLIENT_PLATFORM = Buffer.from(JSON.stringify({
  platformType: 'PC',
  platformOS: 'Windows',
  platformOSVersion: '10.0.19042.1.256.64bit',
  platformChipset: 'Unknown',
})).toString('base64');

const config = {
  botUrl: process.env.BOT_ADMIN_URL || 'http://220.158.28.30:3000/api/valorant/live-match',
  botUser: process.env.BOT_ADMIN_USER || 'admin',
  botPassword: process.env.BOT_ADMIN_PASSWORD || '',
  intervalMs: Number(process.env.POLL_INTERVAL_MS || 15_000),
  once: process.argv.includes('--once') || process.env.ONCE === '1',
  region: (process.env.VALORANT_REGION || '').toLowerCase(),
  shard: (process.env.VALORANT_SHARD || '').toLowerCase(),
  verbose: process.argv.includes('--verbose') || process.env.VERBOSE === '1',
};

const localAgent = new https.Agent({ rejectUnauthorized: false });
let lastSentMatchKey = '';

function log(...args) {
  console.log(new Date().toLocaleString('ja-JP'), ...args);
}

function debug(...args) {
  if (config.verbose) log('[debug]', ...args);
}

function riotLockfilePath() {
  return path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'Riot Games',
    'Riot Client',
    'Config',
    'lockfile',
  );
}

function readLockfile() {
  const filename = riotLockfilePath();
  const raw = fs.readFileSync(filename, 'utf8').trim();
  const [name, pid, port, password, protocol] = raw.split(':');
  if (!port || !password || !protocol) throw new Error(`lockfile形式が不正です: ${filename}`);
  return { name, pid, port, password, protocol };
}

async function riotLocalFetch(lockfile, pathname) {
  const authorization = Buffer.from(`riot:${lockfile.password}`).toString('base64');
  const response = await fetch(`${lockfile.protocol}://127.0.0.1:${lockfile.port}${pathname}`, {
    headers: { Authorization: `Basic ${authorization}` },
    agent: localAgent,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`Riot local API ${pathname} failed: ${response.status} ${detail || ''}`);
  }
  return body;
}

async function riotRemoteFetch(url, { accessToken, entitlementToken, clientVersion }, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Riot-Entitlements-JWT': entitlementToken,
      'X-Riot-ClientVersion': clientVersion,
      'X-Riot-ClientPlatform': DEFAULT_CLIENT_PLATFORM,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    const error = new Error(`Riot remote API failed: ${response.status} ${detail || ''}`);
    error.status = response.status;
    error.body = body;
    error.url = url;
    throw error;
  }
  return body;
}

async function fetchClientVersion() {
  const response = await fetch('https://valorant-api.com/v1/version');
  const body = await response.json();
  return body?.data?.riotClientVersion || body?.data?.branch || '';
}

function normalizeRegionShard(inputRegion, inputShard) {
  let region = (inputRegion || 'ap').toLowerCase();
  let shard = (inputShard || region).toLowerCase();
  if (['jp', 'ja', 'jpn', 'jp1'].includes(region)) region = 'ap';
  if (['jp', 'ja', 'jpn', 'jp1'].includes(shard)) shard = 'ap';
  if (region === 'br' || region === 'latam') return { region, shard: 'na' };
  return { region, shard };
}

async function getRegionShard(lockfile) {
  if (config.region || config.shard) return normalizeRegionShard(config.region, config.shard);
  const regionLocale = await riotLocalFetch(lockfile, '/riotclient/region-locale').catch(() => null);
  return normalizeRegionShard(regionLocale?.region || regionLocale?.webRegion || 'ap', regionLocale?.region || 'ap');
}

function playerFromCurrentGame(player) {
  const identity = player.PlayerIdentity || player.playerIdentity || {};
  return {
    puuid: player.Subject || player.subject || identity.Subject || identity.subject || '',
    subject: player.Subject || player.subject || identity.Subject || identity.subject || '',
    team_id: player.TeamID || player.teamId || player.team_id || '',
    character_id: player.CharacterID || player.characterId || player.character_id || '',
    character: player.CharacterID || player.characterId || player.character_id || '',
    agent: player.AgentName ? { name: player.AgentName } : undefined,
    accountLevel: identity.AccountLevel ?? identity.accountLevel ?? null,
    party_id: extractPartyIdFromObject(player),
    partySource: extractPartyIdFromObject(player) ? 'match-payload' : '',
  };
}

function normalizeKey(key) {
  return String(key || '').replace(/[_-]/g, '').toLowerCase();
}

function findFirstStringByKeys(value, keyNames, depth = 0, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || depth > 6) return '';
  if (seen.has(value)) return '';
  seen.add(value);
  const normalizedKeys = new Set(keyNames.map(normalizeKey));
  for (const [key, entry] of Object.entries(value)) {
    if (normalizedKeys.has(normalizeKey(key)) && typeof entry === 'string' && entry) {
      return entry;
    }
  }
  for (const entry of Object.values(value)) {
    const found = findFirstStringByKeys(entry, keyNames, depth + 1, seen);
    if (found) return found;
  }
  return '';
}

function extractPartyIdFromObject(value) {
  return findFirstStringByKeys(value, [
    'PartyID',
    'PartyId',
    'party_id',
    'partyId',
    'CurrentPartyID',
    'currentPartyId',
  ]);
}

function extractSubjectFromObject(value) {
  return findFirstStringByKeys(value, [
    'Subject',
    'subject',
    'PUUID',
    'puuid',
  ]);
}

async function fetchNameService(puuids, { shard }, auth) {
  const subjects = [...new Set(puuids.filter(Boolean))];
  if (!subjects.length) return new Map();
  const body = await riotRemoteFetch(`https://pd.${shard}.a.pvp.net/name-service/v2/players`, auth, {
    method: 'PUT',
    body: subjects,
  }).catch((error) => {
    debug('name-service取得失敗:', error.message);
    return [];
  });
  const names = new Map();
  for (const item of Array.isArray(body) ? body : []) {
    const subject = item.Subject || item.subject || item.puuid;
    if (!subject) continue;
    names.set(subject, {
      name: item.GameName || item.gameName || item.name || '',
      tag: item.TagLine || item.tagLine || item.tag || '',
    });
  }
  return names;
}

function partyMembersFromBody(party) {
  const members = Array.isArray(party?.Members)
    ? party.Members
    : Array.isArray(party?.members)
      ? party.members
      : [];
  return new Set(members.map(extractSubjectFromObject).filter(Boolean));
}

async function fetchPartyForSubject(subject, { region, shard }, auth) {
  const base = `https://glz-${region}-1.${shard}.a.pvp.net`;
  const partyPlayer = await riotRemoteFetch(`${base}/parties/v1/players/${subject}`, auth).catch((error) => {
    debug(`party player取得失敗 ${subject}:`, error.message);
    return null;
  });
  const partyId = extractPartyIdFromObject(partyPlayer);
  if (!partyId) return { partyId: '', subjects: new Set() };
  const party = await riotRemoteFetch(`${base}/parties/v1/parties/${partyId}`, auth).catch((error) => {
    debug(`party詳細取得失敗 ${partyId}:`, error.message);
    return null;
  });
  const subjects = partyMembersFromBody(party);
  if (!subjects.size) subjects.add(subject);
  return { partyId, subjects };
}

async function fetchPartyMapForPlayers(players, context, auth) {
  const subjects = [...new Set(players.map((player) => player.puuid || player.subject).filter(Boolean))];
  const records = await Promise.all(subjects.map((subject) => fetchPartyForSubject(subject, context, auth)));
  const partyMap = new Map();
  for (const record of records) {
    if (!record.partyId) continue;
    for (const subject of record.subjects) {
      partyMap.set(subject, record.partyId);
    }
  }
  return partyMap;
}

async function enrichLivePayload(payload, context, auth) {
  const players = Array.isArray(payload.players) ? payload.players : [];
  const puuids = players.map((player) => player.puuid || player.subject).filter(Boolean);
  const [names, partyMap] = await Promise.all([
    fetchNameService(puuids, context, auth),
    fetchPartyMapForPlayers(players, context, auth),
  ]);
  for (const player of players) {
    const subject = player.puuid || player.subject;
    const name = names.get(subject);
    if (name?.name) player.name = name.name;
    if (name?.tag) player.tag = name.tag;
    if (!player.party_id && partyMap.has(subject)) {
      player.party_id = partyMap.get(subject);
      player.partySource = subject === context.subject ? 'own-party' : 'party-api';
    }
  }
  return payload;
}

function summarizeCurrentGame(match, context) {
  const players = Array.isArray(match.Players) ? match.Players.map(playerFromCurrentGame) : [];
  return {
    source: 'valorant-live-helper',
    state: match.State || 'IN_PROGRESS',
    collectedAt: new Date().toISOString(),
    region: context.region,
    shard: context.shard,
    subject: context.subject,
    matchId: match.MatchID || context.matchId || '',
    mapId: match.MapID || '',
    map: match.MapID || '',
    modeId: match.ModeID || '',
    mode: match.ModeID || '',
    provisioningFlow: match.ProvisioningFlow || '',
    players,
  };
}

function playerFromPregame(player) {
  return {
    puuid: player.Subject || player.subject || '',
    subject: player.Subject || player.subject || '',
    team_id: 'Ally',
    character_id: player.CharacterID || player.characterId || player.character_id || '',
    character: player.CharacterID || player.characterId || player.character_id || '',
    agent: player.AgentName ? { name: player.AgentName } : undefined,
    party_id: player.PartyID || player.PartyId || player.party_id || player.partyId || '',
  };
}

function summarizePregame(match, context) {
  const allyPlayers = Array.isArray(match.AllyTeam?.Players) ? match.AllyTeam.Players : [];
  const players = allyPlayers.map(playerFromPregame);
  return {
    source: 'valorant-live-helper',
    state: match.State || 'PREGAME',
    collectedAt: new Date().toISOString(),
    region: context.region,
    shard: context.shard,
    subject: context.subject,
    matchId: match.ID || match.MatchID || context.matchId || '',
    mapId: match.MapID || '',
    map: match.MapID || '',
    modeId: match.ModeID || '',
    mode: match.ModeID || '',
    provisioningFlow: match.ProvisioningFlow || 'Pregame',
    players,
  };
}

async function fetchCurrentValorantMatch() {
  const lockfile = readLockfile();
  const [entitlements, version, regionShard] = await Promise.all([
    riotLocalFetch(lockfile, '/entitlements/v1/token'),
    fetchClientVersion(),
    getRegionShard(lockfile),
  ]);
  const accessToken = entitlements.accessToken;
  const entitlementToken = entitlements.token;
  const subject = entitlements.subject;
  if (!accessToken || !entitlementToken || !subject) {
    throw new Error('Riot Clientから必要な認証情報を取得できませんでした。VALORANTとRiot Clientを起動してください。');
  }
  const { region, shard } = regionShard;
  const base = `https://glz-${region}-1.${shard}.a.pvp.net`;
  const auth = { accessToken, entitlementToken, clientVersion: version };
  let coreError = null;
  try {
    const playerInfo = await riotRemoteFetch(`${base}/core-game/v1/players/${subject}`, auth);
    const matchId = playerInfo.MatchID || playerInfo.matchId;
    if (!matchId) throw new Error('現在参加中の試合IDが取得できませんでした。');
    const match = await riotRemoteFetch(`${base}/core-game/v1/matches/${matchId}`, auth);
    return enrichLivePayload(summarizeCurrentGame(match, { region, shard, subject, matchId }), { region, shard, subject, matchId }, auth);
  } catch (error) {
    coreError = error;
    debug('core-game取得失敗:', error.message);
  }

  try {
    const playerInfo = await riotRemoteFetch(`${base}/pregame/v1/players/${subject}`, auth);
    const matchId = playerInfo.MatchID || playerInfo.matchId;
    if (!matchId) throw new Error('エージェント選択中の試合IDが取得できませんでした。');
    const match = await riotRemoteFetch(`${base}/pregame/v1/matches/${matchId}`, auth);
    return enrichLivePayload(summarizePregame(match, { region, shard, subject, matchId }), { region, shard, subject, matchId }, auth);
  } catch (pregameError) {
    debug('pregame取得失敗:', pregameError.message);
    if (coreError?.status === 404 && pregameError?.status === 404) {
      throw new Error('現在参加中のVALORANT試合が見つかりませんでした。ロビー、キュー中、試合終了後は取得できません。エージェント選択中または試合中に実行してください。');
    }
    throw pregameError.status ? pregameError : coreError;
  }
}

async function sendToBot(payload) {
  if (!config.botPassword) throw new Error('BOT_ADMIN_PASSWORDを環境変数に設定してください。');
  const authorization = Buffer.from(`${config.botUser}:${config.botPassword}`).toString('base64');
  const response = await fetch(config.botUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Bot送信失敗: ${response.status} ${text}`);
}

async function tick() {
  const payload = await fetchCurrentValorantMatch();
  const key = `${payload.matchId}:${payload.players.length}:${payload.state}`;
  payload.notify = key !== lastSentMatchKey;
  await sendToBot(payload);
  lastSentMatchKey = key;
  log(`試合情報を送信しました: ${payload.matchId || '-'} players=${payload.players.length}${payload.notify ? ' / 通知あり' : ' / Web更新のみ'}`);
}

async function main() {
  log('VALORANT補助アプリを開始します。');
  log(`送信先: ${config.botUrl}`);
  if (config.once) {
    await tick();
    return;
  }
  await tick().catch((error) => log(error.message));
  setInterval(() => {
    tick().catch((error) => log(error.message));
  }, config.intervalMs);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
