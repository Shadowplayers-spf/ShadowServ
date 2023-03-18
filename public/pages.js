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
            
            const req = await this.restReq("Register", [user, pass0, pass1, discord]);
            if( req ){
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






