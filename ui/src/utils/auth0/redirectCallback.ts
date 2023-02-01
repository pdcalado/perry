import { history } from "utils";

type AppState = { targetUrl: string | null | undefined };

// Redirect user to the right place after login
const onRedirectCallback = (appState: AppState) => {
    let goto =
        appState && appState.targetUrl
            ? appState.targetUrl
            : window.location.pathname;

    history.push(goto);
};

export default onRedirectCallback;
