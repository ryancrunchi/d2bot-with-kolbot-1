var CustomConfig = {
	/* Format:
		"Config_Filename_Without_Extension": ["array", "of", "profiles"]

		Multiple entries are separated by commas
	*/


};

// Jaenster: Easier way to configure


// Check if title starts with MyBotsPrefix,
if (me.windowtitle.indexOf('AutoPlay') === 0) {
	// Put it to the list of CustomConfig
	CustomConfig['AutoPlay'] = [me.windowtitle];
}


 //*/