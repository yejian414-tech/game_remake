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
            "position:fixed", "right:18px", "top:18px", "width:46px", "height:46px", "border-radius:12px",
            "border:1px solid rgba(255,255,255,0.25)", "background:rgba(20,20,40,0.85)", "color:white",
            "cursor:pointer", "z-index:150", "font-size:20px",
        ].join(";");
        document.body.appendChild(this.btn);

        this.panel = document.createElement("div");
        this.panel.style.cssText = [
            "position:fixed", "right:18px", "top:72px", "width:420px", "max-height:70vh", "overflow:auto",
            "padding:14px", "border-radius:14px", "border:1px solid rgba(255,255,255,0.18)",
            "background:rgba(10,10,25,0.92)", "color:white", "z-index:150", "display:none",
            "box-shadow:0 12px 30px rgba(0,0,0,0.45)", "font-family:sans-serif",
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

        const tabs = heroes
            .map((h, i) => {
                const active = i === this.activeIndex;
                return `<button class="inv-tab" data-i="${i}" style="margin-right:6px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.18); background:${active ? "rgba(243,156,18,0.25)" : "rgba(255,255,255,0.06)"}; color:white; cursor:pointer;">${h.name ?? `Hero${i + 1}`}</button>`;
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
              <div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                  <div>
                    <div style="font-weight:700;">${it.name ?? "Item"}</div>
                    <div style="opacity:.75;font-size:12px;">${it.desc ?? ""}</div>
                    <div style="opacity:.7;font-size:12px;margin-top:4px;">Rarity: ${rarity} | Slot: ${it.slot ?? 0}</div>
                  </div>
                  <button class="inv-use" data-idx="${idx}" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:rgba(46,204,113,0.18); color:white; cursor:pointer;">Use/Equip</button>
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
        <div style="opacity:.75;font-size:12px;margin-top:4px;">STR ${hero.strength ?? 0} | TOU ${hero.toughness ?? 0} | AGI ${hero.agility ?? 0} | INT ${hero.intellect ?? 0}</div>
      </div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;">
        <div style="font-weight:700;margin-bottom:6px;">Equipment Slots</div>
        <div style="opacity:.9;margin-bottom:6px;">Slot 0: ${equip0 ? equip0.name : "Empty"}</div>
        <div style="opacity:.9;">Slot 1: ${equip1 ? equip1.name : "Empty"}</div>
        <div style="opacity:.7;font-size:12px;margin-top:6px;">Hint: Items will be equipped to their designated slot.</div>
      </div>
      <div style="font-weight:700;margin-bottom:8px;">Items</div>
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
                this._useItem(hero, idx);
                this.render();
            });
        });
    }

    _useItem(hero, index) {
        if (!hero || !hero.inventory) return;
        const item = hero.inventory[index];
        if (!item) return;
        const slot = item.slot ?? 0;
        hero.inventory.splice(index, 1);
        if (typeof hero.equip === "function") {
            hero.equip(item, slot);
        } else {
            hero.equipSlots = hero.equipSlots ?? [null, null];
            hero.equipSlots[slot] = item;
        }
    }
}