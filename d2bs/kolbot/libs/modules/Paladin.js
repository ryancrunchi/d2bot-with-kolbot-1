(function (module, require) {
	const Pather = require('../modules/Pather');
	const CollMap = require('../modules/CollMap');
	const Paladin = {};
	const Misc = require('../modules/Misc');

	Paladin.getHammerPosition = function (unit) {
		let i, x, y, positions, check,
			baseId = getBaseStat("monstats", unit.classid, "baseid"),
			size = getBaseStat("monstats2", baseId, "sizex");

		// in case base stat returns something outrageous
		(typeof size !== "number" || size < 1 || size > 3) && (size = 3);

		switch (unit.type) {
			case 0: // Player
				x = unit.x;
				y = unit.y;
				positions = [[x + 2, y], [x + 2, y + 1]];

				break;
			case 1: // Monster
				x = (unit.mode === 2 || unit.mode === 15) && unit.distance < 10 && [unit.targetx, unit.targety].distance > 5 && unit.targetx || unit.x;
				y = (unit.mode === 2 || unit.mode === 15) && unit.distance < 10 && [unit.targetx, unit.targety].distance > 5 && unit.targety || unit.y;
				positions = [[x + 2, y + 1], [x, y + 3], [x + 2, y - 1], [x - 2, y + 2], [x - 5, y]];

				size === 3 && positions.unshift([x + 2, y + 2]);
				break;
		}

		// If one of the valid positions is a position im at already
		if (positions.some(pos => pos.distance < 1)) return true;

		// Either found and moved to a spot, or we failed
		for (i = 0; i < positions.length; i += 1) {
			if (getDistance(me, positions[i][0], positions[i][1]) < 1) {
				return true;
			}
		}

		for (i = 0; i < positions.length; i += 1) {
			check = {
				x: positions[i][0],
				y: positions[i][1]
			};

			if ([check.x, check.y].validSpot && !CollMap.checkColl(unit, check, 0x4, 0)) {
				if (this.reposition(positions[i][0], positions[i][1])) {
					return true;
				}
			}
		}

		return false;
	};

	Paladin.reposition = function (x, y) {

		if ([x, y].distance > 0) {
			if (Pather.teleport && !me.inTown && me.getStat(97, 54)) {
				(getDistance(me, x, y) > 40 && Pather.moveTo || Pather.teleportTo).apply(Pather, [x, y, 3])
			} else { // or walk
				Misc.click(0, 0, x, y);
				delay(200);
			}
		}

		return true;
	};

	module.exports = Paladin;
})(module, require);