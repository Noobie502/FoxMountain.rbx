// A small pixel-art emerald, drawn on an 8×8 grid so it stays crisp at any size.
const PIXELS = [
  "...LL...",
  "..LMMD..",
  ".LMHMMD.",
  "LMHMMMMD",
  "LMMMMMMD",
  ".DMMMMD.",
  "..DMMD..",
  "...DD...",
];
const COLORS = { L: "#7ff2b4", M: "#2fcf7d", H: "#e9fff2", D: "#138a52" };

export default function Emerald({ size = 20, title }) {
  const rects = [];
  PIXELS.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (COLORS[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COLORS[c]} />);
    })
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="emerald"
    >
      {rects}
    </svg>
  );
}
