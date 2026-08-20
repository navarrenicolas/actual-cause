// ===== Rule Evaluation Logic =====
const rules = {
  rule1: {
    evaluate: (draws, keys) => (draws[keys.highKey] !== 'lightgrey' && draws[keys.lowKey] !== 'lightgrey') || draws[keys.medLowKey] !== 'lightgrey'
  }, // (A and D) or C
  rule2: {
    evaluate: (draws, keys) => (draws[keys.highKey] !== 'lightgrey' || draws[keys.lowKey] !== 'lightgrey') && draws[keys.medLowKey] !== 'lightgrey'
  }, // (A and C) or (D and C)
  rule3: {
    evaluate: (draws, keys) => draws[keys.highKey] !== 'lightgrey' && draws[keys.medHighKey] !== 'lightgrey' && draws[keys.lowKey] !== 'lightgrey'
  }, // A and B and D
  rule4: {
    evaluate: (draws, keys) => draws[keys.highKey] !== 'lightgrey' || draws[keys.medHighKey] !== 'lightgrey' || draws[keys.lowKey] !== 'lightgrey'
  }, // A or B or D
  rule5: {
    evaluate: (draws, keys) => (draws[keys.highKey] !== 'lightgrey') !== (draws[keys.medLowKey] !== 'lightgrey')
  } // A xor C
};

// ===== Rule Text Templates =====
const ruleTemplates = {
  rule1: "{low} and {high} ball, or {medLow} ball, or all three",
  rule2: "{low} ball and {medLow} ball, or {high} ball and {medLow} ball, or all three",
  rule3: "{low} ball, {medHigh} ball, and {high} ball",
  rule4: "at least one {low} ball, {medHigh} ball, or {high} ball",
  rule5: "either {high} or {medLow} ball, but not both"
};

// ===== Familiarization Patterns =====
const fixedFamiliarisation = {
  rule1: [ // (A and D) or C
    { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 },
    { high: 1, medHigh: 1, medLow: 0, low: 0 } 
  ],
  rule2: [ // (A and C) or (D and C)
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 0 },  
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 0 } 
  ],
  rule3: [ // A and B and D
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 1, medLow: 1, low: 0 },  
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 } 
  ],
  rule4: [ // A or B or D (high, medHigh, or low)
    { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 0, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 0, medHigh: 0, medLow: 1, low: 0 },  
    { high: 0, medHigh: 0, medLow: 0, low: 1 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 0, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 0, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 1 }, 
    { high: 0, medHigh: 0, medLow: 1, low: 1 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 1 } 
  ],
  rule5: [ // A xor C (either high or medLow, not both)
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 0, medHigh: 0, medLow: 0, low: 1 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 0, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 1 } 
  ]
};

const fixedPrediction = {
  rule1: [ // (A and D) or C
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 0, medLow: 0, low: 1 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 1 }, 
    { high: 0, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 0 } 
  ],
  rule2: [ // (A and C) or (D and C)
    { high: 1, medHigh: 0, medLow: 1, low: 1 }, 
    { high: 0, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 0, medLow: 1, low: 1 }
  ],
  rule3: [ // A and B and D
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 1, medLow: 1, low: 1 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 1 } 
  ],
  rule4: [ // A or B or D (high, medHigh, or low)
    { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
    { high: 0, medHigh: 0, medLow: 1, low: 0 },  
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 0 } 
  ],
  rule5: [ // A xor C (either high or medLow, not both)
    { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 0, low: 1 }, 
    { high: 0, medHigh: 1, medLow: 1, low: 0 }, 
    { high: 0, medHigh: 1, medLow: 0, low: 0 }, 
    { high: 1, medHigh: 1, medLow: 1, low: 0 } 
  ]
};

// ===== Text Formatting Helpers =====
const getArticle = (word) => {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  return vowels.includes(word[0].toLowerCase()) ? 'an' : 'a';
};

const fillRuleTemplate = (template, labels) => {
  let filled = template.replace(/{(high|medHigh|medLow|low)}/g, (_, role) => labels[role]);

  // Rule 1: X and Y ball, or Z ball
  filled = filled.replace(
    /(pink|orange|blue|purple) and (pink|orange|blue|purple) ball, or (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3) => `${getArticle(c1)} ${c1} and ${getArticle(c2)} ${c2} ball, or ${getArticle(c3)} ${c3} ball`
  );

  // Rule 2: X ball and Y ball, or Z ball and W ball
  filled = filled.replace(
    /(pink|orange|blue|purple) ball and (pink|orange|blue|purple) ball, or (pink|orange|blue|purple) ball and (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3, c4) => `${getArticle(c1)} ${c1} ball and ${getArticle(c2)} ${c2} ball, or ${getArticle(c3)} ${c3} ball and ${getArticle(c4)} ${c4} ball`
  );

  // Rule 3: X ball, Y ball, and Z ball
  filled = filled.replace(
    /(pink|orange|blue|purple) ball, (pink|orange|blue|purple) ball, and (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3) => `${getArticle(c1)} ${c1} ball, ${getArticle(c2)} ${c2} ball, and ${getArticle(c3)} ${c3} ball`
  );

  // Rule 4: at least one X ball, Y ball, or Z ball
  filled = filled.replace(
    /at least one (pink|orange|blue|purple) ball, (pink|orange|blue|purple) ball, or (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3) => `at least one ${c1} ball, ${c2} ball, or ${c3} ball`
  );

  // Rule 5: either X or Y ball, but not both
  filled = filled.replace(
    /either (pink|orange|blue|purple) or (pink|orange|blue|purple) ball/,
    (_, c1, c2) => `either ${getArticle(c1)} ${c1} or ${getArticle(c2)} ${c2} ball`
  );

  return filled;
};

const colorizeWithSpans = (text) => {
  const colorMap = {
    pink: 'hotpink',
    orange: 'orange',
    blue: 'blue',
    purple: 'purple'
  };
  return text.replace(/\b(pink|orange|blue|purple)\b/g, (color) => {
    return `<span style="color:${colorMap[color]}">${color}</span>`;
  });
};