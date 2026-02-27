// src/ui/CombatUI.js
const { useState, useEffect } = React;

const Icon = ({ path, className="w-[18px] h-[18px]" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
    </svg>
);
const Icons = {
    Sword: () => <Icon path="M14.5 17.5L3 6V3h3l11.5 11.5" />,
    Zap: () => <Icon path="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
    Wind: () => <Icon path="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />,
    Music: () => <Icon path="M9 18V5l12-2v13" />,
    Play: () => <Icon path="M5 3l14 9-14 9V3z" />,
    RotateCcw: () => <Icon path="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />,
    Target: () => <Icon path="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />
};

const KnightFigure = () => (
    <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-2xl filter hover:brightness-110 transition-all z-10">
        <defs>
        <linearGradient id="armorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" /><stop offset="50%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="visorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        </defs>
        <ellipse cx="50" cy="95" rx="30" ry="8" fill="black" opacity="0.5" filter="blur(4px)"/>
        <path d="M50 25 C30 25 25 45 25 55 C25 75 30 90 20 95 L80 95 C70 90 75 75 75 55 C75 45 70 25 50 25" fill="url(#armorGradient)" stroke="#1e293b" strokeWidth="2"/>
        <path d="M35 55 Q50 65 65 55" stroke="#3b82f6" strokeWidth="4" fill="none" />
        <circle cx="50" cy="35" r="18" fill="url(#armorGradient)" stroke="#1e293b" strokeWidth="2"/>
        <rect x="41" y="30" width="18" height="6" rx="2" fill="url(#visorGradient)" />
        <path d="M50 17 L50 10" stroke="#f59e0b" strokeWidth="3" />
        <path d="M50 10 Q65 0 70 15" stroke="#dc2626" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
);

const MageFigure = () => (
    <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-2xl filter hover:brightness-110 transition-all z-10">
        <ellipse cx="50" cy="95" rx="30" ry="8" fill="black" opacity="0.5" filter="blur(4px)"/>
        <path d="M35 85 L25 45 L50 35 L75 45 L65 85 Z" fill="#4c1d95" stroke="#2e1065" strokeWidth="2"/>
        <circle cx="50" cy="35" r="16" fill="#1e1b4b"/>
        <path d="M34 35 Q50 15 66 35 Q50 50 34 35" fill="#a855f7"/>
        <path d="M75 25 L65 95" stroke="#78350f" strokeWidth="4"/>
        <circle cx="75" cy="25" r="8" fill="#fbbf24" className="animate-pulse"/>
    </svg>
);

const GoblinFigure = () => (
    <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-2xl filter hover:brightness-110 transition-all z-10">
        <defs>
        <linearGradient id="goblinSkin" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#86efac" /><stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="leather" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a16207" /><stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        </defs>
        <ellipse cx="50" cy="95" rx="30" ry="8" fill="black" opacity="0.5" filter="blur(4px)"/>
        <path d="M30 40 L10 30 L30 50 Z" fill="#4ade80" stroke="#14532d" strokeWidth="2"/>
        <path d="M70 40 L90 30 L70 50 Z" fill="#4ade80" stroke="#14532d" strokeWidth="2"/>
        <path d="M50 35 C30 40 30 55 30 65 C30 85 25 90 25 95 L75 95 C75 90 70 85 70 65 C70 55 70 40 50 35" fill="url(#leather)" stroke="#2a1205" strokeWidth="2"/>
        <path d="M30 65 L70 65" stroke="#713f12" strokeWidth="4"/>
        <circle cx="50" cy="65" r="4" fill="#fcd34d" />
        <circle cx="50" cy="40" r="17" fill="url(#goblinSkin)" stroke="#14532d" strokeWidth="2"/>
        <path d="M43 38 L48 40 L43 42" fill="#ef4444" />
        <path d="M57 38 L52 40 L57 42" fill="#ef4444" />
        <path d="M45 48 Q50 45 55 48" stroke="#14532d" strokeWidth="2" fill="none"/>
        <path d="M48 50 L50 53 L52 50" fill="#fff" />
    </svg>
);

// 动态匹配 JSON 里的职业
const getFigure = (unit) => {
    if (unit.type === 'enemy') return <GoblinFigure />;
    if (unit.id === 'mage') return <MageFigure />;
    if (unit.id === 'ranger') return <MageFigure />; // 占位
    return <KnightFigure />; // 默认战士外观
};

const CombatApp = ({ state, callbacks }) => {
    const { heroes, enemies, phase, logs, diceInfo, activeUnit, turnOrder } = state;
    const { onStartBattle, onSkillSelect, onTargetSelect, onRollComplete, onExecuteComplete, onFinishCombat } = callbacks;

    const [showDice, setShowDice] = useState(false);
    const [diceValue, setDiceValue] = useState(1);
    const [floatingTexts, setFloatingTexts] = useState([]);
    const [visualEffects, setVisualEffects] = useState([]);

    const triggerEffect = (unitId, effectType) => {
        const id = Date.now() + Math.random();
        setVisualEffects(prev => [...prev, { id, unitId, type: effectType }]);
        setTimeout(() => {
            setVisualEffects(prev => prev.filter(e => e.id !== id));
        }, effectType === 'heal' ? 600 : 400); 
    };

    const showFloatingText = (value, type, unitId) => {
        const id = Date.now() + Math.random();
        setFloatingTexts(prev => [...prev, { id, value, type, unitId }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), 1000);
    };

    useEffect(() => {
        if (phase === 'ROLLING' && diceInfo) {
            setShowDice(true);
            let rolls = 0;
            const interval = setInterval(() => {
                setDiceValue(Math.floor(Math.random() * 6) + 1);
                rolls++;
                if (rolls > 15) {
                    clearInterval(interval);
                    setDiceValue(diceInfo.finalRoll);
                    setTimeout(() => onRollComplete(), 500);
                }
            }, 50);
            return () => clearInterval(interval);
        }

        if (phase === 'EXECUTING' && diceInfo) {
            if (diceInfo.isHeal) {
                triggerEffect(diceInfo.targetId, 'heal');
                showFloatingText(`+${diceInfo.damage}`, 'heal', diceInfo.targetId);
            } else {
                triggerEffect(diceInfo.targetId, 'slash');
                triggerEffect(diceInfo.targetId, 'shake');
                showFloatingText(diceInfo.damage, diceInfo.type, diceInfo.targetId);
            }
            setTimeout(() => onExecuteComplete(), 1200);
        }

        if (phase === 'ENEMY_TURN' || phase === 'PLAYER_TURN' || phase === 'WIN' || phase === 'LOSE') {
            setShowDice(false);
        }
    }, [phase, diceInfo]);

    const HealthBar = ({ current, max, isEnemy }) => (
        <div className="w-full bg-stone-900 h-3 rounded-full border border-stone-600 overflow-hidden relative mt-1">
            <div className={`h-full transition-all duration-500 ease-out ${isEnemy ? 'bg-red-600' : 'bg-green-600'}`} style={{ width: `${Math.max(0, (current / max) * 100)}%` }} />
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white tracking-wider shadow-sm">
                {current} / {max}
            </div>
        </div>
    );

    const renderUnitCard = (unit, isEnemy) => {
        const isActive = activeUnit?.id === unit.id && phase !== 'WIN' && phase !== 'LOSE' && phase !== 'START';
        const isDead = unit.hp <= 0;
        const canBeTargeted = phase === 'AWAIT_TARGET' && isEnemy && !isDead;
        
        const activeUnitEffects = visualEffects.filter(e => e.unitId === unit.id);
        const hasShake = activeUnitEffects.some(e => e.type === 'shake');
        
        return (
            <div 
                key={unit.id}
                onClick={() => canBeTargeted && onTargetSelect(unit.id)}
                className={`
                    relative w-48 bg-stone-800/90 backdrop-blur-sm border-2 rounded-lg p-3 transition-all duration-300 transform
                    ${isActive && !isEnemy && !hasShake ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105' : 'border-stone-600'}
                    ${isActive && isEnemy && !hasShake ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-105' : ''}
                    ${canBeTargeted && !hasShake ? 'cursor-pointer hover:border-rose-400 hover:scale-110 shadow-[0_0_20px_rgba(244,63,94,0.4)]' : ''}
                    ${isDead ? 'opacity-40 grayscale scale-95' : ''}
                    ${hasShake ? 'shake-effect border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : ''} 
                `}
            >
                {activeUnitEffects.map(effect => (
                    effect.type === 'slash' ? <div key={effect.id} className="slash-effect"></div> :
                    effect.type === 'heal' ? <div key={effect.id} className="heal-effect"></div> : null
                ))}

                <div className="absolute -top-10 left-0 w-full flex justify-center pointer-events-none z-50">
                    {floatingTexts.filter(ft => ft.unitId === unit.id).map(ft => (
                        <div key={ft.id} className={`
                            absolute animate-bounce-short text-2xl font-black drop-shadow-md
                            ${ft.type === 'weak' ? 'text-gray-400 text-lg' : ''}
                            ${ft.type === 'normal' ? 'text-white' : ''}
                            ${ft.type === 'crit' ? 'text-amber-400 scale-125' : ''}
                            ${ft.type === 'perfect' ? 'text-red-500 scale-150' : ''}
                            ${ft.type === 'damage' ? 'text-red-600' : ''}
                            ${ft.type === 'heal' ? 'text-green-400 scale-110' : ''}
                        `}>
                            {ft.value}
                        </div>
                    ))}
                </div>
                
                {canBeTargeted && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 animate-bounce text-rose-500 z-20">
                        <Icons.Target />
                    </div>
                )}

                <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-sm truncate ${isEnemy ? 'text-rose-100' : 'text-amber-100'}`}>{unit.name}</h3>
                    {isEnemy && <div className="bg-rose-900/50 px-2 py-0.5 rounded text-[10px] text-rose-300 border border-rose-800">LVL {unit.level || 1}</div>}
                    {!isEnemy && (
                        <div className="flex gap-0.5 mt-1">
                            {[1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />)}
                        </div>
                    )}
                </div>
                <div className="flex justify-center my-2 transform transition-transform hover:scale-105 cursor-default drop-shadow-lg">
                    {getFigure(unit)}
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-stone-400"><span>HP</span><span>{isEnemy ? '力量:'+unit.strength : '护甲:'+unit.defense}</span></div>
                    <HealthBar current={unit.hp} max={unit.maxHp} isEnemy={isEnemy} />
                </div>
            </div>
        );
    };

    return (
        <div className="w-full min-h-screen bg-slate-950 text-stone-200 font-sans selection:bg-amber-500/30 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-stone-800 rounded-xl shadow-2xl border-4 border-stone-700 overflow-hidden relative flex flex-col min-h-[650px]">
                
                {/* 顶部状态栏，复刻原来的小圆点逻辑 */}
                <div className="bg-stone-900 z-20 p-3 flex justify-between items-center border-b border-stone-700 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded text-xs font-bold tracking-widest ${activeUnit?.type === 'player' && phase !== 'START' ? 'bg-amber-600 text-white animate-pulse' : 'bg-stone-800 text-stone-400'}`}>
                            玩家阶段
                        </div>
                        
                        <div className="flex gap-1 items-center px-4">
                            {turnOrder && turnOrder.map((unit, idx) => (
                                <div key={idx} className={`w-2 h-2 rounded-full ${idx === 0 ? (unit.type==='player'?'bg-amber-400':'bg-rose-500') : 'bg-stone-600'}`} />
                            ))}
                        </div>

                        <div className={`px-3 py-1 rounded text-xs font-bold tracking-widest ${activeUnit?.type === 'enemy' && phase !== 'START' ? 'bg-rose-800 text-white animate-pulse' : 'bg-stone-800 text-stone-400'}`}>
                            敌方阶段
                        </div>
                    </div>
                    <div className="text-stone-400 text-xs font-mono">FTK COMBAT V2 // ENHANCED FX</div>
                </div>

                <div className="flex-1 relative overflow-hidden flex justify-between items-center perspective-1000 bg-stone-900 px-8 py-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-700 via-stone-900 to-black opacity-100 z-0"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-40 mix-blend-overlay z-0"></div>
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        <div className="particle p1"></div><div className="particle p2"></div>
                        <div className="particle p3"></div><div className="particle p4"></div>
                    </div>

                    <div className="relative z-10 w-full h-full flex justify-between items-center">
                        <div className="flex flex-col gap-4">
                            {heroes.map(p => renderUnitCard(p, false))}
                        </div>

                        <div className="flex flex-col items-center justify-center w-48 flex-shrink-0">
                            {showDice ? (
                                <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center">
                                    <div className={`
                                        w-20 h-20 bg-amber-100 rounded-xl border-4 border-amber-600 
                                        flex items-center justify-center text-4xl font-black text-amber-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]
                                        ${phase === 'ROLLING' ? 'animate-spin-slow' : ''}
                                    `}>
                                        {diceValue}
                                    </div>
                                    <div className="mt-4 text-center bg-black/40 p-2 rounded backdrop-blur-sm">
                                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Roll Result</p>
                                        <p className="text-xs text-stone-300 mt-1">
                                            {diceInfo?.desc || (diceValue <= 2 ? '0.5x (偏斜)' : diceValue === 6 ? '1.5x (暴击!)' : diceValue === 5 ? '1.2x (重击)' : '1.0x (命中)')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                (phase === 'WIN' || phase === 'LOSE') ? (
                                    <div className="text-center">
                                        <h2 className={`text-4xl font-black mb-2 drop-shadow-lg ${phase === 'WIN' ? 'text-amber-400' : 'text-red-500'}`}>
                                            {phase === 'WIN' ? 'VICTORY' : 'DEFEAT'}
                                        </h2>
                                        <button onClick={onFinishCombat} className="flex items-center gap-2 bg-stone-200 text-stone-900 px-6 py-2 rounded-full font-bold hover:bg-white hover:scale-105 transition-all shadow-lg mx-auto mt-4 text-sm">
                                            <Icons.RotateCcw /> 返回地图
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-stone-500 font-bold text-2xl opacity-20 select-none mix-blend-overlay">VS</div>
                                )
                            )}
                        </div>

                        <div className="flex flex-col gap-4">
                            {enemies.map(e => renderUnitCard(e, true))}
                        </div>
                    </div>
                </div>

                <div className="h-44 bg-stone-900 border-t-4 border-stone-800 flex z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                    <div className="w-1/2 p-4 border-r border-stone-800 flex flex-col justify-center">
                        <div className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-2"><Icons.Sword /> 战斗技能指挥</span>
                            {activeUnit?.type === 'player' && phase === 'PLAYER_TURN' && <span className="text-amber-500 animate-pulse text-[10px]">等待 {activeUnit.name} 指示</span>}
                        </div>
                        
                        {phase === 'START' ? (
                            <div className="flex justify-center h-full items-center pb-4">
                                <button onClick={onStartBattle} className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded font-bold flex items-center gap-2 animate-pulse shadow-lg text-sm">
                                    <Icons.Play /> 开始战斗
                                </button>
                            </div>
                        ) : phase === 'AWAIT_TARGET' ? (
                             <div className="flex-1 flex flex-col justify-center items-center bg-rose-500/10 border border-dashed border-rose-500/30 rounded-lg pb-2">
                                <p className="text-rose-400 font-bold text-xs flex items-center gap-2 mb-2">
                                    <Icons.Target /> 请点击右上方的敌人作为目标
                                </p>
                                <button onClick={() => onSkillSelect(null)} className="text-[10px] bg-stone-800 px-3 py-1 rounded hover:bg-stone-700 text-stone-300">
                                    取消施法
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 h-full pb-2">
                                {/* 修复：这里改成遍历 skills 而不是 attacks */}
                                {activeUnit?.type === 'player' ? activeUnit.skills.map((attack, idx) => (
                                    <button
                                        key={attack.id || idx}
                                        disabled={phase !== 'PLAYER_TURN'}
                                        onClick={() => onSkillSelect(attack)}
                                        className={`
                                            relative px-3 py-1.5 rounded-lg border-2 flex items-center gap-2 transition-all text-left group
                                            ${phase === 'PLAYER_TURN' 
                                            ? 'bg-stone-800 border-stone-600 hover:border-amber-500 hover:bg-stone-750 cursor-pointer text-stone-200 shadow-md' 
                                            : 'bg-stone-900 border-stone-800 text-stone-600 cursor-not-allowed grayscale'}
                                        `}
                                    >
                                        <div className={`p-1 rounded-md ${phase === 'PLAYER_TURN' ? 'bg-stone-700 text-amber-400 group-hover:text-amber-300' : 'bg-stone-800 text-stone-600'}`}>
                                            {attack.type === 'magic' ? <Icons.Zap /> : attack.type === 'heal' ? <Icons.Music /> : <Icons.Sword />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold truncate">{attack.name}</div>
                                            <div className="text-[9px] opacity-60 truncate">{attack.desc}</div>
                                        </div>
                                        <div className="text-[9px] font-mono absolute top-1 right-2 opacity-30">
                                            {attack.type === 'magic' ? 'MAG' : attack.type === 'heal' ? 'HEAL' : 'DMG'} {attack.power}
                                        </div>
                                    </button>
                                )) : (
                                    <div className="col-span-2 flex items-center justify-center text-xs text-stone-600 font-mono tracking-widest pb-4">
                                        ENEMY TURN COMPUTING...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="w-1/2 p-4 bg-black/20 overflow-hidden flex flex-col">
                        <div className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">战斗记录</div>
                        <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                            {logs.map((log, i) => (
                                <div key={i} className={`text-xs py-1 border-b border-white/5 ${i === 0 ? 'text-amber-100 font-medium' : 'text-stone-500'}`}>
                                    <span className="opacity-30 mr-2">[{logs.length - i}]</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 暴露全局方法供原生 JS (UIManager.js) 挂载使用
window.renderCombatUI = function(containerId, combatState, callbacks) {
    const container = document.getElementById(containerId);
    if (!window.combatRoot) window.combatRoot = ReactDOM.createRoot(container);
    window.combatRoot.render(<CombatApp state={combatState} callbacks={callbacks} />);
};

window.unmountCombatUI = function() {
    if (window.combatRoot) { window.combatRoot.unmount(); window.combatRoot = null; }
};