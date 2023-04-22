import User from "./User.js";
import Rest from "./Rest.js";

export default class PageManager{

    constructor(){

        this.pages = {};
        this.page = null;
        this.errors = new Map();    // index -> UserError()
        this.errIndex = 0;
        this.user = new User();

    }

    setUser( user ){

        if( !(user instanceof User) )
            throw new Error("User not of type User");

        this.user = user;
        localStorage.token = user.session_token;

    }

    async begin(){

        let page = window.location.hash;
        if( page.charAt(0) === "#" )
            page = page.substring(1);

        

        // First off, get user data
        if( localStorage.token ){
            const user = await this.restReq("GetUser");
            this.setUser(new User(user));
        }
        
        if( page )
            await this.setPage(page);

        console.log("user exists", this.user.exists());
        if( !this.page )
            await this.setPage(this.user.exists() ? "user" : "login");

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

        document.querySelectorAll("#content > div.page").forEach(el => el.classList.toggle("hidden", true));
        this.page = page;
        page.getDom().classList.toggle("hidden", false);
        window.location.hash = id+"/"+args.join("/");
        await this.page.onBuild(...args);
        return true;

    }

    addPage(id, pvt, onLoad, onBuild, onUnload){

        const p = new Page(this, id, pvt, onLoad, onBuild, onUnload);
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
        this.addError(text, isNotice);
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
    constructor(parent, id, pvt = true, onLoad, onBuild, onUnload){
        
        this.parent = parent;
        this.firstLoad = false;     // Available in onLoad, lets you bind static stuff
        this.id = id;
        this.private = pvt;         // Requires login
        this.data = new Map();

        if( onLoad )
            this.onLoad = onLoad;
        if( onBuild )
            this.onBuild = onBuild;
        if( onUnload )
            this.onUnload = onUnload;

    }
    
    getDom(){
        return document.querySelector("#page-"+this.id);
    }

    // Nonstatic version of make
    make(...args){return this.constructor.make(...args);}
    setModal(...args){return this.constructor.setModal(...args);}

    async onLoad(){};
    async onBuild(){};
    async onUnload(){};

    autoBind(){
        
        this.constructor.autoBind(this.getDom());
        
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

    static clearModal(){
        this.setModal();
    }

    static onHref( evt ){
        
        const page = evt.currentTarget.dataset.href;
        window.pm.setPage(page); // Ugly, but good enough for now
        
    }

    static autoBind( div ){

        div.querySelectorAll("[data-href]").forEach(el => {
            el.onclick = this.onHref.bind(this);
        });

    }

    static setModal( divs, padding = true ){
        
        const modal = document.getElementById("modal");

        if( !divs ){
            modal.classList.toggle('hidden', true);
            return;
        }

        if( !Array.isArray(divs) )
            divs = [divs];

        divs = divs.map(el => {

            if( typeof el === "string" )
                return this.make('p', el);
            return el;

        });
        

        const contentDiv = modal.querySelector("div.wrap > div.content");
        contentDiv.classList.toggle("noPadding", !padding);
        contentDiv.replaceChildren(...divs);
        modal.classList.toggle('hidden', false);
        modal.onclick = this.clearModal.bind(this);
        contentDiv.onclick = event => {event.stopImmediatePropagation();};

        this.autoBind(contentDiv);

    }

}

