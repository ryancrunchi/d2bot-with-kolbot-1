/***
 * @author Jaenster
 * @description An attempt to make auto equipment just work, automatically.
 */

(function (module, require) {
	const Pickit = require('Pickit');
	const Promise = require('Promise');
	const GameData = require('GameData');
	const Town = require('Town');
	const Pather = require('Pather');

	let bestSkills = [];
	(function () {
		let level = me.charlvl;

		// Recalculate everything when we are lvl up
		const promiser = () => new Promise(resolve => me.charlvl !== level && resolve(getTickCount()))
			.then((time) => // First wait 4 seconds
				new Promise(resolve => getTickCount() - time > 1e4 && resolve())
					.then(calculateSkills)
			);

		const calculateSkills = function () {
			promiser(); // Set the promise up.

			bestSkills = GameData.mostUsedSkills(true).map(sk => {
				// We want to know some stuff of the skill
				return {
					skillId: sk.skillId,
					used: sk.used,
					type: GameData.damageTypes[getBaseStat('skills', sk.skillId, 'EType')],
				}
			});
		};
		calculateSkills();
	}).call();

	function formula(item) {
		// + item.getStatEx(sdk.stats.AddskillTab, 10) //ToDO; Fix tab skill we use the most ;)
		const skills = () => {
				let val = item.getStatEx(sdk.stats.Allskills) + item.getStatEx(sdk.stats.Addclassskills, me.classid);

				// Calculate imported skill tabs.
				const tabs = [],
					char = sdk.skillTabs[['amazon', 'sorc', 'necro', 'paladin', 'barb', 'druid', 'assassin'][me.classid]];

				// Loop over all skill tabs of this char
				// And push every skill that has a tab
				Object.keys(char).forEach(types => char[types].skills.some(sk => bestSkills.find(bsk => bsk.skillId === sk)) && tabs.push(char[types].id));

				// Sum total value of all tabs
				val += tabs
					.filter((v, i, s) => s.indexOf(v) === i) // Filter to only have uniques (shouldnt happen, better safe as sorry)
					.reduce((a, tab) => a + item.getStatEx(sdk.stats.AddskillTab, tab), 0); // Sum them

				// Take care of specific + skills
				val += bestSkills.reduce((a, c) => a
					+ item.getStatEx(sdk.stats.Addclassskills, c) // + skills on item
					+ item.getStatEx(sdk.stats.Nonclassskill, c) // + o skills. Dont think it will happen, but, we wouldnt mind if it did happen
					, 0);

				return val * 10; // Boost the value, +1 skills are worth allot
			}, // get all skills

			// Take care of the elemental damage of your best skill. (facets/eschutas/the lot)
			elementDmg = () => bestSkills.reduce(function (a, c) {
				if (sdk.stats.hasOwnProperty('Passive' + c.type + 'Mastery')) a += item.getStatEx(sdk.stats['Passive' + c.type + 'Mastery']); // + skill damage
				if (sdk.stats.hasOwnProperty('Passive' + c.type + 'Pierce')) a += item.getStatEx(sdk.stats['Passive' + c.type + 'Pierce']); // - enemy resistance
				return a;
			}, 0),

			// ToDo; take in account the current resistance. Because at some point, enough is enough
			res = () => (item.getStatEx(sdk.stats.Fireresist)
				+ item.getStatEx(sdk.stats.Coldresist)
				+ item.getStatEx(sdk.stats.Lightresist)
			),
			strdex = () => item.getStatEx(sdk.stats.Strength)
				+ item.getStatEx(sdk.stats.Dexterity),
			vita = () => item.getStatEx(sdk.stats.Vitality),
			hpmp = () => item.getStatEx(sdk.stats.Maxhp)
				+ item.getStatEx(sdk.stats.Maxmana)
				+ item.getStatEx(sdk.stats.PerLevelHp) / 2048 * me.charlvl
				+ item.getStatEx(sdk.stats.PerLevelMana) / 2048 * me.charlvl,
			fcr = () => item.getStatEx(sdk.stats.Fastercastrate),
			fbr = () => item.getStatEx(sdk.stats.Fasterblockrate),
			def = () => item.getStatEx(sdk.stats.Armorclass /*defense*/),
			fhr = () => item.getStatEx(sdk.stats.Fastergethitrate /* fhr*/),
			frw = () => item.getStatEx(sdk.stats.Fastermovevelocity /* fwr*/),
			ctb = () => item.getStatEx(sdk.stats.Toblock /*ctb = chance to block*/),
			ias = () => {
				// This is a tricky one. A sorc, doesnt give a shit about IAS.
				// 0='amazon',1='sorc',2='necro',3='paladin',4='barb',5='druid',6='assassin'
				// ToDo; make

			},
			eth = () => {
				if (!item.ethereal) {
					return 1;
				}
				let factor = 1.5;
				if (item.getStatEx(sdk.stats.ReplenishDurability) > 0 || item.getStatEx(sdk.stats.ReplenishQuantity) > 0) {
					return factor;
				}
				return 1 / factor;
			};

		const tiers = {
			helm: {
				magic: () => (skills() * 1000
					+ elementDmg() * 100
					+ (hpmp() + res()) * 100
					+ def())
					* eth(),

				rare: () => (skills() * 10000
					+ elementDmg() * 1000
					+ (hpmp() + res()) * 1000
					+ def())
					* eth()
			},

			amulet: {
				magic: () => (skills() * 1000)
					+ (res() * 1000)
					+ (strdex() * 100)
					+ (hpmp() * 10)
					+ (fcr() + fbr() + def()),

				rare: () => (skills() * 1000)
					+ (res() * 1000)
					+ (strdex() * 100)
					+ (hpmp() * 10)
					+ (ctb() * 100) // Safety crafted amulet
					+ (fcr() + fbr() + def()),


			},

			armor: {
				magic: () => (skills() * 10000
					+ res() * 1000
					+ elementDmg() * 1000
					+ strdex() * 1000
					+ hpmp() * 100
					+ def())
					* eth(),

				rare: () => (skills() * 100000
					+ res() * 10000
					+ elementDmg() * 10000
					+ strdex() * 10000
					+ hpmp() * 1000
					+ def())
					* eth(),
			},

			weapon: {
				magic: () => (skills() * 10000
					+ elementDmg() * 5000
					+ res() * 1000
					+ hpmp() * 100
					+ strdex() * 10
					+ fcr())
					* eth(),

				rare: () => (skills() * 10000
					+ elementDmg() * 5000
					+ res() * 1000
					+ (hpmp() + strdex()) * 1000
					+ fcr())
					* eth(),
			},
			shield: {
				magic: () => (res() * 10000
					+ elementDmg() * 5000
					+ (strdex() + vita()) * 1000
					+ (fbr() + ctb()) * 100
					+ def())
					* eth(),

				set: () => (res() * 100000
					+ elementDmg() * 50000
					+ (strdex() + vita()) * 10000
					+ (fbr() + ctb()) * 1000
					+ def())
					* eth(),
			},

			ring: {
				magic: () => (res() * 1000)
					+ ((hpmp() + strdex()) * 100)
					+ fcr(),

				rare: () => (res() + fcr() * 10000)
					+ ((hpmp() + strdex()) * 1000),
			},

			belt: {
				magic: () => (res() * 10000
					+ strdex() * 1000
					+ hpmp() * 100
					+ fhr() * 10
					+ def())
					* eth(),

				rare: () => (res() * 100000
					+ strdex() * 10000
					+ hpmp() * 1000
					+ fhr() * 10
					+ def())
					* eth()
			},

			boots: {
				magic: () => (res() * 10000
					+ (strdex() + vita()) * 100
					+ hpmp() * 100
					+ frw() * 10
					+ def())
					* eth(),

				rare: () => (res() * 100000
					+ (strdex() + vita()) * 10000
					+ hpmp() * 1000
					+ frw() * 10
					+ def())
					* eth(),
			},

			gloves: {
				magic: () => ((res() + skills()) * 10000
					+ strdex() * 1000
					+ hpmp() * 100
					+ def())
					* eth(),

				rare: () => ((res() + skills()) * 100000
					+ strdex() * 10000
					+ hpmp() * 1000
					+ def())
					* eth(),
			},

		};

		const bodyLoc = item.getBodyLoc().first(); // always returns an array, as weapon/shield / rings have multiple slots

		if (!bodyLoc) return false; // Its not an equitable item


		const isRuneword = !!item.getFlag(0x4000000 /* runeword*/),
			tierFuncs = Object.keys(tiers).map(key => tiers[key])[bodyLoc - 1];

		if (tierFuncs === undefined) {
			//print('klasdfjlkasdjflkasdjflkasdjflkasdjfkl --- ' + item.name);
			//throw Error('Should not happen?');
			return 0;
		}
		const [magicTier, rareTier] = [tierFuncs.magic, tierFuncs.rare];

		if (isRuneword || item.quality >= sdk.itemquality.rare) {
			if (typeof rareTier === 'function') {
				let tier = rareTier();
				print('TIER OF RARE -- ' + tier + ' -- ' + item.name);
				return tier;
			}
			print('Error? magicTier is not an function?');
			return 0;
		}
		// magical, or lower
		if (typeof magicTier === 'function') {
			let tier = magicTier();
			print('TIER OF MAGIC -- ' + tier + ' -- ' + item.name);
			return tier;
		}
		print('Error? magicTier is not an function?');
		return 0;
	}

	/**
	 * @description Returns the item that is best.
	 * @param a
	 * @param b
	 */
	const compare = (a, b) => formula(a) < formula(b) && b || a;

	function AutoEquip() { // So we can call new upon it. Not sure why yet

	}

	require('Debug');

	AutoEquip.want = function (item) {
		return item.__wanted__by_AutoEquip = (function () {
			// If we already excluded this item, lets not rerun this
			if (item.hasOwnProperty('__wanted__by_AutoEquip') && !item.__wanted__by_AutoEquip) return false;

			if (!item) return false; // We dont want an item that doesnt exists
			const bodyLoc = item.getBodyLoc().first();

			if (!bodyLoc) return false; // Only items that we can wear

			if (!item.identified) { // Tell the network we need to identify it first
				return -1; // We want to identify this
			}

			const forClass = getBaseStat("itemtypes", item.itemType, "class");
			if (forClass >= 0 && forClass <= 6 && forClass !== me.classid) {
				return false;
			}

			let dependencies = {};
			dependencies[sdk.itemtype.bow] = sdk.items.arrows;
			dependencies[sdk.items.arrows] = sdk.itemtype.bow;
			dependencies[sdk.itemtype.crossbow] = sdk.items.bolts;
			dependencies[sdk.items.bolts] = sdk.itemtype.crossbow;
			let dependency = dependencies[item.itemType];
			if (dependency) {
				// TODO: item require an other item to be used (bow, crossbow)
				print("Item has dependency, skip");
				return false;
				//quantity * 100 / getBaseStat("items", quiver.classid, "maxstack")
				/*const stock = me.getItemsEx()
					.filter(i => i.classid == dependency && ((i.mode == sdk.itemmode.inStorage && i.location == sdk.storage.Inventory) || i.mode == sdk.itemmode.equipped));
				if (stock.length) {
					return 1;
				}
				// can't use this item as we don't have the dependency
				return -1;*/
			}

			const currentItem = me.getItemsEx()
				.filter(item => item.location === sdk.storage.Equipment && item.bodylocation === bodyLoc)
				.first();

			// This item's specs are already fully readable
			if (item.identified && currentItem) {
				if (compare(currentItem, item) === item) {
					return true;
				} else {
					return false;
				}
			}
			return !!item.getBodyLoc(); // for now, we want all items that we can equip
		}).call();
	};

	AutoEquip.handle = function (item) {
		print("AutoEquip handle "+item.name);
		function dealWithIt(item) {
			item.__wanted__by_AutoEquip = (function () {
				const tier = formula(item);
				print('DEALING WITH IT -- ' + item.name + '. Tier ' + tier);

				let bodyLocs = item.getBodyLoc();
				let currentSlots = bodyLocs.map(l => ({location: l, item: me.getItemsEx()
					.filter(item => item.location === sdk.storage.Equipment && item.bodylocation === l).first()}))
					.sort((a, b) => {
						if (!a.item) {
							return -1;
						}
						if (!b.item) {
							return 1;
						}
						return compare(a.item, b.item) === a.item ? 1 : -1
					});
				// currentSlots sorted by formula ascending (index 0 is worse than index 1)
				let emptySlot = currentSlots.filter(s => !s.item).first();
				let old;
				if (emptySlot) {
					old = item.equip(emptySlot.location);
				}
				else {
					for (var i = 0; i < currentSlots.length && !old; i++) {
						if (compare(currentSlots[i].item, item) === item) {
							old = item.equip(currentSlots[i].location);
						}
					}
				}

				// Sometimes it happens the OLD item seems better once we have the new one in place
				// Was the old item better?
				if (old && old.unequiped) {
					const newTier = formula(old.unequiped.first());
					if (newTier > tier) {
						let res = !!old.rollback();
						return res; // Rollback and return false
					}
				}

				return true;
			}).call()
		}

		function identify(gid) {
			let returnTo = {area: me.area, x: me.x, y: me.y};
			// We can id right now. So lets
			const item = getUnits(4, -1, -1, gid).first();
			if (!item) {
				return false; // Without an item, we cant id the item
			}

			let tome = me.findItem(sdk.items.idtome, sdk.itemmode.inStorage, sdk.storage.Inventory);
			let scroll = me.findItem(sdk.items.idScroll, sdk.itemmode.inStorage, sdk.storage.Inventory);
			let idTool = scroll || tome; // scroll priority
			if (!idTool || (tome && tome.getStat(sdk.stats.Quantity) == 0)) { // Dont have a scroll or tome, or is empty

				//ToDo; go to cain if he is closer by and we dont have scrolls & nothing else to identify
				if (!Town.goToTown(me.act, false, false)) {
					print("unable to go to town");
					return false;
				}
				// Lets go to town to identify
				const npc = Town.initNPC("Shop", "buyIdScroll");
				scroll = npc.getItem(sdk.items.idScroll);
				if (!scroll.buy()) {
					print("unable to buy an id scroll");
					me.cancel();
					//TODO: can't buy scroll, try to identify items and sell to buy a scroll
					if (returnTo.area !== me.area) {
						if (!Town.move('portalspot')) {
							throw new Error("Unable to go back to area "+returnTo.area);
						}
						if (!Pather.usePortal(returnTo.area, null)) {
							throw new Error("Unable to go back to area "+returnTo.area);
						}
						Pather.moveTo(returnTo.x, returnTo.y);
					}
					return false; // cannot buy scroll, cannot id
				}
				// buying scroll put it in tome
				idTool = tome || me.findItem(sdk.items.idScroll, sdk.itemmode.inStorage, sdk.storage.Inventory);
			}


			// send the packet we right click on the tome or scroll

			//  3 attempts
			for (let i = 0, timer = getTickCount();
				 i < 3 && getCursorType() !== 6;
				 i++, timer = getTickCount()
			) {
				//print("using idTool to identify attempt #"+(i+1));
				sendPacket(1, 0x27, 4, gid, 4, idTool.gid);
				while (getCursorType() !== 6) {
					delay(3);
					if (getTickCount() - timer > 2e3) break; // Failed to id it. To bad
				}
			}

			//print('Identified cursor ? ' + (getCursorType() === 6));
			// Try to id the item, 3 attempts
			for (let i = 0, timer = getTickCount();
				 i < 3 && !item.identified;
				 i++, timer = getTickCount()
			) {
				//print("send packet of identifing attempt #"+(i+1));
				getCursorType() === 6 && sendPacket(1, 0x27, 4, gid, 4, idTool.gid);
				while (!item.identified) {
					delay(3);
					if (getTickCount() - timer > 2e3) break; // Failed to id it. To bad
				}
			}


			let failed;
			if ((failed = !item.identified)) {
				item.__wanted__by_AutoEquip = false; // Somehow failed, give up
				print("failed to identify item");
			}

			if (returnTo.area !== me.area) {
				if (!Town.move('portalspot')) {
					throw new Error("Unable to go back to area "+returnTo.area);
				}
				if (!Pather.usePortal(returnTo.area, null)) {
					throw new Error("Unable to go back to area "+returnTo.area);
				}
				Pather.moveTo(returnTo.x, returnTo.y);
			}

			//print("identify res = "+(!failed));
			return !failed;
		}

		if (!item.identified && item.location === sdk.storage.Inventory) {
			identify(item.gid);
		}

		let id = item.identified;
		let deal = dealWithIt(item);
		let res = id && deal;
		//print("handle item identified = "+id);
		//print("handle dealWithIt = "+deal);
		//print("handle res = "+res);
		return res;
	};

	AutoEquip.id = 'AutoEquip';
	AutoEquip.formula = formula;

	module.exports = AutoEquip;

	// Inject ourselfs into the pickit handlers

	Pickit.hooks.push(AutoEquip)

})
(module, require);