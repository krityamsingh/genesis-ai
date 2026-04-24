// MemoryPanel.jsx — User memory inspect + manage panel (Phase 5)
import React, { useEffect, useState } from "react";
export default function MemoryPanel({ token }) {
  const [open, setOpen] = useState(false);
  const [mem, setMem] = useState(null);
  useEffect(() => {
    if (!open || !token) return;
    fetch("/api/v1/memory/",{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(d => { if (d.enabled !== false) setMem(d); });
  }, [open, token]);
  const del = async key => {
    await fetch(`/api/v1/memory/facts/${key}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
    setMem(m => ({...m, facts: Object.fromEntries(Object.entries(m.facts).filter(([k])=>k!==key))}));
  };
  return (
    <div style={{borderTop:"1px solid #eee",paddingTop:8,marginTop:8}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#555",width:"100%",textAlign:"left"}}>
        🧠 Memory {open?"▲":"▼"}
      </button>
      {open && mem && (
        <div style={{marginTop:8,fontSize:12}}>
          {Object.entries(mem.facts||{}).length === 0
            ? <div style={{color:"#aaa"}}>No facts stored.</div>
            : Object.entries(mem.facts).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",
                  padding:"3px 0",borderBottom:"1px solid #f0f0f0"}}>
                  <span><b>{k}</b>: {String(v)}</span>
                  <button onClick={()=>del(k)}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#e24b4a"}}>✕</button>
                </div>
              ))
          }
          {Object.keys(mem.topic_affinity||{}).length > 0 && (
            <div style={{marginTop:8}}>
              <b>Topics</b>
              {Object.entries(mem.topic_affinity).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t,s])=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
                  <span style={{minWidth:72,fontSize:11}}>{t}</span>
                  <div style={{flex:1,height:5,background:"#eee",borderRadius:3}}>
                    <div style={{width:`${s*100}%`,height:"100%",background:"#3B8BD4",borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
