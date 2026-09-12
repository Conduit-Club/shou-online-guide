// Register the PMTiles protocol once for all maps. Removing one map must not
// unregister a protocol that another map is still using.
let protocolPromise;
const importBrowserModule = new Function("url", "return import(url);");

export function loadPmtiles(maplibreUrl) {
  protocolPromise ??= Promise.all([importBrowserModule(maplibreUrl), import("pmtiles")]).then(
    ([maplibre, { Protocol, PMTiles }]) => {
      const protocol = new Protocol();
      maplibre.addProtocol("pmtiles", protocol.tile);
      return { maplibre, protocol, PMTiles };
    },
  );
  return protocolPromise;
}
