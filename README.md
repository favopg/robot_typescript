9路盤 囲碁AI 開発環境 (TypeScript + TensorFlow.js)

このリポジトリは、TypeScript と TensorFlow.js を用いて 9 路盤の囲碁AIを開発するための最小構成です。Node.js 上で @tensorflow/tfjs-node を利用し、高速なネイティブ実行を行います。

必要条件
- Node.js 18 以上（LTS 推奨）
- Windows 10/11（他OSでも動作しますが、本手順は Windows 前提）

セットアップ手順
1. 依存関係のインストール
   npm install
2. 動作確認（TypeScriptをそのまま実行）
   npm run dev
   例として、TensorFlow のバックエンド名や行列積の結果、9x9 盤のテンソル形状が出力されます。
3. ビルドして実行（任意）
   npm run build
   npm start

NVM（Node Version Manager）のインストール（Windows）
- tfjs-node の事前ビルド互換性のため、Node 20 LTS へ簡単に切り替えできる nvm-windows の導入を推奨します。

手順（Windows 10/11）
1) 自動ダウンロード＆インストーラ起動
   npm run setup:nvm
   - GitHub から nvm-windows 安定版インストーラを取得し、GUI を起動します。
2) インストール完了後、必ず「新しい PowerShell」を開いて nvm が使えることを確認
   nvm version
3) Node 20 LTS を導入・切替
   npm run setup:node20
   または手動で:
   nvm install 20.17.0
   nvm use 20.17.0
4) バージョン確認
   node -v
5) プロジェクト依存を入れ直し
   npm install

補足（macOS/Linux）
- 本リポジトリのスクリプトは Windows 用です。macOS/Linux の場合は Homebrew などで nvm を導入してください。
  - macOS 例: brew install nvm; シェルの初期化設定に従う → nvm install 20; nvm use 20

プロジェクト構成
.
├─ src/
│  └─ index.ts        // tfjs-node の読み込みと簡単な検証コード
├─ package.json        // スクリプト・依存関係
├─ tsconfig.json       // TypeScript コンパイラ設定
└─ README.md

トラブルシュート
- @tensorflow/tfjs-node のインストール時にビルドで失敗する（Node 24 などで事前ビルドが無い、Python 未導入など）:
  - 本プロジェクトでは tfjs-node は optionalDependencies として扱うため、失敗しても npm install 自体は成功します。純粋な JS バックエンド（wasm/cpu）が自動で使われます。
  - ネイティブバックエンドを使いたい場合は以下を用意してください:
    1) Python 3.x をインストールし、PATH に通す
    2) Windows で MSVC Build Tools（Visual Studio Build Tools も可）を導入
    3) Node バージョンを LTS または tfjs-node の事前ビルドが提供されているバージョンに切替（例: Node 20 LTS）
    4) その後 npm install を再実行
  - 企業ネットワーク等でプロキシがある場合は、npm の proxy/https-proxy を設定してください。
- バックエンドが tensorflow ではなく cpu になる:
  - これは tfjs-node が見つからない場合の通常動作です。本プロジェクトの `src/index.ts` は、tfjs-node がロードできた場合に `await tf.setBackend('tensorflow')` を明示的に呼び出し、ネイティブバックエンドへ切り替える実装になっています。
  - したがって、tfjs-node が正常にインストールできていれば、`npm run dev` 実行時の先頭に `[tf] tfjs-node loaded. Backend set to tensorflow.` と表示され、その後の `[tf] backend: tensorflow` で確認できます。
  - もし依然として `cpu` の場合は、tfjs-node のインストールが失敗しています。上記の「Python 3 / MSVC Build Tools / Node 20 LTS」手順を再確認し、`npm install` をやり直してください。

開発メモ（9路盤囲碁AI）
- 初期の特徴量テンソル例は src/index.ts にあり、[9, 9, 3]（黒/白/空）ワンホットをダミーで生成しています。
- 今後はポリシーネット/バリューネットの軽量モデル（例: 小規模 ResNet）を tf.Sequential/tf.LayersModel で構成し、自己対局データで学習を進める方針を想定しています。

簡易 9 路盤エンジン（合法手・終局判定）
- 実装場所: `src/go/engine.ts`
- 仕様（簡易版）
  - 盤サイズ: 9x9（可変）
  - 交点に石があると打てない
  - 自殺手禁止（ただし隣接敵連のアタリ取りによる打ち上げは合法）
  - 呼吸点 0 の敵連は直後に取り除かれる
  - コウ判定は未実装（今後追加可能）
  - 終局: 両者の連続パスで終局
- 主な API
  - `Board.isLegal(color, x, y): boolean` — 指し手が合法か判定
  - `Board.getLegalMoves(color): {x,y}[]` — 合法手一覧（パスは含まず）
  - `Board.playMove(color, x, y): boolean` — 実際に着手（禁じ手なら false）
  - `Game.play(x, y): boolean` — 現手番で着手
  - `Game.pass(): void` — パス（連続 2 回で `Game.isOver === true`）
  - `Game.legalMoves(): ({x,y}|"pass")[]` — 現手番の合法手（パス含む）

サンプル実行
- `src/index.ts` の末尾でミニデモを呼び出しています。
  - 例: 黒番の合法手数出力 → (4,4) に着手 → 白・黒が連続パス → 終局フラグ表示

---

SGF を用いた 9 路盤の学習（教師あり）

本リポジトリには、9 路 SGF を読み込み特徴量とラベルを生成し、簡易のポリシー/バリューネットを学習する最小構成が含まれます。

構成ファイル
- `src/data/sgf.ts` — SGF の簡易パーサ（SZ/RE と B/W 着手、パス対応）
- `src/data/features.ts` — 盤面の特徴量エンコード（black/white/toPlay の3プレーン）
- `src/data/dataset.ts` — SGF テキストからデータセット（X, Y_policy_index, Y_value）を構築
- `src/model/policy_value.ts` — 小規模 CNN（二頭出し: policy=82クラス, value=スカラー）
- `src/train_sgf.ts` — 学習スクリプト（tfjs-node 使用可）

前提
- 9 路盤 SGF（.sgf）ファイル群を用意してください（分岐は無視してメインラインのみ使用）。
- tfjs-node が有効でなくても学習は可能ですが遅くなります。有効化方法は上記「NVM」節やトラブルシュートを参照。

使い方
1) SGF ファイルをディレクトリに置く（例: `data/sgf9/`）
2) 学習を実行
   npm run train:sgf -- data/sgf9 5 128 models
   - 第1引数: SGF ファイル or ディレクトリのパス（必須）
   - 第2引数: epochs（省略時 5）
   - 第3引数: batchSize（省略時 128）
   - 第4引数: 出力ディレクトリ（省略時 models/）

出力
- tfjs-node が利用可能な場合は `models/pv-<timestamp>/` に保存されます（file:// 保存）。
- 利用不可（JSバックエンド）の場合、保存はスキップされます。

注意点
- 本 SGF パーサは最小実装です。AB/AW などの配置、コメント、変化図の厳密な扱いは未対応です。
- 本エンジンは「コウなし」の簡易版のため、棋譜により一部の手が `illegal` となることがあります。その場合は盤面適用をスキップして次へ進みます（特徴量/ラベルは収集済み）。
- 特徴量は最小の 3 プレーンです。精度を高めたい場合は履歴や呼吸点などの追加プレーンを拡張してください。

スクリプト一覧
- npm run dev — TypeScript を直接実行（ts-node）
- npm run build — dist/ にトランスパイル
- npm start — ビルド済み JavaScript を実行
- npm run typecheck — 型チェックのみ

ライセンス
MIT
