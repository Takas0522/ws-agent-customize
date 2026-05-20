# custom-controls

jQuery + Bootstrap 5 ベースのカスタムコントロールライブラリ。

## 提供コントロール

| タグ | プラグイン | 内容 |
| --- | --- | --- |
| `<custom-select>` | `customSelect` | カスタムセレクトボックス |
| `<custom-input>` | `customInput` | カスタムインプット |
| `<custom-radio>` | `customRadio` | 選択解除可能なラジオボタン |
| `<custom-autocomplete>` | `customAutocomplete` | オートコンプリート付きテキストボックス |

## 依存関係

- jQuery 3.x
- Bootstrap 5.x (CSS)

## 使い方

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="lib/custom-controls.css">

<custom-select
    label="都道府県"
    placeholder="選択してください"
    options='[{"value":"13","label":"東京都"},{"value":"27","label":"大阪府"}]'
    required>
</custom-select>

<custom-input
    label="メールアドレス"
    placeholder="user@example.com"
    pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
    minlength="5"
    maxlength="100"
    required>
</custom-input>

<custom-radio
    label="性別"
    options='["男性","女性","その他"]'
    inline>
</custom-radio>

<custom-autocomplete
    label="プログラミング言語"
    suggestions='["JavaScript","TypeScript","Java","Python","C#","Go","Rust"]'
    min-chars="1"
    max-items="8">
</custom-autocomplete>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="lib/custom-controls.js"></script>
```

DOM 構築後、`<custom-*>` タグは自動で初期化されます。

## 属性リファレンス

### 共通
| 属性 | 説明 |
| --- | --- |
| `label` | コントロール上部のラベル |
| `placeholder` | プレースホルダ |
| `value` | 初期値 |
| `name` | 送信時の name |
| `required` | 必須入力 |
| `disabled` | 無効化 |

### `<custom-select>`
| 属性 | 説明 |
| --- | --- |
| `options` | 選択肢。JSON 配列 (`["a","b"]` または `[{"value":"a","label":"A"}]`) もしくはカンマ区切り |
| `min-options` | 最小選択肢数（バリデーション） |

### `<custom-input>`
| 属性 | 説明 |
| --- | --- |
| `type` | input type (`text`, `password`, など) |
| `minlength` / `maxlength` | 文字数制限 |
| `pattern` | 正規表現 |
| `charset` | `alpha` / `numeric` / `alphanum` / `ascii` |

### `<custom-radio>`
| 属性 | 説明 |
| --- | --- |
| `options` | 選択肢（`<custom-select>` と同じ形式） |
| `inline` | 横並びレイアウト |

通常のラジオボタンと異なり、選択済みの項目をもう一度クリックする、または `Esc` / `Delete` キーを押すと選択解除できます。

### `<custom-autocomplete>`
| 属性 | 説明 |
| --- | --- |
| `suggestions` (または `options`) | 候補配列 |
| `min-chars` | 候補表示を開始する最小文字数 (既定: 1) |
| `max-items` | 候補表示の最大件数 (既定: 10) |

## JavaScript API

```js
// 初期化（自動初期化済みでも安全）
$('custom-input').customInput();

// 値の取得 / 設定
var v = $('custom-input').customInput('val');
$('custom-input').customInput('val', 'new value');

// バリデーション
var ok = $('custom-input').customInput('validate');

// オプションの動的変更
$('custom-select').customSelect('option', 'options',
    [{value:'a', label:'A'}, {value:'b', label:'B'}]);

// イベント
$('custom-input').on('change.cc', function (e, value) { console.log(value); });
$('custom-input').on('validate.cc', function (e, ok, reason) { /* ... */ });

// カスタムバリデーション
$('custom-input').data('__customInput').addValidator(function (v) {
    return v.indexOf('foo') === 0 ? true : '"foo" で始めてください';
});

// 破棄
$('custom-input').customInput('destroy');
```

## ファイル構成

- `src/custom-controls.js` / `src/custom-controls.css` — ソース
- `dist/custom-controls.js` / `dist/custom-controls.css` — ビルド成果物 (非ミニファイ)
- `dist/custom-controls.min.js` / `dist/custom-controls.min.css` — 本番用ミニファイ版 (sourcemap 付き)
- `demo.html` — 動作確認用デモ (`dist/` 配下のファイルを参照)

## ビルド

esbuild で `src/` → `dist/` にビルドします。

```sh
npm install
npm run build        # 1回ビルド
npm run watch        # ファイル監視で自動ビルド
```

`npm publish` 実行時は `prepublishOnly` で自動的に build が走ります。
