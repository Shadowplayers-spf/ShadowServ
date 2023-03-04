import DbAsset from "./DbAsset.js";

class User extends DbAsset{

    constructor( data ){
        super(data);

        this.id = 0;
        this.nick = "";
        this.member = 0;
        this.privilege = 0;
        this.created = "";
        this.updated = "";

        this.load(data);
    }

    rebase(){

    }
    

}


