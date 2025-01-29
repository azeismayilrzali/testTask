import axios, { AxiosResponse } from "axios";
import { PoolClient, QueryResult } from "pg";
import redis from "../redis";
import { IGenericResponse, ISkinportItem, IMarketplaceItem, IUser } from "../types";
import pool from "../db";

const CACHE_EXPIRATION = 300; // 5 minutes

export async function getSkinportItems(): Promise<ISkinportItem[]> {
    const cachedItems: string | null = await redis.get("skinport_items");
    if (cachedItems) {
        return JSON.parse(cachedItems);
    }
    const nonTradableResponse: AxiosResponse<ISkinportItem[]> = await axios.get("https://api.skinport.com/v1/items", {
        params: {
            app_id: 730,
            currency: "EUR",
            tradable: 0,
        },
        headers: {
            "Accept-Encoding": "br",
        },
    });
    const tradableResponse: AxiosResponse<ISkinportItem[]> = await axios.get("https://api.skinport.com/v1/items", {
        params: {
            app_id: 730,
            currency: "EUR",
            tradable: 1,
        },
        headers: {
            "Accept-Encoding": "br",
        },
    });
    const tradablePricesMap = new Map(
        tradableResponse.data.map((item: ISkinportItem): [string, number | null] => [
            item.market_hash_name,
            item.min_price,
        ]),
    );
    const updatedItems: ISkinportItem[] = nonTradableResponse.data
        .map((item: ISkinportItem): ISkinportItem & { tradable_min_price: number | null } => (
            {
                ...item,
                tradable_min_price: tradablePricesMap.get(item.market_hash_name) || null,
            }
        ));
    await redis.setex("skinport_items", CACHE_EXPIRATION, JSON.stringify(updatedItems));
    return updatedItems;
}

export async function purchaseItem(userId: number, itemId: number): Promise<IGenericResponse<number>> {
    const client: PoolClient = await pool.connect();
    try {
        await client.query("BEGIN");
        const itemResult: QueryResult<IMarketplaceItem> = await client.query(
            "SELECT * FROM items WHERE id = $1 AND quantity > 0",
            [itemId],
        );
        if (!itemResult.rows[0]) {
            throw new Error("Item not available");
        }
        const item: IMarketplaceItem = itemResult.rows[0];
        const userResult: QueryResult<IUser> = await client.query(
            "SELECT balance FROM users WHERE id = $1",
            [userId],
        );
        if (!userResult.rows[0] || userResult.rows[0].balance < item.price) {
            throw new Error("Insufficient balance");
        }
        await client.query(
            "UPDATE users SET balance = balance - $1 WHERE id = $2",
            [item.price, userId],
        );
        await client.query(
            "UPDATE items SET quantity = quantity - 1 WHERE id = $1",
            [itemId],
        );
        await client.query(
            "INSERT INTO purchases (user_id, item_id, price) VALUES ($1, $2, $3)",
            [userId, itemId, item.price],
        );
        await client.query("COMMIT");
        return {
            success: true,
            data: userResult.rows[0].balance - item.price,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function getCustomItems(): Promise<IMarketplaceItem[]> {
    const result: QueryResult<IMarketplaceItem> = await pool.query(
        "SELECT * FROM items WHERE quantity > 0 ORDER BY price ASC",
    );
    return result.rows;
}
