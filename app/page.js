import Script from "next/script";

export default function Page() {
  return (
    <>
      <div id="app">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px" }}>
          <p style={{ color: "#8B93AD", fontFamily: "sans-serif" }}>Loading FoxMountain.rbx…</p>
        </div>
      </div>
      {/* All interactive logic lives in one plain script, loaded after the
          page is interactive — see public/app.js. It talks to /api/state
          instead of Claude's artifact capability. */}
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
