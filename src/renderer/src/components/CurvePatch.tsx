import clsx from "clsx";

/*
  R: Avatar Radius
  r: Fillet Radius
  Avatar Circle as Origin, Fillet Circle tangent to Avatar Circle and Horizontal Line
  Fillet Circle Center: (x_f, r)
  Tangent Point between two circles: (Px, Py)
  Do the same on the left side and draw both sides together
*/
const SmoothCornerPatch = ({ R, r, color, className }: { R: number; r: number; color: string; className: string }) => {
  const x_f = Math.sqrt(Math.pow(R + r, 2) - Math.pow(r, 2));

  const distance = R + r;
  const Px = (x_f / distance) * R;
  const Py = (r / distance) * R;

  /*
    (-xf, 0) ---Arc---> (-Px, Py)
    (-Px, Py) ---Line---> (Px, Py)
    (Px, Py) ---Arc---> (xf, 0)
    Note that y axis is downwards
  */
  const pathData = `
    M ${-x_f} ${r}
    A ${r} ${r} 0 0 0 ${-Px} ${r - Py}
    L ${Px} ${r - Py}
    A ${r} ${r} 0 0 0 ${x_f} ${r}
    Z
  `;

  return (
    <svg
      width={2 * x_f}
      height={r}
      viewBox={`${-x_f} 0 ${2 * x_f} ${r}`}
      className={clsx(className)}
      style={{ overflow: "visible" }} // allow slight overflow due to anti-aliasing
    >
      <path d={pathData} fill={color} />
    </svg>
  );
};

export default SmoothCornerPatch;
