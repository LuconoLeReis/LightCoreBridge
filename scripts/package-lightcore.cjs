// Reproducible, flat install archive. Uses only Node built-ins.
// Run after npm run build. Never packages an installed/user profile directory.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), build = path.join(root, 'build/chrome');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out')) throw new Error('Usage: node scripts/package-lightcore.cjs [--out <new ZIP path>]');
const output = path.resolve(args[1] || path.join(root, 'build/artifacts/LightCore-Bridge.zip'));
const source = fs.realpathSync(build);
if (source !== build || output === source || output.startsWith(source + path.sep) || !output.toLowerCase().endsWith('.zip'))
    throw new Error('Use a new .zip path outside build/chrome.');
if (fs.existsSync(output) || fs.existsSync(output + '.partial')) throw new Error('Output already exists; choose a new path.');
const manifest = JSON.parse(fs.readFileSync(path.join(build, 'manifest.json'), 'utf8'));
if (manifest.name !== 'LightCore Bridge' || manifest.manifest_version !== 3) throw new Error('Expected a LightCore Chrome build.');
for (const name of ['LICENSE', 'LICENSE.MIT', 'README.txt', 'INSTALL.html', 'Updates.html'])
    if (!fs.statSync(path.join(build, name)).isFile()) throw new Error('Missing required build file: ' + name);
const table = Array.from({length:256}, (_, n) => {
    for (let bit=0; bit<8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
});
function crc32(data) {
    let crc=0xffffffff;
    for (const b of data) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function list(directory, prefix='') {
    return fs.readdirSync(directory, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(entry=>{
        const file=path.join(directory, entry.name), relative=prefix+entry.name;
        if (entry.isSymbolicLink()) throw new Error('Build links cannot be packaged.');
        if (entry.isDirectory()) return list(file, relative+'/');
        if (!entry.isFile() || /(^|\/)(?:node_modules|\.git|src|tests)(\/|$)/.test(relative) || relative.endsWith('.zip'))
            throw new Error('Unexpected build entry: '+relative);
        return [{name:relative, data:fs.readFileSync(file)}];
    });
}
const files=list(build);
if (!files.some(file=>file.name==='manifest.json') || files.length>65535) throw new Error('Invalid flat archive.');
const locals=[], central=[]; let offset=0;
for (const file of files) {
    const name=Buffer.from(file.name,'utf8'), compressed=zlib.deflateRawSync(file.data,{level:9}), crc=crc32(file.data);
    if (file.data.length>0xffffffff || compressed.length>0xffffffff || offset>0xffffffff) throw new Error('ZIP32 limit exceeded.');
    const local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);local.writeUInt16LE(8,8);
    local.writeUInt16LE(0x2821,12); // 2000-01-01, deterministic timestamp
    local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(file.data.length,22);local.writeUInt16LE(name.length,26);
    locals.push(local,name,compressed);
    const header=Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(20,6);header.writeUInt16LE(0x0800,8);header.writeUInt16LE(8,10);
    header.writeUInt16LE(0x2821,14);header.writeUInt32LE(crc,16);header.writeUInt32LE(compressed.length,20);header.writeUInt32LE(file.data.length,24);
    header.writeUInt16LE(name.length,28);header.writeUInt32LE(offset,42);
    central.push(header,name);offset+=local.length+name.length+compressed.length;
}
const directory=Buffer.concat(central), end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const archive=Buffer.concat([...locals,directory,end]);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output+'.partial',archive,{flag:'wx'});
if (fs.existsSync(output)) throw new Error('Output appeared while packaging; partial archive retained.');
fs.renameSync(output+'.partial',output);
console.log(JSON.stringify({path:output,version:manifest.version_name,browserBuild:manifest.version,files:files.length,bytes:archive.length,sha256:crypto.createHash('sha256').update(archive).digest('hex'),layout:'flat; manifest.json at ZIP root'}));
