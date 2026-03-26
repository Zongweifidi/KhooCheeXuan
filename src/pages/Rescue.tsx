import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  ArrowLeft, 
  Wind, 
  PenTool, 
  Activity, 
  Heart,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

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

const BREATHING_PHASES = [
  { label: '吸气', duration: 4, scale: 1.5, color: 'bg-emerald-400' },
  { label: '屏息', duration: 7, scale: 1.5, color: 'bg-teal-400' },
  { label: '呼气', duration: 8, scale: 1, color: 'bg-blue-400' }
];

export default function Rescue() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [activity, setActivity] = useState("");
  const [activeTab, setActiveTab] = useState<'action' | 'breathe' | 'journal'>('action');
  const [journalEntry, setJournalEntry] = useState("");
  
  // Breathing state
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [breatheTimeLeft, setBreatheTimeLeft] = useState(BREATHING_PHASES[0].duration);
  const [isBreathing, setIsBreathing] = useState(false);

  useEffect(() => {
    setActivity(ENRICHING_ACTIVITIES[Math.floor(Math.random() * ENRICHING_ACTIVITIES.length)]);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Breathing logic
  useEffect(() => {
    if (!isBreathing) return;

    const timer = setInterval(() => {
      setBreatheTimeLeft(prev => {
        if (prev <= 1) {
          const nextIndex = (phaseIndex + 1) % BREATHING_PHASES.length;
          setPhaseIndex(nextIndex);
          return BREATHING_PHASES[nextIndex].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isBreathing, phaseIndex]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGiveUp = () => {
    // Navigate back to dashboard with a state to open the add modal
    navigate('/', { state: { openAddModal: true, initialNote: journalEntry } });
  };

  const handleCalmDown = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-800 z-50">
        <motion.div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
          initial={{ width: "100%" }}
          animate={{ width: `${(timeLeft / 900) * 100}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 font-bold text-emerald-400">
          <ShieldAlert size={18} />
          <span>紧急救援模式</span>
        </div>
        <div className="w-8" /> {/* Spacer for centering */}
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8 pb-32">
        {/* Timer Section */}
        <div className="text-center space-y-2 pt-4">
          <div className="text-6xl font-mono font-black tracking-tighter text-white drop-shadow-lg">
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            冲动消退倒计时
          </p>
          <p className="text-xs text-slate-500 mt-2">
            科学研究表明，强烈的冲动通常只会持续15分钟。坚持住！
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('action')}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'action' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Activity size={16} /> 行动转移
          </button>
          <button
            onClick={() => setActiveTab('breathe')}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'breathe' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Wind size={16} /> 呼吸平复
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'journal' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <PenTool size={16} /> 情绪日记
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[280px]">
          <AnimatePresence mode="wait">
            {activeTab === 'action' && (
              <motion.div
                key="action"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Zap size={32} />
                  </div>
                  <p className="text-xl font-bold text-slate-100 leading-relaxed">
                    "{activity}"
                  </p>
                  <button 
                    onClick={() => setActivity(ENRICHING_ACTIVITIES[Math.floor(Math.random() * ENRICHING_ACTIVITIES.length)])}
                    className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-4 py-2 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20"
                  >
                    换一个建议
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'breathe' && (
              <motion.div
                key="breathe"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-8 space-y-12"
              >
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {/* Breathing Circle */}
                  <motion.div
                    className={cn("absolute inset-0 rounded-full opacity-20", BREATHING_PHASES[phaseIndex].color)}
                    animate={{ 
                      scale: isBreathing ? BREATHING_PHASES[phaseIndex].scale : 1,
                    }}
                    transition={{ 
                      duration: isBreathing ? BREATHING_PHASES[phaseIndex].duration : 0.5,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className={cn("absolute inset-4 rounded-full opacity-40", BREATHING_PHASES[phaseIndex].color)}
                    animate={{ 
                      scale: isBreathing ? BREATHING_PHASES[phaseIndex].scale * 0.8 : 1,
                    }}
                    transition={{ 
                      duration: isBreathing ? BREATHING_PHASES[phaseIndex].duration : 0.5,
                      ease: "easeInOut"
                    }}
                  />
                  
                  <div className="relative z-10 text-center">
                    {isBreathing ? (
                      <>
                        <div className="text-4xl font-black text-white">{breatheTimeLeft}</div>
                        <div className="text-sm font-bold text-slate-300">{BREATHING_PHASES[phaseIndex].label}</div>
                      </>
                    ) : (
                      <Heart size={48} className="text-slate-600 mx-auto" />
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsBreathing(!isBreathing);
                    if (!isBreathing) {
                      setPhaseIndex(0);
                      setBreatheTimeLeft(BREATHING_PHASES[0].duration);
                    }
                  }}
                  className={cn(
                    "px-8 py-3 rounded-full font-bold transition-all",
                    isBreathing 
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                      : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                  )}
                >
                  {isBreathing ? "停止练习" : "开始 4-7-8 呼吸法"}
                </button>
              </motion.div>
            )}

            {activeTab === 'journal' && (
              <motion.div
                key="journal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <p className="text-sm text-slate-400 px-2">
                  写下你现在的感受。是什么触发了你的冲动？把它写出来，不要评判自己。
                </p>
                <textarea
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                  placeholder="我现在感觉..."
                  className="w-full h-48 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent z-40">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <button 
            onClick={handleCalmDown}
            className="w-full py-4 rounded-2xl font-bold bg-emerald-500 text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            我已经冷静下来了
          </button>
          <button 
            onClick={handleGiveUp}
            className="w-full py-4 rounded-2xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors"
          >
            无法坚持，记录失败
          </button>
        </div>
      </div>
    </div>
  );
}
