/**
 *    @filename    Pather.js
 *    @author        kolton
 *    @desc        handle player movement
 */
(function (module, require) {
// Perform certain actions after moving to each node
	const NodeAction = {
		// Run all the functions within NodeAction (except for itself)
		go: function (arg) {
			for (let i in this) {
				if (this.hasOwnProperty(i) && typeof this[i] === "function" && i !== "go") {
					this[i](arg);
				}
			}
		},

		// Kill monsters while pathing
		killMonsters: function (arg) {
			var monList;

			if ((typeof Pather.config.ClearPath === "number" || typeof Pather.config.ClearPath === "object") && arg.clearPath === false) {
				switch (typeof Pather.config.ClearPath) {
					case "number":
						me.clear(30, Pather.config.ClearPath);

						break;
					case "object":
						if (!Pather.config.ClearPath.hasOwnProperty("Areas") || Pather.config.ClearPath.Areas.length === 0 || Pather.config.ClearPath.Areas.indexOf(me.area) > -1) {
							me.clear(Pather.config.ClearPath.Range, Pather.config.ClearPath.Spectype);
						}

						break;
				}
			}

			if (arg.clearPath !== false) {
				me.clear(15, arg.clearPath);
			}
		},

		// Open chests while pathing
		popChests: function () {
			if (!!Pather.config.OpenChests) {
				require('Misc').openChests(20);
			}
		},

		// Scan shrines while pathing
		getShrines: function () {
			if (!!Pather.config.ScanShrines && Pather.config.ScanShrines.length > 0) {
				require('Misc').scanShrines();
			}
		}
	};

	let PathDebug = {
		hooks: [],
		enableHooks: false,

		drawPath: function (path) {
			if (!this.enableHooks) {
				return;
			}

			this.removeHooks();

			if (path.length < 2) {
				return;
			}

			for (let i = 0; i < path.length - 1; i += 1) {
				this.hooks.push(new Line(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y, 0x84, true));
			}
		},

		drawRoom: function (room) {
			if (!this.enableHooks) {
				return;
			}

			this.removeHooks();

			this.hooks.push(new Line(room.x * 5, room.y * 5, room.x * 5 + room.xsize, room.y * 5, 0x84, true));
			this.hooks.push(new Line(room.x * 5 + room.xsize, room.y * 5, room.x * 5 + room.xsize, room.y * 5 + room.ysize, 0x84, true));
			this.hooks.push(new Line(room.x * 5 + room.xsize, room.y * 5 + room.ysize, room.x * 5, room.y * 5 + room.ysize, 0x84, true));
			this.hooks.push(new Line(room.x * 5, room.y * 5 + room.ysize, room.x * 5, room.y * 5, 0x84, true));
		},

		removeHooks: function () {
			this.hooks = this.hooks.forEach(hook => hook.remove()) || [];
		},

		coordsInPath: (path, x, y) => path.some(node => getDistance(x, y, node.x, node.y) < 5)
	};

	const Pather = {
		config: require('Config'),
		teleport: true,
		walkDistance: 5,
		teleDistance: 40,
		cancelFlags: [0x01, 0x02, 0x04, 0x08, 0x14, 0x16, 0x0c, 0x0f, 0x17, 0x19, 0x1A],
		wpAreas: [1, 3, 4, 5, 6, 27, 29, 32, 35, 40, 48, 42, 57, 43, 44, 52, 74, 46, 75, 76, 77, 78, 79, 80, 81, 83, 101, 103, 106, 107, 109, 111, 112, 113, 115, 123, 117, 118, 129],
		recursion: true,

		useTeleport: function () {
			return this.teleport && !me.getState(sdk.states.Wolf) && !me.getState(sdk.states.Bear) && !me.inTown && ((me.classid === 1 && me.getSkill(sdk.skills.Teleport, 1)) || me.getStat(sdk.stats.Nonclassskill, sdk.skills.Teleport));
		},

		/*
			Pather.moveTo(x, y, retry, clearPath, pop);
			x - the x coord to move to
			y - the y coord to move to
			retry - number of attempts before aborting
			clearPath - kill monsters while moving
			pop - remove last node
		*/
		moveTo: function (x, y, retry = 3, clearPath = false, pop = false) {
			if (me.dead) { // Abort if dead
				return false;
			}
			const Misc = require('Misc');

			let path, adjustedNode, cleared, useTeleport,
				node = {x: x, y: y},
				fail = 0;

			for (let i = 0; i < this.cancelFlags.length; i += 1) {
				if (getUIFlag(this.cancelFlags[i])) {
					me.cancel();
				}
			}

			if ([x, y].distance < 2) {
				return true;
			}

			if (x === undefined || y === undefined) throw new Error("moveTo: Function must be called with at least 2 arguments.");


			if (typeof x !== "number" || typeof y !== "number") throw new Error("moveTo: Coords must be numbers");

			useTeleport = this.useTeleport();

			path = getPath(me.area, x, y, me.x, me.y, useTeleport ? 1 : 0, useTeleport ? ([62, 63, 64].indexOf(me.area) > -1 ? 30 : this.teleDistance) : this.walkDistance);

			if (!path) throw new Error("moveTo: Failed to generate path.");

			path.reverse();

			if (pop) path.pop();

			PathDebug.drawPath(path);

			//ToDo; deal with dynamic tele switch

			while (path.length > 0) {
				if (me.dead) { // Abort if dead
					return false;
				}

				for (let i = 0; i < this.cancelFlags.length; i += 1) {
					if (getUIFlag(this.cancelFlags[i])) {
						me.cancel();
					}
				}

				node = path.shift();

				/* Right now getPath's first node is our own position so it's not necessary to take it into account
					This will be removed if getPath changes
				*/
				if (getDistance(me, node) > 2) {
					// Make life in Maggot Lair easier
					if ([62, 63, 64].indexOf(me.area) > -1) {
						adjustedNode = this.getNearestWalkable(node.x, node.y, 15, 3, 0x1 | 0x4 | 0x800 | 0x1000);

						if (adjustedNode) {
							node.x = adjustedNode[0];
							node.y = adjustedNode[1];
						}
					}

					if (useTeleport ? this.teleportTo(node.x, node.y) : this.walkTo(node.x, node.y, (fail > 0 || me.inTown) ? 2 : 4)) {
						if (!me.inTown) {
							if (this.recursion) {
								this.recursion = false;

								NodeAction.go({clearPath: clearPath});

								if (getDistance(me, node.x, node.y) > 5) {
									this.moveTo(node.x, node.y);
								}

								this.recursion = true;
							}

							Misc.townCheck();
						}
					} else {
						if (fail > 0 && !useTeleport && !me.inTown) {
							// Don't go berserk on longer paths
							if (!cleared) {
								me.clear(5);

								cleared = true;
							}

							// If we got leap, jump.
							if (fail > 1 && me.getSkill(sdk.skills.LeapAttack, 1)) {
								me.cast(sdk.skills.LeapAttack, 0, node.x, node.y);
							}
						}

						// Reduce node distance in new path
						path = getPath(me.area, x, y, me.x, me.y, useTeleport ? 1 : 0, useTeleport ? rand(25, 35) : rand(10, 15));
						fail += 1;

						if (!path) throw new Error("moveTo: Failed to generate path.");

						path.reverse();
						PathDebug.drawPath(path);

						if (pop) path.pop();
						print("move retry " + fail);

						if (fail > 0 && fail >= retry) break;
					}
				}
			}

			// ToDo; deal with dynamic teleswitch

			PathDebug.removeHooks();

			return node.distance < 5;
		},

		/*
			Pather.teleportTo(x, y);
			x - the x coord to teleport to
			y - the y coord to teleport to
		*/
		teleportTo: function (x, y, maxRange = 5) {
			for (let i = 0; i < 3; i += 1) {
				me.cast(54, 0, x, y);

				let tick = getTickCount();

				while (getTickCount() - tick < Math.max(500, me.ping * 2 + 200)) {
					if ([x, y].distance < maxRange) {
						return true;
					}
					delay(3);
				}
			}

			return false;
		},

		/*
			Pather.walkTo(x, y);
			x - the x coord to walk to
			y - the y coord to walk to
			minDist - minimal distance from x/y before returning true
		*/
		walkTo: function (x, y, minDist = me.inTown && 2 || 4) {
			while (!me.gameReady) delay(3);
			const Misc = require('Misc');

			// Stamina handler and Charge
			if (!me.inTown && !me.dead) {
				if (Pather.config.Charge && me.classid === 3 && me.mp >= 9 && getDistance(me.x, me.y, x, y) > 8 && me.setSkill(107, 1)) {
					if (Pather.config.Vigor) {
						me.setSkill(115, 0);
					}

					Misc.click(0, 1, x, y);

					while (me.mode !== 1 && me.mode !== 5 && !me.dead) {
						delay(40);
					}
				}
			}

			let nFail = 0,
				attemptCount = 0;

			while ([x, y].distance > minDist && !me.dead) {
				me.classid === 3 && Pather.config.Vigor && me.setSkill(115, 0);

				if (this.openDoors(x, y) && getDistance(me.x, me.y, x, y) <= minDist) return true;

				Misc.click(0, 0, x, y);

				attemptCount += 1;
				let nTimer = getTickCount();

				while (me.mode !== 2 && me.mode !== 3 && me.mode !== 6) {
					if (me.dead) return false;

					if ((getTickCount() - nTimer) > 500) {
						nFail += 1;

						if (nFail >= 3) {
							return false;
						}

						let angle = Math.atan2(me.y - y, me.x - x),
							angles = [Math.PI / 2, -Math.PI / 2];

						for (let i = 0; i < angles.length; i += 1) {
							// TODO: might need rework into getnearestwalkable
							let whereToClick = {
								x: Math.round(Math.cos(angle + angles[i]) * 5 + me.x),
								y: Math.round(Math.sin(angle + angles[i]) * 5 + me.y)
							};

							if (whereToClick.validSpot) {
								Misc.click(0, 0, whereToClick.x, whereToClick.y);

								let tick = getTickCount();

								while (getDistance(me, whereToClick) > 2 && getTickCount() - tick < 1000) {
									delay(40);
								}

								break;
							}
						}

						break;
					}

					delay(10);
				}

				// Wait until we're done walking - idle or dead
				while (getDistance(me.x, me.y, x, y) > minDist && me.mode !== 1 && me.mode !== 5 && !me.dead) delay(10);

				if (attemptCount >= 3) return false;
			}

			return !me.dead && getDistance(me.x, me.y, x, y) <= minDist;
		},

		/*
			Pather.openDoors(x, y);
			x - the x coord of the node close to the door
			y - the y coord of the node close to the door
		*/
		openDoors: function (x, y) {
			if (me.inTown) {
				return false;
			}
			const Misc = require('Misc');

			// Regular doors
			let door = getUnit(2, "door", 0);

			if (!door) return false; // Cant open a door that we cant find

			do {
				if ((getDistance(door, x, y) < 4 && door.distance < 9) || getDistance(me, door) < 4) {
					for (let i = 0; i < 3; i += 1) {
						Misc.click(0, 0, door);
						//door.interact();

						let tick = getTickCount();

						while (getTickCount() - tick < 1000) {
							if (door.mode === 2) {
								print("Opened a door!");

								return true;
							}

							delay(10);
						}
					}
				}
			} while (door.getNext());

			// DO: Monsta doors (Barricaded)
			return false;
		},

		/*
			Pather.moveToUnit(unit, offX, offY, clearPath, pop);
			unit - a valid Unit or PresetUnit object
			offX - offset from unit's x coord
			offY - offset from unit's x coord
			clearPath - kill monsters while moving
			pop - remove last node
		*/
		moveToUnit: function (unit, offX = 0, offY = 0, clearPath = false, pop = false) {
			var useTeleport = this.useTeleport();

			if (!unit || !unit.hasOwnProperty("x") || !unit.hasOwnProperty("y")) throw new Error("moveToUnit: Invalid unit.");

			if (unit instanceof PresetUnit) {
				return this.moveTo(unit.roomx * 5 + unit.x + offX, unit.roomy * 5 + unit.y + offY, 3, clearPath);
			}

			if (!useTeleport) {
				// The unit will most likely be moving so call the first walk with 'pop' parameter
				this.moveTo(unit.x + offX, unit.y + offY, 0, clearPath, true);
			}

			return this.moveTo(unit.x + offX, unit.y + offY, useTeleport && unit.type && unit.type === 1 ? 3 : 0, clearPath, pop);
		},

		/*
			Pather.moveToPreset(area, unitType, unitId, offX, offY, clearPath, pop);
			area - area of the preset unit
			unitType - type of the preset unit
			unitId - preset unit id
			offX - offset from unit's x coord
			offY - offset from unit's x coord
			clearPath - kill monsters while moving
			pop - remove last node
		*/
		moveToPreset: function (area, unitType, unitId, offX = 0, offY = 0, clearPath = false, pop = false) {
			if (area === undefined || unitType === undefined || unitId === undefined) throw new Error("moveToPreset: Invalid parameters.");
			if (me.area !== area) Pather.journeyTo(area);
			let presetUnit = getPresetUnit(area, unitType, unitId);

			if (!presetUnit) {
				throw new Error("moveToPreset: Couldn't find preset unit - id " + unitId);
			}

			return this.moveTo(presetUnit.roomx * 5 + presetUnit.x + offX, presetUnit.roomy * 5 + presetUnit.y + offY, 3, clearPath, pop);
		},

		/*
			Pather.moveToExit(targetArea, use, clearPath);
			targetArea - area id or array of area ids to move to
			use - enter target area or last area in the array
			clearPath - kill monsters while moving
		*/
		moveToExit: function (targetArea, use, clearPath) {
			const areas = Array.isArray(targetArea) && targetArea || [targetArea];

			for (let i = 0; i < areas.length; i += 1) {
				let area = getArea();

				if (!area) throw new Error("moveToExit: error in getArea()");

				let exits = area.exits;

				if (!exits || !exits.length) {
					return false;
				}

				for (let j = 0; j < exits.length; j += 1) {
					let currExit = {
						x: exits[j].x,
						y: exits[j].y,
						type: exits[j].type,
						target: exits[j].target,
						tileid: exits[j].tileid
					};

					if (currExit.target !== areas[i]) continue;

					let dest = this.getNearestWalkable(currExit.x, currExit.y, 5, 1);

					if (!dest) {
						return false;
					}

					if (!this.moveTo(dest[0], dest[1], 3, clearPath)) {
						return false;
					}

					/* i < areas.length - 1 is for crossing multiple areas.
						In that case we must use the exit before the last area.
					*/
					if (use || i < areas.length - 1) {
						switch (currExit.type) {
							case 1: // walk through
								let targetRoom = this.getNearestRoom(areas[i]);

								if (targetRoom) {
									this.moveTo(targetRoom[0], targetRoom[1], 3, clearPath);
								} else {
									// might need adjustments
									return false;
								}

								break;
							case 2: // stairs
								if (!this.openExit(areas[i]) && !this.useUnit(5, currExit.tileid, areas[i])) {
									return false;
								}

								break;
						}
					}
					break;
				}
			}

			if (use) return Array.isArray(targetArea) && me.area === targetArea[targetArea.length - 1] || me.area === targetArea;

			return true;
		},

		/*
			Pather.getNearestRoom(area);
			area - the id of area to search for the room nearest to the player character
		*/
		getNearestRoom: function (area) {
			const CollMap = require('CollMap');
			let x, y, dist, room,
				minDist = 10000;

			for (let i = 0; i < 5; i += 1) {
				room = getRoom(area);

				if (room) {
					break;
				}

				delay(200);
			}

			if (!room) {
				return false;
			}

			do {
				dist = getDistance(me, room.x * 5 + room.xsize / 2, room.y * 5 + room.ysize / 2);

				if (dist < minDist) {
					x = room.x * 5 + room.xsize / 2;
					y = room.y * 5 + room.ysize / 2;
					minDist = dist;
				}
			} while (room.getNext());

			room = getRoom(area, x, y);

			if (room) {
				CollMap.addRoom(room);

				return this.getNearestWalkable(x, y, 20, 4);
			}

			return [x, y];
		},

		/*
			Pather.openExit(targetArea);
			targetArea - area id of where the unit leads to
		*/
		openExit: function (targetArea) {
			switch (true) {
				case targetArea === sdk.areas.AncientTunnels:
				case targetArea === sdk.areas.A2SewersLvl1 && !(me.area === sdk.areas.LutGholein && [5218, 5180].distance < 20): // not for other entry
					return this.useUnit(sdk.unittype.Objects, sdk.units.TrapDoorA2, targetArea);

				case targetArea === sdk.areas.A3SewersLvl2:
					return this.useUnit(sdk.unittype.Objects, sdk.units.SewerStairsA3, targetArea);

				case targetArea === sdk.areas.RuinedTemple:
				case targetArea === sdk.areas.DisusedFane:
				case targetArea === sdk.areas.ForgottenReliquary:
				case targetArea === sdk.areas.ForgottenTemple:
				case targetArea === sdk.areas.RuinedFane:
				case targetArea === sdk.areas.DisusedReliquary:
					return this.useUnit(sdk.unittype.Objects, "stair", targetArea);

				case targetArea === sdk.areas.DuranceOfHateLvl1 && me.area === sdk.areas.Travincal: // only down, not up
					return this.useUnit(2, sdk.unittype.DuranceEntryStairs, targetArea);

				case targetArea === sdk.areas.WorldstoneLvl1 && me.area === sdk.areas.AncientsWay: // only at ancients
					return this.useUnit(2, sdk.units.AncientsDoor, targetArea);
			}

			return false;
		},

		/*
			Pather.openUnit(id);
			type - type of the unit to open
			id - id of the unit to open
		*/
		openUnit: function (type, id) {
			const CollMap = require('CollMap');
			let unit;

			for (let i = 0; i < 5; i += 1) {
				unit = getUnit(type, id);

				if (unit) {
					break;
				}

				delay(200);
			}

			if (!unit) {
				throw new Error("openUnit: Unit not found. ID: " + unit);
			}

			if (unit.mode !== 0) return true; // already open

			for (let i = 0; i < 3; i += 1) {
				if (getDistance(me, unit) > 5) this.moveToUnit(unit);

				sendPacket(1, 0x13, 4, unit.type, 4, unit.gid);

				let tick = getTickCount();

				while (getTickCount() - tick < 1500) {
					if (unit.mode !== 0) {
						delay(3);

						return true;
					}

					delay(10);
				}

				let coord = CollMap.getRandCoordinate(me.x, -1, 1, me.y, -1, 1, 3);
				this.moveTo(coord.x, coord.y);
			}

			return false;
		},

		/*
			Pather.useUnit(type, id, targetArea);
			type - type of the unit to use
			id - id of the unit to use
			targetArea - area id of where the unit leads to
		*/
		useUnit: function (type, id, targetArea) {
			let unit, preArea = me.area;
			const Misc = require('Misc');

			for (let i = 0; i < 20; i += 1) {
				unit = getUnit(type, id);

				if (unit) break;

				i && delay(50);
			}

			if (!unit) throw new Error("useUnit: Unit not found. ID: " + id);

			for (let i = 0; i < 3; i += 1) {
				if (getDistance(me, unit) > 5) {
					this.moveToUnit(unit);
				}

				if (type === 2 && unit.mode === 0) {
					if ((me.area === 83 && targetArea === 100 && me.getQuest(21, 0) !== 1) || (me.area === 120 && targetArea === 128 && me.getQuest(39, 0) !== 1)) {
						throw new Error("useUnit: Incomplete quest.");
					}

					if (me.area === 92) {
						this.openUnit(2, 367);
					} else {
						this.openUnit(2, id);
					}
				}

				delay(300);

				if (type === 5) {
					Misc.click(0, 0, unit);
				} else {
					//Note, dont use tk here, as it only works in single player
					sendPacket(1, 0x13, 4, unit.type, 4, unit.gid);
				}

				let tick = getTickCount();

				while (getTickCount() - tick < 3000) {
					if ((!targetArea && me.area !== preArea) || me.area === targetArea) {
						delay(5);
						return true;
					}

					delay(3);
				}

				let coord = require('CollMap').getRandCoordinate(me.x, -1, 1, me.y, -1, 1, 3);
				this.moveTo(coord.x, coord.y);
			}

			return targetArea && me.area === targetArea || me.area !== preArea;
		},

		/*
			Pather.moveTo(targetArea, check);
			targetArea - id of the area to enter
			check - force the waypoint menu
		*/
		useWaypoint: function useWaypoint(targetArea, check) {
			const CollMap = require('CollMap');
			const NPC = require('NPC');
			const Misc = require('Misc');
			switch (targetArea) { // error handling
				case typeof targetArea !== "number":
					throw new Error("useWaypoint: Invalid targetArea parameter");

				case this.wpAreas.indexOf(targetArea) < 0:
					throw new Error("useWaypoint: Invalid area");

				case targetArea === undefined:
					throw new Error("useWaypoint: Invalid targetArea parameter: " + targetArea);

			}

			check |= targetArea === null || targetArea === 'random';

			let retry;
			const Town = require('Town');
			for (let i = 0; i < 12; i += 1) {
				if (me.area === targetArea || me.dead) break;

				if (me.inTown) {
					let npc = getUnit(1, NPC.Warriv);

					if (me.area === 40 && npc && getDistance(me, npc) < 50) {
						if (npc && npc.openMenu()) {
							Misc.useMenu(0x0D37);

							if (!Misc.poll(function () {
								return me.area === 1;
							}, 2000, 10)) {
								Town.goToTown(2);
							}
						}
					}

					Town.move("waypoint");
				}

				let wp = getUnit(2, "waypoint");

				if (wp && wp.area === me.area) {
					if (!me.inTown && wp.distance > 7) this.moveToUnit(wp);

					if (getDistance(me, wp) > 5) this.moveToUnit(wp);

					Misc.click(0, 0, wp);

					let tick = getTickCount();

					while (getTickCount() - tick < Math.max(Math.round((i + 1) * 1000 / (i / 5 + 1)), me.ping * 2)) {
						if (getUIFlag(0x14)) { // Waypoint screen is open
							delay(500);

							switch (targetArea) {
								case "random":
									while (true) {
										targetArea = this.wpAreas[rand(0, this.wpAreas.length - 1)];

										// get a valid wp, avoid towns
										if ([1, 40, 75, 103, 109].indexOf(targetArea) === -1 && getWaypoint(this.wpAreas.indexOf(targetArea))) {
											break;
										}

										delay(5);
									}

									break;
								case null:
									me.cancel();

									return true;
							}

							if (!getWaypoint(this.wpAreas.indexOf(targetArea))) {
								me.cancel();
								me.overhead("Trying to get the waypoint");

								if (this.getWP(targetArea)) {
									return true;
								}

								throw new Error("Pather.useWaypoint: Failed to go to waypoint");
							}

							break;
						}

						delay(10);
					}

					if (!getUIFlag(0x14)) {
						print("waypoint retry " + (i + 1));
						retry = Math.min(i + 1, 10);

						let coord = CollMap.getRandCoordinate(me.x, -5 * retry, 5 * retry, me.y, -5 * retry, 5 * retry);
						this.moveTo(coord.x, coord.y);
						delay(200 + me.ping);

						continue;
					}

					if (!check || getUIFlag(0x14)) {
						delay(200);
						wp.interact(targetArea);

						let tick = getTickCount();

						while (getTickCount() - tick < Math.max(Math.round((i + 1) * 1000 / (i / 5 + 1)), me.ping * 2)) {
							if (me.area === targetArea) {
								delay(100);

								return true;
							}

							delay(10);
						}

						me.cancel(); // In case lag causes the wp menu to stay open
					}

					Packet.flash(me.gid);

					if (i > 1) { // Activate check if we fail direct interact twice
						check = true;
					}
				}

				delay(200 + me.ping);
			}

			if (me.area === targetArea) {
				return true;
			}

			throw new Error("useWaypoint: Failed to use waypoint");
		},

		/*
			Pather.makePortal(use);
			use - use the portal that was made
		*/
		makePortal: function (use) {
			if (me.inTown) {
				return true;
			}

			let portal, oldPortal, oldGid, tick;

			for (let i = 0; i < 5; i += 1) {
				if (me.dead) {
					break;
				}

				let tpTome = me.findItem(sdk.items.tptome, sdk.itemmode.inStorage, sdk.storage.Inventory);
				let tpScroll = me.findItem(sdk.items.tpScroll, sdk.itemmode.inStorage, sdk.storage.Inventory);
				let tpTool = tpScroll || tpTome;

				if (!tpTool) {
					throw new Error("makePortal: No tome, no scrolls.");
					//TODO: use old portal if any
				}

				if (!tpScroll && tpTome && tpTome.getStat(sdk.stats.Quantity) == 0) {
					throw new Error("makePortal: No scrolls in tome.");
					//TODO: use old portal if any
				}

				oldPortal = getUnit(2, "portal");

				if (oldPortal) {
					do {
						if (oldPortal.getParent() === me.name) {
							oldGid = oldPortal.gid;

							break;
						}
					} while (oldPortal.getNext());
				}

				tpTool.interact();

				tick = getTickCount();

				MainLoop:
					while (getTickCount() - tick < Math.max(500 + i * 100, me.ping * 2 + 100)) {
						portal = getUnit(2, "portal");

						if (portal) {
							do {
								if (portal.getParent() === me.name && portal.gid !== oldGid) {
									if (use) {
										if (this.usePortal(null, null, copyUnit(portal))) {
											return true;
										}

										break MainLoop; // don't spam usePortal
									} else {
										return copyUnit(portal);
									}
								}
							} while (portal.getNext());
						}

						delay(10);
					}
			}

			return false;
		},

		/*
			Pather.usePortal(targetArea, owner, unit);
			targetArea - id of the area the portal leads to
			owner - name of the portal's owner
			unit - use existing portal unit
		*/
		usePortal: function (targetArea, owner, unit) {
			if (targetArea && me.area === targetArea) {
				return true;
			}
			const Misc = require('Misc');

			me.cancel();

			var i, tick, portal,
				preArea = me.area;

			const Town = require('Town');
			for (i = 0; i < 10; i += 1) {
				if (me.dead) {
					break;
				}

				if (i > 0 && owner && me.inTown) {
					Town.move("portalspot");
				}

				portal = unit ? copyUnit(unit) : this.getPortal(targetArea, owner);

				if (portal) {
					if (portal.area === me.area) {
						if (getDistance(me, portal) > 5) {
							this.moveToUnit(portal);
						}

						if (i < 2) {
							sendPacket(1, 0x13, 4, 0x2, 4, portal.gid);
						} else {
							Misc.click(0, 0, portal);
						}
					}

					if (portal.classid === 298 && portal.mode !== 2) { // Portal to/from Arcane
						Misc.click(0, 0, portal);

						tick = getTickCount();

						while (getTickCount() - tick < 2000) {
							if (portal.mode === 2 || me.area === 74) {
								break;
							}

							delay(10);
						}
					}

					tick = getTickCount();

					while (getTickCount() - tick < Math.max(Math.round((i + 1) * 1000 / (i / 5 + 1)), me.ping * 2)) {
						if (me.area !== preArea) {
							delay(100);

							return true;
						}

						delay(10);
					}
				}

				delay(200 + me.ping);
			}

			return targetArea ? me.area === targetArea : me.area !== preArea;
		},

		/*
			Pather.getPortal(targetArea, owner, unit);
			targetArea - id of the area the portal leads to
			owner - name of the portal's owner
		*/
		getPortal: function (targetArea, owner) {
			var portal = getUnit(2, "portal");
			const Misc = require('Misc');

			if (portal) {
				do {
					if (typeof targetArea !== "number" || portal.objtype === targetArea) {
						switch (owner) {
							case undefined: // Pather.usePortal(area) - red portal
								if (!portal.getParent()) {
									return copyUnit(portal);
								}

								break;
							case null: // Pather.usePortal(area, null) - any blue portal leading to area
								if (portal.getParent() === me.name || Misc.inMyParty(portal.getParent())) {
									return copyUnit(portal);
								}

								break;
							default: // Pather.usePortal(null, owner) - any blue portal belonging to owner OR Pather.usePortal(area, owner) - blue portal matching area and owner
								if (portal.getParent() === owner && (owner === me.name || Misc.inMyParty(owner))) {
									return copyUnit(portal);
								}

								break;
						}
					}
				} while (portal.getNext());
			}

			return false;
		},

		/*
			Pather.moveTo(x, y, range, step, coll);
			x - the starting x coord
			y - the starting y coord
			range - maximum allowed range from the starting coords
			step - distance between each checked dot on the grid
			coll - collision flag to avoid
		*/
		getNearestWalkable: function (x, y, range, step, coll, size) {
			const CollMap = require('CollMap');
			if (!step) {
				step = 1;
			}

			if (coll === undefined) {
				coll = 0x1;
			}

			var i, j,
				distance = 1,
				result = false;

			// Check if the original spot is valid
			if (this.checkSpot(x, y, coll, false, size)) {
				result = [x, y];
			}

			MainLoop:
				while (!result && distance < range) {
					for (i = -distance; i <= distance; i += 1) {
						for (j = -distance; j <= distance; j += 1) {
							// Check outer layer only (skip previously checked)
							if (Math.abs(i) >= Math.abs(distance) || Math.abs(j) >= Math.abs(distance)) {
								if (this.checkSpot(x + i, y + j, coll, false, size)) {
									result = [x + i, y + j];

									break MainLoop;
								}
							}
						}
					}

					distance += step;
				}

			CollMap.reset();

			return result;
		},

		/*
			Pather.moveTo(x, y, coll, cacheOnly);
			x - the x coord to check
			y - the y coord to check
			coll - collision flag to search for
			cacheOnly - use only cached room data
		*/
		checkSpot: function (x, y, coll, cacheOnly, size) {
			const CollMap = require('CollMap');
			var dx, dy, value;

			if (coll === undefined) {
				coll = 0x1;
			}

			if (!size) {
				size = 1;
			}

			for (dx = -size; dx <= size; dx += 1) {
				for (dy = -size; dy <= size; dy += 1) {
					if (Math.abs(dx) !== Math.abs(dy)) {
						value = CollMap.getColl(x + dx, y + dy, cacheOnly);

						if (value & coll) {
							return false;
						}
					}
				}
			}

			return true;
		},

		/*
			Pather.accessToAct(act);
			act - the act number to check for access
		*/
		accessToAct: function (act) {
			return me.highestAct >= act;
		},

		/*
			Pather.getWP(area);
			area - the id of area to get the waypoint in
			clearPath - clear path
		*/
		getWP: function (area, clearPath,click=true) {
			const Misc = require('Misc');
			var i, j, wp, preset,
				wpIDs = [119, 145, 156, 157, 237, 238, 288, 323, 324, 398, 402, 429, 494, 496, 511, 539];

			if (area !== me.area) {
				this.journeyTo(area, clearPath);
			}

			for (i = 0; i < wpIDs.length; i += 1) {
				preset = getPresetUnit(area, 2, wpIDs[i]);

				if (preset) {
					this.moveToUnit(preset, 0, 0, clearPath);

					wp = getUnit(2, "waypoint");

					if (wp) {
						if (!click) return true;
						for (j = 0; j < 10; j += 1) {
							Misc.click(0, 0, wp);
							//wp.interact();

							if (getUIFlag(0x14)) {
								delay(500);
								me.cancel();

								return true;
							}

							delay(500);
						}
					}
				}
			}

			return false;
		},

		/*
			Pather.journeyTo(area);
			area - the id of area to move to
		*/
		journeyTo: function (area, clearPath) {
			const Precast = require('Precast');
			const TownPrecast = require('TownPrecast');
			const NPC = require('NPC');
			const Town = require('Town');
			const Misc = require('Misc');
			var i, special, unit, tick, target;

			target = this.plotCourse(area, me.area);

			//print(target.course);
			if (target.useWP) {
				Town.goToTown();
			}

			me.inTown && TownPrecast.prepare();
			// handle variable flayer jungle entrances
			if (target.course.indexOf(78) > -1) {
				Town.goToTown(3); // without initiated act, getArea().exits will crash

				special = getArea(78);

				if (special) {
					special = special.exits;

					for (i = 0; i < special.length; i += 1) {
						if (special[i].target === 77) {
							target.course.splice(target.course.indexOf(78), 0, 77); // add great marsh if needed

							break;
						}
					}
				}
			}

			while (target.course.length) {
				!me.inTown && Precast();

				if (this.wpAreas.indexOf(me.area) > -1 && !getWaypoint(this.wpAreas.indexOf(me.area))) {
					this.getWP(me.area, clearPath);
				}

				if (me.inTown && this.wpAreas.indexOf(target.course[0]) > -1 && getWaypoint(this.wpAreas.indexOf(target.course[0]))) {
					this.useWaypoint(target.course[0], !this.plotCourse_openedWpMenu);
					Precast();
				} else if (me.area === 109 && target.course[0] === 110) { // Harrogath -> Bloody Foothills
					this.moveTo(5026, 5095, undefined, clearPath);

					unit = getUnit(2, 449); // Gate

					if (unit) {
						for (i = 0; i < 3; i += 1) {
							if (unit.mode) {
								break;
							}

							Misc.click(0, 0, unit);
							//unit.interact();

							tick = getTickCount();

							while (getTickCount() - tick < 3000) {
								if (unit.mode) {
									delay(1000);

									break;
								}

								delay(10);
							}
						}
					}

					this.moveToExit(target.course[0], true, clearPath);
				} else if (me.area === 4 && target.course[0] === 38) { // Stony Field -> Tristram
					this.moveToPreset(me.area, 1, 737, 0, 0, clearPath, true);

					for (i = 0; i < 5; i += 1) {
						if (this.usePortal(38)) {
							break;
						}

						delay(1000);
					}
				} else if (me.area === 40 && target.course[0] === 47) { // Lut Gholein -> Sewers Level 1 (use Trapdoor)
					this.moveToPreset(me.area, 5, 19, 0, 0, clearPath);
					this.useUnit(2, 74, 47);
				} else if (me.area === 74 && target.course[0] === 46) { // Arcane Sanctuary -> Canyon of the Magi
					this.moveToPreset(me.area, 2, 357, 0, 0, clearPath);

					for (i = 0; i < 5; i += 1) {
						unit = getUnit(2, 357);

						Misc.click(0, 0, unit);
						delay(1000);
						me.cancel();

						if (this.usePortal(46)) {
							break;
						}
					}
				} else if (me.area === 54 && target.course[0] === 74) { // Palace -> Arcane
					this.moveTo(10073, 8670, undefined, clearPath);
					this.usePortal(null);
				} else if (me.area === 109 && target.course[0] === 121) { // Harrogath -> Nihlathak's Temple
					Town.move(NPC.Anya);
					this.usePortal(121);
				} else if (me.area === 111 && target.course[0] === 125) { // Abaddon
					this.moveToPreset(111, 2, 60, 0, 0, clearPath);
					this.usePortal(125);
				} else if (me.area === 112 && target.course[0] === 126) { // Pits of Archeon
					this.moveToPreset(112, 2, 60, 0, 0, clearPath);
					this.usePortal(126);
				} else if (me.area === 117 && target.course[0] === 127) { // Infernal Pit
					this.moveToPreset(117, 2, 60, 0, 0, clearPath);
					this.usePortal(127);
				} else {
					this.moveToExit(target.course[0], true, clearPath);
				}

				target.course.shift();
			}

			return me.area === area;
		},

		plotCourse_openedWpMenu: false,

		/*
			Pather.plotCourse(dest, src);
			dest - destination area id
			src - starting area id
		*/
		plotCourse: function (dest, src) {
			var node, prevArea,
				useWP = false,
				arr = [],
				previousAreas = [0, 0, 1, 2, 3, 10, 5, 6, 2, 3, 4, 6, 7, 9, 10, 11, 12, 3, 17, 17, 6, 20, 21, 22, 23, 24, 7, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 4, 1, 1, 40, 41, 42, 43, 44, 74, 40, 47, 48, 40, 50, 51, 52, 53, 41, 42, 56, 45, 55, 57, 58, 43, 62, 63, 44, 46, 46, 46, 46, 46, 46, 46, 1, 54, 1, 75, 76, 76, 78, 79, 80, 81, 82, 76, 76, 78, 86, 78, 88, 87, 89, 80, 92, 80, 80, 81, 81, 82, 82, 83, 100, 101, 1, 103, 104, 105, 106, 107, 1, 109, 110, 111, 112, 113, 113, 115, 115, 117, 118, 118, 109, 121, 122, 123, 111, 112, 117, 120, 128, 129, 130, 131, 109, 109, 109, 109],
				visitedNodes = [],
				toVisitNodes = [{from: dest, to: null}];

			if (!src) {
				src = me.area;
			}

			if (!this.plotCourse_openedWpMenu && me.inTown && Pather.useWaypoint(null)) {
				this.plotCourse_openedWpMenu = true;
			}

			while (toVisitNodes.length > 0) {
				node = toVisitNodes[0];

				// If we've already visited it, just move on
				if (visitedNodes[node.from] === undefined) {
					visitedNodes[node.from] = node.to;

					if (this.areasConnected(node.from, node.to)) {
						// If we have this wp we can start from there
						if ((me.inTown || // check wp in town
							((src !== previousAreas[dest] && dest !== previousAreas[src]) && // check wp if areas aren't linked
								previousAreas[src] !== previousAreas[dest])) && // check wp if areas aren't linked with a common area
							Pather.wpAreas.indexOf(node.from) > 0 && getWaypoint(Pather.wpAreas.indexOf(node.from))
						) {
							if (node.from !== src) {
								useWP = true;
							}

							src = node.from;
						}

						// We found it, time to go
						if (node.from === src) {
							break;
						}

						if ((prevArea = previousAreas[node.from]) !== 0 && visitedNodes.indexOf(prevArea) === -1) {
							toVisitNodes.push({from: prevArea, to: node.from});
						}

						for (prevArea = 1; prevArea < previousAreas.length; prevArea += 1) {
							// Only interested in those connected to node
							if (previousAreas[prevArea] === node.from && visitedNodes.indexOf(prevArea) === -1) {
								toVisitNodes.push({from: prevArea, to: node.from});
							}
						}
					}

					toVisitNodes.shift();
				} else {
					useWP = true;
				}
			}

			arr.push(src);

			node = src;

			while (node !== dest && node !== undefined) {
				arr.push(node = visitedNodes[node]);
			}

			// Something failed
			if (node === undefined) {
				return false;
			}

			return {course: arr, useWP: useWP};
		},

		/*
			Pather.areasConnected(src, dest);
			dest - destination area id
			src - starting area id
		*/
		areasConnected: function (src, dest) {
			if (src === 46 && dest === 74) {
				return false;
			}

			return true;
		},

		walkDistanceTo: function (x, y) {
			return this.walkPathDistance(me.x, me.y, x, y);
		},

		walkPathDistance: function (x, y, xx, yy) {
			let path = getPath(me.area, x, y, xx, yy, 0, this.walkDistance);
			if (path.length == 0) {
				return Infinity;
			}
			return path.reduce((acc, v, i, arr) => {
				let prev = i ? arr[i-1] : v;
				return acc + Math.sqrt((prev.x-v.x)*(prev.x-v.x) + (prev.y-v.y)*(prev.y-v.y));
			}, 0);
		},

		/*
			Pather.getAreaName(area);
			area - id of the area to get the name for
		*/
		getAreaName: function (area) {
			var areas = [
				"None",
				"Rogue Encampment",
				"Blood Moor",
				"Cold Plains",
				"Stony Field",
				"Dark Wood",
				"Black Marsh",
				"Tamoe Highland",
				"Den Of Evil",
				"Cave Level 1",
				"Underground Passage Level 1",
				"Hole Level 1",
				"Pit Level 1",
				"Cave Level 2",
				"Underground Passage Level 2",
				"Hole Level 2",
				"Pit Level 2",
				"Burial Grounds",
				"Crypt",
				"Mausoleum",
				"Forgotten Tower",
				"Tower Cellar Level 1",
				"Tower Cellar Level 2",
				"Tower Cellar Level 3",
				"Tower Cellar Level 4",
				"Tower Cellar Level 5",
				"Monastery Gate",
				"Outer Cloister",
				"Barracks",
				"Jail Level 1",
				"Jail Level 2",
				"Jail Level 3",
				"Inner Cloister",
				"Cathedral",
				"Catacombs Level 1",
				"Catacombs Level 2",
				"Catacombs Level 3",
				"Catacombs Level 4",
				"Tristram",
				"Moo Moo Farm",
				"Lut Gholein",
				"Rocky Waste",
				"Dry Hills",
				"Far Oasis",
				"Lost City",
				"Valley Of Snakes",
				"Canyon Of The Magi",
				"Sewers Level 1",
				"Sewers Level 2",
				"Sewers Level 3",
				"Harem Level 1",
				"Harem Level 2",
				"Palace Cellar Level 1",
				"Palace Cellar Level 2",
				"Palace Cellar Level 3",
				"Stony Tomb Level 1",
				"Halls Of The Dead Level 1",
				"Halls Of The Dead Level 2",
				"Claw Viper Temple Level 1",
				"Stony Tomb Level 2",
				"Halls Of The Dead Level 3",
				"Claw Viper Temple Level 2",
				"Maggot Lair Level 1",
				"Maggot Lair Level 2",
				"Maggot Lair Level 3",
				"Ancient Tunnels",
				"Tal Rashas Tomb #1",
				"Tal Rashas Tomb #2",
				"Tal Rashas Tomb #3",
				"Tal Rashas Tomb #4",
				"Tal Rashas Tomb #5",
				"Tal Rashas Tomb #6",
				"Tal Rashas Tomb #7",
				"Duriels Lair",
				"Arcane Sanctuary",
				"Kurast Docktown",
				"Spider Forest",
				"Great Marsh",
				"Flayer Jungle",
				"Lower Kurast",
				"Kurast Bazaar",
				"Upper Kurast",
				"Kurast Causeway",
				"Travincal",
				"Spider Cave",
				"Spider Cavern",
				"Swampy Pit Level 1",
				"Swampy Pit Level 2",
				"Flayer Dungeon Level 1",
				"Flayer Dungeon Level 2",
				"Swampy Pit Level 3",
				"Flayer Dungeon Level 3",
				"Sewers Level 1",
				"Sewers Level 2",
				"Ruined Temple",
				"Disused Fane",
				"Forgotten Reliquary",
				"Forgotten Temple",
				"Ruined Fane",
				"Disused Reliquary",
				"Durance Of Hate Level 1",
				"Durance Of Hate Level 2",
				"Durance Of Hate Level 3",
				"The Pandemonium Fortress",
				"Outer Steppes",
				"Plains Of Despair",
				"City Of The Damned",
				"River Of Flame",
				"Chaos Sanctuary",
				"Harrogath",
				"Bloody Foothills",
				"Frigid Highlands",
				"Arreat Plateau",
				"Crystalline Passage",
				"Frozen River",
				"Glacial Trail",
				"Drifter Cavern",
				"Frozen Tundra",
				"Ancient's Way",
				"Icy Cellar",
				"Arreat Summit",
				"Nihlathak's Temple",
				"Halls Of Anguish",
				"Halls Of Pain",
				"Halls Of Vaught",
				"Abaddon",
				"Pit Of Acheron",
				"Infernal Pit",
				"Worldstone Keep Level 1",
				"Worldstone Keep Level 2",
				"Worldstone Keep Level 3",
				"Throne Of Destruction",
				"The Worldstone Chamber",
				"Matron's Den",
				"Fogotten Sands",
				"Furnace of Pain",
				"Tristram"];

			return areas[area];
		}
	};

	module.exports = Pather;
}).call(null, module, require);