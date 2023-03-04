
export default class DbAsset{


    load(){
        if( typeof data !== "object" )
            data = {};

        for( let i in data ){

            const v = data[i],
                type = typeof this[i]
            ;

            if( !this.hasOwnProperty(data[i]) || type === "function" )
                continue;

            if( type === "number" )
                this[i] = +v;
            else if( type === "object" ){
                
                let out = {};
                if( typeof v === "string" ){
                    try{
                        out = JSON.parse(v);
                    }catch(err){
                        console.error("Failed to parse JSON ", v);
                    }
                }

                if( Array.isArray(this[i]) !== Array.isArray(out) )
                    console.error("Trying to turn object into invalid type: ", out, this[i]);
                else
                    this[i] = out;
                
            }
            else if( type === "boolean" )
                this[i] = Boolean(v);
            else
                this[i] = v;

        }

        this?.rebase();

    }

    static loadThese( assets = [] ){

        if( !Array.isArray(assets) )
            throw "Trying to load invalid assets";

        return assets.map(el => this.loadThis(el));

    }

    static loadThis( asset ){
        
        return new this(asset);

    }



}

