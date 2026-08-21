window.UrnUtils = window.UrnUtils || {};

window.UrnUtils.normalizeColor = function (color) {
  if (!color) return "";
  let clean = color.replace("light", "").replace("hot", "").toLowerCase().trim();
  if (clean === "grey" || clean === "#d3d3d3") return "grey";
  return clean;
};

window.UrnUtils.computeDrawProbability = function (draw, urnMap) {
  if (!urnMap) return null;
  let jointProb = 1.0;
  for (const urnKey in urnMap) {
    const urnColor = window.UrnUtils.normalizeColor(urnMap[urnKey].color);
    const urnProb = parseFloat(urnMap[urnKey].prob);
    const drawColor = window.UrnUtils.normalizeColor(draw[urnKey]);
    const isColored = drawColor === urnColor;
    jointProb *= isColored ? urnProb : (1 - urnProb);
  }
  return jointProb.toFixed(2);
};