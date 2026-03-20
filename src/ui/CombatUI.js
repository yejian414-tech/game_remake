// src/ui/CombatUI.js
// Keeps the original left-hero / right-enemy layout.
// Adds two new buttons in the action panel: "Switch Weapon" and "Use Item".

const { useState, useEffect } = React;

// ─── 2D Spinning Dice ─────────────────────────────────────────────────────────
// Pip positions for each face value, in a 60×60 grid centred at (30,30)
const PIP_POSITIONS = {
  1: [[30, 30]],
  2: [[16, 16], [44, 44]],
  3: [[16, 16], [30, 30], [44, 44]],
  4: [[16, 16], [44, 16], [16, 44], [44, 44]],
  5: [[16, 16], [44, 16], [30, 30], [16, 44], [44, 44]],
  6: [[16, 14], [44, 14], [16, 30], [44, 30], [16, 46], [44, 46]],
};

const DiceSVG = ({ value, rolling }) => {
  const v = Math.max(1, Math.min(6, value || 1));
  const pips = PIP_POSITIONS[v] || [];

  // Result colour tint on the face
  const faceColor = rolling ? '#fef3c7'
    : v <= 2 ? '#e2e8f0'   // weak  — cool grey
    : v <= 4 ? '#fef9ee'   // normal — warm white
    : v === 5 ? '#fff7ed'  // heavy  — orange tint
    : '#fffbeb';           // crit   — golden tint

  const borderColor = rolling ? '#d97706'
    : v <= 2 ? '#94a3b8'
    : v <= 4 ? '#b45309'
    : v === 5 ? '#ea580c'
    : '#d97706';

  const pipColor = v <= 2 ? '#475569' : '#1c1917';

  return (
    <div style={{
      animation: rolling ? 'dice2d-spin 0.15s linear infinite' : 'none',
      transformOrigin: 'center',
      display: 'inline-block',
    }}>
      <svg viewBox="0 0 60 60" width="88" height="88" style={{
        filter: rolling
          ? 'drop-shadow(0 0 10px rgba(251,191,36,0.7)) drop-shadow(0 4px 12px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 4px 14px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(251,191,36,0.3))',
        display: 'block',
      }}>
        {/* Shadow */}
        <ellipse cx="30" cy="57" rx="22" ry="4" fill="rgba(0,0,0,0.35)" />

        {/* Dice body */}
        <rect x="3" y="3" width="54" height="54" rx="10" ry="10"
          fill={faceColor} stroke={borderColor} strokeWidth="2.5" />

        {/* Inner bevel highlight (top-left) */}
        <rect x="5" y="5" width="50" height="50" rx="8" ry="8"
          fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />

        {/* Inner bevel shadow (bottom-right) */}
        <path d="M13 53 Q53 53 53 13" fill="none"
          stroke="rgba(0,0,0,0.12)" strokeWidth="3" strokeLinecap="round" />

        {/* Pips */}
        {pips.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4.2" fill={pipColor}
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
        ))}
      </svg>
    </div>
  );
};

// ─── SVG Figures ─────────────────────────────────────────────────────────────
const KnightFigure = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <defs>
      <linearGradient id="kArmor" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#475569"/>
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="110" rx="28" ry="8" fill="#1e293b" opacity="0.4"/>
    <rect x="32" y="55" width="36" height="48" rx="6" fill="url(#kArmor)" stroke="#334155" strokeWidth="2"/>
    <circle cx="50" cy="38" r="20" fill="#94a3b8" stroke="#475569" strokeWidth="2"/>
    <rect x="38" y="28" width="24" height="14" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1.5"/>
    <rect x="86" y="60" width="8" height="36" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5"/>
    <rect x="16" y="58" width="16" height="28" rx="4" fill="#475569" stroke="#334155" strokeWidth="1.5"/>
  </svg>
);

const MageFigure = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <defs>
      <radialGradient id="mGlow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#312e81" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="110" rx="24" ry="7" fill="#1e293b" opacity="0.4"/>
    <ellipse cx="50" cy="60" rx="40" ry="50" fill="url(#mGlow)"/>
    <path d="M30 55 Q50 45 70 55 L68 100 Q50 108 32 100 Z" fill="#312e81" stroke="#4338ca" strokeWidth="2"/>
    <circle cx="50" cy="38" r="18" fill="#4338ca" stroke="#312e81" strokeWidth="2"/>
    <path d="M50 20 L53 30 L46 25 L54 25 L47 30 Z" fill="#fbbf24"/>
    <circle cx="50" cy="38" r="7" fill="#818cf8" opacity="0.8"/>
    <line x1="68" y1="55" x2="88" y2="30" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="89" cy="28" r="5" fill="#c7d2fe"/>
  </svg>
);

const GoblinFigure = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <defs>
      <linearGradient id="gSkin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/>
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="110" rx="22" ry="7" fill="#1e293b" opacity="0.4"/>
    <path d="M30 60 Q50 52 70 60 L68 98 Q50 105 32 98 Z" fill="url(#gSkin)" stroke="#15803d" strokeWidth="2"/>
    <circle cx="50" cy="40" r="22" fill="url(#gSkin)" stroke="#15803d" strokeWidth="2"/>
    <ellipse cx="42" cy="38" rx="5" ry="4" fill="#dc2626"/>
    <ellipse cx="58" cy="38" rx="5" ry="4" fill="#dc2626"/>
    <ellipse cx="42" cy="38" rx="2" ry="2.5" fill="#1e293b"/>
    <ellipse cx="58" cy="38" rx="2" ry="2.5" fill="#1e293b"/>
    <path d="M42 50 Q50 55 58 50" stroke="#15803d" strokeWidth="2" fill="none"/>
    <path d="M43 52 L45 56 L47 52" fill="white"/>
    <path d="M53 52 L55 56 L57 52" fill="white"/>
    <path d="M28 28 L36 38 M72 28 L64 38" stroke="#15803d" strokeWidth="3" strokeLinecap="round"/>
    <rect x="60" y="58" width="6" height="28" rx="2" fill="#92400e"/>
    <path d="M58 55 L65 52 L62 60 Z" fill="#9ca3af"/>
  </svg>
);

const BossFigure = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <defs>
      <radialGradient id="bossGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.6"/>
        <stop offset="100%" stopColor="#450a0a" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="115" rx="30" ry="9" fill="#1e293b" opacity="0.5"/>
    <circle cx="50" cy="60" r="45" fill="url(#bossGlow)"/>
    <path d="M20 55 Q50 35 80 55 L78 100 Q50 112 22 100 Z" fill="#7f1d1d" stroke="#dc2626" strokeWidth="2"/>
    <circle cx="50" cy="38" r="24" fill="#991b1b" stroke="#7f1d1d" strokeWidth="2"/>
    <path d="M30 26 L36 40 L26 34 Z" fill="#dc2626"/>
    <path d="M70 26 L64 40 L74 34 Z" fill="#dc2626"/>
    <ellipse cx="42" cy="36" rx="6" ry="5" fill="#fca5a5"/>
    <ellipse cx="58" cy="36" rx="6" ry="5" fill="#fca5a5"/>
    <ellipse cx="42" cy="36" rx="3" ry="3" fill="#1e293b"/>
    <ellipse cx="58" cy="36" rx="3" ry="3" fill="#1e293b"/>
    <path d="M38 48 Q50 55 62 48" stroke="#dc2626" strokeWidth="2.5" fill="none"/>
  </svg>
);

const getFigure = (unit) => {
  if (unit.type === 'enemy') return unit.monsterType === 'boss' ? <BossFigure/> : <GoblinFigure/>;
  if (unit.id === 'mage') return <MageFigure/>;
  return <KnightFigure/>;
};

// ─── Health bar ───────────────────────────────────────────────────────────────
const HealthBar = ({ current, max, isEnemy }) => (
  <div className="w-full bg-stone-900 h-3 rounded-full border border-stone-600 overflow-hidden relative mt-1">
    <div
      className={`h-full transition-all duration-500 ease-out ${isEnemy ? 'bg-red-600' : 'bg-green-600'}`}
      style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
    />
    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white tracking-wider">
      {current} / {max}
    </div>
  </div>
);

// ─── Weapon Switch Modal ──────────────────────────────────────────────────────
const WeaponSwitchModal = ({ hero, onSwitch, onClose }) => {
  const weapons = hero.weaponSlots || [];
  const activeIdx = hero.equippedWeaponIndex ?? 0;
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 rounded-lg">
      <div className="bg-stone-800 border border-stone-600 rounded-xl p-4 w-64 shadow-2xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-amber-400 font-bold text-sm">⚔ Switch Weapon</span>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="space-y-2">
          {weapons.map((w, i) => w ? (
            <button
              key={i}
              onClick={() => { onSwitch(hero, i); onClose(); }}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm ${
                i === activeIdx
                  ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                  : 'border-stone-600 bg-stone-700 hover:border-amber-400 text-stone-200'
              }`}
            >
              <div className="font-semibold">
                {i === activeIdx ? '● ' : '○ '}
                {w.name}
                {i === activeIdx && <span className="text-xs text-amber-500 ml-2">(equipped)</span>}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">
                {w.type} · {w.skills?.length ?? 0} skills
                {w.statBonus ? ' · ' + Object.entries(w.statBonus).map(([k,v]) => `+${v} ${k.toUpperCase().slice(0,3)}`).join(', ') : ''}
              </div>
            </button>
          ) : null)}
        </div>
      </div>
    </div>
  );
};

// ─── Use Item Modal ───────────────────────────────────────────────────────────
const UseItemModal = ({ hero, onUse, onClose }) => {
  const items = (hero.inventory || []).filter(i => i);
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 rounded-lg">
      <div className="bg-stone-800 border border-stone-600 rounded-xl p-4 w-64 shadow-2xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-green-400 font-bold text-sm">🧪 Use Item</span>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-lg leading-none">✕</button>
        </div>
        {items.length === 0 ? (
          <div className="text-stone-500 text-sm text-center py-4">No usable items</div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { onUse(hero, i); onClose(); }}
                className="w-full text-left px-3 py-2 rounded-lg border border-stone-600 bg-stone-700 hover:border-green-400 transition-all text-sm"
              >
                <div className="font-semibold text-stone-200">{item.name}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Unit card (hero or enemy) ────────────────────────────────────────────────
const UnitCard = ({ unit, isEnemy, isActive, canBeTargeted, onTargetSelect,
                    onOpenWeaponSwitch, onOpenUseItem, phase }) => {
  const isDead = unit.hp <= 0;
  const activeWeapon = !isEnemy && (unit.weaponSlots?.[unit.equippedWeaponIndex ?? 0]);

  return (
    <div
      onClick={() => canBeTargeted && onTargetSelect(unit.id)}
      className={`
        relative w-48 bg-stone-800/90 backdrop-blur-sm border-2 rounded-lg p-3 transition-all duration-300
        ${isActive && !isEnemy ? 'border-amber-500 shadow-[0_0_16px_rgba(217,119,6,0.5)] scale-105' : ''}
        ${isActive && isEnemy  ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : ''}
        ${!isActive ? 'border-stone-600' : ''}
        ${isDead ? 'opacity-40 grayscale' : ''}
        ${canBeTargeted ? 'cursor-pointer hover:border-rose-400 hover:scale-105' : ''}
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse
          ${isEnemy ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
          {isEnemy ? '⚔ ACTING' : '▶ YOUR TURN'}
        </div>
      )}
      {canBeTargeted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
          🎯 TARGET
        </div>
      )}

      {/* Figure */}
      <div className="w-24 h-28 mx-auto relative">
        {getFigure(unit)}
        {isDead && <div className="absolute inset-0 flex items-center justify-center text-4xl">💀</div>}
      </div>

      {/* Name */}
      <div className="text-center font-bold text-sm mt-1 text-stone-100 truncate">{unit.name}</div>

      {/* HP bar */}
      <HealthBar current={unit.hp} max={unit.maxHp} isEnemy={isEnemy}/>

      {/* Stats row */}
      <div className="flex justify-between text-[9px] text-stone-500 mt-1 font-mono">
        <span>ATK {unit.attack ?? unit.strength ?? '—'}</span>
        <span>DEF {unit.defense ?? unit.vitality ?? unit.toughness ?? '—'}</span>
        <span>SPD {unit.speed ?? unit.agility ?? '—'}</span>
      </div>

      {/* Active weapon label (hero only) */}
      {!isEnemy && activeWeapon && (
        <div className="text-[9px] text-amber-400 text-center mt-1 truncate">
          ⚔ {activeWeapon.name}
        </div>
      )}

      {/* Switch weapon / use item buttons — only shown on hero's own turn */}
      {!isEnemy && !isDead && isActive && phase === 'PLAYER_TURN' && (
        <div className="flex gap-1 mt-2">
          <button
            onClick={e => { e.stopPropagation(); onOpenWeaponSwitch(unit); }}
            className="flex-1 text-[9px] bg-stone-700 hover:bg-amber-700 border border-stone-600 hover:border-amber-500 rounded px-1 py-1 text-stone-300 hover:text-white transition-all"
          >
            ⚔ Weapon
          </button>
          <button
            onClick={e => { e.stopPropagation(); onOpenUseItem(unit); }}
            className="flex-1 text-[9px] bg-stone-700 hover:bg-green-700 border border-stone-600 hover:border-green-500 rounded px-1 py-1 text-stone-300 hover:text-white transition-all"
          >
            🧪 Item
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main CombatApp ───────────────────────────────────────────────────────────
const CombatApp = ({ state, callbacks }) => {
  const { heroes, enemies, phase, logs, diceInfo, activeUnit, turnOrder } = state;
  const {
    onStartBattle, onSkillSelect, onTargetSelect,
    onRollComplete, onExecuteComplete, onFinishCombat,
    onSwitchWeapon, onUseItem,
  } = callbacks;

  const [showDice, setShowDice]           = useState(false);
  const [diceValue, setDiceValue]         = useState(1);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [visualEffects, setVisualEffects] = useState([]);

  // Modal state: { type: 'weapon'|'item', hero }
  const [modal, setModal] = useState(null);

  const triggerEffect = (unitId, effectType) => {
    const id = Date.now() + Math.random();
    setVisualEffects(prev => [...prev, { id, unitId, type: effectType }]);
    setTimeout(() => setVisualEffects(prev => prev.filter(e => e.id !== id)),
      effectType === 'heal' ? 600 : 400);
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
      const iv = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 6) + 1);
        if (++rolls > 15) {
          clearInterval(iv);
          setDiceValue(diceInfo.finalRoll);
          setTimeout(onRollComplete, 500);
        }
      }, 55);
      return () => clearInterval(iv);
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
      setTimeout(onExecuteComplete, 1200);
    }
    if (['ENEMY_TURN','PLAYER_TURN','WIN','LOSE'].includes(phase)) setShowDice(false);
  }, [phase, diceInfo]);

  const isPlayerTurn = phase === 'PLAYER_TURN';
  const activeHero = isPlayerTurn ? activeUnit : null;
  const activeSkills = activeHero?.skills || [];

  const renderUnitCard = (unit, isEnemy) => {
    const isActive = activeUnit?.id === unit.id && !['WIN','LOSE','START'].includes(phase);
    const isDead   = unit.hp <= 0;
    const canBeTargeted = phase === 'AWAIT_TARGET' && isEnemy && !isDead;
    const hasShake = visualEffects.some(e => e.unitId === unit.id && e.type === 'shake');

    return (
      <div key={unit.id} className={`relative transition-transform ${hasShake ? 'animate-bounce' : ''}`}>
        {/* Floating texts */}
        {floatingTexts.filter(ft => ft.unitId === unit.id).map(ft => (
          <div key={ft.id}
            className="absolute -top-8 left-1/2 -translate-x-1/2 font-black text-xl animate-bounce z-10 pointer-events-none"
            style={{
              color: ft.type === 'heal' ? '#4ade80' : ft.type === 'perfect' ? '#fbbf24'
                : ft.type === 'crit' ? '#f97316' : ft.type === 'weak' ? '#94a3b8' : '#f87171',
              textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
            }}
          >
            {ft.type === 'heal' ? `+${ft.value}` : ft.value}
          </div>
        ))}
        <UnitCard
          unit={unit}
          isEnemy={isEnemy}
          isActive={isActive}
          canBeTargeted={canBeTargeted}
          onTargetSelect={onTargetSelect}
          phase={phase}
          onOpenWeaponSwitch={(hero) => setModal({ type: 'weapon', hero })}
          onOpenUseItem={(hero)   => setModal({ type: 'item',   hero })}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-white select-none font-sans relative">

      {/* ── Modals ── */}
      {modal?.type === 'weapon' && (
        <WeaponSwitchModal
          hero={modal.hero}
          onSwitch={onSwitchWeapon}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'item' && (
        <UseItemModal
          hero={modal.hero}
          onUse={onUseItem}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Battlefield ── */}
      <div className="flex-1 flex items-center justify-around px-8 py-4"
        style={{ background: 'linear-gradient(to bottom, #0f172a 0%, #1c1917 70%, #292524 100%)' }}>

        {/* Heroes — left */}
        <div className="flex flex-col gap-4">
          {heroes.map(h => renderUnitCard(h, false))}
        </div>

        {/* Centre: dice / phase info */}
        <div className="flex flex-col items-center gap-2 min-w-[140px]">
          {showDice ? (
            <div className="flex flex-col items-center gap-1">
              <DiceSVG value={diceValue} rolling={phase === 'ROLLING'} />
              <div className="text-amber-400 text-xs font-bold animate-pulse tracking-widest mt-1">
                {phase === 'ROLLING' ? 'ROLLING…' : (
                  diceValue <= 2 ? '💨 WEAK  ×0.5' :
                  diceValue <= 4 ? '⚔ HIT  ×1.0'  :
                  diceValue === 5 ? '💥 HEAVY ×1.2' :
                                   '⚡ CRIT! ×1.5'
                )}
              </div>
              <div className="text-[10px] text-stone-500 font-mono">[ {diceValue} ]</div>
            </div>
          ) : (phase === 'WIN' || phase === 'LOSE') ? (
            <div className="text-center">
              <h2 className={`text-4xl font-black mb-2 drop-shadow-lg ${phase === 'WIN' ? 'text-amber-400' : 'text-red-500'}`}>
                {phase === 'WIN' ? 'VICTORY' : 'DEFEAT'}
              </h2>
              <button onClick={onFinishCombat}
                className="flex items-center gap-2 bg-stone-200 text-stone-900 px-6 py-2 rounded-full font-bold hover:bg-white hover:scale-105 transition-all shadow-lg mx-auto mt-4 text-sm">
                ← Back to Map
              </button>
            </div>
          ) : (
            <div className="text-stone-500 font-bold text-2xl opacity-20 select-none">VS</div>
          )}
        </div>

        {/* Enemies — right */}
        <div className="flex flex-col gap-4">
          {enemies.map(e => renderUnitCard(e, true))}
        </div>
      </div>

      {/* ── Bottom panel ── */}
      <div className="h-44 bg-stone-900 border-t-4 border-stone-800 flex z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">

        {/* Left: skill buttons */}
        <div className="w-1/2 p-4 border-r border-stone-800 flex flex-col justify-center">
          <div className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider flex items-center justify-between">
            <span>⚔ Combat Actions</span>
            {isPlayerTurn && activeHero && (
              <span className="text-amber-500 animate-pulse text-[10px]">{activeHero.name}'s turn</span>
            )}
          </div>

          {phase === 'START' ? (
            <div className="flex justify-center h-full items-center pb-4">
              <button onClick={onStartBattle}
                className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded font-bold flex items-center gap-2 animate-pulse shadow-lg text-sm">
                ▶ Start Battle
              </button>
            </div>
          ) : phase === 'AWAIT_TARGET' ? (
            <div className="flex-1 flex flex-col justify-center items-center bg-rose-500/10 border border-dashed border-rose-500/30 rounded-lg pb-2">
              <p className="text-rose-400 font-bold text-xs flex items-center gap-2 mb-2">
                🎯 Click an enemy to target
              </p>
              <button onClick={() => onSkillSelect(null)}
                className="text-[10px] bg-stone-800 px-3 py-1 rounded hover:bg-stone-700 text-stone-300">
                Cancel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 h-full pb-2">
              {isPlayerTurn && activeHero ? (
                activeSkills.length > 0 ? activeSkills.map((skill, idx) => (
                  <button
                    key={skill.id || idx}
                    onClick={() => onSkillSelect(skill)}
                    className="relative px-3 py-1.5 rounded-lg border-2 flex items-center gap-2 transition-all text-left group
                      bg-stone-800 border-stone-600 hover:border-amber-500 hover:bg-stone-750 cursor-pointer text-stone-200 shadow-md"
                  >
                    <div className="p-1 rounded-md bg-stone-700 text-amber-400 group-hover:text-amber-300">
                      {skill.type === 'magic' ? '🔮' : skill.type === 'heal' ? '💚' : '⚔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{skill.name}</div>
                      <div className="text-[9px] opacity-60 truncate">{skill.desc}</div>
                    </div>
                    <div className="text-[9px] font-mono absolute top-1 right-2 opacity-30">
                      {skill.type === 'magic' ? 'MAG' : skill.type === 'heal' ? 'HEAL' : 'DMG'} {skill.power}
                    </div>
                  </button>
                )) : (
                  <div className="col-span-2 flex items-center justify-center text-stone-600 text-xs">
                    No weapon equipped
                  </div>
                )
              ) : (
                <div className="col-span-2 flex items-center justify-center text-xs text-stone-600 font-mono tracking-widest pb-4">
                  {phase === 'ROLLING' ? '🎲 ROLLING...' : 'ENEMY TURN...'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: combat log */}
        <div className="w-1/2 p-4 bg-black/20 overflow-hidden flex flex-col">
          <div className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">📜 Combat Log</div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
            {(logs || []).map((log, i) => (
              <div key={i} className={`text-xs py-1 border-b border-white/5 ${i === 0 ? 'text-amber-100 font-medium' : 'text-stone-500'}`}>
                <span className="opacity-30 mr-2">[{(logs.length) - i}]</span>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Mount helpers ────────────────────────────────────────────────────────────
// Inject dice spin keyframe once
if (!document.getElementById('dice2d-style')) {
  const s = document.createElement('style');
  s.id = 'dice2d-style';
  s.textContent = `
    @keyframes dice2d-spin {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
}

window.renderCombatUI = function(containerId, combatState, callbacks) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!window.combatRoot) window.combatRoot = ReactDOM.createRoot(container);
  window.combatRoot.render(<CombatApp state={combatState} callbacks={callbacks}/>);
};

window.unmountCombatUI = function() {
  if (window.combatRoot) { window.combatRoot.unmount(); window.combatRoot = null; }
};