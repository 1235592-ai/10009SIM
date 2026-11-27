// 시스템 보드의 스테이터스.
// 틀(제목, 설명, 항목과 만점)은 세계관에 저장하고(w.statusDefs), AI가 채운 값은 시나리오에 캐릭터별로 저장한다(r.status).
window.Status = {
    busy: false,
    defId: null,
    charId: null,
    editing: false,

    uid: function(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },
    defs: function(w) { if(!w.statusDefs) w.statusDefs = []; return w.statusDefs; },

    // ---------- 틀 편집 (세계관 편집 화면) ----------
    renderDefs: function(w) {
        const list = document.getElementById('status-defs-list'); if(!list) return;
        const inRoom = !!Store.state.activeRoomId;
        const btn = document.getElementById('btn-status-from-template'); if(btn) btn.style.display = inRoom ? 'block' : 'none';
        list.innerHTML = this.defs(w).map(d => `
            <details class="item-card" id="det-st-${d.id}" ontoggle="if(this.open) this.querySelectorAll('textarea').forEach(el=>UI.autoResize(el))">
                <summary>${IC('table')} ${UI.esc(d.title) || '새 스테이터스'}</summary>
                <div style="margin-top:10px;">
                    <input type="text" class="input-std" id="st-t-${d.id}" value="${UI.esc(d.title)}" placeholder="제목 (예: 호감도, 부상 상태)">
                    <textarea class="area-std auto-resize" id="st-g-${d.id}" placeholder="설명: 무엇에 관한 스테이터스인지, AI가 수치를 매길 때 따를 기준" oninput="UI.autoResize(this);">${UI.esc(d.guide)}</textarea>
                    <div class="field-label">항목 <span>(이름 / 만점)</span></div>
                    ${d.items.map(it => `
                        <div class="status-item-row">
                            <input type="text" class="input-std" id="sti-n-${it.id}" value="${UI.esc(it.name)}" placeholder="항목 이름">
                            <input type="number" class="input-std" id="sti-m-${it.id}" value="${Number(it.max) || 100}" min="1" title="만점">
                            <button class="mini-btn" title="항목 삭제" onclick="Status.delItem('${d.id}', '${it.id}')">${IC('trash-2')}</button>
                        </div>`).join('')}
                    <button class="btn-ghost" style="padding:6px;" onclick="Status.addItem('${d.id}')">+ 항목 추가</button>
                    <button class="btn-danger" onclick="Status.delDef('${d.id}')">이 스테이터스 삭제</button>
                </div>
            </details>`).join('') || '<p class="hint">스테이터스 틀이 없습니다.</p>';
    },
    syncDefsDOM: function(w) {
        this.defs(w).forEach(d => {
            d.title = document.getElementById(`st-t-${d.id}`)?.value ?? d.title;
            d.guide = document.getElementById(`st-g-${d.id}`)?.value ?? d.guide;
            d.items.forEach(it => {
                it.name = document.getElementById(`sti-n-${it.id}`)?.value ?? it.name;
                const m = document.getElementById(`sti-m-${it.id}`); if(m) it.max = Math.max(1, Number(m.value) || 100);
            });
        });
    },
    change: function(fn) { const w = Store.getTargetWorld(); Store.syncOpenPanels(); fn(this.defs(w)); Store.forceSave(); UI.refreshOpenPanel(); },
    addDef: function() { const d = { id: this.uid('st'), title: '', guide: '', items: [{ id: this.uid('si'), name: '', max: 100 }] }; this.change(defs => defs.push(d)); UI.openDetails([`det-st-${d.id}`]); },
    delDef: function(id) { if(!confirm("이 스테이터스 틀을 삭제하시겠습니까?")) return; this.change(defs => { const i = defs.findIndex(d => d.id === id); if(i >= 0) defs.splice(i, 1); }); },
    addItem: function(defId) { this.change(defs => defs.find(d => d.id === defId)?.items.push({ id: this.uid('si'), name: '', max: 100 })); },
    delItem: function(defId, itemId) { this.change(defs => { const d = defs.find(x => x.id === defId); if(d) d.items = d.items.filter(it => it.id !== itemId); }); },

    // ---------- 시스템 보드 ----------
    store: function(r) { if(!r.status) r.status = {}; return r.status; },
    entry: function(r, defId, charId) { const s = this.store(r); if(!s[defId]) s[defId] = {}; if(!s[defId][charId]) s[defId][charId] = { rows: {} }; return s[defId][charId]; },
    current: function(r) {
        const w = r.worldInstance; const defs = this.defs(w);
        const chars = w.characters.filter(c => c.id !== 'sys' && c.keyword);
        if(!defs.some(d => d.id === this.defId)) this.defId = defs[0]?.id || null;
        if(!chars.some(c => c.id === this.charId)) this.charId = (chars.find(c => c.id === r.myCharId) || chars[0])?.id || null;
        return { defs, chars, def: defs.find(d => d.id === this.defId), char: chars.find(c => c.id === this.charId) };
    },
    select: function(key, val) { if(key !== 'editing') this.editing = false; this[key] = val; this.render(); },

    render: function() {
        const view = document.getElementById('status-view'); if(!view) return;
        const r = Store.getActiveRoom(); if(!r) return;
        const { defs, chars, def, char } = this.current(r);
        if(!defs.length) { view.innerHTML = '<p class="hint">스테이터스 틀이 없습니다. 위쪽 지도 아이콘(세계관) → "스테이터스 틀"에서 만들 수 있습니다.</p>'; return; }
        if(!chars.length) { view.innerHTML = '<p class="hint">대상으로 고를 인물이 없습니다.</p>'; return; }
        const dis = this.busy ? 'disabled' : '';
        const entry = this.entry(r, def.id, char.id);
        const rowsHtml = def.items.map(it => {
            const row = entry.rows[it.id] || {};
            const has = row.value !== undefined && row.value !== null;
            const delta = has && row.prev !== undefined && row.prev !== null ? row.value - row.prev : 0;
            const deltaHtml = delta ? `<span class="status-delta ${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '▲' : '▼'}${Math.abs(delta)}</span>` : '';
            if(this.editing) return `<tr><th>${UI.esc(it.name)}</th><td class="num"><input type="number" class="input-std" id="stv-${it.id}" value="${has ? row.value : ''}" min="0" max="${it.max}"> / ${it.max}</td><td><textarea class="area-std" id="stn-${it.id}">${UI.esc(row.note || '')}</textarea></td></tr>`;
            return `<tr><th>${UI.esc(it.name)}</th><td class="num">${has ? row.value : '-'} / ${it.max} ${deltaHtml}</td><td>${UI.esc(row.note || '')}</td></tr>`;
        }).join('');
        view.innerHTML = `
            <div class="status-pick">
                <select class="select-std" onchange="Status.select('defId', this.value)">${defs.map(d => `<option value="${d.id}" ${d.id === def.id ? 'selected' : ''}>${UI.esc(d.title) || '새 스테이터스'}</option>`).join('')}</select>
                <select class="select-std" onchange="Status.select('charId', this.value)">${chars.map(c => `<option value="${c.id}" ${c.id === char.id ? 'selected' : ''}>${UI.esc(c.keyword)}</option>`).join('')}</select>
            </div>
            ${this.busy ? '<div class="typing-indicator" style="margin:8px 0;"><span></span><span></span><span></span></div>' : ''}
            <div class="md-table-wrap"><table class="md-table status-table"><thead><tr><th>항목</th><th>수치</th><th>비고</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
            <div class="status-actions">
                ${this.editing
                    ? `<button class="btn-play" onclick="Status.saveEdit()">저장</button><button class="btn-ghost" onclick="Status.select('editing', false)">취소</button>`
                    : `<button class="btn-play" ${dis} onclick="Status.refresh()">${IC('refresh-cw')} 갱신</button><button class="btn-ghost" ${dis} onclick="Status.select('editing', true)">${IC('pencil')} 수정</button><button class="btn-ghost" ${dis} onclick="Status.share()">채팅에 공유</button>`}
            </div>`;
    },

    saveEdit: function() {
        const r = Store.getActiveRoom(); const { def, char } = this.current(r); const entry = this.entry(r, def.id, char.id);
        def.items.forEach(it => {
            const v = document.getElementById(`stv-${it.id}`).value; const note = document.getElementById(`stn-${it.id}`).value.trim();
            const value = v === '' ? null : Math.max(0, Math.min(it.max, Math.round(Number(v) || 0)));
            entry.rows[it.id] = { value, note, prev: value };   // 손으로 고친 값에는 변화 표시를 붙이지 않는다
        });
        this.editing = false; Store.forceSave(); this.render(); UI.showToast("스테이터스를 저장했습니다.");
    },

    refresh: async function() {
        if(this.busy) return;
        if(!Store.state.apiKey) return alert("설정 탭에서 API Key를 먼저 입력해주세요!");
        const r = Store.getActiveRoom(); const w = r.worldInstance; const { def, char } = this.current(r);
        const items = def.items.filter(it => it.name && it.name.trim());
        if(!items.length) return alert("이 스테이터스에 항목이 없습니다.");
        const entry = this.entry(r, def.id, char.id);
        const facs = (char.factionIds || []).map(fid => w.factions.find(f => f.id === fid)?.name).filter(n => n).join(', ');
        const recent = r.history.slice(-12).filter(m => !m.hidden).map(m => `${m.role === 'user' ? '[사용자]' : '[서술]'} ${m.variants[m.currentVariant]}`).join('\n\n');
        const prev = items.map(it => { const row = entry.rows[it.id]; return `- ${it.name}: ${row && row.value !== null && row.value !== undefined ? row.value : '(없음)'} / ${it.max}${row && row.note ? ' — ' + row.note : ''}`; }).join('\n');
        const sys = `너는 이야기 밖의 기록 담당이다. 인사, 설명 없이 지정된 JSON 객체만 반환한다.`;
        const prompt = `[세계관: ${w.name}]\n${w.prompt || ''}\n\n[대상 인물: ${char.keyword}]${facs ? '\n소속: ' + facs : ''}\n${char.desc || ''}${char.secret && char.secret.trim() ? '\n비밀: ' + char.secret.trim() : ''}\n\n[상황 요약]\n${r.memory || '없음'}\n\n[최근 진행]\n${recent || '없음'}\n\n[스테이터스: ${def.title}]\n${def.guide || ''}\n\n[이전 값]\n${prev}\n\n[작업]\n대상 인물 ${char.keyword}의 현재 스테이터스를 항목별로 매긴다.\n- 수치(value)는 0 이상 만점 이하의 정수다. 만점은 항목마다 다르다.\n- 이전 값이 있으면 그것을 기준으로 하고, 진행에서 바뀔 이유가 생긴 항목만 바꾼다. 이유가 없으면 이전 값을 그대로 둔다.\n- 이전 값이 없으면 인물 설정과 지금까지의 진행에 맞게 정한다.\n- 비고(note)는 그 수치인 이유나 현재 상태를 한두 문장으로 짧게 쓴다.\n- 항목 이름(name)은 아래 목록의 글자 그대로 쓴다.\n항목 목록:\n${items.map(it => `- ${it.name} (만점 ${it.max})`).join('\n')}\n\n[출력 JSON 형식]\n{"rows":[{"name":"항목 이름","value":숫자,"note":"비고"}]}`;
        this.busy = true; this.editing = false; this.render();
        try {
            const data = API.parseAIJsonRaw(await API.callLLM([{ role: 'user', parts: [{ text: prompt }] }], sys, { temp: 0.4, jsonMode: true }));
            if(!data || !Array.isArray(data.rows)) throw new Error('응답 형식이 올바르지 않습니다. 다시 시도해 주세요.');
            items.forEach((it, i) => {
                const got = data.rows.find(x => x && x.name === it.name) || data.rows[i]; if(!got) return;
                const old = entry.rows[it.id];
                const value = Math.max(0, Math.min(it.max, Math.round(Number(got.value) || 0)));
                entry.rows[it.id] = { value, note: String(got.note || ''), prev: old && old.value !== null && old.value !== undefined ? old.value : value };
            });
            Store.forceSave();
        } catch(e) { alert("스테이터스 갱신 실패: " + e.message); }
        finally { this.busy = false; this.render(); }
    },

    // 화면에는 보이지 않고 AI만 아는 메모로 대화 기록에 넣는다 (정보망의 "채팅에 공유"와 같은 방식)
    share: function() {
        const r = Store.getActiveRoom(); const { def, char } = this.current(r); const entry = this.entry(r, def.id, char.id);
        const lines = def.items.filter(it => entry.rows[it.id] && entry.rows[it.id].value !== null && entry.rows[it.id].value !== undefined)
            .map(it => `- ${it.name}: ${entry.rows[it.id].value} / ${it.max}${entry.rows[it.id].note ? ' — ' + entry.rows[it.id].note : ''}`);
        if(!lines.length) return alert("공유할 값이 없습니다. 먼저 갱신하거나 직접 입력하세요.");
        const text = `(참고: ${char.keyword}의 현재 스테이터스 「${def.title}」이다. 이 상태를 반영해 진행하되, 수치 자체를 서술이나 대사에 드러내지 않는다.)\n${lines.join('\n')}`;
        r.history.push({ role: 'user', hidden: true, kind: 'share', variants: [text], currentVariant: 0 });
        Store.forceSave(); UI.showToast("채팅 AI에게 공유했습니다.");
    }
};
