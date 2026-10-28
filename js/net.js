// 시스템 보드의 정보망: 수신함 / 커뮤니티 / 다크웹(광장)
// AI는 JSON 데이터만 만들고, 화면은 여기서 그린다.
window.Net = {
    tab: 'inbox',
    busy: false,
    openId: null,
    search: { community: null, darkweb: null },   // { query, posts } — 저장하지 않는 검색 결과
    POSTS_PER_PAGE: 3,
    SEEN_LIMIT: 30,

    // ---------- 출력 규칙 (네트워크 문서 기준) ----------
    COMMON_RULES: `- 너는 이야기 밖의 화면 생성기다. 인사, 설명, 사담 없이 지정된 JSON 객체만 반환한다.
- 공개된 정보만 반영한다. 비공개 사정, 숨긴 능력, 관리청·길드 내부 사정, 비밀은 추측이나 루머 형태로만 나온다.
- 세계의 시간은 최근 진행과 상황 요약을 따른다. 현실 시각을 쓰지 않는다. 작성 시간은 "3시간 전", "어제"처럼 상대 표기로 쓴다.
- 「인물」 데이터의 인물 본인은 그 인물이 글이나 메시지를 쓸 개연성이 분명할 때만 등장시킨다. 기본적으로 작성자는 무명이다.`,

    WRITER_RULES: `[작성자와 말투]
- 작성자는 일반인, 하위 등급 헌터, 길드 관계자, 기자, 안티, 헌터 팬 등 다양하다. 닉네임은 그 사람의 성향이 드러나게 짓고, 글의 말투를 닉네임과 맞춘다.
- 한 작성자는 제목과 본문을 포함한 글 하나 안에서 어미, 격식, 줄임말 사용 정도를 바꾸지 않는다. 단, 의도적인 어그로 제목은 본문과 말투가 달라도 된다. 같은 닉네임이 다시 나오면 같은 말투를 쓴다.
- 작성자마다 말투와 길이를 다르게 한다. 기자는 기사체, 팬은 호들갑, 안티는 비꼬는 투, 하위 헌터는 푸념처럼 쓰고, 어미(반말, 존댓말, 해요체, 음슴체, 다나까)도 작성자마다 달리한다. 댓글 길이는 한두 단어부터 여러 문장까지 섞는다.
- 한 출력 안에서 같은 어미를 쓰는 작성자가 절반을 넘지 않게 한다.
- 기사체, 존댓말, 다나까를 쓰는 작성자는 초성체(ㄹㅇ, ㅇㅇ), 비속어, 인터넷 줄임말을 쓰지 않는다. 초성체와 비속어는 반말이나 음슴체를 쓰는 작성자만 쓴다.`,

    COMMUNITY_RULES: `[커뮤니티]
- 헌터용 통합 네트워크의 일반 게시판이다. 월간 활성 이용자 300만~500만, 글이나 댓글을 쓰는 사람은 그중 수십만이다.
- 말머리(tag): [공지] [자유] [질문] [공략] [사건사고] [랭킹] [마켓] [팬] [토론] [뉴스] [익명] [가이츠] 중 하나.
  - [마켓]: 거래 후기와 시세 이야기. [익명]: 헌터 등급 표기가 숨겨진다. 폭로, 내부 불만이 주로 올라온다. [가이츠]: 가이츠의 기행 모아보기 겸 격리 탭.
- 작성자 등급(grade): 헌터는 "C급"처럼, 은퇴 헌터는 "은퇴·B급"처럼 쓴다. 일반인은 빈 문자열. [익명] 글과 그 댓글은 모두 빈 문자열.
- 수치: 일반 글은 댓글 수십 개, 추천 수십~수백. 인기글은 추천 1,000 이상, 댓글 수백(popular=true). 대형 화제(S급 사고, 대형 게이트)는 댓글 수천, 추천 1만 안팎이 상한. 조회수는 없다.
- 의견은 갈리며 오해, 과장, 루머, 등급 차별, 뒷북이 섞인다.
- 헌터는 운동선수나 아이돌 같은 공인 취급이다. 목격 사진, 직찍, 경기 사진은 흔히 올라오며, 심한 사생활 침해(집 주소, 가족 신상, 가이츠·필그림의 맨얼굴 폭로 등)가 아니면 지나치게 조심하지 않는다. 심한 침해 글은 삭제되거나 비난받는다. 목격담은 주로 [자유]에 올라온다.
- 단골 소재: 분기 레이트 순위 갱신, 랭킹전과 랭킹 변동, 아레나 리그, 단독 토벌 성공·부상, 버스 의혹, 서포터 등급제 논쟁, 헌터 팬덤, 연예계 특화 헌터에 대한 "실력보다 얼굴" 비판, 버뱅크 영상, 박다니엘 은퇴와 대균열에 대한 뒷말, 헌터의 식욕·성욕에 대한 희롱성 농담.`,

    DARKWEB_RULES: `[다크웹 광장 (🧱 Bystreet)]
- 헌터넷 바깥의 불법 사이트 Bystreet의 익명 잡담 구획이다. 운영 주체는 생흔이라는 소문이 있으나 진위는 불명이다.
- 이용자는 헌터넷 커뮤니티를 검열이 심하고 위선적인 곳으로 보고 비웃는다. 헌터넷에서 삭제된 글이 퍼 날라지기도 한다.
- 소문을 사실로 단정하거나 근거 없는 루머를 만들어 퍼뜨리는 일이 흔하다. 확인된 정보와 지어낸 말이 구분 없이 섞인다.
- 헌터 목격 사진, 몰래 찍은 사진, 사생활 사진이 그대로 올라온다. 헌터 얼굴을 외설적인 사진에 합성한 합성물도 자주 올라온다.
- 비밀 정보는 여기서도 사실로 드러나지 않는다. 가이츠·필그림의 맨얼굴이라며 올라오는 사진은 가짜이거나 진위를 확인할 수 없는 것으로 남는다.
- 작성자는 모두 "익명", 등급은 빈 문자열, 말머리(tag)는 "광장".
- 말투의 격식 묶음 규칙은 적용하지 않는다. 욕설, 비속어, 초성체, 인터넷 은어를 거르지 않는다.
- 내용은 헌터에 대한 노골적인 성적 대상화, 음담, 심한 비하와 혐오, 신상 캐기, 관리청·길드 욕 등이다. 일반 커뮤니티에서 삭제될 수위를 기본으로 한다.
- 외관상 미성년으로 보이는 인물은 성적 소재로 다루지 않는다.
- 수치: 일반 글 추천 수십, 화제 글 추천 수백, 댓글 수십~수백.`,

    POST_BODY_RULES: `[게시글 본문과 댓글]
- 본문: 대부분 3~5문단으로 쓰고, 한두 문장짜리 짧은 글은 일부만 둔다. 3문장이 넘어가면 내용 단위로 문단을 나누고 문단 사이에 빈 줄(\\n\\n)을 둔다. 문단 안의 문장은 이어 쓴다.
- 첨부: 사진·영상은 본문 해당 위치에 별도 문단으로 [~한 사진. 누가 무엇을 하고 있다.] 또는 [~한 영상. 누가 무엇을 하고 있다.] 형식으로 묘사한다. 작성자의 말은 첨부 바깥에 쓴다.
- 댓글: 정확히 10개. 댓글 안에서 줄바꿈하지 않는다. 사진이나 짤은 첨부할 수 없고 이모지는 쓸 수 있다.
- 답댓글(replies): 모든 댓글에 달지 않고 논쟁이나 대화가 붙을 만한 곳에만 단다. 댓글 10개에 포함하지 않는다.`,

    INBOX_RULES: `[수신함]
- 사용자 캐릭터 개인 앞으로 오는 채널이다. 단체방은 없다.
- 종류(kind): official(공문: 관리청·길드의 공식 문서, 헌터·보조 자격증 소지자 계정에만 온다), message(1:1 메시지), alert(거래, 모집, 지급 등 자동 알림).
- 공문·알림은 제목만 미리보기로 쓴다. 메시지는 마지막 메시지 앞부분을 발신자 말투 그대로 25자 안팎까지 쓰고 "..."로 끊는다.
- 발신자는 이름만 쓰고 등급을 붙이지 않는다.
- 종류마다 2~3개. 안 읽은 것이 먼저, 그다음 최신순.
- 공문·알림에는 커뮤니티 말투 규칙을 적용하지 않는다. 메시지는 발신자 본인의 말투로 쓴다.`,

    // ---------- 상태 ----------
    state: function(r) {
        if(!r.net) r.net = {};
        if(!r.net.inbox) r.net.inbox = { account: '', items: [] };
        if(!r.net.community) r.net.community = { posts: [], seen: [] };
        if(!r.net.darkweb) r.net.darkweb = { posts: [], seen: [] };
        return r.net;
    },
    uid: function(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },
    myChar: function(r) { return r.worldInstance.characters.find(c => c.id === r.myCharId) || { keyword: '플레이어', desc: '' }; },

    // 정보망 생성 재료: 비밀 칸과 세계관 전용 지침은 넣지 않는다 (공개 정보만)
    context: function(r) {
        const w = r.worldInstance; const my = this.myChar(r);
        const chars = w.characters.filter(c => c.id !== 'sys' && c.id !== r.myCharId && !c.isHidden && c.keyword)
            .map(c => `- ${c.keyword}: ${(c.desc || '').replace(/\n/g, ' ').substring(0, 300)}`).join('\n');
        const facs = w.factions.filter(f => f.name).map(f => `- ${f.name}: ${(f.desc || '').replace(/\n/g, ' ').substring(0, 200)}`).join('\n');
        const recent = r.history.slice(-8).filter(m => !m.hidden).map(m => `${m.role === 'user' ? '[사용자]' : '[서술]'} ${m.variants[m.currentVariant]}`).join('\n\n');
        return `[세계관: ${w.name}]\n${w.prompt || ''}\n\n[사용자 캐릭터]\n${my.keyword}: ${(my.desc || '').substring(0, 600)}\n\n[인물 (공개 정보)]\n${chars || '없음'}\n\n[세력 (공개 정보)]\n${facs || '없음'}\n\n[상황 요약]\n${r.memory || '없음'}\n\n[최근 진행]\n${recent || '없음'}`;
    },
    safetyLines: function() {
        const lines = []; API.SAFETY_ITEMS.forEach(it => { const v = Store.state.safety[it.key] || {}; if(v.user) lines.push(it.user); if(v.npc) lines.push(it.npc); });
        return lines.length ? `\n[통제 규칙]\n- ${lines.join('\n- ')}` : '';
    },
    generate: async function(task, r) {
        const sys = `${this.COMMON_RULES}${this.safetyLines()}`;
        const prompt = `${this.context(r)}\n\n${task}`;
        const text = await API.callLLM([{ role: 'user', parts: [{ text: prompt }] }], sys, { temp: 0.95, jsonMode: true });
        const data = API.parseAIJsonRaw(text);
        if(!data) throw new Error('응답 형식이 올바르지 않습니다. 다시 시도해 주세요.');
        return data;
    },
    run: async function(fn) {
        if(this.busy) return;
        if(!Store.state.apiKey) return alert("설정 탭에서 API Key를 먼저 입력해주세요!");
        this.busy = true; this.render();
        try { await fn(); Store.forceSave(); }
        catch(e) { alert("정보망 생성 실패: " + e.message); }
        finally { this.busy = false; this.render(); }
    },

    // ---------- 게시판 (커뮤니티 / 다크웹 광장) ----------
    boardRules: function(board) { return (board === 'community' ? this.COMMUNITY_RULES + '\n\n' + this.WRITER_RULES : this.DARKWEB_RULES); },
    POST_LIST_FORMAT: `{"posts":[{"tag":"말머리(괄호 없이)","title":"한 줄 안의 짧은 제목","author":"닉네임","grade":"등급 또는 빈 문자열","time":"상대 시간","up":숫자,"down":숫자,"comments":전체 댓글 수,"popular":true/false}]}`,

    refreshBoard: function(board) {
        const r = Store.getActiveRoom(); const st = this.state(r)[board];
        this.run(async () => {
            const kind = board === 'community' ? '커뮤니티 실시간 인기글' : '다크웹 광장 화제글';
            const task = `${this.boardRules(board)}\n\n[작업]\n${kind} ${this.POSTS_PER_PAGE}개의 목록을 만든다. 현재 장면과 관련된 소식을 우선한다.${board === 'community' ? ' 모두 인기글이므로 추천 1,000 이상, popular=true.' : ''}\n- 아래 제목의 글은 이미 나왔으므로 다시 쓰지 않는다:\n${st.seen.map(t => '  - ' + t).join('\n') || '  (없음)'}\n\n[출력 JSON 형식]\n${this.POST_LIST_FORMAT}`;
            const data = await this.generate(task, r);
            st.posts = (data.posts || []).slice(0, this.POSTS_PER_PAGE).map(p => ({ ...p, id: this.uid('p'), detail: null }));
            st.seen = [...st.seen, ...st.posts.map(p => p.title)].slice(-this.SEEN_LIMIT);
            this.search[board] = null; this.openId = null;
        });
    },
    searchBoard: function(board) {
        const input = document.getElementById('net-search-input'); const q = input ? input.value.trim() : '';
        if(!q) return;
        const r = Store.getActiveRoom();
        this.run(async () => {
            const task = `${this.boardRules(board)}\n\n[작업]\n검색어 "${q}"와 관련된 게시글 ${this.POSTS_PER_PAGE}개의 목록을 만든다. 인기글이 아니어도 되며 수치는 기준을 따른다. 검색어가 문장이면 그 내용과 관련된 글을 고른다.\n\n[출력 JSON 형식]\n${this.POST_LIST_FORMAT}`;
            const data = await this.generate(task, r);
            this.search[board] = { query: q, posts: (data.posts || []).slice(0, this.POSTS_PER_PAGE).map(p => ({ ...p, id: this.uid('p'), detail: null })) };
            this.openId = null;
        });
    },
    findPost: function(board, id) {
        const st = this.state(Store.getActiveRoom())[board];
        return st.posts.find(p => p.id === id) || (this.search[board]?.posts || []).find(p => p.id === id);
    },
    openPost: function(board, id) {
        if(this.openId === id) { this.openId = null; return this.render(); }
        this.openId = id;
        const post = this.findPost(board, id); if(!post) return;
        if(post.detail) return this.render();
        const r = Store.getActiveRoom();
        this.run(async () => {
            const task = `${this.boardRules(board)}\n\n${this.POST_BODY_RULES}\n\n[작업]\n아래 게시글의 본문과 댓글을 쓴다. 목록에 표시된 제목, 작성자, 수치와 일치하게 쓴다.\n${JSON.stringify({ tag: post.tag, title: post.title, author: post.author, grade: post.grade, time: post.time, up: post.up, down: post.down, comments: post.comments })}\n\n[출력 JSON 형식]\n{"body":"본문 (문단 사이 빈 줄)","comments":[{"author":"닉네임","grade":"등급 또는 빈 문자열","text":"내용","up":숫자,"down":숫자,"replies":[{"author":"","grade":"","text":"","up":숫자,"down":숫자}]}]}`;
            const data = await this.generate(task, r);
            post.detail = { body: data.body || '', comments: (data.comments || []).slice(0, 10) };
        });
    },
    sharePost: function(board, id) {
        const r = Store.getActiveRoom(); const post = this.findPost(board, id); if(!post || !post.detail) return;
        const where = board === 'community' ? '커뮤니티' : '다크웹 광장';
        const comments = post.detail.comments.slice(0, 5).map(c => `- ${c.author}${c.grade ? ' [' + c.grade + ']' : ''}: ${c.text}`).join('\n');
        // 화면에는 보이지 않고 AI만 아는 메모로 대화 기록에 넣는다
        const text = `(공유: ${this.myChar(r).keyword}이(가) ${where}에서 본 글이다. 이 글을 아는 상태로 진행하되, 이야기 속에서 일부러 꺼내지 않는다.)\n[${post.tag}] ${post.title} — ${post.author}${post.grade ? ' [' + post.grade + ']' : ''} · ${post.time} · ↑${post.up} ↓${post.down}\n${post.detail.body}\n댓글:\n${comments}`;
        r.history.push({ role: 'user', hidden: true, kind: 'share', variants: [text], currentVariant: 0 });
        post.shared = true; Store.forceSave(); this.render(); UI.showToast("채팅 AI에게 공유했습니다.");
    },

    // ---------- 수신함 ----------
    refreshInbox: function() {
        const r = Store.getActiveRoom(); const st = this.state(r).inbox;
        this.run(async () => {
            const prev = st.items.map(i => ({ id: i.id, kind: i.kind, from: i.from, time: i.time, read: i.read, preview: i.preview }));
            const task = `${this.INBOX_RULES}\n\n[작업]\n사용자 캐릭터의 수신함 목록을 만든다.\n- 계정 줄(account): 이름 · 등급 · 소속을 한 줄로. 은퇴 헌터는 소속 자리에 "은퇴". 사용자 캐릭터 설명에서 읽는다.\n- 이전 목록이 있으면 같은 항목은 id를 그대로 두고 유지하되, 시간 경과에 맞게 경과 시간만 고친다. 내용과 수치는 상황이 바뀌었거나 세계 시간이 많이 지난 경우에만 바꾼다. 새 항목은 id를 null로 둔다. 오래된 항목은 빠질 수 있다.\n- 이전 목록: ${JSON.stringify(prev)}\n\n[출력 JSON 형식]\n{"account":"이름 · 등급 · 소속","items":[{"id":"기존 id 또는 null","kind":"official|message|alert","from":"발신자","time":"경과 시간","read":true/false,"preview":"미리보기"}]}`;
            const data = await this.generate(task, r);
            st.account = data.account || st.account;
            st.items = (data.items || []).map(it => {
                const old = it.id && st.items.find(x => x.id === it.id);
                return { ...(old || {}), kind: it.kind, from: it.from, time: it.time, read: old ? old.read || !!it.read : !!it.read, preview: it.preview, id: old ? old.id : this.uid('in'), detail: old ? old.detail : null };
            });
            this.openId = null;
        });
    },
    openInbox: function(id) {
        if(this.openId === id) { this.openId = null; return this.render(); }
        const r = Store.getActiveRoom(); const st = this.state(r).inbox; const item = st.items.find(i => i.id === id); if(!item) return;
        this.openId = id; item.read = true; item.openedAt = Date.now();
        if(item.detail) { Store.forceSave(); return this.render(); }
        this.run(async () => {
            let task;
            if(item.kind === 'message') {
                task = `${this.INBOX_RULES}\n\n[작업]\n아래 1:1 메시지 대화의 내용을 쓴다. 마지막 메시지는 미리보기와 이어지게 한다. 날짜가 바뀌는 곳은 date를 다르게 쓴다.\n- 롤플 시작 이전의 지난 대화에는 사용자 캐릭터가 보낸 메시지가 있어도 된다(말투는 그 캐릭터 설정을 따른다). 최근 진행 이후의 메시지는 사용자 캐릭터가 실제로 보낸 것만 쓴다.\n항목: ${JSON.stringify({ from: item.from, time: item.time, preview: item.preview })}\n사용자 캐릭터 이름: ${this.myChar(r).keyword}\n\n[출력 JSON 형식]\n{"messages":[{"date":"날짜 표기","from":"보낸 사람 이름","text":"내용","time":"시각"}]}`;
            } else {
                task = `${this.INBOX_RULES}\n\n[작업]\n아래 ${item.kind === 'official' ? '공문' : '알림'}의 전문을 쓴다. 본문은 문단 사이에 빈 줄을 둔다. 커뮤니티 말투 규칙은 적용하지 않는다.\n항목: ${JSON.stringify({ from: item.from, time: item.time, preview: item.preview })}\n\n[출력 JSON 형식]\n{"title":"제목","body":"본문"}`;
            }
            const data = await this.generate(task, r);
            item.detail = item.kind === 'message' ? { messages: data.messages || [] } : { title: data.title || item.preview, body: data.body || '' };
        });
    },
    composeTarget: null,
    startCompose: function() { this.openId = '__compose'; this.render(); },
    sendInbox: function(id) {
        const input = document.getElementById('net-reply-input'); const text = input ? input.value.trim() : ''; if(!text) return;
        const r = Store.getActiveRoom(); const st = this.state(r).inbox; const myName = this.myChar(r).keyword;
        let item;
        if(id === '__compose') {
            const toEl = document.getElementById('net-compose-to'); const to = toEl ? toEl.value.trim() : '';
            if(!to) return alert("받는 사람을 입력하세요.");
            item = st.items.find(i => i.kind === 'message' && i.from === to);
            if(!item) { item = { id: this.uid('in'), kind: 'message', from: to, time: '방금', read: true, preview: '', detail: { messages: [] } }; st.items.unshift(item); }
        } else item = st.items.find(i => i.id === id);
        if(!item) return;
        if(!item.detail) item.detail = { messages: [] };
        const last = item.detail.messages[item.detail.messages.length - 1];
        item.detail.messages.push({ date: last ? last.date : '', from: myName, text, time: '방금' });
        item.preview = text.substring(0, 25); item.time = '방금'; item.read = true; item.openedAt = Date.now();
        this.openId = item.id; if(input) input.value = '';
        this.run(async () => {
            const task = `${this.INBOX_RULES}\n\n[작업]\n${myName}이(가) ${item.from}에게 방금 메시지를 보냈다. ${item.from}의 답장을 쓴다.\n- ${item.from}은(는) 자기 성격, 관계, 상황대로 답한다. 답장할 이유가 없으면 답장하지 않는다(빈 배열).\n- "알았다" 정도로 짧게 끝나도 된다. 질문을 여러 개 쏟아붓지 않는다. 메시지는 0~2개.\n대화:\n${item.detail.messages.slice(-12).map(m => `${m.from}: ${m.text}`).join('\n')}\n\n[출력 JSON 형식]\n{"messages":[{"text":"내용","time":"시각"}]}`;
            const data = await this.generate(task, r);
            const replies = (data.messages || []).filter(m => m.text);
            replies.forEach(m => item.detail.messages.push({ date: last ? last.date : '', from: item.from, text: m.text, time: m.time || '방금' }));
            if(replies.length) item.preview = replies[replies.length - 1].text.substring(0, 25);
        });
    },

    // 채팅 AI에게 매 턴 넘기는 수신함 내용 (목록 + 열어본 전문)
    chatContext: function(r) {
        const st = r.net && r.net.inbox; if(!st || !st.items.length) return '';
        const kindName = { official: '공문', message: '메시지', alert: '알림' };
        const list = st.items.map(i => `- [${kindName[i.kind] || i.kind}] ${i.from} · ${i.time} — ${i.preview}`).join('\n');
        const opened = st.items.filter(i => i.detail && i.openedAt).sort((a, b) => b.openedAt - a.openedAt).slice(0, 5).map(i => {
            if(i.kind === 'message') return `<대화 상대="${i.from}">\n${i.detail.messages.slice(-10).map(m => `${m.from}: ${m.text}`).join('\n')}\n</대화>`;
            return `<${kindName[i.kind]} 발신="${i.from}">\n${i.detail.title}\n${(i.detail.body || '').substring(0, 600)}\n</${kindName[i.kind]}>`;
        }).join('\n');
        return `\n[수신함] (${this.myChar(r).keyword}의 개인 수신함. 열어본 내용은 ${this.myChar(r).keyword}이(가) 확인한 것이다)\n${st.account ? st.account + '\n' : ''}${list}\n${opened}\n`;
    },

    // ---------- 화면 ----------
    setTab: function(tab) { this.tab = tab; this.openId = null; this.render(); },
    esc: function(s) { return UI.esc(s); },
    para: function(text) {
        return (text || '').split(/\n\s*\n/).map(p => {
            const t = p.trim(); if(!t) return '';
            const html = this.esc(t).replace(/\n/g, '<br>');
            return /^\[.*(사진|영상).*\]$/.test(t) ? `<p class="net-attach">${html}</p>` : `<p>${html}</p>`;
        }).join('');
    },
    author: function(name, grade) { return `${this.esc(name)}${grade ? ` <span class="net-grade">[${this.esc(grade)}]</span>` : ''}`; },
    votes: function(up, down) { return `<code>↑${Number(up) || 0} ↓${Number(down) || 0}</code>`; },
    loading: function() { return this.busy ? '<div class="typing-indicator" style="margin:8px 0;"><span></span><span></span><span></span></div>' : ''; },

    render: function() {
        const view = document.getElementById('net-view'); if(!view) return;
        const r = Store.getActiveRoom(); if(!r) return;
        document.querySelectorAll('.net-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.tab));
        view.innerHTML = this.tab === 'inbox' ? this.renderInbox(r) : this.renderBoard(r, this.tab);
    },

    renderBoard: function(r, board) {
        const st = this.state(r)[board]; const s = this.search[board];
        const posts = s ? s.posts : st.posts;
        const head = board === 'community' ? '💬 커뮤니티' : '🧱 Bystreet · 광장';
        const dis = this.busy ? 'disabled' : '';
        let html = `<div class="net-title">${head}</div>
            <div class="net-search"><input id="net-search-input" class="input-std" placeholder="키워드나 문장으로 검색" value="${s ? this.esc(s.query) : ''}" onkeydown="if(event.key==='Enter' && !event.isComposing) Net.searchBoard('${board}')"><button class="btn-main" ${dis} onclick="Net.searchBoard('${board}')">🔍</button></div>
            <div class="net-bar"><span>${s ? `검색: ${this.esc(s.query)}` : (board === 'community' ? '실시간 인기글' : '광장 화제글')}</span><button class="btn-ghost" ${dis} onclick="Net.refreshBoard('${board}')">🔄 ${s ? '인기글로' : '새로고침'}</button></div>${this.loading()}`;
        if(!posts.length) return html + `<p class="hint">🔄 새로고침을 눌러 글을 불러오세요.</p>`;
        html += posts.map(p => {
            const open = this.openId === p.id;
            const tag = board === 'community' ? `<b>[${this.esc(p.tag)}]</b>${p.popular ? ' <b>[인기글]</b>' : ''} ` : '<b>[광장]</b> ';
            let body = '';
            if(open && p.detail) {
                body = `<div class="net-body">${this.para(p.detail.body)}</div>
                    <div class="net-divider">──── 댓글 ${Number(p.comments) || p.detail.comments.length} ────</div>
                    <ul class="net-comments">${p.detail.comments.map(c => `<li><b>${this.author(c.author, c.grade)}:</b> ${this.esc(c.text)} ${this.votes(c.up, c.down)}${(c.replies && c.replies.length) ? `<ul>${c.replies.map(rp => `<li>↳ <b>${this.author(rp.author, rp.grade)}:</b> ${this.esc(rp.text)} ${this.votes(rp.up, rp.down)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>
                    <button class="btn-main" style="margin-top:10px;" ${p.shared ? 'disabled' : ''} onclick="Net.sharePost('${board}','${p.id}')">${p.shared ? '✅ 채팅에 공유됨' : '📤 채팅에 공유'}</button>`;
            }
            return `<div class="net-card ${open ? 'open' : ''}">
                <div class="net-card-head" onclick="Net.openPost('${board}','${p.id}')">
                    <div class="net-card-title">${tag}${this.esc(p.title)}</div>
                    <div class="net-meta"><code>${this.author(p.author, p.grade)} · ${this.esc(p.time)} · ↑${Number(p.up) || 0} ↓${Number(p.down) || 0}</code> <span>💬 ${Number(p.comments) || 0}</span></div>
                </div>${body}</div>`;
        }).join('');
        return html;
    },

    renderInbox: function(r) {
        const st = this.state(r).inbox; const dis = this.busy ? 'disabled' : '';
        const kinds = [['official', '공문'], ['message', '메시지'], ['alert', '알림']];
        let html = `<div class="net-title">📨 수신함</div>
            <div class="net-bar">${st.account ? `<code>${this.esc(st.account)}</code>` : '<span></span>'}<span style="display:flex; gap:6px;"><button class="btn-ghost" ${dis} onclick="Net.startCompose()">✉️ 새 메시지</button><button class="btn-ghost" ${dis} onclick="Net.refreshInbox()">🔄</button></span></div>${this.loading()}`;
        if(this.openId === '__compose') {
            const names = r.worldInstance.characters.filter(c => c.id !== 'sys' && c.id !== r.myCharId && c.keyword).map(c => `<option value="${this.esc(c.keyword)}">`).join('');
            html += `<div class="net-card open"><div class="net-card-title">✉️ 새 메시지</div>
                <input id="net-compose-to" class="input-std" list="net-compose-names" placeholder="받는 사람 이름"><datalist id="net-compose-names">${names}</datalist>
                ${this.replyBox('__compose')}</div>`;
        }
        if(!st.items.length) return html + `<p class="hint">🔄 버튼을 눌러 수신함을 불러오세요.</p>`;
        kinds.forEach(([k, label]) => {
            const items = st.items.filter(i => i.kind === k).sort((a, b) => (a.read === b.read) ? 0 : (a.read ? 1 : -1));
            if(!items.length) return;
            html += `<div class="net-section">[${label}]</div>` + items.map(i => {
                const open = this.openId === i.id;
                let body = '';
                if(open && i.detail) {
                    if(i.kind === 'message') {
                        let lastDate = null;
                        body = `<div class="net-thread">${i.detail.messages.map(m => { const sep = m.date && m.date !== lastDate ? `<div class="net-date">── ${this.esc(m.date)} ──</div>` : ''; if(m.date) lastDate = m.date; return `${sep}<div class="net-msg"><b>${this.esc(m.from)}:</b> ${this.esc(m.text)} <code>${this.esc(m.time || '')}</code></div>`; }).join('')}</div>${this.replyBox(i.id)}`;
                    } else {
                        body = `<div class="net-body"><div class="net-card-title">${this.esc(i.detail.title)}</div><div class="net-meta"><code>${this.esc(i.from)} · ${this.esc(i.time)}</code></div>${this.para(i.detail.body)}</div>`;
                    }
                }
                return `<div class="net-card ${open ? 'open' : ''}"><div class="net-card-head" onclick="Net.openInbox('${i.id}')">${i.read ? '○' : '●'} <b>${this.esc(i.from)}</b> · ${this.esc(i.time)} — ${this.esc(i.preview)}</div>${body}</div>`;
            }).join('');
        });
        return html;
    },
    replyBox: function(id) {
        return `<div class="net-reply"><textarea id="net-reply-input" class="area-std" style="min-height:60px; margin:0;" placeholder="메시지 입력"></textarea><button class="btn-play" style="margin:0; width:auto; padding:0 16px;" ${this.busy ? 'disabled' : ''} onclick="Net.sendInbox('${id}')">보내기</button></div>`;
    }
};
