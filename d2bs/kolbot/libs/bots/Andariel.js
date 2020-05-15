/**
*	@filename	Andariel.js
*	@author		jaenster
*	@desc		kill Andariel
*/

(function (module,require) {
	const Andariel = function (Config, Attack, Pickit, Pather, Town) {
		Andariel.kill();
	};
	const Attack = require('Attack'),
			Pickit = require('Pickit'),
			Pather = require('Pather'),
			Town = require('Town');

	Andariel.kill = () => {
		if (me.getStat(sdk.stats.Poisonresist) < 75) {
			Town.goToTown();
			Town.stackPotions('yps');
		}
		if (!Pather.journeyTo(sdk.areas.CatacombsLvl4)) {
			return false;
		}

		Pather.moveTo(22549, 9520);
		const andy = getUnit(sdk.unittype.Monsters, sdk.monsters.Andariel);

		if (!andy) {
			return true;
		}

		andy.kill();

		// Wait for minions to die.
		while(getUnits(sdk.unittype.Monsters)
			.filter(x => x.attackable)
			.filter(x => getDistance(andy, x) < 15).length > 3) {
			delay(3);
		}

		Pickit.pickItems();

		return true;
	};

	module.exports = Andariel;
})(typeof module === 'object' && module || {}, typeof require === 'undefined' && (include('require.js') && require) || require );
