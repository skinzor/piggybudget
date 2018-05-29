import AppState from "./AppState";
import { List } from "immutable";
import { ActionAddTransaction, Action } from "./Actions";

export default (state: AppState | undefined, action: Action) => {
    if (state === undefined) {
        console.log("reducer, state undefined");
        return { transactions: List() };
    }
    switch (action.type) {
        case "ADD_TRANSACTION":
            return {
                ...state,
                transactions: state.transactions.push(action.t),
            };
        default:
            console.log("Unknown action: " + action.type);
            break;
    }
    return state;
};

