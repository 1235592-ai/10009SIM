// 백그라운드 일꾼(서비스 워커).
// 앱 파일은 저장하지 않는다. 하는 일은 하나: 채팅 AI 요청을 페이지 대신 보내고 받아 두는 것.
// 페이지는 다른 앱으로 넘어가면 멈추지만 일꾼은 조금 더 버티므로, 돌아왔을 때 응답을 이어받을 수 있다.
const JOB_CACHE = '10009sim-llm-jobs';
const jobs = new Map();   // id -> { raw, done, error, abort }
const jobUrl = (id) => self.registration.scope + '__llm-job/' + id;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 예전 버전이 저장해 둔 앱 파일 캐시를 지운다
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== JOB_CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function runJob(m, clientId) {
  const job = { raw: '', done: false, error: null, abort: new AbortController() };
  jobs.set(m.id, job);
  const post = async (msg) => { try { const c = await self.clients.get(clientId); if (c) c.postMessage(msg); } catch (e) {} };
  try {
    const res = await fetch(m.url, { method: 'POST', headers: m.headers, body: m.body, signal: job.abort.signal });
    if (!res.ok) {
      job.error = { status: res.status, body: (await res.text()).slice(0, 2000) };
    } else {
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        const text = decoder.decode(value, { stream: true }); if (!text) continue;
        const offset = job.raw.length; job.raw += text;
        await post({ type: 'llm-chunk', id: m.id, offset, text });
      }
    }
  } catch (err) {
    job.error = { status: 0, body: String((err && err.message) || err) };
  }
  job.done = true;
  // 일꾼이 꺼졌다 켜져도 끝난 결과는 남도록 저장해 둔다 (페이지가 가져가면 지운다)
  try {
    const cache = await caches.open(JOB_CACHE);
    await cache.put(jobUrl(m.id), new Response(JSON.stringify({ raw: job.raw, error: job.error }), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {}
  await post({ type: 'llm-done', id: m.id, error: job.error, length: job.raw.length });
}

async function jobState(id) {
  const job = jobs.get(id);
  if (job) return { type: 'llm-state', id, raw: job.raw, done: job.done, error: job.error };
  try {
    const hit = await (await caches.open(JOB_CACHE)).match(jobUrl(id));
    if (hit) { const d = await hit.json(); return { type: 'llm-state', id, raw: d.raw, done: true, error: d.error }; }
  } catch (e) {}
  return { type: 'llm-state', id, unknown: true };
}

self.addEventListener('message', (event) => {
  const m = event.data || {}; const src = event.source;
  if (m.type === 'llm-start') {
    src.postMessage({ type: 'llm-ack', id: m.id });
    event.waitUntil(runJob(m, src.id));   // 요청이 끝날 때까지 일꾼이 꺼지지 않게 붙잡아 둔다
  } else if (m.type === 'llm-get') {
    event.waitUntil(jobState(m.id).then(state => src.postMessage(state)));
  } else if (m.type === 'llm-clear') {
    const job = jobs.get(m.id); if (job && !job.done) job.abort.abort();
    jobs.delete(m.id);
    event.waitUntil(caches.open(JOB_CACHE).then(c => c.delete(jobUrl(m.id))).catch(() => {}));
  }
});
