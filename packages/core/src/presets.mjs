// How each toolchain names its hashed output files.
//
// Every preset splits a filename into a stable `name` (which survives between
// releases) and a `hash` (which changes). Pairing old and new files by `name`
// is what makes delta compression possible, so a preset that gets this wrong
// produces no deltas at all. Run `build-deltas --dry-run` against your real
// build output before trusting any of these.

export const presets = {
  // Vite (React, Vue, Svelte and so on): assets/index-BxQ3k9aZ.js
  // Rollup's default hash is 8 base64url characters, which can include "-" and "_".
  vite: /^(?<name>.+)-(?<hash>[A-Za-z0-9_-]{8})\.(?<ext>js|mjs|css)$/,

  // Angular CLI with the esbuild application builder: main-7XK2P4QM.js
  // Lazy chunks are only named usefully when "namedChunks" is enabled.
  angular: /^(?<name>.+)-(?<hash>[A-Z0-9]{8})\.(?<ext>js|css)$/,

  // Next.js with the webpack builder: static/chunks/main-app-<16 hex>.js
  // Check your output first: Turbopack names chunks differently.
  "next-webpack": /^(?<name>.+)-(?<hash>[0-9a-f]{16})\.(?<ext>js|css)$/,

  // The plain HTML and JavaScript demo in examples/vanilla.
  vanilla: /^(?<name>.+)-(?<hash>[0-9a-f]{8})\.(?<ext>js|css)$/,
};

// Names that exist but cannot be paired reliably across releases, such as
// webpack's numeric chunk ids or esbuild's anonymous "chunk-XXXX" files.
const UNSTABLE_NAME = /^(\d+|chunk)$/;

// Characters with special meaning in URLPattern (or in URLs), which would make
// the generated `match` pattern mean something other than intended.
const UNSAFE_FOR_PATTERN = /[:*?+(){}\\#\[\]]/;

/**
 * Split a relative file path into its stable key and hash.
 * Returns null for files the preset does not recognise.
 */
export function parseAssetPath(relativePath, pattern) {
  const slash = relativePath.lastIndexOf("/");
  const dir = slash === -1 ? "" : relativePath.slice(0, slash + 1);
  const file = relativePath.slice(slash + 1);
  const match = pattern.exec(file);
  if (!match) return null;

  const { name, hash, ext } = match.groups;
  return {
    key: `${dir}${name}.${ext}`,
    dir,
    name,
    hash,
    ext,
    unstable: UNSTABLE_NAME.test(name),
    patternSafe: !UNSAFE_FOR_PATTERN.test(dir + name),
  };
}
