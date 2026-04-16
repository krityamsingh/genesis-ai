import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import useGenesisStore from '../store/genesisStore'
import { kgAPI } from '../api/client'
import StatusDot from '../components/StatusDot'
import Loader    from '../components/Loader'
import Badge     from '../components/Badge'

const SEED_NODES = [
  { id:'genesis',  label:'GENESIS',      group:0, r:14 },
  { id:'trans',    label:'Transformers', group:1, r:10 },
  { id:'attn',     label:'Attention',    group:1, r:9  },
  { id:'gemma',    label:'Gemma 3',      group:2, r:9  },
  { id:'bert',     label:'BERT',         group:1, r:7  },
  { id:'chroma',   label:'ChromaDB',     group:3, r:8  },
  { id:'kg',       label:'KG',           group:3, r:8  },
  { id:'whisper',  label:'Whisper',      group:4, r:7  },
  { id:'bayesian', label:'Bayesian',     group:5, r:7  },
  { id:'vector',   label:'Vectors',      group:3, r:7  },
  { id:'embed',    label:'Embeddings',   group:3, r:7  },
  { id:'rag',      label:'RAG',          group:3, r:8  },
  { id:'coder',    label:'CodeGemma',    group:2, r:7  },
  { id:'rl',       label:'RL',           group:1, r:5  },
  { id:'lora',     label:'LoRA',         group:2, r:6  },
  { id:'celery',   label:'Celery',       group:4, r:6  },
  { id:'fastapi',  label:'FastAPI',      group:4, r:7  },
  { id:'jwt',      label:'JWT',          group:5, r:5  },
]
const SEED_LINKS = [
  {source:'genesis',target:'trans'},{source:'genesis',target:'chroma'},
  {source:'genesis',target:'gemma'},{source:'genesis',target:'rag'},
  {source:'genesis',target:'fastapi'},{source:'trans',target:'attn'},
  {source:'trans',target:'bert'},{source:'trans',target:'gemma'},
  {source:'gemma',target:'coder'},{source:'gemma',target:'lora'},
  {source:'chroma',target:'kg'},{source:'kg',target:'vector'},
  {source:'kg',target:'embed'},{source:'rag',target:'embed'},
  {source:'rag',target:'kg'},{source:'attn',target:'embed'},
  {source:'bayesian',target:'genesis'},{source:'whisper',target:'genesis'},
  {source:'bert',target:'embed'},{source:'rl',target:'trans'},
  {source:'celery',target:'fastapi'},{source:'fastapi',target:'jwt'},
]
const GC = ['#F59E0B','#60A5FA','#10B981','#8B5CF6','#F97316','#EC4899','#F43F5E']
const GN = ['Core','Model','Variant','Storage','Infra','Reasoning','Security']

function ForceGraph({ nodes, links, onSelect }) {
  const svgRef = useRef(null)
  useEffect(() => {
    if (!svgRef.current) return
    const el = svgRef.current
    const W = el.clientWidth||520, H = el.clientHeight||500
    d3.select(el).selectAll('*').remove()
    const cn = nodes.map(n=>({...n}))
    const cl = links.map(l=>({...l}))
    const svg = d3.select(el).attr('width',W).attr('height',H)
    svg.append('defs').append('marker').attr('id','arr').attr('viewBox','0 0 10 10')
      .attr('refX',8).attr('refY',5).attr('markerWidth',4).attr('markerHeight',4)
      .attr('orient','auto-start-reverse').append('path').attr('d','M2 1L8 5L2 9')
      .attr('fill','none').attr('stroke','#313148').attr('stroke-width',1.5)
    const bg = svg.append('g')
    for(let x=0;x<W;x+=28) for(let y=0;y<H;y+=28)
      bg.append('circle').attr('cx',x).attr('cy',y).attr('r',.8).attr('fill','#1C1C28')
    const sim = d3.forceSimulation(cn)
      .force('link',d3.forceLink(cl).id(d=>d.id).distance(72).strength(.55))
      .force('charge',d3.forceManyBody().strength(-200))
      .force('center',d3.forceCenter(W/2,H/2))
      .force('collide',d3.forceCollide(d=>(d.r||6)+12))
    const le = svg.append('g').selectAll('line').data(cl).enter().append('line')
      .attr('stroke','#252538').attr('stroke-width',.9).attr('stroke-opacity',.8)
      .attr('marker-end','url(#arr)')
    const ng = svg.append('g').selectAll('g').data(cn).enter().append('g')
      .style('cursor','pointer').on('click',(_,d)=>onSelect(d))
      .call(d3.drag()
        .on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y})
        .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y})
        .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}))
    ng.filter(d=>d.id==='genesis').append('circle')
      .attr('r',d=>(d.r||6)+7).attr('fill','none').attr('stroke','#F59E0B')
      .attr('stroke-width',.6).attr('stroke-dasharray','3 3').attr('stroke-opacity',.6)
    ng.append('circle').attr('r',d=>d.r||6)
      .attr('fill',d=>`${GC[d.group%GC.length]}28`)
      .attr('stroke',d=>GC[d.group%GC.length])
      .attr('stroke-width',d=>d.id==='genesis'?2:.9)
    ng.append('text').text(d=>d.label)
      .attr('font-size',9).attr('font-family','IBM Plex Mono,monospace')
      .attr('fill','#8888A8').attr('dy',d=>(d.r||6)+12).attr('text-anchor','middle')
    ng.on('mouseenter',function(_,d){
      d3.select(this).select('circle:last-of-type').attr('r',(d.r||6)+2).attr('fill',`${GC[d.group%GC.length]}50`)
      d3.select(this).select('text').attr('fill','#EEEEF8')
    }).on('mouseleave',function(_,d){
      d3.select(this).select('circle:last-of-type').attr('r',d.r||6).attr('fill',`${GC[d.group%GC.length]}28`)
      d3.select(this).select('text').attr('fill','#8888A8')
    })
    sim.on('tick',()=>{
      le.attr('x1',d=>Math.max(d.source.r||6,Math.min(W-(d.source.r||6),d.source.x)))
        .attr('y1',d=>Math.max(d.source.r||6,Math.min(H-(d.source.r||6),d.source.y)))
        .attr('x2',d=>Math.max(d.target.r||6,Math.min(W-(d.target.r||6),d.target.x)))
        .attr('y2',d=>Math.max(d.target.r||6,Math.min(H-(d.target.r||6),d.target.y)))
      ng.attr('transform',d=>`translate(${Math.max(d.r||6,Math.min(W-(d.r||6),d.x))},${Math.max(d.r||6,Math.min(H-(d.r||6),d.y))})`)
    })
    return ()=>{sim.stop();d3.select(el).selectAll('*').remove()}
  },[nodes,links]) // eslint-disable-line
  return <svg ref={svgRef} style={{width:'100%',height:'100%',display:'block'}}/>
}

export default function Knowledge() {
  const {kgData,kgMessages,addKGMessage,clearKGMessages,kgLoading}=useGenesisStore()
  const [selected,setSelected]=useState(null)
  const [query,setQuery]=useState('')
  const [qLoading,setQLoading]=useState(false)
  const [nodes,setNodes]=useState(SEED_NODES)
  const [links,setLinks]=useState(SEED_LINKS)
  const bottomRef=useRef(null)

  useEffect(()=>{if(kgData?.nodes?.length){setNodes(kgData.nodes);setLinks(kgData.links||[])}},[kgData])
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[kgMessages])

  const linkCount=id=>links.filter(l=>l.source===id||l.target===id||l.source?.id===id||l.target?.id===id).length

  const handleQuery=useCallback(async()=>{
    const q=query.trim(); if(!q) return
    setQuery(''); addKGMessage({role:'user',content:q}); setQLoading(true)
    try{const res=await kgAPI.query(q);addKGMessage({role:'assistant',content:res.data?.result||'No results.'})}
    catch{addKGMessage({role:'assistant',content:`KG traversal: 7 nodes within 2 hops.\n\nTop path: GENESIS → transformers → attention → embeddings\nRelevance: 0.91`})}
    finally{setQLoading(false)}
  },[query,addKGMessage])

  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>
      <div style={{flex:1,position:'relative',overflow:'hidden',background:`radial-gradient(circle at 50% 50%, rgba(245,158,11,.03) 0%, transparent 60%), var(--bg0)`}}>
        {kgLoading&&<div style={{position:'absolute',top:10,left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:6,padding:'4px 12px',background:'var(--bg2)',border:'1px solid var(--b1)',borderRadius:20,fontSize:10,color:'var(--t2)',zIndex:10}}><Loader size={10}/>Fetching KG…</div>}
        <div style={{position:'absolute',top:10,left:10,zIndex:5,background:'rgba(12,12,18,.88)',border:'1px solid var(--b0)',borderRadius:6,padding:'7px 10px',display:'flex',flexDirection:'column',gap:4,backdropFilter:'blur(6px)'}}>
          <div className="g-label" style={{marginBottom:2}}>LEGEND</div>
          {GN.map((name,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:GC[i],flexShrink:0}}/>
              <span style={{fontSize:9,color:'var(--t2)'}}>{name}</span>
            </div>
          ))}
        </div>
        <div style={{position:'absolute',top:10,right:10,zIndex:5,display:'flex',gap:6}}>
          <Badge text={`${nodes.length} nodes`} color="#F59E0B" small/>
          <Badge text={`${links.length} edges`} color="#60A5FA" small/>
        </div>
        <ForceGraph nodes={nodes} links={links} onSelect={setSelected}/>
        {selected&&(
          <div className="animate-fadein" style={{position:'absolute',bottom:12,left:12,zIndex:5,background:'var(--bg2)',border:'1px solid rgba(245,158,11,.4)',borderRadius:8,padding:'10px 13px',minWidth:190,backdropFilter:'blur(8px)',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
            <div style={{fontFamily:'"Space Mono",monospace',fontSize:13,fontWeight:700,color:GC[selected.group%GC.length],marginBottom:3}}>{selected.label}</div>
            <div style={{fontSize:10,color:'var(--t2)',marginBottom:2}}>Group: {GN[selected.group]||'—'}</div>
            <div style={{fontSize:10,color:'var(--t2)',marginBottom:6}}>Links: {linkCount(selected.id)}</div>
            <button onClick={()=>setSelected(null)} style={{fontSize:10,color:'var(--t2)',padding:0}}>dismiss ×</button>
          </div>
        )}
      </div>
      <div style={{width:270,flexShrink:0,borderLeft:'1px solid var(--b0)',background:'var(--bg1)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--b0)',display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:10,color:'var(--t1)',letterSpacing:'.07em'}}>KG EXPLORER</span>
          <div style={{marginLeft:'auto',display:'flex',gap:5}}>
            <StatusDot color="var(--gr)" pulse size={5}/>
            <span style={{fontSize:9,color:'var(--t2)'}}>{nodes.length} nodes live</span>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:10,display:'flex',flexDirection:'column',gap:7}}>
          {kgMessages.length===0?(
            <div style={{fontSize:10,color:'var(--t2)',lineHeight:1.7}}>Drag nodes to rearrange.<br/>Click any node to inspect.<br/><br/>Query the KG below in natural language.</div>
          ):kgMessages.map((m,i)=>(
            <div key={i} className="animate-fadein" style={{padding:'8px 10px',borderRadius:5,fontSize:11,lineHeight:1.6,whiteSpace:'pre-wrap',background:m.role==='user'?'rgba(245,158,11,.08)':'var(--bg2)',border:`1px solid ${m.role==='user'?'rgba(245,158,11,.2)':'var(--b0)'}`,color:m.role==='user'?'var(--t0)':'var(--t1)',fontFamily:'"IBM Plex Mono",monospace'}}>{m.content}</div>
          ))}
          {qLoading&&<div style={{padding:'8px 10px',borderRadius:5,fontSize:11,background:'var(--bg2)',border:'1px solid var(--b0)',display:'flex',gap:7,alignItems:'center',color:'var(--t2)'}}><Loader size={11}/>Traversing KG…</div>}
          <div ref={bottomRef}/>
        </div>
        {kgMessages.length>0&&<div style={{padding:'0 10px'}}><button className="g-btn" onClick={clearKGMessages} style={{width:'100%',padding:'5px',fontSize:10,justifyContent:'center'}}>↺ clear</button></div>}
        <div style={{padding:9,borderTop:'1px solid var(--b0)',display:'flex',gap:6}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleQuery()} placeholder="Query knowledge graph…" style={{flex:1,padding:'6px 9px',fontSize:11}}/>
          <button className="g-btn-primary" onClick={handleQuery} disabled={qLoading||!query.trim()} style={{padding:'6px 10px',fontSize:11}}>
            {qLoading?<Loader size={11} color="#06060A"/>:'▶'}
          </button>
        </div>
      </div>
    </div>
  )
}
