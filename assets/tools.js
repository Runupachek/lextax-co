/* ---- lextax.co free tax tools ----
   Pure calculation functions are on window for testability.
   All results are estimates/guidance only — never tax advice,
   never a guaranteed refund. Lead capture asks only for
   name, phone, email — never SSN, ID, IP PIN, or bank details. */
function num(v){ v=parseFloat(v); return isFinite(v)?Math.max(0,v):0; }
function money(n){ return '$'+Math.round(n).toLocaleString('en-US'); }

var STD={single:15000,mfj:30000,mfs:15000,hoh:22500};
var BRACKETS=[
  {upto:11925,rate:.10},
  {upto:48475,rate:.12},
  {upto:103350,rate:.22},
  {upto:197300,rate:.24},
  {upto:250525,rate:.32},
  {upto:626350,rate:.35},
  {upto:Infinity,rate:.37}
];
function fedTax(status,taxable){
  var mult=status==='mfj'?2:(status==='hoh'?1.5:1);
  var tax=0,prev=0;
  for(var i=0;i<BRACKETS.length;i++){
    var cap=BRACKETS[i].upto*mult;
    if(taxable<=prev)break;
    var part=Math.min(taxable,cap)-prev;
    if(part>0)tax+=part*BRACKETS[i].rate;
    prev=cap;
  }
  return tax;
}
/* Rough 2025 federal estimate: standard deduction, brackets,
   $2,000 child tax credit per child under 17 ($1,700 refundable cap). */
function calcRefund(status,income,withheld,kids){
  var taxable=Math.max(0,income-STD[status]);
  var tax=fedTax(status,taxable);
  var ctc=2000*kids;
  var nonRef=Math.min(ctc,tax);
  var refundable=Math.min(Math.max(0,ctc-tax),1700*kids);
  var after=tax-nonRef;
  var refund=withheld-after+refundable;
  var pad=Math.max(250,Math.abs(refund)*0.10);
  return {taxable:taxable,tax:after,refund:refund,low:refund-pad,high:refund+pad};
}
/* Business deductions: 2025 standard mileage $0.70/mi, phone at 50% business use. */
function calcBiz(miles,phoneMo,supplies,other){
  var mileage=miles*0.70;
  var phone=phoneMo*12*0.5;
  var total=mileage+phone+supplies+other;
  return {mileage:mileage,phone:phone,supplies:supplies,other:other,total:total,saved:total*0.22};
}
var FILE_THRESH={single:15000,mfj:30000,mfs:5,hoh:22500};
function calcMustFile(status,age,income,se){
  var t=FILE_THRESH[status];
  if(age>=65)t+=(status==='mfj'?1500:1950);
  if(se>=400)return {must:true,reason:'You had $400 or more in self-employment income — the IRS requires a return at that level.'};
  if(income>=t)return {must:true,reason:'Your income of '+money(income)+' is at or above the '+money(t)+' filing threshold for your status.'};
  return {must:false,reason:'Your income is below the '+money(t)+' filing threshold for your status — but you may still be owed a refund from withheld tax or credits, so filing can still pay.'};
}

var FOLLOW='<p class="follow">Follow us on <a href="https://www.instagram.com/lexurious_taxes">Instagram @lexurious_taxes</a> · Facebook @lexurious_taxes · TikTok @lexurious_taxes · YouTube @lexurious_taxes</p>';
var __summaries={};
function buildLeadMailto(tool,name,phone,email,summary){
  var body='New lead from lextax.co — '+tool+'\n\nName: '+name+'\nPhone: '+phone+'\nEmail: '+email+'\n\n'+summary+'\n\n(Please never send Social Security numbers, ID numbers, IP PINs, or bank details.)';
  return 'mailto:alexis@luxurytaxandaccounting.com?subject='+encodeURIComponent('New client lead from lextax.co — '+tool+' — '+name)+'&body='+encodeURIComponent(body);
}
function sendLead(tool,prefix){
  var g=function(id){var el=document.getElementById(prefix+'-'+id);return el?el.value.trim():''};
  var name=g('name'),phone=g('phone'),email=g('email');
  if(!name||!phone||!email){alert('Please add your name, phone, and email so Alexis can reach you.');return false;}
  var summary=__summaries[tool]||'';
  try{var leads=JSON.parse(localStorage.getItem('lextax_leads')||'[]');leads.push({tool:tool,name:name,phone:phone,email:email,at:new Date().toISOString()});localStorage.setItem('lextax_leads',JSON.stringify(leads));}catch(e){}
  try{if(window.LeadPipeline)window.LeadPipeline.savePipelineLead({source:tool,name:name,phone:phone,email:email,service:tool,details:summary});}catch(e){}
  window.location.href=buildLeadMailto(tool,name,phone,email,summary);
  var sent=document.getElementById(prefix+'-sent');if(sent)sent.style.display='block';
  return true;
}
function on(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',fn);}

on('rf-go',function(){
  var st=document.getElementById('rf-status').value;
  var inc=num(document.getElementById('rf-income').value);
  var wh=num(document.getElementById('rf-with').value);
  var kids=parseInt(document.getElementById('rf-kids').value||'0',10)||0;
  var r=calcRefund(st,inc,wh,kids);
  var el=document.getElementById('rf-result');if(!el)return;
  var label=r.refund>=0?'estimated refund':'estimated amount owed';
  el.innerHTML='<div class="big">'+money(Math.abs(r.low))+' – '+money(Math.abs(r.high))+'</div><p>Your '+label+' looks like it lands in this range, based on the numbers you entered.</p><p class="disclaimer">Estimate only — not tax advice, and not a promise of any refund. Alexis runs your real return and gives you the real answer.</p>';
  el.innerHTML += FOLLOW;
  el.classList.add('show');
  var cap=document.getElementById('rf-capture');if(cap)cap.classList.add('show');
  __summaries['Refund Estimator']='Refund Estimator — status: '+st+'; income: '+money(inc)+'; withheld: '+money(wh)+'; children under 17: '+kids+'; estimate range: '+money(r.low)+' to '+money(r.high)+'.';
});
on('rf-send',function(){sendLead('Refund Estimator','rf');});

on('gg-go',function(){
  var miles=num(document.getElementById('gg-miles').value);
  var ph=num(document.getElementById('gg-phone').value);
  var sup=num(document.getElementById('gg-supplies').value);
  var oth=num(document.getElementById('gg-other').value);
  var g=calcBiz(miles,ph,sup,oth);
  var el=document.getElementById('gg-result');if(!el)return;
  el.innerHTML='<div class="big">'+money(g.total)+' in deductions found</div><ul><li>Mileage: '+money(g.mileage)+' ('+Math.round(miles).toLocaleString('en-US')+' miles at $0.70)</li><li>Phone (business share): '+money(g.phone)+'</li><li>Supplies and gear: '+money(g.supplies)+'</li><li>Other business costs: '+money(g.other)+'</li></ul><p>At a rough combined rate, that could mean about <strong>'+money(g.saved)+' back in your pocket</strong> — before Alexis finds the rest.</p><p><strong>Often missed:</strong> home-office space, health insurance, retirement contributions, tolls and parking, and a mileage log. Bring your records and Alexis checks them all.</p><p class="disclaimer">Guidance only — not tax advice. Which deductions you can claim depends on your records. Alexis reviews your real books and tells you what\u2019s yours.</p>';
  el.innerHTML += FOLLOW;
  el.classList.add('show');
  var cap=document.getElementById('gg-capture');if(cap)cap.classList.add('show');
  __summaries['Business Deduction Finder']='Business Deduction Finder — miles: '+miles+'; phone $'+ph+'/mo; supplies: '+money(sup)+'; other: '+money(oth)+'; total deductions found: '+money(g.total)+'; rough tax saved: '+money(g.saved)+'.';
});
on('gg-send',function(){sendLead('Business Deduction Finder','gg');});

on('fc-go',function(){
  var st=document.getElementById('fc-status').value;
  var age=parseInt(document.getElementById('fc-age').value||'0',10)||0;
  var inc=num(document.getElementById('fc-income').value);
  var se=num(document.getElementById('fc-se').value);
  var r=calcMustFile(st,age,inc,se);
  var el=document.getElementById('fc-result');if(!el)return;
  el.innerHTML='<div class="big">'+(r.must?'Yes — you likely need to file.':'Probably not required — but check anyway.')+'</div><p>'+r.reason+'</p><p class="disclaimer">General guidance only — not tax advice. Filing rules have exceptions, and you may still be owed money even when filing isn\u2019t required. Alexis gives you the real answer.</p>';
  el.innerHTML += FOLLOW;
  el.classList.add('show');
  var cap=document.getElementById('fc-capture');if(cap)cap.classList.add('show');
  __summaries['Do I Need to File?']='Do I Need to File? — status: '+st+'; age: '+age+'; income: '+money(inc)+'; self-employment: '+money(se)+'; result: '+(r.must?'likely must file':'probably not required')+'.';
});
on('fc-send',function(){sendLead('Do I Need to File?','fc');});

/* Ready-to-File checklist: booking prompt at 13/13 + lead capture. */
(function(){
  var list=document.getElementById('list');
  if(!list)return;
  list.addEventListener('change',function(){
    var n=list.querySelectorAll('input:checked').length;
    var p=document.getElementById('ready-prompt');
    if(p&&n>=13)p.classList.add('show');
    var done=[];
    list.querySelectorAll('.check-item').forEach(function(it){
      if(it.querySelector('input').checked)done.push(it.querySelector('span').textContent);
    });
    __summaries['Ready-to-File Checklist']='Ready-to-File Checklist — '+n+' of 13 gathered: '+done.join('; ')+'.';
  });
  on('ck-send',function(){sendLead('Ready-to-File Checklist','ck');});
})();
