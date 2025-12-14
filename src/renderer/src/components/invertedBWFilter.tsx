const InvertedBWFilter = () => {
  return (
    <svg style={{ display: "none" }}>
      <filter id="color-inverted-binary">
        <feColorMatrix
          type="matrix"
          values="
      0.3333 0.3333 0.3333 0 0
      0.3333 0.3333 0.3333 0 0
      0.3333 0.3333 0.3333 0 0
      0      0      0      1 0
    "
          result="grayscale"
        />

        <feComponentTransfer in="grayscale" result="thresholded">
          <feFuncR type="linear" slope="50" intercept="-10" />
          <feFuncG type="linear" slope="50" intercept="-10" />
          <feFuncB type="linear" slope="50" intercept="-10" />
        </feComponentTransfer>

        <feColorMatrix
          in="thresholded"
          type="matrix"
          values="
      -1  0  0  0  1
       0 -1  0  0  1
       0  0 -1  0  1
       0  0  0  1  0
    "
        />
      </filter>
    </svg>
  );
};

export default InvertedBWFilter;
