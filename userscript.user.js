// ==UserScript==
// @name         Free unZIPper
// @namespace    https://github.com/grmpnk
// @version      1.1
// @description  Unzip ZIP files directly in your browser. Supports password-protected files, with no file uploads to external servers and no additional software required.
// @author       grmpneko
// @match        http://*/*
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.52/dist/zip.min.js
// @run-at       document-start
// @license      MIT
// ==/UserScript==
// ==========================================
// Utils
// ==========================================
const d=document,$S=s=>document.querySelector(s),$SA=(s,r=document)=>r.querySelectorAll(s),$C=(tag,{attrs={},props={},styles={},on={}}={})=>{const el=document.createElement(tag);for(const [name,value] of Object.entries(attrs)){if(value===false||value==null)continue;if(value===true)el.setAttribute(name,"");else el.setAttribute(name,String(value));}Object.assign(el,props);Object.assign(el.style,styles);for(const [ev,handler] of Object.entries(on)){if(typeof handler==="function")el.addEventListener(ev,handler);}return el;};

// zip.js: Worker は CSP で止められやすいので使わない
zip.configure({useWebWorkers:false});

const ZIP_ICON=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22"><path d="M16 20h20l6 6h6v24a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z" fill="#F4B400"/><path d="M16 20h20l6 6H16z" fill="#FFD54F"/><rect x="28" y="14" width="4" height="4" fill="#666"/><rect x="28" y="18" width="4" height="4" fill="#999"/><rect x="28" y="22" width="4" height="4" fill="#666"/><rect x="28" y="26" width="4" height="4" fill="#999"/><rect x="28" y="30" width="4" height="4" fill="#666"/><path d="M37 16l11 11" stroke="#4CAF50" stroke-width="4" stroke-linecap="round"/><path d="M48 27V16H37" stroke="#4CAF50" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const PANEL_CSS=`
.uz-panel{position:fixed;top:16px;right:16px;z-index:2147483647;width:320px;max-height:70vh;display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:16px;background:rgba(20,22,40,.85);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(16px);box-shadow:0 12px 40px rgba(0,0,0,.5);color:#e8eaf6;font:14px/1.5 system-ui,'Segoe UI','Hiragino Sans',sans-serif;box-sizing:border-box}
.uz-panel *{box-sizing:border-box}
.uz-head{display:flex;align-items:center;gap:10px;font-weight:600}
.uz-head span:first-child{flex:1;background:linear-gradient(90deg,#7c5cff,#00d4ff);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:16px}
.uz-badge{background:linear-gradient(135deg,#7c5cff,#00d4ff);color:#fff;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600}
.uz-list{overflow:auto;display:flex;flex-direction:column;gap:2px;min-height:40px}
.uz-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:10px;cursor:pointer}
.uz-row:hover{background:rgba(255,255,255,.06)}
.uz-row span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uz-panel input[type=checkbox]{accent-color:#7c5cff;width:16px;height:16px;flex:none;margin:0}
.uz-drop{border:2px dashed rgba(255,255,255,.18);border-radius:12px;padding:12px;text-align:center;color:#8b90a8;font-size:12px}
.uz-over{outline:2px dashed #00d4ff;outline-offset:-2px;background:rgba(0,212,255,.1)}
.uz-panel button{cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);color:#e8eaf6;border-radius:10px;padding:7px 12px;font:inherit;transition:transform .1s,background .2s}
.uz-panel button:hover:not(:disabled){background:rgba(255,255,255,.14);transform:translateY(-1px)}
.uz-panel button.uz-primary{background:linear-gradient(135deg,#7c5cff,#00d4ff);border:0;color:#fff;font-weight:600}
.uz-panel button.uz-primary:hover:not(:disabled){background:linear-gradient(135deg,#7c5cff,#00d4ff);filter:brightness(1.15)}
.uz-panel button:disabled{opacity:.4;cursor:not-allowed}
.uz-empty{color:#8b90a8;text-align:center;padding:14px 0}
`;

const PAGE_CSS=`
:root{color-scheme:dark;--bg:#0b0d17;--card:rgba(255,255,255,.05);--line:rgba(255,255,255,.1);--fg:#e8eaf6;--mute:#8b90a8;--a:#7c5cff;--b:#00d4ff}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;font:14px/1.5 system-ui,'Segoe UI','Hiragino Sans',sans-serif;color:var(--fg);background:radial-gradient(900px 500px at 10% -10%,rgba(124,92,255,.35),transparent),radial-gradient(800px 500px at 100% 0,rgba(0,212,255,.22),transparent),var(--bg);background-attachment:fixed}
main{max-width:900px;margin:0 auto;padding:48px 20px 80px}
header{margin-bottom:24px}
h1{margin:0;font-size:34px;letter-spacing:-.02em;background:linear-gradient(90deg,var(--a),var(--b));-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--mute);margin-top:4px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;margin-bottom:14px;backdrop-filter:blur(14px);overflow:hidden;transition:border-color .2s,box-shadow .2s}
.card[open]{border-color:rgba(124,92,255,.55);box-shadow:0 10px 40px rgba(124,92,255,.15)}
summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:16px 18px;user-select:none}
summary::-webkit-details-marker{display:none}
summary:hover{background:rgba(255,255,255,.04)}
.chev{width:8px;height:8px;flex:none;border-right:2px solid var(--b);border-bottom:2px solid var(--b);transform:rotate(-45deg);transition:transform .2s}
details[open]>summary .chev{transform:rotate(45deg)}
.nm{font-weight:600;flex:1;word-break:break-all}
.meta{color:var(--mute);font-size:12px}
.badge{background:linear-gradient(135deg,var(--a),var(--b));color:#fff;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600}
.tb{display:flex;gap:8px;padding:8px 18px;border-top:1px solid var(--line)}
.tb button{cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.08);color:var(--fg);border-radius:10px;padding:6px 14px;font:inherit}
.tb button:hover:not(:disabled){background:rgba(255,255,255,.16)}
.tb button:disabled{opacity:.4;cursor:not-allowed}
.wrap{overflow:auto;max-height:70vh;border-top:1px solid var(--line);padding:0 8px 8px}
table{width:100%;border-collapse:collapse}
th{position:sticky;top:0;background:#14162a;text-align:left;padding:10px;color:var(--mute);font-weight:600;cursor:pointer;user-select:none;white-space:nowrap;transition:color .2s}
th:hover{color:var(--fg)}
th.asc,th.desc{color:var(--b)}
th.asc::after{content:' ▲'}
th.desc::after{content:' ▼'}
th.ck,td.ck{width:36px;text-align:center;padding:8px 10px;cursor:default}
th.ck:hover{color:var(--mute)}
th.ck input,td.ck input{accent-color:var(--a);width:16px;height:16px;margin:0;cursor:pointer;vertical-align:middle}
td{padding:8px 10px;border-top:1px solid var(--line);word-break:break-all}
td:nth-child(4){color:var(--mute)}
td.num{text-align:right;white-space:nowrap}
td:nth-child(7){white-space:nowrap;color:var(--mute)}
td.fn{cursor:pointer}
td.fn:hover{color:var(--b);text-decoration:underline}
tbody tr:hover{background:rgba(255,255,255,.06)}
.ov{position:fixed;inset:0;z-index:100;background:rgba(5,6,12,.9);backdrop-filter:blur(6px);display:flex;flex-direction:column;padding:16px;gap:12px}
.bar{display:flex;align-items:center;gap:8px}
.ov button{cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.08);color:var(--fg);border-radius:10px;padding:7px 14px;font:inherit;white-space:nowrap}
.ov button:hover:not(:disabled){background:rgba(255,255,255,.16)}
.ov button:disabled{opacity:.4;cursor:not-allowed}
.ov button.ok{background:linear-gradient(135deg,var(--a),var(--b));border:0;color:#fff;font-weight:600}
.pv{flex:1;min-height:0;width:100%;object-fit:contain;border:0;border-radius:12px;background:#000}
img.pv{cursor:pointer}
audio.pv{flex:none;background:transparent}
iframe.pv{background:#fff}
pre.pv{overflow:auto;background:#14162a;padding:14px;margin:0;white-space:pre-wrap;word-break:break-all;color:var(--fg);font:13px/1.5 ui-monospace,Consolas,monospace}
.msg{color:var(--mute);text-align:center;padding:40px}
.dlgwrap{align-items:center;justify-content:center}
.dlg{display:flex;flex-direction:column;gap:12px;width:360px;max-width:92vw;padding:20px;border-radius:16px;background:#14162a;border:1px solid var(--line)}
.dlg input[type=password]{padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--fg);font:inherit}
.dlg .err{color:#ff8a8a;font-size:12px;min-height:1em}
.dlg label{display:flex;gap:8px;align-items:center;color:var(--mute);font-size:12px}
.dlg .row{display:flex;gap:8px;justify-content:flex-end}
.grid{flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;align-content:start;padding:2px}
.it{cursor:pointer;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.05);overflow:hidden;display:flex;flex-direction:column;height: 300px;}
.it:hover{border-color:var(--b)}
.it.cur{border-color:var(--a);box-shadow:0 0 0 2px var(--a)}
.th{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:34px;background:#000}
.th img{width:100%;height:100%;object-fit:contain}
.it .cap{padding:6px 8px;font-size:12px;word-break:break-all}
.it .cap small{display:block;color:var(--mute)}
`;

// CSP でインライン <style> が止められても効くよう、CSSOM 経由で当てる
const addCss=(doc,css)=>{
    try{
        const sh=new (doc.defaultView.CSSStyleSheet)();
        sh.replaceSync(css);
        doc.adoptedStyleSheets=[...doc.adoptedStyleSheets,sh];
    }catch(e){
        const st=doc.createElement('style');
        st.textContent=css;
        (doc.head||doc.documentElement).append(st);
    }
};

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>{
    if(n<1024)return n+' B';
    const u=['KB','MB','GB'];
    let i=-1;
    do{n/=1024;i++;}while(n>=1024&&i<2);
    return n.toFixed(1)+' '+u[i];
};

// ==========================================
// File types
// ==========================================
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',svg:'image/svg+xml',avif:'image/avif',ico:'image/x-icon',
            mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',ogv:'video/ogg',mkv:'video/x-matroska',
            mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',flac:'audio/flac',aac:'audio/aac',opus:'audio/ogg',
            pdf:'application/pdf'};
const TEXT=new Set(['txt','md','json','csv','tsv','log','js','ts','css','html','htm','xml','yml','yaml','ini','cfg','conf','sh','py','java','c','h','cpp','srt','vtt','toml']);
const extOf=n=>{const b=n.split('/').pop();return b.includes('.')?b.split('.').pop().toLowerCase():'';};
const mimeOf=n=>MIME[extOf(n)]||'';
const kindOf=n=>{
    const x=extOf(n),m=MIME[x]||'';
    if(m.startsWith('image/'))return 'image';
    if(m.startsWith('video/'))return 'video';
    if(m.startsWith('audio/'))return 'audio';
    if(x==='pdf')return 'pdf';
    if(TEXT.has(x))return 'text';
    return 'other';
};

// ==========================================
// Saved passwords (GM.getValue / GM.setValue)
// ==========================================
let pwList=[];
GM.getValue('uz_pw',[]).then(v=>{if(Array.isArray(v))pwList=v;}).catch(()=>{});
const savePw=async pw=>{
    if(pwList.includes(pw))return;
    pwList.push(pw);
    try{await GM.setValue('uz_pw',pwList);}catch(e){}
};

// このセッションで成功したパスワード(全カード共通)
const usedPw=[];
const rememberPw=pw=>{
    const i=usedPw.indexOf(pw);
    if(i>=0)usedPw.splice(i,1);
    usedPw.unshift(pw);
};

// ==========================================
// ZIP
// ==========================================
const fetchBuf=url=>new Promise((ok,ng)=>GM_xmlhttpRequest({
    method:'GET',
    url,
    responseType:'arraybuffer',
    anonymous:false, // Cookie を送る(認証付きのZIP用)
    onload:r=>{
        if(r.status>=200&&r.status<300&&r.response)ok(r.response);
        else ng(new Error('HTTP '+r.status+' : '+url));
    },
    onerror:()=>ng(new Error('Network error : '+url)),
    ontimeout:()=>ng(new Error('Timeout : '+url)),
    onabort:()=>ng(new Error('Aborted : '+url))
}));

// 一覧はヘッダーだけ読む(暗号化されていてもファイル名・サイズは見られる)
const readZip=async src=>{
    const buf=await src.load();
    const reader=new zip.ZipReader(new zip.Uint8ArrayReader(new Uint8Array(buf)));
    // UTF-8 フラグなしのファイル名(日本のWindows製ZIPなど)は Shift_JIS として読む
    const list=await reader.getEntries({filenameEncoding:'shift_jis'});
    const entries=[];
    for(const f of list){
        if(f.directory)continue;
        const p=f.filename;
        const i=p.lastIndexOf('/');
        const base=p.slice(i+1);
        entries.push({
            name:base,
            path:p,
            dir:p.slice(0,i+1),
            ext:base.includes('.')?base.split('.').pop().toUpperCase():'-',
            size:f.uncompressedSize||0,
            date:(f.lastModDate||new Date(0)).getTime(),
            enc:!!f.encrypted,
            ent:f
        });
    }
    return {name:src.name,entries};
};

const isPwErr=e=>/password|signature/i.test((e&&e.message)||'');

// ==========================================
// Dialogs (新しいタブ側)
// ==========================================
const askPw=(doc,name,retry)=>new Promise(res=>{
    const ov=doc.createElement('div');
    ov.className='ov dlgwrap';
    ov.innerHTML=`<form class="dlg"><div class="nm">🔒 ${esc(name)}</div><div class="err">${retry?'Incorrect password':''}</div><input type="password" placeholder="Password"><label><input type="checkbox" class="sv"> Save password</label><div class="row"><button type="button" class="cc">Cancel</button><button type="submit" class="ok">OK</button></div></form>`;
    doc.body.append(ov);
    const form=ov.querySelector('form'),inp=ov.querySelector('input[type=password]'),sv=ov.querySelector('.sv');
    const done=v=>{ov.remove();res(v);};
    form.addEventListener('submit',e=>{e.preventDefault();done({pw:inp.value,save:sv.checked});});
    ov.querySelector('.cc').addEventListener('click',()=>done(null));
    setTimeout(()=>inp.focus(),0);
});

// 暗号化されていれば「このセッションで成功済み → 保存済み → 入力」の順にパスワードを試す
// 一度成功したパスワードは全カード(全ZIP)で共有される
const getBlob=async(doc,e)=>{
    const get=pw=>e.ent.getData(new zip.BlobWriter(mimeOf(e.name)),{password:pw,checkSignature:true});
    if(!e.enc)return get();
    const cand=[...usedPw,...pwList].filter((x,i,a)=>x!=null&&a.indexOf(x)===i);
    for(const pw of cand){
        try{const b=await get(pw);rememberPw(pw);return b;}
        catch(err){if(!isPwErr(err))throw err;}
    }
    let retry=false;
    for(;;){
        const r=await askPw(doc,e.name,retry);
        if(!r)return null;
        if(!r.pw){retry=true;continue;}
        try{
            const b=await get(r.pw);
            rememberPw(r.pw);
            if(r.save)await savePw(r.pw);
            return b;
        }catch(err){
            if(!isPwErr(err))throw err;
            retry=true;
        }
    }
};

const dl=(doc,name,url)=>{
    const a=doc.createElement('a');
    a.href=url;a.download=name;
    doc.body.append(a);a.click();a.remove();
};
const ICON={image:'🖼',video:'🎞',audio:'🎵',pdf:'📄',text:'📝',other:'📦'};

// パスワードダイアログを出さずに取得(一覧のサムネイル用)。開けなければ null
const quietBlob=async e=>{
    const get=pw=>e.ent.getData(new zip.BlobWriter(mimeOf(e.name)),{password:pw,checkSignature:true});
    if(!e.enc)return get();
    const cand=[...usedPw,...pwList].filter((x,i,a)=>x!=null&&a.indexOf(x)===i);
    for(const pw of cand){
        try{return await get(pw);}
        catch(err){if(!isPwErr(err))return null;}
    }
    return null;
};

const preview=(win,list,idx0,blob0)=>{
    const doc=win.document;
    let idx=idx0,url=null,el=null,name='',busy=false;
    let listEl=null,thumbUrls=[],io=null;
    const ov=doc.createElement('div');
    ov.className='ov';
    const bar=doc.createElement('div');
    bar.className='bar';
    const title=doc.createElement('span');
    title.className='nm';
    const btn=(label,fn)=>{
        const b=doc.createElement('button');
        b.type='button';
        b.textContent=label;
        b.addEventListener('click',fn);
        return b;
    };

    const closeList=()=>{
        if(io){io.disconnect();io=null;}
        thumbUrls.forEach(u=>URL.revokeObjectURL(u));
        thumbUrls=[];
        if(listEl){listEl.remove();listEl=null;}
        if(el)el.style.display='';
    };
    const close=()=>{closeList();ov.remove();if(url)URL.revokeObjectURL(url);doc.removeEventListener('keydown',onKey);};

    const setContent=(n,blob)=>{
        if(url)URL.revokeObjectURL(url);
        if(el)el.remove();
        name=n;
        url=URL.createObjectURL(blob);
        const kind=kindOf(n);
        title.textContent=n+' ('+(idx+1)+'/'+list.length+')';
        if(kind==='image'){
            el=doc.createElement('img');
            el.src=url;
            // 左半分: 前 / 右半分: 次
            el.addEventListener('click',e=>{
                const r=el.getBoundingClientRect();
                go(e.clientX<r.left+r.width/2?-1:1);
            });
        }
        else if(kind==='video'||kind==='audio'){el=doc.createElement(kind);el.controls=true;el.src=url;}
        else if(kind==='pdf'){el=doc.createElement('iframe');el.src=url;}
        else if(kind==='text'){
            const pre=doc.createElement('pre');
            el=pre;
            pre.textContent='...';
            blob.text().then(t=>{pre.textContent=t.length>300000?t.slice(0,300000)+'\n\n[truncated]':t;});
        }else{
            el=doc.createElement('div');
            el.className='msg';
            el.textContent='Preview is not available for this format. Use "Open in new tab" or "Save".';
        }
        if(kind!=='other')el.classList.add('pv');
        ov.append(el);
    };

    // n 番目を開く(一覧からも前後移動からも共通)
    const openAt=async n=>{
        if(busy)return;
        busy=true;
        try{
            const blob=await getBlob(doc,list[n]);
            if(blob){idx=n;setContent(list[n].name,blob);}
        }catch(err){
            win.alert('Open failed: '+err.message);
        }finally{
            busy=false;
        }
    };
    const go=dir=>{
        if(busy||list.length<2||listEl)return;
        openAt((idx+dir+list.length)%list.length);
    };

    // ---- 一覧表示 ----
    const showList=()=>{
        if(el)el.style.display='none';
        listEl=doc.createElement('div');
        listEl.className='grid';
        io=new win.IntersectionObserver(ents=>{
            for(const en of ents){
                if(!en.isIntersecting)continue;
                io.unobserve(en.target);
                loadThumb(en.target);
            }
        },{root:listEl,rootMargin:'200px'});

        list.forEach((e,i)=>{
            const kind=kindOf(e.name);
            const it=doc.createElement('div');
            it.className='it'+(i===idx?' cur':'');
            it.title=e.path;
            const th=doc.createElement('div');
            th.className='th';
            th.textContent=e.enc?'🔒':ICON[kind];
            const cap=doc.createElement('div');
            cap.className='cap';
            cap.textContent=e.name;
            const sm=doc.createElement('small');
            sm.textContent=fmt(e.size);
            cap.append(sm);
            it.append(th,cap);
            it.addEventListener('click',()=>{
                closeList();
                if(i===idx)return;
                openAt(i);
            });
            if(kind==='image'&&e.size<=30*1024*1024){
                it._e=e;it._th=th;
                io.observe(it);
            }
            listEl.append(it);
        });
        ov.append(listEl);
        const cur=listEl.children[idx];
        if(cur)cur.scrollIntoView({block:'center'});
    };

    const loadThumb=async it=>{
        try{
            const blob=await quietBlob(it._e);
            if(!blob||!listEl)return; // 開けない/すでに一覧を閉じた
            const u=URL.createObjectURL(blob);
            thumbUrls.push(u);
            const img=doc.createElement('img');
            img.src=u;
            it._th.textContent='';
            it._th.append(img);
        }catch(err){}
    };

    const toggleList=()=>{listEl?closeList():showList();};

    const onKey=e=>{
        if(doc.querySelector('.dlgwrap'))return; // password dialog is open
        if(e.key==='Escape'){listEl?closeList():close();}
        else if(e.key==='ArrowLeft')go(-1);
        else if(e.key==='ArrowRight')go(1);
    };
    doc.addEventListener('keydown',onKey);

    const prevBtn=btn('◀ Prev',()=>go(-1)),nextBtn=btn('Next ▶',()=>go(1));
    if(list.length<2){prevBtn.disabled=true;nextBtn.disabled=true;}
    bar.append(
        title,
        btn('☰ List',toggleList),
        prevBtn,
        nextBtn,
        btn('Open in new tab',()=>win.open(url,'_blank')),
        btn('Save',()=>dl(doc,name,url)),
        btn('×',close));
    ov.addEventListener('click',e=>{if(e.target===ov)close();});
    ov.append(bar);
    setContent(list[idx0].name,blob0);
    doc.body.append(ov);
};

const openEntry=async(win,g,tr)=>{
    const doc=win.document,old=doc.title;
    // 現在のテーブル表示順(ソート後を含む)で前後移動できるようにする
    const rows=[...tr.parentElement.rows];
    const list=rows.map(r=>g.entries[+r.dataset.i]);
    const idx=rows.indexOf(tr);
    doc.title='Loading... '+list[idx].name;
    try{
        const blob=await getBlob(doc,list[idx]);
        if(blob)preview(win,list,idx,blob);
    }catch(err){
        win.alert('Open failed: '+err.message);
    }finally{
        doc.title=old;
    }
};

// ==========================================
// Viewer (新しいタブ側の描画)
// ==========================================
const build=groups=>{
    const total=groups.reduce((n,g)=>n+g.entries.length,0);
    const cards=groups.map((g,gi)=>{
        const rows=g.entries.map((e,ei)=>{
            const m=e.name.replace(/\.[^.]*$/,'').match(/(\d+)\D*$/);
            const no=m?parseInt(m[1],10):'';
            return `<tr data-g="${gi}" data-i="${ei}"><td class="ck"><input type="checkbox" class="rc"></td><td class="fn" data-v="${esc(e.name.toLowerCase())}">${e.enc?'🔒 ':''}${esc(e.name)}</td><td class="num" data-v="${no}">${no}</td><td data-v="${esc(e.dir.toLowerCase())}">${esc(e.dir||'/')}</td><td data-v="${esc(e.ext)}">${esc(e.ext)}</td><td class="num" data-v="${e.size}">${fmt(e.size)}</td><td data-v="${e.date}">${new Date(e.date).toLocaleString('en-US')}</td></tr>`;
        }).join('');
        const size=g.entries.reduce((n,e)=>n+e.size,0);
        return `<details class="card" data-g="${gi}" open><summary><span class="chev"></span><span class="nm">${esc(g.name)}</span><span class="meta">${fmt(size)}</span><span class="badge">${g.entries.length}</span></summary><div class="tb"><button type="button" class="sv" disabled>Save selected (0)</button></div><div class="wrap"><table><thead><tr><th class="ck"><input type="checkbox" class="all"></th><th data-t="s">Name</th><th data-t="k">No.</th><th data-t="s">Path</th><th data-t="s">Type</th><th data-t="n">Size</th><th data-t="n">Modified</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }).join('');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Unziper</title></head><body><main><header><h1>Unziper</h1><div class="sub">${total} files in ${groups.length} archives</div></header>${cards}</main></body></html>`;
};

const initSort=doc=>{
    $SA('table',doc).forEach(t=>{
        const ths=[...t.tHead.rows[0].cells];
        ths.forEach((th,i)=>{
            if(!th.dataset.t)return; // checkbox column is not sortable
            th.addEventListener('click',()=>{
                const asc=!th.classList.contains('asc');
                ths.forEach(x=>x.classList.remove('asc','desc'));
                th.classList.add(asc?'asc':'desc');
                const num=th.dataset.t==='n';
                const key=th.dataset.t==='k';
                const rows=[...t.tBodies[0].rows];
                rows.sort((a,b)=>{
                    const x=a.cells[i].dataset.v,y=b.cells[i].dataset.v;
                    let r;
                    if(key){
                        const nx=x===''?Infinity:+x, ny=y===''?Infinity:+y;
                        r=nx===ny?0:(nx<ny?-1:1);
                        if(r===0)r=a.cells[1].dataset.v.localeCompare(b.cells[1].dataset.v,undefined,{numeric:true});
                        // 数字なし(Infinity)は昇順・降順どちらでも反転されるだけなので、そのまま扱う
                    }else{
                        r=num?x-y:x.localeCompare(y);
                    }
                    return asc?r:-r;
                });
                t.tBodies[0].append(...rows);
            });
        });
    });
};

// チェック状態に合わせてヘッダーのチェックボックスと保存ボタンを更新
const updSel=card=>{
    const rcs=[...card.querySelectorAll('tbody input.rc')];
    const n=rcs.filter(c=>c.checked).length;
    const all=card.querySelector('input.all'),btn=card.querySelector('button.sv');
    all.checked=n>0&&n===rcs.length;
    all.indeterminate=n>0&&n<rcs.length;
    btn.disabled=!n;
    btn.textContent='Save selected ('+n+')';
};

const initSelect=doc=>{
    doc.addEventListener('change',e=>{
        const t=e.target;
        if(!t.classList)return;
        const isAll=t.classList.contains('all'),isRow=t.classList.contains('rc');
        if(!isAll&&!isRow)return;
        const card=t.closest('details.card');
        if(!card)return;
        if(isAll)card.querySelectorAll('tbody input.rc').forEach(c=>{c.checked=t.checked;});
        updSel(card);
    });
};

const saveSelected=async(win,g,card)=>{
    const doc=win.document;
    const btn=card.querySelector('button.sv');
    // 現在のテーブル表示順で保存
    const items=[...card.querySelectorAll('tbody input.rc:checked')].map(c=>g.entries[+c.closest('tr').dataset.i]);
    if(!items.length)return;
    btn.disabled=true;
    try{
        for(let k=0;k<items.length;k++){
            btn.textContent='Saving '+(k+1)+'/'+items.length+'...';
            const blob=await getBlob(doc,items[k]);
            if(!blob)break; // password dialog cancelled
            const url=URL.createObjectURL(blob);
            dl(doc,items[k].name,url);
            setTimeout(()=>URL.revokeObjectURL(url),30000);
            await new Promise(r=>setTimeout(r,300));
        }
    }catch(err){
        win.alert('Save failed: '+err.message);
    }finally{
        updSel(card);
    }
};

// ファイル名クリックで開く / Save selected ボタン(ソート後も tr の data 属性で対応づく)
const initOpen=(win,groups)=>{
    win.document.addEventListener('click',e=>{
        const sv=e.target.closest&&e.target.closest('button.sv');
        if(sv){
            const card=sv.closest('details.card');
            saveSelected(win,groups[+card.dataset.g],card);
            return;
        }
        const td=e.target.closest&&e.target.closest('td.fn');
        if(!td)return;
        const tr=td.parentElement;
        openEntry(win,groups[+tr.dataset.g],tr);
    });
};

const render=(win,html,groups)=>{
    const doc=win.document;
    doc.open();
    doc.write(html);
    doc.close();
    addCss(doc,PAGE_CSS);
    initSort(doc);
    if(groups){
        initOpen(win,groups);
        initSelect(doc);
    }
};

const simplePage=msg=>`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Unziper</title></head><body><p>${esc(msg)}</p></body></html>`;

const extract=async list=>{
    if(!list.length)return;
    // ポップアップブロック回避: await の前に、クリック操作の流れの中で開く
    const win=window.open('about:blank','_blank');
    if(!win){
        alert('Could not open a new tab. Please allow pop-ups for this site.');
        return;
    }
    render(win,simplePage('Loading...'));
    addCss(win.document,'body{background:#0b0d17;color:#e8eaf6;font:14px system-ui;padding:24px}');
    try{
        const groups=await Promise.all(list.map(readZip));
        render(win,build(groups),groups);
    }catch(e){
        render(win,simplePage('Extract failed: '+e.message));
        addCss(win.document,'body{background:#0b0d17;color:#ff8a8a;font:14px system-ui;padding:24px}');
    }
};

// ==========================================
// Panel
// ==========================================
const sources=new Map(),checked=new Set();
let panel=null;

const showPanel=()=>{
    if(!$S('#uz-style')){
        const st=$C('style',{attrs:{id:'uz-style'},props:{textContent:PANEL_CSS}});
        d.head.append(st);
        addCss(d,PANEL_CSS); // CSP 対策の保険
    }
    if(panel)panel.remove();
    const list=$C('div',{attrs:{class:'uz-list'}});
    if(!sources.size)list.append($C('div',{attrs:{class:'uz-empty'},props:{textContent:'No ZIP files found.'}}));
    for(const [key,src] of sources){
        const row=$C('label',{attrs:{class:'uz-row',title:src.name}});
        row.append(
            $C('input',{attrs:{type:'checkbox'},props:{checked:checked.has(key)},on:{change:e=>{
                checked[e.target.checked?'add':'delete'](key);
                showPanel();
            }}}),
            // リンクの textContent があればそれを表示、なければファイル名のまま
            $C('span',{props:{textContent:src.label||src.name}}));
        list.append(row);
    }
    const head=$C('div',{attrs:{class:'uz-head'}});
    head.append(
        $C('span',{props:{textContent:'ZIP Files'}}),
        $C('span',{attrs:{class:'uz-badge'},props:{textContent:sources.size}}),
        $C('button',{attrs:{type:'button'},props:{textContent:'×'},on:{click:()=>{panel.remove();panel=null;}}}));
    const drop=$C('div',{attrs:{class:'uz-drop'},props:{textContent:'Drop .zip files here'}});
    const go=$C('button',{attrs:{type:'button',class:'uz-primary'},props:{textContent:'Extract ZIP ('+checked.size+')',disabled:!checked.size},on:{click:()=>extract([...checked].map(k=>sources.get(k)))}});
    panel=$C('div',{attrs:{class:'uz-panel'},on:{
        dragover:e=>{e.preventDefault();panel.classList.add('uz-over');},
        dragleave:e=>{if(!panel.contains(e.relatedTarget))panel.classList.remove('uz-over');},
        drop:e=>{
            e.preventDefault();
            panel.classList.remove('uz-over');
            for(const f of e.dataTransfer.files){
                if(!f.name.endsWith('.zip'))continue;
                const key='local:'+f.name+':'+f.size;
                sources.set(key,{name:f.name,load:()=>f.arrayBuffer()});
                checked.add(key);
            }
            showPanel();
        }
    }});
    panel.append(head,list,drop,go);
    d.body.append(panel);
};

const scan=()=>{
    for(const el of $SA('[href]')){
        const url=el.href;
        if(typeof url!=='string'||!url.endsWith('.zip'))continue;
        let name=url.split('/').pop();
        try{name=decodeURIComponent(name);}catch(e){}
        const label=(el.textContent||'').trim();
        sources.set(url,{name,label,load:()=>fetchBuf(url)});
        if(el.dataset.uzIcon)continue;
        el.dataset.uzIcon='1';
        el.after($C('span',{attrs:{title:'Extract '+name},props:{innerHTML:ZIP_ICON},styles:{display:'inline-block',marginLeft:'4px',cursor:'pointer',position:'relative',top:'-6px'},on:{click:e=>{
            e.preventDefault();
            e.stopPropagation();
            extract([sources.get(url)]);
        }}}));
    }
    showPanel();
};

GM_registerMenuCommand('Scan Zip',scan);
