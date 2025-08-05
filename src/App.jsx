import React, { useEffect, useState } from 'react';
import './App.css';

const ESP32_IP = 'http://192.168.17.127'; // ⚠️ Replace with your ESP32 IP

const relayNames = ['Water Pump', 'Air Pump', 'Light 1', 'Light 2'];

function App() {
  const [temperature, setTemperature] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [relayStates, setRelayStates] = useState([false, false, false, false]);
  const [durations, setDurations] = useState(
    relayNames.map(() => ({ hours: '', minutes: '' }))
  );
  const [routines, setRoutines] = useState(
    relayNames.map(() => ({ hour: '', minute: '', durationMin: '' }))
  );

  const fetchSensorData = async () => {
    try {
      const res = await fetch(`${ESP32_IP}/sensor`);
      const data = await res.json();
      setTemperature(data.temperature?.toFixed(1) || '--');
      setHumidity(data.humidity?.toFixed(1) || '--');
    } catch (err) {
      console.error('Sensor fetch error:', err);
      setTemperature('--');
      setHumidity('--');
    }
  };

  const toggleRelay = async (index, state, duration = 0) => {
    try {
      await fetch(`${ESP32_IP}/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `relay=${index + 1}&state=${state}&duration=${duration}`,
      });
      const newStates = [...relayStates];
      newStates[index] = state;
      setRelayStates(newStates);
    } catch (err) {
      console.error(`Relay ${index + 1} error:`, err);
    }
  };

  const saveRoutine = async (index) => {
    const routine = routines[index];
    const duration = parseInt(routine.durationMin) || 0;
    const hour = parseInt(routine.hour) || 0;
    const minute = parseInt(routine.minute) || 0;

    try {
      await fetch(`${ESP32_IP}/set_routine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `relay=${index + 1}&hour=${hour}&minute=${minute}&duration=${duration}`,
      });
      alert(`Routine set for ${relayNames[index]} at ${hour}:${minute} for ${duration} minutes`);
    } catch (err) {
      console.error('Routine set error:', err);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <h1>🌿 AI Driven Agri Dashboard</h1>

      <div className="sensor">
        <p>🌞 Temperature: <strong>{temperature} °C</strong></p>
        <p>💧 Humidity: <strong>{humidity} %</strong></p>
      </div>

      <div className="relays">
        {relayNames.map((name, i) => (
          <div className="relay-card" key={i}>
            <h3>{name}</h3>
            <button
              className={relayStates[i] ? 'off' : 'on'}
              onClick={() => toggleRelay(i, !relayStates[i])}
            >
              {relayStates[i] ? 'Turn OFF' : 'Turn ON'}
            </button>

            <div className="timer">
              <input
                type="number"
                placeholder="Hours"
                min="0"
                value={durations[i].hours}
                onChange={(e) => {
                  const newDur = [...durations];
                  newDur[i].hours = e.target.value;
                  setDurations(newDur);
                }}
              />
              <input
                type="number"
                placeholder="Minutes"
                min="0"
                max="59"
                value={durations[i].minutes}
                onChange={(e) => {
                  const newDur = [...durations];
                  newDur[i].minutes = e.target.value;
                  setDurations(newDur);
                }}
              />
              <button
                onClick={() => {
                  const hrs = parseInt(durations[i].hours) || 0;
                  const mins = parseInt(durations[i].minutes) || 0;
                  const totalSeconds = hrs * 3600 + mins * 60;
                  if (totalSeconds > 0) toggleRelay(i, true, totalSeconds);
                }}
              >
                Run for {durations[i].hours || 0}h {durations[i].minutes || 0}m
              </button>
            </div>

            <div className="routine">
              <h4>Routine Scheduler</h4>
              <input
                type="number"
                placeholder="HH"
                min="0"
                max="23"
                value={routines[i].hour}
                onChange={(e) => {
                  const newRoutines = [...routines];
                  newRoutines[i].hour = e.target.value;
                  setRoutines(newRoutines);
                }}
              />
              <input
                type="number"
                placeholder="MM"
                min="0"
                max="59"
                value={routines[i].minute}
                onChange={(e) => {
                  const newRoutines = [...routines];
                  newRoutines[i].minute = e.target.value;
                  setRoutines(newRoutines);
                }}
              />
              <input
                type="number"
                placeholder="Duration (min)"
                min="1"
                value={routines[i].durationMin}
                onChange={(e) => {
                  const newRoutines = [...routines];
                  newRoutines[i].durationMin = e.target.value;
                  setRoutines(newRoutines);
                }}
              />
              <button onClick={() => saveRoutine(i)}>Save Routine</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
