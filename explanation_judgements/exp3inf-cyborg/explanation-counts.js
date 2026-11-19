/* Pooled counts are matched by probability role, never randomized scenario ID. */
window.ExplanationCounts = {
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
  render(card, counts, keys, isWin, draw, agentName = 'John') {
    const callout = document.createElement('div');
    callout.className = 'explanation-count-callout';
    callout.setAttribute('role', 'status');
    callout.setAttribute('aria-live', 'polite');
    callout.hidden = true;
    card.appendChild(callout);
    const buttons = [];
    let activeButton = null;
    keys.forEach(key => {
      const slot = card.querySelector(`#slot-${key}`);
      if (!slot) return;
      window.UrnUtils.markHighlightedBall(slot, isWin);
      const label = document.createElement('span');
      label.className = 'explanation-count';
      label.textContent = counts[key];
      const people = counts[key] === 1 ? 'person' : 'people';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'explanation-count-button';
      button.setAttribute('aria-label', `Show explanation: ${counts[key]} ${people} selected the ball from box ${key}`);
      button.setAttribute('aria-pressed', 'false');
      slot.insertAdjacentElement('beforebegin', button);
      button.append(slot, label);
      buttons.push(button);
      button.addEventListener('click', () => {
        if (activeButton === button) {
          button.setAttribute('aria-pressed', 'false');
          activeButton = null;
          callout.hidden = true;
          callout.textContent = '';
          return;
        }
        activeButton = button;
        buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        const color = window.UrnUtils.normalizeColor(draw[key]);
        const colorWord = document.createElement('span');
        colorWord.className = 'urn-ball-text';
        colorWord.style.color = window.UrnUtils.getDisplayColor(draw[key]);
        colorWord.textContent = color;
        callout.replaceChildren(
          `${counts[key]} ${people} said ‘${agentName} ${isWin ? 'won' : 'lost'} because of the `,
          colorWord,
          ` ball from box ${key}’`
        );
        callout.hidden = false;
      });
    });
  }
};
