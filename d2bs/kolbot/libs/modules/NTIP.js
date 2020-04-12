/*

[Item-parser Syntax Information]

1. [Keyword] separates into two groups
   - [Property Keywords] : [Type], [Name], [Class], [Quality], [Flag], [Level], [Prefix], [Suffix], [Skin]
   - [Stat Keywords] : [Number or Alias]

2. [Keyword] must be surrounded by '[' and ']'

3. [Property Keywords] must be placed first

4. Insert '#' symbol between [Property Keywords] and [Stat Keywords]

5. Use '+', '-', '*', '/', '(', ')', '&&', '||', '>', '>=', '<', '<=', '==', '!=' symbols for comparison

6. Use '//' symbol for comment

*/

(function (module, require) {
	!isIncluded('NtItemAlias') && include("NTItemAlias.dbl"); //ToDo; Refactor to module

	let NTIP = {},
		CheckListInfo = [],
		RuntimeCheckListInfo = [];
	const Misc = require('Misc');

	NTIP.CheckList = [];
	NTIP.RuntimeCheckList = [];
	NTIP.OpenFile = function (filepath, notify) {
		if (!FileTools.exists(filepath)) {
			notify && Misc.errorReport("ÿc1NIP file doesn't exist: ÿc0" + filepath);

			return false;
		}

		var i, nipfile, line, lines, info, item,
			tick = getTickCount(),
			filename = filepath.substring(filepath.lastIndexOf("/") + 1, filepath.length),
			entries = 0;

		try {
			nipfile = File.open(filepath, 0);
		} catch (fileError) {
			if (notify) {
				Misc.errorReport("ÿc1Failed to load NIP: ÿc0" + filename);
			}
		}

		if (!nipfile) return false;

		lines = nipfile.readAllLines();

		nipfile.close();

		for (i = 0; i < lines.length; i += 1) {
			if (NTIP.AddEntry(lines[i], filename, i+1, false, false)) {
				entries += 1;
			}
		}

		if (notify) {
			print("ÿc4Loaded NIP: ÿc2" + filename + "ÿc4. Lines: ÿc2" + lines.length + "ÿc4. Valid entries: ÿc2" + entries + ". ÿc4Time: ÿc2" + (getTickCount() - tick) + " ms");
		}

		return true;
	};

	NTIP.AddEntry = function (entry, filename = "<added at runtime>", line = 0, atRuntime = true, notify = true) {
		var info = {
			line: line,
			file: filename,
			string: entry
		};

		var parsed = NTIP.ParseLineInt(entry, info);

		if (parsed) {
			if (atRuntime) {
				NTIP.RuntimeCheckList.push(parsed);
				RuntimeCheckListInfo.push(info);
			}
			else {
				NTIP.CheckList.push(parsed);
				CheckListInfo.push(info);
			}
			notify && print("ÿc4Added pickit entry: ÿc2" + filename + " "+entry);
			return true;
		}
		return false;
	};

	NTIP.CheckQuantityOwned = function (type, stat) {
		var i, item,
			num = 0,
			items = me.getItemsEx();

		if (!items) {
			print("I can't find my items!");

			return 0;
		}

		for (i = 0; i < items.length; i += 1) {
			if (items[i].mode === 0 && items[i].location === 7) {
				item = items[i];

				if (typeof type === 'function' && type(item)) {
					if (typeof stat === 'function' && stat(item)) {
						num += 1;
					}
				}
			} else if (items[i].mode === 0 && items[i].location === 3) { // inv check
				item = items[i];

				if (typeof type === 'function' && type(item)) {
					if (typeof stat === 'function' && stat(item)) {
						//if (Config.Inventory[items[i].y][items[i].x] > 0) { // we check only space that is supposed to be free
						num += 1;
						//}
					}
				}
			}
		}

		//print("I have "+num+" of these.");

		return num;
	};


	NTIP.Clear = function () {
		NTIP.CheckList = [];
		CheckListInfo = [];
		NTIP.ClearRuntime();
	};

	NTIP.ClearRuntime = function () {
		NTIP.RuntimeCheckList = [];
		RuntimeCheckListInfo = [];
	};

	NTIP.CheckListAt = function (i) {
		if (i >= NTIP.CheckList.length) {
			let j = NTIP.CheckList.length > 0 ? i%NTIP.CheckList.length : i;
			if (j < NTIP.RuntimeCheckList.length) {
				return NTIP.RuntimeCheckList[j];
			}
			return undefined;
		}
		return NTIP.CheckList[i];
	};

	NTIP.CheckListInfoAt = function (i) {
		if (i >= CheckListInfo.length) {
			let j = CheckListInfo.length > 0 ? i%CheckListInfo.length : i;
			if (j < RuntimeCheckListInfo.length) {
				return RuntimeCheckListInfo[j];
			}
			return undefined;
		}
		return CheckListInfo[i];
	};

	NTIP.GetTier = function (item) {
		let i, tier = 0;

		let list = NTIP.CheckList
		list = list.concat(NTIP.RuntimeCheckList);

		list
			.filter(check => check.length === 3
				&& check[2].hasOwnProperty('Tier')
				&& !isNaN(check[2])
			) // Only the valid ones
			.forEach(function (check) {
				try {
					for (let i = 0; i < 2; i++) {
						// If check[i] has a length, call it
						typeof check[i] === 'function' && check[i](item)
						// if tier is higher as current tier
						&& check[2].Tier > tier &&
						// set the highest current tier
						(tier = check[2].Tier);
					}
				} catch (e) {
					// Dont care
				}
			});

		return tier;
	};

	NTIP.CheckItem = function (item, entryList, verbose) {
		var i, list, identified, num,
			rval = {},
			result = 0;

		if (!entryList) {
			list = NTIP.CheckList;
			list = list.concat(NTIP.RuntimeCheckList);
		} else {
			list = entryList;
		}

		identified = item.getFlag(0x10);

		for (i = 0; i < list.length; i++) {
			let [type, stat, wanted] = list[i];
			let info = NTIP.CheckListInfoAt(i);

			try {
				if (typeof type === 'function') {
					if (type(item)) {
						if (typeof stat === 'function') {
							if (stat(item)) {
								if (wanted && wanted.MaxQuantity && !isNaN(wanted.MaxQuantity)) {
									num = NTIP.CheckQuantityOwned(type, stat);

									if (num < wanted.MaxQuantity) {
										result = 1;

										break;
									} else {
										if (item.getParent() && item.getParent().name === me.name && item.mode === 0 && num === wanted.MaxQuantity) { // attempt at inv fix for maxquantity
											result = 1;

											break;
										}
									}
								} else {
									result = 1;

									break;
								}
							} else if (!identified && result === 0) {
								result = -1;

								if (verbose) {
									rval.line = info.file + " #" + info.line;
								}
							}
						} else {
							if (wanted && wanted.MaxQuantity && !isNaN(wanted.MaxQuantity)) {
								num = NTIP.CheckQuantityOwned(type, null);

								if (num < wanted.MaxQuantity) {
									result = 1;

									break;
								} else {
									if (item.getParent() && item.getParent().name === me.name && item.mode === 0 && num === wanted.MaxQuantity) { // attempt at inv fix for maxquantity
										result = 1;

										break;
									}
								}
							} else {
								result = 1;

								break;
							}
						}
					}
				} else if (typeof stat === 'function') {
					if (stat(item)) {
						if (wanted && wanted.MaxQuantity && !isNaN(wanted.MaxQuantity)) {
							num = NTIP.CheckQuantityOwned(null, stat);

							if (num < wanted.MaxQuantity) {
								result = 1;

								break;
							} else {
								if (item.getParent() && item.getParent().name === me.name && item.mode === 0 && num === wanted.MaxQuantity) { // attempt at inv fix for maxquantity
									result = 1;

									break;
								}
							}
						} else {
							result = 1;

							break;
						}
					} else if (!identified && result === 0) {
						result = -1;

						if (verbose) {
							rval.line = info.file + " #" + info.line;
						}
					}
				}
			} catch (pickError) {
				showConsole();

				if (!entryList) {
					Misc.errorReport("ÿc1Pickit error! Line # ÿc2" + info.line + " ÿc1Entry: ÿc0" + info.string + " (" + info.file + ") Error message: " + pickError.message + " Trigger item: " + item.fname.split("\n").reverse().join(" "));
					if (i >= NTIP.CheckList.length) {
						let j = NTIP.CheckList.length ? i%NTIP.CheckList.length : i;
						NTIP.RuntimeCheckList[j] = ["", "", ""]; // make empty
					}
					else {
						NTIP.CheckList[i] = ["", "", ""];
					}
				} else {
					Misc.errorReport("ÿc1Pickit error in runeword config!");
				}

				result = 0;
			}
		}

		if (verbose) {
			switch (result) {
				case -1:
					break;
				case 1:
					let info = NTIP.CheckListInfoAt(i);
					rval.line = info.file + " #" + info.line;

					break;
				default:
					rval.line = null;

					break;
			}

			rval.result = result;

			return rval;
		}

		return result;
	};

	/**
	 * @return {boolean}
	 */
	NTIP.IsSyntaxInt = ch => (ch === '!' || ch === '%' || ch === '&' || (ch >= '(' && ch <= '+') || ch === '-' || ch === '/' || (ch >= ':' && ch <= '?') || ch === '|');

	NTIP.ParseLineInt = function (input, info) {
		var i, property, p_start, p_end, p_section, p_keyword, p_result, value;

		p_end = input.indexOf("//");

		if (p_end !== -1) {
			input = input.substring(0, p_end);
		}

		input = input.replace(/\s+/g, "").toLowerCase();

		if (input.length < 5) return null;

		p_result = input.split("#");

		if (p_result[0] && p_result[0].length > 4) {
			p_section = p_result[0].split("[");

			p_result[0] = p_section[0];

			for (i = 1; i < p_section.length; i += 1) {
				p_end = p_section[i].indexOf("]") + 1;
				property = p_section[i].substring(0, p_end - 1);

				switch (property) {
					case 'color':
						p_result[0] += "item.getColor()";

						break;
					case 'type':
						p_result[0] += "item.itemType";

						break;
					case 'name':
						p_result[0] += "item.classid";

						break;
					case 'class':
						p_result[0] += "item.itemclass";

						break;
					case 'quality':
						p_result[0] += "item.quality";

						break;
					case 'flag':
						if (p_section[i][p_end] === '!') {
							p_result[0] += "!item.getFlag(";
						} else {
							p_result[0] += "item.getFlag(";
						}

						p_end += 2;

						break;
					case 'level':
						p_result[0] += "item.ilvl";

						break;
					case 'prefix':
						if (p_section[i][p_end] === '!') {
							p_result[0] += "!item.getPrefix(";
						} else {
							p_result[0] += "item.getPrefix(";
						}

						p_end += 2;

						break;
					case 'suffix':
						if (p_section[i][p_end] === '!') {
							p_result[0] += "!item.getSuffix(";
						} else {
							p_result[0] += "item.getSuffix(";
						}

						p_end += 2;

                		break;
            		case 'skin':
                		p_result[0] += "item.skinCode";

						break;
					default:
						Misc.errorReport("Unknown property: " + property + " File: " + info.file + " Line: " + info.line);

						return false;
				}

				for (p_start = p_end; p_end < p_section[i].length; p_end += 1) {
					if (!NTIP.IsSyntaxInt(p_section[i][p_end])) {
						break;
					}
				}

				p_result[0] += p_section[i].substring(p_start, p_end);

				if (p_section[i].substring(p_start, p_end) === "=") {
					Misc.errorReport("Unexpected = at line " + info.line + " in " + info.file);

					return false;
				}

				for (p_start = p_end; p_end < p_section[i].length; p_end += 1) {
					if (NTIP.IsSyntaxInt(p_section[i][p_end])) {
						break;
					}
				}

				p_keyword = p_section[i].substring(p_start, p_end);

				if (isNaN(p_keyword)) {
					switch (property) {
						case 'color':
							if (NTIPAliasColor[p_keyword] === undefined) {
								Misc.errorReport("Unknown color: " + p_keyword + " File: " + info.file + " Line: " + info.line);

								return false;
							}

							p_result[0] += NTIPAliasColor[p_keyword];

							break;
						case 'type':
							if (NTIPAliasType[p_keyword] === undefined) {
								Misc.errorReport("Unknown type: " + p_keyword + " File: " + info.file + " Line: " + info.line);

								return false;
							}

							p_result[0] += NTIPAliasType[p_keyword];

							break;
						case 'name':
							if (NTIPAliasClassID[p_keyword] === undefined) {
								Misc.errorReport("Unknown name: " + p_keyword + " File: " + info.file + " Line: " + info.line);

								return false;
							}

							p_result[0] += NTIPAliasClassID[p_keyword];

							break;
						case 'class':
							if (NTIPAliasClass[p_keyword] === undefined) {
								Misc.errorReport("Unknown class: " + p_keyword + " File: " + info.file + " Line: " + info.line);

								return false;
							}

							p_result[0] += NTIPAliasClass[p_keyword];

							break;
						case 'quality':
							if (NTIPAliasQuality[p_keyword] === undefined) {
								Misc.errorReport("Unknown quality: " + p_keyword + " File: " + info.file + " Line: " + info.line);

								return false;
							}

							p_result[0] += NTIPAliasQuality[p_keyword];

							break;
						case 'flag':
							if (NTIPAliasFlag[p_keyword] === undefined) {
								Misc.errorReport("Unknown flag: " + p_keyword + " File: " + info.file + " Line: " + info.line);

								return false;
							}

							p_result[0] += NTIPAliasFlag[p_keyword] + ")";

							break;
						case 'prefix':
						case 'suffix':
							p_result[0] += "\"" + p_keyword + "\")";

                    		break;
						case 'skin':
							if (NTIPAliasSkin[p_keyword] === undefined) {
								Misc.errorReport("Unknown skin: " + p_keyword + " File: " + info.file + " Line: " + info.line);

								return false;
							}

							p_result[0] += "\"" + NTIPAliasSkin[p_keyword] + "\"";

							break;
					}
				} else {
					if (property === 'flag' || property === 'prefix' || property === 'suffix') {
						p_result[0] += p_keyword + ")";
					} else {
						p_result[0] += p_keyword;
					}
				}

				p_result[0] += p_section[i].substring(p_end);
			}
		} else {
			p_result[0] = "";
		}

		if (p_result[1] && p_result[1].length > 4) {
			p_section = p_result[1].split("[");
			p_result[1] = p_section[0];

			for (i = 1; i < p_section.length; i += 1) {
				p_end = p_section[i].indexOf("]");
				p_keyword = p_section[i].substring(0, p_end);

				if (isNaN(p_keyword)) {
					if (NTIPAliasStat[p_keyword] === undefined) {
						Misc.errorReport("Unknown stat: " + p_keyword + " File: " + info.file + " Line: " + info.line);

						return false;
					}

					p_result[1] += "item.getStatEx(" + NTIPAliasStat[p_keyword] + ")";
				} else {
					p_result[1] += "item.getStatEx(" + p_keyword + ")";
				}

				p_result[1] += p_section[i].substring(p_end + 1);
			}
		} else {
			p_result[1] = "";
		}

		if (p_result[2] && p_result[2].length > 0) {
			p_section = p_result[2].split("[");
			p_result[2] = {};

			for (i = 1; i < p_section.length; i += 1) {
				p_end = p_section[i].indexOf("]");
				p_keyword = p_section[i].substring(0, p_end);

				switch (p_keyword.toLowerCase()) {
					case "maxquantity":
						value = Number(p_section[i].split("==")[1].match(/\d+/g));

						if (!isNaN(value)) {
							p_result[2].MaxQuantity = value;
						}

						break;
					case "tier":
						value = Number(p_section[i].split("==")[1].match(/\d+/g));

						if (!isNaN(value)) {
							p_result[2].Tier = value;
						}

						break;
					default:
						Misc.errorReport("Unknown 3rd part keyword: " + p_keyword.toLowerCase());

						return false;
				}
			}
		}

		// Compile the line, to 1) remove the eval lines, and 2) increase the speed
		for (let i = 0; i < 2; i++) {
			if (p_result[i].length) {
				try {
					p_result[i] = (new Function('return function(item) {return ' + p_result[i] + '}')).call(null); // generate function out of it
				} catch(e) {
					print('Pickit line incorrect: ');
					print(input);
					print(JSON.stringify(info));
					return false ; // failed load this line so return false
				}
			}

		}
		return p_result;
	};

	module.exports = NTIP
})(module, require);