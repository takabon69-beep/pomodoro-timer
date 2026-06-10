import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, X } from 'lucide-react';
import './index.css';

// 定数定義：デフォルトの設定
const DEFAULT_SETTINGS = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  pomodorosUntilLongBreak: 4, // 大休憩までのセット数
};

const MODES = {
  POMODORO: 'pomodoro',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
};

const MODE_LABELS = {
  [MODES.POMODORO]: 'ポモドーロ',
  [MODES.SHORT_BREAK]: '小休憩',
  [MODES.LONG_BREAK]: '大休憩',
};

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentMode, setCurrentMode] = useState(MODES.POMODORO);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  
  // 設定フォーム用
  const [formSettings, setFormSettings] = useState(settings);

  // タイマー参照
  const intervalRef = useRef(null);

  // タイマー進行ロジック
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // 時間切れ時の自動遷移ロジック
      clearInterval(intervalRef.current);
      playAlarm();
      
      // 通知用トーストを表示（3秒後に消える）
      setIsTimeUp(true);
      setTimeout(() => setIsTimeUp(false), 3000);

      let nextMode = currentMode;
      let nextCycle = currentCycle;

      if (currentMode === MODES.POMODORO) {
        // 作業終了時
        if (currentCycle >= settings.pomodorosUntilLongBreak) {
          nextMode = MODES.LONG_BREAK;
          nextCycle = 1;
        } else {
          nextMode = MODES.SHORT_BREAK;
          nextCycle = currentCycle + 1;
        }
      } else {
        // 休憩終了時
        nextMode = MODES.POMODORO;
      }

      // 自動で次のフェーズをスタート
      setCurrentMode(nextMode);
      setCurrentCycle(nextCycle);
      setTimeLeft(settings[nextMode] * 60);
      setIsActive(true);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, timeLeft, currentMode, currentCycle, settings]);

  // モード手動切替時に時間をリセットし、サイクルは1に戻す（ユーザー操作による切替時）
  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    setTimeLeft(settings[mode] * 60);
    setIsActive(false);
    setCurrentCycle(1);
    updateBackground(mode);
  };

  // モードステートが自動で切り替わったときの背景と時間のリセット
  useEffect(() => {
    updateBackground(currentMode);
  }, [currentMode]);

  const updateBackground = (mode) => {
    const body = document.body;
    body.style.background = mode === MODES.POMODORO 
      ? 'var(--bg-gradient)' 
      : mode === MODES.SHORT_BREAK 
        ? 'linear-gradient(-45deg, #23a6d5, #23d5ab)' 
        : 'linear-gradient(-45deg, #e73c7e, #ee7752)';
  };

  const playAlarm = () => {
    // 簡単なビープ音の再生
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1);
    } catch(e) {
      console.log('Audio not supported');
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[currentMode] * 60);
  };

  const handleSettingsSave = (e) => {
    e.preventDefault();
    setSettings(formSettings);
    setIsSettingsOpen(false);
    // 設定保存時に現在モードの時間を反映する（タイマーが動いていない場合）
    if (!isActive) {
      setTimeLeft(formSettings[currentMode] * 60);
    }
  };

  // 表示用フォーマット
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // プログレスバーの計算
  const totalTime = settings[currentMode] * 60;
  const progress = ((totalTime - Math.max(0, timeLeft)) / totalTime) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = Math.max(0, circumference - (progress / 100) * circumference);

  // タイトル更新
  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - ${MODE_LABELS[currentMode]}`;
  }, [timeLeft, currentMode]);

  return (
    <div className="app-container">
      <button 
        className="settings-btn" 
        onClick={() => {
          setFormSettings(settings);
          setIsSettingsOpen(true);
        }}
        aria-label="設定"
      >
        <Settings size={24} />
      </button>

      <h1>Pomodoro</h1>

      {/* セット数インジケーター */}
      <div className="cycle-indicator">
        <span className="cycle-text">
          セット: {currentMode === MODES.POMODORO ? currentCycle : Math.max(1, currentCycle - 1)} / {settings.pomodorosUntilLongBreak}
        </span>
        <div className="cycle-dots">
          {Array.from({ length: settings.pomodorosUntilLongBreak }).map((_, index) => (
            <div 
              key={index} 
              className={`cycle-dot ${index < (currentMode === MODES.POMODORO ? currentCycle - 1 : currentCycle - 1) ? 'completed' : ''} ${index === (currentCycle - 1) && currentMode === MODES.POMODORO ? 'current' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="mode-selector">
        {Object.values(MODES).map((mode) => (
          <button
            key={mode}
            className={`mode-tab ${currentMode === mode ? 'active' : ''}`}
            onClick={() => handleModeChange(mode)}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="timer-display">
        <svg className="timer-circle" viewBox="0 0 250 250">
          <circle
            className="timer-circle-bg"
            cx="125"
            cy="125"
            r="120"
          />
          <circle
            className="timer-circle-progress"
            cx="125"
            cy="125"
            r="120"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="time-text">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="controls">
        <button className="btn-icon" onClick={resetTimer} aria-label="リセット">
          <RotateCcw size={24} />
        </button>
        <button className="btn-main" onClick={toggleTimer} aria-label={isActive ? '一時停止' : '開始'}>
          {isActive ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
        </button>
      </div>

      {/* Settings Modal */}
      <div className={`modal-overlay ${isSettingsOpen ? 'open' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>タイマー設定</h2>
            <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <form className="settings-form" onSubmit={handleSettingsSave}>
            <div className="form-group">
              <label>作業（分）</label>
              <input
                type="number"
                min="1"
                max="60"
                value={formSettings.pomodoro}
                onChange={(e) => setFormSettings({...formSettings, pomodoro: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="form-group">
              <label>小休憩（分）</label>
              <input
                type="number"
                min="1"
                max="30"
                value={formSettings.shortBreak}
                onChange={(e) => setFormSettings({...formSettings, shortBreak: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="form-group">
              <label>大休憩（分）</label>
              <input
                type="number"
                min="1"
                max="60"
                value={formSettings.longBreak}
                onChange={(e) => setFormSettings({...formSettings, longBreak: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="form-group">
              <label>大休憩までのセット数（回）</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formSettings.pomodorosUntilLongBreak}
                onChange={(e) => setFormSettings({...formSettings, pomodorosUntilLongBreak: parseInt(e.target.value) || 1})}
              />
            </div>
            <button type="submit" className="save-btn">
              保存
            </button>
          </form>
        </div>
      </div>

      {/* Auto Transition Toast */}
      <div className={`toast-notification ${isTimeUp ? 'show' : ''}`}>
        <span className="toast-icon">⏰</span>
        <div className="toast-content">
          <strong>フェーズが切り替わりました</strong>
          <span>{MODE_LABELS[currentMode]}を自動スタートしました</span>
        </div>
      </div>
    </div>
  );
}

export default App;
