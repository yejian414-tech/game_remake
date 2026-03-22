// src/ui/InventoryUI.js

export class InventoryUI {
    constructor() {
        this.sharedStorage = { weapons: [], items: [] };
        this.heroes = [];
        this.activeIndex = 0;
        this.isOpen = false;

        this.btn = document.createElement("button");
        this.btn.textContent = "🎒";
        this.btn.title = "Inventory (B)";
        this.btn.style.cssText = [
            "position:fixed",
            "right:18px",
            "top:18px",
            "width:46px",
            "height:46px",
            "border-radius:12px",
            "border:1px solid rgba(255,255,255,0.25)",
            "background:rgba(20,20,40,0.85)",
            "color:white",
            "cursor:pointer",
            "z-index:150",
            "font-size:20px",
        ].join(";");
        document.body.appendChild(this.btn);

        this.panel = document.createElement("div");
        this.panel.style.cssText = [
            "position:fixed",
            "right:18px",
            "top:72px",
            "width:780px",
            "max-height:70vh",
            "overflow:auto",
            "padding:14px",
            "border-radius:14px",
            "border:1px solid rgba(255,255,255,0.18)",
            "background:rgba(10,10,25,0.92)",
            "color:white",
            "z-index:150",
            "display:none",
            "box-shadow:0 12px 30px rgba(0,0,0,0.45)",
            "font-family:sans-serif",
        ].join(";");
        document.body.appendChild(this.panel);

        this.btn.addEventListener("click", () => this.toggle());

        window.addEventListener("keydown", (e) => {
            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
            if (e.key === "b" || e.key === "B") this.toggle();
            if (e.key === "Escape" && this.isOpen) this.close();
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.panel.style.display = this.isOpen ? "block" : "none";
        if (this.isOpen) this.render();
    }

    close() {
        this.isOpen = false;
        this.panel.style.display = "none";
    }

    update(heroes) {
        this.heroes = Array.isArray(heroes) ? heroes : [];
        if (this.activeIndex >= this.heroes.length) this.activeIndex = 0;
        if (this.isOpen) this.render();
    }

    render() {
        const heroes = this.heroes;

        if (!heroes || heroes.length === 0) {
            this.panel.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-weight:700;font-size:16px;">🎒 Inventory</div>
                    <button id="inv-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;">✕</button>
                </div>
                <div style="opacity:.75;">No party info (select heroes first).</div>
            `;
            this.panel.querySelector("#inv-close")?.addEventListener("click", () => this.close());
            return;
        }

        const tabs = heroes.map((h, i) => {
            const active = i === this.activeIndex;
            return `
                <button class="inv-tab" data-i="${i}"
                    style="margin-right:6px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);
                    background:${active ? "rgba(243,156,18,0.25)" : "rgba(255,255,255,0.06)"};
                    color:white;cursor:pointer;">
                    ${h.name ?? `Hero${i + 1}`}
                </button>
            `;
        }).join("");

        const hero = heroes[this.activeIndex];
        const hp = hero.hp ?? 0;
        const maxHp = hero.maxHp ?? hero.hp ?? 0;


// 武器槽
        const weaponSlotsHTML = `
    <div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;">
        <div style="font-weight:700;margin-bottom:8px;">⚔️ Weapon Slots</div>
        ${(hero.weaponSlots ?? [null, null]).map((w, i) => `
            <div class="weapon-slot" data-slot="${i}" data-accept="weapon"
                style="padding:10px;border:1px dashed rgba(243,156,18,0.5);border-radius:10px;min-height:50px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
                ${w
            ? `<div class="equipped-weapon" data-slot="${i}" draggable="true"
                        title="${w.name} (double-click to unequip)"
                        style="flex:1;display:flex;align-items:center;gap:8px;cursor:grab;">
                        <canvas class="item-icon" data-icon="sword" width="32" height="32" style="pointer-events:none;"></canvas>
                        <div style="pointer-events:none;">
                            <div style="font-weight:700;font-size:13px;">${w.name}</div>
                            <div style="opacity:.6;font-size:11px;">${w.rarity ?? ''} — double-click to unequip</div>
                        </div>
                    </div>`
            : `<span style="opacity:.4;font-size:13px;">⚔️ Weapon Slots ${i + 1}：空</span>`
        }
            </div>
        `).join('')}
    </div>
`;

// 道具槽（无限）
        const equippedItems = (hero.equipSlots ?? []).filter(it => it != null);
        const itemSlotsHTML = `
    <div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;">
        <div style="font-weight:700;margin-bottom:8px;">🧪  Item Slots</div>
        ${equippedItems.length === 0
            ? `<div class="item-slot" data-accept="item"
                style="padding:10px;border:1px dashed rgba(52,211,153,0.4);border-radius:10px;min-height:50px;display:flex;align-items:center;justify-content:center;opacity:.4;">
                Drag item here to equip</div>`
            : `<div style="display:flex;flex-wrap:wrap;gap:8px;">
    ${equippedItems.filter(it => it != null).map((it, i) => `
       <div class="equipped-item" data-slot="${i}" draggable="true"
    title="${it.name}"
    style="width:48px;height:48px;border:1px dashed rgba(52,211,153,0.5);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:grab;position:relative;font-size:10px;text-align:center;gap:2px;">
    <span style="font-size:20px;pointer-events:none;">${_getItemEmoji(it.icon)}</span>
    <span style="opacity:.7;pointer-events:none;overflow:hidden;width:44px;white-space:nowrap;text-overflow:ellipsis;">${it.name}</span>
</div>
    `).join('')}
</div>`
        }
       
        <div class="item-slot" data-accept="item"
            style="padding:10px;border:1px dashed rgba(52,211,153,0.3);border-radius:10px;min-height:50px;display:flex;align-items:center;justify-content:center;opacity:.4;margin-top:6px;">
            + Drag item here
        </div>
    </div>
`;

        this.panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-weight:700;font-size:16px;">🎒 Inventory</div>
        <button id="inv-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;">✕</button>
    </div>

    <div style="display:flex;gap:12px;">

        <!-- 左侧共用存放区 -->
        <div id="shared-storage" style="width:220px;flex-shrink:0;border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:10px;overflow-y:auto;max-height:60vh;">
            
            <div style="font-weight:700;margin-bottom:8px;">⚔️ Weapons</div>
            <div id="storage-weapons" style="min-height:40px;margin-bottom:12px;">
                ${this.sharedStorage.weapons.length === 0
            ? `<div style="opacity:.4;font-size:12px;">No weapons</div>`
            : this.sharedStorage.weapons.map((w, i) => `
                        <div class="storage-item" data-stype="weapon" data-sidx="${i}" draggable="true"
                            style="padding:8px;border:1px solid rgba(243,156,18,0.4);border-radius:8px;margin-bottom:6px;cursor:grab;font-size:13px;">
                            <div style="font-weight:700;">${w.name}</div>
                            <div style="opacity:.6;font-size:11px;">${w.rarity ?? ''}</div>
                        </div>
                    `).join('')
        }
            </div>

            <div style="font-weight:700;margin-bottom:8px;">🧪 Items</div>
            <div id="storage-items" style="min-height:40px;">
                ${this.sharedStorage.items.length === 0
            ? `<div style="opacity:.4;font-size:12px;">No items</div>`
            : this.sharedStorage.items.map((it, i) => `
                        <div class="storage-item" data-stype="item" data-sidx="${i}" draggable="true"
                            style="padding:8px;border:1px solid rgba(52,211,153,0.4);border-radius:8px;margin-bottom:6px;cursor:grab;font-size:13px;">
                            <div style="font-weight:700;">${it.name}</div>
                            <div style="opacity:.6;font-size:11px;">${it.rarity ?? ''}</div>
                        </div>
                    `).join('')
        }
            </div>
        </div>

        <!-- 右侧角色区 -->
        <div style="flex:1;">
            <div style="margin-bottom:10px;">${tabs}</div>

            <div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;">
    <div style="font-weight:700;margin-bottom:6px;">Character Stats</div>
    <div style="opacity:.9;">HP ${hp} / ${maxHp}</div>
    <div style="opacity:.9;">ATK ${hero.attack ?? 0} | DEF ${hero.defense ?? 0} | SPD ${hero.speed ?? 0}</div>
    <div style="opacity:.75;font-size:12px;margin-top:4px;">
        STR ${hero.strength ?? 0} | TOU ${hero.toughness ?? 0} | AGI ${hero.agility ?? 0} | INT ${hero.intellect ?? 0}
    </div>
</div>


${weaponSlotsHTML}
${itemSlotsHTML}
       </div>
    </div>
        `;

        // 关闭按钮
        this.panel.querySelector("#inv-close")?.addEventListener("click", () => this.close());

// Tab 切换
        this.panel.querySelectorAll(".inv-tab").forEach((b) => {
            b.addEventListener("click", () => {
                this.activeIndex = Number(b.getAttribute("data-i") ?? 0);
                this.render();
            });
        });

// 左侧存放区物品 → 拖拽开始
        // 左侧存放区物品 → 拖拽开始 + 双击装备
        this.panel.querySelectorAll(".storage-item").forEach((el) => {
            el.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("dragFrom", "storage");
                e.dataTransfer.setData("stype", el.dataset.stype);
                e.dataTransfer.setData("sidx", el.dataset.sidx);
            });
            el.addEventListener("dblclick", () => {
                const stype = el.dataset.stype;
                const sidx = Number(el.dataset.sidx);
                if (stype === "weapon") {
                    const weapon = this.sharedStorage.weapons[sidx];
                    if (!weapon) return;
                    // 装到第一个空武器槽
                    const emptySlot = (hero.weaponSlots ?? [null, null]).findIndex(w => w === null);
                    if (emptySlot === -1) {
                        this._showSlotError("No empty weapon slots!");
                        return;
                    }
                    this.sharedStorage.weapons.splice(sidx, 1);
                    hero.weaponSlots[emptySlot] = weapon;
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                } else {
                    const item = this.sharedStorage.items[sidx];
                    if (!item) return;
                    this.sharedStorage.items.splice(sidx, 1);
                    hero.equipSlots = (hero.equipSlots ?? []).filter(i => i != null);
                    hero.equipSlots.push(item);
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                }
                this.render();
            });
        });
        // 已装备武器 → 拖拽开始 + 双击卸下
        this.panel.querySelectorAll(".equipped-weapon").forEach((el) => {
            el.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("dragFrom", "equipped-weapon");
                e.dataTransfer.setData("slotIndex", el.dataset.slot);
            });
            el.addEventListener("dblclick", () => {
                const slotIndex = Number(el.dataset.slot);
                const weapon = hero.weaponSlots?.[slotIndex];
                if (!weapon) return;
                hero.weaponSlots[slotIndex] = null;
                this.sharedStorage.weapons.push(weapon);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
        });

// 已装备道具 → 拖拽开始 + 双击卸下
        this.panel.querySelectorAll(".equipped-item").forEach((el) => {
            console.log("equipped-item found:", el.dataset.slot);
            el.addEventListener("dragstart", (e) => {
                e.stopPropagation();
                e.dataTransfer.setData("dragFrom", "equipped-item");
                e.dataTransfer.setData("slotIndex", el.dataset.slot);
            });
            el.addEventListener("dblclick", () => {
                console.log("dblclick fired, slot:", el.dataset.slot, "item:", hero.equipSlots?.[Number(el.dataset.slot)]);
                const slotIndex = Number(el.dataset.slot);
                const item = hero.equipSlots?.[slotIndex];
                if (!item) return;
                hero.equipSlots.splice(slotIndex, 1);
                this.sharedStorage.items.push(item);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
        });

// 右侧武器槽 → 接受拖拽
        this.panel.querySelectorAll(".weapon-slot").forEach((slotEl) => {
            slotEl.addEventListener("dragover", (e) => {
                e.preventDefault();
                slotEl.style.background = "rgba(243,156,18,0.12)";
            });
            slotEl.addEventListener("dragleave", () => {
                slotEl.style.background = "transparent";
            });
            slotEl.addEventListener("drop", (e) => {
                e.preventDefault();
                slotEl.style.background = "transparent";

                const dragFrom = e.dataTransfer.getData("dragFrom");
                const stype = e.dataTransfer.getData("stype");
                const sidx = Number(e.dataTransfer.getData("sidx"));
                const slotIndex = Number(slotEl.dataset.slot);

                if (dragFrom !== "storage" || stype !== "weapon") {
                    this._showSlotError("⚔️ Weapon slots only!");
                    return;
                }

                const weapon = this.sharedStorage.weapons[sidx];
                if (!weapon) return;

                // 武器槽已有武器则换回存放区
                const prev = hero.weaponSlots?.[slotIndex];
                if (prev) this.sharedStorage.weapons.push(prev);

                this.sharedStorage.weapons.splice(sidx, 1);
                hero.weaponSlots = hero.weaponSlots ?? [null, null];
                hero.weaponSlots[slotIndex] = weapon;
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();

                this.render();
            });
        });

// 右侧道具槽 → 接受拖拽
        this.panel.querySelectorAll(".item-slot").forEach((slotEl) => {
            slotEl.addEventListener("dragover", (e) => {
                e.preventDefault();
                slotEl.style.background = "rgba(52,211,153,0.12)";
            });
            slotEl.addEventListener("dragleave", () => {
                slotEl.style.background = "transparent";
            });
            slotEl.addEventListener("drop", (e) => {
                e.preventDefault();
                slotEl.style.background = "transparent";

                const dragFrom = e.dataTransfer.getData("dragFrom");
                const stype = e.dataTransfer.getData("stype");
                const sidx = Number(e.dataTransfer.getData("sidx"));

                if (dragFrom !== "storage" || stype !== "item") {
                    this._showSlotError("🧪 Item slots only！");
                    return;
                }

                const item = this.sharedStorage.items[sidx];
                if (!item) return;

                this.sharedStorage.items.splice(sidx, 1);
                hero.equipSlots = (hero.equipSlots ?? []).filter(i => i != null);
                hero.equipSlots.push(item);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();

                this.render();
            });
        });


// 右侧道具卸下按钮
        this.panel.querySelectorAll(".unequip-item-btn").forEach((b) => {
            b.addEventListener("click", () => {
                const slotIndex = Number(b.getAttribute("data-slot"));
                const item = hero.equipSlots?.[slotIndex];
                if (!item) return;
                hero.equipSlots.splice(slotIndex, 1);
                this.sharedStorage.items.push(item);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
        });

// 图标渲染
        this.panel.querySelectorAll(".item-icon").forEach((cvs) => {
            drawItemIconMini(cvs, cvs.dataset.icon);
        });
        // Tooltip 绑定
        this.panel.querySelectorAll(".storage-item").forEach((el) => {
            const stype = el.dataset.stype;
            const sidx = Number(el.dataset.sidx);
            const item = stype === 'weapon'
                ? this.sharedStorage.weapons[sidx]
                : this.sharedStorage.items[sidx];
            if (!item) return;
            el.addEventListener("mouseenter", (e) => this._showTooltip(e, item));
            el.addEventListener("mousemove", (e) => this._moveTooltip(e));
            el.addEventListener("mouseleave", () => this._hideTooltip());
        });

        this.panel.querySelectorAll(".equipped-item").forEach((el) => {
            const slotIndex = Number(el.dataset.slot);
            const item = hero.equipSlots?.[slotIndex];
            if (!item) return;
            el.addEventListener("mouseenter", (e) => this._showTooltip(e, item));
            el.addEventListener("mousemove", (e) => this._moveTooltip(e));
            el.addEventListener("mouseleave", () => this._hideTooltip());
        });

        this.panel.querySelectorAll(".equipped-weapon").forEach((el) => {
            const slotIndex = Number(el.dataset.slot);
            const weapon = hero.weaponSlots?.[slotIndex];
            if (!weapon) return;
            el.addEventListener("mouseenter", (e) => this._showTooltip(e, weapon));
            el.addEventListener("mousemove", (e) => this._moveTooltip(e));
            el.addEventListener("mouseleave", () => this._hideTooltip());
        });
        // 左侧存放区 → 接受从右侧拖回的装备
        const sharedStorageEl = this.panel.querySelector("#shared-storage");
        if (sharedStorageEl) {
            sharedStorageEl.addEventListener("dragover", (e) => {
                e.preventDefault();
                sharedStorageEl.style.background = "rgba(255,255,255,0.05)";
            });
            sharedStorageEl.addEventListener("dragleave", () => {
                sharedStorageEl.style.background = "transparent";
            });
            sharedStorageEl.addEventListener("drop", (e) => {
                e.preventDefault();
                sharedStorageEl.style.background = "transparent";

                const dragFrom = e.dataTransfer.getData("dragFrom");
                const slotIndex = Number(e.dataTransfer.getData("slotIndex"));

                if (dragFrom === "equipped-weapon") {
                    const weapon = hero.weaponSlots?.[slotIndex];
                    if (!weapon) return;
                    hero.weaponSlots[slotIndex] = null;
                    this.sharedStorage.weapons.push(weapon);
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                    this.render();
                } else if (dragFrom === "equipped-item") {
                    const item = hero.equipSlots?.[slotIndex];
                    if (!item) return;
                    hero.equipSlots.splice(slotIndex, 1);
                    this.sharedStorage.items.push(item);
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                    this.render();
                }
            });
        }
    }




    _showSlotError(msg) {
        const err = document.createElement('div');
        err.textContent = msg;
        err.style.cssText = [
            'position:fixed',
            'bottom:80px',
            'left:50%',
            'transform:translateX(-50%)',
            'background:rgba(231,76,60,0.92)',
            'color:white',
            'padding:8px 20px',
            'border-radius:10px',
            'font-weight:bold',
            'z-index:9999',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(err);
        setTimeout(() => err.remove(), 1500);
    }
    _initTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'inv-tooltip';
        tooltip.style.cssText = [
            'position:fixed',
            'background:rgba(10,10,25,0.95)',
            'border:1px solid rgba(255,255,255,0.18)',
            'border-radius:10px',
            'padding:10px 14px',
            'color:white',
            'font-size:12px',
            'z-index:9999',
            'pointer-events:none',
            'display:none',
            'max-width:200px',
            'font-family:sans-serif',
            'box-shadow:0 4px 12px rgba(0,0,0,0.4)',
        ].join(';');
        document.body.appendChild(tooltip);
        this._tooltip = tooltip;
    }

    _showTooltip(e, item) {
        if (!this._tooltip) this._initTooltip();
        const rarityColors = { common: '#aaa', rare: '#3b82f6', epic: '#a855f7', uncommon: '#22c55e' };
        const color = rarityColors[item.rarity] ?? '#aaa';
        this._tooltip.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;">${item.name}</div>
        <div style="color:${color};font-size:11px;margin-bottom:6px;">${item.rarity ?? 'common'}</div>
        <div style="opacity:.8;line-height:1.4;">${item.desc ?? ''}</div>
        ${item.statBonus && Object.keys(item.statBonus).length > 0
            ? `<div style="margin-top:6px;opacity:.7;font-size:11px;">${Object.entries(item.statBonus).map(([k,v]) => `+${v} ${k}`).join(' | ')}</div>`
            : ''
        }
    `;
        this._tooltip.style.display = 'block';
        this._moveTooltip(e);
    }

    _moveTooltip(e) {
        if (!this._tooltip) return;
        this._tooltip.style.left = (e.clientX + 14) + 'px';
        this._tooltip.style.top = (e.clientY - 10) + 'px';
    }

    _hideTooltip() {
        if (this._tooltip) this._tooltip.style.display = 'none';
    }
// 外部调用：把物品加入共用存放区
    addToStorage(item) {
        if (!item) return;
        const isWeapon = Array.isArray(item.skills) && item.skills.length > 0;
        if (isWeapon) {
            this.sharedStorage.weapons.push(item);
        } else {
            this.sharedStorage.items.push(item);
        }
        if (this.isOpen) this.render();
    }

// 外部调用：获取共用存放区
    getStorage() {
        return this.sharedStorage;
    }
}
function _getItemEmoji(iconType) {
    switch(iconType) {
        case 'sword':   return '⚔️';
        case 'shield':  return '🛡️';
        case 'potion':  return '🧪';
        case 'boots':   return '👟';
        case 'clover':  return '🍀';
        default:        return '📦';
    }
}

function drawItemIconMini(canvas, iconType) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 32, 32);

    ctx.save();
    ctx.translate(16, 16);
    ctx.scale(0.6, 0.6);

    switch (iconType) {
        case 'sword':
            ctx.strokeStyle = "#ddd";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(0, 10);
            ctx.stroke();
            break;

        case 'shield':
            ctx.fillStyle = "#4a90e2";
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(10, -10);
            ctx.lineTo(10, 5);
            ctx.lineTo(0, 15);
            ctx.lineTo(-10, 5);
            ctx.lineTo(-10, -10);
            ctx.closePath();
            ctx.fill();
            break;

        default:
            ctx.fillStyle = "#aaa";
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
    }

    ctx.restore();
}