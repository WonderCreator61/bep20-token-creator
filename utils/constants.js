import { decryptString, encryptString, getHiddenInput } from "./encrypt.js";
import dotenv from "dotenv";

dotenv.config();

export let PRIVATE_KEY = '';

export const initialize = async () => {
    const password = await getHiddenInput("Enter your password: ");
    PRIVATE_KEY = await decryptString(process.env.PRIVATE_KEY, password);
}