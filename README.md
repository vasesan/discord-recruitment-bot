# ゲーム募集 Discord Bot

Discord内でゲームや飲み会の参加者を募集し、募集チャンネルで種類ごとの対象ロールへメンションするBotです。

## 機能

- `/募集` — 本人だけに見える入力パネルから、ゲーム・内容・人数・日時を設定
- 「参加」「未定」「不参加」ボタン（同じボタンを再度押すと回答解除）
- 募集人数を必須指定し、定員に達したら自動で締め切り
- チャンネル `1256456334287568979` に募集を投稿
- 募集投稿時、対応する既存ロールを「募集してるよ！」とメンション（DMは送信しません）
- `/募集終了` — 募集者または管理者が回答を締め切り
- Dockerボリュームに回答データを保存し、Bot再起動後も維持

## 重要: 漏洩したトークンの再生成

チャットやGitHubなどへ一度でも貼ったBotトークンは使用しないでください。Discord Developer Portalの **Bot → Reset Token** で再生成し、新しい値だけを外部サーバーの環境変数へ設定します。トークンをソースコードやGitへ保存しないでください。

## Discord側の準備

1. [Discord Developer Portal](https://discord.com/developers/applications) でApplicationとBotを作成します。
2. OAuth2 URL Generatorで `bot` と `applications.commands` を選択します。
3. Bot権限として次を付けてサーバーへ招待します。
   - チャンネルを見る
   - メッセージを送信
   - 埋め込みリンク
   - メッセージ履歴を読む
   - 全員宛てメンション（対象ロールが「このロールにメンションできる」を無効にしている場合に必要）
4. Botは指定ロールをメンションするだけで、メンバーのロールを変更しません。

## 環境変数

`.env.example` を `.env` にコピーし、以下を設定します。

```env
DISCORD_TOKEN=再生成したBotトークン
CLIENT_ID=Developer PortalのApplication ID
GUILD_ID=導入先DiscordサーバーのID
DATA_FILE=/app/data/state.json
ANNOUNCEMENT_CHANNEL_ID=1256456334287568979
ROLE_DRINKING=1516889561030983690
ROLE_VALORANT=1256457963971936286
ROLE_MINECRAFT=1503770016498319390
ROLE_R6S=1475169609375285465
ROLE_MAHJONG=1518929621725478982
ROLE_OTHER=1518929755552874677
```

`GUILD_ID` を設定するとコマンドは指定サーバーへ即時反映されます。複数サーバーで使う場合は未設定にするとグローバル登録になります。

## 推奨: Railwayへ配置して24時間稼働

自分のPCへNode.jsやDockerを入れる必要はありません。ブラウザー、GitHub、Railwayだけで配置できます。

1. ZIPを展開し、中身を新しいGitHubリポジトリへアップロードします。リポジトリはPrivateで構いません。`.env` やBotトークンはアップロードしません。
2. [Railway](https://railway.com/) にGitHubアカウントで登録します。
3. Railway Dashboardで **New Project → GitHub Repo** を選び、アップロードしたリポジトリを指定します。
4. **Add Variables** を選び、`.env.example` にある変数を登録します。`DISCORD_TOKEN` には必ず再生成後のトークンを設定します。
5. Project CanvasでVolumeを作成してBotサービスへ接続し、Mount Pathを `/app/data` にします。
6. RailwayのVariablesへ `RAILWAY_RUN_UID=0` も追加します（Volumeへの書き込みに必要です）。
7. 24時間運用ではService SettingsのRestart Policyを **Always** にします（Railwayの有料プランが必要です）。
8. **Deploy** を押し、ログに「としてログインしました」と表示されれば稼働完了です。公開ドメインの作成は不要です。

ルートにある `Dockerfile` はRailwayが自動検出します。Volumeは参加回答の保存用なので削除しないでください。Railwayの利用には料金または利用クレジットが必要になる場合があります。

## VPS等で起動する場合

DockerとDocker Composeが使えるVPS等へこのフォルダを配置し、次を実行します。

```sh
cp .env.example .env
# .envを編集
docker compose up -d --build
docker compose logs -f bot
```

PCを起動しておく必要はありません。`restart: unless-stopped` により、外部サーバー再起動後もBotが自動で起動します。`bot-data` ボリュームは削除しないでください。

## 使い方

1. 募集者が `/募集` を実行すると、本人だけにゲーム・イベント選択パネルが表示されます。
2. 選択後の入力画面で内容・募集人数・日時を入力します。「その他ゲーム」ではゲーム名も入力します。
3. 募集チャンネルへ対象ロールのメンション付きで募集が投稿されます。DMは送信されません。
4. 参加者が募集人数に達すると募集が自動で締め切られます。
5. 手動終了する場合は募集メッセージを右クリックしてIDをコピーし、`/募集終了` に渡します。

## 運用上の注意

- 対象ロールがメンション不可の場合、Botへ「全員宛てメンション」権限を付けるか、ロール設定の「このロールにメンションできる」を有効にしてください。
- Botを複数プロセスで同時起動しないでください。この実装の保存先は単一プロセス用です。
