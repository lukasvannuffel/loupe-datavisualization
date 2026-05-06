import { initBotId } from "botid/client/core";

initBotId({
    protect: [
        // Server Actions invoked from /auth (signin / signup)
        { path: "/auth", method: "POST" },
        // Server Actions invoked from /account (profile, email, password, avatar)
        { path: "/account", method: "POST" },
    ],
});
