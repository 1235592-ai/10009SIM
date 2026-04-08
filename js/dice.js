window.Dice = {
    // 🔥 스탯 텍스트 생성기 (hideValue가 true면 숫자를 아예 날려버림)
    renderOptions: function(chars, hideValue) {
        let html = '';
        chars.forEach(c => {
            if(c.stats) c.stats.filter(s=>s.active!==false).forEach(s => {
                const label = hideValue ? `${UI.esc(c.keyword)} - ${UI.esc(s.n)}` : `${UI.esc(c.keyword)} - ${UI.esc(s.n)}(${s.v})`;
                html += `<option value="${c.id}|${UI.esc(s.n)}|${s.v}">${label}</option>`;
            });
        });
        return html;
    },

    refreshDiceUI: function() { 
        const r = Store.getActiveRoom(); if(!r) return; 
        const w = r.worldInstance; 
        const my = w.characters.find(c=>c.id===r.myCharId); 
        const npcs = r.activeCharIds.map(id => w.characters.find(c=>c.id===id)).filter(c=>c&&c.id!=='sys'); 
        
        // 화면이 다시 그려져도 날아가지 않게 기존 선택값 백업
        const mySel = document.getElementById('dice-my-stat').value;
        const npcSel = document.getElementById('dice-npc-stat').value;

        // 🔥 내 스탯은 무조건 보여줌 (false)
        const myHtml = my ? this.renderOptions([my], false) : '';
        document.getElementById('dice-my-stat').innerHTML = myHtml || `<option value="">스탯 없음</option>`;
        
        // 🔥 NPC 스탯은 무조건 가림 (true)
        const npcHtml = this.renderOptions(npcs, true);
        document.getElementById('dice-npc-stat').innerHTML = npcHtml || `<option value="">스탯 없음</option>`;
        
        // 기존 선택값 즉시 복구 (상태 무한 유지)
        if(mySel) document.getElementById('dice-my-stat').value = mySel;
        if(npcSel) document.getElementById('dice-npc-stat').value = npcSel;
        
        this.updateModeUI(); 
    },
    
    updateModeUI: function() { 
        const t = document.getElementById('dice-type').value; 
        const myStat = document.getElementById('dice-my-stat');
        const npcStat = document.getElementById('dice-npc-stat');
        const vsTxt = document.getElementById('dice-vs-txt');
        const custContainer = document.getElementById('dice-custom-container');
        
        if(t === 'single') { 
            myStat.style.display = 'inline-block'; vsTxt.style.display = 'none'; npcStat.style.display = 'none'; custContainer.style.display = 'none'; 
        } else if(t === 'opposed') { 
            myStat.style.display = 'inline-block'; vsTxt.style.display = 'inline'; npcStat.style.display = 'inline-block'; custContainer.style.display = 'none'; 
        } else if(t === 'custom') {
            myStat.style.display = 'none'; vsTxt.style.display = 'none'; npcStat.style.display = 'none'; custContainer.style.display = 'flex';
        }
    },

    onChangeType: function() {
        this.refreshDiceUI(); 
    },

    calcRoll: function(stat) { 
        const roll = Math.floor(Math.random() * 100) + 1; const crit = Math.max(2, Math.floor(stat * 0.1)); 
        const failRange = 100 - stat; const fumbleRange = Math.max(1, Math.ceil(failRange * 0.05)); const fumble = stat >= 100 ? 101 : (100 - fumbleRange + 1); 
        let res = '실패'; let level = 1; if(roll === 1 || roll <= crit) { res = '대성공'; level = 3; } else if(roll >= fumble) { res = '대실패'; level = 0; } else if(roll <= stat) { res = '성공'; level = 2; } 
        return { roll, stat, res, level, margin: stat - roll }; 
    },

    calcCustomRoll: function(expr) {
        try {
            let str = expr.replace(/\s+/g, '').toLowerCase();
            const match = str.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
            if(!match) return { error: true, msg: "포맷 오류 (예: 2d6 또는 1d20+3)" };
            
            let n = parseInt(match[1], 10);
            let sides = parseInt(match[2], 10);
            let mod = 0;
            if(match[3] && match[4]) {
                mod = parseInt(match[4], 10);
                if(match[3] === '-') mod = -mod;
            }
            
            if(n < 1 || n > 20) return { error: true, msg: "개수 초과 (1~20개)" };
            if(sides < 2 || sides > 1000) return { error: true, msg: "면수 오류 (2~1000면)" };
            
            let total = 0;
            let rolls = [];
            for(let i=0; i<n; i++) {
                let r = Math.floor(Math.random() * sides) + 1;
                rolls.push(r);
                total += r;
            }
            total += mod;
            
            let detail = `${n}d${sides}` + (mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ``);
            let rollStr = rolls.join(' + ');
            return { error: false, detail, rollStr, mod, total, isSingle: (n === 1) };
        } catch(e) {
            return { error: true, msg: "수식 오류" };
        }
    },

    getDiceResultStr: function() { 
        if(!document.getElementById('dice-enable').checked) return ""; 
        const type = document.getElementById('dice-type').value;
        
        if (type === 'custom') {
            const expr = document.getElementById('dice-custom-expr').value || "1d20";
            const obj = document.getElementById('dice-custom-obj').value.trim();
            const res = this.calcCustomRoll(expr);
            
            if(res.error) return `[🎲 커스텀 굴림: ${res.msg}]\n`;
            
            const title = obj ? `커스텀 굴림 (${obj})` : `커스텀 굴림`;
            let resStr = `[🎲 ${title}: ${res.detail} → ${res.rollStr}`;
            if (res.mod !== 0) resStr += ` ${res.mod > 0 ? '+' : '-'} ${Math.abs(res.mod)}`;
            if (!res.isSingle || res.mod !== 0) resStr += ` = ${res.total}`;
            resStr += `]\n`;
            return resStr;
        }

        const isOpp = type === 'opposed'; 
        const v1 = document.getElementById('dice-my-stat').value; if(!v1) return ""; 
        const [i1, n1, val1] = v1.split('|'); const r1 = this.calcRoll(Number(val1)); 
        
        if(!isOpp) return `[🎲 ${n1} 판정: D100 → ${r1.roll} vs ${r1.stat} → ${r1.res}]\n`; 
        else { 
            const v2 = document.getElementById('dice-npc-stat').value; if(!v2) return ""; 
            const [i2, n2, val2] = v2.split('|'); const r2 = this.calcRoll(Number(val2)); 
            let winner = '무승부 (판단 필요)'; if(r1.level > r2.level) winner = '플레이어 우위'; else if(r1.level < r2.level) winner = '상대 우위'; else { if(r1.margin > r2.margin) winner = '플레이어 우위'; else if(r1.margin < r2.margin) winner = '상대 우위'; } 
            
            // 🔥 채팅에 출력될 때는 찐 숫자가 시원하게 공개됨
            return `[⚔️ 대항: ${n1} D100→${r1.roll}/${r1.stat} ${r1.res} vs ${n2} D100→${r2.roll}/${r2.stat} ${r2.res} → ${winner}]\n`; 
        } 
    }
};
