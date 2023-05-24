import DbAsset from "./DbAsset.js";

export default class Inventory extends DbAsset{


	constructor(...args){
		super(...args);

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
		
		this.load(...args);
	}

    getTypeSE(){

        return this.constructor.TYPES_SE[this.type] || this.type;

    }
    
    getImage(){
        return '/media/uploads/shop/'+this.id+".jpg";
    }

	rebase(){}

}

