import React, { useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useTwinStore } from './hooks/useTwinStore';
import BuildingScene from './components/BuildingScene';
import AssetTree from './components/AssetTree';
import ControlPanel from './components/ControlPanel';
import KPIPanel from './components/KPIPanel';
import AlertPanel from './components/AlertPanel';
import CopilotChat from './components/CopilotChat';
import './App.css';

function App() {
  const { twinState, selectedAsset, loadTwinState, selectAsset, isConnected } = useTwinStore();
  const [activePanel, setActivePanel] = useState('controls');

  useEffect(() => {
    loadTwinState();
  }, [loadTwinState]);

  if (!twinState) {
    return (
      <div className="loading">
        <h2>Loading Digital Twin...</h2>
        <p>Connecting to backend server...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>🏢 HVAC Digital Twin</h1>
        <div className="header-info">
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </span>
          <span className="sim-time">
            Simulation: {new Date(twinState.metadata.simulationTime).toLocaleTimeString()}
          </span>
        </div>
      </header>

      <div className="main-content">
        {/* Left Panel - Asset Tree */}
        <aside className="left-panel">
          <h3>Building Assets</h3>
          <AssetTree
            assets={twinState.assets}
            relationships={twinState.relationships}
            selectedAsset={selectedAsset}
            onSelectAsset={selectAsset}
            telemetry={twinState.telemetry}
            alerts={twinState.alerts}
          />
        </aside>

        {/* Center - 3D Viewer */}
        <main className="viewer">
          <Canvas shadows>
            {/* Camera positioned to show building AND car park in front */}
            <PerspectiveCamera makeDefault position={[80, 60, -70]} fov={55} />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={30}
              maxDistance={300}
              target={[20, 5, -10]}
            />
            <ambientLight intensity={0.4} />
            <directionalLight position={[50, 50, 25]} intensity={0.8} castShadow />
            <BuildingScene
              assets={twinState.assets}
              telemetry={twinState.telemetry}
              alerts={twinState.alerts}
              selectedAsset={selectedAsset}
              onSelectAsset={selectAsset}
            />
          </Canvas>
        </main>

        {/* Right Panel - Controls, KPIs, Alerts, Copilot */}
        <aside className="right-panel">
          <div className="panel-tabs">
            <button
              className={activePanel === 'controls' ? 'active' : ''}
              onClick={() => setActivePanel('controls')}
            >
              Controls
            </button>
            <button
              className={activePanel === 'kpis' ? 'active' : ''}
              onClick={() => setActivePanel('kpis')}
            >
              KPIs
            </button>
            <button
              className={activePanel === 'alerts' ? 'active' : ''}
              onClick={() => setActivePanel('alerts')}
            >
              Alerts ({twinState.alerts.filter(a => !a.resolved).length})
            </button>
            <button
              className={activePanel === 'copilot' ? 'active' : ''}
              onClick={() => setActivePanel('copilot')}
            >
              🤖 Copilot
            </button>
          </div>

          <div className="panel-content">
            {activePanel === 'controls' && (
              <ControlPanel
                controls={twinState.controls}
                selectedAsset={selectedAsset}
                assets={twinState.assets}
              />
            )}
            {activePanel === 'kpis' && (
              <KPIPanel kpis={twinState.kpis} />
            )}
            {activePanel === 'alerts' && (
              <AlertPanel
                alerts={twinState.alerts}
                assets={twinState.assets}
              />
            )}
            {activePanel === 'copilot' && (
              <CopilotChat />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
