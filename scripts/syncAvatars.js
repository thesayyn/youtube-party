const fs = require("fs");

const avatars = [];

for (const category of fs.readdirSync("./public/avatars")) {
    if (category.startsWith(".")) {
        continue;
    }
    for (const avatar of fs.readdirSync("./public/avatars/" + category)) {
        if (avatar.startsWith(".")) {
            continue;
        }
        avatars.push(`${category}/${avatar.replace(".svg", "")}`);
    }
}

fs.writeFileSync("./src/avatars.js", `export const avatars = ${JSON.stringify(avatars, null, 2)};`)