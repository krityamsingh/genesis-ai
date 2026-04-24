// TypingIndicator.jsx — Animated dots while GENESIS responds (Phase 5)
import React from "react";
export default function TypingIndicator({ label = "GENESIS is thinking…" }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",
      color:"var(--text-secondary,#666)",fontSize:13}}>
      <span style={{display:"flex",gap:4}}>
        {[0,1,2].map(i => (
          <span key={i} style={{width:6,height:6,borderRadius:"50%",
            background:"var(--text-tertiary,#aaa)",
            animation:"bounce 1.2s infinite",animationDelay:`${i*0.2}s`}}/>
        ))}
      </span>
      {label}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}
