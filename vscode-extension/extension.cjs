const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const {pathToFileURL} = require('node:url');

let corePromise;
const core = () => corePromise ||= import(pathToFileURL(path.join(__dirname,'core','compiler.mjs')).href);

function jsPaths(doc, debug=false){
  const src=doc.uri.fsPath;
  if(debug){
    const dir=path.join(path.dirname(src),'.bilascript-debug');
    const base=path.basename(src).replace(/\.bila$/i,'');
    return {dir,js:path.join(dir,base+'.mjs'),map:path.join(dir,base+'.mjs.map')};
  }
  const js=src.replace(/\.bila$/i,'')+'.js';return {dir:path.dirname(js),js,map:js+'.map'};
}

async function compileDocument(doc, debug=false){
  const c=await core();const paths=jsPaths(doc,debug);fs.mkdirSync(paths.dir,{recursive:true});
  const r=c.compile(doc.getText(),{sourceMap:true,fileName:path.basename(paths.js),sourceName:doc.uri.fsPath});
  fs.writeFileSync(paths.js,r.code+`//# sourceMappingURL=${path.basename(paths.map)}\n`,'utf8');
  fs.writeFileSync(paths.map,JSON.stringify(r.map,null,2),'utf8');
  return {...paths,result:r};
}

function activate(context){
  const diagnostics=vscode.languages.createDiagnosticCollection('bilascript');context.subscriptions.push(diagnostics);
  const output=vscode.window.createOutputChannel('BilaScript');context.subscriptions.push(output);
  let timer=null;

  async function validate(doc){
    if(doc.languageId!=='bilascript')return;
    const c=await core();const r=c.check(doc.getText());
    diagnostics.set(doc.uri,r.diagnostics.map(d=>{
      const line=Math.max(0,(d.line||1)-1),col=Math.max(0,(d.column||1)-1);
      const item=new vscode.Diagnostic(new vscode.Range(line,col,line,col+1),`${d.code}: ${d.message}`,d.severity==='warning'?vscode.DiagnosticSeverity.Warning:vscode.DiagnosticSeverity.Error);
      item.source='BilaScript AST';item.code=d.code;return item;
    }));
  }

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(validate));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(validate));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e=>{
    if(e.document.languageId!=='bilascript'||!vscode.workspace.getConfiguration('bilascript').get('diagnostics.onType',true))return;
    clearTimeout(timer);timer=setTimeout(()=>validate(e.document),180);
  }));
  vscode.workspace.textDocuments.forEach(validate);

  context.subscriptions.push(vscode.commands.registerCommand('bilascript.compileFile',async()=>{
    const ed=vscode.window.activeTextEditor;if(!ed||ed.document.languageId!=='bilascript')return vscode.window.showWarningMessage('Mở một file .bila trước.');
    try{const p=await compileDocument(ed.document,false);vscode.window.showInformationMessage(`BilaScript: ${path.basename(p.js)} đã được tạo.`);await validate(ed.document);}catch(e){vscode.window.showErrorMessage(`BilaScript compile: ${e.message}`);await validate(ed.document);}
  }));

  context.subscriptions.push(vscode.commands.registerCommand('bilascript.showAST',async()=>{
    const ed=vscode.window.activeTextEditor;if(!ed)return;try{const c=await core();const ast=c.parse(ed.document.getText()).ast;const d=await vscode.workspace.openTextDocument({language:'json',content:JSON.stringify(ast,null,2)});await vscode.window.showTextDocument(d,{preview:true,viewColumn:vscode.ViewColumn.Beside});}catch(e){vscode.window.showErrorMessage(e.message);}
  }));

  context.subscriptions.push(vscode.commands.registerCommand('bilascript.runFile',async()=>{
    const ed=vscode.window.activeTextEditor;if(!ed)return;try{const p=await compileDocument(ed.document,true);output.clear();output.show(true);output.appendLine(`> node ${p.js}`);const child=cp.spawn(process.execPath,[p.js],{cwd:path.dirname(ed.document.uri.fsPath)});child.stdout.on('data',x=>output.append(x.toString()));child.stderr.on('data',x=>output.append(x.toString()));child.on('close',code=>output.appendLine(`\n[exit ${code}]`));}catch(e){vscode.window.showErrorMessage(e.message);}
  }));

  context.subscriptions.push(vscode.commands.registerCommand('bilascript.debugFile',async()=>{
    const ed=vscode.window.activeTextEditor;if(!ed)return;try{const p=await compileDocument(ed.document,true);await vscode.debug.startDebugging(vscode.workspace.getWorkspaceFolder(ed.document.uri),{type:'node',request:'launch',name:'BilaScript: Debug current file',program:p.js,cwd:path.dirname(ed.document.uri.fsPath),sourceMaps:true,smartStep:true,outFiles:[p.js]});}catch(e){vscode.window.showErrorMessage(`BilaScript debug: ${e.message}`);}
  }));
}

function deactivate(){}
module.exports={activate,deactivate};
