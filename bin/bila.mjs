#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile, parse, check, VERSION } from '../src/compiler.mjs';

const args=process.argv.slice(2);
const cmd=args[0]||'help';
const file=args[1];
const usage=()=>console.log(`BilaScript DevKit ${VERSION}\n\nCommands:\n  bila compile input.bila [-o output.js]\n  bila run input.bila\n  bila ast input.bila\n  bila check input.bila\n`);
if(cmd==='help'||cmd==='--help'||cmd==='-h'){usage();process.exit(0);}
if(!file){usage();process.exit(1);}
const input=path.resolve(file);const source=fs.readFileSync(input,'utf8');
const outIndex=args.indexOf('-o');const explicitOut=outIndex>=0?args[outIndex+1]:null;
try{
  if(cmd==='compile'){
    const out=path.resolve(explicitOut||input.replace(/\.bila$/i,'')+'.js');
    const mapFile=out+'.map';
    const r=compile(source,{sourceMap:true,fileName:path.basename(out),sourceName:input});
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,r.code+`//# sourceMappingURL=${path.basename(mapFile)}\n`);
    fs.writeFileSync(mapFile,JSON.stringify(r.map,null,2));
    console.log(`OK ${path.relative(process.cwd(),input)} -> ${path.relative(process.cwd(),out)}`);
  }else if(cmd==='run'){
    const r=compile(source,{sourceMap:true,inlineSourceMap:true,sourceName:input,fileName:path.basename(input)+'.js'});
    const tmp=path.join(process.cwd(),'.bilascript-run');fs.mkdirSync(tmp,{recursive:true});
    const out=path.join(tmp,path.basename(input).replace(/\.bila$/i,'')+'.mjs');fs.writeFileSync(out,r.code);
    await import(pathToFileURL(out).href+'?t='+Date.now());
  }else if(cmd==='ast'){
    console.log(JSON.stringify(parse(source).ast,null,2));
  }else if(cmd==='check'){
    const r=check(source);for(const d of r.diagnostics)console.log(`${d.severity.toUpperCase()} ${d.code} ${d.line||'?'}:${d.column||'?'} ${d.message}`);console.log(r.ok?'OK':'FAILED');process.exitCode=r.ok?0:2;
  }else{usage();process.exitCode=1;}
}catch(e){console.error(`${e.name||'Error'}: ${e.message}`);process.exitCode=2;}
