async function run() {
  const res = await fetch("https://framextv.xyz/assets/index-BjuW7-8D.js");
  const code = await res.text();
  
  // Search for the API documentation text in the page
  const idx = code.indexOf("API & Embed");
  if (idx !== -1) {
    console.log("SURROUNDING TEXT:", code.slice(idx - 500, idx + 2000));
  }

  // Look for any string with "/api/movies" or "/trending" or similar
  const paths = new Set();
  const reg = /["'`](\/(?:api\/)?[a-zA-Z0-9_\-\/]+)["'`]/g;
  let m;
  while ((m = reg.exec(code)) !== null) {
    const val = m[1];
    if (val.includes("trend") || val.includes("movie") || val.includes("popular") || val.includes("anime") || val.includes("search") || val.includes("detail") || val.includes("provider") || val.includes("stream")) {
      paths.add(val);
    }
  }
  console.log("PATHS:", Array.from(paths));
}
run().catch(console.error);
