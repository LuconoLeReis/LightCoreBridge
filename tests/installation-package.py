"""Read-only artifact verification plus extraction into a new disposable folder."""
from pathlib import Path
import sys,zipfile,hashlib,tempfile,json
archive=Path(sys.argv[1]).resolve();build=Path(sys.argv[2]).resolve()
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 names=z.namelist()
 assert len(names)==len(set(names)) and 'manifest.json' in names
 assert not any(n.startswith(('/', 'WayBeyond20/', 'LightCore/')) or '..' in Path(n).parts for n in names)
 assert not any(n.endswith('/') for n in names)
 expected={p.relative_to(build).as_posix():p.read_bytes() for p in build.rglob('*') if p.is_file()}
 assert set(names)==set(expected)
 for n,data in expected.items():assert z.read(n)==data,n
 manifest=json.loads(z.read('manifest.json'))
 assert manifest['name']=='LightCore Bridge' and manifest['version']=='2.20.257'
 assert manifest['version_name']=='LightCore Bridge 1.73.125'
 for n in ['LICENSE','LICENSE.MIT','INSTALL.html','README.txt']:assert n in names
 with tempfile.TemporaryDirectory(prefix='LCB-install-roundtrip-') as scratch:
  permanent=Path(scratch)/'LightCore';permanent.mkdir()
  (permanent/'LightCore-Bridge.zip').write_bytes(archive.read_bytes())
  z.extractall(permanent)
  assert (permanent/'manifest.json').is_file() and not (permanent/'WayBeyond20').exists()
  (permanent/'notes-kept.txt').write_text('user file',encoding='utf-8')
  (permanent/'manifest.json').write_text('old version',encoding='utf-8')
  z.extractall(permanent)
  assert (permanent/'notes-kept.txt').read_text()=='user file'
  assert json.loads((permanent/'manifest.json').read_text())==manifest
  assert (permanent/'LightCore-Bridge.zip').read_bytes()==archive.read_bytes()
  old=Path(scratch)/'WayBeyond20';old.mkdir();z.extractall(old)
  assert (old/'manifest.json').is_file() and not (old/'WayBeyond20').exists()
 print(json.dumps({'checks':'flat ZIP, CRC, all build bytes, required files, first install, overwrite update, unrelated file/ZIP preservation and legacy-folder update','files':len(names),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'status':'PASS'}))
