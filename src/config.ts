import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-improv-director",
  displayName: "Improv Director",
  visualProfile: "gather",
  shellLayout: "inset",
  description: "A browser-local shared prompt director for accessible improv sessions.",
  accentHex: "#75d9cd",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
