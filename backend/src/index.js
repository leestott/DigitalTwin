/**
 * HVAC Digital Twin Backend Server
 * 
 * Provides REST API and WebSocket for:
 * - Twin state management
 * - Simulation stepping
 * - Foundry Local SLM integration
 */

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const { HVACSimulator, FAULT_CATALOG } = require('./simulator/hvac-simulator');
const { handleCopilotChat } = require('./services/copilot-service');

const app = express();
const PORT = process.env.PORT || 3001;
const FOUNDRY_LOCAL_URL = process.env.FOUNDRY_LOCAL_URL || 'http://localhost:5272';

// Paths to twin JSON files
const TWIN_DIR = path.join(__dirname, '../../twin');
const STATE_FILE = path.join(TWIN_DIR, 'twin.state.json');
const BASELINE_FILE = path.join(TWIN_DIR, 'twin.baseline.json');

// Middleware
app.use(cors());
app.use(express.json());

// In-memory state (loaded from file on startup)
let twinState = null;
let simulator = null;
let simulationInterval = null;

/**
 * Load twin state from file
 */
function loadTwinState() {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf8');
    twinState = JSON.parse(data);
    simulator = new HVACSimulator(twinState);
    console.log('Twin state loaded successfully');
    return true;
  } catch (err) {
    console.error('Error loading twin state:', err.message);
    return false;
  }
}

/**
 * Save twin state to file
 */
function saveTwinState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(twinState, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving twin state:', err.message);
    return false;
  }
}

/**
 * Broadcast state update to all WebSocket clients
 */
function broadcastState(wss, update) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(update));
    }
  });
}

// ============ REST API Routes ============

// GET /api/twin - Get current twin state
app.get('/api/twin', (req, res) => {
  if (!twinState) {
    return res.status(500).json({ error: 'Twin state not loaded' });
  }
  res.json(twinState);
});

// GET /api/twin/assets - Get all assets
app.get('/api/twin/assets', (req, res) => {
  res.json(twinState?.assets || []);
});

// GET /api/twin/assets/:id - Get specific asset
app.get('/api/twin/assets/:id', (req, res) => {
  const asset = twinState?.assets?.find(a => a.id === req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json(asset);
});

// GET /api/twin/telemetry - Get all telemetry
app.get('/api/twin/telemetry', (req, res) => {
  const { assetId, pointType } = req.query;
  let telemetry = twinState?.telemetry || [];
  
  if (assetId) {
    telemetry = telemetry.filter(t => t.assetId === assetId);
  }
  if (pointType) {
    telemetry = telemetry.filter(t => t.pointType === pointType);
  }
  
  res.json(telemetry);
});

// GET /api/twin/controls - Get all controls
app.get('/api/twin/controls', (req, res) => {
  const { assetId } = req.query;
  let controls = twinState?.controls || [];
  
  if (assetId) {
    controls = controls.filter(c => c.assetId === assetId);
  }
  
  res.json(controls);
});

// PUT /api/twin/controls/:id - Update a control value
app.put('/api/twin/controls/:id', (req, res) => {
  const control = twinState?.controls?.find(c => c.id === req.params.id);
  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }
  
  const { value } = req.body;
  if (value === undefined) {
    return res.status(400).json({ error: 'Value is required' });
  }
  
  // Validate against min/max
  if (typeof value === 'number') {
    if (control.min !== undefined && value < control.min) {
      return res.status(400).json({ error: `Value must be >= ${control.min}` });
    }
    if (control.max !== undefined && value > control.max) {
      return res.status(400).json({ error: `Value must be <= ${control.max}` });
    }
  }
  
  // Apply change through simulator
  const result = simulator.step(60, { [control.id]: value });
  twinState = result.state;
  saveTwinState();
  
  res.json({
    control: twinState.controls.find(c => c.id === req.params.id),
    simulationLog: result.log,
    newAlerts: result.newAlerts
  });
});

// GET /api/twin/kpis - Get all KPIs
app.get('/api/twin/kpis', (req, res) => {
  res.json(twinState?.kpis || []);
});

// GET /api/twin/alerts - Get alerts
app.get('/api/twin/alerts', (req, res) => {
  const { active } = req.query;
  let alerts = twinState?.alerts || [];
  
  if (active === 'true') {
    alerts = alerts.filter(a => !a.resolved);
  }
  
  res.json(alerts);
});

// PUT /api/twin/alerts/:id/acknowledge - Acknowledge an alert
app.put('/api/twin/alerts/:id/acknowledge', (req, res) => {
  const alert = twinState?.alerts?.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = req.body.user || 'operator';
  
  saveTwinState();
  res.json(alert);
});

// POST /api/twin/simulate - Run simulation step
app.post('/api/twin/simulate', (req, res) => {
  const { timeStep = 60, controlChanges = {} } = req.body;
  
  const result = simulator.step(timeStep, controlChanges);
  twinState = result.state;
  saveTwinState();
  
  res.json({
    success: true,
    simulationTime: twinState.metadata.simulationTime,
    log: result.log,
    newAlerts: result.newAlerts,
    kpis: twinState.kpis
  });
});

// POST /api/twin/fault - Apply a fault scenario
app.post('/api/twin/fault', (req, res) => {
  const { faultType, params = {} } = req.body;
  
  if (!faultType) {
    return res.status(400).json({ error: 'faultType is required' });
  }
  
  twinState = simulator.applyFault(faultType, params);
  
  // Run simulation step to see effects
  const result = simulator.step(60);
  twinState = result.state;
  saveTwinState();
  
  res.json({
    success: true,
    faultType,
    params,
    simulationLog: result.log,
    newAlerts: result.newAlerts
  });
});

// GET /api/twin/faults/catalog - Get available fault scenarios
app.get('/api/twin/faults/catalog', (req, res) => {
  res.json(HVACSimulator.getFaultCatalog());
});

// GET /api/twin/faults/active - Get currently active faults
app.get('/api/twin/faults/active', (req, res) => {
  res.json(simulator.getActiveFaults());
});

// DELETE /api/twin/faults/:faultId - Clear a specific fault
app.delete('/api/twin/faults/:faultId', (req, res) => {
  const { faultId } = req.params;
  twinState = simulator.clearFault(faultId);
  saveTwinState();
  res.json({ success: true, message: `Fault ${faultId} cleared` });
});

// POST /api/twin/reset - Reset to baseline state
app.post('/api/twin/reset', (req, res) => {
  try {
    const baseline = fs.readFileSync(BASELINE_FILE, 'utf8');
    twinState = JSON.parse(baseline);
    twinState.metadata.lastUpdated = new Date().toISOString();
    twinState.metadata.simulationTime = new Date().toISOString();
    
    simulator = new HVACSimulator(twinState);
    saveTwinState();
    
    res.json({ success: true, message: 'Twin state reset to baseline' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset: ' + err.message });
  }
});

// GET /api/twin/explain/:id - Get explanation for KPI or alert
app.get('/api/twin/explain/:id', (req, res) => {
  const explanation = simulator.getExplanation(req.params.id);
  if (!explanation) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(explanation);
});

// ============ Foundry Local (SLM) Integration ============

// POST /api/copilot/chat - Chat with HVAC Copilot (Enhanced)
app.post('/api/copilot/chat', async (req, res) => {
  const { message, conversationHistory = [] } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    const result = await handleCopilotChat(message, conversationHistory, twinState, simulator);
    
    // If action was executed and changed state, update and save
    if (result.actionExecuted && result.actionChanges) {
      twinState = result.actionChanges.state;
      saveTwinState();
      
      // Broadcast update to WebSocket clients
      broadcastState(wss, {
        type: 'update',
        data: {
          state: twinState,
          log: result.actionChanges.log,
          newAlerts: result.actionChanges.newAlerts
        }
      });
    }
    
    res.json({
      response: result.response,
      actionExecuted: result.actionExecuted,
      intents: result.intents,
      groundedIn: result.groundedIn
    });
  } catch (err) {
    console.error('Copilot error:', err.message);
    res.status(500).json({ 
      error: 'Copilot processing failed', 
      response: 'I encountered an error processing your request. Please try again.' 
    });
  }
});

// POST /api/copilot/action - Execute a specific action
app.post('/api/copilot/action', async (req, res) => {
  const { action, params = {} } = req.body;
  
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }
  
  try {
    let result;
    
    switch (action) {
      case 'SET_SETPOINT':
        const control = twinState.controls.find(c => c.id === params.controlId);
        if (!control) {
          return res.status(404).json({ error: 'Control not found' });
        }
        result = simulator.step(60, { [params.controlId]: params.value });
        twinState = result.state;
        break;
        
      case 'RUN_SIMULATION':
        result = simulator.step(params.timeStep || 60);
        twinState = result.state;
        break;
        
      case 'INJECT_FAULT':
        twinState = simulator.applyFault(params.faultType, params.faultParams || {});
        result = simulator.step(60);
        twinState = result.state;
        break;
        
      case 'ACKNOWLEDGE_ALERT':
        const alert = twinState.alerts.find(a => a.id === params.alertId);
        if (alert) {
          alert.acknowledged = true;
          alert.acknowledgedAt = new Date().toISOString();
        }
        result = { state: twinState };
        break;
        
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    
    saveTwinState();
    
    // Broadcast update
    broadcastState(wss, {
      type: 'update',
      data: {
        state: twinState,
        log: result?.log,
        newAlerts: result?.newAlerts
      }
    });
    
    res.json({
      success: true,
      action,
      result: {
        newAlerts: result?.newAlerts || [],
        log: result?.log || []
      }
    });
  } catch (err) {
    console.error('Action error:', err.message);
    res.status(500).json({ error: 'Action failed: ' + err.message });
  }
});

// GET /api/copilot/suggestions - Get context-aware quick actions
app.get('/api/copilot/suggestions', (req, res) => {
  const suggestions = [];
  
  // Check for active alerts
  const activeAlerts = twinState.alerts.filter(a => !a.resolved);
  if (activeAlerts.length > 0) {
    suggestions.push({
      id: 'review_alerts',
      label: `Review ${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}`,
      prompt: 'Show me the active alerts and recommended actions',
      priority: 'high'
    });
  }
  
  // Check energy usage
  const power = twinState.kpis.find(k => k.id === 'kpi-total-power');
  if (power && power.value > power.target * 0.9) {
    suggestions.push({
      id: 'energy_high',
      label: 'Energy usage is high',
      prompt: 'How can I reduce energy consumption right now?',
      priority: 'medium'
    });
  }
  
  // Check CO2
  const co2 = twinState.kpis.find(k => k.id === 'kpi-avg-co2');
  if (co2 && co2.status === 'warning') {
    suggestions.push({
      id: 'iaq_warning',
      label: 'Air quality needs attention',
      prompt: 'Analyze air quality issues and suggest improvements',
      priority: 'high'
    });
  }
  
  // Always available actions
  suggestions.push({
    id: 'status',
    label: 'Building status summary',
    prompt: 'Give me a summary of building status',
    priority: 'low'
  });
  
  suggestions.push({
    id: 'optimize',
    label: 'Optimization recommendations',
    prompt: 'What should I optimize?',
    priority: 'low'
  });
  
  res.json(suggestions.slice(0, 5)); // Return top 5 suggestions
});

// ============ Server Setup ============

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send current state on connect
  ws.send(JSON.stringify({ type: 'state', data: twinState }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'control_change') {
        const result = simulator.step(60, data.changes);
        twinState = result.state;
        saveTwinState();
        
        broadcastState(wss, {
          type: 'update',
          data: {
            state: twinState,
            log: result.log,
            newAlerts: result.newAlerts
          }
        });
      }
      
      if (data.type === 'simulate') {
        const result = simulator.step(data.timeStep || 60);
        twinState = result.state;
        saveTwinState();
        
        broadcastState(wss, {
          type: 'update',
          data: {
            state: twinState,
            log: result.log,
            newAlerts: result.newAlerts
          }
        });
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server
loadTwinState();

server.listen(PORT, () => {
  console.log(`HVAC Digital Twin Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`Foundry Local endpoint: ${FOUNDRY_LOCAL_URL}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  saveTwinState();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server };
