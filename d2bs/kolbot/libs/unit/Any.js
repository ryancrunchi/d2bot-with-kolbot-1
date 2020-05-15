Unit.prototype.getStatEx = function (id, subid) {
	var i, temp, rval, regex;

	switch (id) {
		case 20: // toblock
			switch (this.classid) {
				case 328: // buckler
					return this.getStat(20);
				case 413: // preserved
				case 483: // mummified
				case 503: // minion
					return this.getStat(20) - 3;
				case 329: // small
				case 414: // zombie
				case 484: // fetish
				case 504: // hellspawn
					return this.getStat(20) - 5;
				case 331: // kite
				case 415: // unraveller
				case 485: // sexton
				case 505: // overseer
					return this.getStat(20) - 8;
				case 351: // spiked
				case 374: // deefender
				case 416: // gargoyle
				case 486: // cantor
				case 506: // succubus
				case 408: // targe
				case 478: // akaran t
					return this.getStat(20) - 10;
				case 330: // large
				case 375: // round
				case 417: // demon
				case 487: // hierophant
				case 507: // bloodlord
					return this.getStat(20) - 12;
				case 376: // scutum
					return this.getStat(20) - 14;
				case 409: // rondache
				case 479: // akaran r
					return this.getStat(20) - 15;
				case 333: // goth
				case 379: // ancient
					return this.getStat(20) - 16;
				case 397: // barbed
					return this.getStat(20) - 17;
				case 377: // dragon
					return this.getStat(20) - 18;
				case 502: // vortex
					return this.getStat(20) - 19;
				case 350: // bone
				case 396: // grim
				case 445: // luna
				case 467: // blade barr
				case 466: // troll
				case 410: // heraldic
				case 480: // protector
					return this.getStat(20) - 20;
				case 444: // heater
				case 447: // monarch
				case 411: // aerin
				case 481: // gilded
				case 501: // zakarum
					return this.getStat(20) - 22;
				case 332: // tower
				case 378: // pavise
				case 446: // hyperion
				case 448: // aegis
				case 449: // ward
					return this.getStat(20) - 24;
				case 412: // crown
				case 482: // royal
				case 500: // kurast
					return this.getStat(20) - 25;
				case 499: // sacred r
					return this.getStat(20) - 28;
				case 498: // sacred t
					return this.getStat(20) - 30;
			}

			break;
		case 21: // plusmindamage
		case 22: // plusmaxdamage
			if (subid === 1) {
				temp = this.getStat(-1);
				rval = 0;

				for (i = 0; i < temp.length; i += 1) {
					switch (temp[i][0]) {
						case id: // plus one handed dmg
						case id + 2: // plus two handed dmg
							// There are 2 occurrences of min/max if the item has +damage. Total damage is the sum of both.
							// First occurrence is +damage, second is base item damage.

							if (rval) { // First occurence stored, return if the second one exists
								return rval;
							}

							if (this.getStat(temp[i][0]) > 0 && this.getStat(temp[i][0]) > temp[i][2]) {
								rval = temp[i][2]; // Store the potential +dmg value
							}

							break;
					}
				}

				return 0;
			}

			break;
		case 31: // plusdefense
			if (subid === 0) {
				if ([0, 1].indexOf(this.mode) < 0) {
					break;
				}

				switch (this.itemType) {
					case 58: // jewel
					case 82: // charms
					case 83:
					case 84:
						// defense is the same as plusdefense for these items
						return this.getStat(31);
				}

				if (!this.desc) {
					this.desc = this.description;
				}

				temp = this.desc.split("\n");
				regex = new RegExp("\\+\\d+ " + getLocaleString(3481).replace(/^\s+|\s+$/g, ""));

				for (i = 0; i < temp.length; i += 1) {
					if (temp[i].match(regex, "i")) {
						return parseInt(temp[i].replace(/ÿc[0-9!"+<;.*]/, ""), 10);
					}
				}

				return 0;
			}

			break;
		case 57:
			if (subid === 1) {
				return Math.round(this.getStat(57) * this.getStat(59) / 256);
			}

			break;
		case 83: // itemaddclassskills
			if (subid === undefined) {
				for (i = 0; i < 7; i += 1) {
					if (this.getStat(83, i)) {
						return this.getStat(83, i);
					}
				}

				return 0;
			}

			break;
		case 188: // itemaddskilltab
			if (subid === undefined) {
				temp = [0, 1, 2, 8, 9, 10, 16, 17, 18, 24, 25, 26, 32, 33, 34, 40, 41, 42, 48, 49, 50];

				for (i = 0; i < temp.length; i += 1) {
					if (this.getStat(188, temp[i])) {
						return this.getStat(188, temp[i]);
					}
				}

				return 0;
			}

			break;
		case 195: // itemskillonattack
		case 198: // itemskillonhit
		case 204: // itemchargedskill
			if (subid === undefined) {
				temp = this.getStat(-2);

				if (temp.hasOwnProperty(id)) {
					if (temp[id] instanceof Array) {
						for (i = 0; i < temp[id].length; i += 1) {
							if (temp[id][i] !== undefined) {
								return temp[id][i].skill;
							}
						}
					} else {
						return temp[id].skill;
					}
				}

				return 0;
			}

			break;
	}

	if (this.getFlag(0x04000000)) { // Runeword
		switch (id) {
			case 16: // enhanceddefense
				if ([0, 1].indexOf(this.mode) < 0) {
					break;
				}

				if (!this.desc) {
					this.desc = this.description;
				}

				temp = this.desc.split("\n");

				for (i = 0; i < temp.length; i += 1) {
					if (temp[i].match(getLocaleString(3520).replace(/^\s+|\s+$/g, ""), "i")) {
						return parseInt(temp[i].replace(/ÿc[0-9!"+<;.*]/, ""), 10);
					}
				}

				return 0;
			case 18: // enhanceddamage
				if ([0, 1].indexOf(this.mode) < 0) {
					break;
				}

				if (!this.desc) {
					this.desc = this.description;
				}

				temp = this.desc.split("\n");

				for (i = 0; i < temp.length; i += 1) {
					if (temp[i].match(getLocaleString(10038).replace(/^\s+|\s+$/g, ""), "i")) {
						return parseInt(temp[i].replace(/ÿc[0-9!"+<;.*]/, ""), 10);
					}
				}

				return 0;
		}
	}

	if (subid === undefined) {
		return this.getStat(id);
	}

	return this.getStat(id, subid);
};

Object.defineProperty(PresetUnit.prototype, 'unit', {
	get: function () {
		return getUnits(this.type, this.id).first();
	},
	enumerable: true
});

Object.defineProperty(Unit.prototype, "ownerUnit", {
	get: function() {
		if (this.owner == undefined || this.ownertype == undefined) {
			return undefined;
		}
		return getUnit(this.ownertype, null, null, this.owner);
	},
	enumerable: true
});

Object.defineProperty(Unit.prototype, 'equals', {
	value: function (other) {
		if (other == undefined || other == null) {
			return false;
		}
		return other.constructor == this.constructor &&
			other.type == this.type &&
			other.classid == this.classid &&
			other.gid == this.gid;
	}
});

/**
 * Simple functionality to read the distance between you and an unit.
 * Example: getUnit(...).distance <-- gives the distance between you and the unit.
 */
Object.defineProperty(Unit.prototype, 'distance', {
	get: function() {
		return me.distanceTo(this);
	},
	enumerable: true
});

Object.defineProperty(Unit.prototype, 'distanceTo', {
	value: function (other) {
		return getDistance(this, other);
	}
});

Object.defineProperty(Unit.prototype, 'manhattanDistanceTo', {
	value: function (other) {
		let x = Math.abs(other.x - this.x);
		let y =  Math.abs(other.y - this.y);
		return x+y;
	},
	enumerable: false,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'isHostile', {
	get: function () {
		if (this.gid == undefined || this.gid == null) return false;
		return getPlayerFlag(me.gid, this.gid, sdk.partyFlags.Hostile);
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'sizeX', {
	get: function () {
		if (this.type == sdk.unittype.Monsters) {
			let baseId = getBaseStat("monstats", this.classid, "baseid");
			return getBaseStat("monstats2", baseId, "SizeX");
		}
		return this.sizex;
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'sizeY', {
	get: function () {
		if (this.type == sdk.unittype.Monsters) {
			let baseId = getBaseStat("monstats", this.classid, "baseid");
			return getBaseStat("monstats2", baseId, "SizeY");
		}
		return this.sizey;
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'size', {
	get: function () {
		if (this.type == sdk.unittype.Missiles) {
			return getBaseStat("missiles", this.classid, "Size");
		}
		return this.sizeX;
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'velocity', { // units/sec
	get: function () {
		if (this.type == sdk.unittype.Missiles) {
			return getBaseStat("missiles", this.classid, "Vel");
		}
		if (this.type == sdk.unittype.Monsters) {
			return getBaseStat("monstats", this.classid, (this.running ? "Run" : "Velocity"));
		}
		if (this.type == sdk.unittype.Player) {
			return this.running ? 9 : 6; //TODO: frw
		}
		return undefined;
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'velocityUnitPerFrame', {
	get: function () {
		if (this.velocity != undefined) {
			return this.velocity * 0.04; // units/s to unit/frame
		}
		return undefined;
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'running', {
	get: function () {
		const runningTypes = [sdk.unittype.Player, sdk.unittype.Monsters, sdk.unittype.Missiles];
		return runningTypes.indexOf(this.type) > -1 ? this.mode == sdk.unitmode.Running : false;
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'minimapColor', {
	get: function () {
		if (this.spectype) {
			if (this.spectype & sdk.spectype.Boss) {
				return 0x54;
			}
			if (this.spectype & sdk.spectype.Champion) {
				return 0x97;
			}
			if (this.spectype & (sdk.spectype.Unique + sdk.spectype.Minion)) {
				return 0x6D;
			}
		}
		return 0x62;
	},
	enumerable: false,
	configurable: false
});

Object.defineProperty(Unit.prototype, 'minimapRelativeDrawingVertices', {
	value: function (scale) {
		if (!scale) {
			scale = 1;
		}
		let size = this.size;
		let offset = scale/2;
		let startX = -offset;
		let startY = -offset - size + scale;
		let currentX = startX;
		let currentY = startY;
		let color = this.minimapColor;
		let lines = [];
		
		for (var side = 0; side < 4; side++) {
			for (var i = 0; i < 2*size-1; i++) {
				var xFactor = side == 0 || side == 3 ? 1 : -1;
				var yFactor = side == 0 || side == 1 ? 1 : -1;
				var dx = (side+i)%2 == 0 ? scale*xFactor : 0;
				var dy = (side+i)%2 == 0 ? 0 : scale*yFactor;
				var nextX = currentX + dx;
				var nextY = currentY + dy;
				lines.push({x: currentX, y: currentY, x2: nextX, y2: nextY});
				currentX = nextX;
				currentY = nextY;
			}
		}
		return lines;
	},
	enumerable: false,
	configurable: false
});

Object.defineProperty(Line.prototype, 'offsetBy', {
	value: function (dx, dy) {
		this.x += dx;
		this.x2 += dx;
		this.y += dy;
		this.y2 += dy;
	},
	enumerable: false,
	configurable: false
});