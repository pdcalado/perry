// The code below was authored by Auth0 contributors.
// For more details refer to:
// https://github.com/auth0/auth0-spa-js/pull/310#issuecomment-614857727

import React, { useState, useEffect, useContext } from "react";
import createAuth0Client, {
    Auth0Client,
    PopupLoginOptions,
    RedirectLoginResult,
    getIdTokenClaimsOptions,
    IdToken,
    RedirectLoginOptions,
    GetTokenSilentlyOptions,
    GetTokenWithPopupOptions,
    LogoutOptions,
    Auth0ClientOptions,
} from "@auth0/auth0-spa-js";

type PromiseMaybeString = Promise<string | undefined>;

interface BaseUser {
    picture: string;
}

interface IAuth0Context {
    isAuthenticated: boolean;
    user: BaseUser | undefined;
    loading: boolean;
    popupOpen: boolean;
    loginWithPopup(options: PopupLoginOptions): Promise<void>;
    handleRedirectCallback(): Promise<RedirectLoginResult>;
    getIdTokenClaims(o?: getIdTokenClaimsOptions): Promise<IdToken>;
    loginWithRedirect(o: RedirectLoginOptions): Promise<void>;
    getTokenSilently(o?: GetTokenSilentlyOptions): PromiseMaybeString;
    getTokenWithPopup(o?: GetTokenWithPopupOptions): PromiseMaybeString;
    logout(o?: LogoutOptions): void;
    apiToken: string | null;
}
interface IAuth0ProviderOptions {
    children: React.ReactElement;
    onRedirectCallback?(
        result: RedirectLoginResult | { targetUrl: string | null | undefined }
    ): void;
}

const DEFAULT_REDIRECT_CALLBACK = () =>
    window.history.replaceState({}, document.title, window.location.pathname);

export const Auth0Context = React.createContext<IAuth0Context | null>(null);
export const useAuth0 = () => useContext(Auth0Context)!;
export const Auth0Provider = ({
    children,
    onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
    ...initOptions
}: IAuth0ProviderOptions & Auth0ClientOptions) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState();
    const [auth0Client, setAuth0] = useState<Auth0Client>();
    const [loading, setLoading] = useState(true);
    const [popupOpen, setPopupOpen] = useState(false);
    const [apiToken, setApiToken] = useState(null);

    useEffect(() => {
        const initAuth0 = async () => {
            const auth0FromHook = await createAuth0Client(initOptions);
            setAuth0(auth0FromHook);

            if (window.location.search.includes("code=")) {
                const {
                    appState,
                } = await auth0FromHook.handleRedirectCallback();
                onRedirectCallback(appState);
            }

            const isAuthenticated = await auth0FromHook.isAuthenticated();

            setIsAuthenticated(isAuthenticated);

            if (isAuthenticated) {
                const user = await auth0FromHook.getUser();
                setUser(user);
            }

            if (isAuthenticated) {
                try {
                    const token = await auth0FromHook.getTokenSilently();
                    setApiToken(token);
                } catch (error) {
                    console.error("failed to get token", error);
                    return;
                }
            }

            setLoading(false);
        };
        initAuth0();
        // eslint-disable-next-line
    }, []);

    const loginWithPopup = async (o: PopupLoginOptions) => {
        setPopupOpen(true);
        try {
            await auth0Client!.loginWithPopup(o);
        } catch (error) {
            console.error(error);
        } finally {
            setPopupOpen(false);
        }
        const user = await auth0Client!.getUser();
        setUser(user);
        setIsAuthenticated(true);
    };

    const handleRedirectCallback = async () => {
        setLoading(true);
        const result = await auth0Client!.handleRedirectCallback();
        const user = await auth0Client!.getUser();
        setLoading(false);
        setIsAuthenticated(true);
        setUser(user);
        return result;
    };
    return (
        <Auth0Context.Provider
            value={{
                isAuthenticated,
                user,
                loading,
                popupOpen,
                loginWithPopup,
                handleRedirectCallback,
                getIdTokenClaims: (o: getIdTokenClaimsOptions | undefined) =>
                    auth0Client!.getIdTokenClaims(o),
                loginWithRedirect: (o: RedirectLoginOptions) =>
                    auth0Client!.loginWithRedirect(o),
                getTokenSilently: (o: GetTokenSilentlyOptions | undefined) =>
                    auth0Client!.getTokenSilently(o),
                getTokenWithPopup: (o: GetTokenWithPopupOptions | undefined) =>
                    auth0Client!.getTokenWithPopup(o),
                logout: (o?: LogoutOptions) => auth0Client!.logout(o),
                apiToken,
            }}
        >
            {children}
        </Auth0Context.Provider>
    );
};
