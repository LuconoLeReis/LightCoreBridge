const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
(async()=>{
const c=vm.createContext({console,URL,Map,Object,Array,Number,String,Promise});
vm.runInContext(`var data={},settings={},owner={getGlobalSetting:(k,d)=>data[k]??d,setGlobalSettings:s=>{data=s;}};var character=owner;var warnings=[];var alertify={warning:s=>warnings.push(s)};async function mergeSettings(p,cb){data={...data,...p};cb?.(data);}function wb20FamiliarFriend(){return {bonus:8};}`,c);
vm.runInContext(fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/familiar-forms.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/familiar-profiles.js'),'utf8'),c);
const base={hp:1,ac:11,formula:'1d4-1',abilities:[['STR','3','-4'],['DEX','13','+1'],['CON','8','-1'],['INT','2','-4'],['WIS','12','+1'],['CHA','7','-2']],traits:[{name:'Trait',text:'A familiar trait.'}],actions:[]};
const profile=(name,form='Owl')=>({name,formName:form,url:'https://www.dndbeyond.com/monsters/123-'+form.toLowerCase(),source:'Monster Manual',appearance:'songbird',base});
c.profile=profile('Song');await vm.runInContext('wb20SaveFamiliarProfiles([profile],owner,profile.name)',c);
c.profile=profile('Second','Cat');await vm.runInContext('wb20SaveFamiliarProfiles([profile],owner,profile.name)',c);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(wb20FamiliarProfiles().map(p=>p.name))',c)),['Song','Second']);
await vm.runInContext("wb20SaveFamiliarProfiles([],owner,'')",c);assert.equal(vm.runInContext('wb20FamiliarProfiles().length',c),2);assert.equal(vm.runInContext("data['waybeyond20-familiar-name']",c),'');
c.profile=profile('SONG','Raven');await vm.runInContext('wb20SaveFamiliarProfiles([profile],owner,profile.name)',c);assert.equal(vm.runInContext('wb20FamiliarProfiles().length',c),2);assert.equal(vm.runInContext('wb20FamiliarProfiles()[0].formName',c),'Raven');
for(const url of ['https://evil.example/monsters/123-owl','javascript:alert(1)','https://a:b@www.dndbeyond.com/monsters/123-owl']){
 c.profile={...profile('Invalid'),url};assert.equal(vm.runInContext('wb20ValidFamiliarProfile(profile)',c),null);
}
c.profile={...profile('Unsafe template'),base:{abilities:'broken'}};assert.equal(vm.runInContext('wb20ValidFamiliarProfile(profile).base',c),null);
c.profile={...profile('Plain'),unused:'discard',__proto__:{inherited:true}};assert.equal(vm.runInContext("'unused' in wb20ValidFamiliarProfile(profile)",c),false);
console.log('PASS familiar profiles: 10 checks; multiple names, blank generic preserves library, case-insensitive update, source validation and invalid cached templates.');
})().catch(e=>{console.error(e);process.exitCode=1;});
