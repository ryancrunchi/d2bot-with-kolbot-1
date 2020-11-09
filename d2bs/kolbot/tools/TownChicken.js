/**
*	@filename	TownChicken.js
*	@author		kolton
*	@desc		handle town chicken
*/

js_strict(true);

include('require.js');
include("OOG.js");


function main() {
	const Config = require('../libs/modules/Config');
	const Town = require('../libs/modules/Town');
	const Misc = require('../libs/modules/Misc');

	var townCheck = false;

	this.togglePause = function () {
		var i,	script,
			scripts = ["default.dbj", "tools/antihostile.js", "tools/rushthread.js", "tools/CloneKilla.js"];

		for (i = 0; i < scripts.length; i += 1) {
			script = getScript(scripts[i]);

			if (script) {
				if (script.running) {
					if (i === 0) { // default.dbj
						print("ÿc1Pausing.");
					}

					script.pause();
				} else {
					if (i === 0) { // default.dbj
						if (!getScript("tools/clonekilla.js")) { // resume only if clonekilla isn't running
							print("ÿc2Resuming.");
							script.resume();
						}
					} else {
						script.resume();
					}
				}
			}
		}

		return true;
	};

	addEventListener("scriptmsg",
		function (msg) {
			if (msg === "townCheck") {
				if (me.area === 136) {
					print("Can't tp from uber trist.");
				} else {
					townCheck = true;
				}
			}
		});

	// Init config and attacks

	while (true) {
		if (!me.inTown && (townCheck ||
			(Config.TownHP > 0 && me.hp < Math.floor(me.hpmax * Config.TownHP / 100)) ||
			(Config.TownMP > 0 && me.mp < Math.floor(me.mpmax * Config.TownMP / 100)))) {
			this.togglePause();

			while (!me.gameReady) {
				delay(100);
			}

			try {
				me.overhead("Going to town");
				Town.visitTown();
			} catch (e) {
				Misc.errorReport(e, "TownChicken.js");
				scriptBroadcast("quit");

				return;
			} finally {
				this.togglePause();

				townCheck = false;
			}
		}

		delay(50);
	}
}