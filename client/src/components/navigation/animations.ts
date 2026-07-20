export const createSvgPath = (
  width: number,
  height: number,
  dipX: number,
  dipWidth: number = 76,
  dipHeight: number = 22
) => {
  'worklet';
  const halfDip = dipWidth / 2;
  const left = dipX - halfDip;
  const right = dipX + halfDip;

  const clampLeft = Math.max(0, left);
  const clampRight = Math.min(width, right);

  const cpOffset = 10;
  const shoulderOffset = 14;

  return `M 0 0 L ${clampLeft} 0 C ${left + shoulderOffset} 0, ${left + cpOffset} ${dipHeight}, ${dipX} ${dipHeight} C ${right - cpOffset} ${dipHeight}, ${right - shoulderOffset} 0, ${clampRight} 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
};
