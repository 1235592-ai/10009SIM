window.Store = {
    VERSION: 100,
    state: {
        provider: 'gemini', historyLimit: 25, apiKey: '', modelName: 'gemini-3.5-flash-lite', baseUrl: '', providerConfigs: {}, globalRules: '', worldTagsMigrated: false, lobbyBgUrl: '',
        safety: {},
        roomTags: [], worlds: [], rooms: [], activeRoomId: null, activeWorldId: null
    },
    saveTimeout: null,
    db: null,

    openDB: function() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('10009SIM_DB', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if(!db.objectStoreNames.contains('master')) db.createObjectStore('master', {keyPath: 'id'});
                if(!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', {keyPath: 'id'});
                if(!db.objectStoreNames.contains('rooms')) db.createObjectStore('rooms', {keyPath: 'id'});
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    dbGet: function(storeName, id) { return new Promise(resolve => { const req = this.db.transaction(storeName, 'readonly').objectStore(storeName).get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); },
    dbGetAll: function(storeName) { return new Promise(resolve => { const req = this.db.transaction(storeName, 'readonly').objectStore(storeName).getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve([]); }); },
    dbDelete: function(storeName, id) { return new Promise(resolve => { const req = this.db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id); req.onsuccess = () => resolve(); req.onerror = () => resolve(); }); },

    init: async function() {
        try { this.db = await this.openDB(); } catch(e) { console.warn("DB init failed", e); alert("저장소 초기화 실패. 브라우저 설정(시크릿 모드 등)을 확인하세요."); return; }
        
        const master = await this.dbGet('master', 'main');
        if (master) {
            this.state.provider = master.provider || 'gemini';
            this.state.apiKey = master.apiKey || ''; 
            this.state.modelName = master.modelName || API.PROVIDERS[this.state.provider]?.defaultModel || 'gemini-3.5-flash-lite';
            this.state.worldTagsMigrated = !!master.worldTagsMigrated;
            this.state.baseUrl = master.baseUrl || '';
            this.state.providerConfigs = master.providerConfigs || {};
            this.state.globalRules = master.globalRules || '';
            this.state.historyLimit = master.historyLimit || 25;
            this.state.lobbyBgUrl = master.lobbyBgUrl || '';
            this.state.safety = this.normalizeSafety(master.safety); 
            this.state.roomTags = master.roomTags || [];
            this.state.worlds = await this.dbGetAll('worlds');
            this.state.rooms = await this.dbGetAll('rooms');
            
            this.state.rooms.forEach(r => { 
                if(!r.tagIds) r.tagIds = []; 
                // 🔥 신규 기능 하위 호환성 및 초기화 패치 (톤, 조연 수명 관리, 떡밥 회수)
                if(!r.transientCharIds) r.transientCharIds = {};
                if(typeof r.baitRecoveryNextTurn === 'undefined') r.baitRecoveryNextTurn = false;
                if(!r.tone) r.tone = 'normal';
            });
            
            this.state.worlds.forEach(w => { if(!w.keywords) w.keywords = []; });

            // 기존 시나리오에 세계관 태그를 한 번만 자동으로 붙인다 (사용자가 지운 태그가 다시 생기지 않도록 플래그로 관리)
            this.cleanupTags();
            if(!this.state.worldTagsMigrated) {
                this.state.rooms.forEach(r => { const tId = this.ensureWorldTag(r.worldInstance?.name); if(tId && !r.tagIds.includes(tId)) r.tagIds.push(tId); });
                this.state.worldTagsMigrated = true;
                this.forceSave();
            }
        } else {
            const defaultSys = {id:'sys', keyword:'시스템', desc:'전지적 시스템', secret:'', stats:[], reputation:[], factionIds:[], triggerLocId:'', isHidden:true};
            const defaultWorld = { id: 'w_'+Date.now(), name: '기본 세계관', prompt: '현대 배경.', bgUrl: '', keywords: [], regions: [], locations: [], factions: [], loreFolders: [], lores: [], characters: [defaultSys] };
            this.state.worlds.push(defaultWorld);
            this.state.worldTagsMigrated = true;
            this.forceSave(); 
        }
    },

    forceSave: function() {
        if(this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            if(!this.db) return;
            const master = { id: 'main', ...this.masterSettings() };
            try {
                const tx = this.db.transaction(['master', 'worlds', 'rooms'], 'readwrite');
                tx.objectStore('master').put(master);
                this.state.worlds.forEach(w => tx.objectStore('worlds').put(w));
                
                if (this.state.activeRoomId) {
                    const r = this.getActiveRoom();
                    if(r) tx.objectStore('rooms').put(r);
                } else {
                    this.state.rooms.forEach(r => tx.objectStore('rooms').put(r));
                }
            } catch(e) { console.error("DB Save Error", e); }
        }, 500);
    },
    
    // 예전 형식(항목별 true/false)을 새 형식({user, npc})으로 옮긴다
    normalizeSafety: function(raw) {
        raw = raw || {}; const out = {};
        const legacy = { cruelty: ['violence', 'gore', 'abuse'], sexual: ['sexual'], obsession: ['obsession'], marysue: ['marysue'] };
        API.SAFETY_ITEMS.forEach(it => {
            const v = raw[it.key];
            if(v && typeof v === 'object') out[it.key] = { user: !!v.user, npc: !!v.npc };
            else { const on = (legacy[it.key] || []).some(k => raw[k] === true); out[it.key] = { user: on, npc: on }; }
        });
        return out;
    },
    setSafety: function(key, target, on) {
        if(!this.state.safety[key]) this.state.safety[key] = { user: false, npc: false };
        this.state.safety[key][target] = on; this.forceSave(); UI.showToast("안전 설정이 저장되었습니다.");
    },

    masterSettings: function() {
        const s = this.state;
        return { provider: s.provider, historyLimit: s.historyLimit, apiKey: s.apiKey, modelName: s.modelName, baseUrl: s.baseUrl, providerConfigs: s.providerConfigs, globalRules: s.globalRules, worldTagsMigrated: s.worldTagsMigrated, safety: s.safety, roomTags: s.roomTags, lobbyBgUrl: s.lobbyBgUrl };
    },

    // 현재 입력된 키/모델을 서비스별로 따로 보관해 두어, 서비스를 바꿔도 이전 키가 지워지지 않게 한다.
    stashProviderConfig: function() {
        this.state.providerConfigs[this.state.provider] = { apiKey: this.state.apiKey, modelName: this.state.modelName, baseUrl: this.state.baseUrl };
    },

    saveSettings: function() { 
        this.state.apiKey = document.getElementById('set-api-key').value.trim(); 
        this.state.modelName = document.getElementById('set-model-name').value.trim() || API.PROVIDERS[API.getProvider()].defaultModel; 
        this.state.baseUrl = document.getElementById('set-base-url').value.trim();
        this.state.lobbyBgUrl = document.getElementById('set-lobby-bg').value.trim();
        const lim = parseInt(document.getElementById('set-history-limit').value, 10);
        this.state.historyLimit = isNaN(lim) ? 25 : Math.max(5, Math.min(200, lim));
        this.stashProviderConfig();
        this.forceSave(); 
        if(!this.state.activeRoomId) UI.setBackground(this.state.lobbyBgUrl);
        UI.renderApiSettings();
        UI.showToast("설정이 저장되었습니다."); 
    },

    changeProvider: function(provider) {
        this.stashProviderConfig();
        this.state.provider = provider;
        const cfg = this.state.providerConfigs[provider] || {};
        this.state.apiKey = cfg.apiKey || '';
        this.state.modelName = cfg.modelName || API.PROVIDERS[provider].defaultModel;
        this.state.baseUrl = cfg.baseUrl || '';
        this.stashProviderConfig();
        this.forceSave();
        UI.renderApiSettings();
        UI.showToast(`${API.PROVIDERS[provider].label}(으)로 전환했습니다.`);
    },

    saveGlobalRules: function() {
        const val = document.getElementById('set-global-rules').value;
        this.state.globalRules = val.trim() === API.DEFAULT_RULES.trim() ? '' : val;
        this.forceSave();
        UI.showToast("전체 서술 지침이 저장되었습니다.");
    },
    resetGlobalRules: function() {
        if(!confirm("전체 서술 지침을 기본값으로 되돌리시겠습니까?\n(직접 수정한 내용은 사라집니다)")) return;
        this.state.globalRules = '';
        document.getElementById('set-global-rules').value = API.DEFAULT_RULES;
        this.forceSave();
        UI.showToast("기본 지침으로 되돌렸습니다.");
    },
    
    // 세계관 이름과 같은 세계관 태그를 찾고, 없으면 만든다. 태그 id를 반환.
    ensureWorldTag: function(name) {
        name = (name || '').trim(); if(!name) return null;
        let t = this.state.roomTags.find(x => x.kind === 'world' && x.name === name);
        if(!t) { t = { id: 'tag_' + Date.now() + Math.random().toString(36).substr(2, 5), name, kind: 'world' }; this.state.roomTags.push(t); }
        return t.id;
    },

    // 어떤 시나리오에도 붙어 있지 않은 태그를 지운다. ids를 주면 그 태그만 검사.
    cleanupTags: function(ids) {
        const used = new Set(); this.state.rooms.forEach(r => (r.tagIds || []).forEach(t => used.add(t)));
        const before = this.state.roomTags.length;
        this.state.roomTags = this.state.roomTags.filter(t => used.has(t.id) || (ids && !ids.includes(t.id)));
        if(this.state.roomTags.length !== before) this.forceSave();
    },

    getActiveRoom: function() { return this.state.rooms.find(r => r.id === this.state.activeRoomId); },
    getTargetWorld: function() { if(this.state.activeRoomId) return this.getActiveRoom().worldInstance; return this.state.worlds.find(w => w.id === this.state.activeWorldId); },
    updateRoomState: function(key, val) { const r = this.getActiveRoom(); if(r) { r[key] = val; this.forceSave(); } },
    setLoc: function(idx) { const r = this.getActiveRoom(); if(!r) return; r.currentLocIdx = idx; this.forceSave(); App.loadActiveRoom(); UI.closeOverlay(); },
    saveRoomMemory: function() { const r = this.getActiveRoom(); if(!r) return; r.memory = document.getElementById('room-memory-input').value; r.globalStatus = document.getElementById('global-status-input').value; this.forceSave(); UI.showToast("상황/세계 상태가 저장되었습니다."); },

    removeRoomDB: async function(id) { await this.dbDelete('rooms', id); },
    
    createNewWorldTemplate: function() { const newW = { id: 'w_'+Date.now(), name: '새 세계관', prompt: '', bgUrl: '', keywords: [], regions: [], locations: [], factions: [], loreFolders: [], lores: [], characters: [{id:'sys', keyword:'시스템', desc:'', secret:'', stats:[], reputation:[], factionIds:[], triggerLocId:'', isHidden:true}] }; this.state.worlds.unshift(newW); this.forceSave(); UI.renderWorldTemplateList(); UI.showToast("새 템플릿 생성됨"); App.editWorldTemplate(newW.id); },
    deleteWorldTemplate: function(id) { if(!confirm("이 템플릿을 영구 삭제하시겠습니까? (시나리오 데이터는 유지됨)")) return; this.state.worlds = this.state.worlds.filter(w => w.id !== id); this.dbDelete('worlds', id); this.forceSave(); UI.renderWorldTemplateList(); },
    
    syncWorldDOM: function() {
        const w = this.getTargetWorld(); if(!w) return;
        w.name = document.getElementById('w-n')?.value ?? w.name; 
        w.prompt = document.getElementById('w-d')?.value ?? w.prompt; 
        w.bgUrl = document.getElementById('w-url')?.value ?? w.bgUrl;
        w.rules = document.getElementById('w-rules')?.value ?? w.rules;
        if(document.getElementById('w-net-community')) w.netRules = { community: document.getElementById('w-net-community').value, darkweb: document.getElementById('w-net-darkweb').value, inbox: document.getElementById('w-net-inbox').value };
        
        w.loreFolders.forEach(lf => { lf.name = document.getElementById(`lf-n-${lf.id}`)?.value ?? lf.name; lf.desc = document.getElementById(`lf-d-${lf.id}`)?.value ?? lf.desc; });
        w.lores.forEach(l => { l.keyword = document.getElementById(`l-n-${l.id}`)?.value ?? l.keyword; l.desc = document.getElementById(`l-d-${l.id}`)?.value ?? l.desc; l.folderId = document.getElementById(`l-fld-${l.id}`)?.value ?? l.folderId; l.triggerLocId = document.getElementById(`l-trig-${l.id}`)?.value ?? l.triggerLocId; });
        w.regions.forEach(reg => { reg.name = document.getElementById(`reg-n-${reg.id}`)?.value ?? reg.name; reg.desc = document.getElementById(`reg-d-${reg.id}`)?.value ?? reg.desc; });
        w.locations.forEach(loc => { loc.name = document.getElementById(`loc-n-${loc.id}`)?.value ?? loc.name; loc.desc = document.getElementById(`loc-d-${loc.id}`)?.value ?? loc.desc; loc.regionId = document.getElementById(`loc-r-${loc.id}`)?.value ?? loc.regionId; });
    },
    // 열려 있는 패널의 입력칸만 읽는다 (닫힌 패널에는 다른 세계관의 예전 값이 남아 있을 수 있음)
    syncOpenPanels: function() {
        if(document.getElementById('world-panel').classList.contains('open')) this.syncWorldDOM();
        if(document.getElementById('char-panel').classList.contains('open')) this.syncCharDOM();
    },

    // 같은 묶음 안에서 끌어 옮긴 순서(ids)를 반영한다. 다른 항목의 자리는 그대로 둔다.
    reorder: function(type, ids) {
        const w = this.getTargetWorld(); if(!w) return;
        const key = { f: 'factions', lf: 'loreFolders', l: 'lores', reg: 'regions', loc: 'locations', c: 'characters' }[type]; if(!key) return;
        this.syncOpenPanels();
        const arr = w[key];
        const r = this.state.activeRoomId ? this.getActiveRoom() : null;
        // 현재 위치는 순번으로 저장돼 있어서, 장소 순서가 바뀌어도 같은 장소를 가리키도록 다시 맞춘다
        const curLocId = (type === 'loc' && r) ? w.locations[r.currentLocIdx]?.id : null;
        const slots = arr.map((x, i) => ids.includes(x.id) ? i : -1).filter(i => i >= 0);
        const moved = ids.map(id => arr.find(x => x.id === id)).filter(x => x);
        if(moved.length !== slots.length) return;
        slots.forEach((slot, k) => { arr[slot] = moved[k]; });
        if(curLocId) r.currentLocIdx = w.locations.findIndex(x => x.id === curLocId);
        this.forceSave(); UI.refreshOpenPanel();
    },

    saveWorld: function() { this.syncWorldDOM(); this.forceSave(); UI.renderWorld(); UI.showToast("세계관이 저장되었습니다."); if(this.state.activeRoomId) App.loadActiveRoom(); else UI.renderWorldTemplateList(); },
    
    removeKeyword: function(k) { const w = this.getTargetWorld(); if(w && w.keywords) { w.keywords = w.keywords.filter(x => x !== k); this.forceSave(); UI.renderKeywords(); UI.renderWorld(); } },

    addFaction: function() { const w = this.getTargetWorld(); this.syncOpenPanels(); const f = { id:'f_'+Date.now(), name:'', desc:'', secret:'' }; w.factions.push(f); this.forceSave(); UI.refreshOpenPanel(); UI.openDetails([`det-fg-${f.id}`, `det-f-${f.id}`]); },
    addLoreFolder: function() { const w = this.getTargetWorld(); this.syncWorldDOM(); w.loreFolders.push({ id:'lf_'+Date.now(), name:'', desc:'' }); this.forceSave(); UI.renderWorld(); },
    addLore: function(fId) { const w = this.getTargetWorld(); this.syncWorldDOM(); w.lores.push({ id:'l_'+Date.now(), folderId: fId, keyword:'', desc:'', triggerLocId:'' }); this.forceSave(); UI.renderWorld(); },
    addRegion: function() { const w = this.getTargetWorld(); this.syncWorldDOM(); w.regions.push({ id:'reg_'+Date.now(), name:'', desc:'' }); this.forceSave(); UI.renderWorld(); },
    addLocation: function(rId) { const w = this.getTargetWorld(); this.syncWorldDOM(); w.locations.push({ id:'loc_'+Date.now(), regionId: rId, name:'', desc:'' }); this.forceSave(); UI.renderWorld(); },
    
    delWorldItem: function(type, id, e) {
        if(e) e.stopPropagation(); if(!confirm("삭제하시겠습니까?")) return;
        const w = this.getTargetWorld(); this.syncOpenPanels();
        if(type==='f') { w.factions = w.factions.filter(x=>x.id!==id); w.characters.forEach(c => { if(c.factionIds) c.factionIds = c.factionIds.filter(fid => fid !== id); }); }
        if(type==='lf') { w.loreFolders = w.loreFolders.filter(x=>x.id!==id); w.lores.forEach(l=>{ if(l.folderId===id) l.folderId=''; }); }
        if(type==='l') w.lores = w.lores.filter(x=>x.id!==id);
        if(type==='reg') { w.regions = w.regions.filter(x=>x.id!==id); w.locations.forEach(loc=>{ if(loc.regionId===id) loc.regionId=''; }); }
        if(type==='loc') {
            const idx = w.locations.findIndex(x=>x.id===id);
            if(idx !== -1) { w.locations.splice(idx, 1); if(this.state.activeRoomId) { const r = this.getActiveRoom(); if(r.currentLocIdx === idx) r.currentLocIdx = -1; else if(r.currentLocIdx > idx) r.currentLocIdx--; } }
        }
        this.forceSave(); UI.refreshOpenPanel();
    },

    syncCharDOM: function() {
        const w = this.getTargetWorld(); if(!w) return;
        w.factions.forEach(f => { f.name = document.getElementById(`f-n-${f.id}`)?.value ?? f.name; f.desc = document.getElementById(`f-d-${f.id}`)?.value ?? f.desc; f.secret = document.getElementById(`f-s-${f.id}`)?.value ?? f.secret; });
        w.characters.forEach(c => {
            c.keyword = document.getElementById(`c-n-${c.id}`)?.value ?? c.keyword;
            c.desc = document.getElementById(`c-d-${c.id}`)?.value ?? c.desc;
            c.secret = document.getElementById(`c-s-${c.id}`)?.value ?? c.secret;
            if (c.id !== 'sys') { 
                const fEl = document.getElementById(`c-f-hid-${c.id}`); if(fEl) c.factionIds = fEl.value ? fEl.value.split(',') : []; 
                c.triggerLocId = document.getElementById(`c-trig-${c.id}`)?.value ?? c.triggerLocId; 
            }
        });
    },
    saveCharacters: function() { this.syncCharDOM(); this.forceSave(); UI.renderCharacters(); UI.showToast("인물 설정이 저장되었습니다."); if(this.state.activeRoomId) App.loadActiveRoom(); else UI.renderWorldTemplateList(); },
    addCharacter: function() { const w = this.getTargetWorld(); this.syncCharDOM(); w.characters.push({ id:'c_'+Date.now(), keyword:'', desc:'', secret:'', stats:[], reputation:[], factionIds:[], triggerLocId:'', isHidden:false }); this.forceSave(); UI.renderCharacters(); },
    delChar: function(id) { if(!confirm("인물을 삭제하시겠습니까?")) return; const w = this.getTargetWorld(); this.syncCharDOM(); w.characters = w.characters.filter(c => c.id !== id); const r = this.getActiveRoom(); if(r) { r.activeCharIds = r.activeCharIds.filter(cid => cid !== id); if(r.myCharId === id) r.myCharId = null; } this.forceSave(); UI.renderCharacters(); },
    toggleActiveNpc: function(id) { const r = this.getActiveRoom(); if(!r) return; this.syncCharDOM(); if(r.activeCharIds.includes(id)) r.activeCharIds = r.activeCharIds.filter(x => x !== id); else r.activeCharIds.push(id); this.forceSave(); UI.renderCharacters(); App.loadActiveRoom(); },
    setMyChar: function(id) { const r = this.getActiveRoom(); if(!r) return; this.syncCharDOM(); r.myCharId = id; r.activeCharIds = r.activeCharIds.filter(x => x !== id); this.forceSave(); UI.renderCharacters(); App.loadActiveRoom(); },
    toggleHidden: function(id) { const w = this.getTargetWorld(); const c = w.characters.find(x => x.id === id); if(c) { this.syncCharDOM(); c.isHidden = !c.isHidden; this.forceSave(); UI.renderCharacters(); } },
    addFacTag: function(cId, selEl) { const fId = selEl.value; if(!fId) return; selEl.value = ''; const hid = document.getElementById(`c-f-hid-${cId}`); let arr = hid.value ? hid.value.split(',') : []; if(!arr.includes(fId)) { arr.push(fId); hid.value = arr.join(','); this.syncCharDOM(); this.forceSave(); UI.renderCharacters(); UI.focusChar(cId, fId); } },
    removeFacTag: function(cId, fId) { const hid = document.getElementById(`c-f-hid-${cId}`); let arr = hid.value ? hid.value.split(',') : []; arr = arr.filter(x => x !== fId); hid.value = arr.join(','); this.syncCharDOM(); this.forceSave(); UI.renderCharacters(); UI.focusChar(cId); },

    exportData: function() { 
        if(!confirm("모든 설정과 시나리오 데이터를 백업 파일(JSON)로 다운로드하시겠습니까?")) return;
        const exp = { ...this.masterSettings(), worlds: this.state.worlds, rooms: this.state.rooms }; 
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(exp)], {type:'application/json'})); a.download = `10009SIM_Backup_${Date.now()}.json`; a.click(); 
    },
    exportChatToTxt: function() { 
        if(!confirm("현재 시나리오의 대화 로그를 텍스트 파일(TXT)로 다운로드하시겠습니까?")) return;
        const r = this.getActiveRoom(); if(!r) return; const w = r.worldInstance; let txt = `${r.name} - 로그\n\n`; 
        r.history.filter(m => !m.hidden).forEach(m => { const speaker = m.role === 'user' ? (w.characters.find(c=>c.id===r.myCharId)?.keyword || 'USER') : (m.charIds || ['sys']).map(id => w.characters.find(c=>c.id===id)?.keyword).filter(x=>x).join(', ') || '시뮬레이터'; txt += `[${speaker}]\n${m.variants[m.currentVariant]}\n\n`; }); 
        const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'})); a.download=`${r.name}.txt`; a.click(); 
    },
    importData: function(e) { 
        const r = new FileReader(); 
        r.onload = async (ev) => { 
            try { 
                const st = JSON.parse(ev.target.result); 
                if(this.db) { this.db.close(); this.db = null; } 
                await new Promise(res => { const req = indexedDB.deleteDatabase('10009SIM_DB'); req.onsuccess = res; req.onerror = res; });
                
                this.db = await this.openDB();
                const tx = this.db.transaction(['master', 'worlds', 'rooms'], 'readwrite');
                tx.objectStore('master').put({id:'main', provider:st.provider||'gemini', apiKey:st.apiKey||'', modelName:st.modelName||'gemini-3.5-flash-lite', worldTagsMigrated:!!st.worldTagsMigrated, baseUrl:st.baseUrl||'', providerConfigs:st.providerConfigs||{}, globalRules:st.globalRules||'', historyLimit:st.historyLimit||25, safety:st.safety||this.state.safety, roomTags:st.roomTags||[], lobbyBgUrl:st.lobbyBgUrl||''});
                if(st.worlds) { st.worlds.forEach(w => { if(!w.keywords) w.keywords=[]; tx.objectStore('worlds').put(w); }); }
                if(st.rooms) st.rooms.forEach(rm => tx.objectStore('rooms').put(rm));
                tx.oncomplete = () => { alert("복원 완료! 앱을 재시작합니다."); window.location.reload(); };
            } catch(err) { alert("잘못된 파일입니다."); } 
        }; 
        if(e.target.files[0]) r.readAsText(e.target.files[0]); 
    }
};
