# ws-agent-customize

jQuery + Bootstrap 5 ベースのカスタムコントロールライブラリを利用した簡易ユーザー管理アプリ (`src/`) のモノレポ。

## ユーザー管理アプリを動かす

アプリは `src/index.html` から `../lib/dist/custom-controls.min.*` を参照しているため、**プロジェクトルート** から HTTP サーバを起動する必要があります（`src/` 直下で起動するとパスが解決できません）。

```sh
# 1) ライブラリをビルドしておく
cd lib && npm i && npm run build && cd ..

# 2) プロジェクトルートで http-server を起動 (キャッシュ無効推奨)
npx http-server . -c-1 -o /src/index.html
```

または、ルートに用意した npm script で一発起動:

```sh
npm start          # build → http-server (-c-1) を起動
npm run serve      # http-server のみ起動 (キャッシュ無効)
```

> ⚠️ `http-server` のデフォルトキャッシュ (1 時間) が有効だと、`lib/dist/*.min.js` を更新してもブラウザに反映されない場合があります。開発中は `-c-1`（キャッシュ無効）または DevTools の「Disable cache」をご利用ください。

ブラウザが `http://localhost:8080/src/index.html` を開きます。

代替: VS Code の「Live Server」拡張などでも、ワークスペースルートを公開ルートにすれば同様に動作します。

## トラブルシューティング

- **コントロールが描画されない / コンソールに 404**: `lib/dist/` が未生成です。`cd lib && npm run build` を実行してください。
- **`src/` 直下で `http-server` を起動して動かない**: `../lib/...` への相対参照がサーバ外になります。プロジェクトルートで起動してください。
- **ローカルストレージをリセットしたい**: ブラウザの DevTools → Application → Local Storage で `user-management-app:users` キーを削除し、リロードするとサンプルデータが再投入されます。
