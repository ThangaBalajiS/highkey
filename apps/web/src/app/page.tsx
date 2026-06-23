"use client";

import React, { useState, useEffect } from 'react';

interface ShortcutKey {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

interface CommunityShortcut {
  id: string;
  label: string;
  domain: string;
  path?: string;
  scope: 'domain' | 'path';
  selector: string;
  innerText?: string;
  shortcut: ShortcutKey;
  authorId?: string;
  upvotes: number;
  downloads: number;
  createdAt: number;
}

// High-quality seed data for common websites
const SEED_SHORTCUTS: CommunityShortcut[] = [
  {
    id: "yt-like",
    label: "Like Video",
    domain: "youtube.com",
    scope: "domain",
    selector: "#top-level-buttons-computed ytd-toggle-button-renderer:first-of-type button",
    innerText: "Like",
    shortcut: { key: "l", ctrl: false, shift: false, alt: true, meta: false },
    upvotes: 142,
    downloads: 839,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
  },
  {
    id: "yt-sub",
    label: "Subscribe to Channel",
    domain: "youtube.com",
    scope: "domain",
    selector: "ytd-subscribe-button-renderer button",
    innerText: "Subscribe",
    shortcut: { key: "s", ctrl: false, shift: true, alt: false, meta: true },
    upvotes: 98,
    downloads: 512,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4
  },
  {
    id: "yt-theater",
    label: "Toggle Theater Mode",
    domain: "youtube.com",
    scope: "domain",
    selector: "button.ytp-size-button",
    shortcut: { key: "t", ctrl: false, shift: false, alt: false, meta: false },
    upvotes: 64,
    downloads: 320,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10
  },
  {
    id: "gh-pr",
    label: "Create Pull Request",
    domain: "github.com",
    scope: "domain",
    selector: "a[href$='/compare']",
    innerText: "New pull request",
    shortcut: { key: "p", ctrl: false, shift: true, alt: true, meta: false },
    upvotes: 115,
    downloads: 642,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6
  },
  {
    id: "gh-star",
    label: "Star Repository",
    domain: "github.com",
    scope: "domain",
    selector: "button.unstarred button",
    innerText: "Star",
    shortcut: { key: "s", ctrl: false, shift: false, alt: true, meta: false },
    upvotes: 82,
    downloads: 418,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8
  },
  {
    id: "gh-issue",
    label: "New Issue Button",
    domain: "github.com",
    scope: "domain",
    selector: "a[href$='/issues/new']",
    innerText: "New issue",
    shortcut: { key: "n", ctrl: false, shift: true, alt: false, meta: true },
    upvotes: 55,
    downloads: 290,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12
  },
  {
    id: "notion-sidebar",
    label: "Toggle Sidebar",
    domain: "notion.so",
    scope: "domain",
    selector: "div.notion-sidebar-container div[role='button']",
    shortcut: { key: "\\", ctrl: false, shift: false, alt: false, meta: true },
    upvotes: 156,
    downloads: 910,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3
  },
  {
    id: "reddit-up",
    label: "Upvote Post",
    domain: "reddit.com",
    scope: "domain",
    selector: "button[aria-label='upvote']",
    shortcut: { key: "a", ctrl: false, shift: false, alt: false, meta: false },
    upvotes: 104,
    downloads: 580,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7
  },
  {
    id: "reddit-comments",
    label: "Jump to Comments",
    domain: "reddit.com",
    scope: "domain",
    selector: "a[href*='/comments/']",
    shortcut: { key: "c", ctrl: false, shift: false, alt: true, meta: false },
    upvotes: 48,
    downloads: 240,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15
  },
  {
    id: "gmail-compose",
    label: "Compose New Email",
    domain: "mail.google.com",
    scope: "domain",
    selector: "div[role='button'][gh='cm']",
    innerText: "Compose",
    shortcut: { key: "c", ctrl: false, shift: true, alt: false, meta: false },
    upvotes: 75,
    downloads: 403,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 11
  }
];

const POPULAR_DOMAINS = [
  { name: "All Domains", query: "" },
  { name: "YouTube", query: "youtube.com" },
  { name: "GitHub", query: "github.com" },
  { name: "Notion", query: "notion.so" },
  { name: "Reddit", query: "reddit.com" },
  { name: "Gmail", query: "mail.google.com" }
];

export default function Home() {
  const [shortcuts, setShortcuts] = useState<CommunityShortcut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>("");
  const [selectedShortcut, setSelectedShortcut] = useState<CommunityShortcut | null>(SEED_SHORTCUTS[0]);
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'howitworks'>('shortcuts');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalShortcut, setModalShortcut] = useState<CommunityShortcut | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch shortcuts from the API
  useEffect(() => {
    async function fetchShortcuts() {
      try {
        setLoading(true);
        const res = await fetch('/api/shortcuts');
        if (res.ok) {
          const packs = await res.json();
          // Flatten packs into shortcuts list
          const data: CommunityShortcut[] = [];
          if (Array.isArray(packs)) {
            packs.forEach((p: any) => {
              if (p.shortcuts && Array.isArray(p.shortcuts)) {
                p.shortcuts.forEach((s: any) => {
                  data.push({
                    ...s,
                    domain: p.domain,
                    authorId: p.authorId,
                    upvotes: p.upvotes || 0,
                    downloads: p.downloads || 0,
                    createdAt: p.createdAt || Date.now()
                  });
                });
              }
            });
          }
          // Merge API data with seed data (deduplicating by ID)
          const merged = [...data];
          SEED_SHORTCUTS.forEach(seed => {
            if (!merged.some(item => item.id === seed.id)) {
              merged.push(seed);
            }
          });
          // Sort by upvotes
          merged.sort((a, b) => b.upvotes - a.upvotes);
          setShortcuts(merged);
        } else {
          setShortcuts(SEED_SHORTCUTS);
        }
      } catch (err) {
        console.error("Failed to load shortcuts from DB, using seed data:", err);
        setShortcuts(SEED_SHORTCUTS);
      } finally {
        setLoading(false);
      }
    }
    fetchShortcuts();
  }, []);

  // Filter shortcuts based on search and tab selections
  const filteredShortcuts = shortcuts.filter(item => {
    const matchesSearch = 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.innerText && item.innerText.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDomain = selectedDomainFilter === "" || item.domain === selectedDomainFilter;
    
    return matchesSearch && matchesDomain;
  });

  // Handle Upvoting
  const handleUpvote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Optimistic UI update
    setShortcuts(prev => 
      prev.map(item => item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item)
    );
    if (selectedShortcut?.id === id) {
      setSelectedShortcut(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : null);
    }

    try {
      await fetch(`/api/shortcuts/${id}/upvote`, { method: 'POST' });
    } catch (err) {
      console.error("Upvote API failed:", err);
    }
  };

  // Handle Download Click
  const handleDownload = async (item: CommunityShortcut) => {
    setModalShortcut(item);
    setModalOpen(true);

    // Track download
    try {
      await fetch(`/api/shortcuts/${item.id}/download`, { method: 'POST' });
      // Update count reactively
      setShortcuts(prev => 
        prev.map(s => s.id === item.id ? { ...s, downloads: s.downloads + 1 } : s)
      );
      if (selectedShortcut?.id === item.id) {
        setSelectedShortcut(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : null);
      }
    } catch (err) {
      console.error("Download track API failed:", err);
    }
  };

  // Copy JSON code for import
  const copyImportJson = (item: CommunityShortcut) => {
    const importFormat = {
      [item.domain]: [{
        shortcut: item.shortcut,
        selector: item.selector,
        innerText: item.innerText || "",
        label: item.label,
        scope: item.scope,
        path: item.path || null,
        id: item.id,
        createdAt: Date.now()
      }]
    };
    
    navigator.clipboard.writeText(JSON.stringify(importFormat, null, 2));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Keyboard rendering helper
  const renderVirtualKeyboard = () => {
    if (!selectedShortcut) return null;
    const { key, ctrl, shift, alt, meta } = selectedShortcut.shortcut;
    
    const targetKey = key.toLowerCase();

    // Standard QWERTY layout rows
    const rows = [
      ["Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Back"],
      ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
      ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
      ["ShiftL", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "ShiftR"],
      ["CtrlL", "AltL", "CmdL", "Space", "CmdR", "AltR"]
    ];

    const getKeyLabel = (k: string) => {
      if (k === "ShiftL" || k === "ShiftR") return "Shift";
      if (k === "CtrlL") return "Ctrl";
      if (k === "AltL" || k === "AltR") return "Option";
      if (k === "CmdL" || k === "CmdR") return "Command";
      return k.toUpperCase();
    };

    const isKeyHighlighted = (k: string) => {
      if (k === "ShiftL" || k === "ShiftR") return shift;
      if (k === "CtrlL") return ctrl;
      if (k === "AltL" || k === "AltR") return alt;
      if (k === "CmdL" || k === "CmdR") return meta;
      
      // Match letter keys or symbols
      if (k.toLowerCase() === targetKey) return true;
      if (targetKey === "control" && k === "CtrlL") return true;
      if (targetKey === "shift" && (k === "ShiftL" || k === "ShiftR")) return true;
      if (targetKey === "alt" && (k === "AltL" || k === "AltR")) return true;
      if (targetKey === "meta" && (k === "CmdL" || k === "CmdR")) return true;
      return false;
    };

    return (
      <div className="flex flex-col gap-1.5 p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl max-w-full overflow-x-auto shadow-2xl">
        <div className="flex justify-between items-center mb-2 px-1 text-xs text-slate-400 font-medium">
          <span>Virtual Keymap Visualizer</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Preview
          </span>
        </div>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 justify-center min-w-max">
            {row.map((k, colIndex) => {
              const highlighted = isKeyHighlighted(k);
              
              // Custom sizing classes for special keys
              let keyWidth = "w-10 sm:w-11";
              if (k === "Esc" || k === "Back" || k === "Tab" || k === "Caps" || k === "Enter") keyWidth = "w-14 sm:w-16";
              if (k === "ShiftL" || k === "ShiftR") keyWidth = "w-18 sm:w-20";
              if (k === "Space") keyWidth = "w-48 sm:w-56";
              if (k === "CtrlL" || k === "AltL" || k === "CmdL" || k === "CmdR" || k === "AltR") keyWidth = "w-14 sm:w-16";

              return (
                <div
                  key={colIndex}
                  className={`h-9 sm:h-10 rounded flex items-center justify-center text-xs font-semibold select-none transition-all duration-300 ${keyWidth} ${
                    highlighted 
                      ? 'bg-emerald-500 text-[#040406] shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-[1.03]' 
                      : 'bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {getKeyLabel(k)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Human readable key combo
  const getShortcutString = (keyCombo: ShortcutKey) => {
    const parts = [];
    if (keyCombo.meta) parts.push("⌘ Cmd");
    if (keyCombo.ctrl) parts.push("⌃ Ctrl");
    if (keyCombo.alt) parts.push("⌥ Opt");
    if (keyCombo.shift) parts.push("⇧ Shift");
    parts.push(keyCombo.key.toUpperCase());
    return parts.join(" + ");
  };

  return (
    <div className="relative overflow-hidden min-h-screen flex flex-col font-sans">
      {/* Background Radial Glows */}
      <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none"></div>

      {/* Header / Navbar */}
      <header className="relative border-b border-slate-800/80 bg-[#040406]/70 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <span className="font-display font-black text-xl text-[#040406]">H</span>
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-white">Highkey</span>
              <span className="text-xs text-emerald-400 font-semibold ml-2 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Community</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button 
              onClick={() => setActiveTab('shortcuts')} 
              className={`transition-colors py-1.5 ${activeTab === 'shortcuts' ? 'text-white border-b-2 border-emerald-500' : 'hover:text-white'}`}
            >
              Shortcuts Hub
            </button>
            <button 
              onClick={() => setActiveTab('howitworks')} 
              className={`transition-colors py-1.5 ${activeTab === 'howitworks' ? 'text-white border-b-2 border-emerald-500' : 'hover:text-white'}`}
            >
              How It Works
            </button>
            <a href="https://github.com/ThangaBalajiS/highkey" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('howitworks')} 
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl transition-all duration-300"
            >
              Extension Instructions
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full z-10">
        
        {/* Banner Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-medium text-slate-300 mb-6 backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>V1.0.0 Stable Release Now Live</span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-none mb-6">
            Assign Shortcuts to <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Any Web Element
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-8">
            Highkey allows you to bind custom hotkeys to any button, form, or dynamic script on any webpage, without writing CSS selectors. Search shared shortcuts below to start binding.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => {
                setActiveTab('shortcuts');
                document.getElementById('shortcuts-search-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#040406] font-semibold text-sm transition-all duration-300 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] scale-100 hover:scale-[1.02]"
            >
              Browse Shortcuts
            </button>
            <button 
              onClick={() => setActiveTab('howitworks')}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-semibold text-sm transition-all duration-300"
            >
              Install Chrome Extension
            </button>
          </div>
        </div>

        {/* Tab 1: Shortcuts Hub */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-8 animate-fade-in duration-500">
            
            {/* Search Section */}
            <div id="shortcuts-search-section" className="bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by label or domain (e.g. youtube)..."
                    className="w-full bg-slate-950/80 border border-slate-850 hover:border-slate-700 focus:border-emerald-500/80 text-sm text-slate-200 placeholder-slate-500 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all duration-300"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center justify-start w-full md:w-auto">
                  <span className="text-xs font-semibold text-slate-400 mr-2 uppercase tracking-wider">Fast Filter:</span>
                  {POPULAR_DOMAINS.map((domain, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDomainFilter(domain.query)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                        selectedDomainFilter === domain.query
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-950/60 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {domain.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Split Screen Layout: Shortcuts + Visual Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Side: Shortcuts List (7 columns) */}
              <div className="lg:col-span-7 space-y-4 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-bold text-lg text-white">
                    {filteredShortcuts.length} Community Shortcut{filteredShortcuts.length === 1 ? '' : 's'} Found
                  </h3>
                  {selectedDomainFilter && (
                    <button 
                      onClick={() => setSelectedDomainFilter("")} 
                      className="text-xs font-medium text-emerald-400 hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-950/40 border border-slate-855 rounded-2xl">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="mt-4 text-sm text-slate-400">Loading shortcuts...</span>
                  </div>
                ) : filteredShortcuts.length === 0 ? (
                  <div className="text-center py-20 bg-slate-950/40 border border-slate-855 rounded-2xl">
                    <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-slate-300 font-semibold">No shortcuts match your search</h4>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">Try typing a different website domain or explore all shortcuts using the filter tags.</p>
                  </div>
                ) : (
                  filteredShortcuts.map((item) => {
                    const isSelected = selectedShortcut?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedShortcut(item)}
                        className={`group relative p-5 bg-slate-900/40 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all duration-300 ${
                          isSelected 
                            ? 'border-emerald-500/60 bg-slate-900/70 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                            : 'border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Domain Logo Badge */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isSelected ? 'bg-emerald-500 text-[#040406]' : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 transition-colors'
                          }`}>
                            {item.domain.charAt(0).toUpperCase()}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                {item.label}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-955 text-slate-400 border border-slate-800/80">
                                {item.domain}
                              </span>
                            </div>
                            
                            {/* Selector Detail */}
                            <p className="text-xs text-slate-500 font-mono mt-1.5 max-w-[280px] sm:max-w-md truncate" title={item.selector}>
                              Selector: {item.selector}
                            </p>
                          </div>
                        </div>

                        {/* Right Controls (Combo & Upvotes) */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t border-slate-800 sm:border-none pt-3 sm:pt-0">
                          {/* Key Combination */}
                          <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-mono font-bold text-emerald-400">
                            {getShortcutString(item.shortcut)}
                          </div>

                          {/* Action Group */}
                          <div className="flex items-center gap-2">
                            {/* Upvote Button */}
                            <button
                              onClick={(e) => handleUpvote(e, item.id)}
                              className="p-2 rounded-lg bg-slate-800/60 hover:bg-emerald-500/10 border border-slate-700/60 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition-all duration-300"
                              title="Upvote shortcut"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M4 14h6v8h4v-8h6L12 4 4 14z"/>
                              </svg>
                              <span className="text-xs font-semibold">{item.upvotes}</span>
                            </button>

                            {/* Download / View Button */}
                            <button
                              onClick={() => handleDownload(item)}
                              className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#040406] text-xs font-bold transition-all duration-300"
                            >
                              Get
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Side: Virtual Keyboard Preview & Stats (5 columns) */}
              <div className="lg:col-span-5 space-y-6">
                
                {selectedShortcut ? (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                        Selected Map
                      </span>
                      <h3 className="font-display font-extrabold text-2xl text-white mt-3 leading-snug">
                        {selectedShortcut.label}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Bound to target on <span className="font-semibold text-slate-200">{selectedShortcut.domain}</span>
                      </p>
                    </div>

                    {/* Virtual Keymap Visualizer */}
                    {renderVirtualKeyboard()}

                    {/* Info Table */}
                    <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-4.5 space-y-3.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Domain Scope:</span>
                        <span className="font-mono text-xs text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-805">
                          {selectedShortcut.scope === 'domain' ? 'Domain-wide (*)' : 'Path-specific'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">CSS Target Selector:</span>
                        <span className="font-mono text-xs text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-805 max-w-[200px] truncate" title={selectedShortcut.selector}>
                          {selectedShortcut.selector}
                        </span>
                      </div>
                      {selectedShortcut.innerText && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Target Button Text:</span>
                          <span className="text-xs text-slate-200 font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-805">
                            "{selectedShortcut.innerText}"
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Downloads:</span>
                        <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          {selectedShortcut.downloads}
                        </span>
                      </div>
                    </div>

                    {/* Download Button inside box */}
                    <button
                      onClick={() => handleDownload(selectedShortcut)}
                      className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#040406] font-bold text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Get Config to Import
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900/20 border border-slate-855 border-dashed rounded-2xl p-12 text-center text-slate-500">
                    <p>Click any shortcut in the list to visualize its key layout on the virtual keyboard.</p>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* Tab 2: How It Works */}
        {activeTab === 'howitworks' && (
          <div className="space-y-12 animate-fade-in duration-500 max-w-4xl mx-auto">
            
            <div className="text-center mb-6">
              <h2 className="font-display font-bold text-3xl text-white">Using Highkey Visual Binder</h2>
              <p className="text-slate-400 mt-2 text-sm">Follow these simple steps to load the extension and configure shortcuts.</p>
            </div>

            {/* Instruction Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1 */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative">
                <div className="absolute top-4 right-4 text-emerald-400 font-display font-extrabold text-3xl opacity-20">01</div>
                <h4 className="font-semibold text-lg text-white mb-2">Build or Dev the Extension</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Start the local extension compiler from your terminal root folder. This compiles TypeScript, gathers public assets, and writes the output bundle to the <code className="text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs">apps/extension/dist</code> folder.
                </p>
                <div className="mt-4 bg-slate-950 p-3 rounded-lg border border-slate-855 font-mono text-xs text-emerald-400">
                  npm run dev:extension
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative">
                <div className="absolute top-4 right-4 text-emerald-400 font-display font-extrabold text-3xl opacity-20">02</div>
                <h4 className="font-semibold text-lg text-white mb-2">Load Unpacked in Chrome</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Open Chrome and navigate to <code className="text-slate-200 bg-slate-955 px-1 py-0.5 rounded text-xs">chrome://extensions</code>. Toggle <strong>Developer mode</strong> ON in the top right. Click <strong>Load unpacked</strong> and select the compiled build folder:
                </p>
                <div className="mt-4 bg-slate-950 p-3 rounded-lg border border-slate-855 font-mono text-xs text-emerald-400 truncate">
                  .../highkey/apps/extension/dist
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative">
                <div className="absolute top-4 right-4 text-emerald-400 font-display font-extrabold text-3xl opacity-20">03</div>
                <h4 className="font-semibold text-lg text-white mb-2">Activate the Binder overlay</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Open any target webpage (like YouTube) and press the activation hotkey. This loads a visual highlight overlay on the page that follows your cursor:
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-955 border border-slate-850 text-xs font-mono font-bold text-slate-300">Command + Shift + K (Mac)</span>
                  <span className="px-2.5 py-1 rounded bg-slate-955 border border-slate-850 text-xs font-mono font-bold text-slate-300">Ctrl + Shift + K</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative">
                <div className="absolute top-4 right-4 text-emerald-400 font-display font-extrabold text-3xl opacity-20">04</div>
                <h4 className="font-semibold text-lg text-white mb-2">Select and Record Keys</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Click on any interactive element (e.g. a "Like" button). An overlay prompt will ask you to press the desired key combination. Highkey generates a resilient CSS path and records the hotkeys instantly.
                </p>
              </div>

            </div>

            {/* Importing Community Configuration section */}
            <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-8 shadow-lg">
              <h3 className="font-display font-bold text-xl text-white mb-4">How to Import Shared Community Configs</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                When you click "Get" on any community shortcut, you'll receive a structured JSON configuration. To load this into your active extension:
              </p>
              
              <ol className="space-y-4 text-sm text-slate-300 list-decimal pl-5">
                <li>Click the Highkey extension icon in your Chrome toolbar.</li>
                <li>Select the <strong>Settings / Open Dashboard</strong> option. This opens the control panel.</li>
                <li>Click the <strong>Import...</strong> button located on the top dashboard action bar.</li>
                <li>Paste the copied JSON configuration block and press Save. The shortcut is activated instantly!</li>
              </ol>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#040406] py-12 mt-12 relative z-10 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Highkey. All rights reserved. Created for keyboard speedruns.</p>
      </footer>

      {/* Download Detail Modal */}
      {modalOpen && modalShortcut && (
        <div className="fixed inset-0 bg-[#000]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 relative shadow-2xl animate-scale-up">
            
            {/* Close Button */}
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="font-display font-bold text-xl text-white mb-2">Import: {modalShortcut.label}</h3>
            <p className="text-xs text-slate-400">Website Domain: <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">{modalShortcut.domain}</code></p>
            
            {/* Steps detail */}
            <div className="mt-4 space-y-3 text-sm text-slate-300 bg-slate-950/60 p-4 border border-slate-855 rounded-xl">
              <p className="font-semibold text-emerald-400 text-xs uppercase tracking-wider">Instructions</p>
              <ol className="list-decimal pl-4.5 space-y-1.5 text-xs text-slate-400">
                <li>Copy the JSON configuration block below.</li>
                <li>Open your Highkey extension Dashboard page.</li>
                <li>Click the <strong>Import...</strong> button on the dashboard.</li>
                <li>Paste the code, save, and enjoy your new keyboard shortcut!</li>
              </ol>
            </div>

            {/* Code Copy Box */}
            <div className="mt-4 relative">
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-855 text-xs text-emerald-400 font-mono overflow-x-auto max-h-[180px] custom-scrollbar">
                {JSON.stringify({
                  [modalShortcut.domain]: [{
                    shortcut: modalShortcut.shortcut,
                    selector: modalShortcut.selector,
                    innerText: modalShortcut.innerText || "",
                    label: modalShortcut.label,
                    scope: modalShortcut.scope,
                    path: modalShortcut.path || null,
                    id: modalShortcut.id,
                    createdAt: Date.now()
                  }]
                }, null, 2)}
              </pre>

              <button
                onClick={() => copyImportJson(modalShortcut)}
                className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all duration-300 ${
                  copiedId === modalShortcut.id
                    ? 'bg-emerald-500 text-[#040406]'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                {copiedId === modalShortcut.id ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
