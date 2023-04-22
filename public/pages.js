import User from "./classes/User.js";
import PageManager from "./classes/Page.js";

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

        const products = await pm.restReq("GetShopItems");
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

            this.setModal([bg, info], false);
            
        };

    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        const products = this.data.get("products");
        
        const divProducts = dom.querySelector("div.products");
        
        for( let product of products ){

            const div = this.make("div", '', 'product');
            div.dataset.id = product.id;
            divProducts.append(div);

            let c = this.make('p', product.name, 'title');
            div.append(c);

            c = this.make('p', product.cost/100 + " kr", 'cost');
            div.append(c);

            // Todo: Image

            div.onclick = this._onProductClick;
            
        }

    },
    // onUnload
    async function(){

    }
);




pm.addPage(
    "storeEdit",    // id
    true,           // Private
    // onLoad
    async function(){

        const products = await pm.restReq("GetShopItems");
        this.data.set("products", products);
        
        this._getProductById = id => {
            const prod = this.data.get("products");
            for( let p of prod ){
                if( p.id === id )
                    return p;
            }
        };

    },
    // onBuild
    async function( id ){
        
        const dom = this.getDom();
        const products = this.data.get("products");
        let product = this._getProductById(id);
        // Create a new one instead
        if( !product ){
            product = {};
            id = 0;
        }
        const form = document.getElementById("shopItem");
        const categoryInput = form.querySelector("select.type");
        
        // Todo: add categories


    },
    // onUnload
    async function(){

    }
);






