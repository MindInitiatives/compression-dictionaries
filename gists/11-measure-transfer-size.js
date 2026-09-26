// Real-user measurement: the saving only shows up for returning users on their
// first visit after a deploy, so tag each report with whether the release changed.
const RELEASE = document.documentElement.dataset.release; // set at build time
const previousRelease = localStorage.getItem("release");
localStorage.setItem("release", RELEASE);

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.name.includes("/assets/")) continue;
    navigator.sendBeacon("/rum", JSON.stringify({
      asset: entry.name.split("/").pop(),
      transferSize: entry.transferSize,    // 0 when served from cache
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      visit: previousRelease === null ? "new" : previousRelease === RELEASE ? "returning" : "returning-after-deploy",
    }));
  }
}).observe({ type: "resource", buffered: true });
