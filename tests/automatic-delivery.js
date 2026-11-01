// Real worker routing, with bounded browser recipient doubles. No live VTT writes.
const assert=require('node:assert/strict');
const worker=require('./background-wake');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 for(const [label,reply,expected] of [
  ['confirmed',cb=>cb({delivered:true}),true],
  ['orphaned',cb=>cb(undefined),false],
  ['tab-only success',cb=>cb({success:true}),false],
  ['receiver failed',cb=>cb({delivered:false}),false]]) {
  const w=worker(null,(_id,_request,cb)=>reply(cb));w.deliver(label);await w.releaseSettings();
  assert.deepEqual(w.rollTabs(),[11,22,23]);
  assert.equal(w.replies[0].response.delivered,expected,label);
 }
 const partial=worker(null,(id,_request,cb)=>cb({delivered:id===22}));
 partial.deliver('partial');await partial.releaseSettings();
 assert.equal(partial.replies[0].response.delivered,true);
 assert.deepEqual(Array.from(partial.replies[0].response.vtt),['fvtt']);
 const noSlash=worker(null);noSlash.tabs[0].url='https://app.roll20.net/editor';
 const query=noSlash.chrome.tabs.query;noSlash.chrome.tabs.query=(q,cb)=>{if(q.url)assert.ok(Array.isArray(q.url) && q.url.includes('*://app.roll20.net/editor'));query(q,cb);};
 noSlash.deliver('no slash');await noSlash.releaseSettings();assert.ok(noSlash.rollTabs().includes(11));
 const none=worker(null);none.tabs.length=0;none.deliver('none');await none.releaseSettings();
 assert.equal(none.replies[0].response.delivered,false);assert.deepEqual(none.rollTabs(),[]);
 const hung=worker(null,()=>{});hung.deliver('hung');await hung.releaseSettings();
 assert.equal(hung.replies.length,0);await new Promise(r=>setTimeout(r,1900));
 assert.equal(hung.replies.length,1);assert.equal(hung.replies[0].response.delivered,false);
 const closed=worker({vtt:'fvtt',id:22,title:'Selected World'});
 closed.tabs.splice(1,2);closed.deliver('closed');await closed.releaseSettings();
 assert.equal(closed.replies[0].response.delivered,false);
 // Discovery failure cannot claim delivery, retry a roll, or send to a stale cached tab.
 const thrown=worker(null);thrown.chrome.tabs.sendMessage=()=>{throw Error('no receiving end');};
 thrown.deliver('throw');await thrown.releaseSettings();assert.equal(thrown.replies[0].response.delivered,false);
 // Automatic native delivery requires a matching, live saved connection.
 for(const connected of [true,false]){
  const w=worker(null);await w.releaseSettings();
  w.context.settings['talespire-url']='talespire://symbiote/fixture/';
  w.context.wb20TaleSpireReturnRequest=async()=>({connected,snapshot:{connection:'talespire://symbiote/fixture/'}});
  w.context.wayBeyond20SendTaleSpire=(_req,_sender,cb)=>{w.handoffs.push('native');cb({delivered:true});};
  w.deliver('automatic-native');await tick();await tick();
  assert.equal(w.handoffs.length,connected?1:0);
  assert.equal(w.replies.length,1);
 }
 const mismatch=worker(null);await mismatch.releaseSettings();
 mismatch.context.settings['talespire-url']='talespire://symbiote/saved/';
 mismatch.context.wb20TaleSpireReturnRequest=async()=>({connected:true,snapshot:{connection:'talespire://symbiote/other/'}});
 mismatch.deliver('wrong board');await tick();await tick();assert.equal(mismatch.handoffs.length,0);
 console.log('PASS automatic delivery: all active recipients, acknowledgments, no recipients, partial failure, orphaned tabs, timeout, exceptions, selected world and matching native connection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
