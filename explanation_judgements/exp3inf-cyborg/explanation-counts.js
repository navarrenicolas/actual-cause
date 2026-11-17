/* Pooled counts are matched by probability role, never randomized scenario ID. */
window.ExplanationCounts = {
  legend: `<p class="explanation-counts-legend">The numbers in the observations represent the number of people that selected the ball above as the explanation for the outcome: “John won/lost because of the grey/colored ball from box A/B/C/D”.</p>`,
  attach(record) {
    const keys = Object.keys(record.urn_probs).sort((a, b) => record.urn_probs[b] - record.urn_probs[a]);
    return record.scenarios.map(sc => {
      const pattern = keys.map(k => sc.draw[k] === 'lightgrey' ? '0' : '1').join('');
      const pooled = window.Study3CountsData.rules[record.rule_key]?.[pattern];
      if (!pooled || pooled.outcome !== sc.result) throw new Error('Missing or inconsistent pooled explanations');
      const counts = Object.fromEntries(keys.map((k, i) => [k, pooled.counts[i]]));
      if (!Object.values(counts).every(n => Number.isInteger(n) && n >= 0)) throw new Error('Invalid explanation counts');
      return { id: sc.id, draw: sc.draw, result: sc.result, explanation_counts: counts };
    });
  },
  render(card, counts, keys, isWin) {
    keys.forEach(key => {
      const slot = card.querySelector(`#slot-${key}`);
      if (!slot) return;
      window.UrnUtils.markHighlightedBall(slot, isWin);
      const label = document.createElement('div');
      label.className = 'explanation-count';
      label.textContent = counts[key];
      label.setAttribute('aria-label', `${counts[key]} people selected the ball from box ${key}`);
      slot.insertAdjacentElement('afterend', label);
    });
  }
};
