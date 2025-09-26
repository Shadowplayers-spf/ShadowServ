import Crypto from 'crypto';
import Bcrypt from 'bcrypt';

(async () => {

	const bytes = await Crypto.randomBytes(48);
	const pass = bytes.toString('hex').substring(0,8);
	const hashed = await Bcrypt.hash(pass, 10);
	console.log(pass, ">>", hashed);

})();


