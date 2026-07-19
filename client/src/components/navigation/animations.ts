export const createSvgPath = (
  width: number,
  height: number,
  dipX: number,
  dipWidth: number = 74,
  dipHeight: number = 28
) => {
  'worklet';
  const halfDip = dipWidth / 2;
  const left = dipX - halfDip;
  const right = dipX + halfDip;
  const cpOffset = 18;

  const clampLeft = Math.max(0, left);
  const clampRight = Math.min(width, right);

  return `M 0 0 L ${clampLeft} 0 C ${left + 8} 0, ${left + cpOffset} ${dipHeight}, ${dipX} ${dipHeight} C ${right - cpOffset} ${dipHeight}, ${right - 8} 0, ${clampRight} 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
};
