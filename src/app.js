/* global jQuery, bootstrap */
/**
 * src/app.js
 * 簡易ユーザー管理アプリ
 *  - データは localStorage に保存
 *  - 初回アクセス時にサンプルデータを投入
 *  - lib/custom-controls を利用
 */
(function ($) {
  'use strict';

  var STORAGE_KEY = 'user-management-app:users';

  /* ---------------- データレイヤ ---------------- */
  var Repo = {
    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        var arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : null;
      } catch (e) {
        return null;
      }
    },
    save: function (users) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    },
    seed: function () {
      var now = Date.now();
      return [
        { id: 'u-' + (now - 3000), name: '山田 太郎', email: 'yamada@example.com', active: 'active',   option: 'email' },
        { id: 'u-' + (now - 2000), name: '佐藤 花子', email: 'sato@example.com',   active: 'active',   option: 'postcard' },
        { id: 'u-' + (now - 1000), name: '鈴木 一郎', email: 'suzuki@example.com', active: 'inactive', option: '' }
      ];
    }
  };

  var users = Repo.load();
  if (!users) {
    users = Repo.seed();
    Repo.save(users);
  }

  /* ---------------- ユーティリティ ---------------- */
  function uid() { return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function optionLabel(v) {
    if (v === 'postcard') return 'はがき送付';
    if (v === 'email') return 'メール送信';
    return '—';
  }

  function statusBadge(v) {
    var cls = v === 'active' ? 'active' : 'inactive';
    var label = v === 'active' ? 'アクティブ' : '非アクティブ';
    return '<span class="badge status-badge ' + cls + '">' + label + '</span>';
  }

  /* ---------------- フィードバック (Toast) ---------------- */
  function notify(message, variant) {
    variant = variant || 'success';
    var id = 't-' + Date.now();
    var html = ''
      + '<div id="' + id + '" class="toast align-items-center text-bg-' + variant + ' border-0 mb-2" role="alert">'
      +   '<div class="d-flex">'
      +     '<div class="toast-body">' + escapeHtml(message) + '</div>'
      +     '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>'
      +   '</div>'
      + '</div>';
    var $t = $(html).appendTo('#feedback');
    var t = new bootstrap.Toast($t[0], { delay: 2500 });
    t.show();
    $t.on('hidden.bs.toast', function () { $t.remove(); });
  }

  /* ---------------- フォーム ---------------- */
  var $form     = $('#user-form');
  var $userId   = $('#user-id');
  var $title    = $('#form-title');
  var $btnSubmit = $('#btn-submit');
  var $iName   = $('#ipt-name');
  var $iEmail  = $('#ipt-email');
  var $iActive = $('#ipt-active');
  var $iOption = $('#ipt-option');

  function resetForm() {
    $userId.val('');
    $iName.customInput('val', '');
    $iEmail.customInput('val', '');
    $iActive.customSelect('val', 'active');
    $iOption.customRadio('val', '');
    $title.text('新規ユーザー登録');
    $btnSubmit.find('span').text('登録');
    // バリデーション表示クリア
    $('.cc-wrapper').removeClass('is-invalid').find('[data-cc-feedback]').text('');
  }

  function loadIntoForm(user) {
    $userId.val(user.id);
    $iName.customInput('val', user.name);
    $iEmail.customInput('val', user.email);
    $iActive.customSelect('val', user.active);
    $iOption.customRadio('val', user.option || '');
    $title.text('ユーザー編集');
    $btnSubmit.find('span').text('更新');
    $('html, body').animate({ scrollTop: 0 }, 200);
  }

  function validateAll() {
    var ok = true;
    ok = $iName.customInput('validate')   && ok;
    ok = $iEmail.customInput('validate')  && ok;
    ok = $iActive.customSelect('validate') && ok;
    return ok;
  }

  $form.on('submit', function (e) {
    e.preventDefault();
    if (!validateAll()) {
      notify('入力内容に誤りがあります。', 'danger');
      return;
    }

    var id = $userId.val();
    var data = {
      name:   $iName.customInput('val').trim(),
      email:  $iEmail.customInput('val').trim(),
      active: $iActive.customSelect('val'),
      option: $iOption.customRadio('val') || ''
    };

    if (id) {
      // 更新
      var idx = users.findIndex(function (u) { return u.id === id; });
      if (idx >= 0) {
        users[idx] = $.extend({}, users[idx], data);
        Repo.save(users);
        notify('ユーザーを更新しました。');
      }
    } else {
      // 新規
      users.push($.extend({ id: uid() }, data));
      Repo.save(users);
      notify('ユーザーを登録しました。');
    }
    resetForm();
    renderList();
  });

  $('#btn-reset').on('click', resetForm);

  /* ---------------- 一覧描画 ---------------- */
  var $tbody = $('#user-tbody');
  var $empty = $('#empty-state');
  var $count = $('#user-count');

  function renderList() {
    $tbody.empty();
    $count.text(users.length + ' 件');
    if (users.length === 0) {
      $empty.removeClass('d-none');
      return;
    }
    $empty.addClass('d-none');

    users.forEach(function (u) {
      var $tr = $('<tr></tr>').attr('data-id', u.id);
      $tr.append('<td>' + escapeHtml(u.name) + '</td>');
      $tr.append('<td><a href="mailto:' + escapeHtml(u.email) + '">' + escapeHtml(u.email) + '</a></td>');
      $tr.append('<td>' + statusBadge(u.active) + '</td>');
      $tr.append('<td>' + escapeHtml(optionLabel(u.option)) + '</td>');
      $tr.append(''
        + '<td class="actions text-end">'
        +   '<button type="button" class="btn btn-sm btn-outline-primary me-1 js-edit">'
        +     '<i class="bi bi-pencil"></i> 編集'
        +   '</button>'
        +   '<button type="button" class="btn btn-sm btn-outline-danger js-delete">'
        +     '<i class="bi bi-trash"></i> 削除'
        +   '</button>'
        + '</td>');
      $tbody.append($tr);
    });
  }

  $tbody.on('click', '.js-edit', function () {
    var id = $(this).closest('tr').data('id');
    var u = users.find(function (x) { return x.id === id; });
    if (u) loadIntoForm(u);
  });

  /* ---------------- 削除確認 ---------------- */
  var confirmModal = new bootstrap.Modal(document.getElementById('confirm-modal'));
  var pendingDeleteId = null;

  $tbody.on('click', '.js-delete', function () {
    var id = $(this).closest('tr').data('id');
    var u = users.find(function (x) { return x.id === id; });
    if (!u) return;
    pendingDeleteId = id;
    $('#confirm-name').text(u.name);
    confirmModal.show();
  });

  $('#confirm-delete').on('click', function () {
    if (!pendingDeleteId) return;
    var idx = users.findIndex(function (x) { return x.id === pendingDeleteId; });
    if (idx >= 0) {
      users.splice(idx, 1);
      Repo.save(users);
      notify('ユーザーを削除しました。', 'warning');
      // 編集中ユーザーだった場合はフォームをクリア
      if ($userId.val() === pendingDeleteId) resetForm();
      renderList();
    }
    pendingDeleteId = null;
    confirmModal.hide();
  });

  /* ---------------- 初期表示 ---------------- */
  $(function () {
    renderList();
  });

})(jQuery);
