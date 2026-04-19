(function () {
  'use strict';

  function parseLetterAnswer(answerEl) {
    const t = (answerEl.textContent || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/答案[：:]\s*([A-Ea-e])\b/);
    if (m) return m[1].toUpperCase();
    const m2 = t.match(/答案[：:]\s*([A-Ea-e])\s*[。\.]/);
    if (m2) return m2[1].toUpperCase();
    return null;
  }

  function parseJudgeAnswer(answerEl) {
    const t = (answerEl.textContent || '').trim();
    if (/答案[：:]\s*错误/.test(t) || /答案[：:]\s*不正确/.test(t)) return '错';
    if (/答案[：:]\s*正确/.test(t) && !/不正确/.test(t)) return '对';
    if (/答案[：:]\s*不可以/.test(t) || /答案[：:]\s*不能/.test(t) || /答案[：:]\s*否/.test(t)) return '错';
    if (/答案[：:]\s*是[^否]/.test(t) || /^答案[：:]\s*是\s*[。\.]?$/m.test(t)) return '对';
    if (/答案[：:]\s*可以/.test(t) && !/不可以/.test(t)) return '对';
    if (/答案[：:]\s*不等于/.test(t) || /答案[：:]\s*并非/.test(t)) return '错';
    return null;
  }

  function parseNumericAnswer(answerEl) {
    const t = (answerEl.textContent || '').trim();
    const m = t.match(/答案[：:]\s*([\d.]+)/);
    if (!m) return null;
    return parseFloat(m[1]);
  }

  function initMcqFromOl(item, answerEl, ol, index) {
    const letter = parseLetterAnswer(answerEl);
    const lis = ol.querySelectorAll(':scope > li');
    if (!lis.length) return false;

    answerEl.classList.add('quiz-answer-hidden');

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const wrap = document.createElement('div');
    wrap.className = 'quiz-choice-group';
    const name = 'mcq-' + index + '-' + Math.random().toString(36).slice(2);

    lis.forEach((li, i) => {
      const lab = document.createElement('label');
      lab.className = 'quiz-radio-label';
      const inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = name;
      inp.value = letters[i] || String(i);
      lab.appendChild(inp);
      const letterLab = letters[i] ? letters[i] + '. ' : String(i + 1) + '. ';
      lab.appendChild(document.createTextNode(' ' + letterLab));
      const span = document.createElement('span');
      span.textContent = li.textContent.trim();
      lab.appendChild(span);
      wrap.appendChild(lab);
    });

    ol.classList.add('quiz-options-hidden');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-submit-btn';
    btn.textContent = '提交本题';

    const feedback = document.createElement('p');
    feedback.className = 'quiz-feedback';
    feedback.setAttribute('aria-live', 'polite');

    item.insertBefore(wrap, ol);
    item.insertBefore(btn, answerEl);
    item.insertBefore(feedback, answerEl);

    btn.addEventListener('click', function () {
      const sel = wrap.querySelector('input:checked');
      if (!sel) {
        feedback.textContent = '请先选择一个选项。';
        feedback.className = 'quiz-feedback err';
        return;
      }
      if (!letter) {
        feedback.textContent = '无法从参考答案中解析选项字母，已直接显示答案。';
        feedback.className = 'quiz-feedback err';
        answerEl.classList.remove('quiz-answer-hidden');
        return;
      }
      const ok = sel.value === letter;
      feedback.textContent = ok ? '回答正确。' : '回答错误。下方为参考答案。';
      feedback.className = 'quiz-feedback ' + (ok ? 'ok' : 'err');
      answerEl.classList.remove('quiz-answer-hidden');
    });

    return true;
  }

  function initJudge(item, answerEl, questionText, index) {
    const judge = parseJudgeAnswer(answerEl);
    if (!judge) return false;

    answerEl.classList.add('quiz-answer-hidden');

    const wrap = document.createElement('div');
    wrap.className = 'quiz-choice-group';
    const name = 'jud-' + index + '-' + Math.random().toString(36).slice(2);
    [['对', '对（表述成立）'], ['错', '错（表述不成立）']].forEach(function (pair) {
      const lab = document.createElement('label');
      lab.className = 'quiz-radio-label';
      const inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = name;
      inp.value = pair[0];
      lab.appendChild(inp);
      lab.appendChild(document.createTextNode(' ' + pair[1]));
      wrap.appendChild(lab);
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-submit-btn';
    btn.textContent = '提交判断';

    const feedback = document.createElement('p');
    feedback.className = 'quiz-feedback';

    item.insertBefore(wrap, answerEl);
    item.insertBefore(btn, answerEl);
    item.insertBefore(feedback, answerEl);

    btn.addEventListener('click', function () {
      const sel = wrap.querySelector('input:checked');
      if (!sel) {
        feedback.textContent = '请先选择「对」或「错」。';
        feedback.className = 'quiz-feedback err';
        return;
      }
      const ok = sel.value === judge;
      feedback.textContent = ok ? '判断正确。' : '判断错误。下方为参考答案。';
      feedback.className = 'quiz-feedback ' + (ok ? 'ok' : 'err');
      answerEl.classList.remove('quiz-answer-hidden');
    });

    return true;
  }

  function initNumeric(item, answerEl, questionText, index) {
    const num = parseNumericAnswer(answerEl);
    if (num === null || Number.isNaN(num)) return false;
    if (!/(多少|等于|等于多少|数值|哪个数)/.test(questionText)) return false;

    answerEl.classList.add('quiz-answer-hidden');

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.className = 'quiz-textarea';
    inp.style.maxWidth = '12rem';
    inp.placeholder = '填写数值';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-submit-btn';
    btn.textContent = '提交答案';

    const feedback = document.createElement('p');
    feedback.className = 'quiz-feedback';

    item.insertBefore(inp, answerEl);
    item.insertBefore(btn, answerEl);
    item.insertBefore(feedback, answerEl);

    btn.addEventListener('click', function () {
      const v = parseFloat(String(inp.value).trim().replace(/,/g, ''));
      if (Number.isNaN(v)) {
        feedback.textContent = '请输入有效数字。';
        feedback.className = 'quiz-feedback err';
        return;
      }
      const ok = Math.abs(v - num) <= Math.max(1e-6, Math.abs(num) * 0.02);
      feedback.textContent = ok ? '在允许误差范围内，判断为正确。' : '与参考答案不一致。下方为参考答案。';
      feedback.className = 'quiz-feedback ' + (ok ? 'ok' : 'err');
      answerEl.classList.remove('quiz-answer-hidden');
    });

    return true;
  }

  function initOpenShort(item, answerEl) {
    answerEl.classList.add('quiz-answer-hidden');

    const ta = document.createElement('textarea');
    ta.rows = 3;
    ta.className = 'quiz-textarea';
    ta.placeholder = '可先写出要点，再提交查看参考答案并自行核对。';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-submit-btn';
    btn.textContent = '提交并显示参考答案';

    const feedback = document.createElement('p');
    feedback.className = 'quiz-feedback';

    item.insertBefore(ta, answerEl);
    item.insertBefore(btn, answerEl);
    item.insertBefore(feedback, answerEl);

    btn.addEventListener('click', function () {
      if (!String(ta.value).trim()) {
        feedback.textContent = '建议先写简要要点再提交。';
        feedback.className = 'quiz-feedback err';
        return;
      }
      feedback.textContent = '已显示参考答案，请自行对照要点判断是否掌握。';
      feedback.className = 'quiz-feedback ok';
      answerEl.classList.remove('quiz-answer-hidden');
    });
  }

  function initQuizItems() {
    var items = document.querySelectorAll('.quiz-item');
    items.forEach(function (item, index) {
      var answerEl = item.querySelector('.answer');
      if (!answerEl) return;

      var questionEl = item.querySelector('.question');
      var questionText = questionEl ? questionEl.textContent : '';

      var ol = item.querySelector('ol[type="A"], ol[type="a"]');
      if (ol && initMcqFromOl(item, answerEl, ol, index)) return;

      if (
        /请判断|是否正确|对还是错|是真是假|是否/.test(questionText) &&
        initJudge(item, answerEl, questionText, index)
      )
        return;

      if (initNumeric(item, answerEl, questionText, index)) return;

      initOpenShort(item, answerEl);
    });
  }

  function upgradeQuestionList() {
    document.querySelectorAll('ol.question-list').forEach(function (ol) {
      var h2 = ol.previousElementSibling;
      var card = document.createElement('section');
      card.id = 'self-test';
      card.className = 'card';

      if (h2 && h2.tagName === 'H2') {
        ol.parentNode.insertBefore(card, h2);
        card.appendChild(h2);
      } else {
        ol.parentNode.insertBefore(card, ol);
        var nh = document.createElement('h2');
        nh.textContent = '自测小题';
        card.appendChild(nh);
      }

      ol.querySelectorAll(':scope > li').forEach(function (li, idx) {
        var item = document.createElement('div');
        item.className = 'quiz-item';

        var q = document.createElement('p');
        q.className = 'question';
        q.textContent = String(idx + 1) + '. ' + li.textContent.trim();

        var group = document.createElement('div');
        group.className = 'quiz-choice-group';
        var name = 'open-' + idx + '-' + Math.random().toString(36).slice(2);
        ['A. 已掌握要点', 'B. 基本理解', 'C. 需要复习', 'D. 先跳过'].forEach(function (lab) {
          var l = document.createElement('label');
          l.className = 'quiz-radio-label';
          var inp = document.createElement('input');
          inp.type = 'radio';
          inp.name = name;
          inp.value = lab.charAt(0);
          l.appendChild(inp);
          l.appendChild(document.createTextNode(' ' + lab));
          group.appendChild(l);
        });

        var ans = document.createElement('div');
        ans.className = 'answer quiz-answer-hidden';
        ans.innerHTML =
          '<strong>提示：</strong>本题为思考题，无唯一客观选项评分。请先回顾本节<strong>小结</strong>与<strong>严格定义</strong>段落，用自己的话归纳要点后再对照正文。';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-submit-btn';
        btn.textContent = '提交选择并查看提示';

        var fb = document.createElement('p');
        fb.className = 'quiz-feedback';

        btn.addEventListener('click', function () {
          if (!group.querySelector('input:checked')) {
            fb.textContent = '请先选择一项。';
            fb.className = 'quiz-feedback err';
            return;
          }
          fb.textContent = '请结合正文自评掌握程度，并完成要点复述。';
          fb.className = 'quiz-feedback ok';
          ans.classList.remove('quiz-answer-hidden');
        });

        item.appendChild(q);
        item.appendChild(group);
        item.appendChild(btn);
        item.appendChild(fb);
        item.appendChild(ans);
        card.appendChild(item);
      });

      ol.remove();
    });
  }

  function addChapterToc() {
    var m = location.pathname.match(/method-(\d+)\.html$/i);
    if (!m) return;
    var chapterNo = parseInt(m[1], 10);
    if (Number.isNaN(chapterNo) || chapterNo < 3 || chapterNo > 18) return;

    var main = document.querySelector('main.container');
    if (!main || main.querySelector('.toc')) return;

    var headingNodes = Array.prototype.slice.call(main.querySelectorAll('h2, h3'));
    if (!headingNodes.length) return;

    var toc = document.createElement('section');
    toc.className = 'toc';
    var title = document.createElement('h2');
    title.textContent = '本页目录';
    toc.appendChild(title);

    var rootUl = document.createElement('ul');
    var currentH2Li = null;

    headingNodes.forEach(function (el, idx) {
      var text = (el.textContent || '').trim();
      if (!text) return;

      if (!el.id) {
        el.id = 'sec-' + chapterNo + '-' + idx;
      }

      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + el.id;
      a.textContent = text;
      li.appendChild(a);

      if (el.tagName === 'H2') {
        rootUl.appendChild(li);
        currentH2Li = li;
      } else {
        if (!currentH2Li) {
          rootUl.appendChild(li);
          return;
        }
        var sub = currentH2Li.querySelector('ul');
        if (!sub) {
          sub = document.createElement('ul');
          currentH2Li.appendChild(sub);
        }
        sub.appendChild(li);
      }
    });

    if (!rootUl.children.length) return;
    toc.appendChild(rootUl);

    main.insertBefore(toc, main.firstChild);
  }

  function run() {
    addChapterToc();
    upgradeQuestionList();
    initQuizItems();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
