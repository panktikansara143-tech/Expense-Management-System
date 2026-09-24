const bcrypt = require("bcrypt");

const password = "Pankti@123";

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error(err);
        return;
    }

    console.log("Password:", password);
    console.log("Hash:", hash);
});