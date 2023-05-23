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
        // Log out
        dom.querySelector("a.logOut").onclick = async () => {
            await pm.restReq("Logout"); 
        };
        dom.querySelector("div.sections > div.section.credit > span.credit").innerText = user.getCreditSek();
        dom.querySelector("span.member").classList.toggle("hidden", !user.member);

        // Toggle admin
        dom.querySelectorAll("div.sections > div.section.admin").forEach(el => el.classList.toggle("hidden", !admin));

        // Change password
        dom.querySelector("a.changePass").onclick = async event => {
            
            const wrap = this.make("div", "", ["changePassWrap"]);
            this.make("h3", "Byt Lösenord", [], wrap);
            const form = this.make("form", "", ["changePassForm"], wrap);
            
            this.make("p", "Nuvarande lösenord", [], form);
            const current = this.make("input", "", [], form);
            current.name = "currentPass";
            current.type = "password";

            this.make("p", "Nytt lösenord", [], form);
            const new0 = this.make("input", "", [], form);
            new0.name = "newPass0";
            new0.type = "password";

            this.make("p", "Repetera", [], form);
            const new1 = this.make("input", "", [], form);
            new1.name = "newPass1";
            new1.type = "password";

            const submit = this.make("input", "", [], form);
            submit.value = "Spara";
            submit.type = "submit";
            
            pm.setModal(wrap);

            form.onsubmit = async event => {
                event.preventDefault();

                if( new0.value !== new1.value ){
                    window.alert("Lösenorden matchar inte.");
                    return;
                }

                await pm.restReq("ChangePassword", [current.value, new0.value]);
                pm.setModal("Lösenordet har uppdaterats");

            };
            
        };

        // Barcode scanner
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
    "userManager",     // id
    true,       // Private
    // onLoad
    async function(){

        let users = await pm.restReq("GetUsers");
        users = users.map(el => new User(el));
        this.data.set("users", users);

        this._getUserById = (id) => {
            for( let u of users ){
                if( u.id === id )
                    return u;
            }
        };

        this._onUserRowClick = event => {
            
            const id = Math.trunc(event.currentTarget.dataset.id) || 0;
            const user = this._getUserById(id);
            if( !user )
                return;         

            const wrap = this.make("div");
            const form = this.make("form", "", ["userEdit"], wrap);

            this.make("p", "Namn", [], form);
            const nick = this.make("input", "", [], form);
            nick.name = 'nick';
            nick.required = true;
            nick.value = user.nick;
            
            let label = this.make("label", "Medlem ", [], form);
            const member = this.make("input", "", [], label);
            member.type = 'checkbox';
            member.name = "member";
            member.checked = Boolean(user.member);
            
            this.make("p", "Discord", [], form);
            const discord = this.make("input", "", [], form);
            discord.name = "discord";
            discord.value = user.discord;
            
            this.make("p", "Kiosk-kredit (öre)", [], form);
            const shopCredit = this.make("input", "", [], form);
            shopCredit.name = "shop_credit";
            shopCredit.value = user.shop_credit;
            shopCredit.type = "number";
            shopCredit.step = 1;
            shopCredit.min = 0;

            this.make("p", "Privilegium", [], form);
            const privilege = this.make("select", "", [], form);
            privilege.name = "privilege";
            if( pm.user.privilege <= 10 )
                privilege.disabled = true;
            let opt = this.make("option", "Normal", [], privilege);
            opt.value = 1;
            opt = this.make("option", "Admin", [], privilege);
            opt.value = 10;
            opt.selected = Boolean(user.isAdmin());
                
            
            const confirm = this.make("input", "", [], form);
            confirm.value = "Spara";
            confirm.type = "submit";

            this.make("hr", "", [], form);

            const passReset = this.make("input", "", [], form);
            passReset.value = "Återställ Lösenord";
            passReset.type = "button";
            this.make("hr", "", [], form);

            const del = this.make("input", "", [], form);
            del.value = "Ta Bort Användare";
            del.type = "button";
            
            pm.setModal(wrap);

            // Save user settings
            form.onsubmit = async event => {
                event.preventDefault();

                const uData = {
                    nick : nick.value,
                    member : +member.checked,
                    discord : discord.value,
                    shop_credit : Math.trunc(shopCredit.value)
                };
                if( pm.user.privilege > 10 )
                    uData.privilege = privilege.value;

                await pm.restReq("SaveUserSettings", [id, uData]);

                pm.setPage("userManager");
                

            };

            // Reset password
            passReset.onclick = async event => {
                
                const passwd = await pm.restReq("GenerateUserPassword", [id]);
                const p = this.make("p", "Nytt lösenord har genererats för "+user.nick+":", ["center"]);
                const h2 = this.make("h2", passwd.password, ["center"]);
                pm.setModal([p,h2]);

            };
            
            del.onclick = async event => {
                if( window.confirm("Är du säker?") ){
                    
                    await pm.restReq("DeleteUser", [id]);
                    pm.setPage("userManager");

                }
            };

        };
        
    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        const users = this.data.get("users");
        const user = this.parent.user;

        
        const tableUsers = dom.querySelector("table.users > tbody");
        
        const rows = [];
        for( let user of users ){

            const tr = this.make("tr");
            rows.push(tr);
            tr.dataset.id = user.id;
            tr.onclick = this._onUserRowClick;
            tr.dataset._n = user.nick.toLowerCase();    // Cache lowercase datasets to speed searches up
            tr.dataset._d = user.discord.toLowerCase(); //

            this.make("td", user.id, [], tr);
            this.make("td", user.nick, [], tr);
            this.make("td", user.member, [], tr);
            this.make("td", user.discord, [], tr);
            this.make("td", user.shop_credit/100, [], tr);
            
        }
        tableUsers.replaceChildren(...rows);

        const formSearch = document.getElementById("userSearch");
        const inputSearch = formSearch.querySelector("input.searchText");

        formSearch.onsubmit = event => {
            event.preventDefault();
            const st = inputSearch.value.toLowerCase().trim();

            rows.forEach(el => {
                
                const visible = !st || el.dataset._n.includes(st) || el.dataset._d.includes(st);
                el.classList.toggle("hidden", !visible);
                
            });
            
        };


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






