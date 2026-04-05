window.Store = {
    VERSION: 71,
    state: {
        apiKey: '', modelName: 'gemini-3.1-flash-lite-preview',
        safety: { violence: false, coercion: false, sexual: false, abuse: false, selfharm: false, drugs: false },
        roomTags: [], worlds: [], rooms: [], activeRoomId: null, activeWorldId: null
    },
    saveTimeout: null,

    init: function() {
        let loadedMaster = null; 
        let loadedVersion = this.VERSION;
        
        for (let v = this.VERSION; v >= 59; v--) {
            const mData = localStorage.getItem('rpMaster_v' + v);
            if (mData) { loadedMaster = JSON.parse(mData); loadedVersion = v; break; }
        }

        if (loadedMaster) {
            this.state.apiKey = loadedMaster.apiKey || ''; 
            this.state.modelName = loadedMaster.modelName || 'gemini-3.1-flash-lite-preview';
            this.state.safety = loadedMaster.safety || this.state.safety; 
            this.state.roomTags = loadedMaster.roomTags || [];
            
            if(loadedMaster.worlds) {
                loadedMaster.worlds.forEach(meta => { 
                    const d = localStorage.getItem(`rpWorld_v${loadedVersion}_${meta.id}`); 
                    if(d) this.state.worlds.push(JSON.parse(d)); 
                });
            }
            if(loadedMaster.rooms) {
                loadedMaster.rooms.forEach(meta => { 
                    const d = localStorage.getItem(`rpRoom_v${loadedVersion}_${meta.id}`); 
                    if(d) { let r = JSON.parse(d); r.tagIds = r.tagIds || []; this.state.rooms.push(r); }
                });
            }
            
            if (loadedVersion !== this.VERSION) {
                Object.keys(localStorage).forEach(k => { 
                    if(k.startsWith('rpMaster_v') || k.startsWith('rpWorld_v') || k.startsWith('rpRoom_v')) {
                        localStorage.removeItem(k); 
                    }
                });
                this.forceSave();
            }
        } else {
            const wId = 'w_'+Date.now();
            this.state.worlds.push({ 
                id: wId, name: '예시: 좀비 아포칼립스', prompt: '서울에 좀비 바이러스가 퍼졌다.', bgUrl: '', 
                factions: [], loreFolders: [], lores: [], regions: [], locations: [], 
                characters: [ {id:'sys', keyword:'시뮬레이터', desc:'마스터', secret:'', stats:[], reputation:[], factionIds:[], triggerLocId:'', isHidden:false} ] 
            });
        }
    },

    getTargetWorld: function() { return this.state.activeRoomId ? this.state.rooms.find(x => x.id === this.state.activeRoomId)?.worldInstance : this.state.worlds.find(x => x.id === this.state.activeWorldId); },
    getActiveRoom: function() { return this.state.rooms.find(r => r.id === this.state.activeRoomId); },
    getChar: function(id) { const w = this.getTargetWorld(); return w ? w.characters.find(c=>c.id===id) : null; },

    debouncedSave: function() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.forceSave(), 500);
    },

    forceSave: function() {
        try {
            const master = { apiKey: this.state.apiKey, modelName: this.state.modelName, safety: this.state.safety, roomTags: this.state.roomTags, worlds: this.state.worlds.map(w => ({id: w.id, name: w.name})), rooms: this.state.rooms.map(r => ({id: r.id, name: r.name, lastUpdated: r.lastUpdated})) };
            localStorage.setItem(`rpMaster_v${this.VERSION}`, JSON.stringify(master));
            this.state.worlds.forEach(w => localStorage.setItem(`rpWorld_v${this.VERSION}_${w.id}`, JSON.stringify(w)));
            this.state.rooms.forEach(r => localStorage.setItem(`rpRoom_v${this.VERSION}_${r.id}`, JSON.stringify(r)));
        } catch (e) {
            alert("🚨 브라우저 저장 공간이 가득 찼습니다!\n설정 탭에서 [데이터 백업] 후 쓰지 않는 시나리오를 삭제하세요.");
        }
    },

    saveSettings: function() { 
        this.state.apiKey = document.getElementById('set-api-key').value; 
        this.state.modelName = document.getElementById('set-model-name').value || 'gemini-3.1-flash-lite-preview'; 
        this.forceSave(); 
    },
    
    updateRoomState: function(key, val) { const r = this.getActiveRoom(); if(r) r[key] = val; },

    createNewWorldTemplate: function() { this.state.worlds.push({ id: 'w_'+Date.now(), name: '새 템플릿', prompt: '', bgUrl: '', factions: [], loreFolders: [], lores: [], regions: [], locations: [], characters: [{id:'sys', keyword:'시뮬레이터', desc:'마스터', secret:'', stats:[], reputation:[], factionIds:[], triggerLocId:'', isHidden:false}] }); this.forceSave(); UI.renderWorldTemplateList(); UI.showToast("템플릿 생성"); },
    
    // 🔥 복구: 템플릿 삭제 시 확인창 및 안전장치 부활
    deleteWorldTemplate: function(id) { 
        if(this.state.worlds.length <= 1) return alert("최소 1개 이상의 템플릿은 유지해야 합니다.");
        if(!confirm("정말 이 템플릿을 삭제하시겠습니까?\n(이미 생성된 시나리오에는 영향을 주지 않습니다.)")) return;
        this.state.worlds = this.state.worlds.filter(w => w.id !== id); 
        localStorage.removeItem(`rpWorld_v${this.VERSION}_${id}`); 
        this.forceSave(); 
        UI.renderWorldTemplateList(); 
    },
    
    addFaction: function() { this.syncWorldDOM(); this.getTargetWorld().factions.push({id:'f_'+Date.now(), name:'', desc:'', secret:''}); UI.renderWorld(); },
    addLoreFolder: function() { this.syncWorldDOM(); this.getTargetWorld().loreFolders.push({id:'lf_'+Date.now(), name:'', desc:''}); UI.renderWorld(); },
    addLore: function(folderId='') { this.syncWorldDOM(); this.getTargetWorld().lores.push({id:'l_'+Date.now(), folderId, keyword:'', triggerLocId:'', desc:''}); UI.renderWorld(); },
    addRegion: function() { this.syncWorldDOM(); this.getTargetWorld().regions.push({id:'reg_'+Date.now(), name:'', desc:''}); UI.renderWorld(); },
    addLocation: function(regionId='') { this.syncWorldDOM(); this.getTargetWorld().locations.push({id:'loc_'+Date.now(), regionId, name:'', desc:''}); UI.renderWorld(); },
    
    delWorldItem: function(type, id, event) {
        if(event) event.stopPropagation();
        this.syncWorldDOM();
        if(!confirm("삭제하시겠습니까? (하위/연결된 태그도 지워집니다)")) return;
        const w = this.getTargetWorld();
        if(type==='f') { w.factions = w.factions.filter(x=>x.id!==id); w.characters.forEach(c => { if(c.factionIds) c.factionIds = c.factionIds.filter(fid=>fid!==id); }); }
        else if(type==='lf') { w.loreFolders = w.loreFolders.filter(x=>x.id!==id); w.lores.forEach(l => { if(l.folderId === id) l.folderId = ''; }); }
        else if(type==='l') w.lores = w.lores.filter(x=>x.id!==id);
        else if(type==='reg') { w.regions = w.regions.filter(x=>x.id!==id); w.locations.forEach(l => { if(l.regionId === id) l.regionId = ''; }); }
        else if(type==='loc') { const idx = w.locations.findIndex(x=>x.id===id); w.locations = w.locations.filter(x=>x.id!==id); const r = this.getActiveRoom(); if(r && r.currentLocIdx === idx) r.currentLocIdx = -1; else if(r && r.currentLocIdx > idx) r.currentLocIdx--; w.characters.forEach(c => { if(c.triggerLocId === id) c.triggerLocId = ''; }); w.lores.forEach(l => { if(l.triggerLocId === id) l.triggerLocId = ''; }); }
        UI.renderWorld();
    },

    setLoc: function(i) { this.syncWorldDOM(); const r = this.getActiveRoom(); if(r) { r.currentLocIdx = i; this.forceSave(); App.loadActiveRoom(); UI.renderWorld(); } },
    addCharacter: function() { this.syncCharDOM(); const w = this.getTargetWorld(); w.characters.push({id:'c_'+Date.now(), keyword:'새 인물', factionIds:[], triggerLocId:'', desc:'', secret:'', stats:[], reputation:[], isHidden:false}); UI.renderCharacters(); },
    delChar: function(id) { this.syncCharDOM(); if(!confirm("삭제하시겠습니까?")) return; const w = this.getTargetWorld(); const r = this.getActiveRoom(); if(r && r.myCharId===id) return alert("내 캐릭터 삭제 불가."); w.characters = w.characters.filter(x=>x.id!==id); if(r) { r.activeCharIds = r.activeCharIds.filter(x=>x!==id); if(r.activeCharIds.length===0) r.activeCharIds=['sys']; App.loadActiveRoom(); } UI.renderCharacters(); },
    toggleHidden: function(id) { this.syncCharDOM(); const c = this.getChar(id); if(c) { c.isHidden = !c.isHidden; if(c.isHidden && this.state.activeRoomId) { const r = this.getActiveRoom(); r.activeCharIds = r.activeCharIds.filter(x=>x!==id); if(r.activeCharIds.length===0) r.activeCharIds=['sys']; } UI.renderCharacters(); if(this.state.activeRoomId) App.loadActiveRoom(); } },
    setMyChar: function(id) { this.syncCharDOM(); const r = this.getActiveRoom(); r.myCharId = id; r.activeCharIds = r.activeCharIds.filter(x=>x!==id); if(r.activeCharIds.length===0) r.activeCharIds=['sys']; UI.renderCharacters(); App.loadActiveRoom(); },
    toggleActiveNpc: function(id) { this.syncCharDOM(); const r = this.getActiveRoom(); if(r.activeCharIds.includes(id)) r.activeCharIds = r.activeCharIds.filter(x=>x!==id); else r.activeCharIds.push(id); if(r.activeCharIds.length===0) r.activeCharIds=['sys']; UI.renderCharacters(); App.loadActiveRoom(); },

    addStat: function(id) { this.syncCharDOM(); const c = this.getChar(id); if(c) { c.stats.push({n:'', v:50, active:true}); UI.renderCharacters(); if(this.state.activeRoomId) Dice.refreshDiceUI(); } },
    delStat: function(id, sIdx) { this.syncCharDOM(); const c = this.getChar(id); if(c) { c.stats.splice(sIdx, 1); UI.renderCharacters(); if(this.state.activeRoomId) Dice.refreshDiceUI(); } },
    upStat: function(id, sIdx, f, val) { this.syncCharDOM(); const c = this.getChar(id); if(c) { c.stats[sIdx][f] = f==='v'?Number(val):val; if(this.state.activeRoomId && f==='active') Dice.refreshDiceUI(); } },
    
    addRep: function(id) { this.syncCharDOM(); const c = this.getChar(id); if(c) { c.reputation.push({id:'rep_'+Date.now(), leftName:'', rightName:'', value:0}); UI.renderCharacters(); } },
    delRep: function(id, idx) { this.syncCharDOM(); const c = this.getChar(id); if(c) { c.reputation.splice(idx, 1); UI.renderCharacters(); } },
    upRep: function(id, idx, f, val) { this.syncCharDOM(); const c = this.getChar(id); if(c) { c.reputation[idx][f] = f==='value'?Number(val):val; } },
    
    addFacTag: function(cId, selEl) { this.syncCharDOM(); const fId = selEl.value; if(!fId) return; selEl.value = ''; const c = this.getChar(cId); if(c && !c.factionIds.includes(fId)) { c.factionIds.push(fId); UI.renderCharacters(); } },
    removeFacTag: function(cId, fId) { this.syncCharDOM(); const c = this.getChar(cId); if(c) { c.factionIds = c.factionIds.filter(id => id !== fId); UI.renderCharacters(); } },

    syncWorldDOM: function() {
        const w = this.getTargetWorld(); if(!w) return;
        const wN = document.getElementById('w-n'); if(wN) w.name = wN.value;
        const wD = document.getElementById('w-d'); if(wD) w.prompt = wD.value;
        const wUrl = document.getElementById('w-url'); if(wUrl) w.bgUrl = wUrl.value;
        w.factions.forEach(f => { const elN = document.getElementById(`f-n-${f.id}`); if(elN) f.name = elN.value; const elD = document.getElementById(`f-d-${f.id}`); if(elD) f.desc = elD.value; const elS = document.getElementById(`f-s-${f.id}`); if(elS) f.secret = elS.value; });
        w.loreFolders.forEach(lf => { const elN = document.getElementById(`lf-n-${lf.id}`); if(elN) lf.name = elN.value; const elD = document.getElementById(`lf-d-${lf.id}`); if(elD) lf.desc = elD.value; });
        w.lores.forEach(l => { const elFld = document.getElementById(`l-fld-${l.id}`); if(elFld) l.folderId = elFld.value; const elN = document.getElementById(`l-n-${l.id}`); if(elN) l.keyword = elN.value; const elTrig = document.getElementById(`l-trig-${l.id}`); if(elTrig) l.triggerLocId = elTrig.value; const elD = document.getElementById(`l-d-${l.id}`); if(elD) l.desc = elD.value; });
        w.regions.forEach(reg => { const elN = document.getElementById(`reg-n-${reg.id}`); if(elN) reg.name = elN.value; const elD = document.getElementById(`reg-d-${reg.id}`); if(elD) reg.desc = elD.value; });
        w.locations.forEach(loc => { const elN = document.getElementById(`loc-n-${loc.id}`); if(elN) loc.name = elN.value; const elR = document.getElementById(`loc-r-${loc.id}`); if(elR) loc.regionId = elR.value; const elD = document.getElementById(`loc-d-${loc.id}`); if(elD) loc.desc = elD.value; });
    },
    syncCharDOM: function() {
        const w = this.getTargetWorld(); if(!w) return;
        w.characters.forEach(c => { const elN = document.getElementById(`c-n-${c.id}`); if(elN) c.keyword = elN.value; const elTrig = document.getElementById(`c-trig-${c.id}`); if(elTrig) c.triggerLocId = elTrig.value; const elD = document.getElementById(`c-d-${c.id}`); if(elD) c.desc = elD.value; const elS = document.getElementById(`c-s-${c.id}`); if(elS) c.secret = elS.value; });
    },
    saveWorld: function() { this.syncWorldDOM(); if(!confirm("저장하시겠습니까?")) return; const w = this.getTargetWorld(); w.factions = w.factions.map(f=>({ ...f, name:(f.name||'').trim() })).filter(x=>x.name); w.loreFolders = w.loreFolders.map(lf=>({ ...lf, name:(lf.name||'').trim() })).filter(x=>x.name); w.lores = w.lores.map(l=>({ ...l, keyword:(l.keyword||'').trim() })).filter(x=>x.keyword); w.regions = w.regions.map(reg=>({ ...reg, name:(reg.name||'').trim() })).filter(x=>x.name); w.locations = w.locations.map(loc=>({ ...loc, name:(loc.name||'').trim() })).filter(x=>x.name); this.forceSave(); UI.showToast("저장 완료"); UI.renderWorld(); if(this.state.activeRoomId) App.loadActiveRoom(); },
    saveCharacters: function() { this.syncCharDOM(); if(!confirm("저장하시겠습니까?")) return; const w = this.getTargetWorld(); const newChars = w.characters.map(c=>{ if(c.id==='sys') return { ...c, keyword:(c.keyword||'').trim() }; return { ...c, keyword:(c.keyword||'').trim() }; }).filter(x=>x.keyword); const names = new Set(); let hasDup=false; for(let nc of newChars) { if(nc.id !== 'sys' && names.has(nc.keyword)) { alert(`중복 이름: ${nc.keyword}`); hasDup=true; break; } names.add(nc.keyword); } if(hasDup) return; w.characters = newChars; this.forceSave(); UI.showToast("저장 완료"); UI.renderCharacters(); if(this.state.activeRoomId) App.loadActiveRoom(); },
    saveRoomMemory: function() { this.forceSave(); UI.showToast("기억 수동 저장 완료"); },
    saveNetwork: function() { if(!confirm("저장하시겠습니까?")) return; this.forceSave(); UI.editNetwork(false); UI.renderNetworkArchive(); UI.showToast("저장 완료"); },

    exportData: function() { if(!confirm("전체 데이터를 백업하시겠습니까?")) return; const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state)); a.download=`genesis_v${this.VERSION}.json`; a.click(); },
    exportChatToTxt: function() { if(!confirm("대화 내역을 저장하시겠습니까?")) return; const r = this.getActiveRoom(); const w = r.worldInstance; let txt = `=== ${r.name} ===\n\n`; r.history.forEach(m => { let speaker = m.role === 'user' ? (w.characters.find(c=>c.id===r.myCharId)?.keyword || 'USER') : (m.charIds || ['sys']).map(id => w.characters.find(c=>c.id===id)?.keyword).filter(x=>x).join(', ') || '시뮬레이터'; txt += `[${speaker}]\n${m.variants[m.currentVariant]}\n\n`; }); const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'})); a.download=`${r.name}.txt`; a.click(); },
    importData: function(e) { 
        const r = new FileReader(); 
        r.onload = (ev) => { 
            try { 
                const st = JSON.parse(ev.target.result); 
                Object.keys(localStorage).forEach(k => { if(k.startsWith('rpRoom_v') || k.startsWith('rpWorld_v') || k.startsWith('rpMaster_v')) localStorage.removeItem(k); }); 
                const m = { apiKey: st.apiKey, modelName: st.modelName, safety: st.safety, roomTags: st.roomTags, worlds: st.worlds.map(w=>({id:w.id, name:w.name})), rooms: st.rooms.map(rm=>({id:rm.id, name:rm.name, lastUpdated:rm.lastUpdated})) }; 
                localStorage.setItem(`rpMaster_v${this.VERSION}`, JSON.stringify(m)); 
                st.worlds.forEach(w => localStorage.setItem(`rpWorld_v${this.VERSION}_` + w.id, JSON.stringify(w))); 
                st.rooms.forEach(rm => localStorage.setItem(`rpRoom_v${this.VERSION}_` + rm.id, JSON.stringify(rm))); 
                location.reload(); 
            } catch(er) { alert("올바른 백업 파일이 아닙니다."); } 
        }; 
        if(e.target.files[0]) r.readAsText(e.target.files[0]); 
    }
};