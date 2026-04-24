// FileChip.jsx — Uploaded file preview chip (Phase 5)
import React from "react";
const ICONS = { image:"🖼️", pdf:"📄", audio:"🎵", default:"📎" };
export default function FileChip({ file, onRemove }) {
  const type = file.type.startsWith("image/") ? "image"
    : file.type === "application/pdf" ? "pdf"
    : file.type.startsWith("audio/") ? "audio" : "default";
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",
      borderRadius:16,background:"var(--bg-secondary,#f1f3f5)",fontSize:12,maxWidth:180}}>
      {ICONS[type]}
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</span>
      <button onClick={() => onRemove(file)}
        style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:14}}>×</button>
    </span>
  );
}
