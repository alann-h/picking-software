import React, { useState, useEffect } from 'react';

const ScannerDebug = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const addLog = (msg: string) => {
      setLogs(prev => [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev].slice(0, 20));
    };

    const handleEvent = (e: KeyboardEvent) => {
      addLog(`${e.type}: key=${e.key} code=${e.code} which=${e.which} charCode=${e.charCode}`);
    };
    
    const handlePaste = (e: ClipboardEvent) => {
       const data = e.clipboardData?.getData('text') || '';
       addLog(`paste: ${data.slice(0, 10)}...`);
    };

    const handleInput = (e: Event) => {
       // @ts-ignore
       addLog(`input: data=${e.data} inputType=${e.inputType}`);
    };

    window.addEventListener('keydown', handleEvent);
    window.addEventListener('keypress', handleEvent);
    window.addEventListener('keyup', handleEvent);
    window.addEventListener('paste', handlePaste);
    // input events usually need an input target, but let's see
    window.addEventListener('input', handleInput);

    return () => {
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('keypress', handleEvent);
      window.removeEventListener('keyup', handleEvent);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('input', handleInput);
    };
  }, []);

  if (!isVisible) {
    return (
      <div 
        style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 9999 }}
      >
        <button 
           onClick={() => setIsVisible(true)}
           className="bg-red-500 text-white p-2 rounded shadow-lg text-xs opacity-50 hover:opacity-100"
        >
           Debug Scanner
        </button>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 10, 
        left: 10, 
        width: '300px', 
        height: '300px', 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        color: '#0f0',
        zIndex: 9999,
        overflow: 'auto',
        padding: '10px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <strong>Scanner Debug</strong>
        <button onClick={() => setLogs([])} style={{ color: 'white', marginRight: '10px' }}>Clear</button>
        <button onClick={() => setIsVisible(false)} style={{ color: 'white' }}>Hide</button>
      </div>
      <div>
        {logs.map((log, i) => (
          <div key={i} style={{ borderBottom: '1px solid #333' }}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default ScannerDebug;

