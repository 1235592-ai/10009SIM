window.API = {
    streamGemini: async function(contents, sysText, onChunk) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${Store.state.modelName}:streamGenerateContent?key=${Store.state.apiKey}&alt=sse`;
        const body = { contents, safetySettings: [ { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" } ], generationConfig: { temperature: 1.0 } };
        if(sysText) body.system_instruction = { parts: [{ text: sysText }] };
        
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if(!res.ok) { const errText = await res.text(); throw new Error(errText); }

        const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while(true) {
            const {done, value} = await reader.read(); if(done) break;
            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n'); buffer = lines.pop();
            for(const line of lines) {
                if(line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim(); if(dataStr === '[DONE]') continue;
                    try { const json = JSON.parse(dataStr); const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text || ""; if(chunk) onChunk(chunk); } catch(e) {}
                }
            }
        }
    },

    callGemini: async function(contents, sysText, options={}) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${Store.state.modelName}:generateContent?key=${Store.state.apiKey}`;
        const body = { contents, safetySettings: [ { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" } ], generationConfig: { temperature: options.temp || 1.0 } };
        if(sysText) body.system_instruction = { parts: [{ text: sysText }] };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if(!res.ok) throw new Error("API 연동 실패"); const data = await res.json();
        if(!data.candidates?.[0]) throw new Error("응답 없음");
        return data.candidates[0].content.parts[0].text;
    },

    statToDesc: function(val) { if(val >= 90) return "초인"; if(val >= 80) return "전문가"; if(val >= 70) return "우수"; if(val >= 60) return "양호"; if(val >= 40) return "보통"; if(val >= 20) return "미숙"; return "최악"; },
    repToDesc: function(val, left, right) { if(val === 0) return "중립"; const side = val < 0 ? left : right; const absVal = Math.abs(val); if(absVal <= 2) return `${side} 약간`; if(absVal <= 4) return `${side} 강함`; return `${side} 극단적`; },

    buildPrompt: function(r, scan) {
        const w = r.worldInstance; const loc = w.locations[r.currentLocIdx]; let reg = null; if(loc && loc.regionId) reg = w.regions.find(rg => rg.id === loc.regionId);
        const activeNpcs = r.activeCharIds.map(id => w.characters.find(c=>c.id===id)).filter(c=>c&&c.id!=='sys'); const myChar = w.characters.find(c=>c.id===r.myCharId) || {keyword:'플레이어', desc:''};
        
        const myStats = myChar.stats && myChar.stats.length ? myChar.stats.filter(s=>s.active!==false).map(s => `${s.n}(${this.statToDesc(s.v)})`).join(', ') : ''; 
        const myReps = myChar.reputation && myChar.reputation.length ? myChar.reputation.map(rep => `${rep.leftName||'L'}↔${rep.rightName||'R'}(${this.repToDesc(rep.value, rep.leftName||'L', rep.rightName||'R')})`).join(', ') : ''; 
        let gStatus = r.globalStatus && r.globalStatus.trim() ? `\n[🚨 절대 서사 규칙]\n${r.globalStatus.trim()}\n` : '';
        
        let myParts = []; if(myChar.desc?.trim()) myParts.push(myChar.desc.trim()); if(myStats) myParts.push(`스탯:${myStats}`); if(myReps) myParts.push(`성향:${myReps}`);
        let p = `당신은 전지적 작가 시점의 마스터. 소설체 서술.${gStatus}\n[세계관] ${w.prompt}\n[내 캐릭터] ${myChar.keyword}` + (myParts.length > 0 ? ': ' + myParts.join(' / ') : '') + '\n';
        
        if(activeNpcs.length > 0) { 
            const npcNames = activeNpcs.map(c => c.keyword).join(', '); 
            
            const npcDesc = activeNpcs.map(c => { 
                const sText = c.stats && c.stats.length ? c.stats.filter(s=>s.active!==false).map(s=>`${s.n}(${this.statToDesc(s.v)})`).join(', ') : ''; 
                let fNames = []; let fSecs = [];
                if (c.factionIds) c.factionIds.forEach(fid => { const fac = w.factions.find(f=>f.id===fid); if(fac) { if(fac.name?.trim()) fNames.push(fac.name.trim()); if(fac.secret?.trim()) fSecs.push(fac.secret.trim()); } });
                
                let namePart = `- ${c.keyword}`; 
                if(fNames.length > 0) namePart += `(소속:${fNames.join(', ')})`;
                
                let detailParts = []; 
                if(c.desc?.trim()) detailParts.push(c.desc.trim()); 
                if(c.secret?.trim()) detailParts.push('개인비밀:' + c.secret.trim()); 
                if(fSecs.length > 0) detailParts.push('세력비밀:' + fSecs.join(' / ')); 
                if(sText) detailParts.push('스탯:' + sText);
                
                return namePart + (detailParts.length > 0 ? ': ' + detailParts.join(' / ') : '');
            }).join('\n'); 
            p += `[참여 NPC] ${npcNames}\n${npcDesc}\n*위 NPC들이 주도적으로 반응하게 하세요.*\n`; 
        }
        
        if(loc) p += `\n[장소: ${reg?reg.name+' - ':''}${loc.name}]${loc.desc?.trim() ? ' (특징: '+loc.desc.trim()+')' : ''}\n`;
        let mem = r.memory || ""; const memBlocks = mem.split('[자동 요약]'); let memToSend = memBlocks[0]; if (memBlocks.length > 1) { memToSend += '[자동 요약]' + memBlocks.slice(Math.max(1, memBlocks.length - 2)).join('[자동 요약]'); } if(memToSend.trim()) p += `[상황 기억]\n${memToSend.trim()}\n`;
        const info = []; w.characters.forEach(c => { if(c.isHidden || c.id === r.myCharId || c.id === 'sys') return; if(c.triggerLocId && loc && c.triggerLocId !== loc.id) return; if(c.keyword && scan.includes(c.keyword) && !r.activeCharIds.includes(c.id)) info.push(`- ${c.keyword}: ${c.desc}`); }); w.factions.forEach(f => { if(f.name && scan.includes(f.name)) info.push(`- 세력 ${f.name}: ${f.desc}`); }); w.lores.forEach(l => { if(l.triggerLocId && loc && l.triggerLocId !== loc.id) return; if(l.keyword && scan.includes(l.keyword)) info.push(`- 지식 ${l.keyword}: ${l.desc}`); }); if(info.length) p += `\n[언급된 대기 요소]\n${info.join("\n")}\n`;
        if(scan.includes('🎲') || scan.includes('⚔️')) p += `\n*주의: 주사위 판정 결과를 바탕으로 연출하세요.*\n`;
        const isLong = document.getElementById('long-response')?.checked;
        p += `\n규칙:\n- ⚠️ 플레이어(${myChar.keyword}) 대사/행동 대리 묘사 절대 금지.\n- 지문은 자연스럽게. 대사는 "이름: 대사" (따옴표 없이).\n- 메타발언(스탯, D100 등) 절대 금지. 극적 상황으로만 묘사.\n- ${isLong ? "**1500자 이상 아주 길고 상세하게 묘사할 것.**" : "500자 내외로 서술할 것."}`; 
        let br = []; if(Store.state.safety.violence) br.push("잔혹한 폭력"); if(Store.state.safety.coercion) br.push("강제/통제"); if(Store.state.safety.sexual) br.push("성적 묘사"); if(Store.state.safety.abuse) br.push("모욕/학대"); if(Store.state.safety.selfharm) br.push("자해/자살"); if(Store.state.safety.drugs) br.push("마약/약물"); if(br.length > 0) p += `\n[금지 묘사: ${br.join(', ')}]`;
        return p;
    },

    parseAIJsonRaw: function(text) {
        try { let clean = text.replace(/```json/ig, '').replace(/```/ig, '').trim(); let s = clean.indexOf('['); let e = clean.lastIndexOf(']'); if(s !== -1 && e !== -1) return JSON.parse(clean.substring(s, e+1)); return []; } catch(e) { return []; }
    },

    generateNetwork: async function() {
        if(!Store.state.apiKey) return alert("API Key 필요!");
        if(App.isGenerating) return; const r = Store.getActiveRoom(); const w = r.worldInstance; if(!r.history.length) return;
        const net = document.getElementById('network-content'); net.innerHTML = '<div style="display:flex; align-items:center; gap:8px; color:#fbbf24; font-weight:bold;">스캔 중 <div class="typing-indicator"><span></span><span></span><span></span></div></div>';
        const ctx = r.history.slice(-4).map(m => m.variants[m.currentVariant]).join("\n");
        try {
            const p = `최근 상황을 분석해 뉴스, 키워드, 게시판, 메신저 피드만 생성하세요.\n출력 형식:\n📰 [기사]\n(내용)\n🔥 [HOT]\n(내용)\n🖥 [게시판]\n(내용)\n💬 [메신저]\n(내용)\n\n⚠️대사나 서술 절대 금지.\n\n[최근 상황]\n${ctx}`;
            const text = await this.callGemini([{role:'user',parts:[{text:p}]}], w.prompt);
            r.networkArchive = text; Store.forceSave(); UI.editNetwork(false); UI.renderNetworkArchive();
        } catch(e) { net.innerText = "스캔 실패"; }
    }
};