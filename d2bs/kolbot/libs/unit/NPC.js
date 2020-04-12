

// Open NPC menu
Unit.prototype.openMenu = function (addDelay) {
	const Config = require('Config');
	const Packet = require('PacketHelpers');
	const Pather = require('Pather');
	const Misc = require('Misc');
	if (Config.PacketShopping) {
		return Packet.openMenu(this);
	}

	if (this.type !== 1) {
		throw new Error("Unit.openMenu: Must be used on NPCs.");
	}

	if (addDelay === undefined) {
		addDelay = 0;
	}

	if (getUIFlag(0x08)) {
		return true;
	}

	var i, tick;

	for (i = 0; i < 5; i += 1) {
		if (getDistance(me, this) > 4) {
			Pather.moveToUnit(this);
		}

		Misc.click(0, 0, this);
		tick = getTickCount();

		while (getTickCount() - tick < 5000) {
			if (getUIFlag(0x08)) {
				// delay(Math.max(700 + me.ping, 500 + me.ping * 2 + addDelay * 500));
				delay(addDelay || 3);
				return true;
			}

			if (getInteractedNPC() && getTickCount() - tick > 1000) {
				me.cancel();
			}

			delay(100);
		}

		sendPacket(1, 0x2f, 4, 1, 4, this.gid);
		delay(me.ping * 2);
		sendPacket(1, 0x30, 4, 1, 4, this.gid);
		delay(me.ping * 2);
	}

	return false;
};

// mode = "Gamble", "Repair" or "Shop"
Unit.prototype.startTrade = function (mode) {
	const Config = require('Config');
	const Packet = require('PacketHelpers');
	const Misc = require('Misc');
	if (Config.PacketShopping) {
		return Packet.startTrade(this, mode);
	}

	if (this.type !== 1) {
		throw new Error("Unit.startTrade: Must be used on NPCs.");
	}

	if (getUIFlag(0x0C)) {
		return true;
	}

	var i, tick,
		menuId = mode === "Gamble" ? 0x0D46 : mode === "Repair" ? 0x0D06 : 0x0D44;

	for (i = 0; i < 3; i += 1) {
		if (this.openMenu(i)) { // Incremental delay on retries
			Misc.useMenu(menuId);

			tick = getTickCount();

			while (getTickCount() - tick < 1000) {
				if (getUIFlag(0x0C) && this.itemcount > 0) {
					delay(200);

					return true;
				}

				delay(25);
			}

			me.cancel();
		}
	}

	return false;
};

Unit.prototype.buy = function (shiftBuy, gamble) {
	const Config = require('Config');
	const Packet = require('PacketHelpers');
	if (Config.PacketShopping) {
		return Packet.buyItem(this, shiftBuy, gamble);
	}

	if (this.type !== 4) { // Check if it's an item we want to buy
		throw new Error("Unit.buy: Must be used on items.");
	}

	if (!getUIFlag(0xC) || (this.getParent() && this.getParent().gid !== getInteractedNPC().gid)) { // Check if it's an item belonging to a NPC
		throw new Error("Unit.buy: Must be used in shops.");
	}

	if (me.gold < this.getItemCost(0)) { // Can we afford the item?
		return false;
	}

	var i, tick,
		oldGold = me.gold,
		itemCount = me.itemcount;

	for (i = 0; i < 3; i += 1) {
		//print("BUY " + this.name + " " + i);

		this.shop(shiftBuy ? 6 : 2);

		tick = getTickCount();

		while (getTickCount() - tick < Math.max(2000, me.ping * 2 + 500)) {
			if (shiftBuy && me.gold < oldGold) {
				delay(500);

				return true;
			}

			if (itemCount !== me.itemcount) {
				delay(500);

				return true;
			}

			delay(10);
		}
	}

	return false;
};
