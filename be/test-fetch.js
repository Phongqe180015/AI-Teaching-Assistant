const fetch = require('node-fetch'); // wait, node 18+ has native fetch
async function test() {
  const url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit";
  let fetchUrl = url;
  const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
      fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
  }
  console.log('Fetching:', fetchUrl);
  const response = await fetch(fetchUrl);
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  const buffer = await response.arrayBuffer();
  console.log('Size:', buffer.byteLength);
}
test().catch(console.error);
