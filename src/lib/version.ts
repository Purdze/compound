/** APP_VERSION for builds from source; published images get the release number from CI. */
export const DEV_VERSION = "dev";

/** Release tags and displayed versions are both `v1.2.3`. */
export function versionTag(version: string): string {
  return `v${version}`;
}
