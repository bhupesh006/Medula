import React, { useState } from 'react';
import { Activity, ShieldAlert, Zap, Compass, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { AcquisitionService } from '../services/acquisitionService.js';

export function MeasurementForm({ onRecordAcquired }) {
  const [category, setCategory] = useState('wearable_physiological');
  const [astronautId, setAstronautId] = useState('ASTRO-01');
  const [missionId, setMissionId] = useState('ARES-V');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString());
  const [deviceId, setDeviceId] = useState('BIO-VEST-01');
  const [source, setSource] = useState('wearable_sensor');

  // Wearable fields
  const [metric, setMetric] = useState('heart_rate');
  const [wearableValue, setWearableValue] = useState(72);
  const [wearableUnit, setWearableUnit] = useState('bpm');
  const [contactQuality, setContactQuality] = useState('good');

  // Assessment fields
  const [stressScore, setStressScore] = useState(25);
  const [fatigueScore, setFatigueScore] = useState(30);
  const [moodScore, setMoodScore] = useState(8);
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');

  // Mission event fields
  const [eventType, setEventType] = useState('exercise_session');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [intensity, setIntensity] = useState('high');
  const [description, setDescription] = useState('T2 Countermeasure treadmill protocol');
  const [equipmentUsed, setEquipmentUsed] = useState('COLBERT Treadmill');

  // Radiation fields
  const [cumulativeDose, setCumulativeDose] = useState(12.4);
  const [doseRate, setDoseRate] = useState(15.2);
  const [sensorLocation, setSensorLocation] = useState('Crew Quarters Habitat');

  // Submission feedback
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);

  // Auto-align unit and source when metric/category changes
  const handleMetricChange = (newMetric) => {
    setMetric(newMetric);
    switch (newMetric) {
      case 'heart_rate':
        setWearableUnit('bpm');
        break;
      case 'hrv':
        setWearableUnit('ms');
        break;
      case 'spo2':
        setWearableUnit('%');
        break;
      case 'systolic_bp':
      case 'diastolic_bp':
        setWearableUnit('mmHg');
        break;
      case 'body_temperature':
        setWearableUnit('°C');
        setWearableValue(36.8);
        break;
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    switch (newCategory) {
      case 'wearable_physiological':
        setSource('wearable_sensor');
        setDeviceId('BIO-VEST-01');
        break;
      case 'manual_assessment':
        setSource('manual_entry');
        setDeviceId('CREW-TABLET-01');
        break;
      case 'mission_event':
        setSource('mission_log');
        setDeviceId('MISSION-TIMELINE-SYS');
        break;
      case 'radiation_measurement':
        setSource('radiation_dosimeter');
        setDeviceId('DOSI-CPD-09');
        break;
    }
  };

  const handleQuickPreset = (presetType) => {
    const now = new Date().toISOString();
    setRecordedAt(now);

    if (presetType === 'unusual_hr') {
      setCategory('wearable_physiological');
      setSource('wearable_sensor');
      setMetric('heart_rate');
      setWearableValue(195); // Unusual but valid
      setWearableUnit('bpm');
    } else if (presetType === 'invalid_unit') {
      setCategory('wearable_physiological');
      setMetric('heart_rate');
      setWearableValue(75);
      setWearableUnit('km/h'); // Invalid unit
    } else if (presetType === 'missing_id') {
      setAstronautId('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLastSubmissionResult(null);

    let dataPayload = {};
    if (category === 'wearable_physiological') {
      dataPayload = {
        metric,
        value: Number(wearableValue),
        unit: wearableUnit,
        sensorContactQuality: contactQuality,
      };
    } else if (category === 'manual_assessment') {
      dataPayload = {
        stress_score: Number(stressScore),
        fatigue_score: Number(fatigueScore),
        mood_score: Number(moodScore),
        symptoms: symptoms ? symptoms.split(',').map((s) => s.trim()) : [],
        notes,
      };
    } else if (category === 'mission_event') {
      dataPayload = {
        eventType,
        durationMinutes: Number(durationMinutes),
        intensity,
        description,
        equipmentUsed,
      };
    } else if (category === 'radiation_measurement') {
      dataPayload = {
        cumulative_dose: Number(cumulativeDose),
        cumulative_dose_unit: 'mSv',
        dose_rate: Number(doseRate),
        dose_rate_unit: 'µSv/h',
        sensorLocation,
        dosimeterId: deviceId,
      };
    }

    const payload = {
      astronautId,
      missionId,
      category,
      recordedAt,
      provenance: {
        source,
        deviceId: deviceId || undefined,
        softwareVersion: '1.0.0',
      },
      data: dataPayload,
    };

    try {
      const outcome = await AcquisitionService.ingestRecord(payload);
      setLastSubmissionResult(outcome);
      if (onRecordAcquired) {
        onRecordAcquired(outcome);
      }
      // Update recordedAt to current timestamp for subsequent entries
      setRecordedAt(new Date().toISOString());
    } catch (err) {
      setLastSubmissionResult({
        success: false,
        status: 'INVALID',
        message: err.message,
        errors: [{ field: 'system', message: err.message }],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide flex items-center gap-2 text-cyan-400">
            <Activity className="w-5 h-5 text-cyan-400" />
            MDAE-01: Health Data Ingestion Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Aerospace physiological, psychological, operational, and radiological telemetry capture
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickPreset('unusual_hr')}
            className="text-xs bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 border border-amber-700/60 px-3 py-1.5 rounded transition"
          >
            Fill Unusual HR (195 bpm)
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('invalid_unit')}
            className="text-xs bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/60 px-3 py-1.5 rounded transition"
          >
            Fill Invalid Unit
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Tabs */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Telemetry Category
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'wearable_physiological', label: '1. Wearable Bio-Metrics', icon: Activity },
              { id: 'manual_assessment', label: '2. Manual Assessment', icon: ShieldAlert },
              { id: 'mission_event', label: '3. Mission Activity', icon: Compass },
              { id: 'radiation_measurement', label: '4. Radiation Dosimeter', icon: Zap },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded text-xs font-medium border transition ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Metadata: Astronaut, Mission, Timestamps, Provenance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-md border border-slate-800/80">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Astronaut Identifier</label>
            <input
              type="text"
              value={astronautId}
              onChange={(e) => setAstronautId(e.target.value)}
              placeholder="e.g. ASTRO-01"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Mission Identifier</label>
            <input
              type="text"
              value={missionId}
              onChange={(e) => setMissionId(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Recorded At (ISO 8601 UTC)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setRecordedAt(new Date().toISOString())}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 rounded"
                title="Reset to UTC Now"
              >
                Now
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Source Provenance</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Device / Hardware ID (Optional)</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. BIO-MON-04"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Dynamic Category-Specific Fields */}
        <div className="p-4 bg-slate-950/80 rounded-md border border-cyan-950">
          {category === 'wearable_physiological' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-cyan-300">Wearable Physiological Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Physiological Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => handleMetricChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="heart_rate">Heart Rate (heart_rate)</option>
                    <option value="hrv">Heart Rate Variability (hrv)</option>
                    <option value="spo2">Blood Oxygen Saturation (spo2)</option>
                    <option value="systolic_bp">Systolic BP (systolic_bp)</option>
                    <option value="diastolic_bp">Diastolic BP (diastolic_bp)</option>
                    <option value="body_temperature">Body Temperature (body_temperature)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Measurement Value</label>
                  <input
                    type="number"
                    step="any"
                    value={wearableValue}
                    onChange={(e) => setWearableValue(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={wearableUnit}
                    onChange={(e) => setWearableUnit(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contact Quality</label>
                  <select
                    value={contactQuality}
                    onChange={(e) => setContactQuality(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="good">Good (Optimal Signal)</option>
                    <option value="fair">Fair (Moderate Motion Noise)</option>
                    <option value="poor">Poor (Degraded)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {category === 'manual_assessment' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-cyan-300">Astronaut Self-Assessment Questionnaire</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Stress Score (0–100): <span className="text-cyan-400 font-mono font-bold">{stressScore}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stressScore}
                    onChange={(e) => setStressScore(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Fatigue Score (0–100): <span className="text-cyan-400 font-mono font-bold">{fatigueScore}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={fatigueScore}
                    onChange={(e) => setFatigueScore(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Mood Score (1–10): <span className="text-cyan-400 font-mono font-bold">{moodScore}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={moodScore}
                    onChange={(e) => setMoodScore(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Reported Symptoms (comma-separated)</label>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Mild headache, space motion sickness, eye strain"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Astronaut Subjective Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  placeholder="Subjective observation notes during orbital pass..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {category === 'mission_event' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-cyan-300">Mission Event & Activity Record</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="exercise_session">Exercise Session</option>
                    <option value="sleep_session">Sleep Session</option>
                    <option value="workload_event">Workload / EVA Event</option>
                    <option value="other_mission_activity">Other Mission Activity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Intensity Level</label>
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="extreme">Extreme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Activity Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="e.g. CEVIS bicycle ergometer 30-min protocol"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Equipment Used</label>
                <input
                  type="text"
                  value={equipmentUsed}
                  onChange={(e) => setEquipmentUsed(e.target.value)}
                  placeholder="e.g. ARED, COLBERT, CEVIS"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {category === 'radiation_measurement' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-cyan-300">Radiation Dosimeter Telemetry</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cumulative Dose (mSv)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cumulativeDose}
                    onChange={(e) => setCumulativeDose(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Dose Rate (µSv/h)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={doseRate}
                    onChange={(e) => setDoseRate(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Sensor Placement / Location</label>
                  <input
                    type="text"
                    value={sensorLocation}
                    onChange={(e) => setSensorLocation(e.target.value)}
                    placeholder="e.g. Cupola, Airlock, Crew Quarters"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submission Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            Offline-first: Record is persisted locally in IndexedDB before background sync.
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-6 py-2.5 rounded shadow-lg transition disabled:opacity-50"
          >
            {submitting ? 'Validating & Storing...' : 'Validate & Ingest Locally'}
          </button>
        </div>
      </form>

      {/* Immediate Submission Feedback Banner */}
      {lastSubmissionResult && (
        <div className={`mt-6 p-4 rounded-md border text-sm flex items-start gap-3 ${
          lastSubmissionResult.status === 'VALID'
            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
            : lastSubmissionResult.status === 'VALID_WITH_WARNINGS'
            ? 'bg-amber-950/60 border-amber-500 text-amber-200'
            : 'bg-rose-950/60 border-rose-500 text-rose-200'
        }`}>
          {lastSubmissionResult.status === 'VALID' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {lastSubmissionResult.status === 'VALID_WITH_WARNINGS' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {lastSubmissionResult.status === 'INVALID' && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          
          <div className="space-y-1">
            <div className="font-semibold">
              Status: [{lastSubmissionResult.status}] — {lastSubmissionResult.message}
            </div>
            <div className="text-xs opacity-90 font-mono">
              Record ID: {lastSubmissionResult.recordId}
            </div>
            {lastSubmissionResult.warnings?.length > 0 && (
              <div className="text-xs space-y-0.5 pt-1 text-amber-300">
                <div className="font-semibold">Data Quality Warnings Preserved:</div>
                {lastSubmissionResult.warnings.map((w, idx) => (
                  <div key={idx}>• {w.message}</div>
                ))}
              </div>
            )}
            {lastSubmissionResult.errors?.length > 0 && (
              <div className="text-xs space-y-0.5 pt-1 text-rose-300">
                <div className="font-semibold">Validation Errors (Preserved in Rejection Audit Log):</div>
                {lastSubmissionResult.errors.map((e, idx) => (
                  <div key={idx}>• [{e.field}] {e.message}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

