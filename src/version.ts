// Must equal `version` in package.json — it is stamped into the User-Agent of
// every request, so a stale value silently mis-reports which SDK is in the
// field. It sat at 1.4.0 across nine releases before anyone noticed.
// `test/version.test.ts` fails the build if the two drift apart, and
// scripts/release-sdk-mirror.ts asserts it during the release dry-run.
export const SDK_VERSION = "1.16.0";
