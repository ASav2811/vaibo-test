import { introQuestions, motivations, personas, questions, styles, TEST_SECONDS } from './content.mjs';
import { calculateProfile, isComplete, isValidAnswer } from './scoring.mjs';

// Новый ключ не подхватывает ответы от версии с другими заданиями.
const STORE_KEY = 'vibehunt-mvp-5.1-fundamental-session';
const root = document.querySelector('#app');
const infoDialog = document.querySelector('#info-dialog');
const nextDialog = document.querySelector('#next-dialog');
const toast = document.querySelector('#toast');
const moodEmoji = { green: '✳', red: '⚑' };
let toastTimer = null;
let svgSequence = 0;

function initialState() {
  return {
    screen: 'welcome',
    intros: ['', '', ''],
    answers: Array(questions.length).fill(null),
    position: 0,
    deadline: null,
    startedAt: null,
    completedAt: null,
    chosenPersona: null,
    feedback: null,
  };
}

function loadState() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
    if (!stored || !Array.isArray(stored.intros) || stored.intros.length !== 3 ||
        !Array.isArray(stored.answers) || stored.answers.length !== questions.length ||
        !['welcome', 'intro', 'quiz', 'result'].includes(stored.screen)) return initialState();
    if (!Number.isInteger(stored.position) || stored.position < 0 || stored.position >= questions.length) return initialState();
    if (stored.screen === 'result' && !isComplete(stored.answers)) return initialState();
    if (stored.screen === 'quiz' && (!Number.isFinite(stored.deadline) || !Number.isFinite(stored.startedAt))) return initialState();
    return { ...initialState(), ...stored };
  } catch { return initialState(); }
}

let state = loadState();

function save() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch { /* Browsers with blocked storage can still run the test. */ }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[character]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function svgSymbol(styleCode, x = 148, y = 237) {
  const ink = '#3c335e';
  switch (styleCode) {
    case 'K': return `<path d="M${x} ${y-24} l8 16 18 3 -13 12 3 19 -18 -10 -16 10 3 -19 -13 -12 18 -3z" fill="#fff7af" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'N': return `<g stroke="${ink}" stroke-width="4" stroke-linejoin="round"><path d="M${x-8} ${y-22} h16 M${x-4} ${y-22} v17 l-20 22 q-4 8 5 8 h38 q9 0 5-8 l-20-22 v-17" fill="#e7fff7"/><path d="M${x-18} ${y+4} h36" stroke="#67c8bc"/></g>`;
    case 'D': return `<path d="M${x+3} ${y-29} l-23 33 h16 l-4 24 28 -36 h-18z" fill="#fff1b2" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'S': return `<g stroke="${ink}" stroke-width="3.6"><rect x="${x-21}" y="${y-22}" width="18" height="18" rx="4" fill="#e8f2ff"/><rect x="${x+3}" y="${y-22}" width="18" height="18" rx="4" fill="#fff"/><rect x="${x-21}" y="${y+2}" width="18" height="18" rx="4" fill="#fff"/><rect x="${x+3}" y="${y+2}" width="18" height="18" rx="4" fill="#e8f2ff"/></g>`;
    case 'C': return `<path d="M${x} ${y+22} C${x-45} ${y-7} ${x-18} ${y-36} ${x} ${y-15} C${x+18} ${y-36} ${x+45} ${y-7} ${x} ${y+22}Z" fill="#fff1f6" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
    default: return '';
  }
}

function accessory(styleCode) {
  switch (styleCode) {
    case 'K': return `<path d="M114 54 l10-18 10 18 19 8 -19 9 -10 18 -10-18 -19-9Z" fill="#fff0a8" stroke="#39304f" stroke-width="5" stroke-linejoin="round"/><path d="M193 67 l6-10 6 10 11 5 -11 5 -6 11 -6-11 -10-5Z" fill="#fff0a8"/>`;
    case 'N': return `<path d="M122 75 q-35-43-1-50 q30-4 25 31 M181 70 q32-42 48-12" stroke="#39304f" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="121" cy="25" r="11" fill="#c7fff0" stroke="#39304f" stroke-width="5"/><circle cx="229" cy="57" r="9" fill="#ffe49a" stroke="#39304f" stroke-width="5"/>`;
    case 'D': return `<path d="M116 89 99 51 137 62 146 26 185 74" fill="#ffd38f" stroke="#39304f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M194 66 207 36 222 66" fill="#fff1aa" stroke="#39304f" stroke-width="5" stroke-linejoin="round"/>`;
    case 'S': return `<path d="M111 85 V43 q0-13 13-13 h68 q13 0 13 13 v42" fill="#a7bafa" stroke="#39304f" stroke-width="6"/><path d="M127 56h62 M127 69h42" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;
    case 'C': return `<path d="M113 90 Q78 47 105 37 Q126 31 146 59 Q160 25 183 38 Q211 52 185 91" fill="#ffa7bd" stroke="#39304f" stroke-width="6" stroke-linejoin="round"/><circle cx="218" cy="70" r="12" fill="#ffe5a1" stroke="#39304f" stroke-width="5"/>`;
    default: return '';
  }
}

function motiveAccents(motive) {
  if (motive === 'A') return `<path d="M76 154 l-25 -10 M79 178 l-31 3 M230 157 l29 -10 M232 181 l28 2" stroke="#6b5aa2" stroke-width="5" stroke-linecap="round" opacity=".63"/><path d="M260 215 l7 -11 7 11 11 5 -11 5 -7 11 -7 -11 -11-5Z" fill="#ffe2a3"/>`;
  if (motive === 'M') return `<path d="M67 199 l9 -12 9 12 14 5 -14 5 -9 13 -9 -13 -13 -5Z" fill="#ffe99a" stroke="#514382" stroke-width="3"/><circle cx="257" cy="147" r="13" fill="#ffe1a9" stroke="#514382" stroke-width="4"/><path d="m251 147 4 4 8-9" fill="none" stroke="#514382" stroke-width="3.5" stroke-linecap="round"/>`;
  return `<circle cx="70" cy="163" r="13" fill="#f4b2ce" stroke="#514382" stroke-width="4"/><circle cx="258" cy="157" r="13" fill="#a5e0f0" stroke="#514382" stroke-width="4"/><path d="M82 166 Q107 187 121 180 M245 167 Q227 187 213 180" fill="none" stroke="#8b80be" stroke-width="3" stroke-dasharray="4 7" stroke-linecap="round"/>`;
}

function avatarSvg(persona, extraClass = '') {
  const uid = `av${++svgSequence}`;
  const color = styles[persona.style].color;
  const isTeam = persona.motive === 'B';
  const bodyHighlight = persona.motive === 'M' ? '#d7d2ff' : persona.motive === 'A' ? '#f4ddff' : '#ffdfed';
  const eyes = persona.style === 'S'
    ? `<rect x="120" y="146" width="10" height="14" rx="5" fill="#332941"/><rect x="177" y="146" width="10" height="14" rx="5" fill="#332941"/>`
    : persona.style === 'D'
      ? `<path d="M119 147 l14 5 M176 152 l14-5" stroke="#332941" stroke-width="6" stroke-linecap="round"/>`
      : `<ellipse cx="126" cy="152" rx="5.5" ry="8" fill="#332941"/><ellipse cx="183" cy="152" rx="5.5" ry="8" fill="#332941"/>`;
  const mouth = persona.style === 'N'
    ? `<path d="M142 174 q13 18 27 0" fill="none" stroke="#463359" stroke-width="4.5" stroke-linecap="round"/>`
    : `<path d="M143 175 q11 11 23 0" fill="none" stroke="#463359" stroke-width="4.5" stroke-linecap="round"/>`;
  return `<svg class="${extraClass}" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Иллюстрация Вайбо ${escapeHtml(persona.name)}">
    <defs>
      <linearGradient id="body-${uid}" x1=".16" y1="0" x2=".86" y2="1"><stop stop-color="#fff" stop-opacity=".58"/><stop offset=".3" stop-color="${color}"/><stop offset="1" stop-color="${color}"/></linearGradient>
      <linearGradient id="belly-${uid}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="${bodyHighlight}"/></linearGradient>
    </defs>
    <ellipse cx="160" cy="285" rx="85" ry="16" fill="#7360ae" opacity=".10"/>
    ${motiveAccents(persona.motive)}
    <path d="M107 217 Q72 211 70 243 Q66 265 88 263 L122 241" fill="${color}" stroke="#39304f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M204 215 Q246 209 251 241 Q256 262 232 262 L201 239" fill="${color}" stroke="#39304f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M129 252 Q109 267 111 282 Q130 293 147 276 L157 251 M170 252 Q190 267 190 282 Q210 294 225 276 L207 252" fill="${color}" stroke="#39304f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M98 186 Q94 151 115 131 Q132 111 166 114 Q200 114 220 137 Q237 155 223 203 Q227 246 192 268 Q163 281 129 264 Q96 244 98 186Z" fill="url(#body-${uid})" stroke="#39304f" stroke-width="6" stroke-linejoin="round"/>
    <ellipse cx="159" cy="234" rx="52" ry="36" fill="url(#belly-${uid})" stroke="#39304f" stroke-width="4"/>
    ${svgSymbol(persona.style,159,236)}
    <path d="M100 147 Q86 108 119 87 Q146 64 184 85 Q232 96 226 145 Q223 199 157 207 Q97 204 100 147Z" fill="url(#body-${uid})" stroke="#39304f" stroke-width="6"/>
    <path d="M109 111 Q129 86 155 91" stroke="#fff" opacity=".48" stroke-width="10" stroke-linecap="round" fill="none"/>
    ${eyes}
    <ellipse cx="103" cy="174" rx="12" ry="7" fill="#ff8ca2" opacity=".50"/>
    <ellipse cx="205" cy="174" rx="12" ry="7" fill="#ff8ca2" opacity=".50"/>
    ${mouth}
    ${accessory(persona.style)}
    ${isTeam ? `<circle cx="62" cy="227" r="9" fill="#ffdc8b" stroke="#39304f" stroke-width="3"/><circle cx="253" cy="224" r="9" fill="#ffdc8b" stroke="#39304f" stroke-width="3"/>` : ''}
  </svg>`;
}

function renderWelcome() {
  const hero = personas['K|B'];
  root.innerHTML = `
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="welcome__copy">
        <div class="eyebrow"><span class="mini-spark">✳</span> Привет, знакомиться будем?</div>
        <h1 class="display" id="welcome-title">У каждого свой<br><span class="violet">рабочий</span> <span class="orange">вайб.</span></h1>
        <p class="welcome__description">Одни зажигают идеями, другие превращают хаос в систему, третьи собирают вокруг себя людей. А что делает особенным тебя?</p>
        <div class="welcome__actions">
          <button type="button" class="button button--purple" id="start-intro">Найти свой Вайбо <span class="button-arrow">↗</span></button>
          <button type="button" class="button button--light" id="about-test">Как это работает?</button>
        </div>
        <div class="under-cta"><span aria-hidden="true">✦</span> 15 персонажей · 23 задания · 5 минут на тест</div>
      </div>
      <div class="welcome-art" aria-hidden="true">
        <div class="welcome-art__back"></div>
        <div class="hero-card">
          <div class="hero-card__top"><span>ТВОЙ ВАЙБО ЖДЁТ</span><span class="mini-dots">•••</span></div>
          <div class="hero-card__visual">${avatarSvg(hero)}</div>
          <div class="hero-card__name">А кто ты?</div>
          <div class="hero-card__sub">Узнай свои рабочие суперсилы ✳</div>
        </div>
        <div class="float-bubble float-bubble--left"><span>✦</span> Твои суперсилы</div>
        <div class="float-bubble float-bubble--right"><span>♡</span> Найди себя</div>
      </div>
    </section>`;
  document.querySelector('#start-intro').addEventListener('click', () => {
    state.screen = 'intro'; save(); render(true);
  });
  document.querySelector('#about-test').addEventListener('click', () => infoDialog.showModal());
}

function renderIntro() {
  root.innerHTML = `
    <section class="stage stage--narrow" aria-labelledby="intro-title">
      <div class="stage-heading">
        <div class="eyebrow">✳ Без спешки, без оценок</div>
        <h1 id="intro-title">Сначала немного <span class="violet">о тебе</span></h1>
        <p>Три коротких вопроса для знакомства. Отвечай как хочется — можно даже пропустить вопрос. Пять минут начнутся только потом.</p>
      </div>
      <div class="paper intro-panel">
        <div class="intro-panel__top"><span class="mini-step">01 / Знакомство</span><span class="no-clock">◷ Таймер ещё не включён</span></div>
        <form id="intro-form" novalidate>
          <div class="intro-fields">
            ${introQuestions.map((item, index) => `
              <div class="field-group">
                <label for="intro-${index}">${index + 1}. ${escapeHtml(item.title)}</label>
                <div class="field-hint">${escapeHtml(item.hint)}</div>
                <textarea class="field-control" rows="2" id="intro-${index}" data-intro-index="${index}" maxlength="${item.maxLength}" placeholder="${escapeHtml(item.placeholder)}">${escapeHtml(state.intros[index])}</textarea>
                <div class="field-meta"><span class="field-warning" id="intro-warning-${index}"></span><span id="intro-counter-${index}">${state.intros[index].length} / ${item.maxLength}</span></div>
              </div>`).join('')}
          </div>
          <div class="intro-panel__bottom">
            <div class="privacy-note"><span class="note-icon">♡</span><span>Это только твои ответы. В этой демоверсии они остаются в текущей вкладке браузера и никуда не отправляются.</span></div>
            <button class="button button--purple" type="submit" id="intro-submit">Начать тест · 5 минут <span class="button-arrow">→</span></button>
          </div>
        </form>
      </div>
    </section>`;
  document.querySelectorAll('[data-intro-index]').forEach(area => area.addEventListener('input', event => {
    const index = Number(event.currentTarget.dataset.introIndex);
    state.intros[index] = event.currentTarget.value;
    document.querySelector(`#intro-counter-${index}`).textContent = `${state.intros[index].length} / ${introQuestions[index].maxLength}`;
    document.querySelector(`#intro-warning-${index}`).textContent = '';
    event.currentTarget.classList.remove('is-invalid');
    save();
  }));
  document.querySelector('#intro-form').addEventListener('submit', event => {
    event.preventDefault();
    // Read directly from the controls, including values inserted by autofill.
    // These answers do not affect avatar scoring; they must not block the test.
    state.intros = introQuestions.map((item, index) =>
      document.querySelector(`#intro-${index}`).value.slice(0, item.maxLength));
    state.startedAt = Date.now();
    state.deadline = state.startedAt + TEST_SECONDS * 1000;
    state.position = 0;
    state.screen = 'quiz';
    save();
    render(true);
  });
}

function categoryLabel(question) {
  if (question.type === 'pair') return 'Что тебе ближе';
  if (question.type === 'scale') return 'Что тебя вдохновляет';
  if (question.mood === 'green') return 'Зелёные флаги';
  if (question.mood === 'red') return 'Красные флаги';
  return 'Твои сильные стороны';
}

function answerButton(question, option, index, current, type) {
  const selected = type === 'multi' ? Array.isArray(current) && current.includes(index) : current === index;
  const marker = type === 'multi' ? (selected ? '✓' : '+') : String(index + 1).padStart(2, '0');
  return `<button type="button" class="choice ${selected ? 'is-selected' : ''}" data-choice="${index}" role="${type === 'multi' ? 'checkbox' : 'radio'}" aria-checked="${selected}">
    <span class="choice__marker" aria-hidden="true">${marker}</span>
    <span class="choice__text">${escapeHtml(option.label)}</span>
    <span class="choice__tick" aria-hidden="true">✓</span>
  </button>`;
}

function answerMarkup(question, answer) {
  if (question.type === 'scale') {
    return `<div class="scale-options" role="group" aria-label="Выбери оценку от 1 до 5">
      ${Array.from({length:5}, (_, index) => `<button type="button" class="scale-button ${answer === index+1 ? 'is-selected' : ''}" data-scale="${index+1}" aria-label="${index+1} из 5" aria-pressed="${answer === index+1}">${index+1}</button>`).join('')}
    </div><div class="scale-labels"><span>Совсем не интересно</span><span>Очень интересно</span></div>`;
  }
  const multi = question.type === 'multi';
  const choiceClass = multi ? 'choice-list choice-list--multi' : 'choice-list';
  const buttons = question.options.map((option, index) => answerButton(question, option, index, answer, question.type)).join('');
  const info = multi ? `<div class="selection-count"><span>Нужно выбрать <strong>${question.required} варианта</strong></span><span>Выбрано: <strong>${(answer || []).length} / ${question.required}</strong></span></div>` : '';
  return `<div class="${choiceClass}" role="${multi ? 'group' : 'radiogroup'}" aria-label="Варианты ответа">${buttons}</div>${info}`;
}

function renderQuiz() {
  const index = state.position;
  const question = questions[index];
  const current = state.answers[index];
  const percent = index / questions.length * 100;
  root.innerHTML = `
    <section class="quiz-wrap" aria-labelledby="quiz-title">
      <div class="quiz-top">
        <div class="quiz-progress-text">Вопрос <span>${index + 1}</span> из ${questions.length}</div>
        <div id="timer" class="timer" role="timer" aria-label="Осталось времени">
          <span class="timer__ring" aria-hidden="true"></span><span class="timer__clock" id="timer-label">05:00</span>
        </div>
      </div>
      <div class="progress-track" role="progressbar" aria-label="Прогресс теста" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${index + 1}"><div class="progress-fill" style="width:${percent}%"></div></div>
      <div class="quiz-card paper">
        <div class="quiz-card__header">
          <span class="quiz-category ${question.mood || ''}">${moodEmoji[question.mood] || '✦'} ${categoryLabel(question)}</span>
          <span class="quiz-dots" aria-hidden="true">•••</span>
        </div>
        <h1 id="quiz-title" class="quiz-title">${escapeHtml(question.prompt)}</h1>
        ${question.type === 'pair' ? '<p class="quiz-hint">Представь обычный рабочий день и выбери то, что ближе именно тебе.</p>' : ''}
        ${question.type === 'multi' ? '<p class="quiz-hint">Выбирай по ощущениям — здесь нет правильного ответа.</p>' : ''}
        ${answerMarkup(question, current)}
      </div>
      <div id="overtime-holder"></div>
      <div class="quiz-bottom">
        <button type="button" class="back-button" id="quiz-back" ${index === 0 ? 'disabled' : ''}>← Назад</button>
        <div class="quiz-bottom__right">
          <span class="question-tip">Можно изменить ответ</span>
          <button type="button" class="button button--purple" id="quiz-next" ${isValidAnswer(question, current) ? '' : 'disabled'}>${index === questions.length - 1 ? 'Узнать свой Вайбо ✳' : 'Далее'} <span class="button-arrow">→</span></button>
        </div>
      </div>
    </section>`;

  document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    const choice = Number(button.dataset.choice);
    if (question.type === 'multi') {
      const selected = Array.isArray(state.answers[index]) ? [...state.answers[index]] : [];
      const existing = selected.indexOf(choice);
      if (existing >= 0) selected.splice(existing, 1);
      else if (selected.length < question.required) selected.push(choice);
      else { showToast(`Можно выбрать только ${question.required} варианта`); return; }
      state.answers[index] = selected;
    } else state.answers[index] = choice;
    save(); renderQuiz();
  }));
  document.querySelectorAll('[data-scale]').forEach(button => button.addEventListener('click', () => {
    state.answers[index] = Number(button.dataset.scale);
    save(); renderQuiz();
  }));
  document.querySelector('#quiz-back').addEventListener('click', () => {
    if (state.position <= 0) return;
    state.position--;
    save(); render(true);
  });
  document.querySelector('#quiz-next').addEventListener('click', () => {
    if (!isValidAnswer(question, state.answers[index])) return;
    if (index === questions.length - 1) {
      if (!isComplete(state.answers)) { showToast('Ответь на все задания, чтобы увидеть результат'); return; }
      state.completedAt = Date.now(); state.screen = 'result';
      save(); render(true);
    } else {
      state.position++;
      save(); render(true);
    }
  });
  updateTimer();
}

function updateTimer() {
  if (state.screen !== 'quiz') return;
  const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const label = document.querySelector('#timer-label');
  const display = document.querySelector('#timer');
  const note = document.querySelector('#overtime-holder');
  if (!label || !display || !note) return;
  label.textContent = `${mins}:${secs}`;
  display.setAttribute('aria-label', remaining ? `Осталось ${mins} минут ${secs} секунд` : 'Пять минут прошли');
  display.classList.toggle('is-urgent', remaining <= 60 && remaining > 0);
  display.classList.toggle('is-done', remaining === 0);
  display.style.setProperty('--timer-angle', `${Math.round(remaining / TEST_SECONDS * 360)}deg`);
  if (!remaining && !note.hasChildNodes()) note.innerHTML = `<div class="overtime-note"><span>⏱</span><span>Пять минут прошли — ничего страшного! Можешь спокойно закончить и получить свой Вайбо.</span></div>`;
}

function resultPersonality() {
  const profile = calculateProfile(state.answers);
  const selected = profile.candidates.find(item => item.id === state.chosenPersona);
  return { profile, persona: selected || profile.primary };
}

function renderResult() {
  const { profile, persona } = resultPersonality();
  const style = styles[persona.style];
  const motive = motivations[persona.motive];
  root.innerHTML = `
    <section class="result" aria-labelledby="result-title">
      <div class="result-topline"><span class="eyebrow">✳ Твой результат готов</span></div>
      <h1 class="result-title" id="result-title">Знакомься, это <span class="orange">твой Вайбо!</span></h1>
      <p class="result-subtitle">${profile.ambiguous ? 'У тебя сочетаются несколько сильных сторон. Мы нашли несколько близких образов — посмотри, какой откликается больше.' : 'Кажется, мы кое-что про тебя поняли. Вот образ, который лучше всего совпал с твоими ответами.'}</p>
      <div class="result-card">
        <div class="result-card__art"><div class="avatar-stage">${avatarSvg(persona)}</div><span class="avatar-ribbon">✳ ${escapeHtml(style.name)} · ${escapeHtml(motive.short)}</span></div>
        <div class="result-card__details">
          <span class="result-label">ВАЙБО № ${String(Object.keys(personas).indexOf(persona.id)+1).padStart(2,'0')}</span>
          <h2 class="persona-name">${escapeHtml(persona.name)}</h2>
          <p class="persona-desc">${escapeHtml(style.tagline)}</p>
          <div class="detail-label">ТВОИ ВОЗМОЖНЫЕ СУПЕРСИЛЫ</div>
          <div class="strength-list">${persona.strengths.map(strength => `<span class="strength">${escapeHtml(strength)}</span>`).join('')}</div>
          <div class="result-divider"></div>
          <div class="detail-label">ЧТО ТЕБЯ ЗАРЯЖАЕТ</div>
          <div class="energy-text"><span class="energy-icon">⚡</span><span>${escapeHtml(persona.energy)}. ${escapeHtml(motive.caption)}</span></div>
        </div>
      </div>
      ${profile.ambiguous ? `
        <div class="result-options"><h3>Тебе близки сразу несколько Вайбо</h3><p>Результаты получились очень похожими. Выбери образ для своей карточки — твои ответы и расчёт при этом не меняются.</p>
        <div class="candidate-grid">
        ${profile.candidates.map(candidate => `<button type="button" class="candidate ${persona.id === candidate.id ? 'is-selected' : ''}" data-persona="${candidate.id}" aria-pressed="${persona.id === candidate.id}">${avatarSvg(candidate)}<span><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(styles[candidate.style].name)} · ${escapeHtml(motivations[candidate.motive].short)}</small></span></button>`).join('')}
        </div></div>` : ''}
      <div class="next-step">
        <div class="next-step__copy"><h3>Это ещё не всё. Заглянем глубже?</h3><p>Дальше — большое тестирование с подробным профилем и личным планом карьерного роста. Скоро в VibeHunt.</p></div>
        <button type="button" class="button" id="see-next">Что будет дальше <span class="button-arrow">↗</span></button>
      </div>
      <div class="feedback-bar"><span>Насколько тебе откликается Вайбо?</span>
        ${[['yes','Это я! 🔥'],['part','Частично 🙂'],['no','Не совсем 🤔']].map(([key,label]) => `<button class="feedback-btn ${state.feedback === key ? 'is-selected' : ''}" data-feedback="${key}" aria-pressed="${state.feedback === key}">${label}</button>`).join('')}
      </div>
      <div class="result-actions"><button class="button button--outline button--small" type="button" id="share-result">↗ Поделиться результатом</button><button class="button-subtle" type="button" id="restart">Пройти заново</button></div>
      <p class="result-footnote">Вайбо — игровой образ твоих рабочих предпочтений. Он помогает узнать себя, но не оценивает твои способности или профессиональную пригодность.</p>
    </section>`;

  document.querySelectorAll('[data-persona]').forEach(button => button.addEventListener('click', () => {
    state.chosenPersona = button.dataset.persona; save(); renderResult();
  }));
  document.querySelectorAll('[data-feedback]').forEach(button => button.addEventListener('click', () => {
    state.feedback = button.dataset.feedback; save(); renderResult();
    showToast('Спасибо! Твой отклик сохранён в этой вкладке');
  }));
  document.querySelector('#see-next').addEventListener('click', () => nextDialog.showModal());
  document.querySelector('#share-result').addEventListener('click', async () => {
    const message = `Мой Вайбо — ${persona.name} ✳\nМои суперсилы: ${persona.strengths.join(' и ')}.\nЧто заряжает: ${persona.energy}.\nУзнай свой рабочий вайб в VibeHunt!`;
    try {
      if (navigator.share) await navigator.share({ title: 'Мой Вайбо', text: message });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(message); showToast('Текст результата скопирован!'); }
      else { fallbackCopy(message); showToast('Текст результата скопирован!'); }
    } catch (error) { if (error.name !== 'AbortError') showToast('Не получилось поделиться. Попробуй ещё раз.'); }
  });
  document.querySelector('#restart').addEventListener('click', () => {
    if (!window.confirm('Начать с нуля? Все ответы из текущего прохождения будут удалены.')) return;
    state = initialState(); save(); render(true);
  });
}

function fallbackCopy(message) {
  const area = document.createElement('textarea');
  area.value = message; area.style.position = 'fixed'; area.style.opacity = '0';
  document.body.appendChild(area); area.select();
  try { document.execCommand('copy'); } finally { area.remove(); }
}

function render(scrollToTop = false) {
  if (state.screen === 'welcome') renderWelcome();
  if (state.screen === 'intro') renderIntro();
  if (state.screen === 'quiz') renderQuiz();
  if (state.screen === 'result') renderResult();
  if (scrollToTop) { window.scrollTo({ top: 0, behavior: 'instant' }); root.focus({ preventScroll: true }); }
}

document.querySelector('#help-button').addEventListener('click', () => infoDialog.showModal());
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));

window.setInterval(updateTimer, 500);
render();
