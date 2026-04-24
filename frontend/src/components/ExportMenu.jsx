// ExportMenu.jsx — Markdown/JSON export + share link (Phase 5)
import React, { useState } from "react";
export default function ExportMenu({ conversationId, messages = [] }) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const dl = (content, name, type) => {
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([content],{type})), download: name });
    a.click();
  };
  const share = async () => {
    const r = await fetch(`/api/v1/conversations/${conversationId}/share`,{method:"POST"});
    const d = await r.json(); setShareUrl(d.share_url);
  };
  const items = [
    ["📝 Markdown", () => dl(messages.map(m=>`**${m.role}**: ${m.content}`).join("\n\n"),"chat.md","text/markdown")],
    ["📋 JSON",     () => dl(JSON.stringify(messages,null,2),"chat.json","application/json")],
    ["🔗 Share",    share],
  ];
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={() => setOpen(o=>!o)}
        style={{padding:"5px 12px",borderRadius:6,border:"1px solid #ddd",background:"#f8f9fa",cursor:"pointer",fontSize:13}}>
        ⬆ Export
      </button>
      {open && (
        <div style={{position:"absolute",right:0,top:"110%",zIndex:200,background:"#fff",
          border:"1px solid #ddd",borderRadius:8,padding:6,minWidth:148,
          boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>
          {items.map(([label,fn]) => (
            <button key={label} onClick={()=>{fn();setOpen(false);}}
              style={{display:"block",width:"100%",textAlign:"left",padding:"7px 12px",
                background:"none",border:"none",cursor:"pointer",fontSize:13,borderRadius:4}}>
              {label}
            </button>
          ))}
          {shareUrl && <div style={{padding:"6px 12px",fontSize:11,wordBreak:"break-all",
            borderTop:"1px solid #eee",marginTop:4}}>{shareUrl}</div>}
        </div>
      )}
    </div>
  );
}
