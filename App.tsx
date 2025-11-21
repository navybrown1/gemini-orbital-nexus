import React, { useState, useEffect } from 'react';
import { ConnectionState, Planet, ScanResult } from './types';
import OrbitalCanvas from './components/OrbitalCanvas';
import Visualizer from './components/Visualizer';
import { liveService } from './services/liveService';
import { generatePlanetVisual } from './services/geminiService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [activePlanet, setActivePlanet] = useState<Planet | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [scanResult, setScanResult] = useState<ScanResult>({ imageUrl: null, loading: false });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial Key Check
  useEffect(() => {
     const checkKey = async () => {
        if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
           setHasApiKey(true);
        }
     };
     checkKey();
  }, []);

  const handleSelectKey = async () => {
     try {
        await (window as any).aistudio.openSelectKey();
        // Check immediately after selection logic
        if (await (window as any).aistudio.hasSelectedApiKey()) {
            setHasApiKey(true);
            setErrorMsg(null);
        }
     } catch (e) {
        console.error(e);
        setErrorMsg("Failed to select API Key. Please try again.");
     }
  }

  // Handle connection
  const toggleConnection = async () => {
    if (connectionState === ConnectionState.CONNECTED) {
      liveService.disconnect();
      setConnectionState(ConnectionState.DISCONNECTED);
    } else {
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      
      await liveService.connect(
        (status, err) => {
          if (status === 'connected') {
              setConnectionState(ConnectionState.CONNECTED);
          }
          else if (status === 'disconnected') {
              setConnectionState(ConnectionState.DISCONNECTED);
          }
          else if (status === 'error') {
             setConnectionState(ConnectionState.ERROR);
             console.error("Live API Error:", err);
             handleApiError(err);
          }
        },
        (vol) => setAudioVolume(vol)
      );
    }
  };

  // Centralized Error Handler for API 403/Permissions
  const handleApiError = (e: any) => {
      const msg = e.message || JSON.stringify(e);
      if (msg.includes('Permission') || msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
          setHasApiKey(false); 
          setErrorMsg("ACCESS DENIED: The selected API Key does not have permission. Please select a key from a PAID Google Cloud Project (Billing Enabled).");
          liveService.disconnect();
      } else {
          setErrorMsg(`System Error: ${msg.substring(0, 100)}...`);
      }
  };

  // Handle Planet Selection from Canvas
  const handlePlanetSelect = (planet: Planet) => {
    setActivePlanet(planet);
    setScanResult({ imageUrl: null, loading: false }); // Reset scan on new selection
    
    // Notify AI
    if (connectionState === ConnectionState.CONNECTED) {
      liveService.sendMessage(`User selected ${planet.name}. Provide a short 1-sentence briefing.`);
    }
  };

  // Handle Scan Action
  const handleScan = async () => {
    if (!activePlanet) return;
    
    setScanResult({ imageUrl: null, loading: true });
    setErrorMsg(null);
    
    // Notify AI
    if (connectionState === ConnectionState.CONNECTED) {
       liveService.sendMessage(`Initiating deep visual scan of ${activePlanet.name}. Describe the surface details vividly while the image processes.`);
    }

    try {
      const url = await generatePlanetVisual(`${activePlanet.name} planet surface, ${activePlanet.description}, ${activePlanet.type}, ${activePlanet.atmosphere}`);
      setScanResult({ imageUrl: url, loading: false });
    } catch (e: any) {
      console.error("Scan failed", e);
      setScanResult({ imageUrl: null, loading: false });
      handleApiError(e);
    }
  };

  // Landing Screen
  if (!hasApiKey) {
      return (
          <div className="w-screen h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
             {/* Background stars static for landing */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black pointer-events-none"></div>
             <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
             
             <div className="relative z-10 max-w-2xl glass-panel p-12 rounded-2xl border border-cyan-500/30 box-shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                 <div className="mb-6 flex justify-center">
                    <i className="fas fa-solar-system text-6xl text-cyan-400 animate-pulse"></i>
                 </div>
                 <h1 className="text-5xl md:text-6xl font-display font-bold mb-2 text-white tracking-tighter">
                    GEMINI ORBITAL NEXUS
                 </h1>
                 <p className="text-cyan-400 font-mono text-sm mb-8 tracking-[0.3em]">ADVANCED SOLAR EXPLORATION TERMINAL</p>
                 
                 <p className="text-slate-300 font-mono mb-8 leading-relaxed">
                    Identity verification required. Access to the Nexus requires a valid Neural Link (API Key).
                    <br/><br/>
                    <span className="text-amber-400"><i className="fas fa-exclamation-triangle"></i> NOTICE:</span> High-Fidelity Image Generation requires a <strong>PAID</strong> project key (Nano Banana Pro model).
                 </p>
                 
                 {errorMsg && (
                     <div className="mb-8 p-4 bg-red-500/10 border border-red-500 text-red-300 rounded font-mono text-xs flex items-center gap-3 text-left">
                         <i className="fas fa-ban text-xl"></i>
                         <div>{errorMsg}</div>
                     </div>
                 )}

                 <button 
                    onClick={handleSelectKey}
                    className="group relative w-full py-4 bg-cyan-600 hover:bg-cyan-500 transition-all rounded overflow-hidden shadow-[0_0_20px_rgba(8,145,178,0.5)] hover:shadow-[0_0_40px_rgba(8,145,178,0.7)]"
                 >
                    <span className="relative z-10 font-display font-bold text-white text-xl tracking-widest">
                        AUTHENTICATE LINK
                    </span>
                 </button>
                 
                 <div className="mt-6 text-xs text-slate-600 font-mono">
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline transition-colors">
                        View Billing Documentation
                    </a>
                 </div>
             </div>
          </div>
      )
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden text-slate-100 selection:bg-cyan-500 selection:text-white bg-[#020617]">
      
      {/* 3D/Canvas Layer */}
      <OrbitalCanvas 
        onPlanetSelect={handlePlanetSelect} 
        activePlanetId={activePlanet?.id || null} 
      />

      {/* Top Header / Connection Status */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-20">
        <div className="pointer-events-auto">
          <h1 className="text-3xl font-display font-bold tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            ORBITAL NEXUS
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-cyan-400 font-mono">SYSTEM ONLINE // v2.4.0</p>
          </div>
          {errorMsg && (
             <div className="mt-2 p-2 bg-red-900/80 border border-red-500 text-white text-xs font-mono max-w-md rounded">
                ERROR: {errorMsg}
             </div>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-4">
           {/* Connection Panel */}
           <div className="glass-panel p-4 rounded-xl flex flex-col items-center gap-3 w-64 border-t border-cyan-500/30 shadow-xl">
              <div className="flex items-center justify-between w-full mb-2">
                 <span className="text-xs font-mono text-cyan-200 tracking-widest">AI COMMANDER</span>
                 <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${connectionState === ConnectionState.CONNECTED ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : connectionState === ConnectionState.ERROR ? 'bg-red-500' : 'bg-slate-600'}`}></div>
              </div>
              
              <Visualizer isActive={connectionState === ConnectionState.CONNECTED} volume={audioVolume} />
              
              <button 
                onClick={toggleConnection}
                disabled={connectionState === ConnectionState.CONNECTING}
                className={`w-full py-2 px-4 rounded font-display text-xs font-bold tracking-widest transition-all duration-300 border shadow-lg ${
                  connectionState === ConnectionState.CONNECTED 
                  ? 'bg-red-950/50 hover:bg-red-900/80 text-red-400 border-red-500/50' 
                  : 'bg-cyan-950/50 hover:bg-cyan-900/80 text-cyan-400 border-cyan-500/50'
                }`}
              >
                {connectionState === ConnectionState.CONNECTING ? 'ESTABLISHING UPLINK...' : 
                 connectionState === ConnectionState.CONNECTED ? 'TERMINATE UPLINK' : 'INITIALIZE UPLINK'}
              </button>
           </div>
        </div>
      </div>

      {/* Bottom HUD / Info Panel */}
      <div className="absolute bottom-0 left-0 w-full p-6 pointer-events-none flex justify-center items-end z-20">
        {activePlanet ? (
          <div className="glass-panel p-6 rounded-t-2xl rounded-b-lg w-full max-w-5xl flex flex-col md:flex-row gap-8 pointer-events-auto animate-[slideUp_0.4s_cubic-bezier(0.2,0.8,0.2,1)] border-t border-cyan-500/30 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
            
            {/* Left: Data */}
            <div className="flex-1 space-y-4">
              <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                <h2 className="text-5xl font-display font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{activePlanet.name.toUpperCase()}</h2>
                <span className="font-mono text-cyan-300 text-sm border border-cyan-500/30 px-3 py-1 rounded bg-cyan-950/30">{activePlanet.type.toUpperCase()}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 font-mono text-xs text-slate-300">
                <div className="bg-slate-950/50 p-3 rounded border border-white/5 hover:border-cyan-500/30 transition-colors">
                   <span className="block text-slate-500 mb-1 text-[10px] tracking-wider">AVG. DISTANCE</span>
                   <span className="text-cyan-100">{activePlanet.distance} MKm</span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded border border-white/5 hover:border-cyan-500/30 transition-colors">
                   <span className="block text-slate-500 mb-1 text-[10px] tracking-wider">RADIUS</span>
                   <span className="text-cyan-100">{activePlanet.radius * 1000} Km</span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded border border-white/5 hover:border-cyan-500/30 transition-colors">
                   <span className="block text-slate-500 mb-1 text-[10px] tracking-wider">ATMOSPHERE</span>
                   <span className="text-cyan-100">{activePlanet.atmosphere}</span>
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed text-sm font-light tracking-wide border-l-2 border-cyan-500/50 pl-4">
                {activePlanet.description}
              </p>

              <div className="pt-4 flex gap-4">
                 <button 
                  onClick={handleScan}
                  disabled={scanResult.loading}
                  className={`group relative flex-1 px-6 py-4 border rounded transition-all overflow-hidden flex items-center justify-center gap-3 ${
                      scanResult.loading 
                      ? 'bg-cyan-950/50 border-cyan-500/30 text-cyan-400 cursor-wait' 
                      : 'bg-cyan-600 hover:bg-cyan-500 border-transparent text-white shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)]'
                  }`}
                 >
                   <span className={`relative z-10 font-display font-bold text-sm tracking-wider flex items-center gap-2`}>
                     {scanResult.loading ? (
                        <>
                           <i className="fas fa-circle-notch fa-spin"></i> PROCESSING TELEMETRY...
                        </>
                     ) : (
                        <>
                           <i className="fas fa-satellite-dish"></i> INITIATE DEEP SCAN
                        </>
                     )}
                   </span>
                 </button>
              </div>
            </div>

            {/* Right: Visual Feedback */}
            <div className="w-full md:w-96 aspect-video bg-black rounded-lg border border-cyan-900/50 overflow-hidden relative group shadow-2xl shadow-black/80">
                {scanResult.loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
                        <div className="w-full h-full absolute opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                        <div className="w-64 h-1 bg-cyan-900/50 rounded-full overflow-hidden relative">
                             <div className="absolute top-0 left-0 h-full bg-cyan-400 w-1/2 animate-[loading_1s_ease-in-out_infinite]"></div>
                        </div>
                        <span className="text-cyan-400 font-mono text-xs animate-pulse mt-4 tracking-[0.3em]">GENERATING ASSET</span>
                        <span className="text-cyan-700 font-mono text-[10px] mt-1">MODEL: GEMINI-3-PRO-IMAGE</span>
                    </div>
                )}
                
                {scanResult.imageUrl ? (
                    <div className="relative w-full h-full">
                        <img src={scanResult.imageUrl} alt="Scan Result" className="w-full h-full object-cover animate-[fadeIn_1.5s_ease-out_forwards]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-full p-3 flex justify-between items-end">
                             <span className="text-[10px] font-mono text-cyan-300 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10">SOURCE: GEMINI 3 PRO</span>
                             <a href={scanResult.imageUrl} download="planet_scan.png" className="text-white hover:text-cyan-400 transition-colors"><i className="fas fa-download"></i></a>
                        </div>
                    </div>
                ) : (
                   !scanResult.loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 bg-black/40">
                        <div className="w-full h-full absolute opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                        <i className="fas fa-globe text-5xl mb-4 opacity-30"></i>
                        <span className="font-mono text-[10px] tracking-widest opacity-50">NO VISUAL DATA</span>
                    </div>
                   )
                )}

                {/* HUD Overlay Lines */}
                <div className="absolute inset-0 border border-cyan-500/20 pointer-events-none z-10">
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>
                    
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-cyan-500/30 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
                    </div>
                </div>
            </div>

          </div>
        ) : (
            <div className="glass-panel px-10 py-6 rounded-full animate-[bounce_3s_infinite] mb-12 border border-cyan-500/20 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <span className="font-mono text-cyan-300 text-xs tracking-[0.3em] flex items-center gap-3">
                   <i className="fas fa-arrow-up animate-bounce"></i> SELECT TARGET FROM ORBITAL MAP
                </span>
            </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
            0% { width: 0%; left: 0; }
            50% { width: 50%; left: 25%; }
            100% { width: 100%; left: 100%; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(1.1); filter: blur(10px) brightness(0); }
            to { opacity: 1; transform: scale(1); filter: blur(0) brightness(1); }
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
};

export default App;