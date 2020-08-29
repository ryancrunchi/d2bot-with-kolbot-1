(function (module, require) {
	const MonsterData = require('./MonsterData');
	const QuestData = require('./QuestData');
	const SUPER = [0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 1, 0, 1, 4, 0, 2, 3, 1, 0, 1, 1, 0, 0, 0, 1, 3, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 5, 1, 1, 1, 1, 3];
	const AREA_LOCALE_STRING = [5389, 5055, 5054, 5053, 5052, 5051, 5050, 5049, 5048, 5047, 5046, 5045, 5044, 5043, 5042, 5041, 5040, 5039, 5038, 5037, 5036, 5035, 5034, 5033, 5032, 5031, 5030, 5029, 5028, 5027, 5026, 5025, 5024, 5023, 5022, 5021, 5020, 5019, 5018, 788, 852, 851, 850, 849, 848, 847, 846, 845, 844, 843, 842, 841, 840, 839, 838, 837, 836, 835, 834, 833, 832, 831, 830, 829, 828, 827, 826, 826, 826, 826, 826, 826, 826, 825, 824, 820, 819, 818, 817, 816, 815, 814, 813, 812, 810, 811, 809, 808, 806, 805, 807, 804, 845, 844, 803, 802, 801, 800, 799, 798, 797, 796, 795, 790, 792, 793, 794, 791, 789, 22646, 22647, 22648, 22649, 22650, 22651, 22652, 22653, 22654, 22655, 22656, 22657, 22658, 22659, 22660, 22662, 21865, 21866, 21867, 22663, 22664, 22665, 22667, 22666, 5389, 5389, 5389, 5018];
	const MONSTER_KEYS = [
		['mon1', 'mon2', 'mon3', 'mon4', 'mon5', 'mon6', 'mon7', 'mon8', 'mon9', 'mon10'],
		['nmon1', 'nmon2', 'nmon3', 'nmon4', 'nmon5', 'nmon6', 'nmon7', 'nmon8', 'nmon9', 'nmon10'],
	][me.diff && 1]; // mon is for normal, nmon is for nm/hell, umon is specific to picking champion/uniques in normal
	const LocaleStringName = require('./LocaleStringID').LocaleStringName;
	const AREA_INDEX_COUNT = 137;
	/**
	 *  AreaData[areaID]
	 *  .Super = number of super uniques present in this area
	 *  .Index = areaID
	 *  .Act = act this area is in [0-4]
	 *  .MonsterDensity = value used to determine monster population density
	 *  .ChampionPacks.Min = minimum number of champion or unique packs that spawn here
	 *  .ChampionPacks.Max = maximum number of champion or unique packs that spawn here
	 *  .Waypoint = number in waypoint menu that leads to this area
	 *  .Level = level of area (use GameData.areaLevel)
	 *  .Size.x = width of area
	 *  .Size.y = depth of area
	 *  .Monsters = array of monsters that can spawn in this area
	 *  .LocaleString = locale string index for getLocaleString
	 */

	var AreaData = new Array(AREA_INDEX_COUNT);

	for (let i = 0; i < AreaData.length; i++) {
		let index = i;
		AreaData[i] = ({
			Super: SUPER[index],
			Index: index,
			Act: getBaseStat('levels', index, 'Act'),
			MonsterDensity: getBaseStat('levels', index, ['MonDen', 'MonDen(N)', 'MonDen(H)'][me.diff]),
			ChampionPacks: ({
				Min: getBaseStat('levels', index, ['MonUMin', 'MonUMin(N)', 'MonUMin(H)'][me.diff]),
				Max: getBaseStat('levels', index, ['MonUMax', 'MonUMax(N)', 'MonUMax(H)'][me.diff])
			}),
			Waypoint: getBaseStat('levels', index, 'Waypoint'),
			Level: getBaseStat('levels', index, ['MonLvl1Ex', 'MonLvl2Ex', 'MonLvl3Ex'][me.diff]),
			Size: (() => {
				if (index === 111) { // frigid highlands doesn't specify size, manual measurement
					return {x: 210, y: 710};
				}

				if (index === 112) { // arreat plateau doesn't specify size, manual measurement
					return {x: 690, y: 230};
				}

				return {
					x: getBaseStat('leveldefs', index, ['SizeX', 'SizeX(N)', 'SizeX(H)'][me.diff]),
					y: getBaseStat('leveldefs', index, ['SizeY', 'SizeY(N)', 'SizeY(H)'][me.diff])
				};
			})(),
			Monsters: (MONSTER_KEYS.map(key => getBaseStat('levels', index, key)).filter(key => key !== 65535)),
			forEachMonster: function (cb) {
				if (typeof cb === 'function') {
					this.Monsters.forEach(monID => {
						cb(MonsterData[monID], MonsterData[monID].Rarity * (MonsterData[monID].GroupCount.Min + MonsterData[monID].GroupCount.Max) / 2);
					});
				}
			},
			forEachMonsterAndMinion: function (cb) {
				if (typeof cb === 'function') {
					this.Monsters.forEach(monID => {
						let rarity = MonsterData[monID].Rarity * (MonsterData[monID].GroupCount.Min + MonsterData[monID].GroupCount.Max) / 2;
						cb(MonsterData[monID], rarity, null);
						MonsterData[monID].Minions.forEach(minionID => {
							let minionrarity = MonsterData[monID].Rarity * (MonsterData[monID].MinionCount.Min + MonsterData[monID].MinionCount.Max) / 2 / MonsterData[monID].Minions.length;
							cb(MonsterData[minionID], minionrarity, MonsterData[monID]);
						});
					});
				}
			},
			LocaleString: getLocaleString(AREA_LOCALE_STRING[index]),
			InternalName: LocaleStringName[AREA_LOCALE_STRING[index]],
			canAccess: function () {
				return QuestData.some(quest => {
					// if we have quest, and it opens the path to this area?
					return me.getQuest(quest.index, 0) && quest.opensAreas.length && quest.opensAreas.includes(this.Index);
				})
			},
			townArea: function () {
				return AreaData[[1, sdk.areas.RogueEncampment, sdk.areas.LutGholein, sdk.areas.KurastDocktown, sdk.areas.PandemoniumFortress, sdk.areas.Harrogath][this.Act]];
			},
			haveWaypoint: function () {
				const Pather = require('./Pather');

				// plot toward this are
				const plot = Pather.plotCourse(this.Index, this.townArea().Index);

				// get the last area that got a WP
				let wpArea = plot.course.filter(el => Pather.wpAreas.indexOf(el) > -1).last();

				// If you dont need a wp, we want at least the town's wp
				return getWaypoint(Pather.wpAreas.indexOf(wpArea || this.townArea().Index));
			}
		});
	}

	AreaData.findByName = function (whatToFind) {
		let matches = AreaData.map(area => [Math.min(whatToFind.diffCount(area.LocaleString), whatToFind.diffCount(area.InternalName)), area]).sort((a, b) => a[0] - b[0]);

		return matches[0][1];
	};

	AreaData.dungeons = {
		DenOfEvil: [sdk.areas.BloodMoor, sdk.areas.DenOfEvil],

		Hole: [sdk.areas.HoleLvl1, sdk.areas.HoleLvl2,],

		Pit: [sdk.areas.PitLvl1, sdk.areas.PitLvl2],

		Cave: [sdk.areas.CaveLvl1, sdk.areas.CaveLvl2],

		UndergroundPassage: [sdk.areas.UndergroundPassageLvl1, sdk.areas.UndergroundPassageLvl2,],

		Cellar: [sdk.areas.TowerCellarLvl1, sdk.areas.TowerCellarLvl2, sdk.areas.TowerCellarLvl3, sdk.areas.TowerCellarLvl4, sdk.areas.TowerCellarLvl5,],

		// act 2
		A2Sewers: [sdk.areas.A2SewersLvl1, sdk.areas.A2SewersLvl2, sdk.areas.A2SewersLvl3,],

		StonyTomb: [sdk.areas.StonyTombLvl1, sdk.areas.StonyTombLvl2,],

		HallsOfDead: [sdk.areas.HallsOfDeadLvl1, sdk.areas.HallsOfDeadLvl2, sdk.areas.HallsOfDeadLvl3,],

		ClawViperTemple: [sdk.areas.ClawViperTempleLvl1, sdk.areas.ClawViperTempleLvl2,],

		MaggotLair: [sdk.areas.MaggotLairLvl1, sdk.areas.MaggotLairLvl2, sdk.areas.MaggotLairLvl3,],

		tombs: [sdk.areas.TalRashasTomb1, sdk.areas.TalRashasTomb2, sdk.areas.TalRashasTomb3, sdk.areas.TalRashasTomb4, sdk.areas.TalRashasTomb5, sdk.areas.TalRashasTomb6, sdk.areas.TalRashasTomb7,],

		// act 3
		Swamp: [sdk.areas.SwampyPitLvl1, sdk.areas.SwampyPitLvl2, sdk.areas.SwampyPitLvl3,],

		FlayerDungeon: [sdk.areas.FlayerDungeonLvl1, sdk.areas.FlayerDungeonLvl2, sdk.areas.FlayerDungeonLvl3,],

		A3Sewers: [sdk.areas.A3SewersLvl1, sdk.areas.A3SewersLvl2,],

		ForgottenTemples: [sdk.areas.RuinedTemple, sdk.areas.DisusedFane, sdk.areas.ForgottenReliquary, sdk.areas.ForgottenTemple, sdk.areas.RuinedFane, sdk.areas.DisusedReliquary,],

		// act 4 has no areas like that

		// act 5
		RedPortalPits: [sdk.areas.Abaddon, sdk.areas.PitOfAcheron, sdk.areas.InfernalPit,],
	};

	module.exports = AreaData;
})(module, require);