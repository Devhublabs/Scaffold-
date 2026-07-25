import React, { useState } from "react";
import {
  Menu as MenuIcon,
  ChevronDown,
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  Users,
  Settings,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Cloud,
  Shield,
  Plus,
  MousePointer2,
  Pencil,
  Eraser,
  Type,
  Square,
  Ruler,
  Image as ImageIcon,
  Grid3x3,
  Brush,
  MessageSquare,
  Layers,
  Search,
  Bell,
  DoorOpen,
  Download,
  MoreHorizontal,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  LogIn,
  Link as LinkIcon,
  PauseCircle,
  StopCircle,
  Moon,
  Globe,
  Monitor,
  AlignJustify,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  Camera,
} from "lucide-react";

// ---------- Shared ----------

function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 4 L34 12 L20 20 L6 12 Z" fill="#3d7dfc" />
      <path
        d="M6 20 L20 28 L34 20"
        stroke="#3d7dfc"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M6 28 L20 36 L34 28"
        stroke="#3d7dfc"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}

function Brand({ withTag = true }) {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="flex flex-col leading-tight">
        <span className="text-white font-bold text-base tracking-tight">Scaffold</span>
        {withTag && <span className="text-slate-500 text-[11px] font-medium">Manga, together.</span>}
      </div>
    </div>
  );
}

// ---------- Header / Menu ----------

function Header({ onNavigate }) {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { section: "Workspace" },
    { icon: LayoutDashboard, label: "Dashboard", action: () => onNavigate("dashboard") },
    { icon: FolderKanban, label: "My Projects", action: () => onNavigate("projects") },
    { icon: LayoutTemplate, label: "Templates", action: () => onNavigate("landing", "features") },
    { icon: DoorOpen, label: "Rooms", action: () => onNavigate("rooms") },
    { divider: true },
    { section: "Connect" },
    { icon: Users, label: "Community", action: () => onNavigate("landing", "features") },
    { icon: Settings, label: "Settings", action: () => onNavigate("settings") },
    { divider: true },
    { icon: UserPlus, label: "Sign up", action: () => onNavigate("auth", null, "signup"), accent: true },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/60">
      <div className="max-w-6xl mx-auto px-8 h-[72px] flex items-center justify-between">
        <button onClick={() => onNavigate("landing")} className="cursor-pointer">
          <Brand />
        </button>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <button onClick={() => onNavigate("landing", "features")} className="hover:text-white transition-colors cursor-pointer">
            Features
          </button>
          <button onClick={() => onNavigate("dashboard")} className="hover:text-white transition-colors cursor-pointer">
            Dashboard
          </button>
          <button onClick={() => onNavigate("projects")} className="hover:text-white transition-colors cursor-pointer">
            Projects
          </button>
          <button onClick={() => onNavigate("landing", "features")} className="hover:text-white transition-colors cursor-pointer">
            Templates
          </button>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate("auth", null, "signin")}
            className="hidden sm:inline-block text-sm font-semibold text-slate-400 hover:text-white transition-colors px-3 py-2 cursor-pointer"
          >
            Sign in
          </button>

          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 transition-colors cursor-pointer"
            >
              <MenuIcon size={15} />
              Menu
              <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+10px)] w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 p-2 z-50">
                  {menuItems.map((item, i) => {
                    if (item.divider) return <div key={i} className="h-px bg-slate-800 my-1.5 mx-1" />;
                    if (item.section)
                      return (
                        <div key={i} className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-2.5 pt-2 pb-1">
                          {item.section}
                        </div>
                      );
                    const Icon = item.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setOpen(false);
                          item.action();
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors cursor-pointer ${
                          item.accent
                            ? "text-blue-400 hover:bg-blue-500/10"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <Icon size={16} className={item.accent ? "text-blue-400" : "text-slate-500"} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => onNavigate("auth", null, "signup")}
            className="text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg px-4 py-2.5 transition-all cursor-pointer"
          >
            Create Room
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------- Landing sections ----------

function Hero({ onNavigate }) {
  const stats = [
    { icon: Users, title: "Real-time collaboration", sub: "Work together seamlessly" },
    { icon: Cloud, title: "Cloud autosave", sub: "Never lose your work" },
    { icon: LayoutTemplate, title: "Manga templates", sub: "Start your story faster" },
    { icon: Shield, title: "Secure & private", sub: "Your stories, your way" },
  ];

  return (
    <section className="relative max-w-4xl mx-auto px-8 pt-24 pb-14 text-center">
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/25 rounded-full px-3.5 py-1.5 mb-7">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.18)]" />
        Live now — 2,400 artists drawing together
      </span>

      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
        The collaborative canvas
        <br />
        for{" "}
        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          manga creators
        </span>
      </h1>

      <p className="mt-5 text-slate-400 text-[17px] max-w-lg mx-auto leading-relaxed">
        Create, collaborate, and bring stories to life together. Built for manga artists, by manga artists.
      </p>

      <div className="flex items-center justify-center gap-3 mt-8">
        <button
          onClick={() => onNavigate("auth", null, "signup")}
          className="text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg px-6 py-3 transition-all cursor-pointer"
        >
          Create Room
        </button>
        <button
          onClick={() => onNavigate("auth", null, "signin")}
          className="text-sm font-semibold text-white border border-slate-700 hover:border-slate-500 hover:bg-slate-900 rounded-lg px-6 py-3 transition-colors cursor-pointer"
        >
          Join Room
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-9 mt-14">
        {stats.map((s, i) => (
          <div key={i} className="flex items-center gap-3 text-left">
            <span className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 flex-shrink-0">
              <s.icon size={16} />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-white">{s.title}</span>
              <span className="block text-[12px] text-slate-500 mt-0.5">{s.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CanvasMockup() {
  const tools = [MousePointer2, Pencil, Eraser, Type, Square, Ruler, ImageIcon, Grid3x3, Brush];
  return (
    <section className="max-w-5xl mx-auto px-8 pt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3 text-[13px] text-slate-400">
            <MenuIcon size={15} className="text-slate-500" />
            <span className="font-semibold text-white">
              Re:Bound — Chapter 13 <span className="text-slate-500 font-normal">/ page_18</span>
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="text-[12.5px] text-slate-500 hidden sm:inline">100%</span>
            <div className="flex">
              <span className="w-6.5 h-6.5 w-[26px] h-[26px] rounded-full border-2 border-slate-900 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                R
              </span>
              <span className="w-[26px] h-[26px] -ml-2 rounded-full border-2 border-slate-900 bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
                M
              </span>
              <span className="w-[26px] h-[26px] -ml-2 rounded-full border-2 border-slate-900 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] font-bold text-white">
                K
              </span>
            </div>
            <span className="text-[12.5px] font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 rounded-md px-3.5 py-1.5">
              Share
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[56px_1fr] md:grid-cols-[56px_1fr_232px] min-h-[420px]">
          <div className="border-r border-slate-800 flex flex-col items-center gap-1 py-3.5">
            {tools.map((Icon, i) => (
              <div
                key={i}
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  i === 0 ? "bg-blue-500/15 text-blue-400" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                <Icon size={17} />
              </div>
            ))}
          </div>

          <div className="relative bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md aspect-[4/5] bg-slate-800/60 border border-slate-700 rounded-md p-1.5 grid grid-cols-2 grid-rows-2 gap-1.5 relative">
              <div className="col-span-2 rounded-sm bg-gradient-to-br from-slate-700/70 to-slate-800/70 border border-slate-700/60" />
              <div className="rounded-sm bg-gradient-to-br from-slate-700/70 to-slate-800/70 border border-slate-700/60" />
              <div className="rounded-sm bg-gradient-to-br from-slate-700/70 to-slate-800/70 border border-slate-700/60" />

              <span className="absolute top-[12%] left-[8%] flex items-center gap-1 text-[11px] font-bold text-white bg-blue-500 rounded-tl px-2 py-1 rounded-br rounded-tr shadow-lg">
                Ren
              </span>
              <span className="absolute top-[45%] left-[55%] flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-500 rounded-tl px-2 py-1 rounded-br rounded-tr shadow-lg">
                Mika
              </span>
              <span className="absolute bottom-[10%] left-[10%] flex items-center gap-1 text-[11px] font-bold text-white bg-violet-500 rounded-tl px-2 py-1 rounded-br rounded-tr shadow-lg">
                Kai
              </span>
            </div>
          </div>

          <div className="hidden md:flex flex-col border-l border-slate-800 text-[12.5px]">
            <div className="p-3.5 pb-2.5">
              <div className="flex items-center justify-between font-bold text-white mb-2">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} /> Layers
                </span>
                <Plus size={13} className="text-slate-500" />
              </div>
              {["Panel 4", "Panel 3", "Panel 2", "Panel 1"].map((l) => (
                <div key={l} className="flex items-center gap-2 py-1.5 px-1 text-slate-400 rounded hover:bg-slate-800">
                  <span className="w-3.5 h-3.5 rounded-sm bg-slate-700 flex-shrink-0" />
                  {l}
                </div>
              ))}
              <div className="py-1.5 px-1 text-slate-600">Sketch</div>
              <div className="py-1.5 px-1 text-slate-600">Background</div>
            </div>
            <div className="h-px bg-slate-800 mx-3" />
            <div className="p-3.5 flex-1">
              <div className="font-bold text-white mb-2 flex items-center gap-1.5">
                <MessageSquare size={13} /> Comments
              </div>
              {[
                { n: "Mika", t: "2m", c: "Let's add more impact lines here!", cl: "bg-emerald-500" },
                { n: "Ren", t: "5m", c: "How about this expression?", cl: "bg-blue-500" },
                { n: "Kai", t: "8m", c: "Background looks great!", cl: "bg-violet-500" },
              ].map((c, i) => (
                <div key={i} className="flex gap-2 py-2">
                  <span
                    className={`w-[22px] h-[22px] rounded-full ${c.cl} flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white`}
                  >
                    {c.n[0]}
                  </span>
                  <div>
                    <span className="font-semibold text-white text-[12px]">
                      {c.n} <span className="text-slate-600 font-normal text-[11px]">{c.t}</span>
                    </span>
                    <div className="text-slate-400 text-[12px] mt-0.5 leading-snug">{c.c}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Users, title: "Real-time collaboration", desc: "See your team's cursors, edits, and comments live on the page as they happen." },
    { icon: Cloud, title: "Smart autosave & version history", desc: "Every change is saved instantly and safely, so you can rewind to any past version." },
    { icon: Grid3x3, title: "Manga templates & assets", desc: "Panel layouts, screentones, and speech bubbles ready to drop into any page." },
    { icon: Shield, title: "Private by default", desc: "Every room is invite-only. Your pages stay between you and your collaborators." },
  ];
  return (
    <section id="features" className="max-w-5xl mx-auto px-8 pt-28 pb-10">
      <div className="text-center max-w-lg mx-auto mb-14">
        <div className="text-xs font-bold text-blue-400 tracking-wide uppercase mb-3">Why Scaffold</div>
        <h2 className="text-[34px] font-bold tracking-tight text-white">Everything your team needs</h2>
        <p className="text-slate-400 mt-3 text-[15.5px] leading-relaxed">
          From first sketch to final panel, Scaffold keeps your whole team on the same page — literally.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((f, i) => (
          <div
            key={i}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 hover:-translate-y-1 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
              <f.icon size={19} />
            </div>
            <h3 className="text-white font-bold text-[15.5px] mb-1.5">{f.title}</h3>
            <p className="text-slate-400 text-[13.5px] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Workspace({ onNavigate }) {
  const projects = [
    { name: "Re:Bound", meta: "Chapter 13 · edited 4m ago", badge: "3 online", grad: "from-blue-900/60 to-slate-900" },
    { name: "Harbor Lights", meta: "Chapter 2 · edited 1h ago", badge: "1 online", grad: "from-emerald-900/50 to-slate-900" },
    { name: "Nightshade Prep", meta: "One-shot · edited yesterday", badge: "Draft", grad: "from-violet-900/50 to-slate-900" },
  ];
  return (
    <section id="workspace" className="max-w-5xl mx-auto px-8 pt-28 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="text-xs font-bold text-blue-400 tracking-wide uppercase mb-3.5">Your workspace</div>
          <h2 className="text-[32px] font-bold tracking-tight text-white leading-tight mb-4">
            One dashboard for every story you're drawing
          </h2>
          <p className="text-slate-400 text-[15px] leading-relaxed mb-6">
            Open your dashboard to jump back into any room, track who's online, and see what changed since you last
            checked in.
          </p>
          <ul className="flex flex-col gap-3.5 mb-7">
            {[
              ["Projects", "every chapter and one-shot, organized by series and status."],
              ["Dashboard", "recent activity, pending reviews, and teammates online now."],
              ["Templates", "save your own panel layouts and reuse them across projects."],
            ].map(([b, rest], i) => (
              <li key={i} className="flex gap-3 items-start text-sm text-slate-400">
                <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <b className="text-white font-semibold">{b}</b> — {rest}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onNavigate("dashboard")}
            className="text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg px-5 py-3 transition-all cursor-pointer"
          >
            Open Dashboard
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 p-4 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between mb-3.5 px-1">
            <span className="text-[13px] font-bold text-white">My Projects</span>
            <span className="text-[12px] font-semibold text-blue-400 flex items-center gap-1 cursor-pointer">
              <Plus size={13} /> New project
            </span>
          </div>
          {projects.map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-800/70 transition-colors">
              <span className={`w-[38px] h-[38px] rounded-lg bg-gradient-to-br ${p.grad} flex-shrink-0`} />
              <span>
                <span className="block text-[13.5px] font-semibold text-white">{p.name}</span>
                <span className="block text-[11.5px] text-slate-500 mt-0.5">{p.meta}</span>
              </span>
              <span className="ml-auto text-[10.5px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                {p.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand({ onNavigate }) {
  return (
    <section className="max-w-5xl mx-auto px-8 pt-32 pb-32 text-center">
      <div className="max-w-xl mx-auto rounded-[20px] border border-slate-800 bg-gradient-to-br from-blue-500/10 to-slate-900 px-10 py-14">
        <h2 className="text-[30px] font-bold tracking-tight text-white mb-3.5">Start your next chapter today</h2>
        <p className="text-slate-400 text-[15px] mb-7">
          Create a room, invite your team, and start drawing in seconds — no downloads required.
        </p>
        <button
          onClick={() => onNavigate("auth", null, "signup")}
          className="text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg px-6 py-3 transition-all cursor-pointer"
        >
          Create Room
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800/70 py-10">
      <div className="max-w-5xl mx-auto px-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2.5 text-slate-500 text-[13px]">
          <Logo size={18} />
          <span>© 2026 Scaffold. Manga, together.</span>
        </div>
        <div className="flex gap-6 text-[13px] text-slate-500">
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Features</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Templates</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Community</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy</span>
        </div>
      </div>
    </footer>
  );
}

function LandingPage({ onNavigate }) {
  return (
    <div>
      <Hero onNavigate={onNavigate} />
      <CanvasMockup />
      <Features />
      <Workspace onNavigate={onNavigate} />
      <CtaBand onNavigate={onNavigate} />
      <Footer />
    </div>
  );
}

// ---------- Auth page (Sign in / Sign up) ----------

function AuthIllustration() {
  return (
    <div className="hidden lg:block relative w-[42%] bg-slate-900 overflow-hidden">
      <div className="absolute top-8 left-8 z-10">
        <Brand />
      </div>

      <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-[3px] p-[3px] pt-[88px]">
        <div className="col-span-2 row-span-2 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-violet-500/10" />
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 relative" />
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 relative" />
      </div>

      <span className="absolute top-[20%] left-[10%] flex items-center gap-1 text-[12px] font-bold text-white bg-blue-500 px-2.5 py-1 rounded-tl-md rounded-br-md rounded-tr-md shadow-xl z-10">
        Ren
      </span>
      <span className="absolute top-[47%] left-[52%] flex items-center gap-1 text-[12px] font-bold text-white bg-emerald-500 px-2.5 py-1 rounded-tl-md rounded-br-md rounded-tr-md shadow-xl z-10">
        Mika
      </span>
      <span className="absolute bottom-[16%] left-[8%] flex items-center gap-1 text-[12px] font-bold text-white bg-violet-500 px-2.5 py-1 rounded-tl-md rounded-br-md rounded-tr-md shadow-xl z-10">
        Kai
      </span>
    </div>
  );
}

function AuthPage({ mode, setMode, onNavigate }) {
  const isSignup = mode === "signup";
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-slate-950">
      <AuthIllustration />

      <div className="flex-1 flex items-center justify-center px-6 py-16 relative">
        <button
          onClick={() => onNavigate("landing")}
          className="absolute top-8 left-8 lg:hidden flex items-center gap-2 cursor-pointer"
        >
          <Brand />
        </button>

        <div className="w-full max-w-sm">
          <h1 className="text-[28px] font-bold text-white tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isSignup ? "Start a room and bring your team together." : "Sign in to your account and continue creating."}
          </p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
            {isSignup && (
              <div>
                <label className="block text-[13px] text-slate-300 mb-1.5">Full name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-[13px] text-slate-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] text-slate-300">Password</label>
                {!isSignup && (
                  <span className="text-[12.5px] text-blue-400 hover:text-blue-300 cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div>
                <label className="block text-[13px] text-slate-300 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="mt-1 w-full text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg py-3 transition-all cursor-pointer"
            >
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setMode(isSignup ? "signin" : "signup")}
              className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>

          <p className="text-center text-[12.5px] text-slate-500 mt-14 leading-relaxed">
            By continuing, you agree to our <span className="text-blue-400 cursor-pointer">Terms of Service</span>
            <br />
            and acknowledge our <span className="text-blue-400 cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------

const projectThumbs = [
  "from-slate-600 to-slate-800",
  "from-blue-800 to-slate-900",
  "from-amber-800 to-slate-900",
  "from-violet-800 to-slate-900",
  "from-rose-800 to-slate-900",
  "from-slate-700 to-slate-900",
  "from-sky-800 to-slate-900",
  "from-emerald-800 to-slate-900",
];

const statusStyles = {
  "IN PROGRESS": "bg-blue-500 text-white",
  PLANNING: "bg-emerald-600 text-white",
  REVIEW: "bg-amber-500 text-white",
  DRAFT: "bg-slate-600 text-white",
  EDITING: "bg-violet-500 text-white",
  "ON HOLD": "bg-orange-600 text-white",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`absolute top-2.5 left-2.5 text-[10px] font-bold tracking-wide px-2 py-1 rounded-md ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`inline-block text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-md ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function AvatarStack({ n = 3, extra = 0 }) {
  const colors = ["from-blue-400 to-blue-600", "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600", "from-violet-400 to-violet-600"];
  return (
    <div className="flex items-center">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className={`w-5 h-5 rounded-full border-2 border-slate-900 bg-gradient-to-br ${colors[i % colors.length]} ${
            i > 0 ? "-ml-1.5" : ""
          }`}
        />
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 w-5 h-5 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300">
          +{extra}
        </span>
      )}
    </div>
  );
}

const dashProjects = [
  { name: "Re:Bound – Chapter 13", status: "IN PROGRESS", updated: "Updated 2h ago", avatars: 3, extra: 2, thumb: projectThumbs[0], pages: 24 },
  { name: "City Backgrounds", status: "REVIEW", updated: "Updated 1d ago", avatars: 3, extra: 1, thumb: projectThumbs[1], pages: 12 },
  { name: "Slice of Life – Vol. 1", status: "PLANNING", updated: "Updated 3d ago", avatars: 3, extra: 0, thumb: projectThumbs[4], pages: 36 },
  { name: "Action Scenes Pack", status: "DRAFT", updated: "Updated 5d ago", avatars: 3, extra: 1, thumb: projectThumbs[2], pages: 18 },
  { name: "Fantasy World Pack", status: "EDITING", updated: "Updated 5d ago", avatars: 3, extra: 0, thumb: projectThumbs[5], pages: 27 },
  { name: "Character Expressions", status: "DRAFT", updated: "Updated 1d ago", avatars: 3, extra: 0, thumb: projectThumbs[3], pages: 15 },
  { name: "Shonen Action Pack", status: "IN PROGRESS", updated: "Updated 6h ago", avatars: 3, extra: 3, thumb: projectThumbs[6], pages: 20 },
  { name: "Environmental Studies", status: "PLANNING", updated: "Updated 1w ago", avatars: 3, extra: 0, thumb: projectThumbs[7], pages: 10 },
  { name: "One Shot – Prototype", status: "ON HOLD", updated: "Updated 2w ago", avatars: 3, extra: 0, thumb: projectThumbs[0], pages: 32 },
  { name: "Manga Panel Layouts", status: "DRAFT", updated: "Updated 3d ago", avatars: 3, extra: 1, thumb: projectThumbs[1], pages: 8 },
];

const activeRooms = [
  { name: "Re:Bound Team", members: "6 members" },
  { name: "World Building", members: "4 members" },
  { name: "Action Pack", members: "5 members" },
  { name: "Slice of Life Studio", members: "3 members" },
];

const recentActivity = [
  { who: "Ren", what: "updated 12 pages in", where: "Re:Bound – Chapter 13", time: "2h ago", unread: true, grad: "from-blue-400 to-blue-600" },
  { who: "Mika", what: "commented on", where: "Action Scenes Pack", time: "5h ago", unread: true, grad: "from-emerald-400 to-emerald-600" },
  { who: "You", what: "uploaded 8 files to", where: "City Backgrounds", time: "1d ago", unread: true, grad: "from-slate-400 to-slate-600" },
  { who: "Kai", what: "joined the room", where: "Fantasy World Pack", time: "2d ago", unread: true, grad: "from-violet-400 to-violet-600" },
  { who: "Yuna", what: "exported 3 pages from", where: "Character Expressions", time: "2d ago", unread: false, grad: "from-rose-400 to-rose-600" },
  { who: "Ren", what: "commented on", where: "Slice of Life – Vol. 1", time: "3d ago", unread: false, grad: "from-blue-400 to-blue-600" },
  { who: "You", what: "updated the status of", where: "Shonen Action Pack", time: "4d ago", unread: false, grad: "from-slate-400 to-slate-600" },
  { who: "Mika", what: "invited Yuna to", where: "Slice of Life – Vol. 1", time: "5d ago", unread: true, grad: "from-emerald-400 to-emerald-600" },
];

const pageTemplates = [
  { name: "Classic 6 Panel", sub: "Standard" },
  { name: "Action Vertical", sub: "Dynamic" },
  { name: "Cinematic Flow", sub: "Cinematic" },
  { name: "Dialogue Heavy", sub: "Story" },
  { name: "Full Bleed Moments", sub: "Impact" },
];

function TemplatePreview({ index }) {
  // small abstract panel-layout diagrams, varied per template
  const layouts = [
    <svg viewBox="0 0 100 130" className="w-full h-full">
      <rect x="4" y="4" width="92" height="40" fill="#1e293b" stroke="#334155" />
      <rect x="4" y="48" width="42" height="36" fill="#1e293b" stroke="#334155" />
      <rect x="50" y="48" width="46" height="36" fill="#1e293b" stroke="#334155" />
      <rect x="4" y="88" width="92" height="38" fill="#1e293b" stroke="#334155" />
    </svg>,
    <svg viewBox="0 0 100 130" className="w-full h-full">
      <rect x="4" y="4" width="92" height="122" fill="#1e293b" stroke="#334155" />
      <line x1="4" y1="4" x2="96" y2="126" stroke="#475569" strokeWidth="2" />
      <line x1="50" y1="4" x2="4" y2="70" stroke="#475569" strokeWidth="2" />
    </svg>,
    <svg viewBox="0 0 100 130" className="w-full h-full">
      <rect x="4" y="4" width="92" height="58" fill="#1e293b" stroke="#334155" />
      <rect x="4" y="66" width="92" height="60" fill="#1e293b" stroke="#334155" />
      <circle cx="50" cy="33" r="14" fill="#334155" opacity="0.6" />
    </svg>,
    <svg viewBox="0 0 100 130" className="w-full h-full">
      <rect x="4" y="4" width="44" height="58" fill="#1e293b" stroke="#334155" />
      <rect x="52" y="4" width="44" height="58" fill="#1e293b" stroke="#334155" />
      <rect x="4" y="66" width="44" height="60" fill="#1e293b" stroke="#334155" />
      <rect x="52" y="66" width="44" height="60" fill="#1e293b" stroke="#334155" />
    </svg>,
    <svg viewBox="0 0 100 130" className="w-full h-full">
      <rect x="0" y="0" width="100" height="130" fill="#1e293b" stroke="#334155" />
      <path d="M50 65 L20 20 M50 65 L80 20 M50 65 L15 65 M50 65 L85 65 M50 65 L20 110 M50 65 L80 110" stroke="#334155" strokeWidth="1.5" />
    </svg>,
  ];
  return layouts[index % layouts.length];
}

function Sidebar({ active, onNavigate }) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "projects", label: "Projects", icon: FolderKanban },
    { key: "templates", label: "Templates", icon: LayoutTemplate },
    { key: "rooms", label: "Rooms", icon: DoorOpen },
    { key: "members", label: "Members", icon: Users },
    { key: "settings", label: "Settings", icon: Settings },
    { key: "exports", label: "Exports", icon: Download },
  ];
  return (
    <aside className="hidden md:flex flex-col w-[220px] flex-shrink-0 border-r border-slate-800 bg-slate-950 min-h-screen">
      <button onClick={() => onNavigate("landing")} className="px-5 py-6 cursor-pointer text-left">
        <Brand />
      </button>
      <nav className="flex flex-col gap-1 px-3">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              onClick={() => {
                if (it.key === "dashboard") onNavigate("dashboard");
                else if (it.key === "projects") onNavigate("projects");
                else if (it.key === "rooms") onNavigate("rooms");
                else if (it.key === "settings") onNavigate("settings");
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors cursor-pointer ${
                isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {it.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3 border-t border-slate-800">
        <button
          onClick={() => onNavigate("auth", null, "signin")}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex-shrink-0" />
          <span className="text-left">
            <span className="block text-[13px] font-semibold text-white">Obi</span>
            <span className="block text-[11px] text-slate-500">obi@scaffold.app</span>
          </span>
          <ChevronDown size={14} className="ml-auto text-slate-500" />
        </button>
      </div>
    </aside>
  );
}

function DashboardTopbar() {
  return (
    <div className="flex items-center justify-end gap-4 px-8 py-5">
      <div className="relative w-72 hidden sm:block">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Search projects, rooms..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-600 rounded-lg pl-9 pr-14 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none transition-colors"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
          ⌘K
        </span>
      </div>
      <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer">
        <Bell size={17} />
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center">
          3
        </span>
      </button>
      <button className="flex items-center gap-2 cursor-pointer">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
        <span className="text-[13.5px] font-semibold text-white hidden sm:inline">Obi</span>
        <ChevronDown size={14} className="text-slate-500 hidden sm:inline" />
      </button>
    </div>
  );
}

function Dashboard({ onNavigate }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar active="dashboard" onNavigate={onNavigate} />

      <div className="flex-1 min-w-0">
        <DashboardTopbar />

        <div className="px-8 pb-16">
          <h1 className="text-[26px] font-bold text-white flex items-center gap-2.5">
            Good evening, Obi <span>👋</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">Let's continue building something amazing today.</p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => onNavigate("dashboard")}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg px-4 py-2.5 transition-all cursor-pointer"
            >
              <Plus size={15} /> New Project
            </button>
            <button
              onClick={() => onNavigate("rooms")}
              className="flex items-center gap-2 text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white rounded-lg px-4 py-2.5 transition-colors cursor-pointer"
            >
              <DoorOpen size={15} /> Join or Create Room
            </button>
            <button className="flex items-center gap-2 text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white rounded-lg px-4 py-2.5 transition-colors cursor-pointer">
              <LayoutTemplate size={15} /> Start from Template
            </button>
          </div>

          {/* Two-column layout: main + right rail */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8 mt-10">
            <div className="min-w-0">
              {/* Continue Working */}
              <div>
                <h2 className="text-[15px] font-bold text-white mb-3">Continue Working</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col sm:flex-row">
                  <div className={`sm:w-64 h-40 sm:h-auto bg-gradient-to-br ${projectThumbs[0]} flex-shrink-0`} />
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="flex items-start justify-between">
                      <span className="text-[11px] font-bold text-violet-400 tracking-wide">IN PROGRESS</span>
                      <MoreHorizontal size={16} className="text-slate-500" />
                    </div>
                    <h3 className="text-white font-bold text-lg mt-1">Re:Bound – Chapter 13</h3>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[12px] text-slate-400 mb-1.5">
                        <span>65% complete</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "65%" }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800 flex-1 items-end">
                      <div className="flex items-center gap-2.5">
                        <AvatarStack n={3} extra={2} />
                        <span className="text-[11.5px] text-slate-500">Updated 2h ago</span>
                      </div>
                      <button
                        onClick={() => onNavigate("landing")}
                        className="text-[12.5px] font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 rounded-lg px-3.5 py-2 cursor-pointer hover:brightness-110"
                      >
                        Open Project
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Projects */}
              <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-white">Your Projects</h2>
                  <button onClick={() => onNavigate("projects")} className="text-[12.5px] font-semibold text-blue-400 cursor-pointer">
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashProjects.slice(0, 8).map((p, i) => (
                    <div key={i} className="group">
                      <div className={`relative aspect-[3/4] rounded-xl bg-gradient-to-br ${p.thumb} overflow-hidden`}>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="mt-2 flex items-start justify-between gap-1">
                        <h3 className="text-[13px] font-semibold text-white leading-snug">{p.name}</h3>
                        <MoreHorizontal size={14} className="text-slate-600 flex-shrink-0 mt-0.5 cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <AvatarStack n={Math.min(p.avatars, 3)} extra={p.extra} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{p.updated}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-white">Start from a Manga Page Template</h2>
                  <span className="text-[12.5px] font-semibold text-blue-400 cursor-pointer">View all templates</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {pageTemplates.map((t, i) => (
                    <div key={i} className="cursor-pointer group">
                      <div className="aspect-[3/4] rounded-xl bg-slate-900 border border-slate-800 group-hover:border-slate-700 p-3 transition-colors">
                        <TemplatePreview index={i} />
                      </div>
                      <div className="mt-2 text-[13px] font-semibold text-white">{t.name}</div>
                      <div className="text-[11px] text-slate-500">{t.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div className="flex flex-col gap-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-bold text-white">Active Rooms</h2>
                  <span className="text-[12px] font-semibold text-blue-400 cursor-pointer">View all</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
                  {activeRooms.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-white truncate">{r.name}</span>
                        <span className="block text-[11.5px] text-slate-500">{r.members}</span>
                      </span>
                      <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-bold text-white">Recent Activity</h2>
                  <span className="text-[12px] font-semibold text-blue-400 cursor-pointer">View all</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                      <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${a.grad} flex-shrink-0 mt-0.5`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] text-slate-300 leading-snug">
                          <b className="font-semibold text-white">{a.who}</b> {a.what}{" "}
                          <b className="font-semibold text-white">{a.where}</b>
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">{a.time}</span>
                      </span>
                      {a.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Projects ----------

function ProjectsPage({ onNavigate }) {
  const [tab, setTab] = useState("All Projects");
  const tabs = ["All Projects", "My Projects", "Collaborating", "Archived"];
  const pinned = dashProjects.slice(0, 4);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar active="projects" onNavigate={onNavigate} />

      <div className="flex-1 min-w-0">
        <DashboardTopbar />

        <div className="px-8 pb-16">
          <h1 className="text-[26px] font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-1.5">All your manga projects in one place.</p>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 border-b border-slate-800 pb-0">
            <div className="flex items-center gap-6">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-[13.5px] font-semibold pb-3 border-b-2 -mb-px transition-colors cursor-pointer ${
                    tab === t ? "text-white border-blue-500" : "text-slate-500 border-transparent hover:text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5 pb-3">
              <button className="flex items-center gap-2 text-[13px] font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white rounded-lg px-3.5 py-2 transition-colors cursor-pointer">
                <Filter size={14} /> Filter
              </button>
              <button className="flex items-center gap-2 text-[13px] font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white rounded-lg px-3.5 py-2 transition-colors cursor-pointer">
                <ArrowUpDown size={14} /> Last Updated
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8 mt-8">
            <div className="min-w-0">
              {/* Pinned Projects */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-white">Pinned Projects</h2>
                  <span className="text-[12.5px] font-semibold text-blue-400 cursor-pointer">View all</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {pinned.map((p, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div className={`relative aspect-[3/4] rounded-xl bg-gradient-to-br ${p.thumb} overflow-hidden`}>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="mt-2 flex items-start justify-between gap-1">
                        <h3 className="text-[13px] font-semibold text-white leading-snug">{p.name}</h3>
                        <MoreHorizontal size={14} className="text-slate-600 flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="mt-1.5">
                        <AvatarStack n={Math.min(p.avatars, 3)} extra={p.extra} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{p.updated}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Projects table */}
              <div className="mt-10">
                <h2 className="text-[15px] font-bold text-white mb-3">All Projects</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="hidden sm:grid grid-cols-[1.9fr_1fr_0.6fr_0.9fr_0.9fr_28px] gap-3 px-4 py-3 text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-800">
                    <span>Project</span>
                    <span>Members</span>
                    <span>Pages</span>
                    <span>Status</span>
                    <span>Last Updated</span>
                    <span></span>
                  </div>
                  {dashProjects.map((p, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-2 sm:grid-cols-[1.9fr_1fr_0.6fr_0.9fr_0.9fr_28px] gap-3 items-center px-4 py-3 border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 col-span-2 sm:col-span-1">
                        <span className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.thumb} flex-shrink-0`} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-white truncate">{p.name}</span>
                          <span className="block text-[11px] text-slate-500 sm:hidden mt-0.5">{p.updated}</span>
                        </span>
                      </div>
                      <div className="hidden sm:block">
                        <AvatarStack n={Math.min(p.avatars, 3)} extra={p.extra} />
                      </div>
                      <span className="hidden sm:block text-[13px] text-slate-300">{p.pages}</span>
                      <span className="hidden sm:block">
                        <StatusPill status={p.status} />
                      </span>
                      <span className="hidden sm:block text-[12.5px] text-slate-500">{p.updated.replace("Updated ", "")}</span>
                      <MoreHorizontal size={15} className="hidden sm:block text-slate-600 justify-self-end" />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-1.5 mt-6">
                  <button className="w-8 h-8 rounded-lg border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 flex items-center justify-center cursor-pointer">
                    <ChevronLeft size={15} />
                  </button>
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      className={`w-8 h-8 rounded-lg text-[13px] font-semibold flex items-center justify-center cursor-pointer ${
                        n === 1 ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-slate-600 px-1">…</span>
                  <button className="w-8 h-8 rounded-lg text-[13px] font-semibold text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center cursor-pointer">
                    8
                  </button>
                  <button className="w-8 h-8 rounded-lg border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 flex items-center justify-center cursor-pointer">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-[14px] font-bold text-white mb-3">Create New</h2>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => onNavigate("dashboard")}
                    className="flex items-start gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 text-left transition-colors cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Plus size={17} />
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-semibold text-white">New Project</span>
                      <span className="block text-[11.5px] text-slate-500 mt-0.5">Start a blank project from scratch</span>
                    </span>
                  </button>
                  <button className="flex items-start gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 text-left transition-colors cursor-pointer">
                    <span className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center flex-shrink-0">
                      <LayoutGrid size={17} />
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-semibold text-white">Use Template</span>
                      <span className="block text-[11.5px] text-slate-500 mt-0.5">Start from a manga page template</span>
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-bold text-white">Recent Activity</h2>
                  <span className="text-[12px] font-semibold text-blue-400 cursor-pointer">View all</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
                  {recentActivity.slice(0, 6).map((a, i) => (
                    <div key={i} className="flex items-start gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                      <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${a.grad} flex-shrink-0 mt-0.5`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] text-slate-300 leading-snug">
                          <b className="font-semibold text-white">{a.who}</b> {a.what}{" "}
                          <b className="font-semibold text-white">{a.where}</b>
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">{a.time}</span>
                      </span>
                      {a.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />}
                    </div>
                  ))}
                  <button className="w-full flex items-center justify-center gap-1 text-[12.5px] font-semibold text-blue-400 py-2.5 cursor-pointer">
                    View all activity <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Rooms ----------

const roomStatusStyle = {
  Live: "text-emerald-400",
  Paused: "text-amber-400",
  Ended: "text-slate-500",
};

function RoomStatus({ status }) {
  return (
    <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${roomStatusStyle[status]}`}>
      {status === "Live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      {status === "Paused" && <PauseCircle size={13} />}
      {status === "Ended" && <StopCircle size={13} />}
      {status}
    </span>
  );
}

const recentRooms = [
  { name: "Re:Bound – Chapter 13", active: "Last active 2m ago", status: "Live", avatars: 3, extra: 2, thumb: projectThumbs[0] },
  { name: "City Backgrounds", active: "Last active 15m ago", status: "Paused", avatars: 2, extra: 0, thumb: projectThumbs[1] },
  { name: "Slice of Life – Vol. 1", active: "Last active 1h ago", status: "Live", avatars: 3, extra: 0, thumb: projectThumbs[4] },
  { name: "Action Scenes Pack", active: "Last active 3h ago", status: "Ended", avatars: 3, extra: 2, thumb: projectThumbs[2] },
  { name: "Fantasy World Pack", active: "Last active 5h ago", status: "Paused", avatars: 3, extra: 0, thumb: projectThumbs[5] },
  { name: "Character Expressions", active: "Last active 1d ago", status: "Ended", avatars: 2, extra: 0, thumb: projectThumbs[3] },
  { name: "Shonen Action Pack", active: "Last active 1d ago", status: "Live", avatars: 3, extra: 2, thumb: projectThumbs[6] },
  { name: "Environmental Studies", active: "Last active 2d ago", status: "Ended", avatars: 2, extra: 0, thumb: projectThumbs[7] },
];

const activeNow = [
  { name: "Kai", activity: "Working on Page 18", grad: "from-violet-400 to-violet-600" },
  { name: "Mika", activity: "Editing Panel 3", grad: "from-emerald-400 to-emerald-600" },
  { name: "Ren", activity: "Adding text", grad: "from-blue-400 to-blue-600" },
];

const pendingInvites = [
  { name: "Yuna", email: "yuna@example.com", room: "Slice of Life – Vol. 1", time: "2m ago", grad: "from-slate-400 to-slate-600" },
  { name: "Hiro", email: "hiro@example.com", room: "Action Scenes Pack", time: "1h ago", grad: "from-slate-400 to-slate-600" },
  { name: "Sora", email: "sora@example.com", room: "Fantasy World Pack", time: "3h ago", grad: "from-slate-400 to-slate-600" },
];

function RoomsPage({ onNavigate }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar active="rooms" onNavigate={onNavigate} />

      <div className="flex-1 min-w-0">
        <DashboardTopbar />

        <div className="px-8 pb-16">
          <h1 className="text-[26px] font-bold text-white">Join or Create a Room</h1>
          <p className="text-slate-400 text-sm mt-1.5">Collaborate in real-time with your team.</p>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8 mt-8">
            <div className="min-w-0">
              {/* Create / Join cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
                  <span className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-4">
                    <Users size={19} />
                  </span>
                  <h3 className="text-white font-bold text-[15px]">Create a New Room</h3>
                  <p className="text-slate-400 text-[13px] mt-1.5 leading-relaxed flex-1">
                    Start a new collaboration room and invite your team members.
                  </p>
                  <button
                    onClick={() => onNavigate("dashboard")}
                    className="mt-5 text-sm font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg py-2.5 transition-all cursor-pointer"
                  >
                    Create Room
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
                  <span className="w-11 h-11 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center mb-4">
                    <LogIn size={19} />
                  </span>
                  <h3 className="text-white font-bold text-[15px]">Join a Room</h3>
                  <p className="text-slate-400 text-[13px] mt-1.5 leading-relaxed">
                    Enter a room code to join an existing collaboration room.
                  </p>
                  <input
                    placeholder="Enter room code"
                    className="mt-4 w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  <button className="mt-3 text-sm font-semibold text-white border border-blue-500 text-blue-400 hover:bg-blue-500/10 rounded-lg py-2.5 transition-colors cursor-pointer">
                    Join Room
                  </button>
                </div>
              </div>

              {/* Recent Rooms */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-white">Recent Rooms</h2>
                  <span className="text-[12.5px] font-semibold text-blue-400 cursor-pointer">View all</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  {recentRooms.map((r, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-4 px-4 py-3.5 border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40 transition-colors"
                    >
                      <span className={`w-11 h-11 rounded-lg bg-gradient-to-br ${r.thumb} flex-shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold text-white truncate">{r.name}</span>
                        <span className="block text-[11.5px] text-slate-500 mt-0.5">{r.active}</span>
                        <div className="mt-1">
                          <AvatarStack n={Math.min(r.avatars, 3)} extra={r.extra} />
                        </div>
                      </div>
                      <div className="w-20 flex-shrink-0">
                        <RoomStatus status={r.status} />
                      </div>
                      <button
                        onClick={() => onNavigate("dashboard")}
                        className="text-[12.5px] font-semibold text-blue-400 border border-blue-500/60 hover:bg-blue-500/10 rounded-lg px-3.5 py-2 transition-colors cursor-pointer flex-shrink-0"
                      >
                        Rejoin Room
                      </button>
                      <MoreHorizontal size={16} className="text-slate-600 flex-shrink-0 cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Shortcuts */}
              <div className="mt-8">
                <h2 className="text-[15px] font-bold text-white mb-3">Room Shortcuts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-colors cursor-pointer">
                    <span className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-white">Invite Members</span>
                      <span className="block text-[11.5px] text-slate-500 mt-0.5">Invite your team to collaborate in a room.</span>
                    </span>
                    <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                  </button>
                  <button className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-colors cursor-pointer">
                    <span className="w-10 h-10 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center flex-shrink-0">
                      <LinkIcon size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-white">Copy Invite Link</span>
                      <span className="block text-[11.5px] text-slate-500 mt-0.5">Copy the room invite link to share with others.</span>
                    </span>
                    <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-[14px] font-bold text-white mb-3">Active Now</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
                  {activeNow.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                      <span className="relative flex-shrink-0">
                        <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${a.grad} block`} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-white">{a.name}</span>
                        <span className="block text-[11.5px] text-slate-500">{a.activity}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-bold text-white">Pending Invitations</h2>
                  <span className="text-[12px] font-semibold text-blue-400 cursor-pointer">View all</span>
                </div>
                <div className="flex flex-col gap-3">
                  {pendingInvites.map((p, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${p.grad} flex-shrink-0`} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-white">{p.name}</span>
                          <span className="block text-[11px] text-slate-500 truncate">{p.email}</span>
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-400 mt-2.5">
                        Invited to <span className="text-white font-semibold">{p.room}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{p.time}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <button className="flex-1 text-[12.5px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg py-1.5 transition-colors cursor-pointer">
                          Accept
                        </button>
                        <button className="flex-1 text-[12.5px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg py-1.5 transition-colors cursor-pointer">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Settings ----------

function Toggle({ defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors cursor-pointer ${
        on ? "bg-blue-600" : "bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function SettingSelect({ options, defaultValue }) {
  return (
    <div className="relative w-full sm:w-36 flex-shrink-0">
      <select
        defaultValue={defaultValue}
        className="w-full appearance-none bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-lg pl-3 pr-8 py-2 text-[13px] text-white outline-none transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
    </div>
  );
}

function PrefRow({ icon: Icon, title, desc, control }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 border-b border-slate-800 last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0">
          <Icon size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold text-white">{title}</span>
          <span className="block text-[12px] text-slate-500 mt-0.5">{desc}</span>
        </span>
      </div>
      <div className="sm:ml-auto pl-12 sm:pl-0">{control}</div>
    </div>
  );
}

function SettingsPage({ onNavigate }) {
  const [tab, setTab] = useState("General");

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar active="settings" onNavigate={onNavigate} />

      <div className="flex-1 min-w-0">
        <DashboardTopbar />

        <div className="px-4 sm:px-8 pb-16">
          <h1 className="text-[22px] sm:text-[26px] font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1.5">Manage your account settings and preferences.</p>

          <div className="flex items-center gap-6 mt-6 border-b border-slate-800">
            {["General", "Security"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-[13.5px] font-semibold pb-3 border-b-2 -mb-px transition-colors cursor-pointer ${
                  tab === t ? "text-white border-blue-500" : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "General" ? (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 xl:gap-8 mt-8">
              <div className="min-w-0 flex flex-col gap-6">
                {/* Profile */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
                  <h2 className="text-[15px] font-bold text-white mb-5">Profile</h2>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="relative w-20 h-20 flex-shrink-0 mx-auto sm:mx-0">
                      <span className="block w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
                      <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer">
                        <Camera size={13} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-4">
                      <div>
                        <label className="block text-[12.5px] text-slate-400 mb-1.5">Display Name</label>
                        <input
                          defaultValue="Obi"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-[13.5px] text-white outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] text-slate-400 mb-1.5">Email Address</label>
                        <input
                          defaultValue="obi@scaffold.app"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-[13.5px] text-white outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] text-slate-400 mb-1.5">Bio</label>
                        <textarea
                          rows={3}
                          defaultValue="Manga artist and storyteller. Building worlds, one panel at a time."
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-[13.5px] text-white outline-none transition-colors resize-none"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button className="text-[13px] font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/30 rounded-lg px-5 py-2.5 transition-all cursor-pointer">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
                  <h2 className="text-[15px] font-bold text-white mb-1">Preferences</h2>
                  <div className="mt-3">
                    <PrefRow icon={Moon} title="Theme" desc="Choose your preferred theme" control={<SettingSelect options={["Dark", "Light", "System"]} defaultValue="Dark" />} />
                    <PrefRow icon={Globe} title="Language" desc="Select your preferred language" control={<SettingSelect options={["English", "Japanese", "Spanish"]} defaultValue="English" />} />
                    <PrefRow icon={Grid3x3} title="Default View" desc="Choose your default project view" control={<SettingSelect options={["Grid", "List"]} defaultValue="Grid" />} />
                    <PrefRow icon={Cloud} title="Autosave" desc="Automatically save your work" control={<Toggle defaultOn />} />
                    <PrefRow icon={Monitor} title="Show Welcome Screen" desc="Show welcome screen on login" control={<Toggle defaultOn />} />
                    <PrefRow icon={AlignJustify} title="Compact Mode" desc="Use a more compact interface" control={<Toggle />} />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-slate-900 border border-red-900/50 rounded-2xl p-5 sm:p-6">
                  <h2 className="text-[15px] font-bold text-white mb-4">Danger Zone</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-red-500/5 border border-red-900/40 rounded-xl p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-9 h-9 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
                        <Trash2 size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-white">Delete Account</span>
                        <span className="block text-[12px] text-slate-500 mt-0.5">Permanently delete your account and all of your data.</span>
                      </span>
                    </div>
                    <button className="text-[13px] font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg px-4 py-2.5 transition-colors cursor-pointer flex-shrink-0 w-full sm:w-auto">
                      Delete Account
                    </button>
                  </div>
                </div>

                {/* Help */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-bold text-white">Need help?</h2>
                    <p className="text-[12.5px] text-slate-500 mt-1">
                      If you need help with your account or have any questions, we're here for you.
                    </p>
                  </div>
                  <button className="flex items-center justify-center gap-2 text-[13px] font-semibold text-blue-400 border border-blue-500/60 hover:bg-blue-500/10 rounded-lg px-4 py-2.5 transition-colors cursor-pointer flex-shrink-0 w-full sm:w-auto">
                    Visit Help Center <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              {/* Right rail */}
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-[14px] font-bold text-white mb-3">Quick Actions</h2>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-col gap-1">
                    <button className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-800/60 transition-colors text-left cursor-pointer">
                      <span className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                        <RefreshCw size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-white">Reset Preferences</span>
                        <span className="block text-[11.5px] text-slate-500">Reset all settings to their default values</span>
                      </span>
                      <ChevronRight size={15} className="text-slate-600 flex-shrink-0" />
                    </button>
                    <button className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-800/60 transition-colors text-left cursor-pointer">
                      <span className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                        <Trash2 size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-white">Clear Cache</span>
                        <span className="block text-[11.5px] text-slate-500">Clear temporary data to improve performance</span>
                      </span>
                      <ChevronRight size={15} className="text-slate-600 flex-shrink-0" />
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-[14px] font-bold text-white mb-3">Account</h2>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
                    <div>
                      <span className="block text-[12px] text-slate-500">Member Since</span>
                      <span className="block text-[13px] font-medium text-white mt-0.5">Jan 12, 2024</span>
                    </div>
                    <div>
                      <span className="block text-[12px] text-slate-500">Last Login</span>
                      <span className="block text-[13px] font-medium text-white mt-0.5">May 12, 2025, 9:41 AM</span>
                    </div>
                    <div>
                      <span className="block text-[12px] text-slate-500">Account ID</span>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[13px] font-medium text-white truncate">scf_8f3a2b7c4d9e</span>
                        <Copy size={13} className="text-slate-500 hover:text-white flex-shrink-0 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl">
              <h2 className="text-[15px] font-bold text-white mb-1.5">Security</h2>
              <p className="text-[13px] text-slate-500">Password, two-factor authentication, and login activity settings live here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- App root ----------

export default function ScaffoldApp() {
  const [view, setView] = useState("landing"); // 'landing' | 'auth'
  const [authMode, setAuthMode] = useState("signin"); // 'signin' | 'signup'

  const onNavigate = (nextView, _section, mode) => {
    if (nextView === "auth") {
      setAuthMode(mode || "signin");
    }
    setView(nextView);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased">
      {view === "landing" && (
        <>
          <Header onNavigate={onNavigate} />
          <LandingPage onNavigate={onNavigate} />
        </>
      )}
      {view === "auth" && <AuthPage mode={authMode} setMode={setAuthMode} onNavigate={onNavigate} />}
      {view === "dashboard" && <Dashboard onNavigate={onNavigate} />}
      {view === "projects" && <ProjectsPage onNavigate={onNavigate} />}
      {view === "rooms" && <RoomsPage onNavigate={onNavigate} />}
      {view === "settings" && <SettingsPage onNavigate={onNavigate} />}
    </div>
  );
}
