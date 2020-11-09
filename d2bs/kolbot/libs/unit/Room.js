(cacheObjects => {

	/**
	 *
	 * @param {Room} room
	 * @return boolean
	 */
	Room.prototype.isNeighbour = function (room) {

		// same room
		if (room.x === this.x && room.y === this.y) return true;

		const neighbours = (this.getNearby() || []).filter(el => el.x === room.x && el.y === room.y);

		return !!neighbours.length

	};

	Room.prototype.realCoords = function () {


	}
})(new WeakMap());