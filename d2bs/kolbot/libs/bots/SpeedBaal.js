/**
 *    @filename    SpeedBaal.js
 *    @author        Jaenster
 *    @desc        clear Throne of Destruction and kill Baal
 *
 * Some highlights
 * 1) Faster clearing of the throne by only killing the necessary monsters for a wave to spawn
 * 2) Lightning / Blizzard / Meteor / Hammers / Fury, and many more skills are cast just on time before wave comes. To save mana, but also to have maximum impact
 * 3) Added some custom pickit lines to avoid NPC interactions, to make runs go faster. (again this isn't an mf run, its an xp run)
 * 4) Overrides Attack.clear function to be quicker better for the throne, but don't worry after the script is done (or crashed), it puts the original clear script back.
 */

let mainchar, BaalPartyPeople, Nihla, DiabloClearer, DiabloKill, skipBaalIfCharInGame, skipBaalWho, ShrineSearcher,
	Shriner;

switch (true) {

	// Change (GameName) to whatever run your running
	case /(GameName)-?\d{1,3}/i.test(me.gamename): // If regex matches
		mainchar = 'YourMainChar';

		BaalPartyPeople = [];

		// Who kills nihla?
		Nihla = 'YourMainChar';

		DiabloClearer = 'SomeHelperChar'; // char(in game name) that clears diablo, making it ready for the high lvl
		DiabloKill = 'YourMainChar'; // char(in game name) that kills diablo

		// Who skips baal, can be multiple chars
		skipBaalWho = ['SomePassiveLeechers'];

		// Who search for a shrine, who gets a shrine?
		ShrineSearcher = 'SomeHelperChar'; // Must be diffrent as DiabloClear
		Shriner = 'YourMainChar';
		break;

	// If you run multiple games
	case /(OtherGame)-?\d{1,3}/i.test(me.gamename): // If regex matches
		break;
}


function SpeedBaal() {
	var justPortaledTick = 0;

	// Debug function
	function debug(what) {
		var stackNumber = 1, // exclude this function
			stack = new Error().stack.match(/[^\r\n]+/g),
			line = stack[stackNumber].substr(stack[stackNumber].lastIndexOf(':') + 1),
			functionName = stack[stackNumber].substr(0, stack[stackNumber].indexOf('@')),
			filename = stack[stackNumber].substr(stack[stackNumber].lastIndexOf('\\') + 1),
			self = getScript(true).name.toLowerCase();

		filename = filename.substr(0, filename.indexOf('.'));

		if (typeof what === 'object') {
			what = JSON.stringify(what);
		}
		switch (true) {
			case self.endsWith('default.dbj'):
				print('ÿc:[ÿc5' + filename + 'ÿc:] (ÿc:' + functionName + ':' + line + 'ÿc:):ÿc0 ' + what);
				break;
			case self.endsWith(getCurrentFileName().substr(0, getCurrentFileName().indexOf(':'))):
				print('ÿc:[ÿc5Threadÿc:] (ÿc:' + functionName + ':' + line + 'ÿc:):ÿc0 ' + what);
		}
	}

	function getCurrentFileName() {
		var stack = new Error().stack.match(/[^\r\n]+/g);
		return stack[1].substr(stack[1].lastIndexOf('\\') + 1);
	}

	function addToPickit(line) {
		var i = NTIP_CheckList.length + 1,
			info = {
				line: i + 1,
				file: '',
				string: line
			};
		line = NTIP.ParseLineInt(line, info);
		if (line) {

			NTIP_CheckList.push(line);
			stringArray.push(info);
		}
	}

	function startThread() {
		// We either are the thread, that needs booting, or we are the script that needs to start the thread
		var self = getScript(true).name.toLowerCase(),
			filename = getCurrentFileName().substr(0, getCurrentFileName().indexOf(':'));

		switch (true) {
			case self.endsWith('default.dbj'):
				addEventListener("copydata", Communication.events.copydata);
				delay(250);
				load('libs/bots/' + filename); // Load our selfs
				return false; // did start the thread, but we aren't the thread
			case self.endsWith(filename): // got loaded
				include("common/Config.js");
				include("common/Storage.js");
				include("common/Pather.js");
				include("common/Prototypes.js");
				Config.init(true);
				Storage.Init();
				Thread.run();
				break;
		}
		return true;
	}

	function togglePartyScript(to) {
		var script = getScript("tools/Party.js");
		if (!script || script.running === to) {
			return false; // Party script not found, or already on/off
		}
		return to ? script.resume() : script.pause();
	}

	var Thread = {
		vault: {
			tick: 0,
			oldtick: 0,
			packetListenerOn: false,
			baalpartyLeft: false,
			baalpartyJoined: false,
			diabloDone: false,
			diabloUp: false,
			diabloCreating: false,
			shrineCreating: false,
			shrineUp: false,
			partyScriptRunning: true,
			gameStart: getTickCount(),
		},
		checks: {
			// Baalparty crap
			baalpartyLeave: function () {

				if (Thread.vault.baalpartyLeft || Thread.vault.baalpartyJoined) {
					return true;
				}

				// Stop party script if running longer as 60 seconds
				if (me.area === Areas.ThroneOfDestruction && Thread.vault.partyScriptRunning && getTickCount() - Thread.vault.gameStart > 60e3) {
					Thread.vault.partyScriptRunning = false;
					debug('stopping party script');
					togglePartyScript(false); // stop partying
				}
				// In case it doesnt need to be ran
				if (BaalPartyPeople.indexOf(me.name) === -1 || Thread.vault.baalpartyLeft || me.area !== Areas.WorldstoneChamber) {
					return true;
				}
				//ToDo: make this check in throne, take in account the distance of the throne entrance


				try {
					togglePartyScript(false); // put party script off
					let party = getParty();
					if (party) {
						clickParty(party, 3); // leave current party
					}
					delay(me.ping * 3 + rand(0, 1500)); // wait a bit
					Thread.vault.baalpartyLeft = true;
					if (me.name === mainchar) {
						togglePartyScript(true);
					}
					debug('left party to later join baalparty');
				} catch (e) {
					// nothing, retry next time
				}
				return true;
			},
			baalpartyJoin: function () {
				if (!Thread.vault.baalpartyLeft || Thread.vault.baalpartyJoined) {
					return true; // Not left yet, so can join
				}

				if (this.hasOwnProperty('baalpartyLeave')) {
					delete this['baalpartyLeave'];
				}

				// ToDo: Stole some from party script here. need to write my own but for now its fine
				var myPartyId, player, otherParty;
				player = getParty();

				if (player) {
					while (player.getNext()) {
						switch (Config.PublicMode) {
							case 1: // Invite others, and accept
							case 3: // Invite others but never accept

								// Ingore hostiled players
								if (getPlayerFlag(me.gid, player.gid, 8)) {
									break;
								}

								// Inivite others that aren't partied in the first place
								if (BaalPartyPeople.indexOf(player.name) !== -1				// Only people in the list
									&& player.partyflag !== 4  								// If not already invited
									&& (Config.PublicMode === 1 || player.partyflag !== 2)  // Only accept if we want to accept
									&& player.partyid === 65535) {							// If not in a party (or party 65535 aka last party)

									if (me.name !== mainchar) {
										clickParty(player, 2);
									}
									delay(100);
								}

								break;
							case 2: // Accept invites
								debug('Accept party of ' + player.name + '?');
								debug('BaalPartyPeople.indexOf(player.name): ' + BaalPartyPeople.indexOf(player.name));
								debug(' player.partyflag === 2: ' + player.partyflag === 2);
								debug('Other party? ' + (!otherParty || player.partyid === otherParty));
								if (BaalPartyPeople.indexOf(player.name) !== -1 	  // Only people in baalpartypeople
									&& player.partyflag === 2 						  // That are inviting me
								) {
									clickParty(player, 2);
									Thread.vault.baalpartyJoined = true; // no need to keep checking this now
									delay(100);
								}
								break;
						}
					}
				}
				return true;

			},

			// Check if dia is being setup
			DiaCreating: function () {
				if (Thread.vault.diabloCreating) {
					return true;
				}

				let party, readable = false;
				party = getParty();

				if (party) {
					do {
						if (party.name !== me.name && party.area) {
							readable = true; // Can read player area
						}
					} while (party.getNext());
				}

				if (!readable) {
					return true; // cant read party area info yet
				}
				party = getParty();

				if (party) {
					do {
						if (party.name === DiabloClearer && party.area === Areas.ChaosSanctuary) {
							debug('Diablo is being created atm');
							// Player is in throne so we can assume diablo is up
							Thread.vault.diabloCreating = true;
						}
					} while (party.getNext());
				}
				return true;
			},
			DiaReady: function () {

				// If this check is done, dont check it
				if (!Thread.vault.diabloCreating || Thread.vault.diabloUp || DiabloKill !== me.name) {
					return true;
				}

				if (this.hasOwnProperty('DiaCreating')) {
					delete this['DiaCreating'];
				}

				let party, readable = false;
				party = getParty();

				if (party) {
					do {
						if (party.name !== me.name && party.area) {
							readable = true; // Can read player area
						}
					} while (party.getNext());
				}

				if (!readable) {
					return true; // cant read party area info yet
				}


				party = getParty();

				if (party) {
					do {
						if (party.name === DiabloClearer && party.area === Areas.ThroneOfDestruction) {
							debug('Diablo should be up now');
							// Player is in throne so we can assume diablo is up
							Thread.vault.diabloUp = true;

							removeEventListener('gamepacket', Thread.events.gamePacket); // disable it a second
							delay(500); // Do this or get massive lag spikes! (weird buggy stuff of d2bs)
							Communication.setVariable('diabloUp', true);
							delay(500);
							addEventListener('gamepacket', Thread.events.gamePacket); // enable it
						}
					} while (party.getNext());
				}
				return true;
			},

			ShrineCreating: function () {
				if (Thread.vault.shrineCreating || Shriner !== me.name) {
					return true;
				}

				let party, readable = false;
				party = getParty();

				if (party) {
					do {
						if (party.name !== me.name && party.area) {
							readable = true; // Can read player area
						}
					} while (party.getNext());
				}

				if (!readable) {
					return true; // cant read party area info yet
				}
				party = getParty();

				if (party) {
					do {
						if (party.name === ShrineSearcher && [Areas.ColdPlains, Areas.StonyField, Areas.DarkWood, Areas.BlackMarsh, Areas.JailLvl2, Areas.CatacombsLvl2].indexOf(party.area) !== -1) {
							debug('Shrine is being searched');
							// Player is in throne so we can assume diablo is up
							Thread.vault.shrineCreating = true;
						}
					} while (party.getNext());
				}
				return true;
			},
			ShrineReady: function () {

				// If this check is done, dont check it
				if (!Thread.vault.shrineCreating || Thread.vault.shrineUp || Shriner !== me.name) {
					return true;
				}

				if (this.hasOwnProperty('ShrineCreating')) {
					delete this['ShrineCreatingr'];
				}

				let party, readable = false;
				party = getParty();

				if (party) {
					do {
						if (party.name !== me.name && party.area) {
							readable = true; // Can read player area
						}
					} while (party.getNext());
				}

				if (!readable) {
					return true; // cant read party area info yet
				}

				party = getParty();

				if (party) {
					do {
						if (party.name === ShrineSearcher && party.area === Areas.ThroneOfDestruction) {
							debug('Shrine should be up now');
							// Player is in throne so we can assume shrine is up
							Thread.vault.shrineUp = true;

							removeEventListener('gamepacket', Thread.events.gamePacket); // disable it a second
							delay(500); // Do this or get massive lag spikes! (weird buggy stuff of d2bs)
							Communication.setVariable('shrineUp', true);
							delay(500);
							addEventListener('gamepacket', Thread.events.gamePacket); // enable it
						}
					} while (party.getNext());
				}
				return true;
			},

			// Baal wave sign
			tickUpdate: function () {
				if (Thread.vault.tick !== Thread.vault.oldtick) {
					removeEventListener('gamepacket', Thread.events.gamePacket); // disable it a second
					debug('Throne ready for wave. Will spawn in 12 seconds');
					delay(500); // Do this or get massive lag spikes! (weird buggy stuff of d2bs)
					Communication.setVariable('tick', Thread.vault.tick);
					delay(500);
					addEventListener('gamepacket', Thread.events.gamePacket); // enable it
					Thread.vault.oldtick = Thread.vault.tick;
				}

				// In throne and packet listener is off?
				if (!Thread.vault.packetListenerOn && me.area === Areas.ThroneOfDestruction) {
					addEventListener('gamepacket', Thread.events.gamePacket);
					Thread.vault.packetListenerOn = true;
				}

				// Not in throne but packet listener on?
				if (Thread.vault.packetListenerOn && me.area !== Areas.ThroneOfDestruction) {
					removeEventListener('gamepacket', Thread.events.gamePacket);
					Thread.vault.packetListenerOn = false;
				}
			},
		},
		events: {
			gamePacket: function (bytes) {
				// Quickly return if it isn't the desired packet.
				// This will avoid the "too much recursion" issues @ javascript
				if (bytes[0] !== 0xA4) {
					return false;
				}

				// 0xA4 -- Throne is ready.  Listed as a undefined packet by the general info about the packets but that is what it means.
				// Its what triggers the typical "baal laugh" after you finished a wave, or cleared the throne.
				Thread.vault.tick = getTickCount();
				return false; // False to not block the packet
			},
		},
		run: function () {
			debug('thread started');

			// This is a special thread, only listing for the gamepacket and send it.
			//addEventListener("copydata", Communication.events.copydata);
			Communication.setVariable('threadStarted', true);
			delay(5000);
			while (me.ingame) {
				for (var i in this.checks) {
					if (this.checks.hasOwnProperty(i) && typeof this.checks[i] === "function" && i !== "go") {
						this.checks[i]();
					}
					delay(200);
				}
			}
		}
	};
	var Skills = {
		// General
		Attack: 0,
		Kick: 1,
		Throw: 2,
		Unsummon: 3,
		LeftHandThrow: 4,
		LeftHandSwing: 5,

		// Amazone
		MagicArrow: 6,
		FireArrow: 7,
		InnerSight: 8,
		CriticalStrike: 9,
		Jab: 10,
		ColdArrow: 11,
		MultipleShot: 12,
		Dodge: 13,
		PowerStrike: 14,
		PoisonJavelin: 15,
		ExplodingArrow: 16,
		SlowMissiles: 17,
		Avoid: 18,
		Impale: 19,
		LightningBolt: 20,
		IceArrow: 21,
		GuidedArrow: 22,
		Penetrate: 23,
		ChargedStrike: 24,
		PlagueJavelin: 25,
		Strafe: 26,
		ImmolationArrow: 27,
		Dopplezon: 28,
		Evade: 29,
		Fend: 30,
		FreezingArrow: 31,
		Valkyrie: 32,
		Pierce: 33,
		LightningStrike: 34,
		LightningFury: 35,

		// Sorc
		FireBolt: 36,
		Warmth: 37,
		ChargedBolt: 38,
		IceBolt: 39,
		FrozenArmor: 40,
		Inferno: 41,
		StaticField: 42,
		Telekinesis: 43,
		FrostNova: 44,
		IceBlast: 45,
		Blaze: 46,
		FireBall: 47,
		Nova: 48,
		Lightning: 49,
		ShiverArmor: 50,
		FireWall: 51,
		Enchant: 52,
		ChainLightning: 53,
		Teleport: 54,
		GlacialSpike: 55,
		Meteor: 56,
		ThunderStorm: 57,
		EnergyShield: 58,
		Blizzard: 59,
		ChillingArmor: 60,
		FireMastery: 61,
		Hydra: 62,
		LightningMastery: 63,
		FrozenOrb: 64,
		ColdMastery: 65,

		// Necro
		AmplifyDamage: 66,
		Teeth: 67,
		BoneArmor: 68,
		SkeletonMastery: 69,
		RaiseSkeleton: 70,
		DimVision: 71,
		Weaken: 72,
		PoisonDagger: 73,
		CorpseExplosion: 74,
		ClayGolem: 75,
		IronMaiden: 76,
		Terror: 77,
		BoneWall: 78,
		GolemMastery: 79,
		RaiseSkeletalMage: 80,
		Confuse: 81,
		LifeTap: 82,
		PoisonExplosion: 83,
		BoneSpear: 84,
		BloodGolem: 85,
		Attract: 86,
		Decrepify: 87,
		BonePrison: 88,
		SummonResist: 89,
		IronGolem: 90,
		LowerResist: 91,
		PoisonNova: 92,
		BoneSpirit: 93,
		FireGolem: 94,
		Revive: 95,

		// Paladin
		Sacrifice: 96,
		Smite: 97,
		Might: 98,
		Prayer: 99,
		ResistFire: 100,
		HolyBolt: 101,
		HolyFire: 102,
		Thorns: 103,
		Defiance: 104,
		ResistCold: 105,
		Zeal: 106,
		Charge: 107,
		BlessedAim: 108,
		Cleansing: 109,
		ResistLightning: 110,
		Vengeance: 111,
		BlessedHammer: 112,
		Concentration: 113,
		HolyFreeze: 114,
		Vigor: 115,
		Conversion: 116,
		HolyShield: 117,
		HolyShock: 118,
		Sanctuary: 119,
		Meditation: 120,
		FistoftheHeavens: 121,
		Fanaticism: 122,
		Conviction: 123,
		Redemption: 124,
		Salvation: 125,

		// Barb
		Bash: 126,
		SwordMastery: 127,
		AxeMastery: 128,
		MaceMastery: 129,
		Howl: 130,
		FindPotion: 131,
		Leap: 132,
		DoubleSwing: 133,
		PoleArmMastery: 134,
		ThrowingMastery: 135,
		SpearMastery: 136,
		Taunt: 137,
		Shout: 138,
		Stun: 139,
		DoubleThrow: 140,
		IncreasedStamina: 141,
		FindItem: 142,
		LeapAttack: 143,
		Concentrate: 144,
		IronSkin: 145,
		BattleCry: 146,
		Frenzy: 147,
		IncreasedSpeed: 148,
		BattleOrders: 149,
		GrimWard: 150,
		Whirlwind: 151,
		Berserk: 152,
		NaturalResistance: 153,
		WarCry: 154,
		BattleCommand: 155,

		// Druid
		Raven: 221,
		PlaguePoppy: 222,
		Wearwolf: 223,
		ShapeShifting: 224,
		Firestorm: 225,
		OakSage: 226,
		SummonSpiritWolf: 227,
		Wearbear: 228,
		MoltenBoulder: 229,
		ArcticBlast: 230,
		CycleofLife: 231,
		FeralRage: 232,
		Maul: 233,
		Eruption: 234,
		CycloneArmor: 235,
		HeartofWolverine: 236,
		SummonFenris: 237,
		Rabies: 238,
		FireClaws: 239,
		Twister: 240,
		Vines: 241,
		Hunger: 242,
		ShockWave: 243,
		Volcano: 244,
		Tornado: 245,
		SpiritofBarbs: 246,
		SummonGrizzly: 247,
		Fury: 248,
		Armageddon: 249,
		Hurricane: 250,

		// Sorc
		FireTrauma: 251,
		ClawMastery: 252,
		PsychicHammer: 253,
		TigerStrike: 254,
		DragonTalon: 255,
		ShockField: 256,
		BladeSentinel: 257,
		Quickness: 258,
		FistsofFire: 259,
		DragonClaw: 260,
		ChargedBoltSentry: 261,
		WakeofFireSentry: 262,
		WeaponBlock: 263,
		CloakofShadows: 264,
		CobraStrike: 265,
		BladeFury: 266,
		Fade: 267,
		ShadowWarrior: 268,
		ClawsofThunder: 269,
		DragonTail: 270,
		LightningSentry: 271,
		InfernoSentry: 272,
		MindBlast: 273,
		BladesofIce: 274,
		DragonFlight: 275,
		DeathSentry: 276,
		BladeShield: 277,
		Venom: 278,
		ShadowMaster: 279,
		RoyalStrike: 280,
		WakeOfDestructionSentry: 281,
		tabs: {
			// Ama
			BowCrossbow: 0,
			PassiveMagic: 1,
			JavelinSpear: 2,

			//sorc
			Fire: 8,
			Lightning: 9,
			Cold: 10,

			// Necro
			Curses: 16,
			PosionBone: 17,
			NecroSummoning: 18,

			// Pala
			PalaCombat: 24,
			Offensive: 25,
			Defensive: 26,

			// Barb
			CombatBarb: 32,
			Masteries: 33,
			Warcries: 34,

			// Druid
			DruidSummon: 40,
			ShapeShifting: 41,
			Elemental: 42,

			// Assa
			Traps: 48,
			ShadowDisciplines: 49,
			MartialArts: 50,
		}
	};
	var States = {
		None: 0,
		Freeze: 1,
		Posion: 2,
		ResistFire: 3,
		ResistCold: 4,
		ResistLightning: 5,
		ResistMagic: 6,
		PlayerBody: 7,
		ResistAll: 8,
		AmplifyDamage: 9,
		FrozenArmor: 10,
		Cold: 11,
		Inferno: 12,
		Blaze: 13,
		BoneArmor: 14,
		Concentrate: 15,
		Enchant: 16,
		InnerSight: 17,
		SkillMove: 18,
		Weaken: 19,
		ChillingArmor: 20,
		Stunned: 21,
		SpiderLay: 22,
		DimVision: 23,
		Slowed: 24,
		FetishAura: 25,
		Shout: 26,
		Taunt: 27,
		Conviction: 28,
		Convicted: 29,
		EnergyShield: 30,
		VenomClaws: 31,
		BattleOrders: 32,
		Might: 33,
		Prayer: 34,
		HolyFire: 35,
		Thorns: 36,
		Defiance: 37,
		ThunderStorm: 38,
		LightningBolt: 39,
		BlessedAim: 40,
		Stamina: 41,
		Concentration: 42,
		Holywind: 43,
		HolywindCold: 44,
		Cleansing: 45,
		HolyShock: 46,
		Sanctuary: 47,
		Meditation: 48,
		Fanaticism: 49,
		Redemption: 50,
		BattleCommand: 51,
		PreventHeal: 52,
		Conversion: 53,
		Uninterruptable: 54,
		IronMaiden: 55,
		Terror: 56,
		Attract: 57,
		LifeTap: 58,
		Confuse: 59,
		Decrepify: 60,
		LowerResist: 61,
		OpenWounds: 62,
		Dopplezon: 63,
		CriticalStrike: 64,
		Dodge: 65,
		Avoid: 66,
		Penetrate: 67,
		Evade: 68,
		Pierce: 69,
		Warmth: 70,
		FireMastery: 71,
		LightningMastery: 72,
		ColdMastery: 73,
		SwordMastery: 74,
		AxeMastery: 75,
		MaceMastery: 76,
		PoleArmMastery: 77,
		ThrowingMastery: 78,
		SpearMastery: 79,
		IncreasedStamina: 80,
		IronSkin: 81,
		IncreasedSpeed: 82,
		NaturalResistance: 83,
		FingerMageCurse: 84,
		NoManaReg: 85,
		JustHit: 86,
		SlowMissiles: 87,
		ShiverArmor: 88,
		BattleCry: 89,
		Blue: 90,
		Red: 91,
		DeathDelay: 92,
		Valkyrie: 93,
		Frenzy: 94,
		Berserk: 95,
		Revive: 96,
		ItemFullSet: 97,
		SourceUnit: 98,
		Redeemed: 99,
		Healthpot: 100,
		HolyShield: 101,
		JustPortaled: 102,
		MonFrenzy: 103,
		CorpseNoDraw: 104,
		Alignment: 105,
		Manapot: 106,
		Shatter: 107,
		SyncWarped: 108,
		ConversionSave: 109,
		Pregnat: 110,
		Rabies: 112,
		DefenceCurse: 113,
		BloodMana: 114,
		Burning: 115,
		DragonFlight: 116,
		Maul: 117,
		CorpseNoSelect: 118,
		ShadowWarrior: 119,
		FeralRage: 120,
		SkillDelay: 121,
		ProgressiveDamage: 122,
		ProgressiveSteal: 123,
		ProgressiveOther: 124,
		ProgressiveFire: 125,
		ProgressiveCold: 126,
		ProgressiveLighting: 127,
		ShrineArmor: 128,
		ShrineCombat: 129,
		ShrineResLighting: 130,
		ShrineResFire: 131,
		ShrineResCold: 132,
		ShrineResPoison: 133,
		ShrineSkill: 134,
		ShrineManaRegen: 135,
		ShrineStamina: 136,
		ShrineExperience: 137,
		FenrisRage: 138,
		Wolf: 139,
		Bear: 140,
		Bloodlust: 141,
		ChangeClass: 142,
		Attached: 143,
		Hurricane: 144,
		Armageddon: 145,
		Invis: 146,
		Barbs: 147,
		HeartofWolverine: 148,
		OakSage: 149,
		VineBeast: 150,
		CycloneArmor: 151,
		ClawMastery: 152,
		CloakofShadows: 153,
		Recyled: 154,
		WeaponBlock: 155,
		Cloaked: 156,
		Quickness: 157,
		BladeShield: 158,
		Fade: 159,
	};
	var Areas = {
		// act 1
		RogueEncampment: 1,
		BloodMoor: 2,
		ColdPlains: 3,
		StonyField: 4,
		DarkWood: 5,
		BlackMarsh: 6,
		TamoeHighland: 7,
		DenOfEvil: 8,
		CaveLvl1: 9,
		UndergroundPassageLvl1: 10,
		HoleLvl1: 11,
		PitLvl1: 12,
		CaveLvl2: 13,
		UndergroundPassageLvl2: 14,
		HoleLvl2: 15,
		PitLvl2: 16,
		BurialGrounds: 17,
		Crypt: 18,
		Mausoleum: 19,
		ForgottenTower: 20,
		TowerCellarLvl1: 21,
		TowerCellarLvl2: 22,
		TowerCellarLvl3: 23,
		TowerCellarLvl4: 24,
		TowerCellarLvl5: 25,
		MonasteryGate: 26,
		OuterCloister: 27,
		Barracks: 28,
		JailLvl1: 29,
		JailLvl2: 30,
		JailLvl3: 31,
		InnerCloister: 32,
		Cadral: 33,
		CatacombsLvl1: 34,
		CatacombsLvl2: 35,
		CatacombsLvl3: 36,
		CatacombsLvl4: 37,
		Tristram: 38,
		MooMooFarm: 39,

		// Act 4
		PandemoniumFortress: 103,
		ChaosSanctuary: 108,

		// act 5
		Harrogath: 109,
		WorldstoneLvl2: 129,
		WorldstoneLvl3: 130,
		ThroneOfDestruction: 131,
		WorldstoneChamber: 132,
	};
	var Builds = {
		vault: {},
		mine: undefined,
		Javazon: 1,
		FireBall: 2,
		Blizzard: 3,
		Lightning: 4,
		SuperNova: 5,
		Avengerdin: 6,
		Hammerdin: 7,
		Trapsin: 8,
		WarCry: 9,
		CurseNecro: 10,
		Hurricane: 11,
		// get build of char
		init: function () {
			function sum(array) {
				var k, total = 0;
				for (k = 0; k < array.length; k++) {
					total += array[k];
				}
				return total;
			}

			var i, max = 0, attacks, score, who;
			for (i in this.attackSequences) {
				attacks = this.attackSequences[i].skills.map(function (skill) {
					skill = me.getSkill(skill, 0); // get amount of hardpoints
					if (skill === false) {
						skill = 0;
					}
					return skill;
				});
				score = sum(attacks) / attacks.length * (attacks.length / 3);
				//debug('who: ' + i + ' score: ' + score);
				if (score > max) {
					max = score;
					who = i;
				}
			}
			debug('my build: ' + who + ' == ' + Builds[who]);
			Builds.mine = Builds[who];

			// In case doAttack is defined
			if (this.attackSequences[who].hasOwnProperty('doAttack')) {
				debug('Overloading for ' + who + ' - ClassAttack.doAttack');
				if (typeof Overloading.vault.ClassAttack !== Object) {
					Overloading.vault.ClassAttack = {};
				}
				Overloading.vault.ClassAttack.doAttack = ClassAttack.doAttack; // Store original
				ClassAttack.doAttack = this.attackSequences[who].doAttack; // the real override
			}
		},
		getMonsters: function () {
			var monster = getUnit(1), monsters = [];
			do {
				monsters.push(copyUnit(monster));
			} while (monster.getNext());
			return monsters;
		},
		filters: {
			inRangeMe: function (range, unit) {
				return this.inRangeUnit({
					source: me,
					range: range
				}, unit)
			},
			inRangeUnit: function (compare, unit) {
				var source = compare.source,
					range = compare.range;
				return !!getDistance(source, unit) < range;
			}
		},
		// get attack sequence
		attackSequences: {
			Javazon: {
				skills: [Skills.Fury, Skills.ChargedStrike],
				vault: {
					timer: 0
				},
				doAttack: function (unit) {
					// Typical merc check
					if (Config.MercWatch && Town.needMerc()) {
						Town.visitTown();
					}

					debug(getTickCount() - Builds.attackSequences.Javazon.vault.timer);
					if (getTickCount() - Builds.attackSequences.Javazon.vault.timer > 1000) {
						// Get list of nearby monsters
						var monster = getUnit(1), monsters = [copyUnit(unit)], currentMonster;
						do {
							currentMonster = copyUnit(monster);
							// If monsters are near eachother
							if (Attack.checkMonster(currentMonster)
								&& getDistance(currentMonster, unit) < 7           // Distance between monster and monster are low
							//&& checkCollision(monster, unit, 0x4) // As long there are no collisions between monster and monster
							//&& Attack.checkResist(currentMonster, Skill.LightningFury) // and accually can be attacked
							) {
								monsters.push(currentMonster);
							}
						} while (monster.getNext());

						if (monsters.length > 3) { // if 3 or more monsters are around the unit (the unit itself is included in the list)
							debug('Fury!');
							monsters.sort(Sort.units); // Get the one that the most close to me
							Builds.attackSequences.Javazon.vault.timer = getTickCount();
							Skill.cast(Skills.LightningFury, 0, monsters[0]); // Cast fury
							// Continue with normal attack sequence now
						}
					} else {
						debug('Skipping fury atm');
					}

					// Get timed skill
					var checkSkill = Skills.ChargedStrike;

					if (Math.round(getDistance(me, unit)) > Skill.getRange(checkSkill) || checkCollision(me, unit, 0x4)) {
						if (!Attack.getIntoPosition(unit, Skill.getRange(checkSkill), 0x4)) {
							return 0;
						}
					}

					// check resistance for charged strike
					if (!Attack.checkResist(unit, checkSkill)) {
						checkSkill = Skills.Jab; // Jab if we cant use lighting
					}

					var success = Skill.cast(checkSkill, 1, unit);
					return success;
				}
			},
			FireBall: {
				skills: [Skills.FireBall, Skills.Meteor, Skills.FireMastery, Skills.FireBolt],
			},
			Blizzard: {
				skills: [Skills.Blizzard, Skills.IceBlast, Skills.ColdMastery],
			},
			Lightning: {
				skills: [Skills.Lightning, Skills.ChainLightning, Skills.LightningMastery, Skills.Nova],
			},
			SuperNova: {
				skills: [Skills.FrostNova, Skills.Nova, Skills.StaticField, Skills.FireBall, Skills.FireBolt],

				// Overwrite doAttack for this class
				doAttack: function (unit) {
					var castSome = false;
					if (Math.round(getDistance(me, unit)) > Skill.getRange(Skills.Nova) || checkCollision(me, unit, 0x4)) {
						if (!Attack.getIntoPosition(unit, Skill.getRange(Skills.Nova), 0x4)) {
							return true;
						}
					}
					var monster = getUnit(1), monsters = [];
					do {
						monsters.push(copyUnit(monster));
					} while (monster.getNext());
					do {
						monsters.sort(Sort.units)
							.filter(Attack.checkMonster) // Only valid monsters
							.forEach(function (currentMonster) {
									//debug('checking ' + monster.name);
									[
										[Skills.FrostNova, !currentMonster.getState(1)], // only unfrozen monsters
										[Skills.Nova, 100 / currentMonster.hpmax * currentMonster.hp < 50], // From 50% life
										[Skills.StaticField, 100 / currentMonster.hpmax * currentMonster.hp > 40], // above 45% hp
										[Skills.FireBall, true], // just always
										[Skills.Normal, 100 / me.mpmax * me.mp < 20] // only if we have low mana
									].forEach(function (currentCheck) {
										var check;
										if (!me.getSkill(currentCheck[0], 0)) {
											return; // Dont have current skill, next
										}
										if (getDistance(me, currentMonster) > Skill.getRange(currentCheck[0])) {
											return; // out of range, next
										}
										if (checkCollision(me, unit, 0x4)) {
											return; // Not a clear path to monster, next
										}
										if (!Attack.checkResist(currentMonster, currentCheck[0])) {
											return; // cant harm monster with this skill, next
										}
										if (currentMonster.dead) {
											return; // dead monster doesn't need to die again, next
										}

										if (typeof currentCheck[1] === 'function') {
											check = currentCheck[1](currentMonster);
										} else {
											//debug('Always true?' + currentCheck[1]);
											check = currentCheck[1];
										}

										// Attack?
										if (check) {
											//debug('Casting: ' + getSkillById(currentCheck[0]));
											castSome |= Skill.cast(currentCheck[0], Skill.getHand(currentCheck[0]), currentMonster.x, currentMonster.y);
										}
									});

								}
							);
					} while (!unit.dead && !me.dead);
					return castSome;
				},
			},

			Avengerdin: {
				skills: [Skills.Conviction, Skills.Vengeance],
			},

			Hammerdin: {
				skills: [Skills.BlessedHammer, Skills.BlessedAim, Skills.Concentration, Skills.Vigor],
			},

			CurseNecro: {
				skills: [Skills.LowerResist, Skills.CorpseExplosion], // its skill, or the other
			},

			Trapsin: {
				skills: [Skills.LightningSentry, Skills.DeathSentry, Skills.ShockField],
			},

			WarCry: {
				skills: [Skills.WarCry, Skills.BattleCommand, Skills.BattleOrders],
			},

			Hurricane: {
				skills: [Skills.Hurricane, Skills.Tornado]
			}
		},

		getAttackSequence: function () {
			switch (this.mine) {
				case this.WarCry:
					return this.attackSequences.WarCry;
				case this.CurseNecro:
					return this.attackSequences.CurseNecro;
				case this.Avengerdin:
					return this.attackSequences.Avengerdin;
				case this.Javazon:
					return this.attackSequences.Javazon;
				case this.FireBall:
					return this.attackSequences.FireBall;
				case this.SuperNova:
					return this.attackSequences.SuperNova;
				case this.Hurricane:
					return this.attackSequences.Hurricane;
				default:
					return [ // Just plain attack
						Skills.Normal,
						true
					]
			}
		},
	};
	var Communication = {
		vault: {
			tick: 0,
			diabloDone: false,
			diabloUp: false,
			nihlathakDone: false,
			shrineUp: false,
			shrineDone: false,
		},
		events: {
			copydata: function (mode, msg) {
				if (mode !== 0xDEAD && mode !== 0xBEEF && mode !== 0xDEADBEEF) {
					return true;
				}
				var obj = JSON.parse(msg);
				if (obj.who === false || getScript(true).name.toLowerCase().endsWith(obj.who)) {

					switch (mode) {
						case 0xDEADBEEF: // Run if it is directed at me
							if (Communication.runnable.hasOwnProperty(obj.callable)) {
								debug('ÿc1can\'t run! ' + obj.callable);
							}
							Communication.runnable[obj.callable](obj.arguments);
							break;
						case 0xBEEF: // set value if directed to me
							Communication.vault[obj.key] = obj.value;
							debug(obj.key + '=' + obj.value);
							break;
					}

				}
				return true;
			}
		},
		runnable: {},
		copyData: function (callable, arg, who) {
			if (who === undefined) {
				// Is it the thread?
				if (getScript(true).name.toLowerCase().endsWith(getCurrentFileName())) {
					who = 'default.dbj';
				} else { // Or anyone else?
					who = getCurrentFileName();
				}
			}
			//debug('sending: ' + callable + ' -- ' + arg);
			sendCopyData(null, me.windowtitle, 0xDEADBEEF, JSON.stringify({
				callable: callable,
				script: getScript(true).name.toLowerCase(),
				who: who,
				arguments: arg
			}));
		},

		setVariable: function (key, value) {
			//debug('setting var');
			sendCopyData(null, me.windowtitle, 0xBEEF, JSON.stringify({
				script: getScript(true).name.toLowerCase(),
				who: false, // false = everyone
				key: key,
				value: value
			}));
		},

		waitFor: function (key, value) {
			while (true) {
				if (this.vault.hasOwnProperty(key)) {
					if (this.vault[key] === value) {
						break;
					}
				}
				delay(5);
			}
			return true;
		}
	};
	var baal = {
		// Go to preattack position
		vault: {currentWave: 0},
		// Do certain stuff like replacing the traps after a wave
		run: function () {
			// Get to throne
			var i;

			// In case we are the teleporter, we need/want speed. Id just in town, its quick
			if (Config.FieldID && !Config.SpeedBaal.Follower) {
				Town.fieldID();
			}

			Town.doChores();
			// Non teling
			if (Config.SpeedBaal.Follower) {
				// In case we are not bo'd, but we have a CTA
				if (!me.getState(States.BattleOrders)) {
					this.goBo();
				}
				// Taking portal
				if (me.area < Areas.Harrogath) {
					Town.goToTown(4);

					Town.move("tyrael");

					var npc = getUnit(1, "tyrael");
					if (!npc || !npc.openMenu()) {
						Town.goToTown(5); // Looks like we failed, lets go to act 5 by wp
					} else {
						Misc.useMenu(0x58D2); // Travel to Harrogath
					}

				}
				Town.goToTown(5);
				Town.move("portalspot");

				for (i = 0; i < 30 * 10; i += 1) {
					if (Pather.usePortal(Areas.ThroneOfDestruction, null)) {
						break;
					}

					delay(100);
				}
			} else { // teling
				if (me.area === Areas.Harrogath) {
					if (Pather.getPortal(Areas.ThroneOfDestruction, null)) {

						// Little trick to wait a second, to avoid the just portaled issues of bnet
						if (justPortaledTick) {
							do {
								delay(250)
							} while (getTickCount() - justPortaledTick < 5e3)
						}
						Pather.usePortal(Areas.ThroneOfDestruction, null);
					}
				}
				if (me.area !== Areas.ThroneOfDestruction) {
					// it can happen, throne tp is already up
					Pather.useWaypoint(Areas.WorldstoneLvl2);
					Precast.doPrecast();
					Pather.moveToExit([Areas.WorldstoneLvl3, Areas.ThroneOfDestruction], true);
					Pather.moveTo(15078, 5026);
					if (!Pather.getPortal(Areas.Harrogath, null)) {
						// Make sure we find a relatively safe spot to cast portal
						Attack.deploy({x: 15078, y: 5026}, 7, 2, 15);
						Pather.makePortal();
					}
				}
			}
			new Line(15070, 5000, 15120, 5000, 0x62, true);
			new Line(15120, 5000, 15120, 5075, 0x62, true);
			new Line(15120, 5075, 15070, 5075, 0x62, true);
			new Line(15070, 5075, 15070, 5000, 0x62, true);

			Attack.clear(0); // Clearing throne
			// Do the waves
			while (this.waves.doWaves()) {
				delay(1);
			}

			debug(Misc.inMyParty(skipBaalIfCharInGame));
			debug(skipBaalWho.indexOf(me.name) !== -1);
			if (Misc.inMyParty(skipBaalIfCharInGame) && skipBaalWho.indexOf(me.name) !== -1) {
				Pather.moveTo(15092, 5011);
				while (getUnit(1, 543)) {
					delay(500);
				}
				delay(5000 + rand(0, 5000));
				quit();
			}

			this.killBaal();

		},
		killBaal: function () {
			Pather.moveTo(15092, 5011);
			Precast.doPrecast(false); // Not on true, we might have a more powerful barb bo

			while (getUnit(1, 543)) {
				delay(500);
			}
			delay(500);

			var portal = getUnit(2, 563);
			if (portal) {
				Pather.usePortal(null, null, portal);
			} else {
				//debug('ÿc5Error: Portal not found');
				return false;
			}
			// We can assume we are now in the Worldstone Chamber
			if ((me.classid === 1 && me.getSkill(Skills.Teleport, 1)) || me.getStat(97, Skills.Teleport)) {
				// teleport to baal
				Pather.moveTo(15146, 5892);
			} else {
				// walk to baal
				Pather.moveTo(15136, 5943);
			}
			Pather.moveToUnit(getUnit(1, 544));
			Attack.kill(544); // Baal
			Pickit.pickItems();
			delay(me.ping * 2);
			return true;
		},
		waves: {
			moveToPreattack: function () {
				if (this.checkThrone()) {
					return true; // in wave, who cares if we are at the preattack spot
				}
				var spot;
				switch (Builds.mine) {
					case Builds.Javazon:
					case Builds.FireBall:
						spot = {x: 15091, y: 5018}; // they all benifit from standing next to baal, to attack like crazy once the waves come
						break;
					case Builds.Lightning:
						spot = {x: 15078, y: 5026}; // On the side, left
						if ([0].indexOf(baal.vault.currentWave) !== -1) {
							spot = {x: 15093, y: 5029}; // Right in the heart of the wave
						}
						break;
					case Builds.Blizzard:
						spot = {x: 15078, y: 5026}; // On the side, left
						break;
					case Builds.WarCry:
					case Builds.SuperNova:
					case Builds.Hammerdin:
						spot = {x: 15093, y: 5029}; // Right in the heart of the wave
						break;
					default:
						spot = {x: 15094, y: 5038};// Just behind the waves, safe distance
				}
				if (getDistance(me, spot) < 2) {
					return true; // Already pretty close, no need to move
				}
				return Pather.moveTo(spot.x, spot.y);
			},
			checkThrone: function () {
				var monster = getUnit(1);
				if (monster) {
					do {
						// Is monster in the throne, or in entrance of throne
						if (Attack.checkMonster(monster)
							&& (
								monster.x > 15070 && monster.x < 15120 // Between the x coords
								&& monster.y > 5000 && monster.y < 5075 // And between the y coords
							)) {
							switch (monster.classid) {
								case 23:
								case 62:
									debug('Detected wave 1');
									return 1;
								case 105:
								case 381:
									debug('Detected wave 2');
									return 2;
								case 557:
									debug('Detected wave 3');
									return 3;
								case 558:
									debug('Detected wave 4');
									return 4;
								case 571:
									debug('Detected wave 5');
									return 5;
								default:
									Attack.clear(0); // Clear the throne
							}
						}
					} while (monster.getNext());
				}
				return false;
			},
			// Spawn all kinds of stuff while we wait for the wave to come
			beforeWaveCasting: function (wave, counter) {
				//Baal.print('timer:'+counter);
				switch (Builds.mine) {

					case Builds.SuperNova:
					case Builds.FireBall:
						if ((counter > 27e2 || counter < -1e3)) {
							return false;
						}

						if (counter > 2000) { // 15093,5025
							return Skill.cast(Skills.Meteor, 0, 15093, 5025);
						}
						if (Builds.mine === Builds.SuperNova) {
							return Skill.cast(Skills.Nova, 0, 15094 + rand(-1, 1), 5028 + rand(-1, 1));
						} else {
							return Skill.cast(Skills.FireBall, 0, 15093, 5025);
						}

					case Builds.Blizzard:
						if ((counter > 45e2 || counter < -1e3)) {
							return false;
						}
						return Skill.cast(Skills.Blizzard, 0, 15091 + rand(-1, 1), 5027 + rand(-1, 1));

					case Builds.CurseNecro:
						if ((counter > 15e2 || counter < -1e3)) {
							return false;
						}
						return Skill.cast(Skills.LowerResist, 0, 15091, 5027);

					case Builds.Avengerdin:
						Skill.setSkill(Skills.Conviction, 0);
						break;
					case Builds.Hammerdin: // Paladin
						if ((counter > 45e2 || counter < -1e3)) {
							return false;
						}
						Skill.setSkill(Skills.Concentration, 0);
						return Skill.cast(Skills.BlessedHammer, 1);

					case Builds.Javazon:
						if ((counter > 15e2 || counter < -1e3)) {
							return false;
						}
						return Skill.cast(Skills.LightningFury, 0, 15091, 5028);

					case Builds.WarCry:
						if (counter > 2e3 || counter < -1e3) {
							return false;
						}
						Skill.cast(Skills.WarCry, 0); // cast war cry
						Pather.moveTo(15087, 5024);
						Skill.cast(Skills.WarCry, 0); // cast war cry
						Pather.moveTo(15094, 5024);
						return Skill.cast(Skills.WarCry, 0); // cast war cry

					case Builds.Hurricane: // Druid
						switch (wave) {
							case 3:
								// Twister gives a stun, and that prevents hydra's
								return Skill.cast(Skills.Twister, 0, 15091, 5018);
							default:
								return Skill.cast(Skills.Tornado, 0, 15091, 5018);
						}

					case Builds.Trapsin: // Assassin
						// Don't do this 1 second before the wave come, so we can cast cloak of shadow directly
						if (counter > 4e3 || counter < 1e3) {
							return false;
						}
						return Skill.cast(Skills.ShockField);

					case Builds.Lightning:
						if (counter > 2e3 || counter < -1e3) {
							return false;
						}
						if (wave === 1) {
							return Skill.cast(Skills.Nova, 0, 15094 + rand(-1, 1), 5028 + rand(-1, 1));
						}
						return Skill.cast(Skills.ChainLightning, 0, 15092, 5026); // cast chainlighting for max dmg

				}
				return true;
			},
			// Relay traps at wave 5, and so on
			afterWaveChecks: function (wave) {
				// Don't do this after wave 5
				if (wave === 5) {
					return true;
				}
				Precast.doPrecast(false); // Make sure everything is still here

				var i;
				switch (Builds.mine) {
					case Builds.Trapsin:
						// Place traps again
						for (i = 0; i < 4; i += 1) {
							if (i === 2) {
								// Place a death sentry in the middle
								Skill.cast(Skills.DeathSentry, 0, 15090 + (i * 2), 5035);
							} else {
								Skill.cast(Skills.LightningSentry, 0, 15090 + (i * 2), 5035);
							}
						}
						return true;
					// Just a bo barb
					case Builds.WarCry:
						// Give everyone a bo, to avoid stupid people with cta
						debug('precast');
						return Precast.doPrecast(true);
					case Builds.Hammerdin:
						// In case we have ResistFire aura, set this on after wave 3
						debug('wave: ' + wave);
						if (baal.vault.currentWave === 3 && me.getSkill(Skills.ResistFire, 1)) {

							return Skill.setSkill(Skills.ResistFire, 0);
						}
						return Skill.setSkill(Skills.Cleansing, 0); // saves time
				}
				return false;
			},
			castOnSpawn: function (wave) {
				switch (Builds.mine) {
					case Builds.SuperNova:
						Skill.cast(Skills.StaticField);
						Skill.cast(Skills.Nova);
						Skill.cast(Skills.StaticField);
						Skill.cast(Skills.Nova);
						Skill.cast(Skills.StaticField);
						break;
					case Builds.Lightning:
						Skill.cast(Skills.StaticField);
						if (wave === 1) {
							debug('nova?');
							Skill.cast(Skills.Nova);
							Skill.cast(Skills.Nova);
							Skill.cast(Skills.Nova);
							Skill.cast(Skills.Nova);
							break;
						}
						Skill.cast(Skills.StaticField); // 2x static = 40% less hp of monsters
						break;
				}
			},
			doWaves: function () {
				var wave;
				// This sadly have sometimes some false positives. So move to preattack place and check again
				if (!getUnit(1, 543) && this.moveToPreattack() && !getUnit(1, 543)) {

					debug('Baal\'s gone');
					return false;
				}
				// Check the throne
				wave = this.checkThrone();
				if (!wave) {
					// Get to preattack spot
					this.moveToPreattack();

					// pre attack
					this.beforeWaveCasting(baal.vault.currentWave + 1, 12000 - (getTickCount() - Communication.vault.tick));

					return true;
				} else {
					baal.vault.currentWave = wave;
					this.castOnSpawn(wave);
				}

				// We are in wave:
				baal.vault.currentWave = wave;

				// Clear it
				Attack.clear(wave);

				debug('Communication.vault.diabloDone && Communication.vault.diabloUp');
				debug(Communication.vault.diabloDone + '&&' + Communication.vault.diabloUp);
				debug('wave:' + wave);
				// After waves, we want to check if dia/shrine is up
				var DiabloClearerParty = Misc.inMyParty(DiabloClearer),
					ShrineSearcherParty = Misc.inMyParty(ShrineSearcher),
					DiaUp = Communication.vault.diabloUp,
					ShrineUp = Communication.vault.shrineUp,
					ShrineDone = Communication.vault.shrineDone,
					DiaDone = Communication.vault.diabloDone;
				switch (true) {
					// IF
					case (DiabloClearerParty && ShrineSearcherParty) // Both dia/shrine creaters are in game
					&& (!DiaDone && DiaUp) // Dia is up, but not done
					&& (!ShrineDone && ShrineUp): // shrine is up, but not done
					// OR
					case ShrineSearcherParty && !DiabloClearerParty  // Shriner in game, dia clearer not.
					&& (!ShrineDone && ShrineUp): // Shiner is up, but not done
					// OR
					case DiabloClearerParty && !ShrineSearcherParty  // Diablo clearer in game, shriner not.
					&& (!DiaDone && DiaUp): // Diablo is up, but not done

						// Go to town
						if (Pather.getPortal(Areas.Harrogath, null)) {
							Pather.usePortal(Areas.Harrogath, null);
						} else {
							Pather.makePortal(true);
						}

						if (!ShrineDone && ShrineUp) {
							Town.goToTown(1);
							Town.move('portalspot');
							// ToDo: Get portals here
							var portal = getUnit(2, "portal");
							if (portal) {
								do {
									if (portal.getParent() === ShrineSearcher) {
										// Use this portal
										Pather.usePortal(null, null, copyUnit(portal));
									}
								} while (portal.getNext());

								// if we are not in town anymore
								if (me.area !== Areas.RogueEncampment) {
									var shrine = getUnit(2, "shrine"), shrineList = [];
									if (shrine) {
										do {
											if (shrine.mode === 0 && getDistance(me.x, me.y, shrine.x, shrine.y) <= 20) {
												shrineList.push(copyUnit(shrine));
											}
										} while (shrine.getNext());


										// We have a list of shrines now, around us
										shrineList = shrineList.filter((x) => x.objtype === 15); // 15 is xp
										if (shrineList.length !== 0) {
											shrineList.sort(Pickit.sortItems); // Shrines are like items, you can sort it like items
											debug('get shrine');
											Misc.getShrine(shrineList[0]);
											Communication.vault.shrineDone = true;
										}
									}
									debug('teleport to wp');
									Pather.getWP(me.area);
									debug('go to act4');
									Pather.useWaypoint(Areas.PandemoniumFortress);
								}
							}

						}

						if (!DiaDone && DiaUp) {
							// Go to town
							//ToDo: Nihalthak here

							Town.move("waypoint");
							Pather.useWaypoint(Areas.PandemoniumFortress); // go to act 4
							while (me.act !== 4) {
								delay(50);
							}

							if (Pather.usePortal(Areas.ChaosSanctuary, null) && me.area === Areas.ChaosSanctuary) {

								// kill diablo
								try {
									Attack.kill(243); // Diablo
									Pickit.pickItems();
								} catch (e) {
									// failed, big deal. Im sure someone stole the dia xp
								}

								// Go to town
								if (Pather.getPortal(Areas.PandemoniumFortress, null)) {
									Pather.usePortal(Areas.PandemoniumFortress, null);
								} else {
									Pather.makePortal(true);
								}


							}
							Communication.vault.diabloDone = true;
						}
						if (me.area === Areas.PandemoniumFortress) {
							Town.move("tyrael");

							var npc = getUnit(1, "tyrael");
							if (!npc || !npc.openMenu()) {
								Town.goToTown(5); // Looks like we failed, lets go to act 5 by wp
							} else {
								Misc.useMenu(0x58D2); // Travel to Harrogath
							}
						}

						if (me.area !== Areas.Harrogath) {
							Town.goToTown(5);
						}

						Pather.usePortal(Areas.ThroneOfDestruction, null);
						// Something is ready for me
						break;

					default:
						break;
				}
				// On wave 5 we return a false, so we know the waves are done
				return wave !== 5;
			},
		},
		goBo: function (stay) {
			function haveCTA() {
				var item = me.getItem(-1, 1);
				do {
					if (item.getPrefix(20519)) { // 20519 = CTA
						return true;
					}
				} while (item.getNext());
				return false
			}

			// Why a barb doesn't bo here. He does it straight away when everyone gets in the portal so everyone have a good bo
			if (!haveCTA() || me.classid === 4) {
				return true;
			}

			Town.heal(); // This can be called before a do chores, so lets be sure we have enough health in before we go to a random location
			me.cancel();
			Pather.useWaypoint('random');
			Precast.doPrecast(true);
			if (stay) {
				return true; // dont go back to town
			}
			return Pather.useWaypoint(Areas.PandemoniumFortress);
		},
	};

	// Insta copy of diablo
	var diablo = function () {
		this.getLayout = function (seal, value) {
			var sealPreset = getPresetUnit(108, 2, seal);

			if (!seal) {
				throw new Error("Seal preset not found");
			}

			if (sealPreset.roomy * 5 + sealPreset.y === value || sealPreset.roomx * 5 + sealPreset.x === value) {
				return 1;
			}

			return 2;
		};

		this.initLayout = function () {
			this.vizLayout = this.getLayout(396, 5275);
			this.seisLayout = this.getLayout(394, 7773);
			this.infLayout = this.getLayout(392, 7893);
		};

		this.getBoss = function (name) {
			var i, boss,
				glow = getUnit(2, 131);

			for (i = 0; i < 24; i += 1) {
				boss = getUnit(1, name);

				if (boss) {
					this.chaosPreattack(name, 8);

					try {
						Attack.kill(name);
					} catch (e) {
						Attack.clear(10, 0, name);
					}

					Pickit.pickItems();

					return true;
				}

				delay(250);
			}

			return !!glow;
		};

		this.chaosPreattack = function (name, amount) {
			var i, n, target, positions;

			switch (me.classid) {
				case 0:
					break;
				case 1:
					break;
				case 2:
					break;
				case 3:
					target = getUnit(1, name);

					if (!target) {
						return;
					}

					positions = [[6, 11], [0, 8], [8, -1], [-9, 2], [0, -11], [8, -8]];

					for (i = 0; i < positions.length; i += 1) {
						if (Attack.validSpot(target.x + positions[i][0], target.y + positions[i][1])) { // check if we can move there
							Pather.moveTo(target.x + positions[i][0], target.y + positions[i][1]);
							Skill.setSkill(Config.AttackSkill[2], 0);

							for (n = 0; n < amount; n += 1) {
								Skill.cast(Config.AttackSkill[1], 1);
							}

							break;
						}
					}

					break;
				case 4:
					break;
				case 5:
					break;
				case 6:
					break;
			}
		};

		this.diabloPrep = function () {
			var trapCheck,
				tick = getTickCount();

			while (getTickCount() - tick < 17500) {
				if (getTickCount() - tick >= 8000) {
					switch (me.classid) {
						case 1: // Sorceress
							if ([56, 59, 64].indexOf(Config.AttackSkill[1]) > -1) {
								if (me.getState(121)) {
									delay(500);
								} else {
									Skill.cast(Config.AttackSkill[1], 0, 7793, 5293);
								}

								break;
							}

							delay(500);

							break;
						case 3: // Paladin
							Skill.setSkill(Config.AttackSkill[2]);
							Skill.cast(Config.AttackSkill[1], 1);

							break;
						case 5: // Druid
							if (Config.AttackSkill[1] === 245) {
								Skill.cast(Config.AttackSkill[1], 0, 7793, 5293);

								break;
							}

							delay(500);

							break;
						case 6: // Assassin
							if (Config.UseTraps) {
								trapCheck = ClassAttack.checkTraps({x: 7793, y: 5293});

								if (trapCheck) {
									ClassAttack.placeTraps({x: 7793, y: 5293, classid: 243}, trapCheck);

									break;
								}
							}

							delay(500);

							break;
						default:
							delay(500);
					}
				} else {
					delay(500);
				}

				if (getUnit(1, 243)) {
					return true;
				}
			}

			throw new Error("Diablo not found");
		};

		this.openSeal = function (classid) {
			var i, j, seal;

			for (i = 0; i < 5; i += 1) {
				Pather.moveToPreset(108, 2, classid, classid === 394 ? 5 : 2, classid === 394 ? 5 : 0);

				if (i > 1) {
					Attack.clear(10);
				}

				for (j = 0; j < 3; j += 1) {
					seal = getUnit(2, classid);

					if (seal) {
						break;
					}

					delay(100);
				}

				if (!seal) {
					throw new Error("Seal not found (id " + classid + ")");
				}

				if (seal.mode) {
					return true;
				}

				if (classid === 394) {
					Misc.click(0, 0, seal);
				} else {
					seal.interact();
				}

				delay(classid === 394 ? 1000 : 500);

				if (!seal.mode) {
					if (classid === 394 && Attack.validSpot(seal.x + 15, seal.y)) { // de seis optimization
						Pather.moveTo(seal.x + 15, seal.y);
					} else {
						Pather.moveTo(seal.x - 5, seal.y - 5);
					}

					delay(500);
				} else {
					return true;
				}
			}

			throw new Error("Failed to open seal (id " + classid + ")");
		};

		Town.doChores();
		Pather.useWaypoint(107);
		Precast.doPrecast(true);
		this.initLayout();
		this.openSeal(395);
		this.openSeal(396);

		if (this.vizLayout === 1) {
			Pather.moveTo(7691, 5292);
		} else {
			Pather.moveTo(7695, 5316);
		}

		if (!this.getBoss(getLocaleString(2851))) {
			throw new Error("Failed to kill Vizier");
		}

		this.openSeal(394);

		if (this.seisLayout === 1) {
			Pather.moveTo(7771, 5196);
		} else {
			Pather.moveTo(7798, 5186);
		}

		if (!this.getBoss(getLocaleString(2852))) {
			throw new Error("Failed to kill de Seis");
		}

		this.openSeal(393);
		this.openSeal(392);

		if (this.infLayout === 1) {
			delay(1);
		} else {
			Pather.moveTo(7928, 5295); // temp
		}

		if (!this.getBoss(getLocaleString(2853))) {
			throw new Error("Failed to kill Infector");
		}

		Pather.moveTo(7788, 5292);
		if (Pather.getPortal(Areas.PandemoniumFortress)) {
			Pather.usePortal(Areas.PandemoniumFortress);
		} else {
			Pather.makePortal(true); // If no portal exists, make and take.
		}
		return true;
	};

	var shrinesSearch = function () {
		var gotit = false,
			searchAreas = [Areas.ColdPlains, Areas.StonyField, Areas.DarkWood, Areas.BlackMarsh, Areas.JailLvl1, Areas.CatacombsLvl2]; // only area's with this wp

		baal.goBo(true);

		for (var i in searchAreas) {
			let area = searchAreas[i];
			Pather.useWaypoint(area);
			if (Misc.getShrinesInArea(area, 15, false)) {
				gotit = true;
				break;
			} else {
				Pather.getWP(me.area);
			}

		}
		if (gotit) {
			Pather.makePortal(true);
			Town.goToTown(2);
			delay(2500);
			Town.goToTown(4);
		} else {
			// Already interacting with an wp;
			Pather.useWaypoint(Areas.PandemoniumFortress, true) // Go to act 4.
		}
	};

	var Overloading = {
		vault: {}, // to store data in
		do: function () { // override them
			var i, j;
			for (i in Overloading.funcs) {
				for (j in Overloading.funcs[i]) {
					debug('Overloading - ' + i + '.' + j);

					// Create vault for overloaded function
					if (typeof Overloading.vault[i] !== Object) {
						Overloading.vault[i] = {};
					}

					// Store original function
					if (typeof Overloading.vault[i][j] !== Function) {
						Overloading.vault[i][j] = global[i][j];
					}

					// Overload the actual function
					global[i][j] = Overloading.funcs[i][j]
				}
			}
		},
		rollback: function () { // rolling them back
			var i, j;
			for (i in Overloading.funcs) {
				for (j in Overloading.funcs[i]) {
					debug('Overloading -- rollback - ' + i + '.' + j);
					global[i][j] = Overloading.vault[i][j]
				}
			}
		},
		funcs: {
			Attack: {
				// Optimized clear function for the throne
				clear: function (wave) {
					var i, result,
						gidAttack = [],
						attackCount = 0,
						monsterList = [],
						target = getUnit(1);

					do {
						if (Attack.checkMonster(target) && Attack.skipCheck(target)) {
							// Baal check, Be sure in throne we only clear *in* the chamber of the throne, not outside it
							/*if (me.area !== Areas.ThroneOfDestruction || ((target.y > 5002 && target.y < 5073
								&& target.x > 15072 && target.x < 15118)
								|| (target.y > 5073 && target.y < 5096
									&& target.x > 15088 && target.x < 15103))) {*/
							if (me.area !== Areas.ThroneOfDestruction
								|| (
									target.x > 15070 && target.x < 15120 // Between the x coords
									&& target.y > 5000 && target.y < 5075 // And between the y coords
								)) {
								monsterList.push(copyUnit(target));
							}
						}
					} while (target.getNext());
					if (wave === undefined) {
						wave = 0;
					}

					monsterList.sort(function (unitA, unitB) {
						return getDistance(me, unitA) - getDistance(me, unitB);
					});

					//Builds.preattack(wave);

					while (monsterList.length > 0 && attackCount < 300) {
						// Did i die? If so revive and pickup corpse
						if (me.dead) {
							var corpse_x = me.x, corpse_y = me.y;
							delay(200 + (me.ping * 2));
							me.revive();
							delay(200 + (me.ping * 2));
							Pather.usePortal(Areas.ThroneOfDestruction, null);
							Pather.moveTo(corpse_x, corpse_y);
							//ToDo: redo this
							if (!Town.getCorpse()) {
								quit(); // failed to pick up corpse, probably cuz we died again. Fuck this, bye
							}
						}

						// resort
						monsterList.sort(function (unitA, unitB) {
							return getDistance(me, unitA) - getDistance(me, unitB);
						});
						target = copyUnit(monsterList[0]);

						// Monster still in reach?
						if (target.x !== undefined && // Only if defined
							!(
								target.x > 15070 && target.x < 15120 // Between the x coords‘
								&& target.y > 5000 && target.y < 5075 // And between the y coords
							)) {
							monsterList.shift();
							continue; // Next!
						}

						if (!(
							me.x > 15070 && me.x < 15120 // Between the x coords
							&& me.y > 5000 && me.y < 5075 // And between the y coords
						)) {
							Pather.moveTo(15094, 5038);
						}

						if (target.x !== undefined && Attack.checkMonster(target)) {
							// Dodge or get in position, or stand still if we are in use of xp shrine
							if (!me.getState(States.ShrineExperience)) {
								if (Config.Dodge && me.hp * 100 / me.hpmax <= Config.DodgeHP) {
									Attack.deploy(target, Config.DodgeRange, 5, 9);
								} else {
									Attack.getIntoPosition(target, Skill.getRange(Config.AttackSkill[(target.spectype & 0x7) ? 1 : 3]), 0x4)
								}
							}

							if (wave === 0) {
								// Only during clearing the throne, not during a wave.
								Misc.townCheck(true);
								if (!me.getState(States.ShrineExperience)) {
									Pickit.pickItems(); // Pick items, but not if we have xp shrine
								}
							}

							me.overhead("attacking " + target.name + " spectype " + target.spectype + " id " + target.classid);

							result = ClassAttack.doAttack(target);
							if (result) {
								for (i = 0; i < gidAttack.length; i += 1) {
									if (gidAttack[i].gid === target.gid) {
										break;
									}
								}
								if (i === gidAttack.length) {
									gidAttack.push({gid: target.gid, attacks: 0, name: target.name});
								}

								gidAttack[i].attacks += 1;
								attackCount += 1;

								// Flash with melee skills
								if (gidAttack[i].attacks > 0 && gidAttack[i].attacks % ((target.spectype & 0x7) ? 15 : 5) === 0 && Skill.getRange(Config.AttackSkill[(target.spectype & 0x7) ? 1 : 3]) < 4) {
									Pather.moveTo(me.x + rand(-1, 1) * 5, me.y + rand(-1, 1) * 5);
								}

							} else {
								monsterList.shift();
								if (!me.getState(States.ShrineExperience)) {
									Pickit.pickItems();
								}
							}
						} else {
							monsterList.shift();
							if (!me.getState(States.ShrineExperience)) {
								Pickit.pickItems();
							}
						}

						// It happens from time to time, the one that teleported chickend and there is no tp to throne anymore,
						// only if we still can find baal's sitting in the throne
						if (!Pather.getPortal(Areas.Harrogath, null) && getUnit(1, 543) && me.name === ShrineSearcher) {
							Pather.makePortal(); // Make portal to Harrogath
						}
					}

					ClassAttack.afterAttack();

					// We don't check if we did any attack, since waves can go quick and die before we did any attack
					// Or, now a potion can be dropped and used that was already laying on the floor
					Pickit.pickItems();

					// ToDo: Build in some check for bad psn res chars, they should go to town and heal

					debug('Done killing');
					// Prepare for next wave
					baal.waves.moveToPreattack();
					baal.waves.afterWaveChecks();
					return true;
				},
			},
			Pather: {
				// We want to use telekenis on portals.
				// So use the _old_ usePortal function, since it came back
				usePortal: function (targetArea, owner, unit) {
					if (targetArea && me.area === targetArea) {
						return true;
					}

					me.cancel();

					var i, tick, portal, useTK,
						preArea = me.area;

					for (i = 0; i < 10; i += 1) {
						if (me.dead) {
							break;
						}

						if (i > 0 && owner && me.inTown) {
							Town.move("portalspot");
						}

						portal = unit ? copyUnit(unit) : Pather.getPortal(targetArea, owner);

						if (portal) {
							if (i === 0) {
								useTK = me.classid === 1 && me.getSkill(43, 1) && me.inTown && portal.getParent();
							}

							if (portal.area === me.area) {
								if (useTK) {
									if (getDistance(me, portal) > 10) {
										Attack.getIntoPosition(portal, 10, 0x4);
									}

									Skill.cast(43, 0, portal);
								} else {
									if (getDistance(me, portal) > 5) {
										Pather.moveToUnit(portal);
									}

									if (i < 2) {
										sendPacket(1, 0x13, 4, 0x2, 4, portal.gid);
									} else {
										Misc.click(0, 0, portal);
									}
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

							if (i > 1) {
								Packet.flash(me.gid);

								useTK = false;
							}
						} else {
							Packet.flash(me.gid);
						}

						delay(200 + me.ping);
					}

					return targetArea ? me.area === targetArea : me.area !== preArea;
				},
			}
		}
	};

	// Either run the thread functions, or load the thread
	if (startThread()) {
		return; // // We come here *after* the thread ran. Aka end of game
	}

	// If we are teleporting, we want to start fast in new game.
	// Try to avoid NPC visits as much as possible
	if (!Config.SpeedBaal.Follower) {
		addToPickit('[name] == ScrollofTownPortal');
		if (Config.FieldID) {
			addToPickit('[name] == ScrollofIdentify'); // Pick identifying scrolls

		}
	}

	var freespots = 0;
	for (var i = 0; i < 4; i++) {
		for (var j = 0; j < 10; j++) {
			freespots += Config.Inventory[i][j]
		}
	}
	// Low free spots? Add gold to the pickit line, we might get stuck otherwise
	if (freespots < 8 || Config.FieldID) {
		addToPickit('[name] == gold # [gold] >= 100');
	}

	/**
	 * Quick fix for CTA. It happens we have it on the second slot
	 */

	Precast.checkCTA();
	if (Precast.haveCTA) {
		Precast.weaponSwitch(1 - Precast.haveCTA); // Switch to the correct weapon (the one that isnt cta
	} else {
		Precast.weaponSwitch(0); // make sure you wear gear on FIRST slot
	}

	debug('Starting baal');
	Builds.init();

	//Communication.waitFor('threadStarted', true);
	try {
		Overloading.do();

		if (me.name === ShrineSearcher) {
			// Time to search for the shrine
			try {
				shrinesSearch();
			} catch (e) {
				Town.goToTown();
			}
		}

		// Do quickly nihla
		if (me.name === Nihla) {
			try {
				(function () {
					Town.doChores();
					Pather.useWaypoint(123);
					Precast.doPrecast(false);

					if (!Pather.moveToExit(124, true)) {
						throw new Error("Failed to go to Nihlathak");
					}

					Pather.moveToPreset(me.area, 2, 462, 0, 0, false, true);

					if (Config.Nihlathak.ViperQuit && getUnit(1, 597)) {
						print("Tomb Vipers found.");
						return true;
					}

					var target;
					for (i = 0; i < 5; i += 1) {
						target = getUnit(1, 526);
						delay(200);
					}

					if (Attack.skipCheck(target)) {
						Attack.kill(526); // Nihlathak
						Pickit.pickItems();
					}

					Town.goToTown(); // Fast tp -> go
					justPortaledTick = getTickCount();

					return true;
				})()
			} catch (e) {

			}
		}

		// Prepare dia
		if (me.name === DiabloClearer) {
			try {
				diablo();
			} catch (e) {
				Town.goToTown();
			}
			Town.move("tyrael");
			if (Town.needMerc()) {
				Town.reviveMerc();
			}
			var npc = getUnit(1, "tyrael");
			if (!npc || !npc.openMenu()) {
				Town.goToTown(5); // Looks like we failed, lets go to act 5 by wp
			} else {
				Misc.useMenu(0x58D2); // Travel to Harrogath
			}
		}

		// Baal run itself
		baal.run();
	} catch (e) {
		throw e;
	} finally {
		Overloading.rollback(); // always roll back functions
	}
}

// enclosed function to detect if we are running as the thread, and not override main() from default.dbj
// If running as thread, start SpeedBaal()m
(function () {

	// Get filename of current stack location
	var basefilename, stack = new Error().stack.match(/[^\r\n]+/g),
		filename = stack[0].substr(stack[0].lastIndexOf('\\') + 1);

	filename = filename.substr(0, filename.indexOf(':'));
	basefilename = filename.substring(0, filename.indexOf('.'));

	print(basefilename);
	// Is this filename, the same as the script name? ifso, we run as a thread
	if (getScript(true).name.toLowerCase().endsWith(filename)) {
		SpeedBaal(); // Start speedbaal
	}
})();