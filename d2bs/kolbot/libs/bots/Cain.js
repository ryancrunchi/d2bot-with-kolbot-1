/**
 * @author ryancrunchi
 * @description Cain quest, with scroll of inifuss and stones handling.
 */
(function (module,require) {
	const Cain = function (Config, Attack, Pickit, Pather, Town) {
		Cain.getScroll();
		Cain.openStones();
		Cain.rescue();
		Cain.talk();
	};
	const Promise = require('Promise'),
			TownPrecast = require('TownPrecast'),
			Precast = require('Precast'),
			Rx = require('Observable'),
			Pather = require('Pather'),
			Attack = require('Attack'),
			Town = require('Town'),
			Pickit = require('Pickit'),
			NPC = require('NPC'),
			Misc = require('Misc'),
			Quests = require('QuestEvents');

	Cain.getScroll = () => {
		if (!me.getItem(524) && !me.getItem(525)) { // need Scroll of Inifuss / Key to the cairn stone
			print("Getting scroll");
			let clearPath = !Pather.useTeleport();
			me.journeyToPreset(sdk.areas.DarkWood, sdk.unittype.Objects, sdk.units.InifussTree, 5, 5, clearPath);		
			Attack.clear(15, 0, getLocaleString(sdk.locale.monsters.TreeheadWoodFist));
			me.journeyToPreset(sdk.areas.DarkWood, sdk.unittype.Objects, sdk.units.InifussTree, 5, 5, clearPath);	
			me.getQuestItem(524, sdk.units.InifussTree);
			Town();
		}
		if (me.getItem(524) && !me.getItem(525)) {
			return me.talkTo(NPC.Akara);
		}
		else {
			print("Already have scroll");
			return true;
		}
	};

	Cain.openStones = () => {
		let clearPath = !Pather.useTeleport();

		// rakanishu
		me.journeyToPreset(sdk.areas.StonyField, sdk.unittype.Monsters, 737, 5, 5, clearPath);
		Attack.clear(15, 0, getLocaleString(sdk.locale.monsters.Rakanishu));

		// go to cain stones and open trist
		var stones = [
			getUnit(2, sdk.units.StoneAlpha),
			getUnit(2, sdk.units.StoneBeta),
			getUnit(2, sdk.units.StoneGamma),
			getUnit(2, sdk.units.StoneDelta),
			getUnit(2, sdk.units.StoneLambda)
		];
		for (var i = 0; i < stones.length; i++) {
			for (var j = 0; j < stones.length; j++) {
				Misc.openChest(stones[j], 200) && Attack.clear(5);
			}
		}
		return true;
	};

	Cain.rescue = (clearLevel = false) => {
		// rakanishu
		me.journeyToPreset(sdk.areas.StonyField, sdk.unittype.Monsters, 737, 5, 5);

		for (var i = 0; i < 10; i += 1) {
			if (!Pather.usePortal(sdk.areas.Tristram)) {
				delay(500);
			}
		}
		// open cain jail
		Pather.moveTo(25175, 5160, 3, clearLevel);
		var jail = getUnit(sdk.unittype.Objects, sdk.units.CainsJail);
		if (jail) {
			for (i = 0; i < 5; i += 1) {
				if (getDistance(me, jail) > 3) {
					Pather.moveToUnit(jail);
				}
			}
			return Misc.openChest(jail) && Town.goToTown();
		}
	};

	Cain.talk = () => {
		return Town.goToTown(1) && me.talkTo(NPC.Cain) && me.talkTo(NPC.Akara);
	};

	module.exports = Cain;
})(typeof module === 'object' && module || {}, typeof require === 'undefined' && (include('require.js') && require) || require );



