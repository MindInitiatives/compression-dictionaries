// Pick a prebuilt delta when the browser holds a dictionary we have a delta for.
// Otherwise fall through to normal Brotli or gzip handling.
app.use((req, res, next) => {
  const entry = manifest.assets[req.path];
  if (!entry) return next();

  res.vary("Accept-Encoding");
  res.vary("Available-Dictionary");
  if (entry.match) res.set("Use-As-Dictionary", `match="${entry.match}"`);

  const hash = parseAvailableDictionary(req.get("Available-Dictionary")); // ":base64:" -> hex
  const delta = hash && entry.deltas[hash];
  if (!delta || !acceptsEncoding(req.get("Accept-Encoding"), "dcz")) return next();

  res.set("Content-Encoding", "dcz");
  res.type(req.path);
  res.sendFile(join(deltasDir, delta.file));
});
