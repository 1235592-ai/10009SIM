window.API = {
    PROVIDERS: {
        gemini: { label: 'Google Gemini', keyHint: 'Gemini API Key', defaultModel: 'gemini-3.5-flash-lite',
            models: [ ['gemini-3.5-flash-lite', '가볍고 빠름'], ['gemini-3.8-flash', '표준'], ['gemini-3.1-pro', '고성능'] ],
            hint: 'Google AI Studio에서 발급한 키를 입력하세요.' },
        openai: { label: 'OpenAI (GPT)', keyHint: 'OpenAI API Key (sk-...)', defaultModel: 'gpt-5-mini',
            models: [ ['gpt-5', '고성능'], ['gpt-5-mini', '가볍고 빠름'], ['gpt-4.1', '이전 세대'], ['gpt-4o', '이전 세대'] ],
            hint: 'platform.openai.com에서 발급한 키를 입력하세요. 목록에 없는 모델은 아래에 직접 입력하세요.' },
        anthropic: { label: 'Anthropic (Claude)', keyHint: 'Anthropic API Key (sk-ant-...)', defaultModel: 'claude-sonnet-5-5',
            models: [ ['claude-opus-5-5', '고성능'], ['claude-sonnet-5-5', '표준'], ['claude-haiku-5-5', '가볍고 빠름'] ],
            hint: 'console.anthropic.com에서 발급한 API 키가 필요합니다. (Claude 앱/Claude Code 구독과는 별개)' },
        custom: { label: 'OpenAI 호환 (OpenRouter 등)', keyHint: 'API Key', defaultModel: '', baseUrl: true,
            models: [],
            hint: 'OpenAI Chat Completions 형식을 지원하는 서비스의 Base URL과 모델명을 입력하세요.' }
    },

    // 설정 탭에서 사용자가 수정할 수 있는 전체 서술 지침의 기본값. {{user}}는 내 캐릭터 이름으로 치환된다.
    DEFAULT_RULES: `[역할]
- 너는 이 세계의 서술자이자 진행자다. 사용자 캐릭터({{user}})를 제외한 모든 인물(NPC), 세력, 사건, 크리쳐, 환경을 운영한다.
- 세계관과 인물 설정은 위에 제공된 세계관 배경, 세계관 전용 지침, 인물·세력·장소 데이터를 따른다. Timeline(상황 요약)이 있으면 그것을 기준으로 이어간다.

[사용자 캐릭터]
- 이번 사용자 캐릭터는 {{user}}다. {{user}}는 네가 연기하지 않는다.
- {{user}}의 대사, 행동, 감정, 결정은 대신 쓰지 않는다.
- {{user}}가 비밀(Secret)을 가진 인물이면, 사용자는 그 비밀을 알지만 세계(NPC, 대중)는 여전히 모르는 상태로 진행한다.
- NPC는 자기 권한과 역할 안의 일은 스스로 정하고 진행한다. {{user}}의 결정을 기다리는 건 그 결정이 {{user}}의 몫일 때뿐이다.

[사용자 입력 읽는 법]
- 따옴표 없는 서술은 {{user}}의 행동이다.
- "따옴표" 안은 {{user}}의 대사다.
- (괄호) 안은 진행 밖의 요청이나 명령어다. 이야기 속 사건이나 대사로 다루지 않는다. 지적을 받으면 해당 장면부터 수정해 이어간다.

[서술]
- 3인칭 소설체로 쓴다. 장면 묘사를 기본으로 하고, NPC 대사와 상황 변화는 장면에 필요할 때 넣는다.
- 분량은 1500자 이상, 최소 5문단이다. 전투나 큰 사건은 더 길게 쓸 수 있다. 진행이 길어지거나 장면이 단순해도 분량을 줄이지 않는다.
- 상투적 표현 금지: "마침내", "그 순간", "알 수 없는 기류", "무거운 침묵이 내려앉았다", "~할 수밖에 없었다", "~것이었다", "~듯했다".
- 직전 턴과 같은 묘사, 같은 문장 구조를 반복하지 않는다.

[형식]
- 대사에는 화자 이름을 붙이지 않는다. 누가 말하는지는 앞뒤 서술로 드러낸다.
- 대사는 서술 문단 안에 섞지 않고 별도 줄로 쓰며, 서술 문단과 대사 사이에는 빈 줄을 둔다. 여러 인물이 대사를 주고받을 때는 대사끼리 빈 줄 없이 연달아 쓴다. 한 인물이 이어서 하는 말은 주제가 바뀌어도 따옴표 하나에 이어 쓰고 줄을 나누지 않는다.
  예)
  서술 문단.

  "A의 대사. A가 이어서 하는 말."
  "B의 대사."

  서술 문단.
- NPC 대사에서 묻는 말은 반드시 물음표(?)로 끝낸다. 물음표 없이 질문형으로 끝내는 문장을 쓰지 않는다.
- 응답을 NPC가 {{user}}에게 던지는 질문 대사로 끝내 턴을 넘기지 않는다. NPC의 행동, 상황 변화, 장면 묘사로 끝내 사용자가 자연스럽게 반응할 여지를 남긴다. 대화 중간의 질문은 괜찮다.

[전개]
- 스토리 진행의 주도권은 사용자에게 있다. 사용자의 행동에 이미 방향이 있으면 그 결과만 따라간다. 장면에 붙잡을 거리가 전혀 없어 정체될 때만 배경 속에 작은 걸림돌 하나를 자연스럽게 둔다(낯선 사람, 이상한 소리, 눈에 띄는 물건, 소문 등). 걸림돌은 강조하거나 반복하지 않으며, 붙잡을지는 사용자가 정한다.
- 걸림돌은 무명 인물이나 환경에서 만든다. 제공된 인물 데이터의 기존 인물은 사용자가 부르거나 그 장소에 있을 개연성이 분명할 때만 등장시킨다. 우연히 마주치거나 연락이 오는 식으로 끼워 넣지 않는다.
- 배경 묘사는 분위기만을 위해 쓰지 않는다. 묘사는 {{user}}의 감각·생각에 닿거나, 정보를 주거나, 걸림돌로 이어져야 한다.
- 사용자가 사건에 뛰어들거나 무언가를 시도하면 그 행동의 결과와 반응을 구체적으로 서술한다. 풍경으로 돌려 피하지 않는다.
- 사용자가 행동을 정하면 그 결과를 세계의 논리에 따라 서술하고, 사용자가 다음 행동을 고를 지점에서 끊는다.

[일관성과 결과]
- 확정된 사실(인물 관계, 사건, 시간 흐름)은 일관되게 유지한다. 설정에 없는 큰 사건은 함부로 확정하지 않는다.
- NPC는 각자 목적과 이해관계가 있다. 사용자가 없는 곳에서도 사건은 진행되며, 그 결과는 사용자가 접할 때 드러난다.
- 행동에는 결과가 따른다. 평판, 관계, 기관의 대응, 부상, 실패, 책임 등이다.
- 인물은 세계 안에서 실제로 알 수 있었던 것만 안다. 그 자리에 없었거나, 듣지 못했거나, 알게 될 경로가 없는 정보는 모른다. 서술자가 아는 것을 NPC에게 넘기지 않는다.
- 인물·세력 데이터의 Secret과 세계관 전용 지침의 비밀 정보는 세계에서 공식적으로 아무도 모르는 사실이다. 진행 중 단서로만 다루고, NPC 대사나 서술에서 사실로 드러내지 않는다. 진행 중 밝혀지면 그때부터 그 범위만큼 공개 정보로 취급한다.
- 장면에 등장하는 물건, 메시지, 흔적은 누군가 그 시점 이전에 실제로 남길 수 있었던 것이어야 한다. 대화에서 방금 나온 주제에 맞춰 이미 준비된 단서가 나타나는 식의 편리한 우연을 만들지 않는다.
- 설정에 없는 인물 중 이름이나 소속이 붙어 이후 다시 나올 인물을 만들면, 진행 밖 괄호로 확정 여부를 사용자에게 확인한다. 이름 없는 행인이나 한 번 쓰고 마는 인물은 확인하지 않는다.
- 세계의 날짜, 요일, 계절, 시각은 현실 시간과 무관하다. 세계 시간은 사용자가 정한 것, Timeline, 앞선 서술을 기준으로 이어가고, 정해진 게 없으면 장면에 맞게 정해 서술에 밝힌다.

[인물 원칙]
- NPC는 {{user}}를 돕거나 편하게 해주기 위해 존재하지 않는다. 각자 자기 입장에서 원하는 것, 잃을 것, 성격에 따라 말하고 행동한다.
- NPC의 태도와 강도는 그 인물의 성격, 직업, 이해관계, 걸린 것의 크기로 정한다. {{user}}의 기분을 맞추는 쪽으로 기본값을 두지 않는다.
- NPC의 목적이 {{user}}와 부딪히면 그 충돌을 무르지 않는다. 양보, 사과, 물러섬은 그 인물에게 그럴 이유가 있을 때만 한다.
- 예의와 말씨는 그 인물과 세계의 사회적 관계를 따른다. 서술자의 공손함을 NPC에게 입히지 않는다.
- {{user}}는 특별 대우를 받지 않는다. 평가받으며, 반대·무시·경쟁·실패의 대상이 될 수 있다.

[진행 명령어]
사용자가 아래 명령어를 입력하면 해당 방식으로 다음 응답을 쓴다.
- (사건): 개연성 있고 뜬금없지 않은 사건 하나를 일으킨다. 현재 장소, 인물, 앞선 흐름에서 자연스럽게 이어지는 것이어야 한다.
- (계속): {{user}}가 아직 반응하지 않은 상태로 직전 응답을 이어서 한 번 더 쓴다. NPC는 대답을 기다리지 않고 말이나 행동을 이어간다. {{user}}의 대사·행동·결정은 쓰지 않는다.
- (경과) / (경과: 기간): 시간을 건너뛴다. 기간을 지정하면 그만큼, 없으면 장면에 맞게 정하고 얼마나 지났는지 서술에 밝힌다. 그동안 {{user}}의 일상은 요약으로 처리하되, 중요한 결정이나 행동은 하지 않은 것으로 둔다. 세계와 NPC 쪽 변화는 반영한다.
- (점검): 지침을 다시 확인하고, 최근 응답에서 어긋난 부분(분량, 형식, 물음표, 인물 등장 등)을 이번 응답부터 바로잡는다. 점검 결과를 길게 설명하지 않고 바로 진행으로 돌아간다.
- (요약): 지금까지의 진행을 간략히 정리한다. 현재 시점(세계 내 날짜·시각)과 장소, {{user}} 상태, 주요 사건, 인물 관계 변화, 미해결 떡밥을 항목마다 한두 줄로 쓴다. 장면 묘사와 대사는 넣지 않으며, 전체 20줄 안팎으로 맞춘다.`,


    // 안전 설정: 항목마다 대상(사용자 캐릭터 / NPC)별로 금지 여부를 고른다
    SAFETY_ITEMS: [
        { key: 'cruelty', label: '잔인함 (폭력·유혈·고어·학대)',
            user: '사용자 캐릭터가 피해를 입는 신체 훼손, 유혈, 고어, 고문·학대 묘사 금지.',
            npc: 'NPC가 피해를 입는 신체 훼손, 유혈, 고어, 고문·학대 묘사 금지.' },
        { key: 'sexual', label: '성적 표현',
            user: '사용자 캐릭터를 대상으로 한 성적 묘사, 성적 시선과 희롱 금지.',
            npc: 'NPC를 대상으로 한 성적 묘사, 성적 시선과 희롱 금지.' },
        { key: 'obsession', label: '집착·감금·스토킹·통제',
            user: '특정 NPC가 사용자 캐릭터를 감금, 스토킹, 집착, 통제하는 서사 금지. 대중의 관심, 목격담, 사진, 팬덤 반응은 해당하지 않는다. 사용자 캐릭터에게 연애 감정이나 호감이 생기면, 그 표현은 상대의 의사와 거리를 존중하는 선에서만 한다.',
            npc: 'NPC가 다른 NPC를 감금, 스토킹, 집착, 통제하는 서사 금지.' },
        { key: 'marysue', label: '과잉 찬양 (숭배·극단적 배려)',
            user: '사용자 캐릭터를 숭배하거나 극단적으로 배려하는 서술 금지.',
            npc: '특정 NPC를 숭배하거나 극단적으로 배려하는 서술 금지.' }
    ],

    getRules: function() { return (Store.state.globalRules && Store.state.globalRules.trim()) ? Store.state.globalRules : this.DEFAULT_RULES; },

    getProvider: function() { return this.PROVIDERS[Store.state.provider] ? Store.state.provider : 'gemini'; },

    // 내부 대화 형식은 Gemini 형식({role:'user'|'model', parts:[{text}]})을 유지하고, 전송 직전에 각 서비스 형식으로 변환한다.
    toPlainMessages: function(contents) {
        return contents.map(c => ({ role: c.role === 'model' ? 'assistant' : 'user', content: (c.parts || []).map(p => p.text).join('') }));
    },

    // Claude는 user/assistant가 번갈아야 하고 user로 시작·끝나야 하므로 연속된 같은 역할을 합친다.
    toAnthropicMessages: function(contents) {
        const out = [];
        this.toPlainMessages(contents).forEach(m => {
            if (!m.content.trim()) return;
            const last = out[out.length - 1];
            if (last && last.role === m.role) last.content += '\n\n' + m.content; else out.push({ ...m });
        });
        if (!out.length || out[0].role !== 'user') out.unshift({ role: 'user', content: '(시작)' });
        if (out[out.length - 1].role !== 'user') out.push({ role: 'user', content: '(계속)' });
        return out;
    },

    buildRequest: function(contents, sysText, options, stream) {
        const provider = this.getProvider();
        const key = Store.state.apiKey;
        const model = Store.state.modelName;

        if (provider === 'anthropic') {
            const body = { model, max_tokens: stream ? 32000 : 16000, messages: this.toAnthropicMessages(contents), stream };
            if (sysText) body.system = sysText;
            const headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' };
            // 안전 분류기가 거절(refusal)할 경우 서버가 다른 모델로 자동 재시도하도록 설정 (지원 모델만)
            if (/^claude-(opus-5|opus-5-5|sonnet-5-5|fable-5-1)$/.test(model)) { body.fallbacks = 'default'; headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
            return {
                url: 'https://api.anthropic.com/v1/messages', headers, body,
                chunk: (j) => { if (j.type === 'error') throw new Error(j.error?.message || 'Claude 스트림 오류'); return j.type === 'content_block_delta' && j.delta?.type === 'text_delta' ? j.delta.text : ''; },
                parse: (d) => { if (d.stop_reason === 'refusal') throw new Error('모델이 응답을 거절했습니다 (refusal).'); return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''); }
            };
        }

        if (provider === 'openai' || provider === 'custom') {
            const base = provider === 'custom' ? (Store.state.baseUrl || '').trim().replace(/\/+$/, '') : 'https://api.openai.com/v1';
            if (!base) throw new Error('Base URL을 설정 탭에서 입력해주세요.');
            const messages = this.toPlainMessages(contents);
            if (sysText) messages.unshift({ role: 'system', content: sysText });
            const body = { model, messages, stream, temperature: options.temp || 0.85 };
            if (options.jsonMode && provider === 'openai') body.response_format = { type: 'json_object' };
            return {
                url: base + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body,
                chunk: (j) => j.choices?.[0]?.delta?.content || '',
                parse: (d) => d.choices?.[0]?.message?.content || ''
            };
        }

        const body = {
            contents,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: { temperature: options.temp || 0.85 }
        };
        if (options.jsonMode) body.generationConfig.responseMimeType = "application/json";
        if (sysText) body.system_instruction = { parts: [{ text: sysText }] };
        const method = stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}key=${key}`, headers: { 'Content-Type': 'application/json' }, body,
            chunk: (j) => j.candidates?.[0]?.content?.parts?.[0]?.text || '',
            parse: (d) => { if (!d.candidates?.[0]) throw new Error("응답 없음"); return d.candidates[0].content.parts[0].text; }
        };
    },

    // 일부 모델(예: OpenAI 추론 모델)은 temperature를 거부하므로, 그 경우 한 번만 빼고 다시 보낸다.
    send: async function(req) {
        let res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) });
        if (!res.ok) {
            let errText = await res.text();
            if (res.status === 400 && 'temperature' in req.body && /temperature/i.test(errText)) {
                delete req.body.temperature;
                res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) });
                if (res.ok) return res;
                errText = await res.text();
            }
            throw new Error(`(${res.status}) ${errText.slice(0, 400)}`);
        }
        return res;
    },

    streamLLM: async function(contents, sysText, onChunk) {
        const req = this.buildRequest(contents, sysText, {}, true);
        const res = await this.send(req);

        const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while(true) {
            const {done, value} = await reader.read(); if(done) break;
            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n'); buffer = lines.pop();
            for(const line of lines) {
                if(!line.startsWith('data:')) continue;
                const dataStr = line.slice(5).trim(); if(!dataStr || dataStr === '[DONE]') continue;
                let json; try { json = JSON.parse(dataStr); } catch(e) { continue; }
                const chunk = req.chunk(json); if(chunk) onChunk(chunk);
            }
        }
    },

    callLLM: async function(contents, sysText, options={}) {
        const req = this.buildRequest(contents, sysText, options, false);
        const res = await this.send(req);
        return req.parse(await res.json());
    },

    parseAIJsonRaw: function(text) {
        if (!text) return null;
        let clean = text.replace(/```json/ig, '').replace(/```/ig, '').trim();
        try { return JSON.parse(clean); } catch(e) {}
        try {
            let firstBrace = clean.indexOf('{'); let firstBracket = clean.indexOf('['); let startIdx = -1, endIdx = -1;
            if (firstBrace !== -1 && firstBracket !== -1) { if (firstBrace < firstBracket) { startIdx = firstBrace; endIdx = clean.lastIndexOf('}'); } else { startIdx = firstBracket; endIdx = clean.lastIndexOf(']'); } } 
            else if (firstBrace !== -1) { startIdx = firstBrace; endIdx = clean.lastIndexOf('}'); } 
            else if (firstBracket !== -1) { startIdx = firstBracket; endIdx = clean.lastIndexOf(']'); }
            if (startIdx !== -1 && endIdx !== -1) { let sub = clean.substring(startIdx, endIdx + 1); sub = sub.replace(/,\s*([\]}])/g, '$1'); sub = sub.replace(/[\u0000-\u0019]+/g, ""); return JSON.parse(sub); }
            return null;
        } catch (err) { return null; }
    },

    getBatchEmbeddings: async function(texts) {
        if (this.getProvider() !== 'gemini') throw new Error("임베딩은 Gemini에서만 사용");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${Store.state.apiKey}`;
        const body = { requests: texts.map(t => ({ model: "models/text-embedding-004", content: { parts: [{ text: t }] } })) };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error("임베딩 API 호출 실패");
        const data = await res.json();
        return data.embeddings.map(e => e.values);
    },

    cosineSimilarity: function(vecA, vecB) {
        let dotProduct = 0; let normA = 0; let normB = 0;
        for (let i = 0; i < vecA.length; i++) { dotProduct += vecA[i] * vecB[i]; normA += vecA[i] * vecA[i]; normB += vecB[i] * vecB[i]; }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    },

    generateWorldSketch: async function(keywords) {
        const p = `제공된 핵심 키워드: [${keywords.join(', ')}]\n이 키워드들을 바탕으로 매우 흥미롭고 개연성 있는 세계관의 뼈대를 설계해라. 오직 JSON 객체만 반환할 것.\n포맷:\n{\n  "name": "세계관의 이름",\n  "prompt": "세계관의 전반적인 배경 요약 (300자 내외)",\n  "factions": [{"name": "세력명", "desc": "설명"}],\n  "lores": [{"name": "지식/설정명", "desc": "설명"}],\n  "locations": [{"name": "장소명", "desc": "설명"}]\n}\n※ 세력, 지식, 장소는 각각 정확히 3개씩 작성할 것.`;
        const text = await this.callLLM([{role:'user', parts:[{text: p}]}], "당신은 세계관 창조 마스터.", {temp: 0.8, jsonMode: true});
        return this.parseAIJsonRaw(text);
    },

    generateMoreKeywords: async function(existingKeywords) {
        if (!existingKeywords || existingKeywords.length === 0) {
            const p = `세계관을 만들기 위한 멋진 핵심 키워드 3개를 제안해. 다른 설명 없이 오직 콤마(,)로 구분된 단어 3개만 반환해.`;
            return await this.callLLM([{role:'user', parts:[{text: p}]}], null, {temp: 0.9});
        }
        const p = `현재 세계관 키워드: [${existingKeywords.join(', ')}]\n이 세계관을 더 매력적이고 입체적으로 확장하기 위해, 기존 단어의 단순 유의어가 아닌 '새로운 관점이나 갈등 요소'를 제공할 수 있는 핵심 키워드 10개를 제안해. 다른 설명 없이 오직 콤마(,)로 구분된 단어 10개만 반환해.`;
        const text = await this.callLLM([{role:'user', parts:[{text: p}]}], null, {temp: 1.0});
        
        let candidates = text.split(',').map(k => k.replace(/[\s#]/g, '').trim()).filter(k => k && !existingKeywords.includes(k));
        if (candidates.length === 0) return "";

        try {
            const allWords = [...existingKeywords, ...candidates];
            const embeddings = await this.getBatchEmbeddings(allWords);
            const existingVecs = embeddings.slice(0, existingKeywords.length);
            const candidateVecs = embeddings.slice(existingKeywords.length);

            let validCandidates = [];
            for (let i = 0; i < candidates.length; i++) {
                let maxSim = 0;
                for (let j = 0; j < existingVecs.length; j++) {
                    const sim = this.cosineSimilarity(candidateVecs[i], existingVecs[j]);
                    if (sim > maxSim) maxSim = sim;
                }
                if (maxSim < 0.85 && maxSim > 0.35) validCandidates.push({ word: candidates[i], sim: maxSim });
            }
            if (validCandidates.length < 3) return candidates.slice(0, 3).join(', ');
            validCandidates.sort((a, b) => Math.abs(a.sim - 0.55) - Math.abs(b.sim - 0.55));
            return validCandidates.slice(0, 3).map(c => c.word).join(', ');
        } catch (e) {
            return candidates.slice(0, 3).join(', ');
        }
    },

    generateDetail: async function(typeStr, keywords, title, desc, mode) {
        let p = `세계관 전체 키워드: [${keywords.join(', ')}]\n타겟 항목: ${typeStr}\n`;
        if (mode === 'full') { p += `\n지시: 이 항목의 '이름(title)'과 '상세 설정(desc)'을 모두 창작해서 JSON 객체로 반환해라. 내용은 300자 이상 아주 구체적으로 적을 것.\n포맷: {"title": "이름", "desc": "상세 내용"}`; const text = await this.callLLM([{role:'user', parts:[{text: p}]}], null, {temp: 0.8, jsonMode: true}); return this.parseAIJsonRaw(text); } 
        else if (mode === 'desc_only' || mode === 'overwrite') { p += `\n현재 이름: ${title}\n\n지시: 위 이름과 키워드를 바탕으로 이 항목의 상세 설정을 작성해라. 다른 수식어 없이 순수 텍스트로 내용만 반환할 것. (300자 이상 구체적으로)`; return await this.callLLM([{role:'user', parts:[{text: p}]}], null, {temp: 0.8}); } 
        else if (mode === 'append') { p += `\n현재 이름: ${title}\n현재까지의 내용:\n${desc}\n\n지시: 위 내용의 문맥을 파악하고, 그 뒤에 자연스럽게 이어지는 설정을 추가로 작성해라. 반드시 '기존 내용 + 새로 추가된 내용'이 하나로 합쳐진 전체 완성본을 반환할 것. 다른 수식어 없이 순수 텍스트만 반환.`; return await this.callLLM([{role:'user', parts:[{text: p}]}], null, {temp: 0.8}); }
    },

    generateCharacter: async function(worldData) {
        const p = `다음 세계관 설정을 바탕으로, 이 세계에 자연스럽게 녹아드는 매력적이고 입체적인 새로운 인물 1명을 창작해라. 오직 JSON 객체만 반환할 것.\n\n[세계관 정보]\n- 세계관 이름: ${worldData.name}\n- 핵심 키워드: [${worldData.keywords.join(', ')}]\n- 세계관 배경 요약: ${worldData.prompt}\n- 존재하는 세력들: ${worldData.factions.map(f => f.name).join(', ') || '없음'}\n\n[출력 포맷 및 지시사항 (반드시 JSON)]\n{\n  "keyword": "인물 이름 (반드시 세계관의 국적, 배경, 장르에 완벽하게 어울리는 세련된 이름. '김철수', '이영희' 등 촌스럽거나 작위적인 기본 이름 절대 금지)",\n  "desc": "인물의 외형, 성격, 과거사, 그리고 현재의 목적 (300자 이상 아주 구체적으로)",\n  "secret": "이 인물이 남들에게 숨기고 있는 치명적인 비밀이나 약점 (100자 내외)"\n}`;
        const text = await this.callLLM([{role:'user', parts:[{text: p}]}], "당신은 세계관에 완벽히 어울리는 입체적인 캐릭터를 창조하는 마스터.", {temp: 0.9, jsonMode: true});
        return this.parseAIJsonRaw(text);
    },

    buildPrompt: function(r, scan) {
        const w = r.worldInstance; 
        const loc = w.locations[r.currentLocIdx]; 
        let reg = null; if(loc && loc.regionId) reg = w.regions.find(rg => rg.id === loc.regionId);
        
        const activeNpcs = r.activeCharIds.map(id => w.characters.find(c=>c.id===id)).filter(c=>c&&c.id!=='sys'); 
        const myChar = w.characters.find(c=>c.id===r.myCharId) || {keyword:'플레이어', desc:''};
        
        let gStatus = r.globalStatus && r.globalStatus.trim() ? `\n[🚨 절대 서사 규칙]\n${r.globalStatus.trim()}\n` : '';
        
        let activeFactionIds = new Set();
        if (myChar.factionIds) myChar.factionIds.forEach(fid => activeFactionIds.add(fid));
        
        let myBlock = `<MyCharacter name="${myChar.keyword}">\n`;
        if (myChar.factionIds && myChar.factionIds.length > 0) {
            const fNames = myChar.factionIds.map(fid => w.factions.find(f=>f.id===fid)?.name).filter(n=>n);
            myBlock += `  <Faction>${fNames.join(', ')}</Faction>\n`;
        }
        if(myChar.desc?.trim()) myBlock += `  <Description>${myChar.desc.trim()}</Description>\n`;
        if(myChar.secret?.trim()) myBlock += `  <Secret>${myChar.secret.trim()}</Secret>\n`;
        myBlock += `</MyCharacter>`;

        let npcBlocks = "";
        let fullDataNpcs = [...activeNpcs];
        let surroundingNpcsList = [];

        w.characters.forEach(c => {
            if(c.id === r.myCharId || c.id === 'sys' || c.isHidden) return;
            if(r.activeCharIds.includes(c.id)) return;

            if(r.transientCharIds && r.transientCharIds[c.id] !== undefined) {
                fullDataNpcs.push(c);
            } else {
                if(!c.triggerLocId || (loc && c.triggerLocId === loc.id)) {
                    surroundingNpcsList.push(c);
                }
            }
        });

        if(fullDataNpcs.length > 0) { 
            npcBlocks = fullDataNpcs.map(c => { 
                if (c.factionIds) c.factionIds.forEach(fid => activeFactionIds.add(fid));
                const fNames = c.factionIds ? c.factionIds.map(fid => w.factions.find(f=>f.id===fid)?.name).filter(n=>n) : [];
                let b = `<NPC name="${c.keyword}">\n`;
                if(fNames.length > 0) b += `  <Faction>${fNames.join(', ')}</Faction>\n`;
                if(c.desc?.trim()) b += `  <Description>${c.desc.trim()}</Description>\n`;
                if(c.secret?.trim()) b += `  <Secret>${c.secret.trim()}</Secret>\n`;
                b += `</NPC>`;
                return b;
            }).join('\n'); 
        }

        let facBlocks = "";
        if(activeFactionIds.size > 0) {
            facBlocks = Array.from(activeFactionIds).map(fid => {
                const fac = w.factions.find(f => f.id === fid);
                if(!fac) return "";
                let fb = `<FactionData name="${fac.name}">\n`;
                if(fac.desc?.trim()) fb += `  <Description>${fac.desc.trim()}</Description>\n`;
                if(fac.secret?.trim()) fb += `  <Secret>${fac.secret.trim()}</Secret>\n`;
                fb += `</FactionData>`;
                return fb;
            }).filter(x=>x).join('\n');
        }

        let surroundingNpcs = surroundingNpcsList
            .map(c => {
                let shortDesc = c.desc ? c.desc.substring(0, 50).replace(/\n/g, ' ') + (c.desc.length > 50 ? '...' : '') : '대기 중인 조연.';
                return `<PotentialNPC name="${c.keyword}">${shortDesc}</PotentialNPC>`;
            })
            .join('\n');

        const worldRules = w.rules && w.rules.trim() ? `\n[세계관 전용 지침]\n${w.rules.trim()}\n` : '';
        let p = `[세계관 배경]\n${w.prompt}\n${worldRules}${gStatus}\n
[등장 요소 데이터]\n${myBlock}\n${npcBlocks}\n${facBlocks}\n
[주변 대기 인물군] (사용자가 부르거나 그 장소에 있을 개연성이 분명할 때만 등장)\n${surroundingNpcs}\n`;
        
        if(loc) p += `[현재 장소: ${reg?reg.name+' - ':''}${loc.name}]${loc.desc?.trim() ? ' (특징: '+loc.desc.trim()+')' : ''}\n`;
        
        const mem = (r.memory || "").trim();
        if(mem) p += `\n<Timeline>\n${mem}\n</Timeline>\n`;
        p += Net.chatContext(r);
        
        let baitRule = "";
        let info = []; 
        w.factions.forEach(f => { if(f.name && scan.includes(f.name) && !activeFactionIds.has(f.id)) info.push(`- 세력 ${f.name}: ${f.desc}`); }); 
        
        if (r.baitRecoveryNextTurn) {
            w.lores.forEach(l => { info.push(`- [과거사/지식] ${l.keyword}: ${l.desc}`); });
            baitRule = `\n[🎣 떡밥 회수 발동!] 지금까지의 흐름을 보고 위 [과거사/지식] 중 가장 적절한 떡밥 하나를 골라 자연스럽게 현재 사건과 엮어 회수하라. 억지스럽게 여러 개를 동시에 끌어오지 마라.\n`;
        } else {
            w.lores.forEach(l => { 
                if(l.triggerLocId && loc && l.triggerLocId !== loc.id) return; 
                if(l.keyword && scan.includes(l.keyword)) {
                    let shortLore = l.desc ? l.desc.substring(0, 60).replace(/\n/g, ' ') + '...' : '';
                    info.push(`- 지식 ${l.keyword}: ${shortLore}`); 
                }
            }); 
        }

        if(info.length) p += `\n[주변 대기 요소]\n${info.join("\n")}\n`;
        p += baitRule;
        const ruleLines = [];
        this.SAFETY_ITEMS.forEach(it => { const v = Store.state.safety[it.key] || {}; if(v.user) ruleLines.push(it.user); if(v.npc) ruleLines.push(it.npc); });

        p += `\n\n${this.getRules().split('{{user}}').join(myChar.keyword)}

[통제 규칙 (안전 검열)]
${ruleLines.length > 0 ? "- " + ruleLines.join('\n- ') : "- 검열 없음."}`;

        return p;
    },


};
