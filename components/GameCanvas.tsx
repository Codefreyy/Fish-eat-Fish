
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../services/GameEngine';
import { SoundManager } from '../services/SoundManager';
import { GameState, Difficulty } from '../types';
import { Play, RotateCcw, Trophy, Skull, Anchor, Zap, Volume2, VolumeX, Music, LogOut } from 'lucide-react';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  
  // Audio State
  const [isBgmOn, setIsBgmOn] = useState(true);
  const [isSfxOn, setIsSfxOn] = useState(true);

  // Initialize Game Engine & Sound Manager
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create Sound Manager
    const soundMgr = new SoundManager();
    soundManagerRef.current = soundMgr;

    const engine = new GameEngine(
      canvasRef.current,
      soundMgr,
      (finalScore) => {
        setGameState('GAME_OVER');
        setScore(finalScore);
        const stored = localStorage.getItem('deepSeaHighScore');
        const currentHigh = stored ? parseInt(stored) : 0;
        if (finalScore > currentHigh) {
            localStorage.setItem('deepSeaHighScore', finalScore.toString());
            setHighScore(finalScore);
        }
      },
      (currentScore) => {
        setScore(currentScore);
      }
    );
    
    engineRef.current = engine;
    
    const stored = localStorage.getItem('deepSeaHighScore');
    if (stored) setHighScore(parseInt(stored));
    
    engine.loop(0); 

    return () => {
      engine.stop();
      if (soundManagerRef.current) {
        soundManagerRef.current.stopBgm();
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (engineRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      engineRef.current.updateMouse(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const initAudio = async () => {
    if (soundManagerRef.current) {
        await soundManagerRef.current.init();
        if (isBgmOn) {
            soundManagerRef.current.startBgm();
        }
    }
  };

  const playClickSound = () => {
    soundManagerRef.current?.playClick();
  };

  const startGame = async () => {
    await initAudio();
    playClickSound();
    if (engineRef.current) {
      engineRef.current.startGame(selectedDifficulty);
      setGameState('PLAYING');
      setScore(0);
    }
  };

  const exitGame = () => {
      playClickSound();
      if (engineRef.current) {
          engineRef.current.stop();
      }
      setGameState('MENU');
  };

  const toggleBgm = () => {
      const newState = !isBgmOn;
      setIsBgmOn(newState);
      soundManagerRef.current?.setBgmEnabled(newState);
      playClickSound();
  };

  const toggleSfx = () => {
      const newState = !isSfxOn;
      setIsSfxOn(newState);
      soundManagerRef.current?.setSfxEnabled(newState);
      // Don't play click sound if turning off SFX :)
      if (newState) soundManagerRef.current?.playClick();
  };

  const DifficultyButton = ({ diff, label, icon: Icon, color }: { diff: Difficulty, label: string, icon: any, color: string }) => (
    <button
      onClick={() => { setSelectedDifficulty(diff); playClickSound(); }}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 w-28 ${
        selectedDifficulty === diff 
          ? `bg-${color}-600/20 border-${color}-400 shadow-[0_0_15px_rgba(var(--color-${color}),0.5)] scale-110` 
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-105'
      }`}
    >
      <Icon className={`mb-2 ${selectedDifficulty === diff ? `text-${color}-400` : 'text-slate-400'}`} size={24} />
      <span className={`text-sm font-bold ${selectedDifficulty === diff ? 'text-white' : 'text-slate-400'}`}>{label}</span>
      {selectedDifficulty === diff && (
        <div className={`absolute -bottom-2 w-2 h-2 rounded-full bg-${color}-400`} />
      )}
    </button>
  );

  return (
    <div className="relative w-full h-full font-sans select-none" onClick={() => initAudio()}>
      {/* Audio Controls - Always Visible */}
      <div className="absolute top-4 right-4 z-50 flex space-x-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleBgm(); }}
            className="p-2 bg-slate-900/50 backdrop-blur-md border border-slate-700 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle Music"
          >
              {isBgmOn ? <Music size={20} /> : <div className="relative"><Music size={20} className="opacity-50" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-red-500 rotate-45"></div></div></div>}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSfx(); }}
            className="p-2 bg-slate-900/50 backdrop-blur-md border border-slate-700 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle Sound Effects"
          >
              {isSfxOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
      </div>

      {/* HUD: Score */}
      {gameState === 'PLAYING' && (
        <>
            <div className="absolute top-4 left-4 z-10 text-white pointer-events-none">
            <div className="text-2xl font-bold drop-shadow-md">Score: {score}</div>
            <div className="text-xs text-blue-200 font-mono mt-1 opacity-70">Difficulty: {selectedDifficulty}</div>
            </div>

            {/* Exit Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); exitGame(); }}
                className="absolute bottom-4 left-4 z-40 flex items-center space-x-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 rounded-full text-red-200 transition-colors"
            >
                <LogOut size={16} />
                <span className="text-sm font-bold">Exit</span>
            </button>
        </>
      )}

      {/* Main Menu Overlay */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/60 backdrop-blur-sm transition-all duration-500">
          <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-3xl shadow-2xl text-center max-w-lg w-full backdrop-blur-xl">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-600 mb-2 drop-shadow-sm">
              Fish Eat Fish
            </h1>
            <p className="text-blue-200/60 mb-8 text-lg font-light tracking-wide">
              Rule the ocean or become a snack.
            </p>
            
            <div className="flex justify-center mb-8">
                <div className="flex items-center space-x-2 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-5 py-2 rounded-full">
                    <Trophy size={18} />
                    <span className="font-bold tracking-wider">TOP: {highScore}</span>
                </div>
            </div>

            {/* Difficulty Select */}
            <div className="mb-8">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-4 font-bold">Select Difficulty</p>
                <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => { setSelectedDifficulty('EASY'); playClickSound(); }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all w-24 ${
                        selectedDifficulty === 'EASY' 
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-105 shadow-emerald-500/20 shadow-lg' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                        <Anchor size={20} className="mb-1"/>
                        <span className="text-xs font-bold">Easy</span>
                    </button>

                    <button
                      onClick={() => { setSelectedDifficulty('NORMAL'); playClickSound(); }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all w-24 ${
                        selectedDifficulty === 'NORMAL' 
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300 scale-105 shadow-blue-500/20 shadow-lg' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                        <Zap size={20} className="mb-1"/>
                        <span className="text-xs font-bold">Normal</span>
                    </button>

                    <button
                      onClick={() => { setSelectedDifficulty('HARD'); playClickSound(); }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all w-24 ${
                        selectedDifficulty === 'HARD' 
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300 scale-105 shadow-rose-500/20 shadow-lg' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                        <Skull size={20} className="mb-1"/>
                        <span className="text-xs font-bold">Hard</span>
                    </button>
                </div>
            </div>

            <button
              onClick={startGame}
              className="w-full relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-1 focus:outline-none"
            >
              <Play className="mr-3 fill-current" />
              <span className="text-lg">DIVE IN</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-red-950/30 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">GAME OVER</h2>
            <p className="text-slate-400 mb-8">The ocean is a cruel mistress.</p>
            
            <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Score</div>
                <div className="text-5xl font-mono font-bold text-emerald-400">{score}</div>
            </div>

            <button
              onClick={startGame}
              className="w-full inline-flex items-center justify-center px-6 py-4 font-bold text-white transition-all duration-200 bg-slate-700 rounded-xl hover:bg-slate-600 hover:text-white border border-slate-600"
            >
              <RotateCcw className="mr-2" size={20} />
              Replay
            </button>
            <button 
                onClick={() => { playClickSound(); setGameState('MENU'); }}
                className="mt-4 text-slate-500 text-sm hover:text-slate-300 underline underline-offset-4"
            >
                Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-none"
        onMouseMove={handleMouseMove}
      />
      
      {gameState === 'PLAYING' && (
         <div className="pointer-events-none absolute top-4 right-20 text-white/30 text-xs font-mono mr-8">
             MOUSE TO MOVE
         </div>
      )}
    </div>
  );
};
