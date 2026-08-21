import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-improv-director",
  description: "A browser-local shared prompt director for accessible improv sessions.",
  accentHex: "#8b5cf6",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
