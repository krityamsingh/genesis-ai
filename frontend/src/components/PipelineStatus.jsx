// PipelineStatus.jsx — Shows current pipeline mode to admins (Phase 5)
import React, { useEffect, useState } from "react";
const MODE_COLOR = { off:"#aaa", shadow:"#f0a500", on:"#3B8BD4" };
export default function PipelineStatus({ token }) {
  const [flags, setFlags] = useState(null);
  useEffect(() => {
    if (!token) return;
    fetch("/api/v1/flags/",{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(setFlags).catch(()=>{});
  }, [token]);
  if (!flags) return null;
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,padding:"2px 8px",
      borderRadius:10,background:"#f8f9fa",border:"1px solid #e9ecef"}}>
      <span style={{width:7,height:7,borderRadius:"50%",
        background:MODE_COLOR[flags.pipeline_mode]||"#aaa"}}/>
      Pipeline: <b>{flags.pipeline_mode}</b>
      {flags.memory_enabled && <span title="Memory on">🧠</span>}
      {flags.plugins_enabled && <span title="Plugins on">🔌</span>}
    </div>
  );
}
