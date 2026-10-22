// Pixel-art gems drawn on an 8×8 grid so they stay crisp at any size.
const SHAPES = {
  emerald: {
    pixels: ["...LL...", "..LMMD..", ".LMHMMD.", "LMHMMMMD", "LMMMMMMD", ".DMMMMD.", "..DMMD..", "...DD..."],
    colors: { L: "#7ff2b4", M: "#2fcf7d", H: "#e9fff2", D: "#138a52" },
  },
  diamond: {
    pixels: ["........", ".LLLLLL.", "LHMMMMDL", "LMMMMMDD", ".LMMMDD.", "..LMDD..", "...DD...", "........"],
    colors: { L: "#a8f3ee", M: "#4fd6d0", H: "#ffffff", D: "#1f9a9a" },
  },
};

export function Gem({ kind = "emerald", size = 20, title }) {
  const { pixels, colors } = SHAPES[kind];
  const rects = [];
  pixels.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (colors[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={colors[c]} />);
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

export default function Emerald(props) {
  return <Gem kind="emerald" {...props} />;
}
