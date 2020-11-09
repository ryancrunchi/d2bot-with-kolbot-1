/**
*	@filename	KurastTemples.js
*	@author		kolton
*	@desc		clear Kurast Temples
*/

function KurastTemples(Config, Attack, Pickit, Pather, Town, Misc) {
	Town();
	Pather.useWaypoint(80);
	require('../modules/Precast')()

	var i,
		areas = [94, 95, 96, 97, 98, 99];

	for (i = 0; i < 6; i += 1) {
		if (me.area !== 80 + Math.floor(i / 2)) {
			if (!Pather.moveToExit(80 + Math.floor(i / 2), true)) {
				throw new Error("Failed to change area");
			}
		}

		if (!Pather.moveToExit(areas[i], true)) {
			throw new Error("Failed to move to the temple");
		}

		if (i === 3) {
			require('../modules/Precast')()
		}

		Attack.clearLevel(Config.ClearType);

		if (i < 5 && !Pather.moveToExit(80 + Math.floor(i / 2), true)) {
			throw new Error("Failed to move out of the temple");
		}
	}

	return true;
}