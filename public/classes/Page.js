import User from "./User.js";
import Rest from "./Rest.js";

export default class PageManager{

    constructor(){

        this.pages = {};
        this.page = null;
        this.errors = new Map();    // index -> UserError()
        this.errIndex = 0;
        this.user = new User();
        this.back = null;
        this.onModalClose = null;
        this.io = io({
            autoConnect : false
        });
        this.io.on("connect", () => {
            console.log("WSS connected");
        });
        this.io.on("disconnect", () => {
            console.log("WSS disconnected");
        });
        this.io.on("RefreshAdmins", data => {
            this.onAdminRefresh(data);
        });

    }

    setUser( user ){

        if( !(user instanceof User) )
            throw new Error("User not of type User");

        this.user = user;
        localStorage.token = user.session_token;

        if( this.io ){
            this.io.disconnect();
        }
        if( this.user.exists() && this.io ){
            this.io.connect();
            this.io.emit("clientTask", {
                task : "Join",
                args : [this.user.session_token]
            }, (res) => {
                if( res && !res.success )
                    this.addError(res.data);
                else
                    this.onAdminRefresh();
            });
        }

    }

    async begin(){

        let page = window.location.hash;
        if( page.charAt(0) === "#" )
            page = page.substring(1);

        this.back = document.getElementById("back");
        this.back.onclick = this.onBack.bind(this);

        // First off, get user data
        if( localStorage.token ){
            const user = await this.restReq("GetUser");
            this.setUser(new User(user));
        }
        
        if( page )
            await this.setPage(page);

        if( !this.page )
            await this.setPage(this.user.exists() ? "user" : "login");

        

    }

    onAdminRefresh( data ){
        if( this.page && typeof this.page.onAdminRefresh === "function" ){
            this.page.onAdminRefresh(data);
        }
    }

    onBack(){

        this.setPage(this.page.back);

    }

    getPage( id ){
        return this.pages[id];
    }
    async setPage( id ){

        const args = String(id).split("/");
        id = args.shift();

        const page = this.getPage(id);
        if( !page )
            return false;

        if( !this.user.exists() && page.private )
            return false;
        
        await page.onLoad(...args);
        if( !page.firstLoad ){
            page.firstLoad = true;
            page.autoBind();
        }

        if( this.page )
            await this.page.onUnload();

        this.clearModal();

        // Hide all other pages
        document.querySelectorAll("#content > div.page").forEach(el => el.classList.toggle("hidden", true));
        // Set our active page and show it
        this.page = page;
        page.getDom().classList.toggle("hidden", false);
        // Update hash (debugging)
        window.location.hash = id+"/"+args.join("/");
        // Wait for page to build
        await this.page.onBuild(...args);
        // Update back button
        this.updateBack();
        return true;

    }

    addPage(...pagedata){

        const id = arguments[0];

        const p = new Page(this, ...pagedata);
        this.pages[id] = p;
        return p;

    }

    addError( text, isNotice = false ){
        
        ++this.errIndex;
        const err = new UserError(this, this.errIndex, text, isNotice);
        this.errors.set(this.errIndex, err);
        err.create();

    }

    removeError( idx ){
        
        const err = this.errors.get(idx);
        if( !err )
            return;
        err.onRemove();
        this.errors.delete(idx);

    }

    addNotice( text ){
        this.addError(text, true);
    }

    updateBack(){
        this.back.classList.toggle("hidden", !this?.page.back);
    }

    // Audo binds things like data-href
    autoBind( div ){

        div.querySelectorAll("[data-href]").forEach(el => {
            el.onclick = this.onHref.bind(this);
        });

    }

    onHref( evt ){
        
        const page = evt.currentTarget.dataset.href;
        window.pm.setPage(page); // Ugly, but good enough for now
        
    }


    async restReq( task, data ){

        const req = new Rest(task, data);
        let out = false;
        try{
            out = await req.run();
        }
        catch(err){
            this.addError(err.message);
            console.log(err);
        }

        if( this.page?.private && !req.usr ){
            this.addError("Du har loggats ut.");
            this.setPage("login");
        }
        return out;

    }

    setModal( divs, padding = true, overflow = true, onClose = null ){
        
        const modal = document.getElementById("modal");

        if( !divs ){
            modal.classList.toggle('hidden', true);
            if( typeof this.onModalClose === "function" )
                this.onModalClose();
            return;
        }

        if( !Array.isArray(divs) )
            divs = [divs];

        divs = divs.map(el => {

            if( typeof el === "string" )
                return Page.make('p', el);
            return el;

        });
        
        const contentDiv = modal.querySelector("div.wrap > div.content");
        contentDiv.classList.toggle("noPadding", !padding);
        contentDiv.classList.toggle("hiddenOverflow", !overflow);
        contentDiv.replaceChildren(...divs);
        modal.classList.toggle('hidden', false);
        modal.onclick = this.clearModal.bind(this);
        contentDiv.onclick = event => {event.stopImmediatePropagation();};
        this.onModalClose = onClose;

        this.autoBind(contentDiv);

    }

    clearModal(){
        this.setModal();
    }

    // Fetches user money and updates any elements with the shopCredit class
    async updateShopCredit(){

        const user = await this.restReq("GetUser");
        this.user.shop_credit = user.shop_credit;
        const sek = this.user.getCreditSek();
        document.querySelectorAll(".shopCredit").forEach(el => el.innerText = sek);

    }

}

export class UserError{
    static errors = [];
    
    constructor( parent, idx, message, isNotice = false ){
        
        this.parent = parent;
        this.message = message;
        this.isNotice = isNotice;
        this.idx = idx;
        this.dom = document.createElement("div");
    }

    create(){

        const text = document.createElement("div");
        text.innerText = this.message;
        document.getElementById("errors").append(this.dom);
        this.dom.append(text);
        this.dom.onclick = this.remove.bind(this);
        this.dom.classList.add("error");
        if( this.isNotice )
            this.dom.classList.add("notice");
        
        const dur = 12000;
        this._timeout = setTimeout(this.remove.bind(this), dur);
        this._timeout = setTimeout(this.onFade.bind(this), dur-1000);

    }

    onFade(){
        this.dom.classList.toggle("fade", true);
    }

    remove(){
        this.parent.removeError(this.idx);
    }

    onRemove(){

        clearTimeout(this._timeout);
        this.dom.remove();

    }
    
}

export class Page{
    constructor(parent, id, pvt = true, onLoad, onBuild, onUnload, back, onAdminRefresh){
        
        this.parent = parent;
        this.firstLoad = false;     // Available in onLoad, lets you bind static stuff
        this.id = id;
        this.private = pvt;         // Requires login
        this.data = new Map();
        this.back = back;

        if( onLoad )
            this.onLoad = onLoad;
        if( onBuild )
            this.onBuild = onBuild;
        if( onUnload )
            this.onUnload = onUnload;
        if( onAdminRefresh )
            this.onAdminRefresh = onAdminRefresh;

    }
    
    getDom(){
        return document.querySelector("#page-"+this.id);
    }

    formatDate( mysqlTimestamp ){

        const d = new Date(mysqlTimestamp).toISOString().split("T");
        let out = d.shift();
        out += " "+d.shift().split(".").shift();
        return out;

    }

    // Nonstatic version of make
    make(...args){return this.constructor.make(...args);}
    setModal(...args){return this.parent.setModal(...args);}

    async onLoad(){};
    async onBuild(){};
    async onUnload(){};

    autoBind(){
        
        this.parent.autoBind(this.getDom());
        
    }

    setBack( back ){

        this.back = back;
        this.parent.updateBack();

    }

    // makes an element
    static make( type = 'div', text = '', classList = [], parent = false ){
        
        if( !Array.isArray(classList) )
            classList = [classList];

        const out = document.createElement(type);
        out.innerText = text;
        out.classList.add(...classList);
        if( parent )
            parent.append(out);
        return out;

    }

    

    

}

