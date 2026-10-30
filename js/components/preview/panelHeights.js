// Fixed collapsed headers do not participate in proportional resizing.
export const fitPanelHeights = (panels, heights, suggestedHeights, total) => {
  const result = panels.map(panel => suggestedHeights.find(item => item.id === panel.id)?.suggestedHeight ?? null);
  let remaining = total - result.reduce((sum, height) => sum + (height ?? 0), 0);
  let variable = panels.map((_panel, index) => index).filter(index => result[index] === null);

  while (variable.length) {
    const sum = variable.reduce((value, index) => value + (heights[index] || 0), 0);
    const available = remaining;
    const count = variable.length;
    const share = index => (sum > 0 ? (available * (heights[index] || 0)) / sum : available / count);
    const constrained = variable.filter(index => share(index) < panels[index].min);
    if (!constrained.length) {
      variable.forEach(index => {
        result[index] = share(index);
      });
      break;
    }
    for (const index of constrained) {
      result[index] = panels[index].min;
      remaining -= result[index];
    }
    variable = variable.filter(index => !constrained.includes(index));
  }
  return result;
};
