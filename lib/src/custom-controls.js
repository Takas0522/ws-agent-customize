/*!
 * custom-controls.js
 * jQuery + Bootstrap ベースのカスタムコントロールライブラリ
 *
 * 提供コンポーネント:
 *   <custom-select>       カスタムセレクトボックス
 *   <custom-input>        カスタムインプット
 *   <custom-radio>        カスタムラジオボタン（選択解除可）
 *   <custom-autocomplete> カスタムテキストボックス（オートコンプリート）
 *
 * 共通 jQuery API:
 *   $(el).customSelect()              初期化
 *   $(el).customSelect('val')         値の取得
 *   $(el).customSelect('val', value)  値の設定
 *   $(el).customSelect('validate')    バリデーション実行 (true/false)
 *   $(el).customSelect('option', key, value)  オプション変更
 *   $(el).customSelect('destroy')     破棄
 *   イベント: 'change.cc', 'validate.cc'
 *
 *   ※ customInput / customRadio / customAutocomplete も同じ API。
 */
(function ($) {
  'use strict';

  if (typeof $ === 'undefined') {
    throw new Error('custom-controls.js requires jQuery.');
  }

  /* ---------------------------------------------------------------
   *  Utilities
   * --------------------------------------------------------------- */
  var CC = {};

  CC.uid = (function () {
    var i = 0;
    return function (prefix) {
      i += 1;
      return (prefix || 'cc') + '-' + Date.now().toString(36) + '-' + i;
    };
  })();

  CC.parseOptionsAttr = function (raw) {
    if (raw == null || raw === '') return [];
    // JSON 形式（["a","b"] や [{"value":"a","label":"A"}]）優先
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(function (item) {
          if (item && typeof item === 'object') {
            return {
              value: String(item.value != null ? item.value : item.label),
              label: String(item.label != null ? item.label : item.value)
            };
          }
          return { value: String(item), label: String(item) };
        });
      }
    } catch (e) { /* fallthrough */ }
    // カンマ区切り fallback
    return String(raw).split(',').map(function (s) {
      var t = s.trim();
      return { value: t, label: t };
    });
  };

  CC.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  CC.charsetRegex = {
    alpha:    /^[A-Za-z]*$/,
    numeric:  /^[0-9]*$/,
    alphanum: /^[A-Za-z0-9]*$/,
    ascii:    /^[\x20-\x7E]*$/
  };

  /* ---------------------------------------------------------------
   *  Plugin factory
   *   各コントロールを jQuery プラグインとして登録するヘルパ
   * --------------------------------------------------------------- */
  function definePlugin(name, Ctor) {
    $.fn[name] = function (action) {
      var args = Array.prototype.slice.call(arguments, 1);
      var dataKey = '__' + name;
      var ret = this;

      this.each(function () {
        var $el = $(this);
        var inst = $el.data(dataKey);

        if (!inst) {
          inst = new Ctor($el);
          $el.data(dataKey, inst);
          inst.init();
        }

        if (typeof action === 'string') {
          if (typeof inst[action] !== 'function') {
            throw new Error(name + ': unknown action "' + action + '"');
          }
          var r = inst[action].apply(inst, args);
          if (action === 'val' && args.length === 0) {
            ret = r;
            return false;
          }
          if (action === 'validate') {
            ret = r;
            return false;
          }
        }
      });

      return ret;
    };
  }

  /* ---------------------------------------------------------------
   *  Base
   * --------------------------------------------------------------- */
  function Base($el) {
    this.$el = $el;          // 元のカスタムタグ
    this.$wrap = null;       // 描画後のラッパ
    this.opts = {};
    this.value = null;
    this.id = CC.uid();
  }
  Base.prototype.readCommonAttrs = function () {
    var $el = this.$el;
    this.opts.placeholder = $el.attr('placeholder') || '';
    this.opts.value       = $el.attr('value') || '';
    this.opts.required    = $el.is('[required]') || $el.attr('required') === 'true';
    this.opts.label       = $el.attr('label') || '';
    this.opts.name        = $el.attr('name') || '';
    this.opts.disabled    = $el.is('[disabled]') || $el.attr('disabled') === 'true';
  };
  Base.prototype._customValidators = [];
  Base.prototype.addValidator = function (fn) {
    if (typeof fn === 'function') this._customValidators.push(fn);
    return this;
  };
  Base.prototype._renderFeedback = function () {
    return '<div class="invalid-feedback" data-cc-feedback></div>';
  };
  Base.prototype._setInvalid = function (message) {
    this.$wrap.addClass('is-invalid');
    this.$wrap.find('[data-cc-feedback]').first().text(message || '入力内容が不正です。');
  };
  Base.prototype._clearInvalid = function () {
    this.$wrap.removeClass('is-invalid');
    this.$wrap.find('[data-cc-feedback]').first().text('');
  };
  Base.prototype.option = function (key, value) {
    if (arguments.length === 1) return this.opts[key];
    this.opts[key] = value;
    if (typeof this.refresh === 'function') this.refresh();
    return this;
  };
  Base.prototype.destroy = function () {
    if (this.$wrap) this.$wrap.remove();
    this.$el.removeData();
    this.$el.show();
  };
  Base.prototype.val = function (v) {
    if (arguments.length === 0) return this.value;
    this._setValue(v, true);
    return this;
  };
  Base.prototype._emitChange = function () {
    this.$el.trigger('change.cc', [this.value]);
  };
  Base.prototype._emitValidate = function (ok, message) {
    this.$el.trigger('validate.cc', [ok, message]);
  };

  /* ===============================================================
   *  CustomSelect
   * =============================================================== */
  function CustomSelect($el) {
    Base.call(this, $el);
    this._customValidators = [];
  }
  CustomSelect.prototype = Object.create(Base.prototype);
  CustomSelect.prototype.constructor = CustomSelect;

  CustomSelect.prototype.init = function () {
    this.readCommonAttrs();
    var $el = this.$el;
    this.opts.options    = CC.parseOptionsAttr($el.attr('options'));
    this.opts.minOptions = parseInt($el.attr('min-options'), 10) || 0;

    this._render();
    this._bind();
    if (this.opts.value !== '') this._setValue(this.opts.value, false);
  };

  CustomSelect.prototype._render = function () {
    var html = ''
      + '<div class="cc-wrapper cc-select" id="' + this.id + '">'
      +   (this.opts.label ? '<label class="form-label">' + CC.escapeHtml(this.opts.label) + '</label>' : '')
      +   '<div class="form-select cc-select-display is-placeholder" tabindex="0" role="combobox" aria-haspopup="listbox" aria-expanded="false">'
      +     CC.escapeHtml(this.opts.placeholder || '選択してください')
      +   '</div>'
      +   '<div class="cc-select-menu" role="listbox"></div>'
      +   this._renderFeedback()
      + '</div>';
    this.$wrap = $(html);
    this.$el.after(this.$wrap).hide();
    this._renderOptions();
  };

  CustomSelect.prototype._renderOptions = function () {
    var $menu = this.$wrap.find('.cc-select-menu').empty();
    var self = this;
    this.opts.options.forEach(function (opt) {
      var $item = $('<div class="cc-select-option" role="option"></div>')
        .attr('data-value', opt.value)
        .text(opt.label);
      if (self.value === opt.value) $item.addClass('is-selected');
      $menu.append($item);
    });
  };

  CustomSelect.prototype._bind = function () {
    var self = this;
    var $w = this.$wrap;

    $w.on('click', '.cc-select-display', function () {
      if (self.opts.disabled) return;
      $w.toggleClass('is-open');
      $w.find('.cc-select-display').attr('aria-expanded', $w.hasClass('is-open'));
    });

    $w.on('click', '.cc-select-option', function () {
      var v = $(this).attr('data-value');
      self._setValue(v, true);
      $w.removeClass('is-open');
    });

    $(document).on('click.' + this.id, function (e) {
      if (!$.contains($w[0], e.target) && e.target !== $w[0]) {
        $w.removeClass('is-open');
      }
    });
  };

  CustomSelect.prototype._setValue = function (v, emit) {
    this.value = v == null ? '' : String(v);
    var opt = this.opts.options.find(function (o) { return o.value === this.value; }, this);
    var $disp = this.$wrap.find('.cc-select-display');
    if (opt) {
      $disp.text(opt.label).removeClass('is-placeholder');
    } else {
      $disp.text(this.opts.placeholder || '選択してください').addClass('is-placeholder');
    }
    var current = this.value;
    this.$wrap.find('.cc-select-option').each(function () {
      $(this).toggleClass('is-selected', $(this).attr('data-value') === current);
    });
    if (emit) this._emitChange();
  };

  CustomSelect.prototype.refresh = function () {
    this._renderOptions();
    this._setValue(this.value, false);
  };

  CustomSelect.prototype.validate = function () {
    this._clearInvalid();
    var v = this.value;
    if (this.opts.required && (v == null || v === '')) {
      this._setInvalid('選択は必須です。');
      this._emitValidate(false, '選択は必須です。');
      return false;
    }
    if (this.opts.minOptions > 0 && this.opts.options.length < this.opts.minOptions) {
      this._setInvalid('選択肢が不足しています（最低 ' + this.opts.minOptions + ' 件必要）。');
      this._emitValidate(false, 'minOptions');
      return false;
    }
    for (var i = 0; i < this._customValidators.length; i++) {
      var r = this._customValidators[i](v, this);
      if (r !== true) {
        this._setInvalid(typeof r === 'string' ? r : '入力内容が不正です。');
        this._emitValidate(false, r);
        return false;
      }
    }
    this._emitValidate(true);
    return true;
  };

  definePlugin('customSelect', CustomSelect);

  /* ===============================================================
   *  CustomInput
   * =============================================================== */
  function CustomInput($el) {
    Base.call(this, $el);
    this._customValidators = [];
  }
  CustomInput.prototype = Object.create(Base.prototype);
  CustomInput.prototype.constructor = CustomInput;

  CustomInput.prototype.init = function () {
    this.readCommonAttrs();
    var $el = this.$el;
    this.opts.minlength = parseInt($el.attr('minlength'), 10) || 0;
    this.opts.maxlength = parseInt($el.attr('maxlength'), 10) || 0;
    this.opts.pattern   = $el.attr('pattern') || '';
    this.opts.charset   = $el.attr('charset') || ''; // alpha|numeric|alphanum|ascii
    this.opts.type      = $el.attr('type') || 'text';

    this._render();
    this._bind();
    if (this.opts.value !== '') this._setValue(this.opts.value, false);
  };

  CustomInput.prototype._render = function () {
    var html = ''
      + '<div class="cc-wrapper cc-input" id="' + this.id + '">'
      +   (this.opts.label ? '<label class="form-label" for="' + this.id + '-i">' + CC.escapeHtml(this.opts.label) + '</label>' : '')
      +   '<input type="' + CC.escapeHtml(this.opts.type) + '" id="' + this.id + '-i" class="form-control"'
      +     ' placeholder="' + CC.escapeHtml(this.opts.placeholder) + '"'
      +     (this.opts.name ? ' name="' + CC.escapeHtml(this.opts.name) + '"' : '')
      +     (this.opts.disabled ? ' disabled' : '')
      +   ' />'
      +   this._renderFeedback()
      + '</div>';
    this.$wrap = $(html);
    this.$el.after(this.$wrap).hide();
  };

  CustomInput.prototype._bind = function () {
    var self = this;
    this.$wrap.on('input change', 'input', function () {
      self._setValue($(this).val(), true);
    });
    this.$wrap.on('blur', 'input', function () {
      self.validate();
    });
  };

  CustomInput.prototype._setValue = function (v, emit) {
    this.value = v == null ? '' : String(v);
    var $i = this.$wrap.find('input');
    if ($i.val() !== this.value) $i.val(this.value);
    if (emit) this._emitChange();
  };

  CustomInput.prototype.validate = function () {
    this._clearInvalid();
    var v = this.value || '';
    if (this.opts.required && v === '') {
      this._setInvalid('入力は必須です。');
      this._emitValidate(false, 'required');
      return false;
    }
    if (this.opts.minlength && v.length < this.opts.minlength) {
      this._setInvalid('最低 ' + this.opts.minlength + ' 文字入力してください。');
      this._emitValidate(false, 'minlength');
      return false;
    }
    if (this.opts.maxlength && v.length > this.opts.maxlength) {
      this._setInvalid('最大 ' + this.opts.maxlength + ' 文字までです。');
      this._emitValidate(false, 'maxlength');
      return false;
    }
    if (this.opts.charset && CC.charsetRegex[this.opts.charset]) {
      if (!CC.charsetRegex[this.opts.charset].test(v)) {
        this._setInvalid('使用できない文字が含まれています。');
        this._emitValidate(false, 'charset');
        return false;
      }
    }
    if (this.opts.pattern) {
      try {
        var re = new RegExp('^(?:' + this.opts.pattern + ')$');
        if (v !== '' && !re.test(v)) {
          this._setInvalid('入力形式が正しくありません。');
          this._emitValidate(false, 'pattern');
          return false;
        }
      } catch (e) { /* ignore invalid regex */ }
    }
    for (var i = 0; i < this._customValidators.length; i++) {
      var r = this._customValidators[i](v, this);
      if (r !== true) {
        this._setInvalid(typeof r === 'string' ? r : '入力内容が不正です。');
        this._emitValidate(false, r);
        return false;
      }
    }
    this._emitValidate(true);
    return true;
  };

  definePlugin('customInput', CustomInput);

  /* ===============================================================
   *  CustomRadio  (選択解除可能)
   * =============================================================== */
  function CustomRadio($el) {
    Base.call(this, $el);
    this._customValidators = [];
  }
  CustomRadio.prototype = Object.create(Base.prototype);
  CustomRadio.prototype.constructor = CustomRadio;

  CustomRadio.prototype.init = function () {
    this.readCommonAttrs();
    this.opts.options = CC.parseOptionsAttr(this.$el.attr('options'));
    this.opts.inline  = this.$el.is('[inline]');
    this._render();
    this._bind();
    if (this.opts.value !== '') this._setValue(this.opts.value, false);
  };

  CustomRadio.prototype._render = function () {
    var self = this;
    var groupName = this.opts.name || (this.id + '-grp');
    var html = ''
      + '<div class="cc-wrapper cc-radio" id="' + this.id + '">'
      +   (this.opts.label ? '<label class="form-label d-block">' + CC.escapeHtml(this.opts.label) + '</label>' : '')
      +   '<div class="cc-radio-items">'
      +     this.opts.options.map(function (opt, idx) {
              var iid = self.id + '-r-' + idx;
              return ''
                + '<div class="form-check' + (self.opts.inline ? ' form-check-inline' : '') + '">'
                +   '<input class="form-check-input" type="radio" name="' + CC.escapeHtml(groupName) + '"'
                +     ' id="' + iid + '" value="' + CC.escapeHtml(opt.value) + '"'
                +     (self.opts.disabled ? ' disabled' : '') + ' />'
                +   '<label class="form-check-label" for="' + iid + '">' + CC.escapeHtml(opt.label) + '</label>'
                + '</div>';
            }).join('')
      +   '</div>'
      +   this._renderFeedback()
      + '</div>';
    this.$wrap = $(html);
    this.$el.after(this.$wrap).hide();
  };

  CustomRadio.prototype._bind = function () {
    var self = this;
    // 「同じ値を再度クリックしたら選択解除」を実現する。
    // ラベルクリック時は input の mousedown が発火しないため、
    // モデル側の値 (self.value) を真実として比較する。
    this.$wrap.on('click', 'input[type=radio]', function () {
      var $r = $(this);
      var v = $r.val();
      if (self.value === v) {
        // 既に選択済み → 解除
        this.checked = false;
        self._setValue('', true);
      } else {
        self._setValue(v, true);
      }
    });
    // キーボード操作対応（Esc / Delete で解除）
    this.$wrap.on('keydown', 'input[type=radio]', function (e) {
      if (e.key === 'Escape' || e.key === 'Delete') {
        this.checked = false;
        self._setValue('', true);
        e.preventDefault();
      }
    });
  };

  CustomRadio.prototype._setValue = function (v, emit) {
    this.value = v == null ? '' : String(v);
    var current = this.value;
    this.$wrap.find('input[type=radio]').each(function () {
      this.checked = ($(this).val() === current);
    });
    if (emit) this._emitChange();
  };

  CustomRadio.prototype.validate = function () {
    this._clearInvalid();
    if (this.opts.required && (this.value == null || this.value === '')) {
      this._setInvalid('選択は必須です。');
      this._emitValidate(false, 'required');
      return false;
    }
    for (var i = 0; i < this._customValidators.length; i++) {
      var r = this._customValidators[i](this.value, this);
      if (r !== true) {
        this._setInvalid(typeof r === 'string' ? r : '入力内容が不正です。');
        this._emitValidate(false, r);
        return false;
      }
    }
    this._emitValidate(true);
    return true;
  };

  definePlugin('customRadio', CustomRadio);

  /* ===============================================================
   *  CustomAutocomplete
   * =============================================================== */
  function CustomAutocomplete($el) {
    Base.call(this, $el);
    this._customValidators = [];
    this._activeIndex = -1;
  }
  CustomAutocomplete.prototype = Object.create(Base.prototype);
  CustomAutocomplete.prototype.constructor = CustomAutocomplete;

  CustomAutocomplete.prototype.init = function () {
    this.readCommonAttrs();
    this.opts.suggestions = CC.parseOptionsAttr(this.$el.attr('suggestions') || this.$el.attr('options'));
    this.opts.minChars    = parseInt(this.$el.attr('min-chars'), 10) || 1;
    this.opts.maxItems    = parseInt(this.$el.attr('max-items'), 10) || 10;
    this._render();
    this._bind();
    if (this.opts.value !== '') this._setValue(this.opts.value, false);
  };

  CustomAutocomplete.prototype._render = function () {
    var html = ''
      + '<div class="cc-wrapper cc-autocomplete" id="' + this.id + '">'
      +   (this.opts.label ? '<label class="form-label" for="' + this.id + '-i">' + CC.escapeHtml(this.opts.label) + '</label>' : '')
      +   '<input type="text" id="' + this.id + '-i" class="form-control" autocomplete="off"'
      +     ' placeholder="' + CC.escapeHtml(this.opts.placeholder) + '"'
      +     (this.opts.name ? ' name="' + CC.escapeHtml(this.opts.name) + '"' : '')
      +     (this.opts.disabled ? ' disabled' : '')
      +   ' />'
      +   '<div class="cc-ac-menu" role="listbox"></div>'
      +   this._renderFeedback()
      + '</div>';
    this.$wrap = $(html);
    this.$el.after(this.$wrap).hide();
  };

  CustomAutocomplete.prototype._bind = function () {
    var self = this;
    var $w = this.$wrap;

    $w.on('input', 'input', function () {
      self.value = $(this).val();
      self._emitChange();
      self._filterAndShow($(this).val());
    });

    $w.on('focus', 'input', function () {
      if ($(this).val().length >= self.opts.minChars) self._filterAndShow($(this).val());
    });

    $w.on('keydown', 'input', function (e) {
      var $items = $w.find('.cc-ac-item');
      if (!$w.hasClass('is-open') || $items.length === 0) return;
      if (e.key === 'ArrowDown') {
        self._activeIndex = (self._activeIndex + 1) % $items.length;
        self._updateActive();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        self._activeIndex = (self._activeIndex - 1 + $items.length) % $items.length;
        self._updateActive();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (self._activeIndex >= 0) {
          self._selectItem($items.eq(self._activeIndex));
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        $w.removeClass('is-open');
      }
    });

    $w.on('click', '.cc-ac-item', function () {
      self._selectItem($(this));
    });

    $(document).on('click.' + this.id, function (e) {
      if (!$.contains($w[0], e.target) && e.target !== $w[0]) {
        $w.removeClass('is-open');
      }
    });

    $w.on('blur', 'input', function () {
      // 候補クリック猶予のため少し遅延
      setTimeout(function () { self.validate(); }, 150);
    });
  };

  CustomAutocomplete.prototype._filterAndShow = function (q) {
    var $w = this.$wrap;
    var $menu = $w.find('.cc-ac-menu').empty();
    this._activeIndex = -1;

    var query = (q || '').toLowerCase();
    if (query.length < this.opts.minChars) {
      $w.removeClass('is-open');
      return;
    }
    var matched = this.opts.suggestions.filter(function (s) {
      return s.label.toLowerCase().indexOf(query) !== -1;
    }).slice(0, this.opts.maxItems);

    if (matched.length === 0) {
      $w.removeClass('is-open');
      return;
    }
    matched.forEach(function (s) {
      $('<div class="cc-ac-item"></div>')
        .attr('data-value', s.value)
        .text(s.label)
        .appendTo($menu);
    });
    $w.addClass('is-open');
  };

  CustomAutocomplete.prototype._updateActive = function () {
    var $items = this.$wrap.find('.cc-ac-item').removeClass('is-active');
    if (this._activeIndex >= 0) $items.eq(this._activeIndex).addClass('is-active');
  };

  CustomAutocomplete.prototype._selectItem = function ($item) {
    var v = $item.attr('data-value');
    this._setValue(v, true);
    this.$wrap.removeClass('is-open');
  };

  CustomAutocomplete.prototype._setValue = function (v, emit) {
    this.value = v == null ? '' : String(v);
    var $i = this.$wrap.find('input');
    if ($i.val() !== this.value) $i.val(this.value);
    if (emit) this._emitChange();
  };

  CustomAutocomplete.prototype.validate = function () {
    this._clearInvalid();
    if (this.opts.required && (!this.value || this.value === '')) {
      this._setInvalid('入力は必須です。');
      this._emitValidate(false, 'required');
      return false;
    }
    for (var i = 0; i < this._customValidators.length; i++) {
      var r = this._customValidators[i](this.value, this);
      if (r !== true) {
        this._setInvalid(typeof r === 'string' ? r : '入力内容が不正です。');
        this._emitValidate(false, r);
        return false;
      }
    }
    this._emitValidate(true);
    return true;
  };

  definePlugin('customAutocomplete', CustomAutocomplete);

  /* ---------------------------------------------------------------
   *  Auto-init: カスタムタグを検出して初期化
   * --------------------------------------------------------------- */
  function autoInit(root) {
    var $root = $(root || document);
    $root.find('custom-select').each(function ()       { $(this).customSelect(); });
    $root.find('custom-input').each(function ()        { $(this).customInput(); });
    $root.find('custom-radio').each(function ()        { $(this).customRadio(); });
    $root.find('custom-autocomplete').each(function () { $(this).customAutocomplete(); });
  }

  $(function () { autoInit(document); });

  // 名前空間として公開
  $.customControls = {
    init: autoInit,
    util: CC,
    version: '1.0.0'
  };

})(window.jQuery);
