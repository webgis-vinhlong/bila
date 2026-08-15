/**
 * BilaScript DevKit compiler core
 * AST-first BilaScript -> JavaScript compiler.
 * MIT License.
 * This preview targets practical browser/Node applications, not full ECMAScript/Test262.
 */

export const VERSION = '5.0.0-devkit-preview';

export const KEYWORDS = Object.freeze({
  haml_sob: 'function', bilb: 'var', neub: 'if', kac: 'else', vil: 'for',
  trogp_ki: 'while', trov_ved: 'return', moix: 'new', voy_jaj_trir: 'null',
  thatf: 'true', sai: 'false', thuv: 'try', chupr_layb: 'catch', nemj: 'throw',
  cujb_cugl: 'finally', laml: 'do', zugk: 'break', tifb_tucr: 'continue',
  lopx: 'class', nhapf: 'import', xadb: 'export', tuk: 'from'
});

export const STRUCTURAL = new Set([
  'typeof','void','delete','in','instanceof','this','async','await','extends','static','as',
  'let','const','of','switch','case','default','new','function','var','if','else','for','while',
  'return','null','true','false','try','catch','throw','finally','do','break','continue','class',
  'import','export','from'
]);

export const GLOBAL_ALIASES = Object.freeze({
  Magz:'Array', Suh_vatf:'Object', Haml_sob:'Function', Wayl:'Date', mony_Tolj:'Math',
  Chujg:'String', Sob:'Number', Lalf_lij:'Boolean'
});

export const MEMBER_ALIASES = Object.freeze({
  dof_zail:'length', dayq:'push', layb_cujb:'pop', sapx_xepb:'sort', daoz_wush:'reverse',
  ahj_xar:'map', locr:'filter', cho_moig:'forEach', motf_vail:'some', takj:'split',
  chujg_con:'substring', kopx:'match', timl_civb:'search', thay_theb:'replace',
  denb_chujg:'toString', goir:'call', ap_zugr:'apply', waug_nhily:'random',
  laml_tronl:'round', cano_bacf_hai:'sqrt', jaj_trir_tydf_doib:'abs', trand:'ceil',
  sanl:'floor', lys_thuak:'pow'
});

const REVERSE_KEYWORDS = Object.freeze(Object.fromEntries(Object.entries(KEYWORDS).map(([k,v])=>[v,k])));
const OPERATORS = [
  '>>>=','===','!==','**=','??=','>>>','...','=>','?.','==','!=','<=','>=','++','--','+=','-=','*=','/=','%=','&&','||','??','**','<<','>>','&=','|=','^='
];
const SINGLE = new Set('{}()[];,.?:+-*/%<>=!&|^~');
const ASSIGN = new Set(['=','+=','-=','*=','/=','%=','&=','|=','^=','**=','??=']);
const PRECEDENCE = Object.freeze({'??':1,'||':2,'&&':3,'|':4,'^':5,'&':6,'==':7,'!=':7,'===':7,'!==':7,'<':8,'>':8,'<=':8,'>=':8,'in':8,'instanceof':8,'<<':9,'>>':9,'>>>':9,'+':10,'-':10,'*':11,'/':11,'%':11,'**':12});

const idStart = ch => !!ch && (ch === '$' || ch === '_' || /\p{ID_Start}/u.test(ch));
const idPart = ch => !!ch && (ch === '$' || ch === '_' || /\p{ID_Continue}/u.test(ch));

export class BilaSyntaxError extends SyntaxError {
  constructor(message, tokenOrPos) {
    const p = tokenOrPos?.start || tokenOrPos || {};
    super(`${message}${p.line ? ` tại dòng ${p.line}, cột ${p.column}` : ''}`);
    this.name = 'BilaSyntaxError';
    this.line = p.line || null;
    this.column = p.column || null;
    this.offset = p.offset ?? null;
    this.token = tokenOrPos?.type ? tokenOrPos : null;
  }
}

function detectProfile(input) {
  const original = String(input ?? '');
  const re = /^\uFEFF?\s*---(?:bila(?::(strict|js))?|cvss|cvnss|cvnss40|cvnss4)---\s*(?:\r?\n|$)/;
  const m = original.match(re);
  if (!m) return {mode:'bila', source:original, directive:null, offset:0, lineOffset:0};
  return {mode:m[1] || 'bila', source:original.slice(m[0].length), directive:m[0].trim(), offset:m[0].length, lineOffset:(m[0].match(/\n/g)||[]).length};
}

function canStartRegex(prev) {
  if (!prev) return true;
  if (prev.type === 'keyword') return !new Set(['true','false','null','this']).has(prev.value);
  if (prev.type === 'punctuator') return new Set(['(','{','[',',',';',':','?','=','==','===','!=','!==','!','&&','||','??','=>','+=','-=','*=','/=','%=']).has(prev.value);
  return false;
}

export function lex(input) {
  const profile = detectProfile(input);
  const source = profile.source;
  const tokens = [];
  const diagnostics = [];
  let i=0, line=1+profile.lineOffset, column=1, prev=null;
  const peek=(n=0)=>source[i+n]||'';
  const pos=()=>({offset:profile.offset+i,line,column});
  const advance=()=>{ const c=source[i++]||''; if(c==='\n'){line++;column=1;} else column++; return c; };
  const add=(type,value,raw,start,extra={})=>{ const t={type,value,raw,start,end:pos(),...extra}; tokens.push(t); prev=t; return t; };

  while(i<source.length){
    const ch=peek();
    if(/\s/u.test(ch)){advance();continue;}
    if(ch==='/'&&peek(1)==='/'){ while(i<source.length&&advance()!=='\n'){} continue; }
    if(ch==='/'&&peek(1)==='*'){
      const start=pos(); advance();advance();
      while(i<source.length && !(peek()==='*'&&peek(1)==='/')) advance();
      if(i>=source.length) throw new BilaSyntaxError('Comment chưa đóng',start);
      advance();advance();continue;
    }
    const start=pos();
    if(idStart(ch)){
      let raw=advance(); while(idPart(peek())) raw+=advance();
      let value=raw, canonical=null, mapped=false;
      if(Object.prototype.hasOwnProperty.call(KEYWORDS,raw)){ value=KEYWORDS[raw]; canonical=raw; mapped=true; }
      else if(profile.mode==='strict' && Object.prototype.hasOwnProperty.call(REVERSE_KEYWORDS,raw)){
        diagnostics.push({severity:'error',code:'BILA-K001',message:`Từ khóa JavaScript '${raw}' bị cấm trong bila:strict; dùng '${REVERSE_KEYWORDS[raw]}'`,line:start.line,column:start.column});
        value=raw; mapped=true;
      }
      else if(STRUCTURAL.has(raw)){ value=raw; }
      else if(profile.mode!=='strict' && Object.prototype.hasOwnProperty.call(REVERSE_KEYWORDS,raw)){ value=raw; canonical=REVERSE_KEYWORDS[raw]; mapped=true; }
      if(mapped || STRUCTURAL.has(raw)) add('keyword',value,raw,start,{canonical}); else add('identifier',raw,raw,start);
      continue;
    }
    if(/\d/.test(ch)||(ch==='.'&&/\d/.test(peek(1)))){
      let raw='';
      const take=re=>{while(re.test(peek()))raw+=advance();};
      if(ch==='0'&&/[xX]/.test(peek(1))){raw+=advance()+advance();take(/[0-9A-Fa-f_]/);}
      else if(ch==='0'&&/[bB]/.test(peek(1))){raw+=advance()+advance();take(/[01_]/);}
      else if(ch==='0'&&/[oO]/.test(peek(1))){raw+=advance()+advance();take(/[0-7_]/);}
      else { take(/[0-9_]/); if(peek()==='.') {raw+=advance();take(/[0-9_]/);} if(/[eE]/.test(peek())){raw+=advance();if(/[+-]/.test(peek()))raw+=advance();take(/[0-9_]/);} }
      if(peek()==='n') raw+=advance();
      add('number',raw.replace(/_/g,''),raw,start); continue;
    }
    if(ch==='"'||ch==="'"){
      const quote=advance(); let raw=quote, value='', closed=false;
      while(i<source.length){ const c=advance(); raw+=c; if(c===quote){closed=true;break;} if(c==='\n'||!c)break; if(c==='\\'){const e=advance();raw+=e;value+='\\'+e;} else value+=c; }
      if(!closed) throw new BilaSyntaxError('Chuỗi chưa đóng',start);
      add('string',value,raw,start); continue;
    }
    if(ch==='`'){
      let raw=advance(),closed=false;
      while(i<source.length){const c=advance();raw+=c;if(c==='\\'){const e=advance();raw+=e;continue;}if(c==='`'){closed=true;break;}}
      if(!closed) throw new BilaSyntaxError('Template literal chưa đóng',start);
      add('template',raw,raw,start); continue;
    }
    if(ch==='/'&&canStartRegex(prev)){
      let raw=advance(),inClass=false,closed=false;
      while(i<source.length){const c=advance();raw+=c;if(c==='\\'){const e=advance();raw+=e;continue;}if(c==='[')inClass=true;if(c===']')inClass=false;if(c==='/'&&!inClass){closed=true;break;}if(c==='\n')break;}
      if(!closed) throw new BilaSyntaxError('Regex literal chưa đóng',start);
      while(/[A-Za-z]/.test(peek())) raw+=advance(); add('regex',raw,raw,start); continue;
    }
    const op=OPERATORS.find(x=>source.startsWith(x,i));
    if(op){for(let k=0;k<op.length;k++)advance();add('punctuator',op,op,start);continue;}
    if(SINGLE.has(ch)){advance();add('punctuator',ch,ch,start);continue;}
    throw new BilaSyntaxError(`Ký tự không hợp lệ '${ch}'`,start);
  }
  const eof=pos(); tokens.push({type:'eof',value:'<eof>',raw:'',start:eof,end:eof});
  return {mode:profile.mode,directive:profile.directive,tokens,diagnostics,source:String(input??'')};
}

const loc=(a,b=a)=>({start:a?.start||a?.loc?.start||a||null,end:b?.end||b?.loc?.end||b?.start||b||null});

export class Parser {
  constructor(source){ const l=lex(source); this.tokens=l.tokens; this.mode=l.mode; this.directive=l.directive; this.lexDiagnostics=l.diagnostics; this.i=0; }
  cur(n=0){return this.tokens[this.i+n];}
  next(){return this.tokens[this.i++];}
  at(v){return this.cur()?.value===v;}
  atType(t){return this.cur()?.type===t;}
  eat(v){if(this.at(v))return this.next();return null;}
  expect(v,msg=`Mong đợi '${v}'`){if(!this.at(v))throw new BilaSyntaxError(msg,this.cur());return this.next();}
  id(){const t=this.cur();if(t.type!=='identifier')throw new BilaSyntaxError('Mong đợi định danh',t);this.next();return {type:'Identifier',name:t.value,loc:loc(t)};}
  key(){const t=this.cur(); if(t.type==='identifier'||t.type==='keyword'){this.next();return {type:'Identifier',name:t.raw||t.value,loc:loc(t)};} if(t.type==='string'||t.type==='number'){this.next();return this.literal(t);} throw new BilaSyntaxError('Mong đợi property name',t);}
  literal(t){if(t.type==='number') return {type:'Literal',value:Number(t.value),raw:t.raw,loc:loc(t)}; if(t.type==='string') return {type:'Literal',value:t.value,raw:t.raw,loc:loc(t)}; return null;}

  parse(){const start=this.cur();const body=[];while(this.cur().type!=='eof')body.push(this.statement());return {ast:{type:'Program',sourceType:body.some(x=>x.type.startsWith('Import')||x.type.startsWith('Export'))?'module':'script',body,bilaMode:this.mode,directive:this.directive,loc:loc(start,this.cur())},mode:this.mode,directive:this.directive,diagnostics:[...this.lexDiagnostics]};}

  statement(){
    const t=this.cur();
    if(this.eat(';'))return {type:'EmptyStatement',loc:loc(t)};
    if(this.at('{'))return this.block();
    if(t.type==='keyword'){
      switch(t.value){
        case 'var': case 'let': case 'const': return this.varDecl(true);
        case 'function': return this.functionDecl(false);
        case 'async': if(this.cur(1)?.value==='function'){this.next();return this.functionDecl(true,t);} break;
        case 'if': return this.ifStmt();
        case 'while': return this.whileStmt();
        case 'do': return this.doStmt();
        case 'for': return this.forStmt();
        case 'return': return this.returnStmt();
        case 'break': {const s=this.next();this.eat(';');return {type:'BreakStatement',loc:loc(s)};}
        case 'continue': {const s=this.next();this.eat(';');return {type:'ContinueStatement',loc:loc(s)};}
        case 'throw': return this.throwStmt();
        case 'try': return this.tryStmt();
        case 'class': return this.classDecl();
        case 'import': return this.importDecl();
        case 'export': return this.exportDecl();
        case 'switch': return this.switchStmt();
      }
    }
    const s=this.cur();const expression=this.expression();const e=this.eat(';')||this.tokens[this.i-1];return {type:'ExpressionStatement',expression,loc:loc(s,e)};
  }

  block(){const s=this.expect('{');const body=[];while(!this.at('}')){if(this.cur().type==='eof')throw new BilaSyntaxError('Khối lệnh chưa đóng',this.cur());body.push(this.statement());}const e=this.expect('}');return {type:'BlockStatement',body,loc:loc(s,e)};}

  parseBinding(){
    if(this.atType('identifier'))return this.id();
    if(this.eat('[')){const elements=[];while(!this.at(']')){if(this.eat(',')){elements.push(null);continue;}if(this.eat('...')){elements.push({type:'RestElement',argument:this.parseBinding()});break;}elements.push(this.parseBinding());if(!this.eat(','))break;}const e=this.expect(']');return {type:'ArrayPattern',elements,loc:loc(elements.find(Boolean)||e,e)};}
    if(this.eat('{')){const properties=[];while(!this.at('}')){if(this.eat('...')){properties.push({type:'RestElement',argument:this.parseBinding()});break;}const key=this.key();let value=key;if(this.eat(':'))value=this.parseBinding();properties.push({type:'Property',key,value,shorthand:value===key,computed:false,kind:'init'});if(!this.eat(','))break;}const e=this.expect('}');return {type:'ObjectPattern',properties,loc:loc(properties[0]||e,e)};}
    throw new BilaSyntaxError('Mong đợi binding pattern',this.cur());
  }

  skipTypeAnnotation(){
    if(!this.eat(':'))return null;
    const start=this.tokens[this.i-1];let depth=0;const parts=[];
    while(this.cur().type!=='eof'){
      const t=this.cur(); const v=t.value;
      if(depth===0 && ['=',',',';',')','{','}'].includes(v))break;
      if(v==='<'){ depth++; parts.push(this.next().raw); continue; }
      if(depth>0 && typeof v==='string' && v.startsWith('>')){
        let closes=0; while(closes<v.length && v[closes]==='>' && depth>0){closes++;depth--;}
        parts.push('>'.repeat(closes));
        const rest=v.slice(closes);
        if(rest){ this.tokens[this.i]={...t,value:rest,raw:rest}; } else this.i++;
        if(depth===0) break;
        continue;
      }
      parts.push(this.next().raw);
    }
    return {type:'BilaTypeAnnotation',raw:parts.join(''),loc:loc(start,this.tokens[this.i-1]||start)};
  }

  varDecl(withSemi){const s=this.next();const kind=s.value;const declarations=[];do{const id=this.parseBinding();const typeAnnotation=this.skipTypeAnnotation();let init=null;if(this.eat('='))init=this.expression();declarations.push({type:'VariableDeclarator',id,typeAnnotation,init,loc:loc(id,init||id)});}while(this.eat(','));const e=withSemi?(this.eat(';')||this.tokens[this.i-1]):this.tokens[this.i-1];return {type:'VariableDeclaration',kind,declarations,loc:loc(s,e)};}

  params(){this.expect('(');const params=[];if(!this.at(')')){do{let p;if(this.eat('...'))p={type:'RestElement',argument:this.parseBinding()};else p=this.parseBinding();p.typeAnnotation=this.skipTypeAnnotation();params.push(p);}while(this.eat(','));}this.expect(')');return params;}
  functionDecl(asyncFlag=false,startOverride=null){const fn=this.expect('function');const id=this.id();const params=this.params();const returnType=this.skipTypeAnnotation();const body=this.block();return {type:'FunctionDeclaration',id,params,returnType,body,async:asyncFlag,generator:false,loc:loc(startOverride||fn,body)};}
  functionExpr(asyncFlag=false,startOverride=null){const fn=this.expect('function');let id=null;if(this.atType('identifier'))id=this.id();const params=this.params();const returnType=this.skipTypeAnnotation();const body=this.block();return {type:'FunctionExpression',id,params,returnType,body,async:asyncFlag,generator:false,loc:loc(startOverride||fn,body)};}
  ifStmt(){const s=this.expect('if');this.expect('(');const test=this.expression();this.expect(')');const consequent=this.statement();let alternate=null;if(this.eat('else'))alternate=this.statement();return {type:'IfStatement',test,consequent,alternate,loc:loc(s,alternate||consequent)};}
  whileStmt(){const s=this.expect('while');this.expect('(');const test=this.expression();this.expect(')');const body=this.statement();return {type:'WhileStatement',test,body,loc:loc(s,body)};}
  doStmt(){const s=this.expect('do');const body=this.statement();this.expect('while');this.expect('(');const test=this.expression();this.expect(')');const e=this.eat(';')||this.tokens[this.i-1];return {type:'DoWhileStatement',body,test,loc:loc(s,e)};}
  forStmt(){
    const s=this.expect('for');this.expect('(');let init=null;
    if(!this.at(';')) init=['var','let','const'].includes(this.cur().value)?this.varDecl(false):this.expression();
    if(this.at('in')||this.at('of')){const operator=this.next().value;const right=this.expression();this.expect(')');const body=this.statement();return {type:operator==='of'?'ForOfStatement':'ForInStatement',left:init,right,body,await:false,loc:loc(s,body)};}
    this.expect(';');let test=null,update=null;if(!this.at(';'))test=this.expression();this.expect(';');if(!this.at(')'))update=this.expression();this.expect(')');const body=this.statement();return {type:'ForStatement',init,test,update,body,loc:loc(s,body)};
  }
  returnStmt(){const s=this.expect('return');let argument=null;if(!this.at(';')&&!this.at('}')&&this.cur().type!=='eof')argument=this.expression();const e=this.eat(';')||this.tokens[this.i-1];return {type:'ReturnStatement',argument,loc:loc(s,e)};}
  throwStmt(){const s=this.expect('throw');const argument=this.expression();const e=this.eat(';')||this.tokens[this.i-1];return {type:'ThrowStatement',argument,loc:loc(s,e)};}
  tryStmt(){const s=this.expect('try');const block=this.block();let handler=null,finalizer=null;if(this.eat('catch')){let param=null;if(this.eat('(')){param=this.parseBinding();this.expect(')');}const body=this.block();handler={type:'CatchClause',param,body,loc:loc(param||body,body)};}if(this.eat('finally'))finalizer=this.block();if(!handler&&!finalizer)throw new BilaSyntaxError('try cần catch hoặc finally',this.cur());return {type:'TryStatement',block,handler,finalizer,loc:loc(s,finalizer||handler||block)};}

  classDecl(){const s=this.expect('class');const id=this.id();let superClass=null;if(this.eat('extends'))superClass=this.postfix(this.primary());this.expect('{');const methods=[];while(!this.at('}')){let isStatic=false,isAsync=false;if(this.eat('static'))isStatic=true;if(this.eat('async'))isAsync=true;const key=this.key();const params=this.params();const returnType=this.skipTypeAnnotation();const body=this.block();methods.push({type:'MethodDefinition',key,params,returnType,body,kind:key.name==='constructor'?'constructor':'method',static:isStatic,async:isAsync});}const e=this.expect('}');return {type:'ClassDeclaration',id,superClass,body:{type:'ClassBody',body:methods},loc:loc(s,e)};}

  importDecl(){const s=this.expect('import');const specifiers=[];if(this.atType('string')){const src=this.next();this.eat(';');return {type:'ImportDeclaration',specifiers,source:this.literal(src),loc:loc(s,src)};}if(this.atType('identifier')){specifiers.push({type:'ImportDefaultSpecifier',local:this.id()});if(this.eat(',')){} }if(this.eat('{')){if(!this.at('}')){do{const imported=this.id();let local=imported;if(this.eat('as'))local=this.id();specifiers.push({type:'ImportSpecifier',imported,local});}while(this.eat(','));}this.expect('}');}else if(this.eat('*')){this.expect('as');specifiers.push({type:'ImportNamespaceSpecifier',local:this.id()});}this.expect('from');const src=this.cur();if(src.type!=='string')throw new BilaSyntaxError('Nguồn import phải là chuỗi',src);this.next();this.eat(';');return {type:'ImportDeclaration',specifiers,source:this.literal(src),loc:loc(s,src)};}
  exportDecl(){const s=this.expect('export');if(this.eat('default')){if(this.at('function'))return {type:'ExportDefaultDeclaration',declaration:this.functionDecl(false),loc:loc(s,this.tokens[this.i-1])};if(this.at('class'))return {type:'ExportDefaultDeclaration',declaration:this.classDecl(),loc:loc(s,this.tokens[this.i-1])};const declaration=this.expression();this.eat(';');return {type:'ExportDefaultDeclaration',declaration,loc:loc(s,declaration)};}if(this.at('function')){const declaration=this.functionDecl();return {type:'ExportNamedDeclaration',declaration,specifiers:[],source:null,loc:loc(s,declaration)};}if(this.at('class')){const declaration=this.classDecl();return {type:'ExportNamedDeclaration',declaration,specifiers:[],source:null,loc:loc(s,declaration)};}if(['var','let','const'].includes(this.cur().value)){const declaration=this.varDecl(true);return {type:'ExportNamedDeclaration',declaration,specifiers:[],source:null,loc:loc(s,declaration)};}this.expect('{');const specifiers=[];if(!this.at('}')){do{const local=this.id();let exported=local;if(this.eat('as'))exported=this.id();specifiers.push({type:'ExportSpecifier',local,exported});}while(this.eat(','));}const e=this.expect('}');let source=null;if(this.eat('from')){const t=this.cur();if(t.type!=='string')throw new BilaSyntaxError('Nguồn export phải là chuỗi',t);this.next();source=this.literal(t);}this.eat(';');return {type:'ExportNamedDeclaration',declaration:null,specifiers,source,loc:loc(s,e)};}

  switchStmt(){const s=this.expect('switch');this.expect('(');const discriminant=this.expression();this.expect(')');this.expect('{');const cases=[];while(!this.at('}')){let test=null;const ct=this.cur();if(this.eat('case'))test=this.expression();else if(this.eat('default'))test=null;else throw new BilaSyntaxError("Mong đợi 'case' hoặc 'default'",ct);this.expect(':');const consequent=[];while(!this.at('case')&&!this.at('default')&&!this.at('}'))consequent.push(this.statement());cases.push({type:'SwitchCase',test,consequent,loc:loc(ct,consequent.at(-1)||ct)});}const e=this.expect('}');return {type:'SwitchStatement',discriminant,cases,loc:loc(s,e)};}

  expression(){return this.assignment();}
  assignment(){
    // Arrow with parenthesized parameter list.
    if(this.at('(')){
      const saved=this.i;
      try{
        this.next();const params=[];let ok=true;
        if(!this.at(')')){do{let p;if(this.eat('...'))p={type:'RestElement',argument:this.parseBinding()};else if(this.atType('identifier'))p=this.parseBinding();else {ok=false;break;}p.typeAnnotation=this.skipTypeAnnotation();params.push(p);}while(this.eat(','));}
        if(ok&&this.eat(')')&&this.eat('=>'))return this.finishArrow(params,this.tokens[saved]);
      }catch{}
      this.i=saved;
    }
    let left=this.conditional();
    if(this.at('=>')){if(left.type!=='Identifier')throw new BilaSyntaxError('Tham số arrow đơn phải là định danh',this.cur());const a=this.next();return this.finishArrow([left],a);}
    if(ASSIGN.has(this.cur().value)){const op=this.next().value;const right=this.assignment();return {type:'AssignmentExpression',operator:op,left,right,loc:loc(left,right)};}
    return left;
  }
  finishArrow(params,start){const body=this.at('{')?this.block():this.assignment();return {type:'ArrowFunctionExpression',params,body,expression:body.type!=='BlockStatement',async:false,loc:loc(start,body)};}
  conditional(){let test=this.binary(1);if(this.eat('?')){const consequent=this.expression();this.expect(':');const alternate=this.assignment();return {type:'ConditionalExpression',test,consequent,alternate,loc:loc(test,alternate)};}return test;}
  binary(min){let left=this.unary();while(true){const op=this.cur().value;const p=PRECEDENCE[op];if(!p||p<min)break;this.next();const right=this.binary(op==='**'?p:p+1);left={type:['&&','||','??'].includes(op)?'LogicalExpression':'BinaryExpression',operator:op,left,right,loc:loc(left,right)};}return left;}
  unary(){const t=this.cur();if(['!','~','+','-','typeof','void','delete'].includes(t.value)){this.next();const argument=this.unary();return {type:'UnaryExpression',operator:t.value,prefix:true,argument,loc:loc(t,argument)};}if(t.value==='await'){this.next();const argument=this.unary();return {type:'AwaitExpression',argument,loc:loc(t,argument)};}if(['++','--'].includes(t.value)){this.next();const argument=this.unary();return {type:'UpdateExpression',operator:t.value,prefix:true,argument,loc:loc(t,argument)};}return this.postfix(this.primary());}
  postfix(base){let node=base;while(true){if(this.eat('(')){const args=[];if(!this.at(')')){do{if(this.eat('...'))args.push({type:'SpreadElement',argument:this.assignment()});else args.push(this.assignment());}while(this.eat(','));}const e=this.expect(')');node={type:'CallExpression',callee:node,arguments:args,optional:false,loc:loc(node,e)};continue;}if(this.eat('?.')){if(this.eat('(')){const args=[];if(!this.at(')')){do{args.push(this.assignment());}while(this.eat(','));}const e=this.expect(')');node={type:'CallExpression',callee:node,arguments:args,optional:true,loc:loc(node,e)};}else if(this.eat('[')){const property=this.expression();const e=this.expect(']');node={type:'MemberExpression',object:node,property,computed:true,optional:true,loc:loc(node,e)};}else{const property=this.key();node={type:'MemberExpression',object:node,property,computed:false,optional:true,loc:loc(node,property)};}continue;}if(this.eat('.')){const property=this.key();node={type:'MemberExpression',object:node,property,computed:false,optional:false,loc:loc(node,property)};continue;}if(this.eat('[')){const property=this.expression();const e=this.expect(']');node={type:'MemberExpression',object:node,property,computed:true,optional:false,loc:loc(node,e)};continue;}if(['++','--'].includes(this.cur().value)){const t=this.next();node={type:'UpdateExpression',operator:t.value,prefix:false,argument:node,loc:loc(node,t)};continue;}break;}return node;}

  primary(){
    const t=this.cur();
    if(t.type==='number'||t.type==='string'){this.next();return this.literal(t);}
    if(t.type==='template'){this.next();return {type:'TemplateLiteralRaw',raw:t.raw,loc:loc(t)};}
    if(t.type==='regex'){this.next();return {type:'RegexLiteral',raw:t.raw,loc:loc(t)};}
    if(t.type==='identifier'){return this.id();}
    if(t.type==='keyword'){
      if(t.value==='true'||t.value==='false'||t.value==='null'){this.next();return {type:'Literal',value:t.value==='true'?true:t.value==='false'?false:null,raw:t.value,loc:loc(t)};}
      if(t.value==='this'){this.next();return {type:'ThisExpression',loc:loc(t)};}
      if(t.value==='new'){this.next();const callee=this.postfix(this.primary());return {type:'NewExpression',callee:callee.type==='CallExpression'?callee.callee:callee,arguments:callee.type==='CallExpression'?callee.arguments:[],loc:loc(t,callee)};}
      if(t.value==='function')return this.functionExpr(false);
      if(t.value==='async'&&this.cur(1)?.value==='function'){this.next();return this.functionExpr(true,t);}
    }
    if(this.eat('(')){const e=this.expression();this.expect(')');return e;}
    if(this.eat('[')){const elements=[];while(!this.at(']')){if(this.eat(',')){elements.push(null);continue;}if(this.eat('...'))elements.push({type:'SpreadElement',argument:this.assignment()});else elements.push(this.assignment());if(!this.eat(','))break;}const e=this.expect(']');return {type:'ArrayExpression',elements,loc:loc(t,e)};}
    if(this.eat('{')){const properties=[];while(!this.at('}')){if(this.eat('...')){properties.push({type:'SpreadElement',argument:this.assignment()});}else{const key=this.key();if(this.at('(')){const params=this.params();const body=this.block();properties.push({type:'Property',key,value:{type:'FunctionExpression',id:null,params,body,async:false,generator:false},method:true,shorthand:false,computed:false,kind:'init'});}else{let value=key,shorthand=true;if(this.eat(':')){value=this.assignment();shorthand=false;}properties.push({type:'Property',key,value,method:false,shorthand,computed:false,kind:'init'});}}if(!this.eat(','))break;}const e=this.expect('}');return {type:'ObjectExpression',properties,loc:loc(t,e)};}
    throw new BilaSyntaxError(`Biểu thức không hợp lệ gần '${t.raw||t.value}'`,t);
  }
}

export function parse(source){return new Parser(source).parse();}

function jsId(name){return GLOBAL_ALIASES[name]||name;}
function propertyName(node){return node?.name ?? node?.value;}
function mappedProperty(node){const name=propertyName(node);return MEMBER_ALIASES[name]||name;}

class Codegen {
  constructor(){this.out='';this.indent=0;this.generatedLine=1;this.marks=[];}
  emit(s){this.out+=s;for(const c of s)if(c==='\n')this.generatedLine++;}
  pad(){return '  '.repeat(this.indent);}
  mark(n){const line=n?.loc?.start?.line;if(line)this.marks.push({generatedLine:this.generatedLine,originalLine:line});}
  program(ast){for(const s of ast.body)this.statement(s);return {code:this.out.endsWith('\n')?this.out:this.out+'\n',marks:this.marks};}
  block(n){this.emit('{\n');this.indent++;for(const s of n.body)this.statement(s);this.indent--;this.emit(this.pad()+'}');}
  varInline(n){return `${n.kind} `+n.declarations.map(d=>this.pattern(d.id)+(d.init?' = '+this.expr(d.init):'')).join(', ');}
  statement(n){this.mark(n);const p=this.pad();switch(n.type){
    case 'EmptyStatement':this.emit(p+';\n');break;
    case 'BlockStatement':this.emit(p);this.block(n);this.emit('\n');break;
    case 'VariableDeclaration':this.emit(p+this.varInline(n)+';\n');break;
    case 'FunctionDeclaration':this.emit(p+(n.async?'async ':'')+`function ${this.expr(n.id)}(${n.params.map(x=>this.pattern(x)).join(', ')}) `);this.block(n.body);this.emit('\n');break;
    case 'IfStatement':this.emit(p+`if (${this.expr(n.test)}) `);this.inlineStmt(n.consequent);if(n.alternate){this.emit(' else ');this.inlineStmt(n.alternate);}this.emit('\n');break;
    case 'WhileStatement':this.emit(p+`while (${this.expr(n.test)}) `);this.inlineStmt(n.body);this.emit('\n');break;
    case 'DoWhileStatement':this.emit(p+'do ');this.inlineStmt(n.body);this.emit(` while (${this.expr(n.test)});\n`);break;
    case 'ForStatement':this.emit(p+`for (${n.init?(n.init.type==='VariableDeclaration'?this.varInline(n.init):this.expr(n.init)):''}; ${n.test?this.expr(n.test):''}; ${n.update?this.expr(n.update):''}) `);this.inlineStmt(n.body);this.emit('\n');break;
    case 'ForOfStatement':case 'ForInStatement':this.emit(p+`for (${n.left.type==='VariableDeclaration'?this.varInline(n.left):this.expr(n.left)} ${n.type==='ForOfStatement'?'of':'in'} ${this.expr(n.right)}) `);this.inlineStmt(n.body);this.emit('\n');break;
    case 'ReturnStatement':this.emit(p+'return'+(n.argument?' '+this.expr(n.argument):'')+';\n');break;
    case 'BreakStatement':this.emit(p+'break;\n');break;
    case 'ContinueStatement':this.emit(p+'continue;\n');break;
    case 'ThrowStatement':this.emit(p+'throw '+this.expr(n.argument)+';\n');break;
    case 'TryStatement':this.emit(p+'try ');this.inlineStmt(n.block);if(n.handler){this.emit(' catch'+(n.handler.param?` (${this.pattern(n.handler.param)})`:'')+' ');this.inlineStmt(n.handler.body);}if(n.finalizer){this.emit(' finally ');this.inlineStmt(n.finalizer);}this.emit('\n');break;
    case 'ClassDeclaration':this.emit(p+`class ${this.expr(n.id)}${n.superClass?' extends '+this.expr(n.superClass):''} {\n`);this.indent++;for(const m of n.body.body){this.emit(this.pad()+(m.static?'static ':'')+(m.async?'async ':'')+`${propertyName(m.key)}(${m.params.map(x=>this.pattern(x)).join(', ')}) `);this.block(m.body);this.emit('\n');}this.indent--;this.emit(p+'}\n');break;
    case 'ImportDeclaration':{if(!n.specifiers.length){this.emit(p+`import ${JSON.stringify(n.source.value)};\n`);break;}const def=n.specifiers.find(x=>x.type==='ImportDefaultSpecifier');const ns=n.specifiers.find(x=>x.type==='ImportNamespaceSpecifier');const named=n.specifiers.filter(x=>x.type==='ImportSpecifier');const parts=[];if(def)parts.push(def.local.name);if(ns)parts.push(`* as ${ns.local.name}`);if(named.length)parts.push(`{ ${named.map(x=>x.imported.name===x.local.name?x.imported.name:`${x.imported.name} as ${x.local.name}`).join(', ')} }`);this.emit(p+`import ${parts.join(', ')} from ${JSON.stringify(n.source.value)};\n`);break;}
    case 'ExportNamedDeclaration':if(n.declaration){this.emit(p+'export ');this.statementNoPad(n.declaration);}else{this.emit(p+`export { ${n.specifiers.map(x=>x.local.name===x.exported.name?x.local.name:`${x.local.name} as ${x.exported.name}`).join(', ')} }${n.source?' from '+JSON.stringify(n.source.value):''};\n`);}break;
    case 'ExportDefaultDeclaration':this.emit(p+'export default ');if(['FunctionDeclaration','ClassDeclaration'].includes(n.declaration.type)){this.statementNoPad(n.declaration);}else this.emit(this.expr(n.declaration)+';\n');break;
    case 'SwitchStatement':this.emit(p+`switch (${this.expr(n.discriminant)}) {\n`);this.indent++;for(const c of n.cases){this.emit(this.pad()+(c.test?'case '+this.expr(c.test):'default')+':\n');this.indent++;for(const s of c.consequent)this.statement(s);this.indent--;}this.indent--;this.emit(p+'}\n');break;
    case 'ExpressionStatement':this.emit(p+this.expr(n.expression)+';\n');break;
    default:throw new Error(`Codegen chưa hỗ trợ statement ${n.type}`);
  }}
  statementNoPad(n){const before=this.out.length;const old=this.pad;const originalPad=this.pad.bind(this);this.pad=()=>'';this.statement(n);this.pad=originalPad;}
  inlineStmt(n){if(n.type==='BlockStatement'){this.block(n);return;}this.emit('{\n');this.indent++;this.statement(n);this.indent--;this.emit(this.pad()+'}');}
  pattern(n){if(!n)return '';if(n.type==='Identifier')return n.name;if(n.type==='RestElement')return '...'+this.pattern(n.argument);if(n.type==='ArrayPattern')return '['+n.elements.map(x=>x?this.pattern(x):'').join(', ')+']';if(n.type==='ObjectPattern')return '{'+n.properties.map(x=>x.type==='RestElement'?this.pattern(x):(x.shorthand?this.pattern(x.key):`${this.pattern(x.key)}: ${this.pattern(x.value)}`)).join(', ')+'}';return this.expr(n);}
  expr(n){switch(n.type){
    case 'Identifier':return jsId(n.name);
    case 'ThisExpression':return 'this';
    case 'Literal':return n.raw ?? (typeof n.value==='string'?JSON.stringify(n.value):n.value===null?'null':String(n.value));
    case 'RegexLiteral':case 'TemplateLiteralRaw':return n.raw;
    case 'ArrayExpression':return '['+n.elements.map(x=>x?this.expr(x):'').join(', ')+']';
    case 'ObjectExpression':return '{'+n.properties.map(x=>x.type==='SpreadElement'?'...'+this.expr(x.argument):x.method?`${propertyName(x.key)}(${x.value.params.map(p=>this.pattern(p)).join(', ')}) ${this.blockToString(x.value.body)}`:x.shorthand?this.expr(x.key):`${x.key.type==='Identifier'?propertyName(x.key):x.key.raw}: ${this.expr(x.value)}`).join(', ')+'}';
    case 'SpreadElement':return '...'+this.expr(n.argument);
    case 'UnaryExpression':return (/[A-Za-z]/.test(n.operator)?n.operator+' ':n.operator)+this.expr(n.argument);
    case 'UpdateExpression':return n.prefix?n.operator+this.expr(n.argument):this.expr(n.argument)+n.operator;
    case 'BinaryExpression':case 'LogicalExpression':return `(${this.expr(n.left)} ${n.operator} ${this.expr(n.right)})`;
    case 'AssignmentExpression':return `${this.expr(n.left)} ${n.operator} ${this.expr(n.right)}`;
    case 'ConditionalExpression':return `(${this.expr(n.test)} ? ${this.expr(n.consequent)} : ${this.expr(n.alternate)})`;
    case 'MemberExpression':{const obj=this.expr(n.object);if(n.computed)return `${obj}${n.optional?'?.':''}[${this.expr(n.property)}]`;return `${obj}${n.optional?'?.':'.'}${mappedProperty(n.property)}`;}
    case 'CallExpression':return `${this.expr(n.callee)}${n.optional?'?.':''}(${n.arguments.map(a=>this.expr(a)).join(', ')})`;
    case 'NewExpression':return `new ${this.expr(n.callee)}(${n.arguments.map(a=>this.expr(a)).join(', ')})`;
    case 'AwaitExpression':return 'await '+this.expr(n.argument);
    case 'FunctionExpression':return (n.async?'async ':'')+`function${n.id?' '+this.expr(n.id):''}(${n.params.map(p=>this.pattern(p)).join(', ')}) ${this.blockToString(n.body)}`;
    case 'ArrowFunctionExpression':return `(${n.params.map(p=>this.pattern(p)).join(', ')}) => ${n.expression?this.expr(n.body):this.blockToString(n.body)}`;
    default:throw new Error(`Codegen chưa hỗ trợ expression ${n.type}`);
  }}
  blockToString(b){const cg=new Codegen();cg.block(b);return cg.out;}
}

export function generate(ast){return new Codegen().program(ast);}

function vlq(n){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let v=n<0?((-n)<<1)|1:(n<<1),out='';do{let d=v&31;v>>>=5;if(v)d|=32;out+=chars[d];}while(v);return out;}
function makeMappings(marks,generatedCode){
  const byLine=new Map();for(const m of marks)if(!byLine.has(m.generatedLine))byLine.set(m.generatedLine,m.originalLine);
  const lines=generatedCode.split('\n').length;let prevOriginal=0;const result=[];
  for(let gl=1;gl<=lines;gl++){
    if(!byLine.has(gl)){result.push('');continue;}
    const original=Math.max(0,byLine.get(gl)-1);const seg=vlq(0)+vlq(0)+vlq(original-prevOriginal)+vlq(0);prevOriginal=original;result.push(seg);
  }
  return result.join(';');
}

export function compile(source, options={}){
  const parsed=parse(source);
  const errors=parsed.diagnostics.filter(d=>d.severity==='error');
  if(errors.length && options.failOnDiagnostic!==false){const e=new Error(errors.map(d=>`${d.code}: ${d.message}`).join('\n'));e.name='BilaCompileTimeError';e.diagnostics=parsed.diagnostics;throw e;}
  const generated=generate(parsed.ast);
  const file=options.fileName||'output.js';const sourceName=options.sourceName||'input.bila';
  const map=options.sourceMap===false?null:{version:3,file,sources:[sourceName],sourcesContent:[String(source)],names:[],mappings:makeMappings(generated.marks,generated.code)};
  const code=map&&options.inlineSourceMap?generated.code+`//# sourceMappingURL=data:application/json;base64,${typeof Buffer!=='undefined'?Buffer.from(JSON.stringify(map)).toString('base64'):btoa(unescape(encodeURIComponent(JSON.stringify(map))))}\n`:generated.code;
  return {version:VERSION,backend:'javascript',mode:parsed.mode,ast:parsed.ast,diagnostics:parsed.diagnostics,code,map};
}

export function check(source){try{const r=parse(source);return {ok:!r.diagnostics.some(d=>d.severity==='error'),diagnostics:r.diagnostics,ast:r.ast};}catch(error){return {ok:false,diagnostics:[{severity:'error',code:'BILA-P001',message:error.message,line:error.line,column:error.column}],ast:null};}}
