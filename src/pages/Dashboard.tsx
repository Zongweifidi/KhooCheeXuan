import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  History, 
  Info, 
  Plus, 
  TrendingUp, 
  Zap,
  ChevronRight,
  BarChart3,
  Moon,
  Sun,
  Smile,
  Frown,
  Meh,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { format, differenceInDays, differenceInSeconds, startOfDay, subDays, getHours, getDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { cn } from '../lib/utils';
import { useFailures, Failure } from '../hooks/useFailures';

// --- CONFIG & CONSTANTS ---
const CONFIG = {
  TIMEZONE: "Asia/Kuala_Lumpur",
  STORAGE_KEY: "discipline_tracker_v1",
  HIGH_RISK_HOURS: [23, 0, 1, 2, 3], // 11 PM to 4 AM
};

const ENRICHING_ACTIVITIES = [
  "做20个俯卧撑，感受肌肉的泵感",
  "立刻出门散步15分钟，呼吸新鲜空气",
  "喝一大杯温水，然后洗个冷水脸",
  "阅读一章你一直想看的书",
  "给家人或好朋友打个电话聊聊天",
  "整理你的书桌或房间，保持环境整洁",
  "闭上眼睛，做5分钟的深呼吸冥想",
  "写下你现在感受到的3个积极事物",
  "听一首节奏轻快、充满能量的音乐",
  "学习10个新的外语单词"
];

const COMMON_TRIGGERS = [
  "深夜独处", "压力大", "无聊空虚", "浏览擦边",
  "失眠焦虑", "疲劳过度", "情绪低落", "酒精催化"
];

// --- TYPES ---
interface RiskResult {
  pct: number;
  levelNum: 1 | 2 | 3 | 4;
  levelLabel: string;
  color: string;
  timeRisk: number;
  streakRisk: number;
  dowRisk: number;
  intervalRisk: number;
  moodRisk: number;
  highRiskHours: number[];
  currentHour: number;
  avgDays: number;
}

interface RecoveryStats {
  total: number;
  avgDays: number;
  best: number;
  last: number;
  trend: "improving" | "stable" | "declining";
  momentum: "ahead" | "on_track" | "behind";
  consistency: number;
  recentAvgDays: number;
  baselineAvgDays: number;
}

interface InsightCard {
  type: string;
  icon: string;
  label: string;
  title: string;
  body: string;
  severity: 1 | 2 | 3;
  color: string;
}

// --- UTILS ---
const getHourInZone = (timestampMs: number) => {
  const zonedDate = toZonedTime(new Date(timestampMs), CONFIG.TIMEZONE);
  return getHours(zonedDate);
};

const getDayInZone = (timestampMs: number) => {
  const zonedDate = toZonedTime(new Date(timestampMs), CONFIG.TIMEZONE);
  return getDay(zonedDate);
};

const formatDuration = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (d > 0) return `${d}天 ${h}时 ${m}分`;
  return `${h}时 ${m}分 ${s}秒`;
};

// --- CORE LOGIC ---

const computeRecoveryStats = (failures: Failure[]): RecoveryStats => {
  if (failures.length === 0) {
    return {
      total: 0,
      avgDays: 0,
      best: 0,
      last: 0,
      trend: "stable",
      momentum: "on_track",
      consistency: 100,
      recentAvgDays: 0,
      baselineAvgDays: 0
    };
  }

  const sorted = [...failures].sort((a, b) => a.timestamp - b.timestamp);
  const now = Date.now();
  
  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i].timestamp - sorted[i-1].timestamp) / (1000 * 60 * 60 * 24));
  }
  
  const total = failures.length;
  const avgDays = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
  
  // Best streak
  let best = 0;
  if (intervals.length > 0) {
    best = Math.max(...intervals, (now - sorted[sorted.length - 1].timestamp) / (1000 * 60 * 60 * 24));
  } else {
    best = (now - sorted[0].timestamp) / (1000 * 60 * 60 * 24);
  }
  
  const last = (now - sorted[sorted.length - 1].timestamp) / 1000;
  
  // Trend analysis (last 3 vs baseline)
  const recentIntervals = intervals.slice(-3);
  const baselineIntervals = intervals.slice(0, -3);
  const recentAvg = recentIntervals.length > 0 ? recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length : avgDays;
  const baselineAvg = baselineIntervals.length > 0 ? baselineIntervals.reduce((a, b) => a + b, 0) / baselineIntervals.length : avgDays;
  
  let trend: "improving" | "stable" | "declining" = "stable";
  if (recentAvg > baselineAvg * 1.1) trend = "improving";
  else if (recentAvg < baselineAvg * 0.9) trend = "declining";
  
  const currentStreakDays = last / (60 * 60 * 24);
  let momentum: "ahead" | "on_track" | "behind" = "on_track";
  if (currentStreakDays > avgDays * 1.2) momentum = "ahead";
  else if (currentStreakDays < avgDays * 0.5) momentum = "behind";

  // Consistency (variance based)
  const variance = intervals.length > 0 
    ? intervals.reduce((acc, val) => acc + Math.pow(val - avgDays, 2), 0) / intervals.length 
    : 0;
  const consistency = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / (avgDays || 1)) * 50));

  return {
    total,
    avgDays,
    best: best * 24 * 60 * 60, // convert to seconds
    last,
    trend,
    momentum,
    consistency,
    recentAvgDays: recentAvg,
    baselineAvgDays: baselineAvg
  };
};

const computeRisk = (failures: Failure[], moodScore: number): RiskResult => {
  const now = Date.now();
  const currentHour = getHourInZone(now);
  const currentDay = getDayInZone(now);
  
  // 1. Time Risk
  const isHighRiskHour = CONFIG.HIGH_RISK_HOURS.includes(currentHour);
  const timeRisk = isHighRiskHour ? 0.8 : 0.2;
  
  // 2. Streak Risk (complacency or frustration)
  const stats = computeRecoveryStats(failures);
  const currentStreakDays = stats.last / (60 * 60 * 24);
  let streakRisk = 0.5;
  if (currentStreakDays < 1) streakRisk = 0.8; // Chaser effect
  else if (currentStreakDays > stats.avgDays * 1.5) streakRisk = 0.7; // Complacency
  else streakRisk = 0.3;
  
  // 3. DOW Risk (Weekends usually higher)
  const dowRisk = (currentDay === 0 || currentDay === 6) ? 0.7 : 0.4;
  
  // 4. Interval Risk
  const intervalRisk = Math.max(0, 1 - Math.abs(currentStreakDays - stats.avgDays) / (stats.avgDays || 1));
  
  // 5. Mood Risk
  const moodRisk = (6 - moodScore) / 5; // 1=high risk, 5=low risk
  
  const rawPct = (timeRisk * 0.25 + streakRisk * 0.2 + dowRisk * 0.15 + intervalRisk * 0.2 + moodRisk * 0.2) * 100;
  const pct = Math.min(100, Math.max(0, rawPct));
  
  let levelNum: 1 | 2 | 3 | 4 = 1;
  let levelLabel = "低";
  let color = "#10b981"; // emerald-500
  
  if (pct > 75) {
    levelNum = 4;
    levelLabel = "极高";
    color = "#ef4444"; // red-500
  } else if (pct > 50) {
    levelNum = 3;
    levelLabel = "高";
    color = "#f59e0b"; // amber-500
  } else if (pct > 25) {
    levelNum = 2;
    levelLabel = "中";
    color = "#3b82f6"; // blue-500
  }
  
  return {
    pct,
    levelNum,
    levelLabel,
    color,
    timeRisk,
    streakRisk,
    dowRisk,
    intervalRisk,
    moodRisk,
    highRiskHours: CONFIG.HIGH_RISK_HOURS,
    currentHour,
    avgDays: stats.avgDays
  };
};

const buildInsightCards = (failures: Failure[], stats: RecoveryStats, risk: RiskResult): InsightCard[] => {
  const cards: InsightCard[] = [];
  
  // 1. Risk Insight
  if (risk.levelNum >= 3) {
    cards.push({
      type: "risk_alert",
      icon: "⚠️",
      label: "高危预警",
      title: "当前处于脆弱时段",
      body: `综合风险指数 ${Math.round(risk.pct)}%。建议立即离开电子设备，进行冥想或运动。`,
      severity: 3,
      color: "#ef4444"
    });
  }
  
  // 2. Trend Insight
  if (stats.trend === "improving") {
    cards.push({
      type: "trend_pos",
      icon: "📈",
      label: "趋势向好",
      title: "你的自控力正在增强",
      body: `近期平均间隔 (${stats.recentAvgDays.toFixed(1)}天) 优于历史基准 (${stats.baselineAvgDays.toFixed(1)}天)。`,
      severity: 1,
      color: "#10b981"
    });
  } else if (stats.trend === "declining") {
    cards.push({
      type: "trend_neg",
      icon: "📉",
      label: "警惕下滑",
      title: "近期波动频繁",
      body: "平均间隔有所缩短，请回顾最近的压力来源或环境诱因。",
      severity: 2,
      color: "#f59e0b"
    });
  }
  
  // 3. Time Pattern
  const hourCounts = new Array(24).fill(0);
  failures.forEach(f => {
    hourCounts[getHourInZone(f.timestamp)]++;
  });
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  if (failures.length >= 3) {
    cards.push({
      type: "pattern_time",
      icon: "🕒",
      label: "模式识别",
      title: `高频失败时段：${peakHour}:00`,
      body: "数据表明该时段你的意志力最薄弱，建议提前安排社交或睡眠。",
      severity: 2,
      color: "#3b82f6"
    });
  }

  // 4. Momentum
  if (stats.momentum === "ahead") {
    cards.push({
      type: "momentum_ahead",
      icon: "🚀",
      label: "突破极限",
      title: "正在创造新纪录",
      body: `你已超越平均水平 ${Math.round((stats.last / (stats.avgDays * 86400) - 1) * 100)}%，保持专注。`,
      severity: 1,
      color: "#8b5cf6"
    });
  }

  return cards;
};

// --- COMPONENTS ---

const Heatmap = ({ failures }: { failures: Failure[] }) => {
  const matrix = Array(7).fill(0).map(() => Array(24).fill(0));
  let maxCount = 0;

  failures.forEach(f => {
    const d = getDayInZone(f.timestamp);
    const h = getHourInZone(f.timestamp);
    matrix[d][h]++;
    if (matrix[d][h] > maxCount) maxCount = matrix[d][h];
  });

  const days = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[500px] flex flex-col gap-1.5">
        <div className="flex ml-8 gap-1">
          {Array(24).fill(0).map((_, i) => (
            <div key={i} className="flex-1 text-[10px] font-mono text-slate-400 text-center">
              {i % 3 === 0 ? i : ''}
            </div>
          ))}
        </div>
        {days.map((day, dIdx) => (
          <div key={day} className="flex items-center gap-1.5">
            <div className="w-6 text-[10px] font-bold text-slate-400 text-right pr-1">{day}</div>
            {matrix[dIdx].map((count, hIdx) => {
              const intensity = maxCount === 0 ? 0 : count / maxCount;
              return (
                <div 
                  key={hIdx} 
                  className="flex-1 aspect-square rounded-[4px] transition-all relative group cursor-pointer hover:ring-2 hover:ring-slate-400 hover:ring-offset-1"
                  style={{ 
                    backgroundColor: count === 0 ? '#f8fafc' : `rgba(239, 68, 68, ${0.15 + intensity * 0.85})` 
                  }}
                >
                  {count > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg whitespace-nowrap shadow-xl pointer-events-none">
                      <div className="font-bold mb-0.5">周{day} {hIdx}:00</div>
                      <div className="text-slate-300">共 {count} 次记录</div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const TriggerAnalysis = ({ failures }: { failures: Failure[] }) => {
  const triggerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    failures.forEach(f => {
      if (f.triggers) {
        f.triggers.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [failures]);

  if (triggerCounts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-slate-400 min-h-[200px] h-full">
        <Target size={32} className="mb-2 opacity-50" />
        <p className="text-sm font-medium">暂无诱因数据</p>
        <p className="text-xs">在记录失败时添加诱因标签</p>
      </div>
    );
  }

  const maxCount = Math.max(...triggerCounts.map(t => t.count));

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-rose-100 text-rose-600 p-2 rounded-xl">
          <Target size={20} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">诱因分析 (Triggers)</h3>
      </div>
      <div className="space-y-4 flex-1">
        {triggerCounts.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-20 text-xs font-medium text-slate-600 truncate" title={t.name}>{t.name}</div>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(t.count / maxCount) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                className="h-full bg-rose-500 rounded-full"
              />
            </div>
            <div className="w-8 text-right text-xs font-bold text-slate-400">{t.count}次</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm text-white p-4 rounded-2xl shadow-2xl border border-slate-800/50 text-xs min-w-[200px]">
        <p className="font-bold mb-2 text-slate-300 flex items-center gap-1.5 border-b border-slate-700 pb-2">
          <Calendar size={12} />
          {data.type === 'current' ? '当前坚持' : '历史记录'}
        </p>
        <div className="space-y-1.5 mb-3 text-slate-400">
          <div className="flex justify-between"><span>起:</span> <span className="text-slate-200">{data.startDate}</span></div>
          <div className="flex justify-between"><span>止:</span> <span className="text-slate-200">{data.endDate}</span></div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">精确时长</span>
          <span className="text-emerald-400 font-mono text-lg font-black tracking-tighter">
            {data.exactDuration}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const TrackingGauge = ({ firstRecordTime, currentTime }: { firstRecordTime: number | null, currentTime: number }) => {
  if (!firstRecordTime) return null;
  const totalSeconds = (currentTime - firstRecordTime) / 1000;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-3xl relative overflow-hidden shadow-lg shadow-indigo-500/20 h-full flex flex-col justify-between">
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div>
          <div className="text-indigo-200 text-xs font-medium uppercase tracking-widest mb-1">总追踪时长</div>
          <div className="text-4xl font-black flex items-baseline gap-1">
            {days} <span className="text-lg font-normal text-indigo-200">天</span>
            <span className="text-2xl ml-1">{hours}</span> <span className="text-sm font-normal text-indigo-200">时</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-full border-4 border-indigo-300/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
          <Clock size={20} className="text-white" />
        </div>
      </div>
      
      <div className="relative z-10 bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
        <div className="text-xs text-indigo-200 mb-1">追踪起始日</div>
        <div className="font-mono text-sm font-bold">{format(new Date(firstRecordTime), 'yyyy年MM月dd日 HH:mm')}</div>
      </div>

      <div className="absolute -right-6 -bottom-6 opacity-10">
        <History size={150} />
      </div>
    </div>
  );
};

const StatItem = ({ label, value, subValue, icon: Icon, color }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
      <Icon size={14} className={color} />
      {label}
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    {subValue && <div className="text-xs text-slate-400">{subValue}</div>}
  </div>
);

const RiskFactor = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex items-center gap-3 text-xs">
    <div className="w-16 text-slate-400">{label}</div>
    <div className="flex-1 bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn("h-full", color)} 
      />
    </div>
    <div className="w-8 text-right text-slate-500 font-mono">{Math.round(value * 100)}%</div>
  </div>
);

const RiskGauge = ({ risk }: { risk: RiskResult }) => {
  return (
    <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">当前风险等级</div>
            <div className="text-3xl font-black flex items-center gap-2">
              {risk.levelLabel}
              <span className="text-sm font-normal text-slate-400">({Math.round(risk.pct)}%)</span>
            </div>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center border-4",
            risk.levelNum === 4 ? "border-red-500 text-red-500" : 
            risk.levelNum === 3 ? "border-amber-500 text-amber-500" :
            risk.levelNum === 2 ? "border-blue-500 text-blue-500" : "border-emerald-500 text-emerald-500"
          )}>
            <AlertTriangle size={24} />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000 ease-out"
              style={{ width: `${risk.pct}%`, backgroundColor: risk.color }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>SAFE</span>
            <span>CRITICAL</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/50 space-y-3">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">风险因子分析</div>
          <RiskFactor label="时间风险" value={risk.timeRisk} color="bg-indigo-500" />
          <RiskFactor label="周期风险" value={risk.streakRisk} color="bg-blue-500" />
          <RiskFactor label="星期风险" value={risk.dowRisk} color="bg-emerald-500" />
          <RiskFactor label="间隔风险" value={risk.intervalRisk} color="bg-amber-500" />
          <RiskFactor label="情绪风险" value={risk.moodRisk} color="bg-red-500" />
        </div>
      </div>
      
      {/* Abstract background decoration */}
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Activity size={120} />
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { failures, addFailure, clearFailures } = useFailures();
  const [mood, setMood] = useState(3);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCurrentStreak, setShowCurrentStreak] = useState(true);
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Handle incoming state from Rescue page
  useEffect(() => {
    if (location.state?.openAddModal) {
      setShowAddModal(true);
      if (location.state?.initialNote) {
        setNote(location.state.initialNote);
      }
      // Clear the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => computeRecoveryStats(failures), [failures, currentTime]);
  const risk = useMemo(() => computeRisk(failures, mood), [failures, mood, currentTime]);
  const insights = useMemo(() => buildInsightCards(failures, stats, risk), [failures, stats, risk]);

  const handleAddFailure = () => {
    addFailure({
      mood,
      note,
      triggers: selectedTriggers
    });
    setNote("");
    setSelectedTriggers([]);
    setShowAddModal(false);
  };

  const chartData = useMemo(() => {
    if (failures.length < 2) return [];
    const sorted = [...failures].sort((a, b) => a.timestamp - b.timestamp);
    const data = [];
    for (let i = 1; i < sorted.length; i++) {
      const durationSecs = (sorted[i].timestamp - sorted[i-1].timestamp) / 1000;
      data.push({
        name: format(new Date(sorted[i].timestamp), 'MM-dd'),
        fullDate: format(new Date(sorted[i].timestamp), 'yyyy年MM月dd日 HH:mm'),
        startDate: format(new Date(sorted[i-1].timestamp), 'yyyy/MM/dd HH:mm'),
        endDate: format(new Date(sorted[i].timestamp), 'yyyy/MM/dd HH:mm'),
        days: durationSecs / 86400,
        exactDuration: formatDuration(durationSecs),
        type: 'history'
      });
    }
    // Add current streak
    const currentDurationSecs = (Date.now() - sorted[sorted.length - 1].timestamp) / 1000;
    data.push({
      name: '当前',
      fullDate: '至今',
      startDate: sorted.length > 0 ? format(new Date(sorted[sorted.length - 1].timestamp), 'yyyy/MM/dd HH:mm') : '-',
      endDate: '现在',
      days: currentDurationSecs / 86400,
      exactDuration: formatDuration(currentDurationSecs),
      type: 'current'
    });
    return data;
  }, [failures, currentTime]);

  const filteredChartData = useMemo(() => {
    return showCurrentStreak ? chartData : chartData.filter(d => d.type !== 'current');
  }, [chartData, showCurrentStreak]);

  const handleLegendClick = (e: any) => {
    setHiddenLines(prev => ({ ...prev, [e.dataKey]: !prev[e.dataKey] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-bottom border-slate-200 px-6 py-4 sticky top-0 z-30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg">
            <Zap size={18} fill="currentColor" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">自律追踪器</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/rescue')}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <Zap size={14} fill="currentColor" />
            充实开始
          </button>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            <Clock size={12} />
            {formatInTimeZone(new Date(currentTime), CONFIG.TIMEZONE, 'HH:mm:ss')}
          </div>
        </div>
      </header>

      <main className={cn(
        "max-w-2xl mx-auto p-6 space-y-8 transition-all duration-500",
        showAddModal && "blur-md opacity-40 scale-[0.98]"
      )}>
        {/* Hero Section: Current Streak */}
        <section className="text-center py-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 size={14} />
            当前自律时长
          </div>
          <div className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
            {failures.length > 0 ? formatDuration(stats.last) : "开始你的旅程"}
          </div>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            每一次坚持都是对大脑回路的重塑。保持专注，不要被瞬间的冲动击败。
          </p>
        </section>

        {/* Dashboards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RiskGauge risk={risk} />
          {failures.length > 0 ? (
            <TrackingGauge firstRecordTime={failures[0].timestamp} currentTime={currentTime} />
          ) : (
            <div className="bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 min-h-[200px]">
              <History size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">记录第一次失败后</p>
              <p className="text-xs">将在此显示总追踪时长</p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem 
            label="平均间隔" 
            value={`${stats.avgDays.toFixed(1)}天`} 
            subValue={`基准: ${stats.baselineAvgDays.toFixed(1)}天`}
            icon={Activity} 
            color="text-blue-500" 
          />
          <StatItem 
            label="历史最佳" 
            value={`${(stats.best / 86400).toFixed(1)}天`} 
            icon={TrendingUp} 
            color="text-emerald-500" 
          />
          <StatItem 
            label="总次数" 
            value={stats.total} 
            icon={History} 
            color="text-slate-500" 
          />
          <StatItem 
            label="一致性" 
            value={`${Math.round(stats.consistency)}%`} 
            icon={Zap} 
            color="text-amber-500" 
          />
        </div>

        {/* Mood Selector (Risk Input) */}
        <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Smile size={16} className="text-slate-400" />
              当前情绪状态
            </h2>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              mood >= 4 ? "bg-emerald-100 text-emerald-700" :
              mood === 3 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
            )}>
              {mood === 1 ? "极差" : mood === 2 ? "较差" : mood === 3 ? "一般" : mood === 4 ? "良好" : "极佳"}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={cn(
                  "flex-1 py-3 rounded-2xl transition-all flex flex-col items-center gap-1 border-2",
                  mood === m 
                    ? "bg-slate-900 border-slate-900 text-white scale-105" 
                    : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                )}
              >
                {m === 1 && <Frown size={20} />}
                {m === 2 && <Meh size={20} />}
                {m === 3 && <Activity size={20} />}
                {m === 4 && <Smile size={20} />}
                {m === 5 && <Zap size={20} />}
                <span className="text-[10px] font-bold">{m}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Insight Cards */}
        {insights.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">智能洞察</h2>
            <div className="grid gap-4">
              {insights.map((card, idx) => (
                <div 
                  key={idx} 
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-4 items-start"
                >
                  <div className="text-2xl pt-1">{card.icon}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-slate-100 text-slate-500" style={{ color: card.color }}>
                        {card.label}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{card.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trend Chart */}
        {filteredChartData.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-400" />
                自律周期趋势
              </h2>
              <button 
                onClick={() => setShowCurrentStreak(!showCurrentStreak)}
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5",
                  showCurrentStreak ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", showCurrentStreak ? "bg-emerald-500" : "bg-slate-300")} />
                包含当前坚持
              </button>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredChartData}>
                  <defs>
                    <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8'}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8'}}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    onClick={handleLegendClick} 
                    wrapperStyle={{ cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="days" 
                    name="坚持天数"
                    hide={hiddenLines['days']}
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorDays)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        )}

        {/* Analysis Grid */}
        {failures.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heatmap */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 overflow-x-auto h-full"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Activity size={16} className="text-slate-400" />
                  失败模式热力图
                </h2>
                <div className="text-[10px] font-mono text-slate-400">HOURS / DAYS</div>
              </div>
              <Heatmap failures={failures} />
            </motion.section>

            {/* Trigger Analysis */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TriggerAnalysis failures={failures} />
            </motion.section>
          </div>
        )}

        {/* Timeline */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">行为时间线</h2>
            <button 
              onClick={clearFailures}
              className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
            >
              清空数据
            </button>
          </div>
          <div className="space-y-3">
            {failures.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
                <div className="text-slate-300 flex justify-center"><History size={48} /></div>
                <p className="text-slate-400 text-sm">尚无记录，开始你的第一天吧</p>
              </div>
            ) : (
              [...failures].reverse().map((f) => (
                <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    f.mood <= 2 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-500"
                  )}>
                    {f.mood <= 2 ? <Frown size={20} /> : <Meh size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-bold text-slate-900">
                        {formatInTimeZone(new Date(f.timestamp), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm')}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">MOOD: {f.mood}</div>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 italic">
                      {f.note || "未记录感想"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      <AnimatePresence>
        {/* Add Failure Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[32px] md:rounded-[32px] p-8 space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">记录一次失败</h2>
                <p className="text-slate-500 text-sm">诚实面对自己是恢复的第一步。请记录当下的感受。</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">当时的情绪</label>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map(m => (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        className={cn(
                          "flex-1 py-3 rounded-xl border-2 transition-all",
                          mood === m ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-transparent text-slate-400"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase">触发诱因 (可选)</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TRIGGERS.map(trigger => (
                      <button
                        key={trigger}
                        onClick={() => {
                          if (selectedTriggers.includes(trigger)) {
                            setSelectedTriggers(selectedTriggers.filter(t => t !== trigger));
                          } else {
                            setSelectedTriggers([...selectedTriggers, trigger]);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                          selectedTriggers.includes(trigger)
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {trigger}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">记录笔记 (可选)</label>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="写下你现在的感受，或者导致失败的原因..."
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleAddFailure}
                  className="flex-1 py-4 rounded-2xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  确认记录
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
