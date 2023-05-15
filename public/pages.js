import User from "./classes/User.js";
import PageManager from "./classes/Page.js";
import ShopItem from "./classes/ShopItem.js";
import templates from "./templates.js";

const pm = new PageManager();
export default pm;

// Login
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

// Signup
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

// User main page
pm.addPage(
    "user",     // id
    true,       // Private
    // onLoad
    async function(){

        this.buildShopPurchase = shopItem => {

            const wrap = this.make("div");
            templates.productModal(this, wrap, shopItem);


            pm.setModal(wrap, false);

        };

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
        dom.querySelector("div.sections > div.section.credit > span.credit").innerText = user.getCreditSek();
        dom.querySelector("span.member").classList.toggle("hidden", !user.member);

        dom.querySelectorAll("div.sections > div.section.admin").forEach(el => el.classList.toggle("hidden", !admin));

        dom.querySelector("div.barcode").onclick = event => {
            scanner.run(pm, async data => {
                
                const code = data.code;
                const fetch = await pm.restReq("BarcodeScanned", [code]);
                
                const type = fetch.type;
                let assetData = fetch.data;

                if( type === "ShopItem" )
                    this.buildShopPurchase(new ShopItem(assetData));
                else if( type == "Inventory" )
                    console.log("Todo: Handle inventory");


            });
        };

    },
    // onUnload
    async function(){

    }
);



pm.addPage(
    "credits",     // id
    true,       // Private
    // onLoad
    async function(){
        
        let history = await pm.restReq("GetPurchaseHistory");
        this.data.set("history", history);
        
        const usr = await pm.restReq("RefreshTransactions", []);
        pm.user.shop_credit = usr.shop_credit;

        // Refresh pending transactions
        this._refresh = async () => {
            
            const ud = await pm.restReq("RefreshTransactions", []);
            let pre = pm.user.shop_credit;
            if( ud.shop_credit !== pre ){
                pm.setPage("credits");
                return true;
            }
            return false;
            
        };
        

    },
    // onBuild
    async function(){
        
        const user = pm.user,
            dom = this.getDom(),
            admin = user.isAdmin(),
            wallet = dom.querySelector("div.wallet"),
            availableSpan = wallet.querySelector("span.available"),
            purchaseHistory = dom.querySelector("div.history.purchase"),
            swishHistory = dom.querySelector("div.history.swish"),
            purchaseButton = dom.querySelector("div.section.swish"),
            history = this.data.get("history")
        ;
        

        wallet.onclick = async event => {

            availableSpan.innerText = "...uppdaterar...";
            const att = await this._refresh();
            if( !att ){
                availableSpan.innerText = Math.trunc(user.shop_credit/100);
            }
        };
        
        // Update sum
        availableSpan.innerText = Math.trunc(user.shop_credit/100);
        swishHistory.replaceChildren();
        purchaseHistory.replaceChildren();
        
        // Create purchase form
        purchaseButton.onclick = event => {
            event.preventDefault();
            
            
            // CreateSwishTransaction
            const form = this.make("form");
            form.id = "purchaseCredit";

            this.make("p", "Tel.nummer", ["formTitle"], form);

            const phoneInput = this.make("input", "", ["purchase"], form);
            phoneInput.value = localStorage.phone || "";

            this.make("p", "Kronor att köpa", ["formTitle"], form);

            let input = this.make("input", "", ["purchase"], form);
            const amountInput = input;
            input.type = "number";
            input.step = 1;
            input.min = 10;
            input.style.width = "20vmax";
            input.required = true;
            input.value = localStorage.swishAmount || 100;
            
            this.make("br", "", [], form);

            
            input = this.make("input", "", [], form);
            input.type = "submit";
            input.value = "Köp Kioskkredit";
            input.required = true;

            this.make("br", "", [], form);

            // Bind preset buttons
            const onPresetClick = event => {
                amountInput.value = event.currentTarget.dataset.sum;
            };
            
            this.make("hr", "", [], form);
    
            let presets = [50,100,300];
            for( let v of presets ){

                input = this.make("input", "", ["defaultFont"], form);
                input.value = v+" kr";
                input.type = "button";
                input.dataset.sum = v;
                input.onclick = onPresetClick;

            }

            this.setModal(form);

            form.onsubmit = async event => {
                
                event.preventDefault();
                const number = phoneInput.value;
                const amount = amountInput.value;
                localStorage.phone = number;
                localStorage.amount = amount;

                if( !await pm.restReq("CreateSwishTransaction", [amount, number]) ){
                    return;
                }

                const wrap = this.make("div", "", ["refreshPayment"]);
                this.make("p", "Öppna swish, tryck på Uppdatera eller tryck på din plånbok längst upp på sidan när betalningen är klar.", [], wrap);
                const btn = this.make("input", "", [], wrap);
                btn.value = "Uppdatera";
                btn.type = "button";
                
                btn.onclick = async event => {

                    btn.value = "...uppdaterar.";
                    if( !await this._refresh() )
                        btn.value = "Uppdatera";

                };

                this.setModal(wrap);

            };

        };
        		
        // Swish history
        for( let swish of history.swishTransactions ){
            
            this.make("div", swish.amount+"kr | "+this.formatDate(swish.updated), ["transaction"], swishHistory);

        }
        // Get a shop item
        const getShopItem = id => {
            for( let itm of history.boughtItems ){
                if( id === itm.id )
                    return itm;
            }
        };
        for( let bought of history.purchases ){

            const item = new ShopItem(getShopItem(bought.item) || {name:'???'});


            const tx = this.make("div", "", ["transaction"], purchaseHistory);

            const img = this.make("div", "", ["img"], tx);
            img.style.backgroundImage = "url("+item.getImage()+")";
            this.make("p", item.name, ["title"], tx);
            this.make("p", (bought.amountPaid/100)+"kr | "+this.formatDate(bought.created), ["subtitle"], tx);

        }

    },
    // onUnload
    async function(){

    },
    "user" // back
);

pm.addPage(
    "store",     // id
    true,       // Private
    // onLoad
    async function(){

        let products = await pm.restReq("GetShopItems");
        products = products.map(el => new ShopItem(el));
        this.data.set("products", products);
        
        products.sort((a,b) => {

            if( a.active !== b.active )
                return a.active ? -1 : 1;

            if( a.type !== b.type )
                return a.type < b.type ? -1 : 1;

            if( Boolean(a.stock) !== Boolean(b.stock) )
                return a.stock ? -1 : 1;

            return a.name < b.name ? -1 : 1;

        });
        
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

            const wrap = this.make("div");
            templates.productModal(this, wrap, prod);

            pm.setModal(wrap, false);
            
        };

    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        const products = this.data.get("products");
        const user = this.parent.user;

        
        const divProducts = dom.querySelector("div.products");
        const prods = [];
        let cat;
        for( let product of products ){

            let pCat = product.getTypeSE();
            if( !product.active )
                pCat = 'Inaktiva';

            if( cat !== pCat ){
                
                cat = pCat;
                const div = this.make("div", '', 'category');
                prods.push(div);
                this.make('h3', cat, 'cyberpunk', div); 

            }
                

            const classes = ['product'];
            if( !product.active )
                classes.push('inactive');
            if( !product.stock )
                classes.push('outOfStock');

            const div = this.make("div", '', classes);
            div.dataset.id = product.id;
            prods.push(div);

            const bg = this.make('div', '', 'bg', div);
            bg.style.backgroundImage = 'url('+product.getImage()+')';

            const ruler = this.make('div', '', 'ruler', div);

            let name = product.name;
            if( !product.active )
                name += ' [Inaktiv]';
            this.make('p', name, 'title', ruler);
            
            const costRow = this.make('p', '', 'costRow', ruler);
            this.make('span', product.cost/100 + " kr", 'cost', costRow);
            const stockClasses = ['stock'];
            if( !product.stock )
                stockClasses.push('out');

            if( !product.stock || user.isAdmin() )
                this.make('span', ", "+(product.stock ? product.stock+" stk" : 'Slutsåld'), stockClasses, costRow);

            div.onclick = this._onProductClick;
            
        }
        divProducts.replaceChildren(...prods);

        dom.querySelector('input.newProduct').classList.toggle('hidden', !this.parent.user.isAdmin());
        

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
        this._submit = this._form.querySelector('input[type=submit]');

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
            product = new ShopItem();
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
        
        this._inputs.scanBarcode.onclick = event => {
            scanner.run(pm, data => {
                this._inputs.barcode.value = data.code;
            });
        };

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

            this._submit.value = 'Sparar...';
            const ret = await pm.restReq("CreateShopItem", out);
            pm.addNotice("Produkten har sparats");
            if( !id )
                pm.setPage("storeEdit/"+ret.id);
            this._submit.value = 'Spara';
            
        };

        
        

    },
    // onUnload
    async function(){

    },
    // Back
    "store"
);






