import DB from "./DB.js";

/*
	This is used for games/books we have available on site.
	See ShopItem for the store.
*/
export default class Inventory extends DB{

	static table = "inventory";

    // Fields that are accepted as is using the admin REST entrypoint
    static ADMIN_SETTABLE = [
        'name', 'description', 'barcode', 'active', 'holder', 'owner', 'loanable', 'type', 'comment', 'language', 'ages', 'complete'
    ];

	static COMPLETION = {
		unknown : 0,
		partial : 1,
		full : 2
	};

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
		this.language = 'sv';
		this.ages = 'alla åldrar';
		this.complete = this.constructor.COMPLETION.unknown;

		this.load(...arguments);
	}

}
