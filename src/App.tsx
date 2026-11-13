import { useMemo, useState } from "react";
import { Activity, ArrowRight, Check, ChevronDown, CircleAlert, Clapperboard, FileVideo2, Film, LockKeyhole, Play, Radio, ShieldCheck, Sparkles, Upload, Youtube } from "lucide-react";

type Stage = "source" | "rights" | "edit" | "publish";
export default function App() {
  const [channel, setChannel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [stage, setStage] = useState<Stage>("source");
  const [notice, setNotice] = useState("Workspace ready. Connect a source to begin.");
  const validChannel = useMemo(() => /youtube\.com\/(channel\/|@)|youtu\.be\//i.test(channel.trim()), [channel]);
  const steps: {id:Stage; label:string; number:string}[] = [
    {id:"source",label:"Source",number:"01"},{id:"rights",label:"Rights check",number:"02"},{id:"edit",label:"Shorts editor",number:"03"},{id:"publish",label:"Publish",number:"04"}
  ];
  function connectSource() {
    if (!channel.trim()) { setNotice("Enter a YouTube channel URL or @handle first."); return; }
    setNotice("Source saved locally. YouTube API connection is not configured yet.");
    setStage("rights");
  }
  function startReview() {
    if (!rightsConfirmed) { setNotice("Confirm that you own or have permission to use the footage before continuing."); return; }
    if (!sourceUrl.trim()) { setNotice("Add the path or reference for your licensed original video file."); return; }
    setNotice("Rights declaration recorded for this session. Media processing backend is not connected yet.");
    setStage("edit");
  }
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><b>TOUCHLINE</b><span>STUDIO</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{steps.map((s)=><button key={s.id} className={stage===s.id?"nav-item active":"nav-item"} onClick={()=>setStage(s.id)}><span className="nav-number">{s.number}</span>{s.label}{stage===s.id&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="secure"><LockKeyhole size={15}/><span>Rights-first workflow</span></div><div className="version">BUILD 0.1.0 · PREVIEW</div></div>
    </aside>
    <section className="main">
      <header className="topbar"><div className="crumb">PROJECTS <span>/</span> FOOTBALL SHORTS</div><div className="top-right"><span className="status"><i/> DEVELOPMENT MODE</span><div className="avatar">TS</div></div></header>
      <div className="content">
        <div className="eyebrow"><span/> FOOTBALL CONTENT WORKFLOW</div>
        <div className="heading-row"><div><h1>Make every moment<br/><em>count.</em></h1><p className="subhead">A focused workspace for creating original, rights-cleared football Shorts.</p></div><div className="hero-icon"><Clapperboard size={31}/><span>SHORT-FORM<br/>PRODUCTION</span></div></div>
        <div className="stepper">{steps.map((s,i)=><div className={stage===s.id?"step current":"step"} key={s.id}><span>{s.number}</span><b>{s.label}</b>{i<3&&<div className="step-line"/>}</div>)}</div>
        {stage==="source"&&<section className="panel">
          <div className="panel-title"><div className="panel-icon"><Youtube size={19}/></div><div><h2>Connect your football source</h2><p>Start with the channel you want to monitor.</p></div></div>
          <label>YouTube channel URL or @handle</label>
          <div className="input-wrap"><Youtube size={17}/><input value={channel} onChange={e=>setChannel(e.target.value)} placeholder="https://youtube.com/@yourchannel"/></div>
          <div className="hint">Use a channel URL, channel ID URL, or @handle. This starter UI stores it only in this browser session.</div>
          <div className="panel-actions"><span className="muted"><ShieldCheck size={15}/> No scraping or stream extraction</span><button className="primary" onClick={connectSource}>Save source <ArrowRight size={16}/></button></div>
        </section>}
        {stage==="rights"&&<section className="panel">
          <div className="panel-title"><div className="panel-icon"><ShieldCheck size={19}/></div><div><h2>Verify your footage rights</h2><p>A YouTube link identifies content; it does not grant editing rights.</p></div></div>
          <label>Original video file / approved media reference</label>
          <div className="input-wrap"><FileVideo2 size={17}/><input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="e.g. licensed-match-footage.mp4 or media asset ID"/></div>
          <label className="check-row"><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)}/><span>I own this footage or have explicit permission/licensing to edit and publish it.</span></label>
          <div className="warning"><CircleAlert size={17}/><span>Broadcast footage, music, club marks and graphics may each require separate permission. This app will not download footage from YouTube.</span></div>
          <div className="panel-actions"><button className="ghost" onClick={()=>setStage("source")}>Back</button><button className="primary" onClick={startReview}>Continue to editor <ArrowRight size={16}/></button></div>
        </section>}
        {stage==="edit"&&<section className="panel">
          <div className="panel-title"><div className="panel-icon"><Film size={19}/></div><div><h2>Shorts editor</h2><p>Your editing workspace will be connected here.</p></div></div>
          <div className="empty-editor"><div className="play-circle"><Play size={24}/></div><b>No media processed yet</b><span>Once the licensed media upload and FFmpeg worker are connected, detected moments and vertical previews will appear here.</span></div>
          <div className="feature-grid"><div><Sparkles/><b>Moment detection</b><span>Find goals, saves and key actions</span></div><div><FileVideo2/><b>Vertical reframing</b><span>Keep the play visible at 9:16</span></div><div><Activity/><b>Quality checks</b><span>Captions, audio and export checks</span></div></div>
          <div className="panel-actions"><button className="ghost" onClick={()=>setStage("rights")}>Back</button><button className="primary" onClick={()=>setNotice("Editor backend is not configured. No video has been processed.")}>Check editor status <ArrowRight size={16}/></button></div>
        </section>}
        {stage==="publish"&&<section className="panel"><div className="panel-title"><div className="panel-icon"><Radio size={19}/></div><div><h2>Publishing is locked</h2><p>Public publishing stays disabled until all checks pass.</p></div></div><div className="empty-editor"><LockKeyhole size={30}/><b>Development / review mode</b><span>YouTube OAuth, channel identity verification, rights approval and final QC must be configured before publishing can be enabled.</span></div></section>}
        <div className="notice"><span className="notice-dot"/>{notice}</div>
        <div className="bottom-grid"><div className="mini-card"><div className="mini-head"><span>PIPELINE STATUS</span><ChevronDown size={15}/></div><div className="pipeline"><span className="pipeline-step done"><Check size={13}/></span><div><b>App shell</b><small>Loaded locally</small></div><span className="tag green">READY</span></div><div className="pipeline"><span className="pipeline-step pending">2</span><div><b>External services</b><small>YouTube / Gemini / media worker</small></div><span className="tag">NOT CONNECTED</span></div></div>
          <div className="mini-card safety"><div className="mini-head"><span>SAFETY BY DESIGN</span><ShieldCheck size={16}/></div><p>Rights checks fail closed. No automatic public uploads in development. No hidden downloads or scraping.</p><div className="safety-foot"><LockKeyhole size={13}/> PRIVATE BY DEFAULT</div></div></div>
        <footer>TOUCHLINE STUDIO <span>·</span> AN EARLY WORKING SHELL <span>·</span> NOT YET CONNECTED TO PROCESSING SERVICES</footer>
      </div>
    </section>
  </main>;
}
