window.Dice = {
    refreshDiceUI: function() { 
        const r = Store.getActiveRoom(); if(!r) return; const w = r.worldInstance; const my = w.characters.find(c=>c.id===r.myCharId); 
        const myHtml = my && my.stats ? my.stats.filter(s=>s.active!==false).map(s => `<option value="${my.id}|${UI.esc(s.n)}|${s.v}">${UI.esc(my.keyword)} - ${UI.esc(s.n)}(${s.v})</option>`).join('') : ''; 
        document.getElementById('dice-my-stat').innerHTML = myHtml || `<option value="">스탯 없음</option>`; 
        const npcs = r.activeCharIds.map(id => w.characters.find(c=>c.id===id)).filter(c=>c&&c.id!=='sys'); 
        let npcHtml = ''; npcs.forEach(n => { if(n.stats) n.stats.filter(s=>s.active!==false).forEach(s => { npcHtml += `<option value="${n.id}|${UI.esc(s.n)}|${s.v}">${UI.esc(n.keyword)} - ${UI.esc(s.n)}(${s.v})</option>`; }); }); 
        document.getElementById('dice-npc-stat').innerHTML = npcHtml || `<option value="">스탯 없음</option>`; 
        this.updateMode(); 
    },
    updateMode: function() { 
        const t = document.getElementById('dice-type').value; 
        if(t==='single') { document.getElementById('dice-vs-txt').style.display='none'; document.getElementById('dice-npc-stat').style.display='none'; } 
        else { document.getElementById('dice-vs-txt').style.display='inline'; document.getElementById('dice-npc-stat').style.display='inline-block'; } 
    },
    calcRoll: function(stat) { 
        const roll = Math.floor(Math.random() * 100) + 1; const crit = Math.max(2, Math.floor(stat * 0.1)); 
        const failRange = 100 - stat; const fumbleRange = Math.max(1, Math.ceil(failRange * 0.05)); const fumble = stat >= 100 ? 101 : (100 - fumbleRange + 1); 
        let res = '실패'; let level = 1; if(roll === 1 || roll <= crit) { res = '대성공'; level = 3; } else if(roll >= fumble) { res = '대실패'; level = 0; } else if(roll <= stat) { res = '성공'; level = 2; } 
        return { roll, stat, res, level, margin: stat - roll }; 
    },
    getDiceResultStr: function() { 
        if(!document.getElementById('dice-enable').checked) return ""; 
        const isOpp = document.getElementById('dice-type').value === 'opposed'; const v1 = document.getElementById('dice-my-stat').value; if(!v1) return ""; 
        const [i1, n1, val1] = v1.split('|'); const r1 = this.calcRoll(Number(val1)); 
        if(!isOpp) return `[🎲 ${n1} 판정: D100 → ${r1.roll} vs ${r1.stat} → ${r1.res}]\n`; 
        else { 
            const v2 = document.getElementById('dice-npc-stat').value; if(!v2) return ""; 
            const [i2, n2, val2] = v2.split('|'); const r2 = this.calcRoll(Number(val2)); 
            let winner = '무승부 (판단 필요)'; if(r1.level > r2.level) winner = '플레이어 우위'; else if(r1.level < r2.level) winner = '상대 우위'; else { if(r1.margin > r2.margin) winner = '플레이어 우위'; else if(r1.margin < r2.margin) winner = '상대 우위'; } 
            return `[⚔️ 대항: ${n1} D100→${r1.roll}/${r1.stat} ${r1.res} vs ${n2} D100→${r2.roll}/${r2.stat} ${r2.res} → ${winner}]\n`; 
        } 
    }
};