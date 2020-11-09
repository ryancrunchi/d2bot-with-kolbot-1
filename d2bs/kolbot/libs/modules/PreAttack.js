(function (module, require) {

    module.exports = new function () {
        const GameData = require('../modules/GameData');
        const Skills = require('../modules/Skills');
        const Precast = require('../modules/Precast');
        /**
         * @description
         * @param monster
         * @param estimated
         * @param spot
         */
        let self = this;
        this.do = function (monster, estimated, spot) {
            let result = GameData.monsterEffort(monster, me.area, undefined, undefined, true), skillName = '';
            if (!result) return; // Nothing to preattack with O_o
            for (let i in sdk.skills) {
                sdk.skills[i] === result.skill && (skillName = i);
            }

            Precast();
            const mySpot = self.calculateBestSpot(spot, Skills.range[result.skill]);

            mySpot && mySpot.moveTo();
            !mySpot && me.moveTo(spot.x, spot.y);

            let doAttack = false;
            if (estimated < 0) return; // do anything if we are below zero
            //ToDo; get best hand
            switch (true) {
                case result.skill === sdk.skills.BlessedHammer:
                    doAttack = (estimated < 5e3);
                    doAttack && me.setSkill(sdk.skills.Concentration, 0);
                    break;
                case result.skill === sdk.skills.Blizzard:
                    break;
                case result.skill === sdk.skills.LightningFury:
                    doAttack = (estimated < 1000);
                    break;
                case result.skill === sdk.skills.Nova:
                    doAttack = (estimated < 1300);
                    break;
                case result.skill === sdk.skills.Meteor:
                    let crucial = 2600;
                    doAttack = (estimated > crucial + 2500 && estimated < crucial * 4) || !(crucial > 2600);
                    // Comes quite specific
                    break;

                default:
                    doAttack = (estimated < 4e3);
                    break;
            }


            if (doAttack) {
                me.overhead('PreAttacking with ' + skillName + ' -- ' + result.skill);
                me.cast(result.skill, undefined, spot.x, spot.y);
            } else {
                me.overhead('Waiting to preattack with ' + skillName + ' -- ' + result.skill);
            }
        };

        this.calculateBestSpot = function (center, skillRange) {
            let coords = [];
            for (let i = 0; i < 360; i++) {
                coords.push({
					x: Math.floor(center.x + (skillRange / 2) * Math.cos(i)),
					y: Math.floor(center.y + (skillRange / 2) * Math.sin(i)),
                });

                // For debugging, show the circle on the map
                //i > 1 && new Line(coords[i - 1].x, coords[i - 1].y, coords[i].x, coords[i].y, 0x84, true);
            }

            // Get all unites
            let others = getUnits() // filter out all except monsters/players
                .filter(function (unit) {
                    return [sdk.unittype.Player, sdk.unittype.Monsters, sdk.unittype.NPC].indexOf(unit.type) !== -1;
                })
                // Filter the dead ones
                .filter(function (unit) {
                    return !unit.dead;
                });

            return coords // Filter out invalid spots
                .filter(function (coord) {
                    return coord.validSpot;
                } /*&& Collision.lineOfSight(coord.x,coord.y,15092,5029)*/)
                // sort on the relative distance
                .sort(function (a, b) {
                    return others.map(function (other) {
                        return getDistance(other, a.x, a.y) - getDistance(other, b.x, b.y);
                    }).reduce(function (acc, cur) {
                        return acc + cur;
                    }, 0) + getDistance(me, a.x, a.y) + getDistance(me, b.x, b.y);
                })
                .first();
        }
    };
})(module, require);