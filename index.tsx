import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// --- ICONS ---
const ShieldCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="m9 12 2 2 4-4"></path>
  </svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// --- TYPES ---
type Tab = {
  id: string;
  title: string;
  url: string;
  secure: boolean;
  trackersBlocked: number;
  jurisdiction: string;
  loading: boolean;
};

// --- APP COMPONENT ---
const App = () => {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Start Page', url: 'aegis://start', secure: true, trackersBlocked: 0, jurisdiction: 'Local', loading: false }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [isPanic, setIsPanic] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    addLog("System initialized. Ramdisk mounted.");
    addLog("Telemetry: DISABLED");
    addLog("User-Agent: SPOOFED (Windows 10 / Chrome 120)");
    addLog("Gecko Engine: HARDENED");
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTabs = tabs.map(t =>
      t.id === activeTabId ? { ...t, url: e.target.value } : t
    );
    setTabs(newTabs);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    addLog(`Navigating to: ${activeTab.url}`);

    // Simulate loading
    const updatedTabs = tabs.map(t =>
      t.id === activeTabId ? { ...t, loading: true, title: 'Loading...' } : t
    );
    setTabs(updatedTabs);

    setTimeout(() => {
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          return {
            ...t,
            loading: false,
            title: t.url.replace(/^https?:\/\//, '').split('/')[0] || 'New Tab',
            trackersBlocked: Math.floor(Math.random() * 15) + 2,
            jurisdiction: Math.random() > 0.5 ? 'US (14-Eyes)' : 'CH (Safe)',
            secure: true
          };
        }
        return t;
      }));
      addLog(`Loaded ${activeTab.url}. Trackers blocked: ${Math.floor(Math.random() * 15) + 2}`);
    }, 1000);
  };

  const newTab = () => {
    const id = Date.now().toString();
    setTabs([...tabs, { id, title: 'New Tab', url: '', secure: true, trackersBlocked: 0, jurisdiction: 'None', loading: false }]);
    setActiveTabId(id);
    addLog("New micro-VM tab created.");
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const remaining = tabs.filter(t => t.id !== id);
    if (remaining.length === 0) newTab();
    else {
      setTabs(remaining);
      if (activeTabId === id) setActiveTabId(remaining[remaining.length - 1].id);
    }
    addLog(`Tab ${id} destroyed. Memory wiped.`);
  };

  const panic = () => {
    setIsPanic(true);
    // Simulate wipe
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (isPanic) {
    return (
      <div className="panic-overlay">
        <div>CORE DUMP INITIATED</div>
        <div style={{fontSize: '1rem', marginTop: '20px'}}>Wiping Memory... 100%</div>
        <div style={{fontSize: '1rem'}}>Shredding Ramdisk... 100%</div>
        <div style={{fontSize: '1rem', color: '#00ff41', marginTop: '20px'}}>SYSTEM SECURE.</div>
      </div>
    );
  }

  return (
    <div className="browser-window">
      {/* Title Bar */}
      <div className="title-bar">
        <ShieldCheckIcon />
        <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '0.9rem' }}>Project Aegis</span>
        <div className="tab-bar">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <GlobeIcon />
              <span style={{marginLeft: '6px'}}>{tab.title}</span>
              <span className="tab-close" onClick={(e) => closeTab(e, tab.id)}><XIcon /></span>
            </div>
          ))}
          <button className="toolbar-btn" onClick={newTab}><PlusIcon /></button>
        </div>
      </div>

      {/* Nav Bar */}
      <form className="nav-bar" onSubmit={handleNavigate}>
        <button className="toolbar-btn" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
        <button className="toolbar-btn" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        <button className="toolbar-btn" type="button" onClick={() => window.location.reload()}><RefreshIcon /></button>

        <div className="url-bar-container">
          <div className="shield-icon"><LockIcon /></div>
          <input
            type="text"
            className="url-input"
            value={activeTab.url}
            onChange={handleUrlChange}
            placeholder="Enter Onion Address or URL"
          />
          {activeTab.url && (
             <>
               <span className={`reputation-badge ${activeTab.jurisdiction.includes('Safe') ? 'rep-safe' : 'rep-danger'}`}>
                 {activeTab.jurisdiction}
               </span>
               <span className="reputation-badge rep-safe">
                 {activeTab.trackersBlocked} Trackers Blocked
               </span>
             </>
          )}
        </div>

        <button type="button" className="toolbar-btn panic-btn" onClick={panic}>PANIC</button>
      </form>

      {/* Content Area */}
      <div className="content-area">
        {activeTab.url === 'aegis://start' ? (
           <div className="web-view-placeholder">
              <ShieldCheckIcon />
              <h1 style={{marginTop: '20px'}}>PROJECT AEGIS</h1>
              <p style={{marginTop: '10px', color: '#666'}}>Zero-Leak Architecture Active</p>
              <div style={{marginTop: '40px', border: '1px solid #ddd', padding: '20px', borderRadius: '4px', textAlign: 'left', maxWidth: '600px'}}>
                <h3>System Status</h3>
                <ul style={{marginTop: '10px', lineHeight: '1.6'}}>
                  <li>✓ <strong>Engine:</strong> Hardened Gecko Fork (Mock)</li>
                  <li>✓ <strong>Memory:</strong> Rust Safety Layer Active</li>
                  <li>✓ <strong>Network:</strong> Tor Circuit Ready</li>
                  <li>✓ <strong>Storage:</strong> Ramdisk Only (4GB Reserved)</li>
                </ul>
              </div>
           </div>
        ) : (
           <div className="web-view-placeholder">
             {activeTab.loading ? (
               <div>Establishing Secure Circuit...</div>
             ) : (
               <>
                 <h2>{activeTab.title}</h2>
                 <p>{activeTab.url}</p>
                 <div style={{marginTop: '20px', padding: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px'}}>
                   [Sandboxed Web Content Rendered Here]
                 </div>
               </>
             )}
           </div>
        )}

        {/* Debug / Log Overlay */}
        <div className="debug-overlay">
          <div style={{marginBottom: '5px', fontWeight: 'bold'}}>KERNEL LOG:</div>
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="ramdisk-indicator">
          <div className="ram-dot"></div>
          <span>Ramdisk Operation Active</span>
        </div>
        <div>
          <span style={{marginRight: '15px'}}>Tor Circuit: 3 Nodes</span>
          <span>Profile: High Privacy</span>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
