import DB from "./DB.js";

/*
	This is used for games/books we have available on site.
	See ShopItem for the store.
*/
class Inventory extends DB{

	constructor(){
		super(...arguments);

		this.name = '';
		this.description = '';
		this.barcode = '';
		this.holder = 1;			// User loaning this item. By default, this is the Shadowplayers clubhouse.
		this.owner = 1;				// Who owns this item? Defaults to clubhouse.
		this.loanable = 0;			// Whether you can loan this item home or not.
		this.active = 1;			// When 0, it's something that's no longer available.
		this.type = 'boardgame';	// Todo: Decide what types of items we should have.
		this.comment = '';			// Comment for admins only
		this.image = '';			// URL to image.

		this.load(...arguments);
	}

}
