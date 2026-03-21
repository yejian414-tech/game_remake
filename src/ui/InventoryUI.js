// src/ui/InventoryUI.js

export class InventoryUI {
    constructor() {
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
            "width:420px",
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
        const equip0 = hero.equipSlots?.[0] ?? null;
        const equip1 = hero.equipSlots?.[1] ?? null;
        const inv = hero.inventory ?? [];

        const invList = inv.length
            ? inv.map((it, idx) => {
                const rarity = it.rarity ?? "common";
                return `
                    <div class="inv-item" data-idx="${idx}" draggable="true"
                        style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:8px;cursor:grab;">
                        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                            <div>
                                <div style="font-weight:700;display:flex;align-items:center;gap:8px;">
    <canvas class="item-icon" data-icon="${it.icon}" width="32" height="32"></canvas>
    <span>${it.name}</span>
</div>
                                <div style="opacity:.75;font-size:12px;">${it.desc ?? ""}</div>
                                <div style="opacity:.7;font-size:12px;margin-top:4px;">Rarity: ${rarity} | Slot: ${it.slot ?? 0}</div>
                            </div>
                            <button class="inv-use" data-idx="${idx}"
                                style="padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);
                                background:rgba(46,204,113,0.18);color:white;cursor:pointer;">
                                Use/Equip
                            </button>
                        </div>
                    </div>
                `;
            }).join("")
            : `<div style="opacity:.7;">Inventory is empty</div>`;

        this.panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="font-weight:700;font-size:16px;">🎒 Inventory</div>
                <button id="inv-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;">✕</button>
            </div>

            <div style="margin-bottom:10px;">${tabs}</div>

            <div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;">
    <div style="font-weight:700;margin-bottom:6px;">Character Stats</div>
    <div style="opacity:.9;">HP ${hp} / ${maxHp}</div>
    <div style="opacity:.9;">ATK ${hero.attack ?? 0} | DEF ${hero.defense ?? 0} | SPD ${hero.speed ?? 0}</div>
    <div style="opacity:.75;font-size:12px;margin-top:4px;">
        STR ${hero.strength ?? 0} | TOU ${hero.toughness ?? 0} | AGI ${hero.agility ?? 0} | INT ${hero.intellect ?? 0}
    </div>
</div>
<div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;">
    <div style="font-weight:700;margin-bottom:6px;">Equipment Slots</div>

    <div class="equip-slot" data-slot="0"
        style="opacity:.9;margin-bottom:8px;padding:10px;border:1px dashed rgba(255,255,255,0.35);border-radius:10px;min-height:50px;display:flex;align-items:center;justify-content:space-between;">
        
        ${equip0
            ? `
            <div class="equipped-item" data-slot="0" draggable="true"
                style="flex:1;cursor:grab;display:flex;align-items:center;gap:8px;">
                <canvas class="item-icon" data-icon="${equip0.icon}" width="32" height="32"></canvas>
                <span>${equip0.name}</span>
            </div>
            `
            : `<span style="flex:1;">Slot 0: Empty</span>`
        }

        ${equip0
            ? `<button class="unequip-btn" data-slot="0"
                style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(231,76,60,0.18);color:white;cursor:pointer;">
                Unequip
              </button>`
            : ""
        }
    </div>


         
    

    <div class="equip-slot" data-slot="1"
        style="opacity:.9;padding:10px;border:1px dashed rgba(255,255,255,0.35);border-radius:10px;min-height:50px;display:flex;align-items:center;justify-content:space-between;">
        
        ${equip1
            ? `
            <div class="equipped-item" data-slot="1" draggable="true"
                style="flex:1;cursor:grab;display:flex;align-items:center;gap:8px;">
                <canvas class="item-icon" data-icon="${equip1.icon}" width="32" height="32"></canvas>
                <span>${equip1.name}</span>
            </div>
            `
            : `<span style="flex:1;">Slot 1: Empty</span>`
        }

        ${equip1
            ? `<button class="unequip-btn" data-slot="1"
                style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(231,76,60,0.18);color:white;cursor:pointer;">
                Unequip
              </button>`
            : ""
        }
    </div>
</div>

          

           <div style="font-weight:700;margin-bottom:8px;">Item Slots</div>

<div class="inventory-dropzone"
    style="padding:10px;margin-bottom:10px;border:1px dashed rgba(255,255,255,0.35);border-radius:10px;opacity:.8;">
    Item Slots Area (drag equipped items here to unequip)
</div>

${invList}
        `;

        this.panel.querySelector("#inv-close")?.addEventListener("click", () => this.close());

        this.panel.querySelectorAll(".inv-tab").forEach((b) => {
            b.addEventListener("click", () => {
                this.activeIndex = Number(b.getAttribute("data-i") ?? 0);
                this.render();
            });
        });

        this.panel.querySelectorAll(".inv-use").forEach((b) => {
            b.addEventListener("click", () => {
                const idx = Number(b.getAttribute("data-idx"));
                const item = hero.inventory?.[idx];
                const slotIndex = item?.slot ?? 0;
                this._equipItem(hero, idx, slotIndex);
            });
        });

        this.panel.querySelectorAll(".unequip-btn").forEach((b) => {
            b.addEventListener("click", () => {
                const slotIndex = Number(b.getAttribute("data-slot"));
                this._unequipItem(hero, slotIndex);
            });
        });

        this.panel.querySelectorAll(".inv-item").forEach((el) => {
            el.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("itemIndex", el.dataset.idx);
            });
        });

        this.panel.querySelectorAll(".equip-slot").forEach((slotEl) => {
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

                const itemIndex = Number(e.dataTransfer.getData("itemIndex"));
                const slotIndex = Number(slotEl.dataset.slot);

                this._equipItem(hero, itemIndex, slotIndex);
            });
        });
        // ========================
// 装备 → 拖回背包（卸下）
// ========================
        this.panel.querySelectorAll(".equipped-item").forEach((el) => {
            el.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("dragType", "equipped");
                e.dataTransfer.setData("slotIndex", el.dataset.slot);
            });
        });

        const inventoryDropzone = this.panel.querySelector(".inventory-dropzone");
        if (inventoryDropzone) {
            inventoryDropzone.addEventListener("dragover", (e) => {
                e.preventDefault();
                inventoryDropzone.style.background = "rgba(52,152,219,0.12)";
            });

            inventoryDropzone.addEventListener("dragleave", () => {
                inventoryDropzone.style.background = "transparent";
            });

            inventoryDropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                inventoryDropzone.style.background = "transparent";

                const dragType = e.dataTransfer.getData("dragType");
                if (dragType !== "equipped") return;

                const slotIndex = Number(e.dataTransfer.getData("slotIndex"));
                this._unequipItem(hero, slotIndex);
            });
        }
        this.panel.querySelectorAll(".item-icon").forEach((cvs) => {
            const type = cvs.dataset.icon;
            drawItemIconMini(cvs, type);
        });
    }

    _equipItem(hero, itemIndex, slotIndex) {
        if (!hero || !hero.inventory) return;

        const item = hero.inventory[itemIndex];
        if (!item) return;

        hero.inventory.splice(itemIndex, 1);

        if (typeof hero.equip === "function") {
            hero.equip(item, slotIndex);
        } else {
            hero.equipSlots = hero.equipSlots ?? [null, null];
            hero.equipSlots[slotIndex] = item;
        }

        this.render();
    }
    _unequipItem(hero, slotIndex) {
        if (!hero) return;

        if (typeof hero.unequip === "function") {
            hero.unequip(slotIndex);
        } else {
            const item = hero.equipSlots?.[slotIndex];
            if (!item) return;

            hero.equipSlots[slotIndex] = null;
            hero.inventory = hero.inventory ?? [];
            hero.inventory.push(item);
        }

        this.render();
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