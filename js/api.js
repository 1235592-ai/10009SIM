window.API = {
    PROVIDERS: {
        gemini: { label: 'Google Gemini', keyHint: 'Gemini API Key', defaultModel: 'gemini-3.1-flash-lite-preview',
            models: [ ['gemini-3.1-flash-lite-preview', '가볍고 빠름'], ['gemini-3.1-flash', '표준'], ['gemini-3.1-pro', '고성능'] ],
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
    DEFAULT_RULES: `[서술 원칙]
- 시점: 3인칭 관찰자 시점을 유지한다. 플레이어는 이름({{user}})으로만 지칭하고, '나', '너', '당신'을 서술의 주어로 쓰지 않는다.
- 대리 서술 금지: {{user}}의 행동, 대사, 감정, 생각은 플레이어가 입력한 범위를 넘어 지어내지 않는다. NPC의 반응과 환경 변화만 서술한다.
- 인과: 결과는 상황, 스탯, 이전 선택에서 논리적으로 도출한다. 근거 없는 행운이나 위기를 만들지 않는다.
- 완급: 사소한 행동에는 짧고 가볍게 반응한다. 일상적인 행동에 거대 서사, 과거사, 복선을 억지로 엮지 않는다.
- NPC: 각자의 소속(Faction), 비밀(Secret), 이해관계에 따라 움직인다. 플레이어를 맹목적으로 돕거나 띄워주지 않으며, 의도는 대사 이면에 숨긴다.
- 설정 준수: 제공된 세계관, 인물, 장소, Timeline 정보와 모순되는 내용을 만들지 않는다. 주어지지 않은 중요한 사실은 함부로 확정하지 말고 여지를 남긴다.

[문체]
- 상투적 표현 금지: "마침내", "그 순간", "알 수 없는 기류", "무거운 침묵이 내려앉았다", "~할 수밖에 없었다", "~것이었다", "~듯했다".
- 직전 턴과 같은 묘사, 같은 문장 구조를 반복하지 않는다.
- 턴의 마지막을 플레이어에게 묻는 질문(예: "어떻게 할 것인가?")이나 선택지 나열로 끝내지 않는다. 상황 묘사나 NPC 대사로 자연스럽게 끝낸다.

[출력 형식]
- 대사는 한 줄에 하나씩 **캐릭터명**: "대사" 형식으로 쓴다. 화자 표기 없이 따옴표만 쓴 대사는 금지한다.
- 예시: **경비병**: "거기 서."
- 해설, 작가 코멘트, 시스템 안내 같은 이야기 밖의 발언은 출력하지 않는다.`,

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
        const p = `다음 세계관 설정을 바탕으로, 이 세계에 자연스럽게 녹아드는 매력적이고 입체적인 새로운 인물 1명을 창작해라. 오직 JSON 객체만 반환할 것.\n\n[세계관 정보]\n- 세계관 이름: ${worldData.name}\n- 핵심 키워드: [${worldData.keywords.join(', ')}]\n- 세계관 배경 요약: ${worldData.prompt}\n- 존재하는 세력들: ${worldData.factions.map(f => f.name).join(', ') || '없음'}\n\n[출력 포맷 및 지시사항 (반드시 JSON)]\n{\n  "keyword": "인물 이름 (반드시 세계관의 국적, 배경, 장르에 완벽하게 어울리는 세련된 이름. '김철수', '이영희' 등 촌스럽거나 작위적인 기본 이름 절대 금지)",\n  "desc": "인물의 외형, 성격, 과거사, 그리고 현재의 목적 (300자 이상 아주 구체적으로)",\n  "secret": "이 인물이 남들에게 숨기고 있는 치명적인 비밀이나 약점 (100자 내외)",\n  "stats": [\n    {"n": "주요 스탯1 (세계관에 어울리는 능력치명, 예: 무력, 지력, 해킹 등)", "v": 10~100 사이 숫자},\n    {"n": "주요 스탯2", "v": 10~100 사이 숫자},\n    {"n": "주요 스탯3", "v": 10~100 사이 숫자}\n  ]\n}\n※ 스탯은 반드시 세계관 분위기에 맞는 이름으로 3개 생성할 것.`;
        const text = await this.callLLM([{role:'user', parts:[{text: p}]}], "당신은 세계관에 완벽히 어울리는 입체적인 캐릭터를 창조하는 마스터.", {temp: 0.9, jsonMode: true});
        return this.parseAIJsonRaw(text);
    },

    statToDesc: function(val) { if(val >= 90) return "초인"; if(val >= 80) return "전문가"; if(val >= 70) return "우수"; if(val >= 60) return "양호"; if(val >= 40) return "보통"; if(val >= 20) return "미숙"; return "최악"; },
    repToDesc: function(val, left, right) { if(val === 0) return "중립"; const side = val < 0 ? left : right; const absVal = Math.abs(val); if(absVal <= 2) return `${side} 약간`; if(absVal <= 4) return `${side} 강함`; return `${side} 극단적`; },

    buildPrompt: function(r, scan) {
        const w = r.worldInstance; 
        const loc = w.locations[r.currentLocIdx]; 
        let reg = null; if(loc && loc.regionId) reg = w.regions.find(rg => rg.id === loc.regionId);
        
        const activeNpcs = r.activeCharIds.map(id => w.characters.find(c=>c.id===id)).filter(c=>c&&c.id!=='sys'); 
        const myChar = w.characters.find(c=>c.id===r.myCharId) || {keyword:'플레이어', desc:''};
        
        const myStats = myChar.stats && myChar.stats.length ? myChar.stats.filter(s=>s.active!==false).map(s => `${s.n}(${this.statToDesc(s.v)})`).join(', ') : ''; 
        const myReps = myChar.reputation && myChar.reputation.length ? myChar.reputation.map(rep => `${rep.leftName||'L'}↔${rep.rightName||'R'}(${this.repToDesc(rep.value, rep.leftName||'L', rep.rightName||'R')})`).join(', ') : ''; 
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
        if(myStats) myBlock += `  <Stats>${myStats}</Stats>\n`;
        if(myReps) myBlock += `  <Reputation>${myReps}</Reputation>\n`;
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
                const sText = c.stats && c.stats.length ? c.stats.filter(s=>s.active!==false).map(s=>`${s.n}(${this.statToDesc(s.v)})`).join(', ') : ''; 
                const fNames = c.factionIds ? c.factionIds.map(fid => w.factions.find(f=>f.id===fid)?.name).filter(n=>n) : [];
                let b = `<NPC name="${c.keyword}">\n`;
                if(fNames.length > 0) b += `  <Faction>${fNames.join(', ')}</Faction>\n`;
                if(c.desc?.trim()) b += `  <Description>${c.desc.trim()}</Description>\n`;
                if(c.secret?.trim()) b += `  <Secret>${c.secret.trim()}</Secret>\n`;
                if(sText) b += `  <Stats>${sText}</Stats>\n`;
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

        let p = `[세계관 배경]\n${w.prompt}\n${gStatus}\n
[등장 요소 데이터]\n${myBlock}\n${npcBlocks}\n${facBlocks}\n
[주변 대기 인물군] (조건부 난입 가능)\n${surroundingNpcs}\n`;
        
        if(loc) p += `[현재 장소: ${reg?reg.name+' - ':''}${loc.name}]${loc.desc?.trim() ? ' (특징: '+loc.desc.trim()+')' : ''}\n`;
        
        let mem = r.memory || ""; 
        const memBlocks = mem.split('[자동 요약]'); 
        let memToSend = memBlocks[0]; 
        if (memBlocks.length > 1) { memToSend += '[자동 요약]' + memBlocks.slice(Math.max(1, memBlocks.length - 2)).join('[자동 요약]'); } 
        if(memToSend.trim()) p += `\n<Timeline>\n${memToSend.trim()}\n</Timeline>\n`;
        
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
        if(scan.includes('🎲') || scan.includes('⚔️')) p += `\n*주의: 주사위 판정 결과를 바탕으로 연출하세요.*\n`;
        
        const tone = r.tone || 'normal';
        let toneRule = "";
        let dramaticRule = ""; 

        if(tone === 'light') {
            toneRule = "건조한 관찰자. 과장과 형용사 사용을 최소화하고, 눈에 보이는 행동과 사실만 담담하게 서술하라.";
            dramaticRule = "- 가벼운 전개: 캐릭터 간의 소소한 대화와 반응에 집중하라.";
        }
        else if(tone === 'heavy') {
            toneRule = "몰입감 있는 소설가. 허세나 무의미한 수식어를 배제하되, 인물이 처한 물리적/심리적 위기감과 장르적 분위기를 밀도 있게 묘사하라. 단, 소설체 특유의 과대해석 금지.";
            dramaticRule = `- 철저한 인과율: 플레이어의 안일한 선택이나 낮은 스탯은 치명적인 결과(부상, 소외)로 직결되게 서술하라.\n- 파워 밸런스 절대화: 캐릭터 간의 스탯 격차를 환경 묘사와 연출로 압도적으로 증명하라 (Show, Don't Tell).`;
        }
        else {
            toneRule = "절제된 소설가. 상황의 무게에 비례하여 서술하라. 가벼운 일은 가볍게, 무거운 일은 무겁게 완급을 조절하라.";
        }

        const isLong = document.getElementById('long-response')?.checked;
        const lengthRule = isLong ? "1500자 이상 아주 길고 구체적으로 서술할 것." : "500자 내외로 밀도 있게 서술할 것.";

        let ruleLines = [];
        if(Store.state.safety.violence) ruleLines.push("신체 훼손 및 유혈 묘사 금지.");
        if(Store.state.safety.discrimination) ruleLines.push("혐오 멸칭 및 차별적 표현 절대 금지.");
        if(Store.state.safety.sexual) ruleLines.push("성적 묘사 및 원치 않는 스킨십 금지.");
        if(Store.state.safety.abuse) ruleLines.push("가학적 고문 및 학대 묘사 즉시 중단.");
        if(Store.state.safety.selfharm) ruleLines.push("자해 및 극단적 선택 언급 금지.");
        if(Store.state.safety.drugs) ruleLines.push("불법 약물 및 만취 상태 묘사 불가.");
        if(Store.state.safety.marysue) ruleLines.push("주인공 띄워주기 금지. NPC는 실력으로 증명하기 전까지 플레이어를 무시할 것.");
        if(Store.state.safety.obsession) ruleLines.push("감금, 스토킹 등 범죄적 집착 묘사 불가.");
        if(Store.state.safety.gore) ruleLines.push("고어 및 기괴한 묘사 금지.");
        if(Store.state.safety.romance) ruleLines.push("NPC는 주인공에게 성애적 감정을 느끼지 않으며 철저히 비즈니스 파트너로 대할 것.");

        p += `\n\n[✍️ 이번 턴 설정]
- 서술 톤: ${toneRule}
- 분량: ${lengthRule}
${dramaticRule}

${this.getRules().split('{{user}}').join(myChar.keyword)}

[통제 규칙 (안전 검열)]
${ruleLines.length > 0 ? "- " + ruleLines.join('\n- ') : "- 검열 없음."}`;

        return p;
    },

    generateNetwork: async function() {
        if(!Store.state.apiKey) return alert("API Key 필요!");
        if(App.isGenerating) return; 
        const r = Store.getActiveRoom(); const w = r.worldInstance; if(!r.history.length) return;
        const net = document.getElementById('network-content'); const presetType = document.getElementById('network-preset-sel').value || 'modern';
        net.innerHTML = '<div style="display:flex; align-items:center; gap:8px; color:#fbbf24; font-weight:bold;">세계 반응 스캔 중 <div class="typing-indicator"><span></span><span></span><span></span></div></div>';
        const ctx = r.history.slice(-4).map(m => m.variants[m.currentVariant]).join("\n");
        const presets = { modern: { name: "현대/현판", tags: ["📰 [공식 보도]", "🔴 [현장 라이브]", "💻 [커뮤니티]", "🔒 [프라이빗 채널]"] }, medieval: { name: "중세/로판", tags: ["📜 [황실 공고]", "👗 [연회장 실황]", "🍰 [사교계 가십]", "✉️ [비밀 서신]"] }, apocalypse: { name: "아포칼립스", tags: ["📻 [수신 신호]", "👣 [현장 흔적]", "🚨 [생존자 기록]", "🧠 [내면의 환청]"] }, wuxia: { name: "시대극/무협", tags: ["📜 [공식 방문]", "🗨 [목격자 진술]", "🍵 [객잔의 소문]", "🕊️ [비선 통신]"] }, adventure: { name: "던전/모험", tags: ["📜 [길드 의뢰]", "🔦 [탐색 기록]", "🍺 [주점 수다]", "🏛 [미궁의 비밀]"] } };
        let active = presetType === 'custom' ? { name: document.getElementById('custom-net-name').value.trim() || "자유 지정 세계관", tags: (document.getElementById('custom-net-tags').value.trim() || "[공식],[현장],[수다],[기밀]").split(",").map(t => t.trim()) } : presets[presetType];

        try {
            const p = `당신은 이야기 밖의 '시스템 관측기'입니다. 당신의 역할은 메인 서사와 분리된 세계의 반응을 지정된 포맷으로만 출력하는 것입니다. 절대로 사담, 인사말, 부연 설명을 하지 마십시오.\n\n[출력 포맷 및 규칙]\n아래 4가지 태그를 순서대로 사용하여 각각 하나의 문단으로 작성하십시오.\n1. ${active.tags[0]}: 가장 공식적이고 건조한 사실(팩트) 전달.\n2. ${active.tags[1]}: 지금 막 터진 현장의 역동적인 상황. 본문 서술 후, 줄을 바꾼 뒤 구경꾼/관련자의 짧은 현장 반응(댓글)을 'ㄴ ' 형식으로 2개 작성.\n3. ${active.tags[2]}: 사람들 사이의 수다, 의혹, 과거 발굴. 본문 서술 후, 줄을 바꾼 뒤 대중의 반응(댓글)을 'ㄴ ' 형식으로 2개 작성.\n4. ${active.tags[3]}: 아무도 모르는 이면의 이야기, 기밀, 비밀 연락, 은밀한 지시 또는 속마음.\n\n- 세계관/분위기: '${active.name}' 장르에 완벽히 동기화할 것.\n- 태그의 글자는 단 1글자도 변경하지 말고 그대로 출력할 것.\n\n[최근 상황]\n${ctx}`;
            const text = await this.callLLM([{role:'user',parts:[{text:p}]}], w.prompt);
            r.networkArchive = text.trim(); Store.forceSave(); UI.editNetwork(false); UI.renderNetworkArchive();
        } catch(e) { net.innerText = "스캔 실패: " + e.message; }
    }
};
