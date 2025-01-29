import express from "express";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import * as userService from "./services/user.service";
import * as itemsService from "./services/items.service";
import { IGenericResponse, IMarketplaceItem, ISkinportItem, IUser, IUserResponse } from "./types";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "default_secret"],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
}));

const authenticateMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};

app.post("/api/users/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user: IUser | null = await userService.createUser(username, password);
        req.session = { userId: user?.id };
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: "Registration failed" });
    }
});

app.post("/api/users/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user: IUserResponse | null = await userService.authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        req.session = { userId: user.id };
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: "Login failed" });
    }
});

app.post("/api/users/logout", (req, res) => {
    req.session = null;
    res.json({ success: true });
});

app.post("/api/users/change-password", authenticateMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        await userService.changePassword(req.session!.userId, oldPassword, newPassword);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: "Password change failed" });
    }
});

// Items routes
app.get("/api/items/skinport", async (_, res) => {
    try {
        const items: ISkinportItem[] = await itemsService.getSkinportItems();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch Skinport items" });
    }
});

app.get("/api/items/custom", async (_, res) => {
    try {
        const items: IMarketplaceItem[] = await itemsService.getCustomItems();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch marketplace items" });
    }
});

app.post("/api/items/purchase/:itemId", authenticateMiddleware, async (req, res) => {
    try {
        const result: IGenericResponse<number> = await itemsService.purchaseItem(req.session!.userId, parseInt(req.params.itemId));
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: "Purchase failed" });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
