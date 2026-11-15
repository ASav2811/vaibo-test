import assert from 'node:assert/strict';
import test from 'node:test';
import { introQuestions, motivations, personas, questions, styles, TEST_SECONDS } from './content.mjs';
import { calculateProfile, isComplete, isValidAnswer } from './scoring.mjs';

const kinds = type => questions.filter(item => item.type === type);

function makeAnswers(style, motive) {
  return questions.map((question, index) => {
    if (question.type === 'scale') return question.factor === style ? 5 : 1;
    const relevant = index < 18 ? style : motive;
    const matches = question.options.flatMap((item, n) => item.factor === relevant ? [n] : []);
    if (question.type === 'multi') {
      if (matches.length >= question.required) return matches.slice(0, question.required);
      return [...matches, ...question.options.map((_, n) => n).filter(n => !matches.includes(n))].slice(0, question.required);
    }
    return matches.length ? matches[0] : 0;
  });
}

test('Точное количество и структура утверждённых заданий', () => {
  assert.equal(introQuestions.length, 3);
  assert.equal(questions.length, 23);
  assert.equal(kinds('pair').length, 10);
  assert.equal(kinds('scale').length, 5);
  assert.equal(kinds('multi').length, 5);
  assert.equal(kinds('single').length, 3);
  assert.equal(TEST_SECONDS, 300);
  assert.equal(questions.reduce((sum, q) => sum + q.options.length, 0), 56);
});

test('Равное представительство рабочих стилей в вопросах', () => {
  const codes = Object.keys(styles);
  for (const code of codes) {
    assert.equal(questions.slice(0,10).flatMap(q=>q.options).filter(o=>o.factor===code).length, 4);
    for (const q of questions.slice(15,18)) assert.equal(q.options.filter(o=>o.factor===code).length, 1);
    assert.equal(questions.slice(10,15).filter(q=>q.factor===code).length, 1);
  }
});

test('Равное представительство мотиваторов в зелёных и красных флагах', () => {
  const codes = Object.keys(motivations);
  for (const code of codes) {
    assert.equal(questions[18].options.filter(o=>o.factor===code).length,2);
    assert.equal(questions[19].options.filter(o=>o.factor===code).length,2);
    for (const question of questions.slice(20)) assert.equal(question.options.filter(o=>o.factor===code).length,1);
  }
});

test('Доступны все 15 уникальных Вайбо', () => {
  assert.equal(Object.keys(personas).length, 15);
  assert.equal(new Set(Object.values(personas).map(p=>p.name)).size, 15);
  for (const style of Object.keys(styles)) for(const motive of Object.keys(motivations)) {
    assert.ok(personas[`${style}|${motive}`]);
  }
});

test('Выбор только указанного количества вариантов и правильные границы шкал', () => {
  assert.ok(!isValidAnswer(questions[15], [0]));
  assert.ok(!isValidAnswer(questions[15], [0,0]));
  assert.ok(!isValidAnswer(questions[15], [0,6]));
  assert.ok(isValidAnswer(questions[15], [0,3]));
  assert.ok(!isValidAnswer(questions[11], 0));
  assert.ok(!isValidAnswer(questions[11], 6));
  assert.ok(isValidAnswer(questions[11], 5));
  assert.ok(!isComplete(Array(23).fill(null)));
  assert.throws(() => calculateProfile(Array(23).fill(null)));
});

test('Каждый из 15 Вайбо достижим и правильно рассчитывается', () => {
  for (const style of Object.keys(styles)) for(const motive of Object.keys(motivations)) {
    const answers = makeAnswers(style, motive);
    assert.ok(isComplete(answers));
    const result = calculateProfile(answers);
    assert.equal(result.primary.id, `${style}|${motive}`, `Ожидали ${style}|${motive}`);
    assert.equal(result.primaryStyle,style);
    assert.equal(result.primaryMotive,motive);
  }
});

test('Суммарные ответы корректно учитываются без потерь', () => {
  const answers = makeAnswers('K', 'A');
  const result = calculateProfile(answers);
  assert.equal(Object.values(result.pairCounts).reduce((a,b)=>a+b,0),10);
  assert.equal(Object.values(result.qualityCounts).reduce((a,b)=>a+b,0),6);
  assert.equal(Object.values(result.greenCounts).reduce((a,b)=>a+b,0),4);
  assert.equal(Object.values(result.redCounts).reduce((a,b)=>a+b,0),3);
  assert.equal(result.styleScores.K, 1);
  assert.equal(result.motiveScores.A, 1);
});

test('Близкие результаты не присваиваются принудительно', () => {
  let ambiguous = null;
  let seed = 102938;
  const random = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
  for (let i=0; i<200 && !ambiguous;i++) {
    const answers = questions.map(question => {
      if (question.type === 'scale') return 1+Math.floor(random()*5);
      if (question.type === 'multi') {
        const shuffled = question.options.map((_,n)=>n).sort(()=>random()-.5);
        return shuffled.slice(0,question.required);
      }
      return Math.floor(random()*question.options.length);
    });
    const result = calculateProfile(answers);
    if (result.ambiguous) ambiguous = result;
  }
  assert.ok(ambiguous, 'Нужен хотя бы один проверочный профиль с близкими значениями');
  assert.ok(ambiguous.candidates.length >= 2);
  assert.ok(ambiguous.candidates.some(p=>p.id === ambiguous.primary.id));
});
