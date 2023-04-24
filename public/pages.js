import User from "./classes/User.js";
import PageManager from "./classes/Page.js";
import ShopItem from "./classes/ShopItem.js";

const pm = new PageManager();
export default pm;

pm.addPage(
    "login",    // id
    false,      // private
    // onLoad
    async function(){

    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        dom.querySelector("form").onsubmit = async event => {
            event.preventDefault();

            const
                user = dom.querySelector("input[name=username]").value,
                pass = dom.querySelector("input[name=password]").value
            ;
            
            const req = await pm.restReq("Login", [user, pass]);
            if( req ){
                
                this.parent.setUser(new User(req));
                this.parent.setPage("user");
                
            }

        };
        
    },
    // onUnload
    async function(){

    }
);


pm.addPage(
    "signup",       // id
    false,          // private
    // onLoad
    async function(){

    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        dom.querySelector("form").onsubmit = async event => {
            event.preventDefault();

            const
                user = dom.querySelector("input[name=username]").value,
                pass0 = dom.querySelector("input[name=password0]").value,
                pass1 = dom.querySelector("input[name=password1]").value,
                discord = dom.querySelector("input[name=discord]").value
            ;

            const req = await pm.restReq("Register", [user, pass0, pass1, discord]);
            console.log("Response", req);
            if( req ){
                console.log("Setting user and page");
                pm.setUser(new User(req));
                pm.setPage("user");
            }

        };
    },
    // onUnload
    async function(){

    }
);


pm.addPage(
    "user",     // id
    true,       // Private
    // onLoad
    async function(){

    },
    // onBuild
    async function(){
        
        const user = pm.user,
            dom = this.getDom(),
            admin = user.privilege >= 10
        ;
        dom.querySelector("h1.username").innerText = user.nick;
        dom.querySelector("a.logOut").onclick = async () => {
            await pm.restReq("Logout"); 
        };
        dom.querySelector("div.sections > div.section.credit > span.credit").innerText = user.getCreditSek()+" kr";
        dom.querySelector("span.member").classList.toggle("hidden", !user.member);

        dom.querySelectorAll("div.sections > div.section.admin").forEach(el => el.classList.toggle("hidden", !admin));

    },
    // onUnload
    async function(){

    }
);

pm.addPage(
    "store",     // id
    true,       // Private
    // onLoad
    async function(){

        let products = await pm.restReq("GetShopItems");
        products = products.map(el => new ShopItem(el));
        this.data.set("products", products);
        
        this._getProductById = id => {
            const prod = this.data.get("products");
            for( let p of prod ){
                if( p.id === id )
                    return p;
            }
        };

        this._onProductClick = event => {
            
            const user = this.parent.user;
            const id = +event.currentTarget.dataset.id;
            const prod = this._getProductById(id);
            if( !prod )
                return;

            const bg = this.make("div", "", ["shopBg"]);
            // Todo: Image

            const info = this.make("div", "", ["shopItemData"]);
            this.make('h2', prod.name, [], info);
            this.make('p', prod.cost/100+" kr", ['subtitle', 'cost'], info);
            this.make('p', prod.description, ['desc'], info);
            
            if( user.isAdmin() ){
                
                const button = this.make("input", "", [], info);
                button.value = "Redigera";
                button.type = "button";
                button.dataset.href = "storeEdit/"+String(id);

            }

            pm.setModal([bg, info], false);
            
        };

    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        const products = this.data.get("products");
        
        const divProducts = dom.querySelector("div.products");
        const prods = [];
        for( let product of products ){

            const div = this.make("div", '', 'product');
            div.dataset.id = product.id;
            prods.push(div);

            this.make('p', product.name, 'title', div);
            this.make('p', product.cost/100 + " kr", 'cost', div);

            // Todo: Image

            div.onclick = this._onProductClick;
            
        }
        divProducts.replaceChildren(...prods);

    },
    // onUnload
    async function(){

    },
    // Back
    "user"
);




pm.addPage(
    "storeEdit",    // id
    true,           // Private
    // onLoad
    async function(){

        let products = await pm.restReq("GetShopItems");
        products = products.map(el => new ShopItem(el));
        this.data.set("products", products);
        
        this._getProductById = id => {
            const prod = this.data.get("products");
            for( let p of prod ){
                if( p.id === id )
                    return p;
            }
        };

        this._form = document.getElementById("shopItem");
        this._inputs = {};

        const all = this._form.querySelectorAll("[name]");
        for( let el of all )
            this._inputs[el.name] = el;
        

    },
    // onBuild
    async function( id ){
        
        id = Math.trunc(id);
        // Fields that can be loaded directly by value
        const autoFields = [
            "name",
            "barcode",
            "stock",
            "cost",
            "age_restriction",
            "comment"
        ];

        
        let product = this._getProductById(id);
        // Create a new one instead
        if( !product ){
            product = {};
            id = 0;
        }
        

        // Update the fields
        const cats = [];
        for( let i in ShopItem.TYPES ){
            const opt = this.make('option', i);
            opt.value = i;
            if( product.type === i )
                opt.selected = true;
            cats.push(opt);
        }
        this._inputs.type.replaceChildren(...cats);
         
        for( let field of autoFields )
            this._inputs[field].value = product[field];
        this._inputs.description.innerText = product.description;
        this._inputs.active.checked = Boolean(product.active);
        

        // Handle submit
        this._form.onsubmit = async event => {
            event.preventDefault();

            const out = new FormData();
            const jData = {};
            for( let f of autoFields )
                jData[f] = this._inputs[f].value;

            jData.type = this._inputs.type.value;
            jData.description = this._inputs.description.value;
            jData.active = +this._inputs.active.checked;

            // formdata includes file and args
            out.append('file', this._inputs.image.files[0]);
            out.append("args", JSON.stringify([id, jData]));

            const ret = await pm.restReq("CreateShopItem", out);
            pm.addNotice("Produkten har sparats");
            if( !id )
                pm.setPage("storeEdit/"+ret.id);

        };

        
        

    },
    // onUnload
    async function(){

    },
    // Back
    "store"
);






