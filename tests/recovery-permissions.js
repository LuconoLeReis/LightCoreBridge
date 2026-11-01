// Both worker and worker-independent toolbar must use Firefox-valid host patterns.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=process.env.WB20_REVIEW_SOURCE || path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tabs=[{id:1,url:'http://localhost:30000/game',title:'World • Foundry Virtual Tabletop'},
    {id:2,url:'https://remote.test:8443/game',title:'Other • Foundry Virtual Tabletop'},
    {id:3,url:'https://denied.test:30000/game',title:'Private • Foundry Virtual Tabletop'},
    {id:4,url:'https://www.dndbeyond.com/characters/7'}];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function check(file,toolbar,withHeader=false) {
    const patterns=[],reloads=[],created=[];
    const element=()=>{const e={style:{},append(){},addEventListener:(_name,cb)=>e.click=cb};created.push(e);return e;};
    let placement;
    const c=vm.createContext({URL,isFVTT:t=>/Foundry Virtual Tabletop/.test(t),
        document:{getElementById:()=>null,querySelector:()=>withHeader?{after(){placement='after-header';}}:null,
            createElement:element,body:{prepend(){placement='body';}}},
        chrome:{runtime:{lastError:null},
            storage:{local:{get:(d,cb)=>cb(d),set:(_d,cb)=>cb()}},
            tabs:{query:(_q,cb)=>cb(tabs),reload:(id,cb)=>{reloads.push(id);cb();}},
            permissions:{contains:(q,cb)=>{
                const pattern=q.origins[0];patterns.push(pattern);
                assert.ok(!/:\d+\//.test(pattern),'Firefox rejects ports in match patterns');
                setImmediate(()=>cb(['http://localhost/*','https://remote.test/*'].includes(pattern)));
            }}}});
    vm.runInContext(read('src/reliability/recovery-scope.js')+'\n'+read(file),c);
    if(toolbar) {assert.equal(placement,withHeader?'after-header':'body');created.find(e=>e.type==='button').click();}
    else c.wb20ReloadRecoveryTabs(()=>{});
    await tick();await tick();
    assert.deepEqual(patterns,['http://localhost/*','https://remote.test/*','https://denied.test/*']);
    assert.deepEqual(reloads.sort(),[1,2,4],'no reload for a host without permission');
}
(async()=>{
    await check('src/reliability/recovery-background.js',false);
    await check('src/reliability/recovery-popup.js',true);
    await check('src/reliability/recovery-popup.js',true,true);
    console.log('PASS worker/toolbar recovery permission checks: ported HTTP/HTTPS hosts, asynchronous permissions and denied host. Mock browser APIs only.');
})().catch(error=>{console.error(error);process.exitCode=1;});
