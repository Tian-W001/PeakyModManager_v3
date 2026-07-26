# Keep a lossless syntax tree separate from semantic analysis

3DMigoto accepts ordered duplicate keys, executable bare lines, significant `pre`/`post` phases, and extension syntax that changes over time in XXMI. The parser will therefore preserve every source line in a lossless concrete syntax tree and build CommandList/expression ASTs as optional derived views; this costs more structure than a normal INI map, but permits safe round-tripping, diagnostics, and forward-compatible editing without treating unknown commands as data loss.
