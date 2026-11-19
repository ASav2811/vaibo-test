import { motivations, personas, questions, styles } from './content.mjs';

export const STYLE_WEIGHTS = Object.freeze({ pairs: 0.60, qualities: 0.25, interest: 0.15 });
export const MOTIVE_WEIGHTS = Object.freeze({ green: 0.80, red: 0.20 });
export const STYLE_NEAR_THRESHOLD = 0.08;
export const MOTIVE_NEAR_THRESHOLD = 0.10;

export function isValidAnswer(question, answer) {
  if (question.type === 'scale') return Number.isInteger(answer) && answer >= 1 && answer <= 5;
  if (question.type === 'multi') {
    return Array.isArray(answer) && answer.length === question.required &&
      new Set(answer).size === answer.length &&
      answer.every(index => Number.isInteger(index) && index >= 0 && index < question.options.length);
  }
  return Number.isInteger(answer) && answer >= 0 && answer < question.options.length;
}

export function isComplete(answers) {
  return Array.isArray(answers) && answers.length === questions.length &&
    questions.every((question, index) => isValidAnswer(question, answers[index]));
}

function countByFactor(answers, from, to, codes) {
  const counts = Object.fromEntries(codes.map(code => [code, 0]));
  for (let i = from; i <= to; i++) {
    const chosen = Array.isArray(answers[i]) ? answers[i] : [answers[i]];
    for (const index of chosen) counts[questions[i].options[index].factor]++;
  }
  return counts;
}

function rank(scoreMap) {
  return Object.entries(scoreMap)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

export function calculateProfile(answers) {
  if (!isComplete(answers)) throw new Error('Нужно ответить на все 23 вопроса.');

  const styleCodes = Object.keys(styles);
  const motiveCodes = Object.keys(motivations);
  const pairCounts = countByFactor(answers, 0, 9, styleCodes);
  const qualityCounts = countByFactor(answers, 15, 17, styleCodes);
  const greenCounts = Object.fromEntries(motiveCodes.map(code => [code, 0]));
  const redCounts = Object.fromEntries(motiveCodes.map(code => [code, 0]));

  for (const index of [18, 20, 22]) {
    const chosen = Array.isArray(answers[index]) ? answers[index] : [answers[index]];
    for (const choice of chosen) greenCounts[questions[index].options[choice].factor]++;
  }
  for (const index of [19, 21]) {
    const chosen = Array.isArray(answers[index]) ? answers[index] : [answers[index]];
    for (const choice of chosen) redCounts[questions[index].options[choice].factor]++;
  }

  const styleScores = Object.fromEntries(styleCodes.map((code, i) => [code,
    STYLE_WEIGHTS.pairs * pairCounts[code] / 4 +
    STYLE_WEIGHTS.qualities * qualityCounts[code] / 3 +
    STYLE_WEIGHTS.interest * (answers[10 + i] - 1) / 4,
  ]));
  const motiveScores = Object.fromEntries(motiveCodes.map(code => [code,
    MOTIVE_WEIGHTS.green * greenCounts[code] / 4 +
    MOTIVE_WEIGHTS.red * redCounts[code] / 3,
  ]));

  const styleRanking = rank(styleScores);
  const motiveRanking = rank(motiveScores);
  const styleGap = styleRanking[0].value - styleRanking[1].value;
  const motiveGap = motiveRanking[0].value - motiveRanking[1].value;

  const matchedStyles = styleRanking.filter(item => styleRanking[0].value - item.value < STYLE_NEAR_THRESHOLD + 1e-10)
    .map(item => item.key);
  const matchedMotives = motiveRanking.filter(item => motiveRanking[0].value - item.value < MOTIVE_NEAR_THRESHOLD + 1e-10)
    .map(item => item.key);

  const candidates = matchedStyles.flatMap(style =>
    matchedMotives.map(motive => personas[`${style}|${motive}`]));

  // Показываем две ближайшие альтернативы даже при однозначном лидере.
  // Обе шкалы нормированы от 0 до 1; сумма сохраняет сопоставимость вклада осей.
  const alternatives = Object.values(personas)
    .filter(persona => persona.id !== `${styleRanking[0].key}|${motiveRanking[0].key}`)
    .sort((a, b) =>
      (styleScores[b.style] + motiveScores[b.motive]) -
      (styleScores[a.style] + motiveScores[a.motive]) || a.id.localeCompare(b.id))
    .slice(0, 2);

  return {
    styleScores, motiveScores, pairCounts, qualityCounts, greenCounts, redCounts,
    styleRanking, motiveRanking, styleGap, motiveGap,
    primaryStyle: styleRanking[0].key,
    primaryMotive: motiveRanking[0].key,
    primary: personas[`${styleRanking[0].key}|${motiveRanking[0].key}`],
    ambiguous: styleGap < STYLE_NEAR_THRESHOLD || motiveGap < MOTIVE_NEAR_THRESHOLD,
    candidates, alternatives,
  };
}
