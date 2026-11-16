/* ---- lextax.co Admin Lead Pipeline (Gemini blend) ----
   Client-side only, exactly like the Gemini Canvas piece it blends in:
   leads are saved in localStorage under `legacy_tax_leads`, listed
   newest-first in the drawer, exportable as CSV, and clearable.
   No server endpoint, no new delivery path — the mail-app handoff
   to Alexis is unchanged. Older captures saved under `lextax_leads`
   are shown too, normalised to the same shape, with no duplicates.
   Capture asks only for name, phone, email — never SSN, ID, IP PIN,
   or bank details. */
(function(){
  var KEY='legacy_tax_leads';
  var LEGACY_KEY='lextax_leads';

  function read(key){
    try{var v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[];}
    catch(e){return [];}
  }
  function write(key,rows){
    try{localStorage.setItem(key,JSON.stringify(rows));}catch(e){}
  }
  function uid(){
    return 'lead-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  }
  function clean(s){return (s==null?'':String(s)).trim();}
  function savePipelineLead(lead){
    if(!lead)return null;
    var row={
      id:uid(),
      timestamp:new Date().toISOString(),
      source:clean(lead.source)||'Website',
      name:clean(lead.name),
      phone:clean(lead.phone),
      email:clean(lead.email),
      service:clean(lead.service)||clean(lead.source)||'',
      details:clean(lead.details)
    };
    if(!row.name||!row.phone||!row.email)return null;
    var rows=read(KEY);
    rows.push(row);
    write(KEY,rows);
    return row;
  }
  /* Normalise an older lextax_leads capture ({tool,name,phone,email,at})
     into pipeline shape. */
  function normaliseLegacy(row,i){
    return {
      id:'legacy-'+i,
      timestamp:row.at||'',
      source:row.tool||'Website',
      name:clean(row.name),
      phone:clean(row.phone),
      email:clean(row.email),
      service:row.tool||'',
      details:''
    };
  }
  function getPipelineLeads(){
    var rows=read(KEY).slice();
    var seen={};
    rows.forEach(function(r){seen[[r.name,r.phone,r.email,r.timestamp].join('|')]=1;});
    read(LEGACY_KEY).forEach(function(old,i){
      var n=normaliseLegacy(old,i);
      var k=[n.name,n.phone,n.email,n.timestamp].join('|');
      if(!seen[k]){seen[k]=1;rows.push(n);}
    });
    rows.sort(function(a,b){
      var ta=Date.parse(a.timestamp||'')||0;
      var tb=Date.parse(b.timestamp||'')||0;
      return tb-ta;
    });
    return rows;
  }
  function csvEscape(v){
    v=v==null?'':String(v);
    if(/[",\n\r]/.test(v))return '"'+v.replace(/"/g,'""')+'"';
    return v;
  }
  function buildCsv(leads){
    var cols=['ID','Timestamp','Source','Name','Phone','Email','Service','Details'];
    var lines=[cols.join(',')];
    (leads||[]).forEach(function(r){
      lines.push([r.id,r.timestamp,r.source,r.name,r.phone,r.email,r.service,r.details].map(csvEscape).join(','));
    });
    return lines.join('\r\n');
  }
  function exportCsv(){
    var leads=getPipelineLeads();
    var blob=new Blob([buildCsv(leads)],{type:'text/csv;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='lextax-leads.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
  }
  function clearPipeline(){
    if(!window.confirm('Clear all leads in the pipeline? This cannot be undone.'))return false;
    try{localStorage.removeItem(KEY);}catch(e){}
    try{localStorage.removeItem(LEGACY_KEY);}catch(e){}
    renderDrawer();
    return true;
  }
  function escHtml(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function renderDrawer(){
    var list=document.getElementById('pipeline-list');
    var count=document.getElementById('pipeline-count');
    if(!list)return;
    var leads=getPipelineLeads();
    if(count)count.textContent=leads.length+' lead'+(leads.length===1?'':'s');
    if(!leads.length){
      list.innerHTML='<p class="note">No leads yet. When a visitor uses a tool or the Become a Client form, their name, phone, and email land here.</p>';
      return;
    }
    list.innerHTML=leads.map(function(r){
      var when=r.timestamp?new Date(r.timestamp).toLocaleString('en-US'):'';
      return '<div class="pipeline-lead"><strong>'+escHtml(r.name)+'</strong> <span class="note">'+escHtml(when)+'</span><br>'+
        '<span>'+escHtml(r.phone)+' · '+escHtml(r.email)+'</span><br>'+
        '<span class="note">Source: '+escHtml(r.source)+(r.service&&r.service!==r.source?' · Service: '+escHtml(r.service):'')+'</span>'+
        (r.details?'<br><span class="note">'+escHtml(r.details)+'</span>':'')+'</div>';
    }).join('');
  }
  function openDrawer(){
    var d=document.getElementById('pipeline-drawer');
    if(!d)return;
    renderDrawer();
    d.classList.add('open');
    d.setAttribute('aria-hidden','false');
  }
  function closeDrawer(){
    var d=document.getElementById('pipeline-drawer');
    if(!d)return;
    d.classList.remove('open');
    d.setAttribute('aria-hidden','true');
  }
  function on(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',fn);}

  on('pipeline-open',openDrawer);
  on('pipeline-close',closeDrawer);
  on('pipeline-export',exportCsv);
  on('pipeline-clear',clearPipeline);

  /* Service-card "Select Service & Book": pre-fill the Become a Client
     form, scroll to it, and focus the name field. */
  Array.prototype.forEach.call(document.querySelectorAll('.service-book'),function(btn){
    btn.addEventListener('click',function(){
      var service=btn.getAttribute('data-service')||'';
      var note=btn.getAttribute('data-note')||'';
      var sel=document.getElementById('service');
      if(sel&&service){
        var found=false;
        for(var i=0;i<sel.options.length;i++){
          if(sel.options[i].value===service||sel.options[i].text===service){sel.selectedIndex=i;found=true;break;}
        }
        if(!found&&sel.options.length)sel.selectedIndex=0;
      }
      if(note){
        var msg=document.getElementById('msg');
        if(msg)msg.value=note;
      }
      var start=document.getElementById('start');
      if(start)start.scrollIntoView({behavior:'smooth'});
      var name=document.getElementById('name');
      if(name)setTimeout(function(){name.focus();},400);
    });
  });

  window.LeadPipeline={
    savePipelineLead:savePipelineLead,
    getPipelineLeads:getPipelineLeads,
    buildCsv:buildCsv,
    exportCsv:exportCsv,
    clearPipeline:clearPipeline,
    renderDrawer:renderDrawer
  };
})();
