import DbAsset from "./DbAsset.js";

export default class Inventory extends DbAsset{

    static TYPES = {
		boardgame : 'boardgame',
		book : 'book',
		electronic_game : 'electronic_game',
		other : 'other',
	};

	static TYPES_SE = {
		boardgame : 'brädspel',
		book : 'bok',
		electronic_game : 'elektroniskt spel',
		other : 'annat',
	};

    static COMPLETION = {
		unknown : 0,
		partial_heavy : 1,
		partial_light : 1,
		full : 2
	};

	constructor(...args){
		super(...args);

        this.name = '';
		this.description = '';
		this.barcode = '';
		this.holder = 1;			// User loaning this item. By default, this is the Shadowplayers clubhouse.
		this.owner = 1;				// Who owns this item? Defaults to clubhouse.
		this.loanable = 0;			// Whether you can loan this item home or not.
		this.active = 1;			// When 0, it's something that's no longer available.
		this.type = this.constructor.TYPES.boardgame;	// Todo: Decide what types of items we should have.
		this.comment = '';			// Comment for admins only
		this.language = 'sv';
		this.ages = 'alla åldrar';
		this.complete = this.constructor.COMPLETION.unknown;
		
		this.load(...args);
	}

	getLanguageReadable(){

		if( this.language === "sv" ) 
			return "Svenska";
		if( this.language === "en" )
			return "Engelska";
		return "Okänt Språk";
	}

    getTypeSE(){

        return this.constructor.TYPES_SE[this.type] || this.type;

    }
    
    getImage(){
        return '/media/uploads/inventory/'+this.id+".jpg";
    }

	rebase(){}

}

