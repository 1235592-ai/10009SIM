window.Dice = {
    refreshDiceUI: function() {
        const r = Store.getActiveRoom();
        if(!r) return;
        const w = r.worldInstance;
        
        const myChar = w.characters.find(c => c.id === r.myCharId);
        const mySel = document.getElementById('dice-my-stat');
        if(mySel) {
            mySel.innerHTML = '<option value="">스탯 선택</option>';
            if(myChar && myChar.stats) {
                myChar.stats.forEach(s => {
                    if(s.active !== false) mySel.innerHTML += `<option value="${s.n}">${s.n} (${s.v})</option>`;
                });
            }
        }

        const npcSel = document.getElementById('dice-npc-stat');
        if(npcSel) {
            npcSel.innerHTML = '<option value="">NPC 스탯 선택</option>';
            r.activeCharIds.forEach(npcId => {
                const npc = w.characters.find(c => c.id === npcId);
                if(npc && npc.id !== 'sys' && npc.stats) {
                    npcSel.innerHTML += `<optgroup label="${npc.keyword}">`;
                    npc.stats.forEach(s => {
                        if(s.active !== false) npcSel.innerHTML += `<option value="${npc.keyword}|${s.n}">${npc.keyword} - ${s.n} (${s.v})</option>`;
                    });
                    npcSel.innerHTML += `</optgroup>`;
                }
            });
        }
    },

    onChangeType: function() {
        const type = document.getElementById('dice-type').value;
        const mySel = document.getElementById('dice-my-stat');
        const vsTxt = document.getElementById('dice-vs-txt');
        const npcSel = document.getElementById('dice-npc-stat');
        const customBox = document.getElementById('dice-custom-container');

        if(type === 'single') {
            mySel.style.display = 'inline-block';
            vsTxt.style.display = 'none';
            npcSel.style.display = 'none';
            customBox.style.display = 'none';
        } else if (type === 'opposed') {
            mySel.style.display = 'inline-block';
            vsTxt.style.display = 'inline-block';
            npcSel.style.display = 'inline-block';
            customBox.style.display = 'none';
        } else {
            mySel.style.display = 'none';
            vsTxt.style.display = 'none';
            npcSel.style.display = 'none';
            customBox.style.display = 'flex';
        }
    },

    getDiceResultStr: function() {
        const isEnabled = document.getElementById('dice-enable')?.checked;
        if(!isEnabled) return "";

        const type = document.getElementById('dice-type').value;
        let resultStr = "";

        if(type === 'single') {
            const statName = document.getElementById('dice-my-stat').value;
            if(!statName) { UI.showToast("굴릴 스탯을 선택하세요."); return ""; }
            
            const roll = Math.floor(Math.random() * 100) + 1;
            resultStr = `\n[🎲 주사위 판정 (단일)]\n- 타겟 스탯: ${statName}\n- 결과: 1d100 ➔ **${roll}**\n`;
        } 
        else if (type === 'opposed') {
            const myStat = document.getElementById('dice-my-stat').value;
            const npcVal = document.getElementById('dice-npc-stat').value;
            if(!myStat || !npcVal) { UI.showToast("굴릴 스탯과 대상 NPC 스탯을 모두 선택하세요."); return ""; }
            
            const myRoll = Math.floor(Math.random() * 100) + 1;
            const npcRoll = Math.floor(Math.random() * 100) + 1;
            const npcParts = npcVal.split('|');
            
            resultStr = `\n[🎲 주사위 판정 (대항)]\n- 나의 [${myStat}]: 1d100 ➔ **${myRoll}**\n- ${npcParts[0]}의 [${npcParts[1]}]: 1d100 ➔ **${npcRoll}**\n`;
        } 
        else if (type === 'custom') {
            const obj = document.getElementById('dice-custom-obj').value.trim() || '자유 굴림';
            const n = parseInt(document.getElementById('dice-custom-n').value) || 1;
            const sides = parseInt(document.getElementById('dice-custom-sides').value) || 20;
            
            let total = 0;
            let rolls = [];
            for(let i=0; i<n; i++) {
                const r = Math.floor(Math.random() * sides) + 1;
                total += r;
                rolls.push(r);
            }
            
            resultStr = `\n[🎲 주사위 판정: ${obj}]\n- 굴림: ${n}d${sides}\n- 결과: [${rolls.join(', ')}] ➔ 총합 **${total}**\n`;
        }

        // 굴림이 성공적으로 끝나면 주사위 토글 자동 해제 (다음 턴 연속 굴림 방지)
        document.getElementById('dice-enable').checked = false;
        UI.syncActionState('dice');
        
        return resultStr;
    }
};
